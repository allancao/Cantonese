import type { Syllable, Tone } from "./types";

/**
 * Cantonese is tonal and has no English-style lexical stress, so what a learner
 * needs marked is the tone of every syllable — not which syllable to stress.
 * Every syllable is colour-coded by tone and carries a pitch-contour glyph.
 *
 * Pitch levels run 1 (low) to 5 (high), the standard Chao tone-letter scale.
 */
export interface ToneInfo {
  tone: Tone;
  name: string;
  contour: string;
  arrow: string;
  pitchStart: number;
  pitchEnd: number;
  /** Tailwind classes; literals so the content scan keeps them in the build. */
  text: string;
  bg: string;
  border: string;
  /** Raw colour for inline SVG, which cannot use Tailwind classes. */
  hex: string;
  example: { traditional: string; jyutping: string; english: string };
}

export const TONE_INFO: Record<Tone, ToneInfo> = {
  1: {
    tone: 1,
    name: "Tone 1",
    contour: "high level",
    arrow: "→",
    pitchStart: 5,
    pitchEnd: 5,
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-300 dark:border-rose-700",
    hex: "#e11d48",
    example: { traditional: "詩", jyutping: "si1", english: "poem" },
  },
  2: {
    tone: 2,
    name: "Tone 2",
    contour: "mid rising",
    arrow: "↗",
    pitchStart: 3,
    pitchEnd: 5,
    text: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    border: "border-orange-300 dark:border-orange-700",
    hex: "#ea580c",
    example: { traditional: "史", jyutping: "si2", english: "history" },
  },
  3: {
    tone: 3,
    name: "Tone 3",
    contour: "mid level",
    arrow: "→",
    pitchStart: 3,
    pitchEnd: 3,
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-300 dark:border-amber-700",
    hex: "#d97706",
    example: { traditional: "試", jyutping: "si3", english: "to try" },
  },
  4: {
    tone: 4,
    name: "Tone 4",
    contour: "low falling",
    arrow: "↘",
    pitchStart: 3,
    pitchEnd: 1,
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-300 dark:border-emerald-700",
    hex: "#059669",
    example: { traditional: "時", jyutping: "si4", english: "time" },
  },
  5: {
    tone: 5,
    name: "Tone 5",
    contour: "low rising",
    arrow: "↗",
    pitchStart: 1,
    pitchEnd: 3,
    text: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-300 dark:border-sky-700",
    hex: "#0284c7",
    example: { traditional: "市", jyutping: "si5", english: "market" },
  },
  6: {
    tone: 6,
    name: "Tone 6",
    contour: "low level",
    arrow: "→",
    pitchStart: 1,
    pitchEnd: 1,
    text: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-300 dark:border-violet-700",
    hex: "#7c3aed",
    example: { traditional: "事", jyutping: "si6", english: "matter" },
  },
};

export const ALL_TONES: Tone[] = [1, 2, 3, 4, 5, 6];

const SYLLABLE_RE = /^([a-zA-Z]+)([1-6])$/;

export function parseJyutping(jyutping: string): Syllable[] {
  return jyutping
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const match = SYLLABLE_RE.exec(token);
      if (!match) {
        return { text: token, base: token.toLowerCase(), tone: null };
      }
      return {
        text: token.toLowerCase(),
        base: match[1].toLowerCase(),
        tone: Number(match[2]) as Tone,
      };
    });
}

/** Strip tone digits: "nei5 hou2" -> "nei hou". Used by the lenient comparison. */
export function stripTones(jyutping: string): string {
  return parseJyutping(jyutping)
    .map((syllable) => syllable.base)
    .join(" ");
}
