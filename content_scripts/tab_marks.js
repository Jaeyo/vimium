const TabMarks = {
  mode: null,

  exit(continuation = null) {
    if (this.mode != null) this.mode.exit();
    this.mode = null;
    if (continuation) return continuation();
  },

  showMessage(message, keyChar) {
    HUD.show(`${message} "${keyChar}".`, 1000);
  },

  activateCreateMode(_count, { registryEntry }) {
    this.mode = new Mode();
    this.mode.init({
      name: "create-tab-mark",
      indicator: "Create tab mark...",
      exitOnEscape: true,
      suppressAllKeyboardEvents: true,
      keydown: (event) => {
        if (!KeyboardUtils.isPrintable(event)) return;
        const keyChar = KeyboardUtils.getKeyChar(event);
        this.exit(() => {
          chrome.runtime.sendMessage(
            { handler: "createTabMark", markName: keyChar },
            (response) => {
              if (response?.ok) {
                this.showMessage("Created tab mark", keyChar);
              } else {
                this.showMessage("Failed to create tab mark", keyChar);
              }
            },
          );
        });
        return handlerStack.suppressEvent;
      },
    });
  },

  activateGotoMode(_count, { registryEntry }) {
    this.mode = new Mode();
    this.mode.init({
      name: "goto-tab-mark",
      indicator: "Go to tab mark...",
      exitOnEscape: true,
      suppressAllKeyboardEvents: true,
      keydown: (event) => {
        if (!KeyboardUtils.isPrintable(event)) return;
        const keyChar = KeyboardUtils.getKeyChar(event);
        this.exit(() => {
          chrome.runtime.sendMessage(
            { handler: "gotoTabMark", markName: keyChar },
            (response) => {
              if (response?.ok) {
                this.showMessage("Jumped to tab mark", keyChar);
              } else if (response?.error === "not_set") {
                this.showMessage("Tab mark not set", keyChar);
              } else if (response?.error === "no_url") {
                this.showMessage("Tab mark missing URL", keyChar);
              } else {
                this.showMessage("Failed to jump to tab mark", keyChar);
              }
            },
          );
        });
        return handlerStack.suppressEvent;
      },
    });
  },
};

globalThis.TabMarks = TabMarks;


