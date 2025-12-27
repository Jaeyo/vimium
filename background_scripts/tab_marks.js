// Tab marks are like global marks, but they point to a browser tab (tabId/url) and are stored in
// chrome.storage.session (cleared on browser restart).

// Exported for tests.
export function getLocationKey(markName) {
  return `vimiumTabMark|${markName}`;
}

function getBaseUrl(url) {
  return url.split("#")[0];
}

export async function create(req, sender) {
  const tab = sender?.tab;
  if (!tab?.id) return { ok: false };
  const url = tab.url ? getBaseUrl(tab.url) : null;
  const markInfo = {
    markName: req.markName,
    tabId: tab.id,
    windowId: tab.windowId,
    url,
  };
  const item = {};
  item[getLocationKey(req.markName)] = markInfo;
  await chrome.storage.session.set(item);
  return { ok: true };
}

export async function goto(req) {
  const key = getLocationKey(req.markName);
  const items = await chrome.storage.session.get(key);
  const markInfo = items[key];
  if (!markInfo) return { ok: false, error: "not_set" };

  // Try to activate the original tab.
  if (markInfo.tabId != null) {
    try {
      const tab = await chrome.tabs.get(markInfo.tabId);
      if (tab?.id != null) {
        await chrome.tabs.update(tab.id, { active: true });
        if (tab.windowId != null) await chrome.windows.update(tab.windowId, { focused: true });
        return { ok: true, activated: "existing_tab" };
      }
    } catch {
      // Swallow; tab doesn't exist.
    }
  }

  // If the tab doesn't exist, open a new one using the saved URL.
  if (!markInfo.url) return { ok: false, error: "no_url" };
  const createdTab = await chrome.tabs.create({ url: markInfo.url, active: true });
  if (createdTab?.windowId != null) await chrome.windows.update(createdTab.windowId, { focused: true });
  // Update stored tabId/windowId to the new tab so subsequent jumps are direct.
  const updated = Object.assign({}, markInfo, { tabId: createdTab.id, windowId: createdTab.windowId });
  const item = {};
  item[key] = updated;
  await chrome.storage.session.set(item);
  return { ok: true, activated: "new_tab" };
}


