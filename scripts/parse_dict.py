"""Parse CC-Canto / CC-CEDICT-Cantonese dumps into one map keyed by traditional form.

Data source: https://github.com/amadeusine/cc-canto-data (cantonese.org itself is
blocked by the sandbox egress proxy). Both files share the line format

    Traditional Simplified [pinyin] {jyutping} /gloss1/gloss2/

with the gloss section absent in cccedict-canto-readings.txt.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

LINE_RE = re.compile(
    r"^(?P<trad>\S+)\s+(?P<simp>\S+)\s+\[(?P<pinyin>[^\]]*)\]\s+\{(?P<jyut>[^}]*)\}"
    r"(?:\s*/(?P<gloss>.*)/)?(?:\s*#.*)?\s*$"
)
JYUTPING_RE = re.compile(r"^(?:[a-z]+[1-6])(?:\s+[a-z]+[1-6])*$")

DATA_FILES = ("cccanto-webdist.txt", "cccedict-canto-readings.txt")


@dataclass
class Entry:
    traditional: str
    simplified: str
    jyutping: str
    glosses: list[str] = field(default_factory=list)


def _normalise_jyutping(raw: str) -> str | None:
    """Return a clean space-separated Jyutping string, or None if unusable."""
    cleaned = " ".join(raw.lower().replace(",", " ").split())
    return cleaned if JYUTPING_RE.match(cleaned) else None


def parse_file(path: Path, index: dict[str, list[Entry]]) -> int:
    kept = 0
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            line = line.rstrip("\n")
            if not line or line.startswith("#"):
                continue
            match = LINE_RE.match(line)
            if not match:
                continue
            jyutping = _normalise_jyutping(match["jyut"])
            if jyutping is None:
                continue
            glosses = [g.strip() for g in (match["gloss"] or "").split("/") if g.strip()]
            index.setdefault(match["trad"], []).append(
                Entry(match["trad"], match["simp"], jyutping, glosses)
            )
            kept += 1
    return kept


def load_index(data_dir: Path) -> dict[str, list[Entry]]:
    index: dict[str, list[Entry]] = {}
    for name in DATA_FILES:
        path = data_dir / name
        if not path.exists():
            raise FileNotFoundError(
                f"{path} not found. Clone https://github.com/amadeusine/cc-canto-data first."
            )
        kept = parse_file(path, index)
        print(f"[dict] {name}: {kept} usable entries")
    # Polyphones list several readings for one headword. Rank by how many times the
    # corpus attests each reading (a proxy for the dominant one), then prefer the
    # glossed entry, so lookups get the everyday reading rather than a rare sense.
    for entries in index.values():
        counts: dict[str, int] = {}
        for entry in entries:
            counts[entry.jyutping] = counts.get(entry.jyutping, 0) + 1
        entries.sort(key=lambda e: (-counts[e.jyutping], not e.glosses, e.jyutping))
    print(f"[dict] {len(index)} distinct traditional headwords")
    return index


if __name__ == "__main__":
    import sys

    load_index(Path(sys.argv[1]))
