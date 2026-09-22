/**
 * Markpad Native v2.0 — Tab Manager Module
 * Manages reactive tab lifecycle, state transitions, and drag-and-drop transfers.
 */

export class TabManager {
  constructor() {
    this.tabs = [];
    this.activeTabId = null;
    this.listeners = new Set();
  }

  createTab({ title = 'Untitled', filePath = null, content = '', mode = 'editor' } = {}) {
    const newTab = {
      id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title,
      filePath,
      content,
      originalContent: content,
      isDirty: false,
      extension: filePath ? filePath.split('.').pop().toLowerCase() : '',
      mode,
      pinned: false
    };
    this.tabs.push(newTab);
    this.activeTabId = newTab.id;
    this.notify();
    return newTab;
  }

  closeTab(tabId) {
    const idx = this.tabs.findIndex(t => t.id === tabId);
    if (idx === -1) return;
    this.tabs.splice(idx, 1);
    if (this.tabs.length === 0) {
      this.createTab();
    } else if (this.activeTabId === tabId) {
      const nextIdx = Math.min(idx, this.tabs.length - 1);
      this.activeTabId = this.tabs[nextIdx].id;
    }
    this.notify();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.tabs, this.activeTabId);
    }
  }
}
