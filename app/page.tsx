"use client";

import { useEffect, useState } from "react";
import { LevelCard } from "./components/LevelCard";
import { ScriptToggle } from "./components/ScriptToggle";
import { PROGRESS_EVENT } from "./components/SyncInit";
import { ToneLegend } from "./components/ToneLegend";
import { dueCount, loadProgress, masteryForLevel } from "./lib/srs";
import type { ProgressState } from "./lib/types";
import { LEVELS, wordsForLevel } from "./lib/vocab";

const EMPTY: ProgressState = {
  words: {},
  stats: { sessions: 0, reviewed: 0, correct: 0, partial: 0, incorrect: 0 },
};

export default function HomePage() {
  // Progress lives in localStorage, so the first render has to match the server's
  // empty state and fill in on the client to avoid a hydration mismatch.
  const [progress, setProgress] = useState<ProgressState>(EMPTY);

  useEffect(() => {
    const refresh = () => setProgress(loadProgress());
    refresh();
    window.addEventListener(PROGRESS_EVENT, refresh);
    return () => window.removeEventListener(PROGRESS_EVENT, refresh);
  }, []);

  const { reviewed, correct } = progress.stats;
  const accuracy = reviewed > 0 ? Math.round((correct / reviewed) * 100) : null;

  return (
    <main>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Jyut Dictation</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Hear a word, type what you heard, then check the characters, the tone-coloured
          Jyutping and the meaning.
        </p>
        {reviewed > 0 ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {reviewed} answers so far{accuracy === null ? "" : ` · ${accuracy}% exactly right`}
          </p>
        ) : null}
      </header>

      <ScriptToggle className="mb-4" />

      <div className="space-y-3">
        {LEVELS.map((meta) => {
          const words = wordsForLevel(meta.level);
          return (
            <LevelCard
              key={meta.level}
              meta={meta}
              mastery={masteryForLevel(words, progress)}
              due={dueCount(words, progress)}
            />
          );
        })}
      </div>

      <div className="mt-6">
        <ToneLegend />
      </div>
    </main>
  );
}
