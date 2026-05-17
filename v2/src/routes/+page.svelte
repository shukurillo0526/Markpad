<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { open, save } from '@tauri-apps/plugin-dialog';
  import Editor from '../Editor.svelte';
  import DataViewer from '../DataViewer.svelte';
  import { onMount } from 'svelte';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import { t, currentLocale, type LocaleKey } from '../i18n';

  let currentFilePath = '';
  let fileContent = '';
  let fileExtension = '';
  
  let systemPrefersDark = true;
  let themePreference: 'system' | 'dark' | 'light' = 'system';
  $: isDarkMode = themePreference === 'system' ? systemPrefersDark : themePreference === 'dark';

  let viewMode: 'edit' | 'view' = 'edit';

  async function openFile() {
    try {
      const selected = await open({
        multiple: false,
        title: "Open Text File",
      });
      if (selected) {
        currentFilePath = selected as string;
        // Basic extension parsing
        const parts = currentFilePath.split('.');
        fileExtension = parts.length > 1 ? parts[parts.length - 1] : '';
        
        fileContent = await invoke('read_file_content', { path: currentFilePath });
      }
    } catch (e) {
      console.error("Failed to open file", e);
      alert("Error opening file: " + e);
    }
  }

  async function saveFile() {
    if (!currentFilePath) {
      // Save As logic
      try {
        const selected = await save({
          title: "Save File As"
        });
        if (selected) {
          currentFilePath = selected as string;
        } else {
          return; // Cancelled
        }
      } catch (e) {
        console.error("Failed to prompt save dialog", e);
        return;
      }
    }
    
    try {
      await invoke('save_file_content', { path: currentFilePath, content: fileContent });
      // Show subtle feedback?
    } catch (e) {
      console.error("Failed to save file", e);
      alert("Error saving file: " + e);
    }
  }

  // Handle Ctrl+O and Ctrl+S globally
  function handleKeydown(e: KeyboardEvent) {
    if (e.ctrlKey && e.key === 'o') {
      e.preventDefault();
      openFile();
    } else if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveFile();
    }
  }

  onMount(async () => {
    // Theme setup
    const savedTheme = localStorage.getItem('markpad-theme') as any;
    if (savedTheme) themePreference = savedTheme;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemPrefersDark = mediaQuery.matches;
    mediaQuery.addEventListener('change', e => {
      systemPrefersDark = e.matches;
    });

    try {
      const args = await invoke<string[]>('get_startup_args');
      if (args && args.length > 1) {
        const startupPath = args[1];
        if (!startupPath.startsWith('--')) {
          currentFilePath = startupPath;
          const parts = currentFilePath.split('.');
          fileExtension = parts.length > 1 ? parts[parts.length - 1] : '';
          fileContent = await invoke('read_file_content', { path: currentFilePath });
        }
      }
    } catch (e) {
      console.error("Failed to parse startup arguments", e);
    }
  });

  function cycleTheme() {
    if (themePreference === 'system') themePreference = 'dark';
    else if (themePreference === 'dark') themePreference = 'light';
    else themePreference = 'system';
    localStorage.setItem('markpad-theme', themePreference);
  }

  function cycleLanguage() {
    const nextLang: Record<LocaleKey, LocaleKey> = { en: 'ru', ru: 'uz', uz: 'en' };
    $currentLocale = nextLang[$currentLocale];
  }

  // VLC Heuristics: Pre-process common broken markdown syntax
  $: preProcessedContent = fileContent.replace(/^\|---\|\s*\|?\s*/gm, '> ');

  $: parsedHtml = (fileExtension === 'md' || fileExtension === 'markdown') && viewMode === 'view'
    ? DOMPurify.sanitize(marked.parse(preProcessedContent, { gfm: true, breaks: true }) as string)
    : '';

</script>

<svelte:window on:keydown={handleKeydown} />

<main class="app-container" class:dark={isDarkMode}>
  <div data-tauri-drag-region class="titlebar">
    <div class="menu">
      <button on:click={openFile}>{$t('open')}</button>
      <button on:click={saveFile}>{$t('save')}</button>
    </div>
    <div class="title" data-tauri-drag-region>
      {currentFilePath ? currentFilePath.split('\\').pop() : $t('untitled')}
    </div>
    <div class="modes">
      <button on:click={cycleTheme} class="icon-btn" title="Theme">
        {themePreference === 'system' ? '💻' : themePreference === 'dark' ? '🌙' : '☀️'}
      </button>
      <button on:click={cycleLanguage} class="icon-btn" style="text-transform: uppercase; margin-right: 10px;">
        {$currentLocale}
      </button>
      <button class:active={viewMode === 'edit'} on:click={() => viewMode = 'edit'}>{$t('edit')}</button>
      <button class:active={viewMode === 'view'} on:click={() => viewMode = 'view'}>{$t('view')}</button>
    </div>
  </div>

  <div class="editor-wrapper">
    {#if viewMode === 'view'}
      {#if fileExtension === 'md' || fileExtension === 'markdown'}
        <div class="markdown-body">
          {@html parsedHtml}
        </div>
      {:else}
        {#key fileContent}
          <DataViewer content={fileContent} extension={fileExtension} />
        {/key}
      {/if}
    {:else}
      {#key viewMode}
        <Editor bind:content={fileContent} filePath={currentFilePath} extension={fileExtension} readOnly={false} />
      {/key}
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    overflow: hidden;
  }

  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background-color: #ffffff;
    color: #000000;
  }

  .app-container.dark {
    background-color: #1E1E1E;
    color: #ffffff;
  }

  .titlebar {
    height: 40px;
    background-color: rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    padding: 0 10px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    user-select: none;
  }

  .app-container.dark .titlebar {
    background-color: #2D2D2D;
    border-bottom: 1px solid #141414;
  }

  .menu button {
    background: transparent;
    border: none;
    color: inherit;
    padding: 4px 12px;
    cursor: pointer;
    font-size: 13px;
    border-radius: 4px;
  }

  .menu button:hover, .modes button:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .app-container.dark .menu button:hover, .app-container.dark .modes button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .modes button.active {
    background-color: rgba(0, 0, 0, 0.15);
    font-weight: bold;
  }
  
  .app-container.dark .modes button.active {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .icon-btn {
    opacity: 0.8;
  }

  .title {
    flex: 1;
    text-align: center;
    font-size: 12px;
    opacity: 0.7;
    pointer-events: none;
  }

  .editor-wrapper {
    flex: 1;
    overflow: auto;
    position: relative;
  }

  :global(.markdown-body) {
    padding: 60px 40px;
    max-width: 850px;
    margin: 0 auto;
    line-height: 1.7;
    font-size: 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: var(--text-color);
  }

  :global(.markdown-body h1), :global(.markdown-body h2), :global(.markdown-body h3), :global(.markdown-body h4) {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 700;
    line-height: 1.25;
  }

  :global(.markdown-body h1) { font-size: 2.25em; border-bottom: 1px solid rgba(128,128,128,0.2); padding-bottom: 0.3em; }
  :global(.markdown-body h2) { font-size: 1.75em; border-bottom: 1px solid rgba(128,128,128,0.2); padding-bottom: 0.3em; }
  :global(.markdown-body h3) { font-size: 1.5em; }

  :global(.markdown-body p) {
    margin-top: 0;
    margin-bottom: 16px;
  }

  :global(.markdown-body a) {
    color: #3b82f6;
    text-decoration: none;
  }
  :global(.markdown-body a:hover) {
    text-decoration: underline;
  }

  :global(.markdown-body strong) {
    font-weight: 600;
  }

  :global(.markdown-body ul), :global(.markdown-body ol) {
    margin-top: 0;
    margin-bottom: 16px;
    padding-left: 2em;
  }

  :global(.markdown-body li) {
    margin-bottom: 0.25em;
  }

  :global(.markdown-body blockquote) {
    margin: 0 0 16px 0;
    padding: 0 1em;
    color: rgba(128,128,128,0.8);
    border-left: 0.25em solid rgba(128,128,128,0.3);
  }

  :global(.markdown-body pre) {
    background-color: rgba(0, 0, 0, 0.05);
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin-bottom: 16px;
    border: 1px solid rgba(128, 128, 128, 0.1);
  }
  :global(.app-container.dark .markdown-body pre) {
    background-color: rgba(0, 0, 0, 0.3);
  }

  :global(.markdown-body code) {
    background-color: rgba(128,128,128,0.15);
    padding: 0.2em 0.4em;
    border-radius: 6px;
    font-family: "JetBrains Mono", Consolas, monospace;
    font-size: 85%;
  }

  :global(.markdown-body pre code) {
    background-color: transparent;
    padding: 0;
    border-radius: 0;
    font-size: 90%;
  }

  :global(.markdown-body table) {
    border-spacing: 0;
    border-collapse: collapse;
    margin-bottom: 16px;
    width: 100%;
    overflow: auto;
  }

  :global(.markdown-body table th),
  :global(.markdown-body table td) {
    padding: 10px 14px;
    border: 1px solid rgba(128,128,128,0.2);
    text-align: left;
  }

  :global(.markdown-body table th) {
    font-weight: 600;
    background-color: rgba(128,128,128,0.05);
  }

  :global(.markdown-body table tr:nth-child(2n)) {
    background-color: rgba(128,128,128,0.02);
  }
  
  :global(.markdown-body hr) {
    height: 1px;
    padding: 0;
    margin: 24px 0;
    background-color: rgba(128,128,128,0.2);
    border: 0;
  }

  /* Expose variables for CodeMirror inside Editor.svelte */
  .app-container.dark {
    --bg-color: #1E1E1E;
    --text-color: #D4D4D4;
  }
  .app-container {
    --bg-color: #ffffff;
    --text-color: #141414;
  }
</style>
