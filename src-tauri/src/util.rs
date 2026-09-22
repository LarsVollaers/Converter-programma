use std::path::PathBuf;

/// Extracts embedded binary bytes to a stable temp path, skipping the write
/// if a file of the same size is already there. Shared by ffmpeg and yt-dlp
/// so both can ship as a single embedded portable .exe.
pub fn extract_embedded_binary(bytes: &[u8], name: &str) -> Result<PathBuf, String> {
    let dir = std::env::temp_dir().join("converter-app");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(format!("{}-{}.exe", name, env!("CARGO_PKG_VERSION")));

    let needs_write = match std::fs::metadata(&path) {
        Ok(meta) => meta.len() != bytes.len() as u64,
        Err(_) => true,
    };
    if needs_write {
        std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    }
    Ok(path)
}

pub fn sanitize_filename(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| {
            if r#"\/:*?"<>|"#.contains(c) {
                '_'
            } else {
                c
            }
        })
        .collect();
    let trimmed = cleaned.trim();
    if trimmed.is_empty() {
        "output".to_string()
    } else {
        trimmed.to_string()
    }
}

/// Appends " (1)", " (2)", ... to the stem until the path doesn't collide
/// with an existing file, so conversions/downloads never silently overwrite
/// something.
pub fn unique_output_path(dir: &str, stem: &str, ext: &str) -> String {
    let dir = dir.trim_end_matches(['/', '\\']);
    let candidate = format!("{}/{}.{}", dir, stem, ext);
    if !std::path::Path::new(&candidate).exists() {
        return candidate;
    }
    let mut counter = 1u32;
    loop {
        let candidate = format!("{}/{} ({}).{}", dir, stem, counter, ext);
        if !std::path::Path::new(&candidate).exists() {
            return candidate;
        }
        counter += 1;
    }
}
