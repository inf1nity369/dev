#!/usr/bin/env bash
# Full pipeline: picture (1080p, 5 motion-blur sub-frames) + synthesized sound -> final MP4.
set -euo pipefail
cd "$(dirname "$0")/.."
SUB="${SUB:-5}"
mkdir -p out
python3 audio/sound.py out/soundtrack.wav
NODE_PATH="$(npm root -g)" node tools/render.cjs --video --sub "$SUB" --out frames_1080p.mp4
ffmpeg -y -loglevel error -i out/frames_1080p.mp4 -i out/soundtrack.wav \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart \
  out/coca-cola-ice-cold-spec-ad.mp4
echo "done -> out/coca-cola-ice-cold-spec-ad.mp4"
