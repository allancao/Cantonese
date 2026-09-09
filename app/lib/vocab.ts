import data from "../data/vocab.json";
import type { LevelMeta, VocabWord } from "./types";

const vocab = data as { levels: LevelMeta[]; words: VocabWord[] };

export const LEVELS: LevelMeta[] = vocab.levels;
export const WORDS: VocabWord[] = vocab.words;

export function wordsForLevel(level: number): VocabWord[] {
  return WORDS.filter((word) => word.level === level);
}

export function levelMeta(level: number): LevelMeta | undefined {
  return LEVELS.find((meta) => meta.level === level);
}

export function categoriesForLevel(level: number): { name: string; words: VocabWord[] }[] {
  const groups: { name: string; words: VocabWord[] }[] = [];
  for (const word of wordsForLevel(level)) {
    const existing = groups.find((group) => group.name === word.category);
    if (existing) {
      existing.words.push(word);
    } else {
      groups.push({ name: word.category, words: [word] });
    }
  }
  return groups;
}
