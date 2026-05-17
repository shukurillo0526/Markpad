<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState } from '@codemirror/state';
  import { markdown } from '@codemirror/lang-markdown';
  import { json } from '@codemirror/lang-json';
  import { yaml } from '@codemirror/lang-yaml';
  import { xml } from '@codemirror/lang-xml';
  import { invoke } from '@tauri-apps/api/core';

  export let content = '';
  export let extension = '';
  export let readOnly = false;

  let editorContainer: HTMLDivElement;
  let view: EditorView;

  // VLC Heuristics Engine for language parsing
  function getLanguageExtension(ext: string) {
    switch (ext.toLowerCase()) {
      case 'md':
      case 'markdown':
        return markdown();
      case 'json':
        return json();
      case 'yaml':
      case 'yml':
        return yaml();
      case 'xml':
      case 'html':
      case 'svg':
        return xml();
      default:
        return [];
    }
  }

  function getExtensions() {
    const exts = [
      basicSetup,
      getLanguageExtension(extension),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !readOnly) {
          content = update.state.doc.toString();
        }
      }),
      EditorView.theme({
        "&": {
          height: "100%",
          fontSize: "14px",
          fontFamily: "Consolas, 'Courier New', monospace"
        },
        ".cm-content": {
          padding: "20px"
        }
      })
    ];
    if (readOnly) {
      exts.push(EditorState.readOnly.of(true));
    }
    return exts;
  }

  onMount(() => {
    const state = EditorState.create({
      doc: content,
      extensions: getExtensions()
    });

    view = new EditorView({
      state,
      parent: editorContainer
    });
  });

  onDestroy(() => {
    if (view) {
      view.destroy();
    }
  });

  // Reactive update when a new file is loaded natively
  $: {
    if (view && content !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content }
      });
      // Reconfigure language extension based on new file extension
      view.dispatch({
        effects: EditorState.transactionExtender.of(() => null) // Basic hot-swap placeholder
      });
    }
  }
</script>

<div bind:this={editorContainer} class="editor-container"></div>

<style>
  .editor-container {
    width: 100%;
    height: 100%;
    background-color: var(--bg-color, #1E1E1E);
    color: var(--text-color, #D4D4D4);
    overflow: auto;
  }
</style>
