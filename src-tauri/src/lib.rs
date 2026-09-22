mod converter;
mod downloader;
mod util;

use converter::{cancel_job, check_ffmpeg, convert_file, JobRegistry};
use downloader::{download_media, resolve_stream_url, search_media};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(JobRegistry::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            check_ffmpeg,
            convert_file,
            cancel_job,
            search_media,
            resolve_stream_url,
            download_media
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
