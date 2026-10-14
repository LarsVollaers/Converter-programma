use std::path::PathBuf;
use std::sync::OnceLock;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

use crate::converter::{extract_embedded_ffmpeg, JobRegistry, EXTRACTED_FFMPEG};
use crate::util::{find_tool, sanitize_filename, unique_output_path};
#[cfg(target_os = "windows")]
use crate::util::extract_embedded_binary;

/// yt-dlp is embedded the same way as ffmpeg: a single portable .exe, no
/// separate install step. Unlike ffmpeg it needs occasional updates when
/// YouTube/SoundCloud change things, so an embedded version can go stale —
/// documented in the README.
#[cfg(target_os = "windows")]
static YTDLP_BYTES: &[u8] = include_bytes!("../binaries/yt-dlp-x86_64-pc-windows-msvc.exe");

static EXTRACTED_YTDLP: OnceLock<Result<PathBuf, String>> = OnceLock::new();

#[cfg(target_os = "windows")]
fn extract_embedded_ytdlp() -> Result<PathBuf, String> {
    extract_embedded_binary(YTDLP_BYTES, "yt-dlp")
}

#[cfg(not(target_os = "windows"))]
fn extract_embedded_ytdlp() -> Result<PathBuf, String> {
    Err("geen ingebakken yt-dlp voor dit platform".to_string())
}

/// The embedded yt-dlp is tried first; falls back to a system-installed
/// yt-dlp on PATH for platforms without an embedded binary (macOS/Linux).
fn ytdlp_command(app: &AppHandle) -> Result<tauri_plugin_shell::process::Command, String> {
    if let Ok(path) = EXTRACTED_YTDLP.get_or_init(extract_embedded_ytdlp) {
        return Ok(app.shell().command(path));
    }
    find_tool("yt-dlp")
        .map(|path| app.shell().command(path))
        .ok_or_else(|| "yt-dlp niet gevonden (niet gebundeld en niet in PATH).".to_string())
}

#[tauri::command]
pub async fn check_ytdlp(app: AppHandle) -> Result<String, String> {
    let cmd = ytdlp_command(&app)?;
    let output = cmd
        .args(["--version"])
        .output()
        .await
        .map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&output.stdout);
    Ok(text.lines().next().unwrap_or("yt-dlp").to_string())
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SearchResultDto {
    pub id: String,
    pub title: String,
    pub uploader: String,
    pub duration_seconds: Option<f64>,
    pub thumbnail: Option<String>,
    pub webpage_url: String,
    pub timestamp: Option<i64>,
    pub view_count: Option<u64>,
    pub like_count: Option<u64>,
    pub source: String,
}

fn parse_entry(entry: &Value, source: &str) -> Option<SearchResultDto> {
    // Flat-playlist search results also include channel/playlist header
    // entries mixed in with actual tracks; only tracks have a duration.
    let duration_seconds = entry.get("duration").and_then(Value::as_f64);
    duration_seconds?;

    let id = entry.get("id")?.as_str()?.to_string();
    let title = entry
        .get("title")
        .and_then(Value::as_str)
        .unwrap_or("Onbekende titel")
        .to_string();
    let uploader = entry
        .get("uploader")
        .and_then(Value::as_str)
        .or_else(|| entry.get("channel").and_then(Value::as_str))
        .unwrap_or("Onbekend")
        .to_string();
    let webpage_url = entry
        .get("webpage_url")
        .and_then(Value::as_str)
        .or_else(|| entry.get("url").and_then(Value::as_str))?
        .to_string();
    let thumbnail = entry
        .get("thumbnail")
        .and_then(Value::as_str)
        .map(str::to_string)
        .or_else(|| {
            entry
                .get("thumbnails")
                .and_then(Value::as_array)
                .and_then(|arr| arr.last())
                .and_then(|t| t.get("url"))
                .and_then(Value::as_str)
                .map(str::to_string)
        });
    let timestamp = entry.get("timestamp").and_then(Value::as_i64);
    let view_count = entry.get("view_count").and_then(Value::as_u64);
    let like_count = entry.get("like_count").and_then(Value::as_u64);

    Some(SearchResultDto {
        id,
        title,
        uploader,
        duration_seconds,
        thumbnail,
        webpage_url,
        timestamp,
        view_count,
        like_count,
        source: source.to_string(),
    })
}

#[tauri::command]
pub async fn search_media(
    app: AppHandle,
    query: String,
    source: String,
    is_url: bool,
) -> Result<Vec<SearchResultDto>, String> {
    let target = if is_url {
        query.clone()
    } else {
        let prefix = match source.as_str() {
            "soundcloud" => "scsearch30",
            _ => "ytsearch30",
        };
        format!("{}:{}", prefix, query)
    };

    let cmd = ytdlp_command(&app)?;
    let output = cmd
        .args([
            "--flat-playlist",
            "--dump-single-json",
            "--no-warnings",
            "--remote-components",
            "ejs:github",
            &target,
        ])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("zoeken mislukt: {}", stderr.lines().last().unwrap_or("onbekende fout")));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: Value = serde_json::from_str(&stdout).map_err(|e| e.to_string())?;
    let entries = parsed
        .get("entries")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_else(|| vec![parsed.clone()]);

    let results = entries
        .iter()
        .filter_map(|e| parse_entry(e, &source))
        .collect();
    Ok(results)
}

#[tauri::command]
pub async fn resolve_stream_url(app: AppHandle, url: String) -> Result<String, String> {
    let cmd = ytdlp_command(&app)?;
    let output = cmd
        .args([
            "-g",
            "-f",
            "bestaudio[protocol!=m3u8]/bestaudio",
            "--no-warnings",
            "--remote-components",
            "ejs:github",
            &url,
        ])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err("kon geen afspeel-link ophalen".to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout
        .lines()
        .next()
        .map(str::to_string)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "kon geen afspeel-link ophalen".to_string())
}

#[derive(Deserialize)]
pub struct DownloadOptions {
    pub job_id: String,
    pub url: String,
    pub output_dir: String,
    pub output_format: String, // mp3 | wav | flac
    pub bitrate_kbps: Option<u32>,
    pub sample_rate: Option<u32>,
    pub output_name: Option<String>,
}

#[tauri::command]
pub async fn download_media(
    app: AppHandle,
    jobs: State<'_, JobRegistry>,
    options: DownloadOptions,
) -> Result<String, String> {
    let stem = match &options.output_name {
        Some(name) if !name.trim().is_empty() => sanitize_filename(name),
        _ => "download".to_string(),
    };
    let output_path = unique_output_path(&options.output_dir, &stem, &options.output_format);
    // yt-dlp appends its own extension via %(ext)s, so hand it the same
    // unique stem without the extension we already picked.
    let output_template = {
        let dir = options.output_dir.trim_end_matches(['/', '\\']);
        let final_stem = std::path::Path::new(&output_path)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or(&stem)
            .to_string();
        format!("{}/{}.%(ext)s", dir, final_stem)
    };

    // yt-dlp shells out to ffmpeg for the actual audio extraction/transcode
    // step, so point it at the same embedded ffmpeg the Converter tab uses.
    let ffmpeg_path = EXTRACTED_FFMPEG
        .get_or_init(extract_embedded_ffmpeg)
        .as_ref()
        .ok()
        .map(|p| p.to_string_lossy().to_string());

    let bitrate = options.bitrate_kbps.unwrap_or(192);
    let mut args: Vec<String> = vec!["-x".into()];
    // If the source is already served in the target format, yt-dlp skips
    // re-encoding entirely (a "no-op" optimization) — which silently
    // ignores our bitrate/sample-rate settings. Most noticeable with
    // SoundCloud, which often serves plain mp3. Steering the format
    // selection away from an already-matching stream forces a real
    // transcode through ffmpeg whenever an alternative stream exists.
    if options.output_format == "mp3" {
        args.push("-f".into());
        args.push("bestaudio[ext!=mp3]/bestaudio".into());
    }
    args.push("--audio-format".into());
    args.push(options.output_format.clone());
    args.push("--audio-quality".into());
    args.push(format!("{}K", bitrate));
    args.push("--remote-components".into());
    args.push("ejs:github".into());
    args.push("--newline".into());
    args.push("--no-warnings".into());
    if let Some(ffmpeg) = &ffmpeg_path {
        args.push("--ffmpeg-location".into());
        args.push(ffmpeg.clone());
    }
    if let Some(sr) = options.sample_rate {
        args.push("--postprocessor-args".into());
        args.push(format!("ExtractAudio:-ar {}", sr));
    }
    args.push("-o".into());
    args.push(output_template);
    args.push(options.url.clone());

    let cmd = ytdlp_command(&app)?;
    let (mut rx, child) = cmd.args(&args).spawn().map_err(|e| e.to_string())?;

    {
        let mut registry = jobs.0.lock().map_err(|_| "job registry lock error")?;
        registry.insert(options.job_id.clone(), child);
    }

    let job_id = options.job_id.clone();
    let mut success = false;
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(bytes) => {
                let line = String::from_utf8_lossy(&bytes);
                for part in line.lines() {
                    if let Some(percent) = parse_ytdlp_percent(part) {
                        let _ = app.emit(
                            "download://progress",
                            DownloadProgressPayload {
                                job_id: job_id.clone(),
                                percent,
                                status: "running".into(),
                            },
                        );
                    }
                }
            }
            CommandEvent::Terminated(payload) => {
                success = payload.code == Some(0);
            }
            _ => {}
        }
    }

    {
        let mut registry = jobs.0.lock().map_err(|_| "job registry lock error")?;
        if registry.remove(&options.job_id).is_none() && !success {
            return Err("download werd geannuleerd".into());
        }
    }

    if success {
        let _ = app.emit(
            "download://progress",
            DownloadProgressPayload {
                job_id: options.job_id.clone(),
                percent: 100.0,
                status: "done".into(),
            },
        );
        Ok(output_path)
    } else {
        let _ = app.emit(
            "download://progress",
            DownloadProgressPayload {
                job_id: options.job_id.clone(),
                percent: 0.0,
                status: "error".into(),
            },
        );
        Err("download mislukt".into())
    }
}

#[derive(Serialize, Clone)]
struct DownloadProgressPayload {
    job_id: String,
    percent: f32,
    status: String,
}

/// Parses a line like "[download]  42.3% of 3.45MiB at 1.2MiB/s ETA 00:05"
/// into 42.3.
fn parse_ytdlp_percent(line: &str) -> Option<f32> {
    let line = line.trim();
    if !line.starts_with("[download]") {
        return None;
    }
    let percent_str = line.split_whitespace().find(|s| s.ends_with('%'))?;
    percent_str.trim_end_matches('%').parse::<f32>().ok()
}
