<script lang="ts">
  import JsonTreeNode from './JsonTreeNode.svelte';
  import YAML from 'yaml';

  let { content = '', extension = '' } = $props<{ content: string; extension: string }>();

  let searchQuery = $state('');

  let isYaml = $derived(['yaml', 'yml'].includes(extension.toLowerCase()));

  let parsedData = $derived.by(() => {
    try {
      if (!content.trim()) return null;
      if (isYaml) {
        return { data: YAML.parse(content), error: null };
      }
      return { data: JSON.parse(content), error: null };
    } catch (e) {
      const format = isYaml ? 'YAML' : 'JSON';
      return { data: null, error: `Failed to parse ${format}: ${(e as Error).message}` };
    }
  });

  let isObjectOrArray = $derived(
    parsedData?.data !== null && typeof parsedData?.data === 'object'
  );
</script>

<div class="json-tree-container">
  <div class="json-toolbar">
    <div class="toolbar-left">
      <span class="toolbar-title">{isYaml ? 'YAML' : 'JSON'} Tree Explorer</span>
      {#if parsedData?.data !== null && !parsedData?.error}
        <span class="badge">Valid {isYaml ? 'YAML' : 'JSON'}</span>
      {:else if parsedData?.error}
        <span class="badge error">Invalid {isYaml ? 'YAML' : 'JSON'}</span>
      {/if}
    </div>
    <div class="toolbar-right">
      <input
        type="text"
        placeholder="Filter keys or values..."
        bind:value={searchQuery}
        class="search-input"
      />
    </div>
  </div>

  <div class="tree-content">
    {#if !parsedData || parsedData.data === null}
      {#if parsedData?.error}
        <div class="error-state">
          <div class="error-header">⚠️ {parsedData.error}</div>
          <pre class="raw-preview">{content}</pre>
        </div>
      {:else}
        <div class="empty-state">No JSON data to display.</div>
      {/if}
    {:else}
      <div class="tree-root">
        {#if isObjectOrArray}
          {#if Array.isArray(parsedData.data)}
            {#each parsedData.data as item, idx}
              <JsonTreeNode keyName={idx} value={item} depth={0} {searchQuery} />
            {/each}
          {:else}
            {#each Object.entries(parsedData.data) as [key, val]}
              <JsonTreeNode keyName={key} value={val} depth={0} {searchQuery} />
            {/each}
          {/if}
        {:else}
          <JsonTreeNode keyName="value" value={parsedData.data} depth={0} {searchQuery} />
        {/if}
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
    background: var(--surface-bg, #0f172a);
    color: var(--text-color, #f8fafc);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 13px;
  }

  .json-toolbar {
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

  .tree-content {
    flex: 1;
    overflow: auto;
    padding: 16px 20px;
  }

  .tree-root {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .empty-state {
    color: #94a3b8;
    padding: 20px;
    font-style: italic;
  }

  .error-state {
    padding: 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
    margin: 16px;
  }

  .error-header {
    color: #ef4444;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .raw-preview {
    color: #cbd5e1;
    font-size: 11px;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 300px;
    overflow-y: auto;
  }
</style>
