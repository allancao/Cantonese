"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { JyutpingSyllable } from "../../components/JyutpingSyllable";
import { PROGRESS_EVENT } from "../../components/SyncInit";
import { dueCount, loadProgress, masteryForLevel, MASTERED_BOX } from "../../lib/srs";
import { parseJyutping } from "../../lib/tone";
import type { ProgressState } from "../../lib/types";
import { categoriesForLevel, levelMeta, wordsForLevel } from "../../lib/vocab";

const EMPTY: ProgressState = {
  words: {},
  stats: { sessions: 0, reviewed: 0, correct: 0, partial: 0, incorrect: 0 },
};

export function LevelBrowser({ level }: { level: number }) {
  const [progress, setProgress] = useState<ProgressState>(EMPTY);

  useEffect(() => {
    const refresh = () => setProgress(loadProgress());
    refresh();
    window.addEventListener(PROGRESS_EVENT, refresh);
    return () => window.removeEventListener(PROGRESS_EVENT, refresh);
  }, []);

  const meta = levelMeta(level);
  if (!meta) return null;

  const words = wordsForLevel(level);
  const categories = categoriesForLevel(level);

  return (
    <main>
      <Link
        href="/"
        className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        ← All levels
      </Link>

      <header className="mb-5 mt-3">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-slate-400 dark:text-slate-500">Level {meta.level}</span>{" "}
          {meta.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{meta.description}</p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {meta.count} words · {masteryForLevel(words, progress)}% mastered ·{" "}
          {dueCount(words, progress)} due
        </p>
      </header>

      <Link
        href={`/levels/${level}/session`}
        className="block rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-[0.99] dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        Start dictation session
      </Link>

      <div className="mt-6 space-y-5">
        {categories.map((category) => (
          <section key={category.name}>
            <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {category.name}
            </h2>
            <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {category.words.map((word) => {
                const mastered = (progress.words[word.id]?.box ?? 0) >= MASTERED_BOX;
                return (
                  <li key={word.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="font-han text-xl">{word.traditional}</span>
                    <span className="flex flex-wrap items-center gap-1 text-sm">
                      {parseJyutping(word.jyutping).map((syllable, index) => (
                        <JyutpingSyllable
                          key={`${word.id}-${index}`}
                          syllable={syllable}
                          showGlyph={false}
                        />
                      ))}
                    </span>
                    <span className="ml-auto flex items-center gap-2 text-right text-xs text-slate-500 dark:text-slate-400">
                      {word.english}
                      {mastered ? (
                        <span title="Mastered" className="text-emerald-500">
                          ✓
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
