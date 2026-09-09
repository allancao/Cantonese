import Link from "next/link";
import type { LevelMeta } from "../lib/types";

export function LevelCard({
  meta,
  mastery,
  due,
}: {
  meta: LevelMeta;
  mastery: number;
  due: number;
}) {
  return (
    <Link
      href={`/levels/${meta.level}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400 active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          <span className="text-slate-400 dark:text-slate-500">{meta.level}.</span> {meta.name}
        </h2>
        <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
          {meta.count} words
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{meta.description}</p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width]"
          style={{ width: `${mastery}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{mastery}% mastered</span>
        <span>{due > 0 ? `${due} due` : "nothing due"}</span>
      </div>
    </Link>
  );
}
