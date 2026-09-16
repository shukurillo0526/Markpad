use std::fs;
use std::path::Path;

const MAX_FILE_SIZE: u64 = 50 * 1024 * 1024; // 50 MB
const BINARY_CHECK_SIZE: usize = 8192; // Check first 8KB

#[tauri::command]
async fn read_file_content(path: String) -> Result<String, String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err("File not found.".to_string());
    }

    if !file_path.is_file() {
        return Err("Path is not a file.".to_string());
    }

    // Check file size
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    let size = metadata.len();

    if size > MAX_FILE_SIZE {
        return Err(format!(
            "File is too large ({:.1} MB). Maximum supported size is {:.0} MB.",
            size as f64 / 1024.0 / 1024.0,
            MAX_FILE_SIZE as f64 / 1024.0 / 1024.0
        ));
    }

    // Read file bytes
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;

    // Check for binary content (null bytes in first 8KB)
    let check_len = bytes.len().min(BINARY_CHECK_SIZE);
    if bytes[..check_len].contains(&0) {
        return Err("This appears to be a binary file and cannot be opened as text.".to_string());
    }

    // Convert to UTF-8 string
    String::from_utf8(bytes)
        .map_err(|_| "File is not valid UTF-8 text. Try a different encoding.".to_string())
}

#[tauri::command]
async fn save_file_content(path: String, content: String) -> Result<(), String> {
    let file_path = Path::new(&path);

    // Ensure parent directory exists
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            return Err("Parent directory does not exist.".to_string());
        }
    }

    fs::write(&path, &content).map_err(|e| format!("Failed to save: {}", e))
}

#[tauri::command]
fn get_startup_args() -> Vec<String> {
    std::env::args().collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_file_content,
            save_file_content,
            get_startup_args
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
