use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

use crate::util::{extract_embedded_binary, sanitize_filename, unique_output_path};

/// ffmpeg is embedded directly into this binary so the app is a single
/// portable .exe with no loose files or installation required.
#[cfg(target_os = "windows")]
static FFMPEG_BYTES: &[u8] = include_bytes!("../binaries/ffmpeg-x86_64-pc-windows-msvc.exe");

pub static EXTRACTED_FFMPEG: OnceLock<Result<PathBuf, String>> = OnceLock::new();

#[cfg(target_os = "windows")]
pub fn extract_embedded_ffmpeg() -> Result<PathBuf, String> {
    extract_embedded_binary(FFMPEG_BYTES, "ffmpeg")
}

#[cfg(not(target_os = "windows"))]
pub fn extract_embedded_ffmpeg() -> Result<PathBuf, String> {
    Err("geen ingebakken ffmpeg voor dit platform".to_string())
}

pub struct JobRegistry(pub Mutex<HashMap<String, CommandChild>>);

impl Default for JobRegistry {
    fn default() -> Self {
        JobRegistry(Mutex::new(HashMap::new()))
    }
}

#[derive(Serialize, Clone)]
pub struct ProgressPayload {
    pub job_id: String,
    pub percent: f32,
    pub status: String,
}

#[derive(Deserialize)]
pub struct ConvertOptions {
    pub job_id: String,
    pub input_path: String,
    pub output_dir: String,
    pub output_format: String, // mp3 | wav | flac
    pub bitrate_kbps: Option<u32>,
    pub sample_rate: Option<u32>, // 44100 | 22050 | 48000
    pub output_name: Option<String>,
}

/// Rough worst-case estimate of the output file size, used only to decide
/// whether there's plausibly enough free disk space before starting.
fn estimate_output_bytes(
    format: &str,
    duration_secs: Option<f64>,
    bitrate_kbps: Option<u32>,
    sample_rate: Option<u32>,
) -> u64 {
    let Some(duration) = duration_secs else {
        return 0;
    };
    let bytes = match format {
        "mp3" => {
            let kbps = bitrate_kbps.unwrap_or(192) as f64;
            duration * kbps * 1000.0 / 8.0
        }
        // Uncompressed 16-bit stereo PCM; FLAC uses the same figure as a
        // safe over-estimate (it's usually smaller than WAV).
        "wav" | "flac" => {
            let sr = sample_rate.unwrap_or(44100) as f64;
            duration * sr * 2.0 * 2.0
        }
        _ => 0.0,
    };
    // 20% safety margin for container overhead / estimate error.
    (bytes * 1.2) as u64
}

/// The embedded ffmpeg (extracted to a temp file once) is tried first;
/// falls back to a system-installed ffmpeg on PATH for platforms without an
/// embedded binary (macOS/Linux).
fn ffmpeg_command(app: &AppHandle) -> Result<tauri_plugin_shell::process::Command, String> {
    if let Ok(path) = EXTRACTED_FFMPEG.get_or_init(extract_embedded_ffmpeg) {
        return Ok(app.shell().command(path));
    }
    which::which("ffmpeg")
        .map(|path| app.shell().command(path))
        .map_err(|_| {
            "ffmpeg niet gevonden (niet gebundeld en niet in PATH).".to_string()
        })
}

#[tauri::command]
pub async fn check_ffmpeg(app: AppHandle) -> Result<String, String> {
    let cmd = ffmpeg_command(&app)?;
    let output = cmd
        .args(["-version"])
        .output()
        .await
        .map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&output.stdout);
    Ok(text.lines().next().unwrap_or("ffmpeg").to_string())
}

async fn probe_duration_seconds(app: &AppHandle, input_path: &str) -> Option<f64> {
    let cmd = ffmpeg_command(app).ok()?;
    let output = cmd.args(["-i", input_path]).output().await.ok()?;
    let stderr = String::from_utf8_lossy(&output.stderr);
    for line in stderr.lines() {
        let line = line.trim();
        if let Some(rest) = line.strip_prefix("Duration:") {
            let time_str = rest.split(',').next()?.trim();
            return parse_ffmpeg_time(time_str);
        }
    }
    None
}

fn parse_ffmpeg_time(time_str: &str) -> Option<f64> {
    // format HH:MM:SS.xx
    let parts: Vec<&str> = time_str.split(':').collect();
    if parts.len() != 3 {
        return None;
    }
    let hours: f64 = parts[0].parse().ok()?;
    let minutes: f64 = parts[1].parse().ok()?;
    let seconds: f64 = parts[2].parse().ok()?;
    Some(hours * 3600.0 + minutes * 60.0 + seconds)
}

fn codec_args(format: &str, bitrate_kbps: Option<u32>, sample_rate: Option<u32>) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();
    match format {
        "mp3" => {
            args.push("-codec:a".into());
            args.push("libmp3lame".into());
            let br = bitrate_kbps.unwrap_or(192);
            args.push("-b:a".into());
            args.push(format!("{}k", br));
        }
        "wav" => {
            args.push("-codec:a".into());
            args.push("pcm_s16le".into());
        }
        "flac" => {
            args.push("-codec:a".into());
            args.push("flac".into());
        }
        _ => {}
    }
    if let Some(sr) = sample_rate {
        args.push("-ar".into());
        args.push(sr.to_string());
    }
    args
}

#[tauri::command]
pub async fn convert_file(
    app: AppHandle,
    jobs: State<'_, JobRegistry>,
    options: ConvertOptions,
) -> Result<String, String> {
    let input_path = options.input_path.clone();
    let stem = match &options.output_name {
        Some(name) if !name.trim().is_empty() => sanitize_filename(name),
        _ => std::path::Path::new(&input_path)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("output")
            .to_string(),
    };
    let output_path = unique_output_path(&options.output_dir, &stem, &options.output_format);

    let duration = probe_duration_seconds(&app, &input_path).await;

    if let Ok(available) = fs4::available_space(&options.output_dir) {
        let needed = estimate_output_bytes(
            &options.output_format,
            duration,
            options.bitrate_kbps,
            options.sample_rate,
        );
        if needed > 0 && available < needed {
            let needed_mb = needed / 1_000_000;
            let available_mb = available / 1_000_000;
            return Err(format!(
                "Onvoldoende schijfruimte in de uitvoermap: ~{} MB nodig, {} MB beschikbaar.",
                needed_mb, available_mb
            ));
        }
    }

    let mut args: Vec<String> = vec!["-y".into(), "-i".into(), input_path.clone(), "-vn".into()];
    args.extend(codec_args(
        &options.output_format,
        options.bitrate_kbps,
        options.sample_rate,
    ));
    args.push("-progress".into());
    args.push("pipe:2".into());
    args.push(output_path.clone());

    let cmd = ffmpeg_command(&app)?;
    let (mut rx, child) = cmd.args(&args).spawn().map_err(|e| e.to_string())?;

    {
        let mut registry = jobs.0.lock().map_err(|_| "job registry lock error")?;
        registry.insert(options.job_id.clone(), child);
    }

    let job_id = options.job_id.clone();
    let mut success = false;
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stderr(bytes) => {
                let line = String::from_utf8_lossy(&bytes);
                for part in line.lines() {
                    if let Some(rest) = part.trim().strip_prefix("out_time_ms=") {
                        if let (Some(dur), Ok(us)) = (duration, rest.trim().parse::<i64>()) {
                            let current_seconds = (us as f64) / 1_000_000.0;
                            let percent =
                                ((current_seconds / dur) * 100.0).clamp(0.0, 100.0) as f32;
                            let _ = app.emit(
                                "convert://progress",
                                ProgressPayload {
                                    job_id: job_id.clone(),
                                    percent,
                                    status: "running".into(),
                                },
                            );
                        }
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
            return Err("job werd geannuleerd".into());
        }
    }

    if success {
        let _ = app.emit(
            "convert://progress",
            ProgressPayload {
                job_id: options.job_id.clone(),
                percent: 100.0,
                status: "done".into(),
            },
        );
        Ok(output_path)
    } else {
        let _ = app.emit(
            "convert://progress",
            ProgressPayload {
                job_id: options.job_id.clone(),
                percent: 0.0,
                status: "error".into(),
            },
        );
        Err("ffmpeg conversie mislukt".into())
    }
}

#[tauri::command]
pub fn cancel_job(jobs: State<'_, JobRegistry>, job_id: String) -> Result<(), String> {
    let mut registry = jobs.0.lock().map_err(|_| "job registry lock error")?;
    if let Some(child) = registry.remove(&job_id) {
        child.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}
