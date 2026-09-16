<script lang="ts">
  let { content = '', extension = '' } = $props<{ content: string; extension: string }>();

  let searchQuery = $state('');
  let expandDepth = $state(2);

  let parsedData = $derived.by(() => {
    try {
      if (!content.trim()) return null;
      return JSON.parse(content);
    } catch (e) {
      return { _error: `Failed to parse JSON: ${(e as Error).message}` };
    }
  });

  function getType(val: any): string {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
    return typeof val;
  }
</script>

<div class="json-tree-container">
  <div class="json-toolbar">
    <div class="toolbar-left">
      <span class="toolbar-title">JSON / Data Tree Explorer</span>
      {#if parsedData && !parsedData._error}
        <span class="badge">Valid JSON</span>
      {:else}
        <span class="badge error">Invalid JSON</span>
      {/if}
    </div>
    <div class="toolbar-right">
      <input
        type="text"
        placeholder="Filter keys or values..."
        bind:value={searchQuery}
        class="search-input"
      />
      <button class="tool-btn" onclick={() => (expandDepth = 10)}>Expand All</button>
      <button class="tool-btn" onclick={() => (expandDepth = 1)}>Collapse All</button>
    </div>
  </div>

  <div class="tree-content">
    {#if !parsedData}
      <div class="empty-state">No JSON data to display.</div>
    {:else if parsedData._error}
      <div class="error-state">{parsedData._error}</div>
    {:else}
      <div class="tree-root">
        {#each Object.entries(parsedData) as [key, val]}
          <div class="node-row">
            <span class="key-label">"{key}":</span>
            {#if getType(val) === 'object' || getType(val) === 'array'}
              <span class="type-badge {getType(val)}">{getType(val)}[{Object.keys(val || {}).length}]</span>
              <pre class="inline-preview">{JSON.stringify(val).slice(0, 80)}...</pre>
            {:else if getType(val) === 'string'}
              <span class="type-badge string">string</span>
              <span class="val-string">"{val}"</span>
            {:else if getType(val) === 'number'}
              <span class="type-badge number">number</span>
              <span class="val-number">{val}</span>
            {:else if getType(val) === 'boolean'}
              <span class="type-badge boolean">boolean</span>
              <span class="val-boolean">{val}</span>
            {:else}
              <span class="type-badge null">null</span>
              <span class="val-null">null</span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .json-tree-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: #0f172a;
    color: #f8fafc;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 13px;
  }

  .json-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 38px;
    padding: 0 16px;
    background: #1e293b;
    border-bottom: 1px solid #334155;
    user-select: none;
  }

  .toolbar-left, .toolbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .toolbar-title {
    font-weight: 600;
    color: #f59e0b;
  }

  .badge {
    background: #10b981;
    color: #0f172a;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
  }

  .badge.error {
    background: #ef4444;
    color: #ffffff;
  }

  .search-input {
    background: #0f172a;
    border: 1px solid #475569;
    color: #f8fafc;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    outline: none;
    width: 180px;
  }

  .tool-btn {
    background: transparent;
    border: 1px solid #475569;
    color: #cbd5e1;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
  }

  .tool-btn:hover {
    background: #334155;
    color: #f8fafc;
  }

  .tree-content {
    flex: 1;
    overflow: auto;
    padding: 20px;
  }

  .empty-state, .error-state {
    color: #94a3b8;
    padding: 20px;
  }

  .error-state {
    color: #f87171;
  }

  .node-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .node-row:hover {
    background: #1e293b;
  }

  .key-label {
    color: #38bdf8;
    font-weight: 600;
  }

  .type-badge {
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 3px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .type-badge.string { background: #065f46; color: #34d399; }
  .type-badge.number { background: #1e3a8a; color: #60a5fa; }
  .type-badge.boolean { background: #581c87; color: #c084fc; }
  .type-badge.null { background: #374151; color: #9ca3af; }
  .type-badge.object, .type-badge.array { background: #78350f; color: #fbbf24; }

  .val-string { color: #34d399; }
  .val-number { color: #60a5fa; }
  .val-boolean { color: #c084fc; }
  .val-null { color: #9ca3af; }
  .inline-preview { margin: 0; color: #64748b; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
