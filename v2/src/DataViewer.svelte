<script lang="ts">
  import { t } from './i18n.svelte';

  let { content = '', extension = '' } = $props<{ content?: string; extension?: string }>();

  let currentPage = $state(1);
  const pageSize = 100;

  // --- RFC 4180 CSV/TSV Parser (handles quoted fields, CRLF, and custom delimiters) ---
  function parseDelimited(text: string, ext: string): string[][] {
    const delimiter = ext.toLowerCase() === 'tsv' ? '\t' : ',';
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++; // skip escaped quote
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === delimiter) {
          currentRow.push(field);
          field = '';
        } else if (ch === '\n') {
          currentRow.push(field);
          field = '';
          if (currentRow.length > 0) rows.push(currentRow);
          currentRow = [];
        } else if (ch !== '\r') {
          field += ch;
        }
      }
    }

    // Handle last field/row
    currentRow.push(field);
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }

    return rows;
  }

  // --- Derived data ---
  let parsedCsv = $derived.by(() => {
    if (extension !== 'csv' && extension !== 'tsv') return [];
    return parseDelimited(content, extension);
  });

  let totalDataRows = $derived(parsedCsv.length > 1 ? parsedCsv.length - 1 : 0);
  let totalPages = $derived(Math.max(1, Math.ceil(totalDataRows / pageSize)));

  let visibleRows = $derived.by(() => {
    if (parsedCsv.length <= 1) return [];
    const start = 1 + (currentPage - 1) * pageSize;
    const end = Math.min(parsedCsv.length, start + pageSize);
    return parsedCsv.slice(start, end);
  });

  $effect(() => {
    // Reset page when content/extension changes
    if (content || extension) {
      currentPage = 1;
    }
  });

  // --- Log line parser ---
  function parseLogLines(text: string): { level: string; text: string }[] {
    return text
      .split('\n')
      .filter((l) => l.trim())
      .map((line) => {
        const cleaned = line.replace(/\r$/, '');
        let level = 'INFO';
        if (/error|fail|critical|fatal/i.test(cleaned)) level = 'ERROR';
        else if (/warn/i.test(cleaned)) level = 'WARN';
        else if (/debug|trace/i.test(cleaned)) level = 'DEBUG';
        return { level, text: cleaned };
      });
  }

  let parsedJson = $derived.by(() => {
    if (extension !== 'json') return { data: null, error: false };
    try {
      return { data: JSON.parse(content), error: false };
    } catch {
      return { data: null, error: true };
    }
  });

  let parsedLogs = $derived(extension === 'log' ? parseLogLines(content) : []);

  function formatJson(obj: unknown): string {
    return JSON.stringify(obj, null, 2);
  }
</script>

<div class="data-viewer">
  {#if extension === 'csv' || extension === 'tsv'}
    {#if parsedCsv.length === 0}
      <div class="empty-state">No data to display</div>
    {:else}
      <!-- Pagination Toolbar -->
      <div class="table-toolbar">
        <div class="stats">
          <span><strong>{totalDataRows.toLocaleString()}</strong> rows</span>
          <span class="divider">&bull;</span>
          <span><strong>{parsedCsv[0]?.length || 0}</strong> columns</span>
        </div>

        {#if totalPages > 1}
          <div class="pagination">
            <button
              class="page-btn"
              disabled={currentPage <= 1}
              onclick={() => (currentPage = Math.max(1, currentPage - 1))}
              title="Previous Page"
            >
              &larr; Prev
            </button>
            <span class="page-info">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              class="page-btn"
              disabled={currentPage >= totalPages}
              onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
              title="Next Page"
            >
              Next &rarr;
            </button>
          </div>
        {/if}
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th class="row-num-th">#</th>
              {#each parsedCsv[0] as cell}
                <th>{cell}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each visibleRows as row, idx}
              <tr>
                <td class="row-num-td">{1 + (currentPage - 1) * pageSize + idx}</td>
                {#each row as cell}
                  <td>{cell}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {:else if extension === 'json'}
    {#if parsedJson.error}
      <div class="error-banner">{t('invalid_json')}</div>
      <pre class="raw-data">{content}</pre>
    {:else}
      <div class="json-container">
        <pre>{formatJson(parsedJson.data)}</pre>
      </div>
    {/if}
  {:else if extension === 'log'}
    {#if parsedLogs.length === 0}
      <div class="empty-state">No log entries</div>
    {:else}
      <div class="log-container">
        {#each parsedLogs as log}
          <div class="log-line">
            <span class="badge {log.level.toLowerCase()}">{log.level}</span>
            <span class="log-text">{log.text}</span>
          </div>
        {/each}
      </div>
    {/if}
  {:else}
    <!-- Reader Mode for txt, ini, env, etc. -->
    <div class="reader-mode">
      {#if content.trim() === ''}
        <div class="empty-state">Empty file</div>
      {:else}
        <pre>{content}</pre>
      {/if}
    </div>
  {/if}
</div>

<style>
  .data-viewer {
    padding: 16px 24px;
    height: 100%;
    overflow: auto;
    font-size: 13px;
    box-sizing: border-box;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    opacity: 0.4;
    font-size: 16px;
    font-style: italic;
  }

  /* Table Toolbar */
  .table-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    font-size: 12px;
    color: #94a3b8;
  }

  .stats {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .divider {
    opacity: 0.5;
  }

  .pagination {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .page-btn {
    background: #1e293b;
    color: #e2e8f0;
    border: 1px solid #334155;
    border-radius: 4px;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .page-btn:hover:not(:disabled) {
    background: #38bdf8;
    color: #0f172a;
  }

  .page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .page-info {
    font-size: 12px;
  }

  /* CSV Table */
  .table-container {
    overflow-x: auto;
    border-radius: 8px;
    border: 1px solid rgba(128, 128, 128, 0.2);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: 12px;
  }

  th {
    background-color: rgba(128, 128, 128, 0.12);
    font-weight: 600;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(128, 128, 128, 0.2);
    white-space: nowrap;
    position: sticky;
    top: 0;
  }

  td {
    padding: 6px 12px;
    border-bottom: 1px solid rgba(128, 128, 128, 0.08);
    white-space: nowrap;
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  tr:hover td {
    background-color: rgba(56, 189, 248, 0.05);
  }

  .row-num-th, .row-num-td {
    color: #64748b;
    font-size: 11px;
    width: 40px;
    text-align: right;
    user-select: none;
  }

  /* Logs */
  .log-container {
    font-family: Consolas, monospace;
    font-size: 13px;
    background-color: rgba(0, 0, 0, 0.02);
    padding: 10px;
    border-radius: 6px;
  }
  :global(.app-container.dark) .log-container {
    background-color: rgba(0, 0, 0, 0.2);
  }
  .log-line {
    display: flex;
    gap: 10px;
    margin-bottom: 4px;
    align-items: flex-start;
  }
  .badge {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: bold;
    min-width: 45px;
    text-align: center;
    flex-shrink: 0;
  }
  .badge.error {
    background-color: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }
  .badge.warn {
    background-color: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
  }
  .badge.info {
    background-color: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
  }
  .badge.debug {
    background-color: rgba(156, 163, 175, 0.2);
    color: #9ca3af;
  }

  .log-text {
    word-break: break-all;
    opacity: 0.9;
  }

  /* JSON */
  .json-container {
    background-color: rgba(128, 128, 128, 0.05);
    padding: 20px;
    border-radius: 8px;
    font-family: Consolas, monospace;
    overflow-x: auto;
  }

  /* Reader Mode */
  .reader-mode {
    max-width: 800px;
    margin: 0 auto;
    font-family: Consolas, monospace;
    line-height: 1.6;
    opacity: 0.8;
  }

  .error-banner {
    background-color: #ef4444;
    color: white;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 10px;
    font-weight: bold;
  }

  .raw-data {
    font-family: Consolas, monospace;
    font-size: 13px;
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>
