<script lang="ts">
  export let content = '';
  export let extension = '';

  // Parse JSON
  let parsedJson: any = null;
  let jsonError = false;

  // Parse CSV
  let parsedCsv: string[][] = [];

  // Parse Logs
  let parsedLogs: { level: string, text: string }[] = [];

  $: {
    if (extension === 'json') {
      try {
        parsedJson = JSON.parse(content);
        jsonError = false;
      } catch (e) {
        jsonError = true;
      }
    } else if (extension === 'csv') {
      parsedCsv = content.split('\n').filter(l => l.trim()).map(line => line.split(','));
    } else if (extension === 'log') {
      parsedLogs = content.split('\n').filter(l => l.trim()).map(line => {
        let level = 'INFO';
        if (line.match(/error|fail|critical/i)) level = 'ERROR';
        else if (line.match(/warn/i)) level = 'WARN';
        else if (line.match(/debug/i)) level = 'DEBUG';
        return { level, text: line };
      });
    }
  }

  function formatJson(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }
</script>

<div class="data-viewer">
  {#if extension === 'csv'}
    <div class="table-container">
      <table>
        {#if parsedCsv.length > 0}
          <thead>
            <tr>
              {#each parsedCsv[0] as cell}
                <th>{cell}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each parsedCsv.slice(1) as row}
              <tr>
                {#each row as cell}
                  <td>{cell}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        {/if}
      </table>
    </div>
  {:else if extension === 'json'}
    {#if jsonError}
      <div class="error-banner">Invalid JSON document</div>
      <pre class="raw-data">{content}</pre>
    {:else}
      <div class="json-container">
        <!-- A very simple pretty-print for now, but wrapped beautifully -->
        <pre>{formatJson(parsedJson)}</pre>
      </div>
    {/if}
  {:else if extension === 'log'}
    <div class="log-container">
      {#each parsedLogs as log}
        <div class="log-line">
          <span class="badge {log.level.toLowerCase()}">{log.level}</span>
          <span class="log-text">{log.text}</span>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Reader Mode for txt, ini, env -->
    <div class="reader-mode">
      <pre>{content}</pre>
    </div>
  {/if}
</div>

<style>
  .data-viewer {
    padding: 20px 40px;
    height: 100%;
    overflow: auto;
    font-size: 14px;
    box-sizing: border-box;
  }

  /* CSV Table */
  .table-container {
    overflow-x: auto;
    border-radius: 8px;
    border: 1px solid rgba(128, 128, 128, 0.2);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
  }
  th {
    background-color: rgba(128, 128, 128, 0.1);
    font-weight: 600;
    padding: 10px;
    border-bottom: 1px solid rgba(128, 128, 128, 0.2);
  }
  td {
    padding: 8px 10px;
    border-bottom: 1px solid rgba(128, 128, 128, 0.1);
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
  }
  .badge.error { background-color: rgba(239, 68, 68, 0.2); color: #ef4444; }
  .badge.warn { background-color: rgba(245, 158, 11, 0.2); color: #f59e0b; }
  .badge.info { background-color: rgba(59, 130, 246, 0.2); color: #3b82f6; }
  .badge.debug { background-color: rgba(156, 163, 175, 0.2); color: #9ca3af; }
  
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
</style>
