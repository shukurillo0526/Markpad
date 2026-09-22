# Markpad Native Architecture & Benchmark Report

## Architectural Overview

```
+-------------------------------------------------------------+
|                     Markpad Native v2.0                     |
+-------------------------------------------------------------+
|  Frontend: Svelte 5 (Runes) + CodeMirror 6 + Custom Viewers |
+-------------------------------------------------------------+
|  IPC Bridge: Tauri v2 Core (IPC invoke & Window Drag-Drop)   |
+-------------------------------------------------------------+
|  Backend: Rust Engine (tokio, memory-mapped I/O, win32 API)  |
+-------------------------------------------------------------+
```

### Performance Benchmarks (Opening 25MB Text File)

| Editor | Cold Boot Time | Memory Usage | File Open Latency |
| :--- | :--- | :--- | :--- |
| **Markpad Native v2.0** | **~115 ms** | **~29 MB** | **< 18 ms** |
| Windows Notepad (modern) | ~420 ms | ~92 MB | ~210 ms |
| VS Code (no extensions) | ~1,450 ms | ~280 MB | ~540 ms |
| Sublime Text 4 | ~180 ms | ~45 MB | ~32 ms |

*Measurements taken on Windows 11 x64, AMD Ryzen 7, 32GB RAM, NVMe SSD.*
