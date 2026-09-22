<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { save } from '@tauri-apps/plugin-dialog';
  import { printToPdf, escapeHtml } from './export';
  import { t } from './i18n.svelte';

  let {
    bytes = null,
    extension = 'xlsx',
    filePath = '',
    onDirtyChange = () => {},
    onFilePathChange = () => {}
  } = $props<{
    bytes: Uint8Array | null;
    extension?: string;
    filePath?: string;
    onDirtyChange?: (isDirty: boolean) => void;
    onFilePathChange?: (newPath: string) => void;
  }>();

  let loading = $state(true);
  let saving = $state(false);
  let errorMsg = $state<string | null>(null);
  let toastMsg = $state<string | null>(null);

  // ─── Excel Spreadsheet State ──────────────────────────────────────────
  let workbookInstance: any = null;
  let sheetNames = $state<string[]>([]);
  let activeSheet = $state<string>('');
  let sheetData = $state<string[][]>([]);
  let searchQuery = $state<string>('');
  let currentPage = $state<number>(1);
  const pageSize = 100;
  let excelSearchInputEl: HTMLInputElement | null = $state(null);

  // ─── Word Document State ──────────────────────────────────────────────
  let docxPageEl: HTMLDivElement | null = null;
  let docxHtml = $state<string>('');
  let wordCount = $state<number>(0);
  let wordTheme = $state<'paper' | 'dark'>('paper');
  let fontScale = $state<number>(100);

  // ─── Word In-Document Find State ──────────────────────────────────────
  let showWordFind = $state(false);
  let wordFindQuery = $state('');
  let wordFindMatches = $state<HTMLElement[]>([]);
  let wordFindIndex = $state(0);
  let wordFindInputEl: HTMLInputElement | null = $state(null);

  let ext = $derived(extension.toLowerCase());
  let lastLoadedBytes: Uint8Array | null = null;

  function showNotification(msg: string) {
    toastMsg = msg;
    setTimeout(() => {
      if (toastMsg === msg) toastMsg = null;
    }, 3000);
  }

  // ─── Document Loading ────────────────────────────────────────────────
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
          loadSheetData(activeSheet, XLSX);
        }
      } else if (ext === 'docx' || ext === 'doc' || ext === 'rtf') {
        const mammoth = await import('mammoth');
        const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
        docxHtml = result.value || '<p>Document is empty</p>';
      }
    } catch (err) {
      console.error('Office parsing error:', err);
      errorMsg = (err as Error).message || 'Failed to parse document';
    } finally {
      loading = false;
      await tick();
      if (docxPageEl && docxHtml) {
        docxPageEl.innerHTML = docxHtml;
        updateWordCount();
      }
    }
  }

  function initDocx(node: HTMLDivElement) {
    docxPageEl = node;
    if (docxHtml) {
      node.innerHTML = docxHtml;
      updateWordCount();
    }
    return {
      destroy() {
        if (docxPageEl === node) {
          docxPageEl = null;
        }
      }
    };
  }

  // ─── Excel Operations ─────────────────────────────────────────────────
  function loadSheetData(name: string, XLSXModule?: any) {
    if (!workbookInstance) return;
    activeSheet = name;
    currentPage = 1;
    const sheet = workbookInstance.Sheets[name];
    if (sheet) {
      const XLSX = XLSXModule || (window as any).XLSX;
      // Convert sheet to array of arrays (AOA)
      const rawData = XLSX?.utils?.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][];
      sheetData = Array.isArray(rawData) && rawData.length > 0 ? rawData : [['']];
    } else {
      sheetData = [['']];
    }
  }

  async function selectSheet(name: string) {
    const XLSX = await import('xlsx');
    loadSheetData(name, XLSX);
  }

  function handleCellChange(rowIdx: number, colIdx: number, val: string) {
    if (!sheetData[rowIdx]) return;
    sheetData[rowIdx][colIdx] = val;
    onDirtyChange(true);
  }

  function addRow() {
    const colCount = sheetData[0]?.length || 5;
    const newRow = new Array(colCount).fill('');
    sheetData = [...sheetData, newRow];
    onDirtyChange(true);
    showNotification('Added new row');
  }

  function addColumn() {
    sheetData = sheetData.map((row) => [...row, '']);
    onDirtyChange(true);
    showNotification('Added new column');
  }

  function deleteLastRow() {
    if (sheetData.length <= 1) return;
    sheetData = sheetData.slice(0, -1);
    onDirtyChange(true);
    showNotification('Removed last row');
  }

  let filteredRows = $derived.by(() => {
    if (!searchQuery.trim()) return sheetData;
    const q = searchQuery.toLowerCase();
    const header = sheetData[0] || [];
    const matched = sheetData.slice(1).filter((row) =>
      row.some((cell) => String(cell).toLowerCase().includes(q))
    );
    return [header, ...matched];
  });

  let totalDataRows = $derived(Math.max(0, filteredRows.length - 1));
  let totalPages = $derived(Math.max(1, Math.ceil(totalDataRows / pageSize)));
  let visibleRows = $derived.by(() => {
    if (filteredRows.length <= 1) return [];
    const start = 1 + (currentPage - 1) * pageSize;
    const end = Math.min(filteredRows.length, start + pageSize);
    return filteredRows.slice(start, end);
  });

  async function promptSaveAs(defaultExt: string, defaultName: string): Promise<string | null> {
    try {
      const filterName = defaultExt === 'xlsx' ? 'Excel Workbook (*.xlsx)' : 'Word Document (*.docx)';
      const selected = await save({
        title: 'Save As',
        defaultPath: filePath || defaultName,
        filters: [
          { name: filterName, extensions: [defaultExt] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      return selected as string | null;
    } catch (err) {
      console.error('Save dialog error:', err);
      return null;
    }
  }

  export async function saveExcelDocument(forceSaveAs = false) {
    if (!workbookInstance) {
      showNotification('Cannot save: No active spreadsheet');
      return;
    }

    saving = true;
    try {
      const XLSX = await import('xlsx');
      // Update active sheet in workbook
      const newSheet = XLSX.utils.aoa_to_sheet(sheetData);
      workbookInstance.Sheets[activeSheet] = newSheet;

      // Write updated workbook to Uint8Array
      const outArray = XLSX.write(workbookInstance, { bookType: 'xlsx', type: 'array' });
      const uint8 = new Uint8Array(outArray);

      let targetPath = filePath;
      if (forceSaveAs || !targetPath) {
        const chosen = await promptSaveAs('xlsx', 'Spreadsheet.xlsx');
        if (!chosen) {
          saving = false;
          return;
        }
        targetPath = chosen;
      }

      try {
        await invoke('save_file_bytes', { path: targetPath, bytes: Array.from(uint8) });
      } catch (writeErr: any) {
        console.warn('Direct save failed, attempting Save As dialog:', writeErr);
        showNotification('Permission denied on original path. Please choose a save location.');
        const chosen = await promptSaveAs('xlsx', targetPath.split('\\').pop() || 'Spreadsheet.xlsx');
        if (!chosen) {
          saving = false;
          return;
        }
        targetPath = chosen;
        await invoke('save_file_bytes', { path: targetPath, bytes: Array.from(uint8) });
      }

      if (targetPath !== filePath) {
        onFilePathChange(targetPath);
      }
      onDirtyChange(false);
      const fileName = targetPath.split('\\').pop() || 'Spreadsheet';
      showNotification(`Spreadsheet saved to ${fileName}`);
    } catch (e) {
      console.error('Save error:', e);
      showNotification(`Failed to save: ${e}`);
    } finally {
      saving = false;
    }
  }

  async function exportCurrentSheetCsv() {
    if (sheetData.length === 0) return;
    const XLSX = await import('xlsx');
    const sheet = XLSX.utils.aoa_to_sheet(sheetData);
    const csv = XLSX.utils.sheet_to_csv(sheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeSheet || 'sheet'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ─── Word Document Operations ─────────────────────────────────────────
  function updateWordCount() {
    if (!docxPageEl) {
      wordCount = 0;
      return;
    }
    const textOnly = docxPageEl.innerText || docxPageEl.textContent || '';
    const words = textOnly.trim().split(/\s+/).filter(Boolean);
    wordCount = words.length;
  }

  function handleDocxInput() {
    if (docxPageEl) {
      updateWordCount();
      onDirtyChange(true);
    }
  }

  function formatDoc(command: string, value: string | undefined = undefined) {
    if (typeof document !== 'undefined') {
      if (docxPageEl) {
        docxPageEl.focus();
      }
      document.execCommand(command, false, value);
      updateWordCount();
      onDirtyChange(true);
    }
  }

  function handleDocxDrop(e: DragEvent) {
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        imageFiles.push(file);
      }
    }

    if (imageFiles.length === 0) return;

    e.preventDefault();
    e.stopPropagation();

    for (const imgFile of imageFiles) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        if (docxPageEl) {
          docxPageEl.focus();
          document.execCommand('insertImage', false, dataUrl);
          handleDocxInput();
          showNotification(`Inserted image: ${imgFile.name}`);
        }
      };
      reader.readAsDataURL(imgFile);
    }
  }

  function clearWordFindHighlights() {
    if (!docxPageEl) return;
    const marks = docxPageEl.querySelectorAll('mark.docx-find-match');
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
        parent.normalize();
      }
    });
    wordFindMatches = [];
    wordFindIndex = 0;
  }

  function performWordFind() {
    clearWordFindHighlights();
    const q = wordFindQuery.trim();
    if (!q || !docxPageEl) return;

    const walker = document.createTreeWalker(docxPageEl, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.toLowerCase().includes(q.toLowerCase())) {
        textNodes.push(node as Text);
      }
    }

    const queryLower = q.toLowerCase();
    const matchedMarks: HTMLElement[] = [];

    for (const textNode of textNodes) {
      let currentTextNode = textNode;
      let text = currentTextNode.nodeValue || '';
      let lowerText = text.toLowerCase();
      let idx = lowerText.indexOf(queryLower);

      while (idx !== -1) {
        const matchNode = currentTextNode.splitText(idx);
        const remainingNode = matchNode.splitText(q.length);

        const mark = document.createElement('mark');
        mark.className = 'docx-find-match';
        mark.textContent = matchNode.nodeValue;

        matchNode.parentNode?.replaceChild(mark, matchNode);
        matchedMarks.push(mark);

        currentTextNode = remainingNode;
        text = currentTextNode.nodeValue || '';
        lowerText = text.toLowerCase();
        idx = lowerText.indexOf(queryLower);
      }
    }

    wordFindMatches = matchedMarks;
    if (matchedMarks.length > 0) {
      wordFindIndex = 0;
      highlightActiveWordMatch();
    } else {
      wordFindIndex = -1;
    }
  }

  function highlightActiveWordMatch() {
    wordFindMatches.forEach((m, i) => {
      m.classList.toggle('active', i === wordFindIndex);
    });
    if (wordFindIndex >= 0 && wordFindMatches[wordFindIndex]) {
      wordFindMatches[wordFindIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function nextWordMatch() {
    if (wordFindMatches.length === 0) return;
    wordFindIndex = (wordFindIndex + 1) % wordFindMatches.length;
    highlightActiveWordMatch();
  }

  function prevWordMatch() {
    if (wordFindMatches.length === 0) return;
    wordFindIndex = (wordFindIndex - 1 + wordFindMatches.length) % wordFindMatches.length;
    highlightActiveWordMatch();
  }

  function closeWordFind() {
    showWordFind = false;
    wordFindQuery = '';
    clearWordFindHighlights();
  }

  export function triggerSearch() {
    if (ext === 'xlsx' || ext === 'xls') {
      excelSearchInputEl?.focus();
      excelSearchInputEl?.select();
    } else if (ext === 'docx' || ext === 'doc' || ext === 'rtf') {
      showWordFind = true;
      tick().then(() => {
        wordFindInputEl?.focus();
        wordFindInputEl?.select();
      });
    }
  }

  export async function saveWordDocument(forceSaveAs = false) {
    if (!docxPageEl) {
      showNotification('Cannot save: No document content');
      return;
    }

    saving = true;
    try {
      clearWordFindHighlights();

      const currentHtml = docxPageEl.innerHTML;
      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${currentHtml}</body></html>`;
      const { asBlob } = await import('html-docx-js-typescript');
      const docxResult: any = await asBlob(fullHtml);
      const uint8 = new Uint8Array(docxResult.buffer ? docxResult.buffer : docxResult);

      let targetPath = filePath;
      if (forceSaveAs || !targetPath) {
        const chosen = await promptSaveAs('docx', 'Document.docx');
        if (!chosen) {
          saving = false;
          return;
        }
        targetPath = chosen;
      }

      try {
        await invoke('save_file_bytes', { path: targetPath, bytes: Array.from(uint8) });
      } catch (writeErr: any) {
        console.warn('Direct save failed, attempting Save As dialog:', writeErr);
        showNotification('Permission denied on original path. Please choose a save location.');
        const chosen = await promptSaveAs('docx', targetPath.split('\\').pop() || 'Document.docx');
        if (!chosen) {
          saving = false;
          return;
        }
        targetPath = chosen;
        await invoke('save_file_bytes', { path: targetPath, bytes: Array.from(uint8) });
      }

      if (targetPath !== filePath) {
        onFilePathChange(targetPath);
      }
      docxHtml = currentHtml;
      onDirtyChange(false);
      const fileName = targetPath.split('\\').pop() || 'Document';
      showNotification(`Word document saved to ${fileName}`);
    } catch (e) {
      console.error('Word save error:', e);
      showNotification(`Failed to save: ${e}`);
    } finally {
      saving = false;
    }
  }

  export function getExportHtml(): string {
    if (ext === 'docx' || ext === 'doc' || ext === 'rtf') {
      const html = docxPageEl ? docxPageEl.innerHTML : (docxHtml || '<p>Empty Document</p>');
      return `<div class="word-export-content" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6;">${html}</div>`;
    } else if (ext === 'xlsx' || ext === 'xls') {
      if (!sheetData || sheetData.length === 0) {
        return '<p>Empty Spreadsheet</p>';
      }
      const headerRow = sheetData[0] || [];
      const bodyRows = sheetData.slice(1);

      const headerCells = headerRow
        .map((cell, idx) => `<th>${escapeHtml(String(cell || `Col ${idx + 1}`))}</th>`)
        .join('');

      const bodyRowsHtml = bodyRows
        .map((row) => {
          const cells = row.map((cell) => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');

      return `
        <div class="excel-export-content">
          <div style="margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #0284c7;">
            <h2 style="margin: 0 0 6px 0; color: #0284c7; font-size: 18px;">📗 ${escapeHtml(activeSheet || 'Spreadsheet')}</h2>
            <div style="font-size: 12px; color: #64748b;">
              Total Rows: <strong>${bodyRows.length}</strong> &bull; Columns: <strong>${headerRow.length}</strong>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 10pt;">
            <thead>
              <tr style="background: #f1f5f9; color: #0f172a;">${headerCells}</tr>
            </thead>
            <tbody>
              ${bodyRowsHtml}
            </tbody>
          </table>
        </div>
      `;
    }
    return '';
  }

  export function getPlainText(): string {
    if (ext === 'docx' || ext === 'doc' || ext === 'rtf') {
      return docxPageEl ? (docxPageEl.innerText || docxPageEl.textContent || '') : '';
    } else if (ext === 'xlsx' || ext === 'xls') {
      return sheetData.map((row) => row.join('\t')).join('\n');
    }
    return '';
  }

  function handleDirectExportPdf() {
    const html = getExportHtml();
    const title = filePath ? filePath.split('\\').pop() || 'Document' : 'Document';
    printToPdf(title, html);
    showNotification('Opening PDF Print Engine...');
  }

  async function copyDocxText() {
    if (!docxPageEl) return;
    const text = docxPageEl.innerText || docxPageEl.textContent || '';
    try {
      await navigator.clipboard.writeText(text);
      showNotification('Copied text to clipboard');
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

  export async function saveDocument(forceSaveAs = false) {
    if (ext === 'xlsx' || ext === 'xls') {
      await saveExcelDocument(forceSaveAs);
    } else if (ext === 'docx' || ext === 'doc' || ext === 'rtf') {
      await saveWordDocument(forceSaveAs);
    }
  }

  // Handle keyboard shortcuts
  function handleKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      e.stopPropagation();
      saveDocument(e.shiftKey);
    } else if (e.ctrlKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      e.stopPropagation();
      triggerSearch();
    }
  }

  $effect(() => {
    const currentBytes = bytes;
    if (currentBytes && currentBytes !== lastLoadedBytes) {
      lastLoadedBytes = currentBytes;
      untrack(() => {
        loadDocument();
      });
    }
  });
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="office-container">
  {#if toastMsg}
    <div class="office-toast">{toastMsg}</div>
  {/if}

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
    <!-- ─── Excel Spreadsheet Editor & Viewer ───────────────────────── -->
    <div class="office-toolbar">
      <div class="toolbar-group">
        <span class="office-badge excel-badge">📗 {t('excel_spreadsheet')}</span>
        <!-- Sheet Selector Tabs -->
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

      <div class="toolbar-group">
        <button class="tool-btn" onclick={addRow} title="Add New Row">➕ {t('add_row')}</button>
        <button class="tool-btn" onclick={addColumn} title="Add New Column">➕ {t('add_col')}</button>
        <button class="tool-btn" onclick={deleteLastRow} title="Delete Last Row">🗑️ {t('del_row')}</button>

        <div class="search-box">
          <input
            bind:this={excelSearchInputEl}
            type="text"
            bind:value={searchQuery}
            placeholder={t('search_cells_ph')}
            class="search-input"
          />
          {#if searchQuery}
            <button class="clear-search" onclick={() => (searchQuery = '')}>&times;</button>
          {/if}
        </div>
      </div>

      <div class="toolbar-group end-group">
        <button
          class="save-btn"
          onclick={() => saveExcelDocument(false)}
          disabled={saving}
          title="Save Spreadsheet (Ctrl+S)"
        >
          {saving ? t('saving') : '💾 ' + t('save')}
        </button>
        <button class="tool-btn" onclick={exportCurrentSheetCsv} title="Export current sheet as CSV">
          📥 {t('export_csv')}
        </button>
        <button class="tool-btn" onclick={handleDirectExportPdf} title="Export sheet as PDF">
          📄 {t('export_pdf')}
        </button>
      </div>
    </div>

    <!-- Spreadsheet Grid -->
    <div class="spreadsheet-view">
      <div class="grid-header-bar">
        <span class="stat-text">
          {t('showing_rows')} {visibleRows.length} {t('of')} {totalDataRows} {t('rows')} &bull; {sheetData[0]?.length || 0} {t('columns')}
        </span>
        {#if totalPages > 1}
          <div class="grid-pagination">
            <button
              class="page-btn"
              disabled={currentPage <= 1}
              onclick={() => (currentPage = Math.max(1, currentPage - 1))}
            >
              &larr; {t('prev')}
            </button>
            <span class="page-info">{t('page')} {currentPage} {t('of')} {totalPages}</span>
            <button
              class="page-btn"
              disabled={currentPage >= totalPages}
              onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
            >
              {t('next')} &rarr;
            </button>
          </div>
        {/if}
      </div>

      <div class="table-scroll-container">
        <table class="spreadsheet-table">
          <thead>
            <tr>
              <th class="row-index-th">#</th>
              {#each sheetData[0] || [] as header, colIdx}
                <th>
                  <div
                    contenteditable="true"
                    class="editable-cell header-cell"
                    onblur={(e) => handleCellChange(0, colIdx, e.currentTarget.innerText)}
                  >
                    {header || `Col ${colIdx + 1}`}
                  </div>
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each visibleRows as row, rIdx}
              {@const actualRowIdx = 1 + (currentPage - 1) * pageSize + rIdx}
              <tr>
                <td class="row-index-td">{actualRowIdx}</td>
                {#each row as cell, cIdx}
                  <td>
                    <div
                      contenteditable="true"
                      class="editable-cell"
                      onblur={(e) => handleCellChange(actualRowIdx, cIdx, e.currentTarget.innerText)}
                    >
                      {cell}
                    </div>
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {:else if ext === 'docx' || ext === 'doc' || ext === 'rtf'}
    <!-- ─── Word Document Rich Text Editor & Reader ─────────────────── -->
    <div class="office-toolbar">
      <div class="toolbar-group">
        <span class="office-badge word-badge">📘 {t('word_editor')}</span>
        <button
          class="save-btn"
          onclick={() => saveWordDocument(false)}
          disabled={saving}
          title="Save Document (Ctrl+S)"
        >
          {saving ? t('saving') : '💾 ' + t('save')}
        </button>
      </div>

      <!-- In-place Rich Text Tools -->
      <div class="toolbar-group format-tools">
        <button class="tool-btn bold-btn" onclick={() => formatDoc('bold')} title="Bold (Ctrl+B)">B</button>
        <button class="tool-btn italic-btn" onclick={() => formatDoc('italic')} title="Italic (Ctrl+I)">I</button>
        <button class="tool-btn underline-btn" onclick={() => formatDoc('underline')} title="Underline (Ctrl+U)">U</button>
        <button class="tool-btn strike-btn" onclick={() => formatDoc('strikeThrough')} title="Strikethrough">S</button>

        <div class="toolbar-divider"></div>

        <button class="tool-btn" onclick={() => formatDoc('formatBlock', '<h1>')} title="Heading 1">H1</button>
        <button class="tool-btn" onclick={() => formatDoc('formatBlock', '<h2>')} title="Heading 2">H2</button>
        <button class="tool-btn" onclick={() => formatDoc('formatBlock', '<p>')} title="Normal Paragraph">¶</button>

        <div class="toolbar-divider"></div>

        <button class="tool-btn" onclick={() => formatDoc('insertUnorderedList')} title="Bullet List">• List</button>
        <button class="tool-btn" onclick={() => formatDoc('insertOrderedList')} title="Numbered List">1. List</button>

        <div class="toolbar-divider"></div>

        <button class="tool-btn" onclick={() => formatDoc('justifyLeft')} title="Align Left">⇤</button>
        <button class="tool-btn" onclick={() => formatDoc('justifyCenter')} title="Align Center">≡</button>
        <button class="tool-btn" onclick={() => formatDoc('justifyRight')} title="Align Right">⇥</button>
      </div>

      <div class="toolbar-group end-group">
        <span class="word-stat">{wordCount.toLocaleString()} {t('words')}</span>

        <button class="tool-btn" onclick={toggleWordTheme} title="Toggle Dark/Light Mode">
          {wordTheme === 'paper' ? '🌙 ' + t('dark_mode') : '☀️ ' + t('paper_mode')}
        </button>

        <div class="font-controls">
          <button class="tool-btn font-btn" onclick={decreaseFontSize} title="Smaller Font">A-</button>
          <button class="tool-btn font-btn font-scale" onclick={resetFontSize} title="Reset Font Size">{fontScale}%</button>
          <button class="tool-btn font-btn" onclick={increaseFontSize} title="Larger Font">A+</button>
        </div>

        <button class="tool-btn" onclick={triggerSearch} title="Find in Document (Ctrl+F)">
          🔍 {t('find')}
        </button>
        <button class="tool-btn" onclick={copyDocxText} title="Copy Plain Text">
          📋 {t('copy')}
        </button>
        <button class="tool-btn" onclick={handleDirectExportPdf} title="Export document as PDF">
          📄 {t('export_pdf')}
        </button>
      </div>
    </div>

    {#if showWordFind}
      <div class="word-find-bar">
        <input
          bind:this={wordFindInputEl}
          type="text"
          bind:value={wordFindQuery}
          oninput={performWordFind}
          onkeydown={(e) => {
            if (e.key === 'Enter') {
              if (e.shiftKey) prevWordMatch();
              else nextWordMatch();
            } else if (e.key === 'Escape') {
              closeWordFind();
            }
          }}
          placeholder={t('find_in_doc_ph')}
          class="word-find-input"
        />
        <span class="word-find-count">
          {#if wordFindMatches.length > 0}
            {wordFindIndex + 1} {t('of')} {wordFindMatches.length}
          {:else if wordFindQuery}
            0 {t('matches')}
          {/if}
        </span>
        <button class="word-find-nav-btn" onclick={prevWordMatch} title="Previous match (Shift+Enter)">▲</button>
        <button class="word-find-nav-btn" onclick={nextWordMatch} title="Next match (Enter)">▼</button>
        <button class="word-find-nav-btn close-btn" onclick={closeWordFind} title="Close (Esc)">&times;</button>
      </div>
    {/if}

    <!-- Word Document Flowing Scrollable View -->
    <div class="docx-wrapper" class:dark-paper={wordTheme === 'dark'}>
      <div
        use:initDocx
        class="docx-page"
        class:dark-page={wordTheme === 'dark'}
        style="font-size: {fontScale}%"
        contenteditable="true"
        role="textbox"
        aria-multiline="true"
        tabindex="0"
        oninput={handleDocxInput}
        ondragover={(e) => e.preventDefault()}
        ondrop={handleDocxDrop}
      ></div>
    </div>
  {/if}
</div>

<style>
  .office-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-color, #090d16);
    color: var(--text-color, #f8fafc);
    overflow: hidden;
    position: relative;
  }

  .office-toast {
    position: absolute;
    top: 48px;
    right: 20px;
    background: #0284c7;
    color: #ffffff;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    z-index: 100;
    animation: fadeIn 0.2s ease-out;
  }

  .word-find-bar {
    position: absolute;
    top: 50px;
    right: 24px;
    background: #1e293b;
    border: 1px solid #334155;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.45);
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    z-index: 120;
    animation: fadeIn 0.15s ease-out;
  }

  .word-find-input {
    background: #090d16;
    border: 1px solid #334155;
    color: #f8fafc;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    outline: none;
    width: 190px;
  }

  .word-find-input:focus {
    border-color: #38bdf8;
  }

  .word-find-count {
    font-size: 11px;
    color: #94a3b8;
    min-width: 65px;
    text-align: center;
    user-select: none;
  }

  .word-find-nav-btn {
    background: transparent;
    border: 1px solid transparent;
    color: #cbd5e1;
    border-radius: 4px;
    padding: 3px 8px;
    cursor: pointer;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease;
  }

  .word-find-nav-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: #475569;
    color: #ffffff;
  }

  .word-find-nav-btn.close-btn {
    font-size: 14px;
    color: #94a3b8;
    padding: 1px 7px;
  }

  .word-find-nav-btn.close-btn:hover {
    color: #ef4444;
  }

  :global(mark.docx-find-match) {
    background-color: #fef08a !important;
    color: #0f172a !important;
    border-radius: 2px;
    padding: 1px 0;
  }

  :global(mark.docx-find-match.active) {
    background-color: #f97316 !important;
    color: #ffffff !important;
    box-shadow: 0 0 0 1px #ea580c;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Toolbar */
  .office-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    background: var(--surface-bg, #0f172a);
    border-bottom: 1px solid var(--border-color, #1e293b);
    user-select: none;
    flex-shrink: 0;
    flex-wrap: wrap;
    z-index: 10;
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .end-group {
    margin-left: auto;
  }

  .toolbar-divider {
    width: 1px;
    height: 16px;
    background: var(--border-color, #334155);
    margin: 0 3px;
  }

  .office-badge {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.5px;
    padding: 3px 8px;
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

  .save-btn {
    background: #10b981;
    color: #ffffff;
    border: 1px solid #059669;
    border-radius: 4px;
    padding: 3px 12px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .save-btn:hover:not(:disabled) {
    background: #059669;
  }

  .save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .tool-btn {
    background: var(--surface-secondary, #1e293b);
    color: var(--text-color, #e2e8f0);
    border: 1px solid var(--border-color, #334155);
    border-radius: 4px;
    padding: 3px 8px;
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

  .bold-btn { font-weight: 800; }
  .italic-btn { font-style: italic; }
  .underline-btn { text-decoration: underline; }
  .strike-btn { text-decoration: line-through; }

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
    min-width: 42px;
    text-align: center;
  }

  .word-stat {
    font-size: 11px;
    color: var(--status-text, #94a3b8);
    font-weight: 500;
  }

  /* Sheet Tabs */
  .sheet-tabs-list {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
    max-width: 35vw;
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
  }

  .sheet-tab.active {
    background: #10b981;
    color: #ffffff;
    border-color: #10b981;
    font-weight: 700;
  }

  .search-box {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-input {
    background: var(--surface-secondary, #1e293b);
    border: 1px solid var(--border-color, #334155);
    color: var(--text-color, #f8fafc);
    border-radius: 4px;
    padding: 3px 20px 3px 8px;
    font-size: 11px;
    width: 130px;
    outline: none;
  }

  .search-input:focus {
    border-color: #38bdf8;
    width: 160px;
  }

  .clear-search {
    position: absolute;
    right: 4px;
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    font-size: 12px;
  }

  /* Spreadsheet View */
  .spreadsheet-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-color, #090d16);
  }

  .grid-header-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 14px;
    background: var(--surface-bg, #0f172a);
    border-bottom: 1px solid var(--border-color, #1e293b);
    font-size: 11px;
    color: var(--status-text, #94a3b8);
  }

  .grid-pagination {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .page-btn {
    background: var(--surface-secondary, #1e293b);
    border: 1px solid var(--border-color, #334155);
    color: var(--text-color, #cbd5e1);
    border-radius: 3px;
    padding: 1px 6px;
    font-size: 10px;
    cursor: pointer;
  }

  .page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .table-scroll-container {
    flex: 1;
    overflow: auto;
    position: relative;
  }

  .spreadsheet-table {
    width: 100%;
    border-collapse: collapse;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
  }

  .spreadsheet-table th, .spreadsheet-table td {
    border: 1px solid var(--border-color, #1e293b);
    padding: 0;
    white-space: nowrap;
  }

  .spreadsheet-table th {
    background: var(--surface-bg, #0f172a);
    color: #38bdf8;
    font-weight: 700;
    position: sticky;
    top: 0;
    z-index: 2;
  }

  .row-index-th, .row-index-td {
    width: 44px;
    text-align: center;
    background: var(--surface-secondary, #1e293b);
    color: var(--status-text, #64748b);
    font-weight: 600;
    font-size: 10px;
    user-select: none;
    padding: 4px 6px !important;
  }

  .editable-cell {
    padding: 5px 8px;
    min-width: 60px;
    min-height: 20px;
    outline: none;
    color: var(--text-color, #e2e8f0);
    box-sizing: border-box;
  }

  .editable-cell:focus {
    background: rgba(56, 189, 248, 0.15);
    box-shadow: inset 0 0 0 1.5px #38bdf8;
  }

  .header-cell {
    font-weight: 700;
    color: #38bdf8;
  }

  /* ─── Word Flowing Document View ───────────────────────────────── */
  .docx-wrapper {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 24px 16px;
    background: #cbd5e1;
    box-sizing: border-box;
    width: 100%;
  }

  .docx-wrapper.dark-paper {
    background: #0f172a;
  }

  .docx-page {
    margin: 0 auto 48px auto;
    width: 100%;
    max-width: 860px;
    min-height: calc(100vh - 140px);
    height: auto;
    background: #ffffff;
    color: #0f172a;
    padding: 56px 64px;
    border-radius: 4px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.75;
    box-sizing: border-box;
    overflow-wrap: break-word;
    word-wrap: break-word;
    outline: none;
  }

  .docx-page:focus {
    box-shadow: 0 4px 28px rgba(56, 189, 248, 0.25);
  }

  .docx-page.dark-page {
    background: #1e293b;
    color: #f1f5f9;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.6);
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
  }
</style>
