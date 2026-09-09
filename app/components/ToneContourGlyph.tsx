import { TONE_INFO } from "../lib/tone";
import type { Tone } from "../lib/types";

/** Chao pitch level (1 low - 5 high) to a y coordinate in the 16-unit viewBox. */
function pitchY(pitch: number): number {
  return 17 - 3 * pitch;
}

export function ToneContourGlyph({
  tone,
  className = "",
}: {
  tone: Tone;
  className?: string;
}) {
  const info = TONE_INFO[tone];
  return (
    <svg
      viewBox="0 0 20 16"
      className={`inline-block h-4 w-5 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <line
        x1="2"
        y1={pitchY(info.pitchStart)}
        x2="18"
        y2={pitchY(info.pitchEnd)}
        stroke={info.hex}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
