import "./test_helper.js";
import * as tabMarks from "../../background_scripts/tab_marks.js";

context("tab_marks", () => {
  setup(() => {
    chrome.storage.session.clear();
  });

  teardown(() => {
    chrome.storage.session.clear();
  });

  should("create a tab mark in session storage", async () => {
    const sender = { tab: { id: 10, windowId: 3, url: "http://example.com/#hash" } };
    const result = await tabMarks.create({ markName: "a" }, sender);
    assert.isTrue(result.ok);
    const key = tabMarks.getLocationKey("a");
    const saved = (await chrome.storage.session.get(key))[key];
    assert.equal(10, saved.tabId);
    assert.equal(3, saved.windowId);
    assert.equal("http://example.com/", saved.url);
  });

  should("goto a tab mark by activating existing tab if present", async () => {
    const key = tabMarks.getLocationKey("a");
    await chrome.storage.session.set({
      [key]: { markName: "a", tabId: 1, windowId: 2, url: "http://example.com/" },
    });

    stub(globalThis.chrome.tabs, "get", (id) => ({ id, windowId: 2 }));
    const updatedTabs = [];
    stub(globalThis.chrome.tabs, "update", (id, props) => updatedTabs[id] = props);
    const updatedWindows = [];
    stub(globalThis.chrome.windows, "update", (id, props) => updatedWindows[id] = props);

    const result = await tabMarks.goto({ markName: "a" });
    assert.isTrue(result.ok);
    assert.isTrue(updatedTabs[1] && updatedTabs[1].active);
    assert.isTrue(updatedWindows[2] && updatedWindows[2].focused);
  });

  should("goto a tab mark by opening a new tab if the original tab is missing", async () => {
    const key = tabMarks.getLocationKey("a");
    await chrome.storage.session.set({
      [key]: { markName: "a", tabId: 1, windowId: 2, url: "http://example.com/" },
    });

    stub(globalThis.chrome.tabs, "get", (_id) => {
      throw new Error();
    });
    stub(globalThis.chrome.tabs, "create", (props) => ({ id: 9, windowId: 8, ...props }));
    const updatedWindows = [];
    stub(globalThis.chrome.windows, "update", (id, props) => updatedWindows[id] = props);

    const result = await tabMarks.goto({ markName: "a" });
    assert.isTrue(result.ok);
    assert.equal("new_tab", result.activated);
    const saved = (await chrome.storage.session.get(key))[key];
    assert.equal(9, saved.tabId);
    assert.equal(8, saved.windowId);
    assert.isTrue(updatedWindows[8] && updatedWindows[8].focused);
  });
});


