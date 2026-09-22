<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, keymap, highlightWhitespace } from '@codemirror/view';
  import { basicSetup } from 'codemirror';
  import { EditorState, Compartment } from '@codemirror/state';
  import { foldGutter, bracketMatching } from '@codemirror/language';
  import { closeBrackets } from '@codemirror/autocomplete';
  import { search, searchKeymap, highlightSelectionMatches, openSearchPanel, closeSearchPanel, gotoLine } from '@codemirror/search';
  import { markdown } from '@codemirror/lang-markdown';
  import { json } from '@codemirror/lang-json';
  import { yaml } from '@codemirror/lang-yaml';
  import { xml } from '@codemirror/lang-xml';
  import { javascript } from '@codemirror/lang-javascript';
  import { python } from '@codemirror/lang-python';
  import { html } from '@codemirror/lang-html';
  import { css } from '@codemirror/lang-css';
  import { sql } from '@codemirror/lang-sql';
  import { rust } from '@codemirror/lang-rust';
  import { cpp } from '@codemirror/lang-cpp';
  import { oneDark } from '@codemirror/theme-one-dark';
  import { getLocale, getEditorPhrases } from './i18n.svelte';

  interface Props {
    content: string;
    extension: string;
    readOnly?: boolean;
    isDark?: boolean;
    wordWrap?: boolean;
    showInvisibles?: boolean;
    onContentChange?: (newContent: string) => void;
    onCursorChange?: (info: { line: number; col: number; selectionLen: number }) => void;
  }

  let {
    content = $bindable(''),
    extension = '',
    readOnly = false,
    isDark = false,
    wordWrap = false,
    showInvisibles = false,
    onContentChange = () => {},
    onCursorChange = () => {},
  }: Props = $props();

  let editorContainer: HTMLDivElement;
  let view: EditorView;

  // Dynamic Compartments for hot-swapping settings without editor destruction
  const languageConf = new Compartment();
  const themeConf = new Compartment();
  const readOnlyConf = new Compartment();
  const wordWrapConf = new Compartment();
  const invisiblesConf = new Compartment();
  const phrasesConf = new Compartment();

  // Smart language detection
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
      case 'svg':
        return xml();
      case 'html':
      case 'htm':
        return html();
      case 'js':
      case 'jsx':
      case 'mjs':
      case 'cjs':
        return javascript();
      case 'ts':
      case 'tsx':
        return javascript({ typescript: true });
      case 'css':
      case 'scss':
      case 'less':
        return css();
      case 'py':
      case 'pyw':
        return python();
      case 'sql':
        return sql();
      case 'rs':
        return rust();
      case 'c':
      case 'cpp':
      case 'cc':
      case 'h':
      case 'hpp':
        return cpp();
      default:
        return [];
    }
  }

  export function triggerSearch() {
    if (view) openSearchPanel(view);
  }

  export function triggerGotoLine() {
    if (view) gotoLine(view);
  }

  onMount(() => {
    const state = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        EditorState.allowMultipleSelections.of(true),
        bracketMatching(),
        closeBrackets(),
        foldGutter(),
        search({ top: true }),
        highlightSelectionMatches(),
        keymap.of(searchKeymap),
        languageConf.of(getLanguageExtension(extension)),
        themeConf.of(isDark ? oneDark : []),
        readOnlyConf.of(EditorState.readOnly.of(readOnly)),
        wordWrapConf.of(wordWrap ? EditorView.lineWrapping : []),
        invisiblesConf.of(showInvisibles ? highlightWhitespace() : []),
        phrasesConf.of(EditorState.phrases.of(getEditorPhrases(getLocale()))),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !readOnly) {
            const newContent = update.state.doc.toString();
            if (newContent !== content) {
              content = newContent;
              onContentChange(newContent);
            }
          }
          if (update.selectionSet || update.docChanged) {
            const mainSel = update.state.selection.main;
            const pos = mainSel.head;
            const line = update.state.doc.lineAt(pos);
            const selectionLen = Math.abs(mainSel.to - mainSel.from);
            onCursorChange({ line: line.number, col: pos - line.from + 1, selectionLen });
          }
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '14px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          },
          '.cm-content': {
            padding: '16px 20px',
          },
          '.cm-scroller': {
            overflow: 'auto',
          },
          '.cm-panel.cm-search': {
            background: '#0f172a',
            color: '#f8fafc',
            borderBottom: '1px solid #334155',
            padding: '8px 16px',
          },
          '.cm-panel.cm-search input': {
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #475569',
            borderRadius: '4px',
            padding: '4px 8px',
            outline: 'none',
          },
          '.cm-panel.cm-search button': {
            background: '#334155',
            color: '#f8fafc',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 10px',
            margin: '0 2px',
            cursor: 'pointer',
          },
          '.cm-panel.cm-search button:hover': {
            background: '#38bdf8',
            color: '#0f172a',
          }
        }),
      ],
    });

    view = new EditorView({ state, parent: editorContainer });
  });

  onDestroy(() => {
    view?.destroy();
  });

  // Hot-swap language
  $effect(() => {
    const lang = getLanguageExtension(extension);
    if (view) {
      view.dispatch({ effects: languageConf.reconfigure(lang) });
    }
  });

  // Hot-swap theme
  $effect(() => {
    const theme = isDark ? oneDark : [];
    if (view) {
      view.dispatch({ effects: themeConf.reconfigure(theme) });
    }
  });

  // Hot-swap word wrap
  $effect(() => {
    const wrap = wordWrap ? EditorView.lineWrapping : [];
    if (view) {
      view.dispatch({ effects: wordWrapConf.reconfigure(wrap) });
    }
  });

  // Hot-swap invisibles
  $effect(() => {
    const inv = showInvisibles ? highlightWhitespace() : [];
    if (view) {
      view.dispatch({ effects: invisiblesConf.reconfigure(inv) });
    }
  });

  // Hot-swap localization phrases for CodeMirror (search panel, goto line, announcements)
  $effect(() => {
    const loc = getLocale();
    if (view) {
      view.dispatch({
        effects: phrasesConf.reconfigure(EditorState.phrases.of(getEditorPhrases(loc)))
      });
      // If the search panel is currently open, refresh it so new language shows immediately
      if (editorContainer?.querySelector('.cm-search')) {
        closeSearchPanel(view);
        openSearchPanel(view);
      }
    }
  });

  // Sync content when changed externally
  $effect(() => {
    if (view && content !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      });
    }
  });
</script>

<div bind:this={editorContainer} class="editor-container"></div>

<style>
  .editor-container {
    width: 100%;
    height: 100%;
    overflow: auto;
  }
</style>
