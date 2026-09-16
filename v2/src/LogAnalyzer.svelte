<script lang="ts">
  let { content = '', extension = '' } = $props<{ content: string; extension: string }>();

  let severityFilter = $state<'ALL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'>('ALL');
  let searchQuery = $state('');

  interface LogLine {
    id: number;
    text: string;
    level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'OTHER';
  }

  let parsedLines = $derived.by(() => {
    const raw = content.split('\n');
    const result: LogLine[] = [];

    for (let i = 0; i < raw.length; i++) {
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
</script>

<div class="log-analyzer-container">
  <div class="log-toolbar">
    <div class="toolbar-left">
      <span class="toolbar-title">Log Analyzer & Severity Filter</span>
      <div class="severity-pills">
        <button class="pill" class:active={severityFilter === 'ALL'} onclick={() => (severityFilter = 'ALL')}>
          ALL <span class="pill-count">{counts.total}</span>
        </button>
        <button class="pill error" class:active={severityFilter === 'ERROR'} onclick={() => (severityFilter = 'ERROR')}>
          ERROR <span class="pill-count">{counts.err}</span>
        </button>
        <button class="pill warn" class:active={severityFilter === 'WARN'} onclick={() => (severityFilter = 'WARN')}>
          WARN <span class="pill-count">{counts.warn}</span>
        </button>
        <button class="pill info" class:active={severityFilter === 'INFO'} onclick={() => (severityFilter = 'INFO')}>
          INFO <span class="pill-count">{counts.info}</span>
        </button>
        <button class="pill debug" class:active={severityFilter === 'DEBUG'} onclick={() => (severityFilter = 'DEBUG')}>
          DEBUG <span class="pill-count">{counts.debug}</span>
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
    {#each filteredLines as line (line.id)}
      <div class="log-row" class:row-error={line.level === 'ERROR'} class:row-warn={line.level === 'WARN'}>
        <span class="line-num">{line.id}</span>
        <span class="level-badge {line.level.toLowerCase()}">{line.level}</span>
        <span class="log-text">{line.text}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .log-analyzer-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: #0f172a;
    color: #f8fafc;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
  }

  .log-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 42px;
    padding: 0 16px;
    background: #1e293b;
    border-bottom: 1px solid #334155;
    user-select: none;
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
    background: #0f172a;
    border: 1px solid #334155;
    color: #94a3b8;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .pill:hover { background: #334155; color: #f8fafc; }
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
    background: #0f172a;
    border: 1px solid #475569;
    color: #f8fafc;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    outline: none;
    width: 200px;
  }

  .log-body {
    flex: 1;
    overflow: auto;
    padding: 10px 0;
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
    min-width: 36px;
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
</style>
