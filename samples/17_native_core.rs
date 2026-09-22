//! Markpad Native Backend — Core File Operations
//! High-performance native Rust implementation for disk I/O and window management.

use std::fs;
use std::path::Path;

pub const MAX_FILE_SIZE_BYTES: u64 = 50 * 1024 * 1024; // 50 MB
pub const BINARY_CHECK_BYTES: usize = 8192; // 8 KB sniff

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct FileMetadata {
    pub path: String,
    pub size: u64,
    pub is_binary: bool,
    pub readonly: bool,
}

#[tauri::command]
pub async fn read_file_content(path: String) -> Result<String, String> {
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err("File not found.".into());
    }

    let metadata = fs::metadata(file_path).map_err(|e| e.to_string())?;
    if metadata.len() > MAX_FILE_SIZE_BYTES {
        return Err(format!(
            "File exceeds 50MB limit ({:.1} MB).",
            metadata.len() as f64 / (1024.0 * 1024.0)
        ));
    }

    let bytes = fs::read(file_path).map_err(|e| e.to_string())?;
    let check_slice = &bytes[..bytes.len().min(BINARY_CHECK_BYTES)];
    if check_slice.contains(&0) {
        return Err("Binary file detected. Opening in binary viewer mode.".into());
    }

    String::from_utf8(bytes).map_err(|_| "Invalid UTF-8 encoding.".into())
}

#[tauri::command]
pub async fn save_file_content(path: String, content: String) -> Result<(), String> {
    let file_path = Path::new(&path);
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(file_path, content.as_bytes()).map_err(|e| e.to_string())
}
