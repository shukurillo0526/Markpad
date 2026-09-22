<script lang="ts">
  import { t } from './i18n.svelte';

  let {
    line = 1,
    col = 1,
    selectionLen = 0,
    charCount = 0,
    wordCount = 0,
    fileSize = 0,
    encoding = 'UTF-8',
    lineEnding = 'CRLF',
    language = 'Plain Text',
    isDirty = false,
    filePath = null,
    activeMode = 'editor',
    wordWrap = false,
    showInvisibles = false,
    onToggleLineEnding = () => {},
    onToggleWordWrap = () => {},
    onToggleInvisibles = () => {},
    onToggleEncoding = () => {}
  } = $props<{
    line?: number;
    col?: number;
    selectionLen?: number;
    charCount?: number;
    wordCount?: number;
    fileSize?: number;
    encoding?: string;
    lineEnding?: 'CRLF' | 'LF';
    language?: string;
    isDirty?: boolean;
    filePath?: string | null;
    activeMode?: 'editor' | 'dataviewer' | 'preview' | 'webpreview' | 'jsontree' | 'envinspector' | 'loganalyzer' | 'pdf' | 'office';
    wordWrap?: boolean;
    showInvisibles?: boolean;
    onToggleLineEnding?: () => void;
    onToggleWordWrap?: () => void;
    onToggleInvisibles?: () => void;
    onToggleEncoding?: () => void;
  }>();

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
</script>

<footer class="status-bar" aria-label="Status Bar">
  <div class="status-left">
    {#if activeMode === 'pdf' || activeMode === 'office'}
      <span class="status-item mode-badge readonly-mode">
        <span class="dot readonly-dot"></span>
        Read Only
      </span>
    {:else}
      <span class="status-item mode-badge" class:dirty={isDirty}>
        <span class="dot" class:active={isDirty}></span>
        {isDirty ? t('unsaved') : t('saved_state')}
      </span>
    {/if}

    {#if filePath}
      <span class="status-item file-path" title={filePath}>
        {filePath}
      </span>
    {/if}

    {#if activeMode === 'editor'}
      <span class="status-item">
        {t('ln')} {line}, {t('col')} {col}
        {#if selectionLen > 0}
          <span class="selection-info">({selectionLen} {t('selected')})</span>
        {/if}
      </span>
      <span class="status-item hide-mobile">
        {wordCount} {t('words')} &bull; {charCount} {t('chars')}
      </span>
    {/if}
  </div>

  <div class="status-right">
    {#if fileSize > 0}
      <span class="status-item">
        {formatBytes(fileSize)}
      </span>
    {/if}

    {#if activeMode === 'editor'}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span
        class="status-item clickable badge-toggle"
        class:active={wordWrap}
        onclick={onToggleWordWrap}
        title="Toggle Word Wrap (Alt+Z)"
      >
        {t('wrap')}: {wordWrap ? t('on') : t('off')}
      </span>

      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span
        class="status-item clickable badge-toggle"
        class:active={showInvisibles}
        onclick={onToggleInvisibles}
        title="Toggle Invisibles (Alt+W)"
      >
        ·· {showInvisibles ? t('on') : t('off')}
      </span>
    {/if}

    {#if activeMode !== 'pdf' && activeMode !== 'office'}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span
        class="status-item clickable"
        onclick={onToggleLineEnding}
        title="Click to toggle CRLF / LF line endings"
      >
        {lineEnding}
      </span>

      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span
        class="status-item clickable"
        onclick={onToggleEncoding}
        title="Encoding (UTF-8)"
      >
        {encoding}
      </span>
    {/if}

    <span class="status-item language-tag">{language}</span>
  </div>
</footer>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 24px;
    background: var(--status-bg, #0f172a);
    border-top: 1px solid var(--status-border, #1e293b);
    color: var(--status-text, #94a3b8);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 11px;
    padding: 0 10px;
    user-select: none;
    z-index: 10;
  }

  .status-left, .status-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }

  .mode-badge {
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--surface-secondary, #1e293b);
    color: #38bdf8;
    font-weight: 500;
  }

  .mode-badge.dirty {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.2);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
  }

  .dot.active {
    background: #f59e0b;
  }

  .selection-info {
    color: #38bdf8;
    margin-left: 2px;
  }

  .file-path {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--status-text, #64748b);
  }

  .language-tag {
    background: var(--surface-secondary, #1e293b);
    color: var(--text-color, #cbd5e1);
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 600;
  }

  .badge-toggle {
    background: var(--surface-secondary, #1e293b);
    padding: 1px 6px;
    border-radius: 4px;
    color: var(--status-text, #94a3b8);
    transition: background 0.15s ease, color 0.15s ease;
  }

  .badge-toggle.active {
    background: #38bdf8;
    color: #0f172a;
    font-weight: 600;
  }

  .clickable {
    cursor: pointer;
  }

  .clickable:hover {
    color: var(--text-color, #f8fafc);
  }

  @media (max-width: 640px) {
    .hide-mobile {
      display: none;
    }
    .file-path {
      max-width: 100px;
    }
  }
</style>
