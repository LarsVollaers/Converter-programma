<!-- 

1. zorg ervoor dat claude code 1 keer iets heeft gedaan.
2. run "rtk init -g"                (https://github.com/rtk-ai/rtk#windows)
3. Install tokensave                (https://tokensave.dev/)

# Install tokensave
cargo install tokensave
 
# Register with your AI agent (once)
tokensave install
 
# Index your project (once per folder)
cd your-project && tokensave init


Project naam: Converter
Metadata naam: Converter


Schijf hier je plan uit voor je project

 -->

Converter moet verschillende audio en video bestanden kunnen omzetten naar andere bestanden.

video -> audio
mkv, m4a, mov, mp4 -> mp3 , wav, flac

je wil audio settings hebben: de kbps (128, 192, 320), sample rate, cd 44.1 kHz, radio 22.05 kHz, professional 48kHz. Bitrate.

het moet werken voor windows, linux, macOs, visueel strak en duidelijk design en ui. drag en drop, bestanden history, openen in exporer knop, 

[x] instellingen onhouden bij opnieuw openen
[x] portable versie van maken
[x] installeer wat nodig is bij de portable.
[x] uitleg (vraagteken icoon bij labes met een tooltip) uitvoerformaat, bitrate, samplerate, uitvoermap. alsof je tegen een kind van 15 het uitlegt.

[x] meer video bestanden ondersteunen, als dit mogelijk is.

[x] hanteer de vollaers.nl styling.

[x] een naam kunnen geven aan het bestand.

[x] macOS build via GitHub Actions (.github/workflows/build-macos.yml) — repo naar GitHub pushen en workflow draaien om .app/.dmg te krijgen.
