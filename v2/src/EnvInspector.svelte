<script lang="ts">
  let { content = '', extension = '' } = $props<{ content: string; extension: string }>();

  let searchQuery = $state('');
  let revealAll = $state(false);
  let revealedKeys = $state<Record<string, boolean>>({});

  interface EnvItem {
    key: string;
    value: string;
    comment?: string;
    isSecret: boolean;
  }

  let items = $derived.by(() => {
    const list: EnvItem[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#') || line.startsWith(';')) continue;

      const eqIdx = line.indexOf('=');
      const colIdx = line.indexOf(':');
      const sepIdx = eqIdx !== -1 ? eqIdx : colIdx;

      if (sepIdx !== -1) {
        const key = line.slice(0, sepIdx).trim();
        const value = line.slice(sepIdx + 1).trim();

        const lowerKey = key.toLowerCase();
        const isSecret =
          lowerKey.includes('pass') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('key') ||
          lowerKey.includes('token') ||
          lowerKey.includes('auth') ||
          lowerKey.includes('pwd') ||
          lowerKey.includes('cred');

        list.push({ key, value, isSecret });
      }
    }
    return list;
  });

  let filteredItems = $derived.by(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => item.key.toLowerCase().includes(q) || item.value.toLowerCase().includes(q));
  });

  function toggleReveal(key: string) {
    revealedKeys[key] = !revealedKeys[key];
  }
</script>

<div class="env-inspector-container">
  <div class="env-toolbar">
    <div class="toolbar-left">
      <span class="toolbar-title">Key-Value & Secret Inspector</span>
      <span class="badge">{items.length} Properties</span>
    </div>
    <div class="toolbar-right">
      <input
        type="text"
        placeholder="Filter keys or values..."
        bind:value={searchQuery}
        class="search-input"
      />
      <button class="tool-btn" onclick={() => (revealAll = !revealAll)}>
        {revealAll ? 'Hide Secrets' : 'Reveal All Secrets'}
      </button>
    </div>
  </div>

  <div class="env-body">
    <table class="env-table">
      <thead>
        <tr>
          <th style="width: 35%;">Key / Variable</th>
          <th>Value</th>
          <th style="width: 80px; text-align: center;">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredItems as item (item.key)}
          {@const isMasked = item.isSecret && !revealAll && !revealedKeys[item.key]}
          <tr>
            <td class="key-cell">
              <span class="key-name">{item.key}</span>
              {#if item.isSecret}
                <span class="secret-tag">Secret</span>
              {/if}
            </td>
            <td class="val-cell">
              {#if isMasked}
                <span class="masked-val">&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</span>
              {:else}
                <span class="raw-val">{item.value}</span>
              {/if}
            </td>
            <td class="action-cell">
              {#if item.isSecret}
                <button
                  class="icon-action-btn"
                  onclick={() => toggleReveal(item.key)}
                  title={isMasked ? 'Reveal Secret' : 'Hide Secret'}
                >
                  {isMasked ? '👁️' : '🙈'}
                </button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .env-inspector-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: #0f172a;
    color: #f8fafc;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
  }

  .env-toolbar {
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
    color: #10b981;
  }

  .badge {
    background: #334155;
    color: #38bdf8;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
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

  .env-body {
    flex: 1;
    overflow: auto;
    padding: 16px;
  }

  .env-table {
    width: 100%;
    border-collapse: collapse;
    background: #1e293b;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #334155;
  }

  .env-table th, .env-table td {
    padding: 10px 14px;
    text-align: left;
    border-bottom: 1px solid #334155;
  }

  .env-table th {
    background: #0f172a;
    color: #94a3b8;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
  }

  .key-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .key-name {
    font-weight: 600;
    color: #38bdf8;
  }

  .secret-tag {
    background: #7f1d1d;
    color: #fca5a5;
    font-size: 9px;
    padding: 1px 4px;
    border-radius: 3px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .masked-val {
    color: #64748b;
    letter-spacing: 2px;
  }

  .raw-val {
    color: #f8fafc;
  }

  .icon-action-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 14px;
    padding: 2px 4px;
    border-radius: 4px;
  }

  .icon-action-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }
</style>
