<script lang="ts">
  import { onMount } from 'svelte';
  import JsonTreeNode from './JsonTreeNode.svelte';

  let {
    keyName = '',
    value = null,
    depth = 0,
    searchQuery = ''
  } = $props<{
    keyName: string | number;
    value: any;
    depth?: number;
    searchQuery?: string;
  }>();

  let isExpanded = $state(false);
  onMount(() => {
    isExpanded = depth < 2;
  });

  function getType(val: any): string {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
    return typeof val;
  }

  const valType = $derived(getType(value));
  const isExpandable = $derived(valType === 'object' || valType === 'array');
  const childEntries = $derived.by(() => {
    if (!isExpandable || value === null) return [];
    if (Array.isArray(value)) {
      return value.map((item, index) => [index, item] as [number, any]);
    }
    return Object.entries(value);
  });

  const childCount = $derived(childEntries.length);

  function toggleExpand() {
    if (isExpandable) {
      isExpanded = !isExpanded;
    }
  }

  function matchesSearch(k: string | number, v: any, query: string): boolean {
    if (!query) return true;
    const q = query.toLowerCase();
    if (String(k).toLowerCase().includes(q)) return true;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      return String(v).toLowerCase().includes(q);
    }
    return false;
  }
</script>

<div class="tree-node" style="padding-left: {depth > 0 ? 16 : 0}px;">
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="node-row" class:expandable={isExpandable} onclick={toggleExpand}>
    {#if isExpandable}
      <span class="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
    {:else}
      <span class="spacer">&bull;</span>
    {/if}

    {#if keyName !== ''}
      <span class="key-label">"{keyName}":</span>
    {/if}

    {#if isExpandable}
      <span class="type-badge {valType}">{valType}[{childCount}]</span>
      {#if !isExpanded}
        <span class="preview-summary">
          {valType === 'array' ? `[${childCount} items]` : `{${childCount} keys}`}
        </span>
      {/if}
    {:else if valType === 'string'}
      <span class="type-badge string">str</span>
      <span class="val-string">"{value}"</span>
    {:else if valType === 'number'}
      <span class="type-badge number">num</span>
      <span class="val-number">{value}</span>
    {:else if valType === 'boolean'}
      <span class="type-badge boolean">bool</span>
      <span class="val-boolean">{value}</span>
    {:else}
      <span class="type-badge null">null</span>
      <span class="val-null">null</span>
    {/if}
  </div>

  {#if isExpandable && isExpanded}
    <div class="children-container">
      {#each childEntries as [childKey, childVal]}
        {#if !searchQuery || matchesSearch(childKey, childVal, searchQuery)}
          <JsonTreeNode
            keyName={childKey}
            value={childVal}
            depth={depth + 1}
            {searchQuery}
          />
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  .tree-node {
    user-select: text;
  }

  .node-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    line-height: 1.6;
    transition: background 0.1s ease;
  }

  .node-row.expandable {
    cursor: pointer;
  }

  .node-row:hover {
    background: rgba(56, 189, 248, 0.08);
  }

  .toggle-icon {
    font-size: 9px;
    color: #64748b;
    width: 12px;
    text-align: center;
  }

  .spacer {
    color: #475569;
    font-size: 10px;
    width: 12px;
    text-align: center;
  }

  .key-label {
    color: #0284c7;
    font-weight: 600;
  }
  :global(.app-container.dark) .key-label {
    color: #38bdf8;
  }

  .type-badge {
    font-size: 9px;
    padding: 1px 4px;
    border-radius: 3px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .type-badge.string { background: rgba(16, 185, 129, 0.2); color: #059669; }
  :global(.app-container.dark) .type-badge.string { background: #065f46; color: #34d399; }

  .type-badge.number { background: rgba(59, 130, 246, 0.2); color: #2563eb; }
  :global(.app-container.dark) .type-badge.number { background: #1e3a8a; color: #60a5fa; }

  .type-badge.boolean { background: rgba(168, 85, 247, 0.2); color: #7c3aed; }
  :global(.app-container.dark) .type-badge.boolean { background: #581c87; color: #c084fc; }

  .type-badge.null { background: rgba(100, 116, 139, 0.2); color: #475569; }
  :global(.app-container.dark) .type-badge.null { background: #374151; color: #9ca3af; }

  .type-badge.object, .type-badge.array { background: rgba(245, 158, 11, 0.2); color: #d97706; }
  :global(.app-container.dark) .type-badge.object, :global(.app-container.dark) .type-badge.array { background: #78350f; color: #fbbf24; }

  .preview-summary {
    color: var(--status-text, #64748b);
    font-style: italic;
    font-size: 11px;
  }

  .val-string { color: #059669; word-break: break-all; }
  :global(.app-container.dark) .val-string { color: #34d399; }

  .val-number { color: #2563eb; }
  :global(.app-container.dark) .val-number { color: #60a5fa; }

  .val-boolean { color: #7c3aed; font-weight: 600; }
  :global(.app-container.dark) .val-boolean { color: #c084fc; }

  .val-null { color: #475569; font-weight: 600; }
  :global(.app-container.dark) .val-null { color: #9ca3af; }

  .children-container {
    border-left: 1px solid var(--border-color, rgba(51, 65, 85, 0.5));
    margin-left: 6px;
  }
</style>
