use std::fs;
use std::path::Path;

const MAX_FILE_SIZE: u64 = 50 * 1024 * 1024; // 50 MB
const BINARY_CHECK_SIZE: usize = 8192; // Check first 8KB

#[tauri::command]
async fn read_file_content(path: String) -> Result<String, String> {
    let file_path = Path::new(&path);

    // Validate path is absolute to prevent relative path traversal
    if !file_path.is_absolute() {
        return Err("Only absolute file paths are allowed.".to_string());
    }

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
    // Skip this check for very small files to avoid false positives
    if bytes.len() > 4 {
        let check_len = bytes.len().min(BINARY_CHECK_SIZE);
        // Check for UTF-16 BOM before rejecting null bytes
        let is_utf16_bom = (bytes.len() >= 2 && (bytes[0] == 0xFF && bytes[1] == 0xFE))
            || (bytes.len() >= 2 && (bytes[0] == 0xFE && bytes[1] == 0xFF));

        if !is_utf16_bom && bytes[..check_len].contains(&0) {
            return Err("This appears to be a binary file and cannot be opened as text.".to_string());
        }
    }

    // Try UTF-8 first, then lossy conversion for other encodings
    match String::from_utf8(bytes.clone()) {
        Ok(content) => Ok(content),
        Err(_) => {
            // Fallback: lossy UTF-8 conversion (replaces invalid bytes with replacement char)
            Ok(String::from_utf8_lossy(&bytes).into_owned())
        }
    }
}

#[tauri::command]
async fn save_file_content(path: String, content: String) -> Result<(), String> {
    let file_path = Path::new(&path);

    // Validate path is absolute
    if !file_path.is_absolute() {
        return Err("Only absolute file paths are allowed.".to_string());
    }

    // Ensure parent directory exists
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            return Err("Parent directory does not exist.".to_string());
        }
    }

    // Atomic save: write to a temporary file first, then rename
    let tmp_path = format!("{}.markpad_tmp", path);
    fs::write(&tmp_path, &content).map_err(|e| format!("Failed to save: {}", e))?;

    // Rename the temp file to the target (atomic on most filesystems)
    fs::rename(&tmp_path, &path).map_err(|e| {
        // Clean up the temp file if rename fails
        let _ = fs::remove_file(&tmp_path);
        format!("Failed to finalize save: {}", e)
    })
}

#[tauri::command]
async fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    let file_path = Path::new(&path);

    if !file_path.is_absolute() {
        return Err("Only absolute file paths are allowed.".to_string());
    }

    if !file_path.exists() {
        return Err("File not found.".to_string());
    }

    if !file_path.is_file() {
        return Err("Path is not a file.".to_string());
    }

    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    let size = metadata.len();

    if size > MAX_FILE_SIZE {
        return Err(format!(
            "File is too large ({:.1} MB). Maximum supported size is {:.0} MB.",
            size as f64 / 1024.0 / 1024.0,
            MAX_FILE_SIZE as f64 / 1024.0 / 1024.0
        ));
    }

    fs::read(&path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_file_bytes(path: String, bytes: Vec<u8>) -> Result<(), String> {
    let file_path = Path::new(&path);

    if !file_path.is_absolute() {
        return Err("Only absolute file paths are allowed.".to_string());
    }

    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            return Err("Parent directory does not exist.".to_string());
        }
    }

    let tmp_path = format!("{}.markpad_tmp", path);
    fs::write(&tmp_path, &bytes).map_err(|e| format!("Failed to save: {}", e))?;

    fs::rename(&tmp_path, &path).map_err(|e| {
        let _ = fs::remove_file(&tmp_path);
        format!("Failed to finalize save: {}", e)
    })
}

#[tauri::command]
fn get_startup_args() -> Vec<String> {
    std::env::args().collect()
}

#[tauri::command]
fn reveal_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(format!("/select,{}", path))
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = path;
    }
    Ok(())
}

#[tauri::command]
fn open_new_window(file_path: Option<String>) -> Result<(), String> {
    let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let mut cmd = std::process::Command::new(current_exe);
    if let Some(path) = file_path {
        if !path.is_empty() {
            cmd.arg(path);
        }
    }
    cmd.spawn().map_err(|e| format!("Failed to launch new window: {}", e))?;
    Ok(())
}

#[tauri::command]
fn open_containing_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let file_path = Path::new(&path);
        let folder = if file_path.is_dir() {
            file_path
        } else {
            file_path.parent().unwrap_or(file_path)
        };
        std::process::Command::new("explorer")
            .arg(folder)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = path;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_file_content,
            read_file_bytes,
            save_file_content,
            save_file_bytes,
            get_startup_args,
            reveal_file,
            open_new_window,
            open_containing_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
