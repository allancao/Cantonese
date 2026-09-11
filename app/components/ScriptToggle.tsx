"use client";

import { useEffect, useState } from "react";
import { loadScript, saveScript, SCRIPT_EVENT, type ScriptPreference } from "../lib/display";

const OPTIONS: { value: ScriptPreference; label: string }[] = [
  { value: "characters", label: "字 Characters" },
  { value: "jyutping", label: "Jyutping" },
];

/** Reads the shared preference and keeps every mounted copy in sync. */
export function useScriptPreference(): ScriptPreference {
  const [script, setScript] = useState<ScriptPreference>("characters");
  useEffect(() => {
    const refresh = () => setScript(loadScript());
    refresh();
    window.addEventListener(SCRIPT_EVENT, refresh);
    return () => window.removeEventListener(SCRIPT_EVENT, refresh);
  }, []);
  return script;
}

export function ScriptToggle({ className = "" }: { className?: string }) {
  const script = useScriptPreference();

  return (
    <div
      className={`flex gap-1 rounded-lg bg-slate-100 p-1 text-xs dark:bg-slate-950 ${className}`}
      role="group"
      aria-label="Show words as"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => saveScript(option.value)}
          aria-pressed={script === option.value}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
            script === option.value
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
