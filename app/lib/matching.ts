import { parseJyutping } from "./tone";
import type { Tone, VocabWord, Verdict } from "./types";
import { WORDS } from "./vocab";

export interface MatchResult {
  verdict: Verdict;
  /** Short feedback line shown on reveal. */
  detail: string;
  /** Indices of syllables whose tone was wrong, for highlighting the answer. */
  toneErrors: number[];
}

const HAN_RE = /[㐀-䶿一-鿿]/;

/** Lowercase, drop diacritics (Yale input), and reduce to letters, digits and spaces. */
function normaliseLatin(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z1-6]+/g, " ")
    .trim();
}

/**
 * Split romanised input into syllables. Learners often run them together
 * ("nei5hou2"), so a fully-toned string with no spaces is split on tone digits.
 */
function tokenise(normalised: string): string[] {
  if (!normalised) return [];
  if (!normalised.includes(" ") && /^(?:[a-z]+[1-6])+$/.test(normalised)) {
    return normalised.match(/[a-z]+[1-6]/g) ?? [];
  }
  return normalised.split(/\s+/).filter(Boolean);
}

function splitToken(token: string): { base: string; tone: Tone | null } {
  const match = /^([a-z]+)([1-6])$/.exec(token);
  if (!match) return { base: token.replace(/[1-6]/g, ""), tone: null };
  return { base: match[1], tone: Number(match[2]) as Tone };
}

function stripHanPunctuation(input: string): string {
  return input.replace(/[\s　-〿＀-￯]/g, "");
}

/** A different vocabulary word that sounds the same, ignoring tones. */
function homophoneOf(target: VocabWord, typed: string): VocabWord | undefined {
  const targetSound = parseJyutping(target.jyutping)
    .map((syllable) => syllable.base)
    .join(" ");
  return WORDS.find((word) => {
    if (word.id === target.id) return false;
    if (stripHanPunctuation(word.traditional) !== typed) {
      if (stripHanPunctuation(word.simplified) !== typed) return false;
    }
    const sound = parseJyutping(word.jyutping)
      .map((syllable) => syllable.base)
      .join(" ");
    return sound === targetSound;
  });
}

export function gradeAnswer(input: string, target: VocabWord): MatchResult {
  const raw = input.trim();
  if (!raw) {
    return { verdict: "incorrect", detail: "No answer given.", toneErrors: [] };
  }

  if (HAN_RE.test(raw)) {
    const typed = stripHanPunctuation(raw);
    if (
      typed === stripHanPunctuation(target.traditional) ||
      typed === stripHanPunctuation(target.simplified)
    ) {
      return { verdict: "correct", detail: "Correct — characters matched.", toneErrors: [] };
    }
    if (homophoneOf(target, typed)) {
      return {
        verdict: "partial",
        detail: "Right sound, but those are different characters.",
        toneErrors: [],
      };
    }
    return { verdict: "incorrect", detail: "Those characters don't match.", toneErrors: [] };
  }

  const tokens = tokenise(normaliseLatin(raw));
  if (tokens.length === 0) {
    return { verdict: "incorrect", detail: "That isn't Jyutping or Chinese.", toneErrors: [] };
  }

  const answer = tokens.map(splitToken);
  const target_ = parseJyutping(target.jyutping);
  const answerBases = answer.map((syllable) => syllable.base);
  const targetBases = target_.map((syllable) => syllable.base);

  const sameSyllables =
    answerBases.length === targetBases.length &&
    answerBases.every((base, index) => base === targetBases[index]);
  // Tolerate a wrong syllable split ("neih ou" for "nei hou") when the sounds line up.
  const sameRun = answerBases.join("") === targetBases.join("");

  if (!sameSyllables && !sameRun) {
    return { verdict: "incorrect", detail: "Not quite — listen again.", toneErrors: [] };
  }

  if (!sameSyllables) {
    return {
      verdict: "partial",
      detail: "Right sounds, but the syllables are split differently.",
      toneErrors: [],
    };
  }

  const toneErrors = answer
    .map((syllable, index) => (syllable.tone === target_[index].tone ? -1 : index))
    .filter((index) => index >= 0);

  if (answer.some((syllable) => syllable.tone === null)) {
    return {
      verdict: "partial",
      detail: "Right word — now add the tone numbers.",
      toneErrors: answer
        .map((syllable, index) => (syllable.tone === null ? index : -1))
        .filter((index) => index >= 0),
    };
  }

  if (toneErrors.length > 0) {
    return {
      verdict: "partial",
      detail:
        toneErrors.length === 1
          ? "Right word, wrong tone on one syllable."
          : `Right word, wrong tone on ${toneErrors.length} syllables.`,
      toneErrors,
    };
  }

  return { verdict: "correct", detail: "Correct — word and tones.", toneErrors: [] };
}
