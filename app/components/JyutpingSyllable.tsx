import { ToneContourGlyph } from "./ToneContourGlyph";
import { TONE_INFO } from "../lib/tone";
import type { Syllable } from "../lib/types";

export function JyutpingSyllable({
  syllable,
  showGlyph = true,
  flagged = false,
  className = "",
}: {
  syllable: Syllable;
  showGlyph?: boolean;
  /** Marks a syllable the learner got the tone wrong on. */
  flagged?: boolean;
  className?: string;
}) {
  if (syllable.tone === null) {
    return <span className={`text-slate-500 ${className}`}>{syllable.text}</span>;
  }

  const info = TONE_INFO[syllable.tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 ${info.bg} ${
        flagged ? "border-dashed border-slate-400 dark:border-slate-500" : info.border
      } ${className}`}
      title={`${info.name} — ${info.contour}`}
    >
      <span className={`font-medium tabular-nums ${info.text}`}>{syllable.text}</span>
      {showGlyph ? <ToneContourGlyph tone={syllable.tone} /> : null}
    </span>
  );
}
