<script lang="ts">
  import { onMount } from 'svelte';
  import DataViewer from './DataViewer.svelte';

  let {
    bytes = null,
    extension = 'xlsx',
    filePath = ''
  } = $props<{
    bytes: Uint8Array | null;
    extension?: string;
    filePath?: string;
  }>();

  let loading = $state(true);
  let errorMsg = $state<string | null>(null);

  // Excel state
  let workbookInstance: any = null;
  let sheetNames = $state<string[]>([]);
  let activeSheet = $state<string>('');
  let currentSheetCsv = $state<string>('');
  let rowCount = $state<number>(0);

  // Word state
  let docxHtml = $state<string>('');
  let wordCount = $state<number>(0);
  let wordTheme = $state<'paper' | 'dark'>('paper');
  let fontScale = $state<number>(100);

  let ext = $derived(extension.toLowerCase());

  async function loadDocument() {
    if (!bytes || bytes.length === 0) {
      loading = false;
      return;
    }

    loading = true;
    errorMsg = null;

    try {
      if (ext === 'xlsx' || ext === 'xls') {
        const XLSX = await import('xlsx');
        workbookInstance = XLSX.read(bytes, { type: 'array' });

        sheetNames = workbookInstance.SheetNames || [];
        if (sheetNames.length > 0) {
          activeSheet = sheetNames[0];
          updateSheetData(activeSheet, XLSX);
        }
      } else if (ext === 'docx' || ext === 'doc' || ext === 'rtf') {
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
        docxHtml = result.value || '<p>Document is empty</p>';

        // Calculate approximate word count
        const textOnly = docxHtml.replace(/<[^>]+>/g, ' ');
        const words = textOnly.trim().split(/\s+/).filter(Boolean);
        wordCount = words.length;
      }
    } catch (err) {
      console.error('Office parsing error:', err);
      errorMsg = (err as Error).message || 'Failed to parse document';
    } finally {
      loading = false;
    }
  }

  function updateSheetData(name: string, XLSX?: any) {
    if (!workbookInstance) return;
    activeSheet = name;
    const sheet = workbookInstance.Sheets[name];
    if (sheet) {
      const csv = (XLSX || (window as any).XLSX)?.utils?.sheet_to_csv(sheet) || '';
      currentSheetCsv = csv;
      rowCount = csv ? csv.split('\n').filter(Boolean).length : 0;
    } else {
      currentSheetCsv = '';
      rowCount = 0;
    }
  }

  async function selectSheet(name: string) {
    if (!workbookInstance) return;
    const XLSX = await import('xlsx');
    updateSheetData(name, XLSX);
  }

  function exportCurrentSheetCsv() {
    if (!currentSheetCsv) return;
    const blob = new Blob([currentSheetCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeSheet || 'sheet'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyDocxText() {
    if (!docxHtml) return;
    const tempEl = document.createElement('div');
    tempEl.innerHTML = docxHtml;
    const text = tempEl.innerText || tempEl.textContent || '';
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error('Failed to copy text', e);
    }
  }

  function toggleWordTheme() {
    wordTheme = wordTheme === 'paper' ? 'dark' : 'paper';
  }

  function increaseFontSize() {
    if (fontScale < 160) fontScale += 10;
  }

  function decreaseFontSize() {
    if (fontScale > 70) fontScale -= 10;
  }

  function resetFontSize() {
    fontScale = 100;
  }

  $effect(() => {
    if (bytes) {
      loadDocument();
    }
  });
</script>

<div class="office-viewer-container">
  {#if loading}
    <div class="center-state">
      <div class="spinner"></div>
      <p>Loading {ext.toUpperCase()} document...</p>
    </div>
  {:else if errorMsg}
    <div class="error-banner">
      <h3>Failed to load document</h3>
      <p>{errorMsg}</p>
    </div>
  {:else if ext === 'xlsx' || ext === 'xls'}
    <!-- Excel Workbook View -->
    <div class="office-toolbar">
      <div class="toolbar-group">
        <span class="office-badge excel-badge">📗 EXCEL (XLSX)</span>
        <span class="toolbar-stat">{sheetNames.length} Sheet{sheetNames.length === 1 ? '' : 's'}</span>
        {#if rowCount > 0}
          <span class="toolbar-stat">• {rowCount} Rows</span>
        {/if}
      </div>

      <div class="toolbar-group">
        <div class="sheet-tabs-list">
          {#each sheetNames as sheet}
            <button
              class="sheet-tab"
              class:active={sheet === activeSheet}
              onclick={() => selectSheet(sheet)}
              title="Switch to sheet {sheet}"
            >
              📊 {sheet}
            </button>
          {/each}
        </div>
      </div>

      <div class="toolbar-group end-group">
        <button class="tool-action-btn" onclick={exportCurrentSheetCsv} title="Export active sheet as CSV">
          📥 Export CSV
        </button>
        <span class="readonly-badge">READ ONLY</span>
      </div>
    </div>

    <div class="sheet-content">
      <DataViewer content={currentSheetCsv} extension="csv" />
    </div>
  {:else if ext === 'docx' || ext === 'doc' || ext === 'rtf'}
    <!-- Word Document View -->
    <div class="office-toolbar">
      <div class="toolbar-group">
        <span class="office-badge word-badge">📘 WORD (DOCX)</span>
        {#if wordCount > 0}
          <span class="toolbar-stat">{wordCount.toLocaleString()} Words</span>
        {/if}
      </div>

      <div class="toolbar-group">
        <button
          class="tool-btn"
          onclick={toggleWordTheme}
          title="Toggle Paper White / Dark Theme"
        >
          {wordTheme === 'paper' ? '🌙 Dark Mode' : '☀️ Paper White'}
        </button>

        <div class="font-controls">
          <button class="tool-btn font-btn" onclick={decreaseFontSize} title="Smaller Font">A-</button>
          <button class="tool-btn font-btn font-scale" onclick={resetFontSize} title="Reset Font Size">{fontScale}%</button>
          <button class="tool-btn font-btn" onclick={increaseFontSize} title="Larger Font">A+</button>
        </div>

        <button class="tool-btn" onclick={copyDocxText} title="Copy all text to clipboard">
          📋 Copy Text
        </button>
      </div>

      <div class="toolbar-group end-group">
        <span class="readonly-badge">READ ONLY</span>
      </div>
    </div>

    <div class="docx-wrapper" class:dark-paper={wordTheme === 'dark'}>
      <div
        class="docx-page"
        class:dark-page={wordTheme === 'dark'}
        style="font-size: {fontScale}%"
      >
        {@html docxHtml}
      </div>
    </div>
  {/if}
</div>

<style>
  .office-viewer-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-color, #090d16);
    color: var(--text-color, #0f172a);
    overflow: hidden;
  }

  /* Office Toolbar */
  .office-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 14px;
    background: var(--surface-bg, #0f172a);
    border-bottom: 1px solid var(--border-color, #1e293b);
    user-select: none;
    flex-shrink: 0;
    flex-wrap: wrap;
    z-index: 5;
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .end-group {
    margin-left: auto;
  }

  .office-badge {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.5px;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .excel-badge {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .word-badge {
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.3);
  }

  .readonly-badge {
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.5px;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--surface-secondary, #1e293b);
    color: var(--status-text, #94a3b8);
    border: 1px solid var(--border-color, #334155);
  }

  .toolbar-stat {
    font-size: 11px;
    color: var(--status-text, #94a3b8);
    font-weight: 500;
  }

  .tool-btn {
    background: var(--surface-secondary, #1e293b);
    color: var(--text-color, #e2e8f0);
    border: 1px solid var(--border-color, #334155);
    border-radius: 4px;
    padding: 3px 9px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
    white-space: nowrap;
  }

  .tool-btn:hover {
    background: #38bdf8;
    color: #0f172a;
    border-color: #38bdf8;
  }

  .tool-action-btn {
    background: var(--surface-secondary, #1e293b);
    color: var(--text-color, #e2e8f0);
    border: 1px solid var(--border-color, #334155);
    border-radius: 4px;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .tool-action-btn:hover {
    background: #10b981;
    color: #ffffff;
    border-color: #10b981;
  }

  .font-controls {
    display: flex;
    align-items: center;
  }

  .font-btn {
    border-radius: 0;
    border-right-width: 0;
  }

  .font-btn:first-child {
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
  }

  .font-btn:last-child {
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
    border-right-width: 1px;
  }

  .font-scale {
    min-width: 44px;
    text-align: center;
  }

  /* Sheet Tabs */
  .sheet-tabs-list {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
    max-width: 50vw;
  }

  .sheet-tab {
    background: var(--surface-secondary, #1e293b);
    color: var(--text-color, #cbd5e1);
    border: 1px solid var(--border-color, #334155);
    border-radius: 4px;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .sheet-tab:hover {
    border-color: #10b981;
    color: var(--text-color, #ffffff);
  }

  .sheet-tab.active {
    background: #10b981;
    color: #ffffff;
    border-color: #10b981;
    font-weight: 700;
  }

  .sheet-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Word Document View */
  .docx-wrapper {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 32px 20px;
    display: flex;
    justify-content: center;
    background: #e2e8f0;
    box-sizing: border-box;
    width: 100%;
  }

  .docx-wrapper.dark-paper {
    background: #0b1120;
  }

  .docx-page {
    width: 100%;
    max-width: 820px;
    background: #ffffff;
    color: #1e293b;
    padding: 56px 64px;
    border-radius: 6px;
    box-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.15);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.75;
    min-height: 600px;
    box-sizing: border-box;
    overflow-wrap: break-word;
    word-wrap: break-word;
  }

  .docx-page.dark-page {
    background: #1e293b;
    color: #f1f5f9;
    box-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.5);
  }

  :global(.docx-page h1, .docx-page h2, .docx-page h3) {
    color: inherit;
    margin-top: 1.6em;
    margin-bottom: 0.6em;
    border-bottom: 1px solid rgba(128, 128, 128, 0.2);
    padding-bottom: 0.3em;
  }

  :global(.docx-page p) {
    margin: 1em 0;
  }

  :global(.docx-page table) {
    width: 100%;
    max-width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    display: table;
    overflow-x: auto;
  }

  :global(.docx-page th, .docx-page td) {
    border: 1px solid rgba(128, 128, 128, 0.3);
    padding: 8px 12px;
    text-align: left;
  }

  :global(.docx-page th) {
    background: rgba(128, 128, 128, 0.1);
    font-weight: 700;
  }

  :global(.docx-page img) {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    margin: 16px 0;
  }

  :global(.docx-page blockquote) {
    border-left: 4px solid #38bdf8;
    margin: 16px 0;
    padding-left: 16px;
    color: #64748b;
    font-style: italic;
  }

  :global(.docx-page.dark-page blockquote) {
    color: #94a3b8;
  }

  :global(.docx-page pre) {
    background: rgba(128, 128, 128, 0.1);
    padding: 14px;
    border-radius: 6px;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 90%;
  }

  /* Center / Error */
  .center-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 12px;
    color: var(--status-text, #94a3b8);
  }

  .spinner {
    width: 30px;
    height: 30px;
    border: 3px solid rgba(128, 128, 128, 0.2);
    border-top-color: #38bdf8;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .error-banner {
    margin: 30px auto;
    padding: 20px;
    max-width: 500px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #ef4444;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .docx-page {
      padding: 24px 20px;
    }
    .sheet-tabs-list {
      max-width: 100%;
    }
  }
</style>
