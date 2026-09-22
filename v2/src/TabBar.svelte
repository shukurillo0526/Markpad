<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { t } from './i18n.svelte';

  export interface Tab {
    id: string;
    title: string;
    filePath: string | null;
    content: string;
    originalContent: string;
    isDirty: boolean;
    extension: string;
    cursorPos: { line: number; col: number; selectionLen: number };
    lineEnding: 'CRLF' | 'LF';
    encoding: string;
    mode: 'editor' | 'dataviewer' | 'preview' | 'webpreview' | 'jsontree' | 'envinspector' | 'loganalyzer' | 'pdf' | 'office';
    bytes?: Uint8Array | null;
    pinned?: boolean;
  }

  let {
    tabs = [],
    activeTabId = '',
    onSelectTab,
    onCloseTab,
    onNewTab,
    onCloseOthers,
    onCloseAll,
    onTogglePin,
    onCopyPath,
    onSaveTab,
    onSaveAsTab,
    onRevealInExplorer,
    onOpenFolder,
    onMoveToNewWindow,
    onNewWindow,
    onReorderTabs,
    onDropFiles,
    onImportRemoteTab,
    onRemoveClaimedTab
  } = $props<{
    tabs: Tab[];
    activeTabId: string;
    onSelectTab: (id: string) => void;
    onCloseTab: (id: string) => void;
    onNewTab: () => void;
    onCloseOthers?: (id: string) => void;
    onCloseAll?: () => void;
    onTogglePin?: (id: string) => void;
    onCopyPath?: (id: string) => void;
    onSaveTab?: (id: string) => void;
    onSaveAsTab?: (id: string) => void;
    onRevealInExplorer?: (path: string) => void;
    onOpenFolder?: (path: string) => void;
    onMoveToNewWindow?: (tab: Tab, screenX?: number, screenY?: number) => void;
    onNewWindow?: () => void;
    onReorderTabs?: (fromIndex: number, toIndex: number) => void;
    onDropFiles?: (files: FileList | string[]) => void;
    onImportRemoteTab?: (tab: Tab, targetIndex: number) => void;
    onRemoveClaimedTab?: (tabId: string) => void;
  }>();

  let contextMenu = $state<{ visible: boolean; x: number; y: number; tabId: string | null }>({
    visible: false,
    x: 0,
    y: 0,
    tabId: null
  });

  // ─── Smooth Pointer-Based Tab Drag, Cross-Window & Reordering ────────
  let myWindowLabel = '';
  let tabChannel: BroadcastChannel | null = null;
  let remoteDropTargetIndex = $state<number>(-1);
  let remoteDraggingTab = $state<Tab | null>(null);
  let isHoveringRemote = $state(false);
  let activeTargetInfo: { label: string; rel_x: number; rel_y: number } | null = null;
  let lastCheckTime = 0;

  let draggingTabId = $state<string | null>(null);
  let dragStartIndex = $state<number>(-1);
  let dragTargetIndex = $state<number>(-1);
  let isTearOff = $state(false);
  let tearOffPos = $state<{ x: number; y: number }>({ x: 0, y: 0 });
  let startX = 0;
  let startY = 0;
  let hasMoved = false;
  let scrollAreaEl: HTMLDivElement | null = $state(null);

  function handlePointerDown(e: PointerEvent, tabId: string, index: number) {
    if (e.button !== 0) return; // Only primary left click
    if ((e.target as HTMLElement).closest('.close-btn')) return;

    // Synchronous setPointerCapture ensures drag always succeeds without permission/async issues
    const el = e.currentTarget as HTMLElement;
    try {
      el.setPointerCapture(e.pointerId);
    } catch (err) {}

    startX = e.clientX;
    startY = e.clientY;
    hasMoved = false;
    draggingTabId = tabId;
    dragStartIndex = index;
    dragTargetIndex = index;
    isTearOff = false;
    isHoveringRemote = false;
    activeTargetInfo = null;
  }

  async function checkRemoteTarget(screenX: number, screenY: number) {
    try {
      const target = await invoke<{ label: string; rel_x: number; rel_y: number } | null>(
        'find_window_at_point',
        {
          screenX,
          screenY,
          excludeLabel: myWindowLabel
        }
      );
      if (!draggingTabId) return;

      activeTargetInfo = target;
      if (target) {
        isHoveringRemote = true;
        tabChannel?.postMessage({
          type: 'drag_over_remote',
          sourceLabel: myWindowLabel,
          targetLabel: target.label,
          relX: target.rel_x,
          relY: target.rel_y,
          tab: tabs.find((t: Tab) => t.id === draggingTabId)
        });
      } else {
        isHoveringRemote = false;
        tabChannel?.postMessage({
          type: 'drag_leave_remote',
          sourceLabel: myWindowLabel
        });
      }
    } catch (err) {}
  }

  function handlePointerMove(e: PointerEvent) {
    if (!draggingTabId) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!hasMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      hasMoved = true;
    }

    if (hasMoved) {
      tearOffPos = { x: e.clientX, y: e.clientY };

      const isOutside = (
        e.clientX < 0 || e.clientX > window.innerWidth ||
        e.clientY < 0 || e.clientY > window.innerHeight
      );

      // Dragging down away from tab bar or completely outside window
      if (isOutside || dy > 45 || dy < -25) {
        isTearOff = true;
        dragTargetIndex = -1;

        const now = performance.now();
        if (now - lastCheckTime > 35) {
          lastCheckTime = now;
          checkRemoteTarget(e.screenX, e.screenY);
        }
      } else {
        isTearOff = false;
        isHoveringRemote = false;
        activeTargetInfo = null;
        tabChannel?.postMessage({
          type: 'drag_leave_remote',
          sourceLabel: myWindowLabel
        });
        if (scrollAreaEl) {
          const tabNodes = scrollAreaEl.querySelectorAll('.tab-item');
          let newTargetIdx = tabs.length - 1;

          for (let i = 0; i < tabNodes.length; i++) {
            const rect = tabNodes[i].getBoundingClientRect();
            const midX = rect.left + rect.width / 2;
            if (e.clientX < midX) {
              newTargetIdx = i;
              break;
            }
          }
          dragTargetIndex = newTargetIdx;
        }
      }
    }
  }

  async function handlePointerUp(e: PointerEvent, tab: Tab) {
    if (!draggingTabId) return;

    const wasMoved = hasMoved;
    const tearOff = isTearOff;
    const fromIdx = dragStartIndex;
    const toIdx = dragTargetIndex;
    const finalScreenX = e.screenX;
    const finalScreenY = e.screenY;

    const el = e.currentTarget as HTMLElement;
    try {
      el.releasePointerCapture(e.pointerId);
    } catch (err) {}

    draggingTabId = null;
    dragStartIndex = -1;
    dragTargetIndex = -1;
    isTearOff = false;
    hasMoved = false;
    isHoveringRemote = false;

    if (wasMoved && tearOff) {
      let target = activeTargetInfo;
      try {
        const freshTarget = await invoke<{ label: string; rel_x: number; rel_y: number } | null>(
          'find_window_at_point',
          {
            screenX: finalScreenX,
            screenY: finalScreenY,
            excludeLabel: myWindowLabel
          }
        );
        if (freshTarget) {
          target = freshTarget;
        }
      } catch (err) {}

      if (target) {
        // Dropped on an existing window!
        tabChannel?.postMessage({
          type: 'drop_on_remote',
          sourceLabel: myWindowLabel,
          targetLabel: target.label,
          relX: target.rel_x,
          tab: tab
        });

        try {
          await invoke('focus_window', { label: target.label });
        } catch (err) {}

        if (onRemoveClaimedTab) {
          onRemoveClaimedTab(tab.id);
        } else if (onCloseTab) {
          onCloseTab(tab.id);
        }
      } else {
        tabChannel?.postMessage({
          type: 'drag_leave_remote',
          sourceLabel: myWindowLabel
        });
        if (onMoveToNewWindow) {
          onMoveToNewWindow(tab, finalScreenX, finalScreenY);
        }
      }
    } else if (wasMoved && toIdx !== -1 && toIdx !== fromIdx) {
      if (onReorderTabs) {
        onReorderTabs(fromIdx, toIdx);
      }
    } else if (!wasMoved) {
      onSelectTab(tab.id);
    }
  }

  function handlePointerCancel() {
    draggingTabId = null;
    dragStartIndex = -1;
    dragTargetIndex = -1;
    isTearOff = false;
    hasMoved = false;
    isHoveringRemote = false;
    activeTargetInfo = null;
    tabChannel?.postMessage({
      type: 'drag_leave_remote',
      sourceLabel: myWindowLabel
    });
  }

  function handleTabBarDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  function handleTabBarDrop(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0 && onDropFiles) {
      onDropFiles(e.dataTransfer.files);
    }
  }

  function getExtBadge(ext: string): { label: string; color: string } {
    const e = ext.toLowerCase();
    switch (e) {
      case 'md':
      case 'markdown':
        return { label: 'MD', color: '#38bdf8' };
      case 'json':
        return { label: '{}', color: '#f59e0b' };
      case 'csv':
      case 'tsv':
        return { label: 'CSV', color: '#10b981' };
      case 'py':
        return { label: 'PY', color: '#60a5fa' };
      case 'js':
      case 'ts':
        return { label: 'JS', color: '#facc15' };
      case 'rs':
        return { label: 'RS', color: '#fb923c' };
      case 'html':
      case 'xml':
        return { label: '</>', color: '#f87171' };
      case 'css':
        return { label: '#', color: '#818cf8' };
      case 'sql':
        return { label: 'DB', color: '#c084fc' };
      case 'pdf':
        return { label: 'PDF', color: '#ef4444' };
      case 'xlsx':
      case 'xls':
        return { label: 'XLS', color: '#10b981' };
      case 'docx':
      case 'doc':
      case 'rtf':
        return { label: 'DOC', color: '#3b82f6' };
      default:
        return { label: 'TXT', color: '#94a3b8' };
    }
  }

  function handleTabClick(e: MouseEvent, tabId: string) {
    if (e.button === 0) {
      onSelectTab(tabId);
    } else if (e.button === 1) {
      e.preventDefault();
      onCloseTab(tabId);
    }
  }

  function handleContextMenu(e: MouseEvent, tabId: string) {
    e.preventDefault();
    contextMenu = {
      visible: true,
      x: e.clientX,
      y: e.clientY,
      tabId
    };
  }

  function closeContextMenu() {
    contextMenu.visible = false;
  }

  function handleWindowClick() {
    closeContextMenu();
  }

  onMount(async () => {
    window.addEventListener('click', handleWindowClick);

    try {
      myWindowLabel = getCurrentWindow().label;
    } catch (e) {}

    if (typeof BroadcastChannel !== 'undefined') {
      tabChannel = new BroadcastChannel('markpad_cross_window_tabs');
      tabChannel.onmessage = (event) => {
        const data = event.data;
        if (!data || data.sourceLabel === myWindowLabel) return;

        if (data.type === 'drag_over_remote' && data.targetLabel === myWindowLabel) {
          if (scrollAreaEl) {
            const tabNodes = scrollAreaEl.querySelectorAll('.tab-item');
            let targetIdx = tabs.length;
            for (let i = 0; i < tabNodes.length; i++) {
              const tRect = tabNodes[i].getBoundingClientRect();
              const midX = tRect.left + tRect.width / 2;
              if (data.relX < midX) {
                targetIdx = i;
                break;
              }
            }
            remoteDropTargetIndex = targetIdx;
            remoteDraggingTab = data.tab;
          }
        } else if (data.type === 'drag_leave_remote') {
          remoteDropTargetIndex = -1;
          remoteDraggingTab = null;
        } else if (data.type === 'drop_on_remote' && data.targetLabel === myWindowLabel) {
          let insertIdx = remoteDropTargetIndex;
          if (insertIdx === -1 && scrollAreaEl && typeof data.relX === 'number') {
            const tabNodes = scrollAreaEl.querySelectorAll('.tab-item');
            insertIdx = tabs.length;
            for (let i = 0; i < tabNodes.length; i++) {
              const tRect = tabNodes[i].getBoundingClientRect();
              const midX = tRect.left + tRect.width / 2;
              if (data.relX < midX) {
                insertIdx = i;
                break;
              }
            }
          }
          if (insertIdx === -1) insertIdx = tabs.length;

          remoteDropTargetIndex = -1;
          remoteDraggingTab = null;

          if (data.tab) {
            const droppedTab: Tab = {
              ...data.tab,
              id: 'tab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)
            };
            if (onImportRemoteTab) {
              onImportRemoteTab(droppedTab, insertIdx);
            }
          }
        }
      };
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('click', handleWindowClick);
    }
    if (tabChannel) {
      tabChannel.close();
      tabChannel = null;
    }
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="tab-bar-container"
  role="region"
  aria-label="Tabs"
  ondragover={handleTabBarDragOver}
  ondrop={handleTabBarDrop}
>
  <div class="tab-scroll-area" bind:this={scrollAreaEl}>
    {#each tabs as tab, idx (tab.id)}
      {@const badge = getExtBadge(tab.extension)}
      {@const isDragging = draggingTabId === tab.id}
      {@const isTarget = dragTargetIndex === idx && draggingTabId !== tab.id && !isTearOff}
      {@const isRemoteTarget = remoteDropTargetIndex === idx}

      {#if isRemoteTarget}
        <div class="remote-drop-marker" title="Insert here">
          <div class="remote-drop-line"></div>
        </div>
      {/if}

      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="tab-item"
        class:active={tab.id === activeTabId}
        class:dirty={tab.isDirty}
        class:pinned={tab.pinned}
        class:is-dragging={isDragging}
        class:drop-target={isTarget}
        onpointerdown={(e) => handlePointerDown(e, tab.id, idx)}
        onpointermove={handlePointerMove}
        onpointerup={(e) => handlePointerUp(e, tab)}
        onpointercancel={handlePointerCancel}
        oncontextmenu={(e) => handleContextMenu(e, tab.id)}
        title={tab.filePath || tab.title}
      >
        <span class="ext-badge" style="color: {badge.color}">{badge.label}</span>
        
        {#if !tab.pinned}
          <span class="tab-title">
            {#if !tab.filePath && tab.title.startsWith('Untitled')}
              {t('untitled_doc')}{tab.title.substring(8)}
            {:else}
              {tab.title}
            {/if}
          </span>
        {/if}

        <button
          class="close-btn"
          aria-label="Close tab"
          onclick={(e) => {
            e.stopPropagation();
            onCloseTab(tab.id);
          }}
        >
          {#if tab.isDirty}
            <span class="dirty-dot">•</span>
          {/if}
          <span class="close-x">&times;</span>
        </button>
      </div>
    {/each}

    {#if remoteDropTargetIndex >= tabs.length}
      <div class="remote-drop-marker" title="Insert here">
        <div class="remote-drop-line"></div>
      </div>
    {/if}

    <button class="new-tab-btn" aria-label="New tab" title="New Tab (Ctrl+N)" onclick={onNewTab}>
      +
    </button>
  </div>
</div>

{#if isTearOff}
  <div
    class="tear-off-pill"
    class:remote={isHoveringRemote}
    style="left: {tearOffPos.x}px; top: {tearOffPos.y + 24}px;"
  >
    {#if isHoveringRemote}
      📂 Insert into window
    {:else}
      🗔 Release to open in new window
    {/if}
  </div>
{/if}

{#if contextMenu.visible && contextMenu.tabId}
  {@const ctxTab = tabs.find((item: Tab) => item.id === contextMenu.tabId)}
  <div
    class="context-menu"
    style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="menu"
    tabindex="-1"
  >
    <button
      class="menu-item highlight-item"
      onclick={() => {
        if (ctxTab && onMoveToNewWindow) onMoveToNewWindow(ctxTab);
        closeContextMenu();
      }}
    >
      🗔 Move to New Window
    </button>

    <button
      class="menu-item"
      onclick={() => {
        if (onNewWindow) onNewWindow();
        closeContextMenu();
      }}
    >
      🗖 New Window
      <span class="shortcut">Ctrl+Shift+N</span>
    </button>

    <div class="menu-divider"></div>

    {#if ctxTab?.filePath}
      <button
        class="menu-item"
        onclick={() => {
          if (ctxTab?.filePath && onRevealInExplorer) onRevealInExplorer(ctxTab.filePath);
          closeContextMenu();
        }}
      >
        📂 Reveal in File Explorer
      </button>

      <button
        class="menu-item"
        onclick={() => {
          if (ctxTab?.filePath && onOpenFolder) onOpenFolder(ctxTab.filePath);
          closeContextMenu();
        }}
      >
        📁 Open Containing Folder
      </button>

      <button
        class="menu-item"
        onclick={() => {
          if (contextMenu.tabId && onCopyPath) onCopyPath(contextMenu.tabId);
          closeContextMenu();
        }}
      >
        📋 Copy Full Path
      </button>

      <div class="menu-divider"></div>
    {/if}

    <button
      class="menu-item"
      onclick={() => {
        if (contextMenu.tabId && onTogglePin) onTogglePin(contextMenu.tabId);
        closeContextMenu();
      }}
    >
      {ctxTab?.pinned ? 'Unpin Tab' : 'Pin Tab'}
    </button>

    <div class="menu-divider"></div>

    <button
      class="menu-item"
      onclick={() => {
        if (contextMenu.tabId && onSaveTab) onSaveTab(contextMenu.tabId);
        closeContextMenu();
      }}
    >
      Save
      <span class="shortcut">Ctrl+S</span>
    </button>

    <button
      class="menu-item"
      onclick={() => {
        if (contextMenu.tabId && onSaveAsTab) onSaveAsTab(contextMenu.tabId);
        closeContextMenu();
      }}
    >
      Save As...
      <span class="shortcut">Ctrl+Shift+S</span>
    </button>

    <div class="menu-divider"></div>

    <button
      class="menu-item"
      onclick={() => {
        if (contextMenu.tabId) onCloseTab(contextMenu.tabId);
        closeContextMenu();
      }}
    >
      Close
      <span class="shortcut">Ctrl+W</span>
    </button>

    <button
      class="menu-item"
      onclick={() => {
        if (contextMenu.tabId && onCloseOthers) onCloseOthers(contextMenu.tabId);
        closeContextMenu();
      }}
    >
      Close Others
    </button>

    <button
      class="menu-item"
      onclick={() => {
        if (onCloseAll) onCloseAll();
        closeContextMenu();
      }}
    >
      Close All
    </button>
  </div>
{/if}

<style>
  .tab-item.is-dragging {
    opacity: 0.6;
    background: var(--button-hover, #334155) !important;
    transform: scale(0.96);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    z-index: 10;
  }

  .tab-item.drop-target {
    border-left: 3px solid #38bdf8 !important;
    background: rgba(56, 189, 248, 0.2) !important;
  }

  .tear-off-pill {
    position: fixed;
    transform: translate(-50%, 0);
    background: #0284c7;
    color: #ffffff;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    pointer-events: none;
    z-index: 10000;
    animation: fadeIn 0.15s ease-out;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tear-off-pill.remote {
    background: #059669 !important;
    box-shadow: 0 8px 24px rgba(5, 150, 105, 0.6) !important;
  }

  .remote-drop-marker {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 6px;
    height: 28px;
    margin: 0 2px;
    z-index: 20;
    pointer-events: none;
  }

  .remote-drop-line {
    width: 3px;
    height: 100%;
    background: #10b981;
    border-radius: 2px;
    box-shadow: 0 0 10px #10b981;
    animation: pulseMarker 0.8s ease-in-out infinite alternate;
  }

  @keyframes pulseMarker {
    from { opacity: 0.6; transform: scaleY(0.85); }
    to { opacity: 1; transform: scaleY(1); }
  }

  :global(.highlight-item) {
    color: #38bdf8 !important;
    font-weight: 600;
  }
  .tab-bar-container {
    display: flex;
    align-items: center;
    background: var(--tab-bg, #090d16);
    border-bottom: 1px solid var(--border-color, #1e293b);
    height: 36px;
    overflow-x: auto;
    overflow-y: hidden;
    user-select: none;
    scrollbar-width: thin;
    scrollbar-color: var(--border-color, #334155) transparent;
  }

  .tab-scroll-area {
    display: flex;
    align-items: center;
    height: 100%;
    padding-left: 6px;
  }

  .tab-item {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 10px;
    margin-right: 2px;
    background: var(--tab-item-bg, #0f172a);
    border: 1px solid var(--tab-border, #1e293b);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    color: var(--status-text, #94a3b8);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    max-width: 180px;
    min-width: 90px;
    position: relative;
  }

  .tab-item:hover {
    background: var(--button-hover, #1e293b);
    color: var(--text-color, #e2e8f0);
  }

  .tab-item.active {
    background: var(--tab-item-active-bg, #1e293b);
    color: var(--text-color, #f8fafc);
    border-color: #38bdf8;
    border-bottom: 2px solid #38bdf8;
  }

  .tab-item.pinned {
    min-width: 40px;
    max-width: 44px;
    justify-content: center;
    padding: 0 6px;
  }

  .ext-badge {
    font-size: 10px;
    font-weight: 700;
    font-family: ui-monospace, monospace;
    line-height: 1;
  }

  .tab-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 0;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #f1f5f9;
  }

  .dirty-dot {
    color: #f59e0b;
    font-size: 16px;
    line-height: 1;
  }

  .tab-item:hover .dirty-dot {
    display: none;
  }

  .close-x {
    display: none;
  }

  .tab-item:hover .close-x {
    display: inline;
  }

  .tab-item:not(.dirty) .close-x {
    display: inline;
  }

  .new-tab-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: #64748b;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    margin-left: 4px;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .new-tab-btn:hover {
    background: #1e293b;
    color: #f8fafc;
  }

  /* Context Menu */
  .context-menu {
    position: fixed;
    z-index: 1000;
    background: var(--surface-bg, #0f172a);
    border: 1px solid var(--card-border, #334155);
    border-radius: 8px;
    padding: 4px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    min-width: 160px;
  }

  .menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 6px 12px;
    border: none;
    background: transparent;
    color: var(--text-color, #cbd5e1);
    font-size: 12px;
    text-align: left;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.12s ease;
  }

  .menu-item:hover {
    background: #38bdf8;
    color: #0f172a;
    font-weight: 600;
  }

  .shortcut {
    font-size: 10px;
    opacity: 0.7;
    margin-left: 12px;
  }

  .menu-divider {
    height: 1px;
    background: var(--border-color, #1e293b);
    margin: 4px 0;
  }
</style>
