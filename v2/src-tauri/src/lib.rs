use std::fs;
use std::path::Path;
use tauri::Manager;

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
async fn open_new_window(
    app: tauri::AppHandle,
    x: Option<f64>,
    y: Option<f64>,
) -> Result<(), String> {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let label = format!("window-{}", timestamp);

    let mut builder = tauri::WebviewWindowBuilder::new(
        &app,
        &label,
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title("Markpad Native")
    .inner_size(1000.0, 700.0)
    .resizable(true)
    .drag_and_drop(true);

    if let (Some(px), Some(py)) = (x, y) {
        builder = builder.position(px, py);
    }

    builder.build().map_err(|e| e.to_string())?;
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

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TargetWindowInfo {
    pub label: String,
    pub rel_x: f64,
    pub rel_y: f64,
}

#[tauri::command]
fn get_current_window_label(window: tauri::WebviewWindow) -> String {
    window.label().to_string()
}

#[tauri::command]
fn find_window_at_point(
    app: tauri::AppHandle,
    screen_x: f64,
    screen_y: f64,
    exclude_label: Option<String>,
) -> Option<TargetWindowInfo> {
    let exclude = exclude_label.unwrap_or_default();
    for (label, win) in app.webview_windows() {
        if !exclude.is_empty() && label == exclude {
            continue;
        }
        if let Ok(true) = win.is_minimized() {
            continue;
        }
        if let Ok(false) = win.is_visible() {
            continue;
        }
        if let (Ok(pos), Ok(size), Ok(scale)) = (win.outer_position(), win.outer_size(), win.scale_factor()) {
            let logical_pos = pos.to_logical::<f64>(scale);
            let logical_size = size.to_logical::<f64>(scale);

            // Generous margin for smooth, natural drag-and-drop between windows
            let min_x = logical_pos.x - 15.0;
            let max_x = logical_pos.x + logical_size.width + 15.0;
            let min_y = logical_pos.y - 45.0;
            let max_y = logical_pos.y + logical_size.height + 25.0;

            if screen_x >= min_x && screen_x <= max_x && screen_y >= min_y && screen_y <= max_y {
                return Some(TargetWindowInfo {
                    label,
                    rel_x: (screen_x - logical_pos.x).max(0.0),
                    rel_y: (screen_y - logical_pos.y).max(0.0),
                });
            }

            // Also test in physical monitor pixels in case screen_x was reported in physical units
            let phys_x = pos.x as f64;
            let phys_y = pos.y as f64;
            let phys_w = size.width as f64;
            let phys_h = size.height as f64;
            let p_min_x = phys_x - (15.0 * scale);
            let p_max_x = phys_x + phys_w + (15.0 * scale);
            let p_min_y = phys_y - (45.0 * scale);
            let p_max_y = phys_y + phys_h + (25.0 * scale);

            if screen_x >= p_min_x && screen_x <= p_max_x && screen_y >= p_min_y && screen_y <= p_max_y {
                return Some(TargetWindowInfo {
                    label,
                    rel_x: ((screen_x - phys_x) / scale).max(0.0),
                    rel_y: ((screen_y - phys_y) / scale).max(0.0),
                });
            }
        }
    }
    None
}

#[tauri::command]
fn focus_window(app: tauri::AppHandle, label: String) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(&label) {
        win.set_focus().map_err(|e| e.to_string())?;
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
            open_containing_folder,
            find_window_at_point,
            focus_window,
            get_current_window_label
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
