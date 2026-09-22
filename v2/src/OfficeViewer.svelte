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
  let sheetNames = $state<string[]>([]);
  let activeSheet = $state<string>('');
  let currentSheetCsv = $state<string>('');

  // Word state
  let docxHtml = $state<string>('');

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
        // Dynamic import keeps initial bundle lightweight & fast
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(bytes, { type: 'array' });

        sheetNames = workbook.SheetNames || [];
        if (sheetNames.length > 0) {
          activeSheet = sheetNames[0];
          const sheet = workbook.Sheets[activeSheet];
          currentSheetCsv = XLSX.utils.sheet_to_csv(sheet);
        }
      } else if (ext === 'docx') {
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
        docxHtml = result.value;
      }
    } catch (err) {
      errorMsg = (err as Error).message || 'Failed to parse document';
    } finally {
      loading = false;
    }
  }

  function selectSheet(name: string) {
    if (!bytes) return;
    activeSheet = name;
    import('xlsx').then((XLSX) => {
      const workbook = XLSX.read(bytes!, { type: 'array' });
      const sheet = workbook.Sheets[name];
      currentSheetCsv = XLSX.utils.sheet_to_csv(sheet);
    });
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
    <div class="sheet-tabs-bar">
      <div class="sheet-label">📊 Sheets:</div>
      {#each sheetNames as sheet}
        <button
          class="sheet-tab"
          class:active={sheet === activeSheet}
          onclick={() => selectSheet(sheet)}
        >
          {sheet}
        </button>
      {/each}
    </div>
    <div class="sheet-content">
      <DataViewer content={currentSheetCsv} extension="csv" />
    </div>
  {:else if ext === 'docx'}
    <!-- Word Document View -->
    <div class="docx-wrapper">
      <div class="docx-page">
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
    background: var(--surface-bg, #ffffff);
    color: var(--text-color, #0f172a);
    overflow: hidden;
  }

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
    width: 28px;
    height: 28px;
    border: 3px solid rgba(128, 128, 128, 0.2);
    border-top-color: #38bdf8;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-banner {
    margin: 20px;
    padding: 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #ef4444;
  }

  /* Excel Sheet Tabs */
  .sheet-tabs-bar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: var(--surface-secondary, #f1f5f9);
    border-bottom: 1px solid var(--border-color, #e2e8f0);
    overflow-x: auto;
    flex-shrink: 0;
  }

  .sheet-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--status-text, #64748b);
    margin-right: 6px;
    white-space: nowrap;
  }

  .sheet-tab {
    background: var(--surface-bg, #ffffff);
    color: var(--text-color, #0f172a);
    border: 1px solid var(--border-color, #cbd5e1);
    border-radius: 4px;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .sheet-tab:hover {
    border-color: #38bdf8;
  }

  .sheet-tab.active {
    background: #38bdf8;
    color: #0f172a;
    border-color: #38bdf8;
  }

  .sheet-content {
    flex: 1;
    overflow: auto;
  }

  /* Word Document View */
  .docx-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 32px 20px;
    display: flex;
    justify-content: center;
    background: var(--bg-color, #f1f5f9);
  }

  .docx-page {
    width: 100%;
    max-width: 800px;
    background: var(--surface-bg, #ffffff);
    color: var(--text-color, #0f172a);
    padding: 48px 56px;
    border-radius: 8px;
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.1);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.7;
    min-height: 500px;
  }

  :global(.docx-page h1, .docx-page h2, .docx-page h3) {
    color: var(--text-color, #0f172a);
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    border-bottom: 1px solid var(--border-color, #e2e8f0);
    padding-bottom: 0.2em;
  }

  :global(.docx-page table) {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
  }

  :global(.docx-page th, .docx-page td) {
    border: 1px solid var(--border-color, #cbd5e1);
    padding: 8px 12px;
  }

  :global(.docx-page th) {
    background: var(--surface-secondary, #f1f5f9);
  }
</style>
