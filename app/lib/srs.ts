import type { LifetimeStats, ProgressState, Verdict, VocabWord, WordProgress } from "./types";

const STORAGE_KEY = "jyut-dictation:progress:v1";

/** Days until a word in each Leitner box comes back. Box 5 counts as mastered. */
export const BOX_INTERVALS: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 16 };
export const MASTERED_BOX = 5;
export const DEFAULT_SESSION_SIZE = 15;

const EMPTY_STATS: LifetimeStats = {
  sessions: 0,
  reviewed: 0,
  correct: 0,
  partial: 0,
  incorrect: 0,
};

/**
 * Private mode and quota limits make localStorage throw rather than return null, so
 * every read and write is guarded: a failure degrades to a working, non-persisting
 * session instead of crashing mid-answer.
 */
export function loadProgress(): ProgressState {
  if (typeof window === "undefined") return { words: {}, stats: { ...EMPTY_STATS } };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { words: {}, stats: { ...EMPTY_STATS } };
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      words: parsed.words ?? {},
      stats: { ...EMPTY_STATS, ...(parsed.stats ?? {}) },
    };
  } catch {
    return { words: {}, stats: { ...EMPTY_STATS } };
  }
}

export function saveProgress(state: ProgressState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Non-persisting session; the in-memory state still drives the UI.
  }
}

function addDays(from: Date, days: number): string {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function newProgress(now = new Date()): WordProgress {
  return {
    box: 1,
    dueAt: now.toISOString(),
    correctCount: 0,
    incorrectCount: 0,
    lastSeenAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * Correct promotes, incorrect resets to box 1, and partial deliberately holds the
 * box steady: getting the word right but the tone wrong shouldn't erase progress,
 * and shouldn't advance it either.
 */
export function applyVerdict(
  current: WordProgress | undefined,
  verdict: Verdict,
  now = new Date()
): WordProgress {
  const base = current ?? newProgress(now);
  let box = base.box;
  if (verdict === "correct") box = Math.min(MASTERED_BOX, base.box + 1);
  else if (verdict === "incorrect") box = 1;

  return {
    box,
    dueAt: addDays(now, BOX_INTERVALS[box] ?? 0),
    correctCount: base.correctCount + (verdict === "correct" ? 1 : 0),
    incorrectCount: base.incorrectCount + (verdict === "incorrect" ? 1 : 0),
    lastSeenAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function recordVerdict(
  state: ProgressState,
  wordId: string,
  verdict: Verdict,
  now = new Date()
): ProgressState {
  return {
    words: { ...state.words, [wordId]: applyVerdict(state.words[wordId], verdict, now) },
    stats: {
      ...state.stats,
      reviewed: state.stats.reviewed + 1,
      correct: state.stats.correct + (verdict === "correct" ? 1 : 0),
      partial: state.stats.partial + (verdict === "partial" ? 1 : 0),
      incorrect: state.stats.incorrect + (verdict === "incorrect" ? 1 : 0),
    },
  };
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Due words first, then words never seen, then the rest least-recently-seen first.
 * Each bucket is shuffled internally so sessions vary, but the bucket order holds so
 * revision always outranks new material.
 */
export function buildSessionQueue(
  words: VocabWord[],
  state: ProgressState,
  size = DEFAULT_SESSION_SIZE,
  now = new Date()
): VocabWord[] {
  const due: VocabWord[] = [];
  const fresh: VocabWord[] = [];
  const rest: VocabWord[] = [];

  for (const word of words) {
    const progress = state.words[word.id];
    if (!progress) fresh.push(word);
    else if (new Date(progress.dueAt).getTime() <= now.getTime()) due.push(word);
    else rest.push(word);
  }

  rest.sort(
    (a, b) =>
      new Date(state.words[a.id].lastSeenAt).getTime() -
      new Date(state.words[b.id].lastSeenAt).getTime()
  );

  return [...shuffle(due), ...shuffle(fresh), ...rest].slice(0, size);
}

export function masteryForLevel(words: VocabWord[], state: ProgressState): number {
  if (words.length === 0) return 0;
  const mastered = words.filter(
    (word) => (state.words[word.id]?.box ?? 0) >= MASTERED_BOX
  ).length;
  return Math.round((mastered / words.length) * 100);
}

export function dueCount(words: VocabWord[], state: ProgressState, now = new Date()): number {
  return words.filter((word) => {
    const progress = state.words[word.id];
    return !progress || new Date(progress.dueAt).getTime() <= now.getTime();
  }).length;
}
