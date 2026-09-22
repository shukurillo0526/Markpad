-- Markpad Native Local Document Database Schema
-- Embedded SQLite database for local recents, bookmarks, and sessions

CREATE TABLE IF NOT EXISTS recent_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_extension TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    last_opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_pinned BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS session_tabs (
    tab_id TEXT PRIMARY KEY,
    window_label TEXT NOT NULL,
    file_path TEXT,
    tab_title TEXT NOT NULL,
    cursor_line INTEGER DEFAULT 1,
    cursor_col INTEGER DEFAULT 1,
    scroll_top INTEGER DEFAULT 0,
    tab_order INTEGER NOT NULL,
    mode TEXT DEFAULT 'editor'
);

CREATE INDEX IF NOT EXISTS idx_recent_docs_opened ON recent_documents(last_opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_tabs_window ON session_tabs(window_label, tab_order);

-- Query: Retrieve Top 10 Most Recent Files
SELECT file_name, file_path, file_extension, last_opened_at
FROM recent_documents
ORDER BY is_pinned DESC, last_opened_at DESC
LIMIT 10;
