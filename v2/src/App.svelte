<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { open, save } from '@tauri-apps/plugin-dialog';
  import Editor from './Editor.svelte';
  import { onMount } from 'svelte';

  let currentFilePath = '';
  let fileContent = '';
  let fileExtension = '';
  let isDarkMode = true;

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

  onMount(() => {
    // Check OS preferred color scheme
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    isDarkMode = mediaQuery.matches;
    mediaQuery.addEventListener('change', e => {
      isDarkMode = e.matches;
    });
  });

</script>

<svelte:window on:keydown={handleKeydown} />

<main class="app-container" class:dark={isDarkMode}>
  <div data-tauri-drag-region class="titlebar">
    <div class="menu">
      <button on:click={openFile}>Open</button>
      <button on:click={saveFile}>Save</button>
    </div>
    <div class="title" data-tauri-drag-region>
      {currentFilePath ? currentFilePath.split('\\').pop() : 'Markpad Native - Untitled'}
    </div>
  </div>

  <div class="editor-wrapper">
    <Editor bind:content={fileContent} filePath={currentFilePath} extension={fileExtension} />
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

  .menu button:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .app-container.dark .menu button:hover {
    background-color: rgba(255, 255, 255, 0.1);
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
    overflow: hidden;
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
