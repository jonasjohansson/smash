#!/usr/bin/env bash
# Rebuild the web reel from the landing cut with FFmpeg (libx264 + libsvtav1).
# Usage: bash scripts/encode-reel.sh /path/to/SMASH_Showreel_WebsiteLanding.mp4
set -euo pipefail

master=${1:?Pass the path to the landing master}
output="$(cd "$(dirname "$0")/.." && pwd)/src/reel"
scratch=$(mktemp -d "${TMPDIR:-/tmp}/smash-reel.XXXXXX")
trap 'rm -rf "$scratch"' EXIT

# Preserve the edit and frame rate at Full HD. Retain source audio if present,
# and put the MP4 index first so playback can start early. The supplied landing
# cut is silent; the longer masters are different edits, so their soundtracks
# cannot be transferred with a single trim or offset.
common=(-hide_banner -loglevel warning -nostats -i "$master"
  -map 0:v:0 -map '0:a:0?' -vf scale=1920:1080:flags=lanczos
  -g 50 -c:a aac -b:a 160k -map_metadata -1 -movflags +faststart)

# Broad browser fallback, with bitrate peaks bounded for progressive playback.
ffmpeg "${common[@]}" -c:v libx264 -preset slow -crf 23 \
  -profile:v high -level:v 4.1 -pix_fmt yuv420p -threads 6 \
  -maxrate 5000k -bufsize 10000k "$scratch/showreel-landing.mp4"

# Preferred source: smaller at comparable visual quality, with 10-bit encoding
# to keep gradients clean. Browsers without AV1 support use the H.264 source.
ffmpeg "${common[@]}" -c:v libsvtav1 -preset 6 -crf 32 \
  -pix_fmt yuv420p10le -svtav1-params tune=0:lp=4 \
  "$scratch/showreel-landing-av1.mp4"

mkdir -p "$output"
mv "$scratch/showreel-landing.mp4" "$scratch/showreel-landing-av1.mp4" "$output/"
