<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { open, save, ask } from '@tauri-apps/plugin-dialog';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { onMount } from 'svelte';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import Editor from '../Editor.svelte';
  import DataViewer from '../DataViewer.svelte';
  import WebPreview from '../WebPreview.svelte';
  import JsonTreeViewer from '../JsonTreeViewer.svelte';
  import EnvInspector from '../EnvInspector.svelte';
  import LogAnalyzer from '../LogAnalyzer.svelte';
  import PdfViewer from '../PdfViewer.svelte';
  import OfficeViewer from '../OfficeViewer.svelte';
  import TabBar, { type Tab } from '../TabBar.svelte';
  import StatusBar from '../StatusBar.svelte';
  import { t, getLocale, setLocale, type LocaleKey } from '../i18n.svelte';
  import { exportAsHtml, generateStandaloneHtml, printToPdf, escapeHtml } from '../export';

  function getDefaultModeForExt(ext: string): Tab['mode'] {
    const e = ext.toLowerCase();
    if (['pdf'].includes(e)) return 'pdf';
    if (['xlsx', 'xls', 'docx', 'doc'].includes(e)) return 'office';
    if (['csv', 'tsv'].includes(e)) return 'dataviewer';
    if (['md', 'markdown'].includes(e)) return 'preview';
    if (['html', 'htm', 'svg'].includes(e)) return 'webpreview';
    if (['json', 'yaml', 'yml'].includes(e)) return 'jsontree';
    if (['env', 'ini', 'toml', 'conf'].includes(e)) return 'envinspector';
    if (['log'].includes(e)) return 'loganalyzer';
    return 'editor';
  }

  // ─── Initial Tab Creation ─────────────────────────────────────────────
  function createDefaultTab(id = 'tab-1', title = 'Untitled'): Tab {
    return {
      id,
      title,
      filePath: null,
      content: '',
      originalContent: '',
      isDirty: false,
      extension: '',
      cursorPos: { line: 1, col: 1, selectionLen: 0 },
      lineEnding: 'CRLF',
      encoding: 'UTF-8',
      mode: 'editor',
      bytes: null,
      pinned: false
    };
  }

  // ─── State ───────────────────────────────────────────────────────────
  let tabs = $state<Tab[]>([createDefaultTab()]);
  let activeTabId = $state<string>('tab-1');
  let recentFiles = $state<Array<{ path: string; name: string; timestamp: number }>>([]);
  let themePreference = $state<'dark' | 'light'>('dark');
  let wordWrap = $state(false);
  let showInvisibles = $state(false);
  let toasts = $state<Array<{ id: number; message: string; type: 'success' | 'error' }>>([]);
  let showLegalModal = $state(false);
  let showRecentsModal = $state(false);
  let showExportModal = $state(false);
  let showFeedbackModal = $state(false);

  async function openExternalUrl(url: string) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
    } catch (e) {
      window.open(url, '_blank');
    }
  }

  let editorRef: { triggerSearch: () => void; triggerGotoLine: () => void } | undefined = $state();
  let officeViewerRef: {
    saveDocument?: (forceSaveAs?: boolean) => Promise<void>;
    saveExcelDocument?: (forceSaveAs?: boolean) => Promise<void>;
    saveWordDocument?: (forceSaveAs?: boolean) => Promise<void>;
    triggerSearch?: () => void;
    getExportHtml?: () => string;
    getPlainText?: () => string;
  } | undefined = $state();
  let pdfViewerRef: {
    printDocument?: () => Promise<void>;
    triggerSearch?: () => void;
    saveAsCopy?: () => Promise<void>;
    getPlainText?: () => Promise<string>;
  } | undefined = $state();

  let isDraggingFiles = $state(false);

  // ─── Derived ─────────────────────────────────────────────────────────
  let isDarkMode = $derived(themePreference === 'dark');

  let activeTab = $derived.by(() => {
    return tabs.find((t) => t.id === activeTabId) || tabs[0];
  });

  let parsedHtml = $derived.by(() => {
    if (!activeTab) return '';
    if ((activeTab.extension === 'md' || activeTab.extension === 'markdown') && activeTab.mode === 'preview') {
      const result = marked.parse(activeTab.content, { gfm: true, breaks: true });
      return DOMPurify.sanitize(typeof result === 'string' ? result : '');
    }
    return '';
  });

  let windowTitle = $derived.by(() => {
    if (!activeTab) return t('untitled');
    const dirtyMark = activeTab.isDirty ? '• ' : '';
    let name = activeTab.filePath ? activeTab.filePath.split('\\').pop() || activeTab.title : activeTab.title;
    if (!activeTab.filePath && name.startsWith('Untitled')) {
      name = t('untitled_doc') + name.substring(8);
    }
    return `${dirtyMark}${name} — Markpad Native`;
  });

  // Stats
  let activeWordCount = $derived.by(() => {
    if (!activeTab || !activeTab.content) return 0;
    const trimmed = activeTab.content.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  });

  let activeCharCount = $derived.by(() => {
    return activeTab ? activeTab.content.length : 0;
  });

  let activeFileSize = $derived.by(() => {
    if (!activeTab) return 0;
    if (activeTab.bytes && activeTab.bytes.length > 0) return activeTab.bytes.length;
    return new TextEncoder().encode(activeTab.content).byteLength;
  });

  let activeLanguage = $derived.by(() => {
    if (!activeTab) return t('plain_text');
    const ext = activeTab.extension.toLowerCase();
    switch (ext) {
      case 'md': case 'markdown': return 'Markdown';
      case 'json': return 'JSON';
      case 'csv': case 'tsv': return 'CSV / Data';
      case 'pdf': return 'PDF Document';
      case 'docx': case 'doc': return 'Word Document';
      case 'xlsx': case 'xls': return 'Excel Workbook';
      case 'rtf': return 'Rich Text (RTF)';
      case 'py': return 'Python';
      case 'js': case 'jsx': return 'JavaScript';
      case 'ts': case 'tsx': return 'TypeScript';
      case 'rs': return 'Rust';
      case 'html': case 'htm': return 'HTML';
      case 'css': case 'scss': return 'CSS';
      case 'sql': return 'SQL';
      case 'xml': case 'svg': return 'XML / SVG';
      case 'yaml': case 'yml': return 'YAML';
      case 'toml': return 'TOML';
      case 'env': case 'ini': case 'conf': return 'Config / Env';
      case 'log': return 'Log File';
      case 'cpp': case 'c': case 'h': case 'hpp': return 'C/C++';
      default: return t('plain_text');
    }
  });

  // ─── Toast System ───────────────────────────────────────────────────
  let toastCounter = 0;
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    const id = ++toastCounter;
    toasts.push({ id, message, type });
    setTimeout(() => {
      const idx = toasts.findIndex((toast) => toast.id === id);
      if (idx !== -1) toasts.splice(idx, 1);
    }, 3000);
  }

  // ─── Export Actions ──────────────────────────────────────────────────
  function getActiveTabExportHtml(): string {
    if (!activeTab) return '';
    if (activeTab.mode === 'office' && officeViewerRef?.getExportHtml) {
      const officeHtml = officeViewerRef.getExportHtml();
      if (officeHtml) return officeHtml;
    }
    if ((activeTab.extension === 'md' || activeTab.extension === 'markdown') && parsedHtml) {
      return parsedHtml;
    }
    return `<pre><code>${escapeHtml(activeTab.content)}</code></pre>`;
  }

  function getActiveTabPlainText(): string {
    if (!activeTab) return '';
    if (activeTab.mode === 'office' && officeViewerRef?.getPlainText) {
      const officeText = officeViewerRef.getPlainText();
      if (officeText) return officeText;
    }
    return activeTab.content;
  }

  async function handleExportHtml() {
    if (!activeTab) return;
    if (activeTab.mode === 'pdf') {
      showToast('PDF files cannot be exported to HTML', 'error');
      return;
    }
    const htmlToExport = getActiveTabExportHtml();
    const ok = await exportAsHtml(activeTab.title, htmlToExport, isDarkMode);
    if (ok) showToast('Exported Standalone HTML successfully', 'success');
  }

  async function handleExportPdf() {
    if (!activeTab) return;
    if (activeTab.mode === 'pdf' && pdfViewerRef?.printDocument) {
      await pdfViewerRef.printDocument();
      return;
    }
    const htmlToExport = getActiveTabExportHtml();
    printToPdf(activeTab.title, htmlToExport);
    showToast('Opening PDF Print Engine...', 'success');
  }

  async function handleCopyHtmlToClipboard() {
    if (!activeTab) return;
    if (activeTab.mode === 'pdf') {
      showToast('PDF files cannot be copied as HTML', 'error');
      return;
    }
    const htmlContent = getActiveTabExportHtml();
    const htmlToCopy = generateStandaloneHtml({ title: activeTab.title, htmlContent, isDark: isDarkMode });
    try {
      await navigator.clipboard.writeText(htmlToCopy);
      showToast('HTML copied to clipboard', 'success');
    } catch (e) {
      showToast('Failed to copy HTML', 'error');
    }
  }

  async function handleCopyTextToClipboard() {
    if (!activeTab) return;
    try {
      let textToCopy = getActiveTabPlainText();
      if (activeTab.mode === 'pdf' && pdfViewerRef?.getPlainText) {
        textToCopy = await pdfViewerRef.getPlainText();
      }
      await navigator.clipboard.writeText(textToCopy);
      showToast('Text copied to clipboard', 'success');
    } catch (e) {
      showToast('Failed to copy text', 'error');
    }
  }

  // ─── Code Formatter (1-Click Pretty Print) ─────────────────────────
  function formatCurrentDocument() {
    if (!activeTab || !activeTab.content) return;
    const ext = activeTab.extension.toLowerCase();

    try {
      if (ext === 'json') {
        const obj = JSON.parse(activeTab.content);
        activeTab.content = JSON.stringify(obj, null, 2);
        showToast('Formatted JSON document', 'success');
      } else if (ext === 'sql') {
        const keywords = ['SELECT', 'FROM', 'WHERE', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'ON', 'GROUP BY', 'ORDER BY', 'LIMIT', 'HAVING', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE'];
        let formatted = activeTab.content;
        for (const kw of keywords) {
          const reg = new RegExp(`\\b${kw}\\b`, 'gi');
          formatted = formatted.replace(reg, kw);
        }
        activeTab.content = formatted;
        showToast('Formatted SQL keywords', 'success');
      } else {
        showToast('Code formatted', 'success');
      }
      activeTab.isDirty = activeTab.content !== activeTab.originalContent;
    } catch (e) {
      showToast('Formatting error: Invalid document syntax', 'error');
    }
  }

  // ─── Session & Recent Files Management ──────────────────────────────
  function addToRecentFiles(path: string) {
    if (!path) return;
    const name = path.split('\\').pop() || path;
    const filtered = recentFiles.filter((r) => r.path !== path);
    recentFiles = [{ path, name, timestamp: Date.now() }, ...filtered].slice(0, 15);
    localStorage.setItem('markpad-recents', JSON.stringify(recentFiles));
  }

  function saveSession() {
    try {
      const maxContentLen = 500_000;
      const sessionData = {
        activeTabId,
        tabs: tabs.map((t) => ({
          id: t.id,
          title: t.title,
          filePath: t.filePath,
          content: t.filePath ? '' : (t.content.length > maxContentLen ? t.content.slice(0, maxContentLen) : t.content),
          isDirty: t.isDirty,
          extension: t.extension,
          pinned: t.pinned,
          mode: t.mode
        }))
      };
      try {
        localStorage.setItem('markpad-session', JSON.stringify(sessionData));
      } catch (quotaErr) {
        console.warn('LocalStorage quota exceeded, saving minimal session:', quotaErr);
        const minimalSession = {
          ...sessionData,
          tabs: sessionData.tabs.map((t) => ({ ...t, content: '' }))
        };
        localStorage.setItem('markpad-session', JSON.stringify(minimalSession));
      }
    } catch (e) {
      console.error('Failed to save session', e);
    }
  }

  $effect(() => {
    saveSession();
  });

  $effect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDarkMode);
    }
  });

  // ─── Tab Operations ─────────────────────────────────────────────────
  let tabIdCounter = 1;

  function createNewTab(filePath: string | null = null, content = '', title?: string, bytes: Uint8Array | null = null): string {
    const newId = `tab-${++tabIdCounter}`;
    const ext = filePath ? filePath.split('.').pop()?.toLowerCase() || '' : '';
    const tabTitle = title || (filePath ? filePath.split('\\').pop() || 'Untitled' : `Untitled-${tabIdCounter}`);

    const newTab: Tab = {
      id: newId,
      title: tabTitle,
      filePath,
      content,
      bytes,
      originalContent: content,
      isDirty: false,
      extension: ext,
      cursorPos: { line: 1, col: 1, selectionLen: 0 },
      lineEnding: content.includes('\r\n') ? 'CRLF' : 'LF',
      encoding: 'UTF-8',
      mode: getDefaultModeForExt(ext),
      pinned: false
    };

    tabs.push(newTab);
    activeTabId = newId;
    return newId;
  }

  function handleSelectTab(id: string) {
    activeTabId = id;
  }

  function handleCloseTab(id: string) {
    const targetTab = tabs.find((t) => t.id === id);
    if (!targetTab) return;

    if (targetTab.isDirty) {
      const confirmClose = window.confirm(`"${targetTab.title}" has unsaved changes. Do you want to close it without saving?`);
      if (!confirmClose) return;
    }

    const idx = tabs.findIndex((t) => t.id === id);
    tabs = tabs.filter((t) => t.id !== id);

    if (tabs.length === 0) {
      createNewTab();
    } else if (activeTabId === id) {
      const nextIdx = Math.min(idx, tabs.length - 1);
      activeTabId = tabs[nextIdx].id;
    }
  }

  function handleCloseOthers(id: string) {
    const dirtyOthers = tabs.filter((t) => t.id !== id && t.isDirty);
    if (dirtyOthers.length > 0) {
      const confirmClose = window.confirm(`Some tabs have unsaved changes. Close all other tabs anyway?`);
      if (!confirmClose) return;
    }
    tabs = tabs.filter((t) => t.id === id || t.pinned);
    activeTabId = id;
  }

  function handleCloseAll() {
    const dirtyTabs = tabs.filter((t) => t.isDirty);
    if (dirtyTabs.length > 0) {
      const confirmClose = window.confirm(`Some tabs have unsaved changes. Close all tabs anyway?`);
      if (!confirmClose) return;
    }
    tabs = [];
    createNewTab();
  }

  function handleTogglePin(id: string) {
    const target = tabs.find((t) => t.id === id);
    if (target) {
      target.pinned = !target.pinned;
    }
  }

  async function handleCopyPath(id: string) {
    const target = tabs.find((t) => t.id === id);
    if (target?.filePath) {
      try {
        await navigator.clipboard.writeText(target.filePath);
        showToast('Path copied to clipboard', 'success');
      } catch (e) {
        showToast('Failed to copy path', 'error');
      }
    }
  }

  // ─── File Operations ─────────────────────────────────────────────────
  async function loadFileIntoTab(path: string) {
    try {
      const ext = path.split('.').pop()?.toLowerCase() || '';
      const isBinaryFormat = ['pdf', 'xlsx', 'xls', 'docx', 'doc'].includes(ext);

      let content = '';
      let bytes: Uint8Array | null = null;

      if (isBinaryFormat) {
        const rawBytes = await invoke<number[]>('read_file_bytes', { path });
        bytes = new Uint8Array(rawBytes);
      } else {
        content = await invoke<string>('read_file_content', { path });
      }

      addToRecentFiles(path);

      if (activeTab && !activeTab.filePath && !activeTab.isDirty && activeTab.content === '' && !activeTab.bytes) {
        activeTab.filePath = path;
        activeTab.content = content;
        activeTab.bytes = bytes;
        activeTab.originalContent = content;
        activeTab.isDirty = false;
        activeTab.title = path.split('\\').pop() || 'Untitled';
        activeTab.extension = ext;
        activeTab.lineEnding = content.includes('\r\n') ? 'CRLF' : 'LF';
        activeTab.mode = getDefaultModeForExt(ext);
      } else {
        createNewTab(path, content, undefined, bytes);
      }
    } catch (e) {
      console.error('Failed to load file', e);
      showToast(`${t('error_open')}: ${e}`, 'error');
    }
  }

  async function openFile() {
    try {
      const selected = await open({
        multiple: false,
        title: t('open'),
        filters: [
          {
            name: 'All Supported Formats',
            extensions: [
              'md', 'markdown', 'txt', 'json', 'yaml', 'yml', 'toml', 'xml',
              'csv', 'tsv', 'log', 'ini', 'env', 'js', 'ts', 'jsx', 'tsx', 'html',
              'htm', 'css', 'scss', 'py', 'rs', 'c', 'cpp', 'h', 'hpp',
              'sql', 'sh', 'bat', 'ps1', 'svg', 'pdf', 'xlsx', 'xls', 'docx', 'doc', 'rtf'
            ]
          },
          {
            name: 'Office & PDF Documents',
            extensions: ['pdf', 'xlsx', 'xls', 'docx', 'doc', 'rtf']
          },
          {
            name: 'Text & Code Files',
            extensions: [
              'md', 'markdown', 'txt', 'json', 'yaml', 'yml', 'toml', 'xml',
              'csv', 'tsv', 'log', 'ini', 'env', 'js', 'ts', 'jsx', 'tsx', 'html',
              'htm', 'css', 'scss', 'py', 'rs', 'c', 'cpp', 'h', 'hpp',
              'sql', 'sh', 'bat', 'ps1', 'svg'
            ]
          },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (selected) {
        await loadFileIntoTab(selected as string);
      }
    } catch (e) {
      console.error('Failed to open file dialog', e);
      showToast(`${t('error_open')}: ${e}`, 'error');
    }
  }

  async function openNewWindow(
    filePath: string | null = null,
    tab: Tab | null = null,
    screenX?: number,
    screenY?: number
  ) {
    try {
      if (tab || filePath) {
        const transferId = 'transfer_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        try {
          localStorage.setItem('markpad_transfer_' + transferId, JSON.stringify({
            timestamp: Date.now(),
            tab: tab ? {
              title: tab.title,
              filePath: tab.filePath,
              content: tab.content,
              originalContent: tab.originalContent,
              isDirty: tab.isDirty,
              extension: tab.extension,
              lineEnding: tab.lineEnding,
              encoding: tab.encoding,
              mode: tab.mode
            } : null,
            filePath: filePath || (tab ? tab.filePath : null)
          }));
        } catch (e) {
          console.error('Failed to store transfer data in localStorage', e);
        }
      }

      await invoke('open_new_window', {
        x: screenX ? Math.max(0, screenX - 100) : null,
        y: screenY ? Math.max(0, screenY - 20) : null
      });
    } catch (e) {
      console.error('Failed to open new window:', e);
      showToast(`Failed to open new window: ${e}`, 'error');
    }
  }

  async function handleMoveToNewWindow(tab: Tab, screenX?: number, screenY?: number) {
    await openNewWindow(tab.filePath, tab, screenX, screenY);
    if (tabs.length > 1) {
      tabs = tabs.filter((t) => t.id !== tab.id);
      if (activeTabId === tab.id) {
        activeTabId = tabs[0].id;
      }
    } else {
      // If it was the only tab, close this window so it has moved to the new window
      try {
        await getCurrentWindow().destroy();
      } catch (e) {}
    }
  }

  function handleImportRemoteTab(tab: Tab, targetIndex: number) {
    if (tabs.length === 1 && !tabs[0].filePath && tabs[0].content === '' && !tabs[0].isDirty && tabs[0].title === 'Untitled') {
      tabs = [tab];
    } else {
      const newTabs = [...tabs];
      const safeIdx = Math.max(0, Math.min(targetIndex, newTabs.length));
      newTabs.splice(safeIdx, 0, tab);
      tabs = newTabs;
    }
    activeTabId = tab.id;
    showToast(`Added tab "${tab.title}" from another window`, 'success');
  }

  async function handleRemoveClaimedTab(tabId: string) {
    if (tabs.length > 1) {
      tabs = tabs.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) {
        activeTabId = tabs[0].id;
      }
    } else {
      // If the only tab was dragged out into another window, close this empty window
      try {
        await getCurrentWindow().close();
      } catch (e) {
        try {
          await getCurrentWindow().destroy();
        } catch (err) {}
      }
    }
  }

  async function handleFilesDropped(files: FileList | string[]) {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      if (typeof item === 'string') {
        await loadFileIntoTab(item);
      } else {
        const path = (item as any).path;
        if (path) {
          await loadFileIntoTab(path);
        } else {
          const ext = item.name.split('.').pop()?.toLowerCase() || '';
          const isBinary = ['pdf', 'xlsx', 'xls', 'docx', 'doc', 'rtf'].includes(ext);
          if (isBinary) {
            const buf = await item.arrayBuffer();
            createNewTab(null, '', item.name, new Uint8Array(buf));
          } else {
            const text = await item.text();
            createNewTab(null, text, item.name);
          }
        }
      }
    }
    showToast(`Opened dropped file${files.length > 1 ? 's' : ''}`, 'success');
  }

  function triggerFind() {
    if (activeTab?.mode === 'office') {
      officeViewerRef?.triggerSearch?.();
    } else if (activeTab?.mode === 'pdf') {
      pdfViewerRef?.triggerSearch?.();
    } else {
      editorRef?.triggerSearch?.();
    }
  }

  async function saveActiveFile(forceSaveAs = false) {
    if (!activeTab) return;

    if (activeTab.mode === 'office') {
      if (officeViewerRef?.saveDocument) {
        await officeViewerRef.saveDocument(forceSaveAs);
      }
      return;
    }

    if (activeTab.mode === 'pdf') {
      if (pdfViewerRef?.saveAsCopy) {
        await pdfViewerRef.saveAsCopy();
      } else {
        showToast('PDF documents are view-only.', 'error');
      }
      return;
    }

    let targetPath = activeTab.filePath;

    if (!targetPath || forceSaveAs) {
      try {
        const selected = await save({
          title: forceSaveAs ? 'Save As' : t('save'),
          defaultPath: targetPath || activeTab.title
        });
        if (selected) {
          targetPath = selected as string;
          activeTab.filePath = targetPath;
          activeTab.title = targetPath.split('\\').pop() || activeTab.title;
          activeTab.extension = targetPath.split('.').pop()?.toLowerCase() || '';
          addToRecentFiles(targetPath);
        } else {
          return;
        }
      } catch (e) {
        console.error('Save dialog error', e);
        return;
      }
    }

    try {
      await invoke('save_file_content', { path: targetPath, content: activeTab.content });
      activeTab.originalContent = activeTab.content;
      activeTab.isDirty = false;
      showToast(t('saved'), 'success');
    } catch (e) {
      console.error('Failed to save file', e);
      showToast(`${t('error_save')}: ${e}`, 'error');
    }
  }

  function updateActiveTabContent(newContent: string) {
    if (activeTab) {
      activeTab.content = newContent;
      activeTab.isDirty = activeTab.content !== activeTab.originalContent;
    }
  }

  // ─── Toggles ────────────────────────────────────────────────────────
  function toggleWordWrap() {
    wordWrap = !wordWrap;
    localStorage.setItem('markpad-wordwrap', String(wordWrap));
    showToast(`Word Wrap: ${wordWrap ? 'On' : 'Off'}`, 'success');
  }

  function toggleInvisibles() {
    showInvisibles = !showInvisibles;
    localStorage.setItem('markpad-invisibles', String(showInvisibles));
    showToast(`Show Invisibles: ${showInvisibles ? 'On' : 'Off'}`, 'success');
  }

  function toggleLineEnding() {
    if (!activeTab) return;
    if (activeTab.lineEnding === 'CRLF') {
      activeTab.content = activeTab.content.replace(/\r\n/g, '\n');
      activeTab.lineEnding = 'LF';
      showToast('Line endings converted to LF', 'success');
    } else {
      activeTab.content = activeTab.content.replace(/(?<!\r)\n/g, '\r\n');
      activeTab.lineEnding = 'CRLF';
      showToast('Line endings converted to CRLF', 'success');
    }
    activeTab.isDirty = activeTab.content !== activeTab.originalContent;
  }

  // ─── Keyboard Shortcuts ──────────────────────────────────────────────
  function handleKeydown(e: KeyboardEvent) {
    if (e.ctrlKey && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
      e.preventDefault();
      openNewWindow();
    } else if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      createNewTab();
    } else if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
      e.preventDefault();
      saveActiveFile(true);
    } else if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveActiveFile(false);
    } else if (e.ctrlKey && e.key === 'o') {
      e.preventDefault();
      openFile();
    } else if (e.ctrlKey && (e.key === 'r' || e.key === 'R')) {
      e.preventDefault();
      showRecentsModal = true;
    } else if (e.ctrlKey && (e.key === 'e' || e.key === 'E')) {
      e.preventDefault();
      showExportModal = true;
    } else if (e.ctrlKey && e.key === 'w') {
      e.preventDefault();
      if (activeTab) handleCloseTab(activeTab.id);
    } else if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      triggerFind();
    } else if (e.ctrlKey && e.key === 'g') {
      e.preventDefault();
      editorRef?.triggerGotoLine();
    } else if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      toggleWordWrap();
    } else if (e.altKey && (e.key === 'w' || e.key === 'W')) {
      e.preventDefault();
      toggleInvisibles();
    } else if (e.ctrlKey && e.key === 'Tab') {
      e.preventDefault();
      if (tabs.length > 1) {
        const currentIdx = tabs.findIndex((t) => t.id === activeTabId);
        const nextIdx = e.shiftKey
          ? (currentIdx - 1 + tabs.length) % tabs.length
          : (currentIdx + 1) % tabs.length;
        activeTabId = tabs[nextIdx].id;
      }
    }
  }

  // ─── Theme & Mode Cycling ───────────────────────────────────────────
  function cycleTheme() {
    themePreference = themePreference === 'dark' ? 'light' : 'dark';
    localStorage.setItem('markpad-theme', themePreference);
  }

  function setMode(mode: Tab['mode']) {
    if (activeTab) {
      if (['docx', 'doc', 'xlsx', 'xls', 'pdf', 'rtf'].includes(activeTab.extension.toLowerCase()) && mode === 'editor') {
        return;
      }
      activeTab.mode = mode;
    }
  }

  // ─── Initialization ──────────────────────────────────────────────────
  onMount(async () => {
    const savedTheme = localStorage.getItem('markpad-theme') as 'dark' | 'light' | null;
    if (savedTheme && ['dark', 'light'].includes(savedTheme)) {
      themePreference = savedTheme;
    }

    wordWrap = localStorage.getItem('markpad-wordwrap') === 'true';
    showInvisibles = localStorage.getItem('markpad-invisibles') === 'true';

    const savedRecents = localStorage.getItem('markpad-recents');
    if (savedRecents) {
      try { recentFiles = JSON.parse(savedRecents); } catch (e) {}
    }

    const savedSession = localStorage.getItem('markpad-session');
    if (savedSession) {
      try {
        const data = JSON.parse(savedSession);
        if (data.tabs && Array.isArray(data.tabs) && data.tabs.length > 0) {
          const restoredTabs: Tab[] = [];
          for (const tData of data.tabs) {
            if (tData.filePath) {
              try {
                const content = await invoke<string>('read_file_content', { path: tData.filePath });
                restoredTabs.push({
                  id: tData.id,
                  title: tData.title,
                  filePath: tData.filePath,
                  content,
                  originalContent: content,
                  isDirty: false,
                  extension: tData.extension,
                  cursorPos: { line: 1, col: 1, selectionLen: 0 },
                  lineEnding: content.includes('\r\n') ? 'CRLF' : 'LF',
                  encoding: 'UTF-8',
                  mode: tData.mode || getDefaultModeForExt(tData.extension),
                  pinned: tData.pinned || false
                });
              } catch (e) {}
            } else if (tData.content) {
              restoredTabs.push({
                id: tData.id,
                title: tData.title,
                filePath: null,
                content: tData.content,
                originalContent: tData.content,
                isDirty: tData.isDirty || false,
                extension: tData.extension || '',
                cursorPos: { line: 1, col: 1, selectionLen: 0 },
                lineEnding: 'CRLF',
                encoding: 'UTF-8',
                mode: tData.mode || 'editor',
                pinned: tData.pinned || false
              });
            }
          }
          if (restoredTabs.length > 0) {
            tabs = restoredTabs;
            if (data.activeTabId && restoredTabs.some((t) => t.id === data.activeTabId)) {
              activeTabId = data.activeTabId;
            } else {
              activeTabId = restoredTabs[0].id;
            }
          }
        }
      } catch (e) {
        console.error('Session restore error', e);
      }
    }

    try {
      let latestTransfer: any = null;
      let latestKey: string | null = null;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('markpad_transfer_')) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const item = JSON.parse(raw);
              if (item && item.timestamp && Date.now() - item.timestamp < 15000) {
                if (!latestTransfer || item.timestamp > latestTransfer.timestamp) {
                  latestTransfer = item;
                  latestKey = key;
                }
              } else {
                localStorage.removeItem(key);
              }
            }
          } catch (e) {}
        }
      }

      if (latestKey && latestTransfer) {
        localStorage.removeItem(latestKey);
        if (latestTransfer.tab) {
          tabs = [{
            id: 'tab_' + Date.now(),
            title: latestTransfer.tab.title || 'Untitled',
            filePath: latestTransfer.tab.filePath || null,
            content: latestTransfer.tab.content || '',
            originalContent: latestTransfer.tab.originalContent || '',
            isDirty: latestTransfer.tab.isDirty || false,
            extension: latestTransfer.tab.extension || 'txt',
            cursorPos: { line: 1, col: 1, selectionLen: 0 },
            lineEnding: latestTransfer.tab.lineEnding || 'LF',
            encoding: latestTransfer.tab.encoding || 'UTF-8',
            mode: latestTransfer.tab.mode || 'editor'
          }];
          activeTabId = tabs[0].id;
        } else if (latestTransfer.filePath) {
          await loadFileIntoTab(latestTransfer.filePath);
        }
      } else {
        const args = await invoke<string[]>('get_startup_args');
        if (args && args.length > 1) {
          const startupPath = args[1];
          if (!startupPath.startsWith('--')) {
            await loadFileIntoTab(startupPath);
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse transfer / startup arguments', e);
    }

    try {
      const { listen } = await import('@tauri-apps/api/event');
      await listen<string>('open-file-from-cli', async (event) => {
        if (event.payload) {
          await loadFileIntoTab(event.payload);
        }
      });
    } catch (err) {}

    try {
      const appWindow = getCurrentWindow();
      await appWindow.onCloseRequested(async (event) => {
        const hasDirty = tabs.some((t) => t.isDirty);
        if (hasDirty) {
          event.preventDefault();
          const confirmClose = await ask('You have unsaved changes in Markpad Native. Are you sure you want to exit?', {
            title: 'Unsaved Changes',
            kind: 'warning',
          });
          if (confirmClose) {
            await appWindow.destroy();
          }
        }
      });

      await appWindow.onDragDropEvent(async (event) => {
        if (event.payload.type === 'enter' || event.payload.type === 'over') {
          isDraggingFiles = true;
        } else if (event.payload.type === 'leave') {
          isDraggingFiles = false;
        } else if (event.payload.type === 'drop') {
          isDraggingFiles = false;
          const paths = event.payload.paths;
          if (paths && paths.length > 0) {
            await handleFilesDropped(paths);
          }
        }
      });

      const onWinDragOver = (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
          isDraggingFiles = true;
        }
      };
      const onWinDragLeave = (e: DragEvent) => {
        if (!e.relatedTarget) {
          isDraggingFiles = false;
        }
      };
      const onWinDrop = async (e: DragEvent) => {
        e.preventDefault();
        isDraggingFiles = false;
        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
          await handleFilesDropped(e.dataTransfer.files);
        }
      };

      window.addEventListener('dragover', onWinDragOver);
      window.addEventListener('dragleave', onWinDragLeave);
      window.addEventListener('drop', onWinDrop);
    } catch (e) {}
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
  <title>{windowTitle}</title>
</svelte:head>

<main class="app-container" class:dark={isDarkMode} class:file-drop-glow={isDraggingFiles}>
  {#if isDraggingFiles}
    <div class="drop-banner">
      <span>📂 Drop file(s) here to open in Markpad</span>
    </div>
  {/if}

  <!-- ─── Title Bar ─────────────────────────────────────────────────── -->
  <div data-tauri-drag-region class="titlebar">
    <div class="menu">
      <button onclick={openFile} title="Open File (Ctrl+O)">{t('open')}</button>
      <button onclick={() => saveActiveFile(false)} title="Save File (Ctrl+S)">{t('save')}</button>
      <button onclick={() => saveActiveFile(true)} title="Save As (Ctrl+Shift+S)">{t('save_as')}</button>
      <button onclick={() => (showExportModal = true)} title="Export PDF / HTML / Clipboard (Ctrl+E)">{t('export')}</button>
      <button onclick={() => (showRecentsModal = true)} title="Recent Files (Ctrl+R)">{t('recents')}</button>
      <button onclick={triggerFind} title="Find / Replace (Ctrl+F)">{t('find')}</button>
      <button onclick={formatCurrentDocument} title="1-Click Auto Format Code">{t('format')}</button>
      <button onclick={() => (showLegalModal = true)} title="Legal & Publisher Information">{t('legal')}</button>
    </div>
    
    <div class="title" data-tauri-drag-region>
      {windowTitle}
    </div>

    <div class="modes">
      <button onclick={cycleTheme} class="icon-btn" title="Toggle Theme (Dark / Light)">
        {themePreference === 'dark' ? '🌙' : '☀️'}
      </button>

      <select
        value={getLocale()}
        onchange={(e) => setLocale(e.currentTarget.value as LocaleKey)}
        class="lang-select icon-btn"
        title="Switch Language"
      >
        <option value="en">EN</option>
        <option value="zh">ZH</option>
        <option value="es">ES</option>
        <option value="ja">JA</option>
        <option value="ko">KO</option>
        <option value="ru">RU</option>
        <option value="uz">UZ</option>
      </select>

      {#if !['docx', 'doc', 'xlsx', 'xls', 'pdf', 'rtf'].includes(activeTab?.extension.toLowerCase() || '')}
        <div class="divider"></div>

        <button class:active={activeTab?.mode === 'editor'} onclick={() => setMode('editor')}>
          {t('edit')}
        </button>
      {/if}
      
      {#if activeTab?.extension === 'csv' || activeTab?.extension === 'tsv'}
        <button class:active={activeTab?.mode === 'dataviewer'} onclick={() => setMode('dataviewer')}>
          Data Table
        </button>
      {/if}

      {#if activeTab?.extension === 'md' || activeTab?.extension === 'markdown'}
        <button class:active={activeTab?.mode === 'preview'} onclick={() => setMode('preview')}>
          {t('view')}
        </button>
      {/if}

      {#if ['html', 'htm', 'svg'].includes(activeTab?.extension.toLowerCase() || '')}
        <button class:active={activeTab?.mode === 'webpreview'} onclick={() => setMode('webpreview')}>
          Web Preview
        </button>
      {/if}

      {#if ['json', 'yaml', 'yml'].includes(activeTab?.extension.toLowerCase() || '')}
        <button class:active={activeTab?.mode === 'jsontree'} onclick={() => setMode('jsontree')}>
          Tree View
        </button>
      {/if}

      {#if ['env', 'ini', 'toml', 'conf'].includes(activeTab?.extension.toLowerCase() || '')}
        <button class:active={activeTab?.mode === 'envinspector'} onclick={() => setMode('envinspector')}>
          Key-Value
        </button>
      {/if}

      {#if activeTab?.extension.toLowerCase() === 'log'}
        <button class:active={activeTab?.mode === 'loganalyzer'} onclick={() => setMode('loganalyzer')}>
          Log Filter
        </button>
      {/if}
    </div>
  </div>

  <!-- ─── Tab Bar (VS Code Style) ──────────────────────────────────── -->
  <TabBar
    {tabs}
    {activeTabId}
    onSelectTab={handleSelectTab}
    onCloseTab={handleCloseTab}
    onNewTab={() => createNewTab()}
    onCloseOthers={handleCloseOthers}
    onCloseAll={handleCloseAll}
    onTogglePin={handleTogglePin}
    onCopyPath={handleCopyPath}
    onSaveTab={() => saveActiveFile(false)}
    onSaveAsTab={(tabId) => {
      activeTabId = tabId;
      saveActiveFile(true);
    }}
    onReorderTabs={(fromIndex, toIndex) => {
      const reordered = [...tabs];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      tabs = reordered;
    }}
    onRevealInExplorer={async (path) => {
      try {
        await invoke('reveal_file', { path });
      } catch (e) {
        showToast(`Failed to reveal file: ${e}`, 'error');
      }
    }}
    onOpenFolder={async (path) => {
      try {
        await invoke('open_containing_folder', { path });
      } catch (e) {
        showToast(`Failed to open folder: ${e}`, 'error');
      }
    }}
    onMoveToNewWindow={handleMoveToNewWindow}
    onNewWindow={() => openNewWindow()}
    onDropFiles={handleFilesDropped}
    onImportRemoteTab={handleImportRemoteTab}
    onRemoveClaimedTab={handleRemoveClaimedTab}
  />

  <!-- ─── Editor / View Area ────────────────────────────────────────── -->
  <div class="editor-wrapper">
    {#if activeTab}
      {#if activeTab.mode === 'preview'}
        <div class="markdown-body">
          {@html parsedHtml}
        </div>
      {:else if activeTab.mode === 'dataviewer'}
        <DataViewer content={activeTab.content} extension={activeTab.extension} />
      {:else if activeTab.mode === 'webpreview'}
        <WebPreview content={activeTab.content} extension={activeTab.extension} />
      {:else if activeTab.mode === 'jsontree'}
        <JsonTreeViewer content={activeTab.content} extension={activeTab.extension} />
      {:else if activeTab.mode === 'envinspector'}
        <EnvInspector content={activeTab.content} extension={activeTab.extension} />
      {:else if activeTab.mode === 'loganalyzer'}
        <LogAnalyzer content={activeTab.content} extension={activeTab.extension} />
      {:else if activeTab.mode === 'pdf'}
        <PdfViewer
          bind:this={pdfViewerRef}
          bytes={activeTab.bytes || null}
          filePath={activeTab.filePath || ''}
        />
      {:else if activeTab.mode === 'office'}
        <OfficeViewer
          bind:this={officeViewerRef}
          bytes={activeTab.bytes || null}
          extension={activeTab.extension}
          filePath={activeTab.filePath || ''}
          onDirtyChange={(dirty) => {
            if (activeTab) activeTab.isDirty = dirty;
          }}
          onFilePathChange={(newPath) => {
            if (activeTab) {
              activeTab.filePath = newPath;
              activeTab.title = newPath.split('\\').pop() || activeTab.title;
              activeTab.extension = newPath.split('.').pop()?.toLowerCase() || '';
              addToRecentFiles(newPath);
            }
          }}
        />
      {:else}
        <Editor
          bind:this={editorRef}
          content={activeTab.content}
          extension={activeTab.extension}
          isDark={isDarkMode}
          {wordWrap}
          {showInvisibles}
          onContentChange={updateActiveTabContent}
          onCursorChange={(pos) => {
            if (activeTab) activeTab.cursorPos = pos;
          }}
        />
      {/if}
    {/if}
  </div>

  <!-- ─── Status Bar ────────────────────────────────────────────────── -->
  <StatusBar
    line={activeTab?.cursorPos.line || 1}
    col={activeTab?.cursorPos.col || 1}
    selectionLen={activeTab?.cursorPos.selectionLen || 0}
    charCount={activeCharCount}
    wordCount={activeWordCount}
    fileSize={activeFileSize}
    encoding={activeTab?.encoding || 'UTF-8'}
    lineEnding={activeTab?.lineEnding || 'CRLF'}
    language={activeLanguage}
    isDirty={activeTab?.isDirty || false}
    filePath={activeTab?.filePath || null}
    activeMode={activeTab?.mode || 'editor'}
    {wordWrap}
    {showInvisibles}
    onToggleWordWrap={toggleWordWrap}
    onToggleInvisibles={toggleInvisibles}
    onToggleLineEnding={toggleLineEnding}
    onToggleEncoding={() => showToast('Encoding: UTF-8 (Unicode)', 'success')}
    onOpenFeedback={() => (showFeedbackModal = true)}
  />

  <!-- ─── Export Engine Modal ────────────────────────────────────────── -->
  {#if showExportModal}
    <div
      class="modal-backdrop"
      onclick={() => (showExportModal = false)}
      onkeydown={(e) => e.key === 'Escape' && (showExportModal = false)}
      role="button"
      tabindex="0"
    >
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="modal-box"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="document"
        tabindex="-1"
      >
        <div class="modal-header">
          <h2>{t('export_title')}</h2>
          <button class="modal-close" onclick={() => (showExportModal = false)}>&times;</button>
        </div>
        <div class="modal-body export-options">
          <div
            class="export-card"
            onclick={() => {
              handleExportPdf();
              showExportModal = false;
            }}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && handleExportPdf()}
          >
            <div class="export-icon">📄</div>
            <div class="export-details">
              <div class="export-title">{t('export_pdf_title')}</div>
              <div class="export-desc">{t('export_pdf_desc')}</div>
            </div>
          </div>

          <div
            class="export-card"
            onclick={() => {
              handleExportHtml();
              showExportModal = false;
            }}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && handleExportHtml()}
          >
            <div class="export-icon">🌐</div>
            <div class="export-details">
              <div class="export-title">{t('export_html_title')}</div>
              <div class="export-desc">{t('export_html_desc')}</div>
            </div>
          </div>

          <div
            class="export-card"
            onclick={() => {
              handleCopyHtmlToClipboard();
              showExportModal = false;
            }}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && handleCopyHtmlToClipboard()}
          >
            <div class="export-icon">📋</div>
            <div class="export-details">
              <div class="export-title">{t('export_html_copy_title')}</div>
              <div class="export-desc">{t('export_html_copy_desc')}</div>
            </div>
          </div>

          <div
            class="export-card"
            onclick={() => {
              handleCopyTextToClipboard();
              showExportModal = false;
            }}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && handleCopyTextToClipboard()}
          >
            <div class="export-icon">📝</div>
            <div class="export-details">
              <div class="export-title">{t('export_text_copy_title')}</div>
              <div class="export-desc">{t('export_text_copy_desc')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- ─── Recent Files Modal ────────────────────────────────────────── -->
  {#if showRecentsModal}
    <div
      class="modal-backdrop"
      onclick={() => (showRecentsModal = false)}
      onkeydown={(e) => e.key === 'Escape' && (showRecentsModal = false)}
      role="button"
      tabindex="0"
    >
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="modal-box"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="document"
        tabindex="-1"
      >
        <div class="modal-header">
          <h2>{t('recent_title')} (Ctrl+R)</h2>
          <button class="modal-close" onclick={() => (showRecentsModal = false)}>&times;</button>
        </div>
        <div class="modal-body recents-list">
          {#if recentFiles.length === 0}
            <p class="empty-state">{t('recent_empty')}</p>
          {:else}
            {#each recentFiles as recent (recent.path)}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="recent-item"
                onclick={() => {
                  loadFileIntoTab(recent.path);
                  showRecentsModal = false;
                }}
              >
                <div class="recent-name">{recent.name}</div>
                <div class="recent-path">{recent.path}</div>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- ─── Legal / Publisher Info Modal ──────────────────────────────── -->
  {#if showLegalModal}
    <div
      class="modal-backdrop"
      onclick={() => (showLegalModal = false)}
      onkeydown={(e) => e.key === 'Escape' && (showLegalModal = false)}
      role="button"
      tabindex="0"
    >
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="modal-box"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="document"
        tabindex="-1"
      >
        <div class="modal-header">
          <h2>{t('legal_title')}</h2>
          <button class="modal-close" onclick={() => (showLegalModal = false)}>&times;</button>
        </div>
        <div class="modal-body">
          <p><strong>{t('legal_app_name')}</strong> Markpad Native v2.0</p>
          <p><strong>{t('legal_publisher')}</strong> Vodiy</p>
          <p><strong>{t('legal_author')}</strong> Vodiy Engineering Team</p>
          <p><strong>{t('legal_license')}</strong> MIT License</p>
          <p><strong>{t('legal_arch')}</strong> Tauri v2 + Rust + Svelte 5 + CodeMirror 6</p>
          <hr />
          <p class="legal-text">
            {t('legal_desc')}
          </p>
        </div>
      </div>
    </div>
  {/if}

  <!-- ─── Feedback & Support Modal ────────────────────────────────────── -->
  {#if showFeedbackModal}
    <div
      class="modal-backdrop"
      onclick={() => (showFeedbackModal = false)}
      onkeydown={(e) => e.key === 'Escape' && (showFeedbackModal = false)}
      role="button"
      tabindex="0"
    >
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="modal-box feedback-modal-box"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="document"
        tabindex="-1"
      >
        <div class="modal-header">
          <h2>💖 Support Markpad & Give Feedback</h2>
          <button class="modal-close" onclick={() => (showFeedbackModal = false)}>&times;</button>
        </div>
        <div class="modal-body feedback-modal-body">
          <p class="feedback-intro">
            Markpad is a <strong>totally free tool</strong> with zero ads and zero paywalls. If you want to support our journey, donate as you like, or give us your valuable opinions, ratings, and feedback!
          </p>

          <div class="feedback-options">
            <button
              class="feedback-card feedback-card-survey"
              onclick={() => {
                showFeedbackModal = false;
                openExternalUrl('https://docs.google.com/forms/d/e/1FAIpQLSekDrj5FJL30WB11xkq4FUtnseJFCsp5yQda54XHllHuN9xnQ/viewform');
              }}
            >
              <div class="fb-icon">💬</div>
              <div class="fb-details">
                <div class="fb-title">Give Feedback & Rate Us</div>
                <div class="fb-desc">Fill out our quick 2-minute Google Form survey</div>
              </div>
              <div class="fb-arrow">↗</div>
            </button>

            <button
              class="feedback-card feedback-card-donate"
              onclick={() => {
                showFeedbackModal = false;
                openExternalUrl('https://github.com/sponsors/shukurillo0526');
              }}
            >
              <div class="fb-icon">💖</div>
              <div class="fb-details">
                <div class="fb-title">Donate / Sponsor</div>
                <div class="fb-desc">Support ongoing development and improvements as you like</div>
              </div>
              <div class="fb-arrow">↗</div>
            </button>

            <button
              class="feedback-card feedback-card-github"
              onclick={() => {
                showFeedbackModal = false;
                openExternalUrl('https://github.com/shukurillo0526/Markpad');
              }}
            >
              <div class="fb-icon">⭐</div>
              <div class="fb-details">
                <div class="fb-title">Star on GitHub</div>
                <div class="fb-desc">Help more developers discover Markpad</div>
              </div>
              <div class="fb-arrow">↗</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- ─── Toast Notifications ───────────────────────────────────────── -->
  {#if toasts.length > 0}
    <div class="toast-container">
      {#each toasts as toast (toast.id)}
        <div
          class="toast"
          class:toast-error={toast.type === 'error'}
          class:toast-success={toast.type === 'success'}
        >
          <span class="toast-icon">{toast.type === 'success' ? '✓' : '✕'}</span>
          <span class="toast-message">{toast.message}</span>
        </div>
      {/each}
    </div>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    overflow: hidden;
  }

  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background-color: #f8fafc;
    color: #0f172a;
    --bg-color: #f8fafc;
    --text-color: #0f172a;
    --border-color: #e2e8f0;
    --button-hover: #e2e8f0;
    --surface-bg: #ffffff;
    --surface-secondary: #f1f5f9;
    --tab-bg: #f1f5f9;
    --tab-item-bg: #e2e8f0;
    --tab-item-active-bg: #ffffff;
    --tab-border: #cbd5e1;
    --status-bg: #f1f5f9;
    --status-text: #475569;
    --status-border: #e2e8f0;
    --card-bg: #ffffff;
    --card-border: #e2e8f0;
  }

  .app-container.dark {
    background-color: #090d16;
    color: #e2e8f0;
    --bg-color: #090d16;
    --text-color: #e2e8f0;
    --border-color: #1e293b;
    --button-hover: #1e293b;
    --surface-bg: #0f172a;
    --surface-secondary: #1e293b;
    --tab-bg: #090d16;
    --tab-item-bg: #0f172a;
    --tab-item-active-bg: #1e293b;
    --tab-border: #1e293b;
    --status-bg: #0f172a;
    --status-text: #94a3b8;
    --status-border: #1e293b;
    --card-bg: #0f172a;
    --card-border: #334155;
  }

  .titlebar {
    height: 38px;
    background-color: var(--bg-color);
    display: flex;
    align-items: center;
    padding: 0 10px;
    border-bottom: 1px solid var(--border-color);
    user-select: none;
    flex-shrink: 0;
  }

  .menu {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .menu button,
  .modes button {
    background: transparent;
    border: none;
    color: var(--text-color);
    opacity: 0.85;
    padding: 4px 10px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    border-radius: 4px;
    transition: background-color 0.15s ease, color 0.15s ease;
  }

  .menu button:hover,
  .modes button:hover {
    background: var(--button-hover);
    color: var(--text-color);
    opacity: 1;
  }

  .modes {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .modes button.active {
    background-color: #38bdf8;
    color: #0f172a;
    font-weight: 700;
  }

  .lang-select {
    color: var(--text-color);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 3px 6px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    cursor: pointer;
    outline: none;
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }

  .lang-select:hover {
    background: var(--button-hover);
    color: var(--text-color);
  }

  .lang-select option {
    background-color: var(--surface-bg);
    color: var(--text-color);
  }

  .divider {
    width: 1px;
    height: 16px;
    background: #334155;
    margin: 0 4px;
  }

  .icon-btn {
    opacity: 0.85;
  }

  .title {
    flex: 1;
    text-align: center;
    font-size: 12px;
    color: #94a3b8;
    font-weight: 500;
    pointer-events: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 16px;
  }

  /* Editor Wrapper */
  .editor-wrapper {
    flex: 1;
    overflow: hidden;
    position: relative;
    background: var(--bg-color);
  }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .modal-box {
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    width: 540px;
    max-width: 90vw;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    color: var(--text-color);
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    background: var(--button-hover);
  }

  .modal-header h2 {
    font-size: 15px;
    margin: 0;
    font-weight: 600;
    color: #38bdf8;
  }

  .modal-close {
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 20px;
    cursor: pointer;
  }

  .modal-close:hover {
    color: var(--text-color);
  }

  .modal-body {
    padding: 20px;
    font-size: 13px;
    line-height: 1.6;
    max-height: 60vh;
    overflow-y: auto;
  }

  .export-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .export-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: var(--button-hover);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .export-card:hover {
    background: var(--border-color);
    border-color: #38bdf8;
  }

  .export-icon {
    font-size: 24px;
  }

  .export-title {
    font-weight: 600;
    color: var(--text-color);
    font-size: 13px;
  }

  .export-desc {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
  }

  .recent-item {
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    background: var(--button-hover);
    margin-bottom: 6px;
    transition: background 0.15s ease;
  }

  .recent-item:hover {
    background: #38bdf8;
    color: var(--bg-color);
  }

  .recent-name {
    font-weight: 600;
    font-size: 13px;
  }

  .recent-path {
    font-size: 11px;
    opacity: 0.7;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty-state {
    color: #94a3b8;
    text-align: center;
    margin: 20px 0;
  }

  .modal-body p {
    margin: 6px 0;
  }

  .legal-text {
    color: #94a3b8;
    font-style: italic;
  }

  /* Feedback & Support Modal */
  .feedback-modal-box {
    width: 480px;
  }

  .feedback-intro {
    color: var(--text-color);
    margin-top: 0;
    margin-bottom: 16px;
    font-size: 13px;
    line-height: 1.5;
  }

  .feedback-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .feedback-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: var(--button-hover);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    width: 100%;
    color: var(--text-color);
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
  }

  .feedback-card:hover {
    background: var(--border-color);
    transform: translateY(-1px);
  }

  .feedback-card-survey:hover {
    border-color: #10b981;
  }

  .feedback-card-donate:hover {
    border-color: #ec4899;
  }

  .feedback-card-github:hover {
    border-color: #eab308;
  }

  .fb-icon {
    font-size: 22px;
  }

  .fb-details {
    flex: 1;
  }

  .fb-title {
    font-weight: 600;
    font-size: 13px;
    color: var(--text-color);
  }

  .fb-desc {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
  }

  .fb-arrow {
    font-size: 16px;
    color: #94a3b8;
  }

  /* Toasts */
  .toast-container {
    position: fixed;
    bottom: 34px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 9999;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
  }

  .toast-success {
    background-color: #10b981;
    color: white;
  }

  .toast-error {
    background-color: #ef4444;
    color: white;
  }

  .toast-icon {
    font-weight: bold;
  }

  /* Markdown Preview */
  :global(.markdown-body) {
    padding: 40px;
    max-width: 850px;
    margin: 0 auto;
    line-height: 1.7;
    font-size: 15px;
    color: var(--text-color);
    height: 100%;
    overflow-y: auto;
  }

  :global(.markdown-body h1),
  :global(.markdown-body h2) {
    border-bottom: 1px solid #334155;
    padding-bottom: 0.3em;
  }

  :global(.markdown-body pre) {
    background-color: var(--button-hover);
    padding: 14px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }

  :global(.markdown-body code) {
    background-color: var(--button-hover);
    padding: 2px 6px;
    border-radius: 4px;
    color: #38bdf8;
  }

  /* Drag & Drop Visuals */
  .app-container.file-drop-glow {
    outline: 2px dashed #0284c7;
    outline-offset: -2px;
  }

  .drop-banner {
    position: fixed;
    top: 36px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    background: #0284c7;
    color: #ffffff;
    font-size: 13px;
    font-weight: 600;
    padding: 6px 18px;
    border-radius: 20px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
    pointer-events: none;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: dropBannerSlide 0.15s ease-out;
  }

  @keyframes dropBannerSlide {
    from {
      opacity: 0;
      transform: translate(-50%, -10px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
</style>
