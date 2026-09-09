export type Tone = 1 | 2 | 3 | 4 | 5 | 6;

export interface VocabWord {
  id: string;
  level: number;
  levelName: string;
  category: string;
  traditional: string;
  simplified: string;
  jyutping: string;
  english: string;
}

export interface LevelMeta {
  level: number;
  name: string;
  description: string;
  count: number;
}

export interface Syllable {
  /** The syllable as written, tone digit included: "hou2". */
  text: string;
  /** The syllable without its tone digit: "hou". */
  base: string;
  /** Null for anything that does not parse as a toned syllable. */
  tone: Tone | null;
}

export type Verdict = "correct" | "partial" | "incorrect";

export interface WordProgress {
  /** Leitner box, 1-5. Box 5 counts as mastered. */
  box: number;
  /** ISO timestamp of when this word is next due. */
  dueAt: string;
  correctCount: number;
  incorrectCount: number;
  lastSeenAt: string;
  updatedAt: string;
}

export interface LifetimeStats {
  sessions: number;
  reviewed: number;
  correct: number;
  partial: number;
  incorrect: number;
}

export interface ProgressState {
  words: Record<string, WordProgress>;
  stats: LifetimeStats;
}
