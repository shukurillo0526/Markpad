<script lang="ts">
  let { content = '', extension = '' } = $props<{ content: string; extension: string }>();

  let severityFilter = $state<'ALL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'>('ALL');
  let searchQuery = $state('');
  let displayLimit = $state(1000);

  interface LogLine {
    id: number;
    text: string;
    level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'OTHER';
  }

  const MAX_PARSE_LINES = 50000;

  let parsedLines = $derived.by(() => {
    const raw = content.split('\n');
    const limit = Math.min(raw.length, MAX_PARSE_LINES);
    const result: LogLine[] = [];

    for (let i = 0; i < limit; i++) {
      const line = raw[i];
      if (!line) continue;

      const upper = line.toUpperCase();
      let level: LogLine['level'] = 'OTHER';

      if (upper.includes('ERROR') || upper.includes('FATAL') || upper.includes('FAIL') || upper.includes('EXCEPTION')) {
        level = 'ERROR';
      } else if (upper.includes('WARN') || upper.includes('WARNING')) {
        level = 'WARN';
      } else if (upper.includes('INFO')) {
        level = 'INFO';
      } else if (upper.includes('DEBUG') || upper.includes('TRACE')) {
        level = 'DEBUG';
      }

      result.push({ id: i + 1, text: line, level });
    }

    return result;
  });

  let counts = $derived.by(() => {
    let err = 0, warn = 0, info = 0, debug = 0;
    for (const line of parsedLines) {
      if (line.level === 'ERROR') err++;
      else if (line.level === 'WARN') warn++;
      else if (line.level === 'INFO') info++;
      else if (line.level === 'DEBUG') debug++;
    }
    return { err, warn, info, debug, total: parsedLines.length };
  });

  let filteredLines = $derived.by(() => {
    return parsedLines.filter((l) => {
      if (severityFilter !== 'ALL' && l.level !== severityFilter) return false;
      if (searchQuery.trim() && !l.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  });

  let visibleLines = $derived(filteredLines.slice(0, displayLimit));

  $effect(() => {
    // Reset limit when filter or search changes
    if (severityFilter || searchQuery) {
      displayLimit = 1000;
    }
  });

  function loadMore() {
    displayLimit += 1000;
  }

  function loadAll() {
    displayLimit = filteredLines.length;
  }
</script>

<div class="log-analyzer-container">
  <div class="log-toolbar">
    <div class="toolbar-left">
      <span class="toolbar-title">Log Analyzer</span>
      <div class="severity-pills">
        <button class="pill" class:active={severityFilter === 'ALL'} onclick={() => (severityFilter = 'ALL')}>
          ALL <span class="pill-count">{counts.total.toLocaleString()}</span>
        </button>
        <button class="pill error" class:active={severityFilter === 'ERROR'} onclick={() => (severityFilter = 'ERROR')}>
          ERROR <span class="pill-count">{counts.err.toLocaleString()}</span>
        </button>
        <button class="pill warn" class:active={severityFilter === 'WARN'} onclick={() => (severityFilter = 'WARN')}>
          WARN <span class="pill-count">{counts.warn.toLocaleString()}</span>
        </button>
        <button class="pill info" class:active={severityFilter === 'INFO'} onclick={() => (severityFilter = 'INFO')}>
          INFO <span class="pill-count">{counts.info.toLocaleString()}</span>
        </button>
        <button class="pill debug" class:active={severityFilter === 'DEBUG'} onclick={() => (severityFilter = 'DEBUG')}>
          DEBUG <span class="pill-count">{counts.debug.toLocaleString()}</span>
        </button>
      </div>
    </div>

    <div class="toolbar-right">
      <input
        type="text"
        placeholder="Filter logs..."
        bind:value={searchQuery}
        class="search-input"
      />
    </div>
  </div>

  <div class="log-body">
    {#each visibleLines as line (line.id)}
      <div class="log-row" class:row-error={line.level === 'ERROR'} class:row-warn={line.level === 'WARN'}>
        <span class="line-num">{line.id}</span>
        <span class="level-badge {line.level.toLowerCase()}">{line.level}</span>
        <span class="log-text">{line.text}</span>
      </div>
    {/each}

    {#if filteredLines.length > displayLimit}
      <div class="load-more-bar">
        <span>Showing {displayLimit.toLocaleString()} of {filteredLines.length.toLocaleString()} matching lines</span>
        <div class="load-btns">
          <button class="load-btn" onclick={loadMore}>Load +1,000 More</button>
          <button class="load-btn" onclick={loadAll}>Show All</button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .log-analyzer-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: var(--surface-bg, #0f172a);
    color: var(--text-color, #f8fafc);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
  }

  .log-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 42px;
    padding: 0 16px;
    background: var(--surface-secondary, #1e293b);
    border-bottom: 1px solid var(--border-color, #334155);
    user-select: none;
    flex-shrink: 0;
  }

  .toolbar-left, .toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .toolbar-title {
    font-weight: 600;
    color: #60a5fa;
  }

  .severity-pills {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .pill {
    background: var(--surface-bg, #0f172a);
    border: 1px solid var(--border-color, #334155);
    color: var(--status-text, #94a3b8);
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .pill:hover { background: var(--button-hover, #334155); color: var(--text-color, #f8fafc); }
  .pill.active { background: #38bdf8; color: #0f172a; border-color: #38bdf8; }

  .pill.error.active { background: #ef4444; color: white; border-color: #ef4444; }
  .pill.warn.active { background: #f59e0b; color: #0f172a; border-color: #f59e0b; }
  .pill.info.active { background: #3b82f6; color: white; border-color: #3b82f6; }
  .pill.debug.active { background: #8b5cf6; color: white; border-color: #8b5cf6; }

  .pill-count {
    font-size: 10px;
    opacity: 0.8;
    margin-left: 2px;
  }

  .search-input {
    background: var(--bg-color, #0f172a);
    border: 1px solid var(--border-color, #475569);
    color: var(--text-color, #f8fafc);
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 11px;
    outline: none;
    width: 220px;
  }

  .search-input:focus {
    border-color: #38bdf8;
  }

  .log-body {
    flex: 1;
    overflow: auto;
    padding: 8px 0;
  }

  .log-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 3px 16px;
    font-size: 12px;
    line-height: 1.5;
  }

  .log-row:hover {
    background: #1e293b;
  }

  .row-error {
    background: rgba(239, 68, 68, 0.1);
  }

  .row-warn {
    background: rgba(245, 158, 11, 0.1);
  }

  .line-num {
    color: #475569;
    min-width: 44px;
    text-align: right;
    user-select: none;
  }

  .level-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 4px;
    border-radius: 3px;
    min-width: 44px;
    text-align: center;
    user-select: none;
  }

  .level-badge.error { background: #ef4444; color: white; }
  .level-badge.warn { background: #f59e0b; color: #0f172a; }
  .level-badge.info { background: #3b82f6; color: white; }
  .level-badge.debug { background: #8b5cf6; color: white; }
  .level-badge.other { background: #334155; color: #94a3b8; }

  .log-text {
    flex: 1;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .load-more-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    margin: 12px 16px;
    background: var(--surface-secondary, #1e293b);
    border: 1px solid var(--border-color, #334155);
    border-radius: 6px;
    color: var(--status-text, #94a3b8);
    font-size: 12px;
  }

  .load-btns {
    display: flex;
    gap: 8px;
  }

  .load-btn {
    background: var(--surface-bg, #0f172a);
    border: 1px solid var(--border-color, #475569);
    color: #38bdf8;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .load-btn:hover {
    background: #38bdf8;
    color: #0f172a;
  }
</style>
