# Converter

Desktop app (Windows, Linux, macOS) met twee tabbladen:

- **Converter** — video- en audiobestanden omzetten naar MP3, WAV of FLAC
  (met `ffmpeg`)
- **Downloaden** — zoeken op YouTube/SoundCloud (of een profiel-/kanaal-URL
  plakken voor hun feed), voorluisteren, en audio downloaden naar dezelfde
  uitvoermap (met `yt-dlp`)

Gebouwd met Tauri 2 + React + TypeScript.

> **Alleen voor eigen gebruik.** De Downloaden-tab is bedoeld voor persoonlijk
> gebruik binnen de voorwaarden van het platform waar je van downloadt.
> Spotify wordt bewust niet ondersteund.

## Vereisten

- Node.js + npm
- Rust toolchain (`cargo`)

### ffmpeg

**Windows (portable):** ffmpeg zit ingebakken in `converter.exe` zelf — één
los bestand, niets te installeren. Bij de eerste start wordt ffmpeg
uitgepakt naar een tijdelijke map; daarna gebruikt elke start dezelfde
uitgepakte kopie. Zie [Embedded ffmpeg](#embedded-ffmpeg-windows) hieronder
om `src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe` op te zetten
(eenmalig, niet in git — die bestaat alleen om in de exe te bakken).

**macOS/Linux:** er is (nog) geen embedded binary voor deze platforms. De app
valt terug op een systeem-`ffmpeg` in PATH:

- macOS: `brew install ffmpeg`
- Linux: `sudo apt install ffmpeg` (of het equivalent van je distro)

Wil je ook hier een portable single-file build, voeg dan een eigen
`#[cfg(target_os = "...")]`-blok + `include_bytes!` toe in
`src-tauri/src/converter.rs` (zie hoe dat voor Windows is gedaan) met een
ffmpeg-binary voor dat platform.

De app toont een waarschuwing bovenaan als er helemaal geen ffmpeg
(ingebakken of in PATH) gevonden wordt.

## Embedded ffmpeg (Windows)

`src-tauri/binaries/` staat in `.gitignore` — de binary (~100MB) hoort niet in
git, maar moet wel lokaal aanwezig zijn om te compileren (hij wordt met
`include_bytes!` in de Rust-broncode ingebakken). Eenmalig ophalen:

```powershell
# Download de "essentials" static build (gyan.dev)
Invoke-WebRequest -Uri "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -OutFile "$env:TEMP\ffmpeg.zip"
Expand-Archive -Path "$env:TEMP\ffmpeg.zip" -DestinationPath "$env:TEMP\ffmpeg-extract" -Force
New-Item -ItemType Directory -Force -Path "src-tauri\binaries" | Out-Null
Copy-Item (Get-ChildItem "$env:TEMP\ffmpeg-extract" -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1 -ExpandProperty FullName) `
  "src-tauri\binaries\ffmpeg-x86_64-pc-windows-msvc.exe"
```

> **Licentie:** deze static build is GPL-licensed (bevat libx264/libx265 e.d.).
> Als je de app verspreidt met deze ffmpeg erin, gelden de GPL-voorwaarden
> (o.a. broncode-beschikbaarheid) voor die binary. Voor puur persoonlijk
> gebruik is dit meestal geen probleem, maar hou er rekening mee bij publieke
> distributie.

### yt-dlp (Downloaden-tab)

Zelfde aanpak als ffmpeg: ingebakken op Windows, systeem-`yt-dlp` in PATH als
fallback op macOS/Linux. Eenmalig ophalen:

```powershell
Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" `
  -OutFile "src-tauri\binaries\yt-dlp-x86_64-pc-windows-msvc.exe"
```

> **yt-dlp veroudert sneller dan ffmpeg.** YouTube/SoundCloud passen
> regelmatig dingen aan waar yt-dlp achteraan moet; een ingebakken versie kan
> na verloop van tijd stoppen met werken. Haal dan gewoon de nieuwste
> `yt-dlp.exe` opnieuw op met bovenstaand commando en bouw opnieuw. yt-dlp is
> Unlicense (public domain) — geen extra licentie-verplichtingen zoals bij
> ffmpeg.
>
> **Bekende beperking:** sommige SoundCloud-tracks (met name officiële
> label-previews) bieden alleen een korte preview-stream aan in plaats van
> het volledige nummer — dat is een beperking van SoundCloud zelf, niet van
> deze app.

## Ontwikkelen

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

Voor de portable single-file build (geen installer, geen tweede bestand):

```bash
npm run tauri build -- --no-bundle
```

Het resultaat is één bestand: `src-tauri/target/release/converter.exe`
(~105MB, ffmpeg zit erin). Kopieer alleen dat bestand naar een andere map of
USB-stick — het werkt direct, zonder installatie of PATH-afhankelijkheid.
Bij de eerste start pakt de app ffmpeg zelf uit naar
`%TEMP%\converter-app\`.

## macOS-build via GitHub Actions

Tauri kan niet vanaf Windows voor macOS cross-compilen (de GUI-laag heeft een
echte Mac nodig). `.github/workflows/build-macos.yml` bouwt de app daarom op
een macOS-runner in de cloud, voor zowel Apple Silicon (`aarch64-apple-darwin`)
als Intel (`x86_64-apple-darwin`):

1. Push deze repo naar GitHub (als dat nog niet zo is).
2. Ga naar het tabblad **Actions** → **Build macOS** → **Run workflow**
   (of gewoon pushen naar `main`/`master`, dat triggert hem ook automatisch).
3. Als de run klaar is, staan de `.app`/`.dmg`-bestanden als
   **build-artifact** onderaan de workflow-run, per architectuur — downloaden
   en uitpakken.

Op macOS gebruikt de app systeem-ffmpeg (niet ingebakken, zoals bij Windows):

```bash
brew install ffmpeg
```

> **Gatekeeper:** de build is niet Apple-signed/notarized, dus macOS
> waarschuwt bij de eerste keer openen ("app is beschadigd" / "kan niet
> worden geopend"). Klik met rechts op de app → **Open** → **Open** (in
> plaats van dubbelklikken), of run eenmalig in Terminal:
> `xattr -cr /pad/naar/Converter.app`

## Functionaliteit

- Drag & drop of bestandskiezer voor invoer (video: MKV, MP4, MOV, AVI, WMV,
  FLV, WebM, M4V, MPG/MPEG, TS, M2TS, 3GP, OGV; audio: M4A, AAC, WMA, OGG,
  OPUS, AIFF, AMR, WAV, MP3, FLAC)
- Uitvoerformaten: MP3, WAV, FLAC
- Instelbare bitrate (128/192/320 kbps) voor MP3
- Instelbare sample rate (22.05 kHz radio, 44.1 kHz cd, 48 kHz professional)
- Eigen bestandsnaam per uitvoerbestand
- Uitleg-tooltips (?) bij elke instelling
- Instellingen en uitvoermap worden onthouden bij herstart
- Wachtrij met voortgang per bestand
- Geschiedenis van eerdere conversies (lokaal opgeslagen)
- "Open map"-knop om het resultaat direct in de bestandsverkenner te tonen
- Portable single-file Windows-build met ffmpeg ingebakken (geen installatie,
  geen los bestand nodig)

**Downloaden-tab:**

- Zoeken op YouTube of SoundCloud, of een profiel-/kanaal-URL plakken voor
  hun feed
- Resultaten gegroepeerd op jaar/maand/dag, filter op duur (alles / < 10 min
  / ≥ 10 min)
- Zoekresultaten gecached voor snelheid, met "Vernieuwen"-knop
- In-app voorluisteren
- Downloaden gebruikt dezelfde instellingen (formaat/bitrate/sample rate) en
  uitvoermap als de Converter-tab
- Aparte downloadgeschiedenis met "open map"-knop
