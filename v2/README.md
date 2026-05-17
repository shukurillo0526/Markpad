# Markpad Native v2 — The VLC of Text Files

A high-performance, native Windows text utility rebuilt from the ground up using **Tauri (Rust)** + **SvelteKit** + **CodeMirror 6**. 

Markpad is designed for speed, zero-bloat, and complete desktop integration. It serves as an instant-load replacement for standard Notepad while supporting specialized heuristics to view and edit complex text file formats flawlessly.

---

## 🚀 Key Features

*   **Pristine Performance:** Replaces bulky Electron overhead with lightweight native Rust file handles and MS Edge WebView2.
*   **VLC Heuristics Engine:** Supports editing and custom beautiful viewing modes for:
    *   `.md`, `.markdown` (gorgeous HTML render with GFM auto-corrections)
    *   `.csv` (parses instantly into an interactive, structured HTML table)
    *   `.json` (prettifies and wraps nested documents automatically)
    *   `.log` (parses logs, injecting **color-coded priority badges** for `ERROR`, `WARN`, `INFO`, `DEBUG`)
    *   `.txt`, `.ini`, `.env` (optimized "Reader Mode" with premium typography for easy viewing)
*   **Dual Mode:** Switch instantly between full-featured writing (Edit Mode) and gorgeous document inspection (View Mode).
*   **Deep OS Integration:** Configured to automatically register as the default Windows handler for all text formats (`.md`, `.json`, `.csv`, `.log`, `.txt`, `.yaml`, etc.). Launches instantly when double-clicking a registered file!
*   **Localization (i18n):** Native, zero-dependency translation store supporting **English (en)**, **Russian (ru)**, and **Uzbek (uz)**.
*   **Theme Control:** Supports instant toggling between `System`, `Dark 🌙`, and `Light ☀️` layouts, persisting your choice to local storage.

---

## 🛠️ Build and Development

### Prerequisites
1. **NodeJS** (v18+)
2. **Rust** & **Cargo** (via `rustup`)
3. **C++ Build Tools** (required by Rust on Windows)

### 1. Install Dependencies
Run in your powershell terminal inside the `v2` directory:
```bash
npm install
```

### 2. Run Local Development (Instant hot-reload)
Launch the native window with a Vite dev server:
```bash
npm run tauri dev
```

### 3. Generate Desktop Production Bundle (`.msi` installer)
Builds the standalone installer using Rust release optimizations and the WiX toolset:
```bash
npm run tauri build
```
Once done, your high-performance installer will be saved at:
`v2/src-tauri/target/release/bundle/msi/Markpad_1.0.0_x64_en-US.msi`

---

## 📂 Codebase Architecture

*   `src-tauri/src/lib.rs` - The Rust backend: Handles system arguments, fast disk reading/writing, and native dialogs.
*   `src/routes/+page.svelte` - The UI shell: Controls state management, keyboard listeners (`Ctrl+O` / `Ctrl+S`), and title bar actions.
*   `src/Editor.svelte` - CodeMirror 6 Wrapper: Dynamically injects specialized syntax engines depending on file extensions.
*   `src/DataViewer.svelte` - Custom Viewers: Generates the HTML structures for logs, csv tables, reader mode, and pretty JSON.
*   `src/i18n.ts` - Ultra-fast translation store.
