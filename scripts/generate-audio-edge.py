#!/usr/bin/env python3
"""Render the vocabulary with Microsoft Edge's neural Cantonese voices.

Run this on your own machine — the endpoint is blocked from the build sandbox:

    pip install edge-tts
    python3 scripts/generate-audio-edge.py
    git add public/audio && git commit -m "Regenerate audio" && git push

Output lands in public/audio/<id>.mp3 and is committed, so no deploy, build or
runtime ever needs credentials. Existing clips are skipped unless --force.

Trade-off worth knowing: espeak-ng reads our Jyutping directly, tone numbers and
all, so its audio provably matches the reading the app displays. A neural voice
reads the *characters* and chooses its own reading, so for the polyphones pinned
in scripts/curriculum.py (行 haang4, 平 peng4, 魚 jyu4, 大 daai6, 佢 keoi5,
嬲 nau1, 驚 geng1, 靚 leng3) it is worth listening once to confirm the voice says
what the app claims. --only lets you regenerate just those.

Options:
  --force           overwrite clips that already exist
  --voice NAME      default zh-HK-HiuMaanNeural
  --rate RATE       speaking rate, default -15% (slower, for dictation)
  --only ID[,ID..]  restrict to specific word ids, e.g. --only L2-044,L3-023
  --no-pad          skip the leading silence
  --list-voices     print the available Cantonese voices and exit
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

try:
    import edge_tts
except ImportError:
    sys.exit("edge-tts is not installed. Run: pip install edge-tts")

ROOT = Path(__file__).resolve().parent.parent
VOCAB_PATH = ROOT / "app" / "data" / "vocab.json"
OUT_DIR = ROOT / "public" / "audio"

DEFAULT_VOICE = "zh-HK-HiuMaanNeural"
DEFAULT_RATE = "-15%"
LEAD_IN_MS = 300


def silent_mp3(milliseconds: int) -> bytes:
    """Build silent MPEG-2 Layer III frames matching edge-tts output (24kHz mono).

    Phone audio hardware takes 100-300ms to wake on the first play and swallows
    whatever is sounding, which clips the opening syllable. Prepending real silence
    is the fix; building the frames here avoids depending on ffmpeg.

    Header bits: sync (11), MPEG-2 (10), Layer III (01), no CRC (1),
    48kbps (0110), 24000Hz (01), no padding, mono (11). Layer III frames whose
    main data is all zero decode to silence.
    """
    header = bytes([0xFF, 0xF3, 0x64, 0xC0])
    frame = header + bytes(140)  # 72 * 48000 / 24000 = 144 bytes per frame
    per_frame_ms = 576 / 24000 * 1000  # 24ms
    return frame * max(1, round(milliseconds / per_frame_ms))


async def list_voices() -> None:
    voices = await edge_tts.list_voices()
    for voice in sorted(voices, key=lambda v: v["ShortName"]):
        if voice["Locale"].lower() in ("zh-hk", "yue-cn"):
            print(f"  {voice['ShortName']:<28} {voice['Gender']}")


async def synthesise(text: str, voice: str, rate: str) -> bytes:
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    audio = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
    return bytes(audio)


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--voice", default=DEFAULT_VOICE)
    parser.add_argument("--rate", default=DEFAULT_RATE)
    parser.add_argument("--only", default="")
    parser.add_argument("--no-pad", action="store_true")
    parser.add_argument("--list-voices", action="store_true")
    args = parser.parse_args()

    if args.list_voices:
        await list_voices()
        return 0

    vocab = json.loads(VOCAB_PATH.read_text(encoding="utf-8"))
    words = vocab["words"]
    if args.only:
        wanted = {w.strip() for w in args.only.split(",") if w.strip()}
        words = [w for w in words if w["id"] in wanted]
        missing = wanted - {w["id"] for w in words}
        if missing:
            print(f"[edge-tts] unknown ids ignored: {', '.join(sorted(missing))}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    padding = b"" if args.no_pad else silent_mp3(LEAD_IN_MS)

    written = skipped = 0
    failures: list[str] = []

    for index, word in enumerate(words, start=1):
        out_path = OUT_DIR / f"{word['id']}.mp3"
        if out_path.exists() and not args.force:
            skipped += 1
            continue
        try:
            audio = await synthesise(word["traditional"], args.voice, args.rate)
            if len(audio) < 256:
                raise RuntimeError(f"suspiciously small ({len(audio)} bytes)")
            out_path.write_bytes(padding + audio)
            written += 1
        except Exception as error:  # noqa: BLE001 - report and carry on
            failures.append(f"{word['id']} ({word['traditional']}): {error}")
        if index % 25 == 0:
            print(f"[edge-tts] {index}/{len(words)}…", flush=True)

    for failure in failures:
        print(f"[edge-tts] failed {failure}")
    print(
        f"[edge-tts] {written} written, {skipped} already present, "
        f"{len(failures)} failed (of {len(words)}, voice {args.voice})"
    )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
