"""Emit a character -> Jyutping readings map for grading spoken answers.

    python3 scripts/build_readings.py <path-to-cc-canto-data>

Speech recognition returns characters, never Jyutping. To say anything about how
close a spoken answer was, the app has to romanise what it heard and compare that
against the target reading — which needs readings for characters well beyond the
247-word curriculum, since a mispronounced tone is transcribed as some other word
entirely.

Every reading a character is attested with is kept, not just the commonest: a
syllable counts as matched if any of its readings matches, so a polyphone is never
marked wrong for a reading it genuinely has.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from parse_dict import load_index  # noqa: E402

OUT_PATH = Path(__file__).resolve().parent.parent / "app" / "data" / "readings.json"


def main(data_dir: Path) -> int:
    index = load_index(data_dir)

    readings: dict[str, list[str]] = {}
    for headword, entries in index.items():
        if len(headword) != 1:
            continue
        seen: list[str] = []
        for entry in entries:
            # Single characters are single syllables; anything else is a bad parse.
            if " " in entry.jyutping or entry.jyutping in seen:
                continue
            seen.append(entry.jyutping)
        if seen:
            readings[headword] = seen

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(readings, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    total = sum(len(v) for v in readings.values())
    size = OUT_PATH.stat().st_size
    print(
        f"[readings] {len(readings)} characters, {total} readings, "
        f"{size // 1024}KB -> {OUT_PATH.name}"
    )
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: build_readings.py <path-to-cc-canto-data>")
    sys.exit(main(Path(sys.argv[1])))
