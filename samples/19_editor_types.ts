/**
 * Markpad Native v2.0 — Core Type Definitions
 */

export type EditorMode = 
  | 'editor'
  | 'preview'
  | 'dataviewer'
  | 'jsontree'
  | 'envinspector'
  | 'loganalyzer'
  | 'webpreview'
  | 'office'
  | 'pdf';

export interface CursorPosition {
  line: number;
  col: number;
  selectionLen: number;
}

export interface Tab {
  id: string;
  title: string;
  filePath: string | null;
  content: string;
  originalContent: string;
  isDirty: boolean;
  extension: string;
  cursorPos: CursorPosition;
  lineEnding: 'CRLF' | 'LF';
  encoding: string;
  mode: EditorMode;
  bytes: Uint8Array | null;
  pinned: boolean;
}

export type SupportedLocale = 'en' | 'ru' | 'uz' | 'zh' | 'ko' | 'ja' | 'es';

export interface MarkpadAppConfig {
  version: string;
  locale: SupportedLocale;
  theme: 'dark' | 'light';
  wordWrap: boolean;
  showInvisibles: boolean;
  activeTabId: string;
}
