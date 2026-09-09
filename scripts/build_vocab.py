"""Join the hand-picked curriculum against CC-Canto and emit app/data/vocab.json.

Run:  python3 scripts/build_vocab.py <path-to-cc-canto-data>

Every Jyutping reading in the output comes from the dictionary. Entries the
dictionary does not know are reported as misses so they can be swapped for a real
word rather than having a reading invented for them.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from curriculum import CURRICULUM, LEVEL_DESCRIPTIONS, LEVEL_NAMES  # noqa: E402
from parse_dict import load_index  # noqa: E402

JYUTPING_RE = re.compile(r"^(?:[a-z]+[1-6])(?:\s+[a-z]+[1-6])*$")
OUT_PATH = Path(__file__).resolve().parent.parent / "app" / "data" / "vocab.json"

EXPECTED_COUNTS = {1: 40, 2: 50, 3: 50, 4: 43, 5: 36, 6: 28}


def segment_readings(text: str, index) -> str | None:
    """Compose a reading for a multi-word phrase from dictionary-attested chunks.

    Longest-match-first over the phrase. Only used for phrases the dictionary has
    no headword for; each chunk's reading is still dictionary-sourced.
    """
    parts: list[str] = []
    i = 0
    while i < len(text):
        for span in range(min(4, len(text) - i), 0, -1):
            chunk = text[i : i + span]
            entries = index.get(chunk)
            if entries:
                parts.append(entries[0].jyutping)
                i += span
                break
        else:
            return None
    return " ".join(parts)


def main(data_dir: Path) -> int:
    index = load_index(data_dir)

    records = []
    misses: list[tuple[int, str, str]] = []
    composed: list[tuple[str, str]] = []
    per_level_seq: dict[int, int] = {}

    for row in CURRICULUM:
        level, category, traditional, english = row[:4]
        pinned = row[4] if len(row) > 4 else None
        entries = index.get(traditional)
        if entries and pinned:
            # A pinned reading selects among the dictionary's own readings for a
            # polyphone; it is verified against them, never invented.
            match = next((e for e in entries if e.jyutping == pinned), None)
            if match is None:
                attested = sorted({e.jyutping for e in entries})
                misses.append((level, traditional, f"pinned {pinned!r} not in {attested}"))
                continue
            jyutping, simplified = match.jyutping, match.simplified
        elif entries:
            entry = entries[0]
            jyutping, simplified = entry.jyutping, entry.simplified
        else:
            jyutping = segment_readings(traditional, index)
            if jyutping is None:
                misses.append((level, traditional, english))
                continue
            simplified = traditional
            composed.append((traditional, jyutping))

        if not JYUTPING_RE.match(jyutping):
            misses.append((level, traditional, f"bad reading: {jyutping}"))
            continue

        per_level_seq[level] = per_level_seq.get(level, 0) + 1
        records.append(
            {
                "id": f"L{level}-{per_level_seq[level]:03d}",
                "level": level,
                "levelName": LEVEL_NAMES[level],
                "category": category,
                "traditional": traditional,
                "simplified": simplified,
                "jyutping": jyutping,
                "english": english,
            }
        )

    if composed:
        print(f"\n[vocab] {len(composed)} phrase(s) composed from dictionary chunks:")
        for traditional, jyutping in composed:
            print(f"  {traditional}  ->  {jyutping}")

    if misses:
        print(f"\n[vocab] {len(misses)} MISSING from the dictionary — swap these out:")
        for level, traditional, english in misses:
            print(f"  L{level}  {traditional}  ({english})")
        return 1

    counts = {level: 0 for level in EXPECTED_COUNTS}
    for record in records:
        counts[record["level"]] += 1
    if counts != EXPECTED_COUNTS:
        print(f"\n[vocab] level counts {counts} != expected {EXPECTED_COUNTS}")
        return 1

    payload = {
        "levels": [
            {
                "level": level,
                "name": LEVEL_NAMES[level],
                "description": LEVEL_DESCRIPTIONS[level],
                "count": counts[level],
            }
            for level in sorted(LEVEL_NAMES)
        ],
        "words": records,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    categories = {record["category"] for record in records}
    print(
        f"\n[vocab] wrote {len(records)} entries across {len(counts)} levels "
        f"and {len(categories)} categories to {OUT_PATH.relative_to(OUT_PATH.parents[2])}"
    )
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: build_vocab.py <path-to-cc-canto-data>")
    sys.exit(main(Path(sys.argv[1])))
