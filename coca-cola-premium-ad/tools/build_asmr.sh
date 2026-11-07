#!/usr/bin/env bash
# Vertical 9:16 cinematic ASMR cut: 1080x1920, 25 fps, 15 s.
set -euo pipefail
cd "$(dirname "$0")/.."
SUB="${SUB:-4}"
mkdir -p out
python3 audio/sound_asmr.py out/soundtrack_asmr.wav
NODE_PATH="$(npm root -g)" node tools/render.cjs --edit asmr --video --sub "$SUB" --crf 14 --out frames_asmr.mp4
ffmpeg -y -loglevel error -i out/frames_asmr.mp4 -i out/soundtrack_asmr.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slower -crf 18 -tune film -profile:v high -level 4.2 -maxrate 22M -bufsize 44M -pix_fmt yuv420p \
  -c:a aac -b:a 256k -shortest -movflags +faststart out/coca-cola-cinematic-asmr-9x16.mp4
echo "done -> out/coca-cola-cinematic-asmr-9x16.mp4"
