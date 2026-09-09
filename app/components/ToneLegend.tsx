import { ToneContourGlyph } from "./ToneContourGlyph";
import { ALL_TONES, TONE_INFO } from "../lib/tone";

/**
 * Always visible rather than tucked behind a toggle: the colours only become
 * learnable if they are on screen next to the words that use them.
 */
export function ToneLegend({ compact = false }: { compact?: boolean }) {
  return (
    <section
      aria-label="Cantonese tone reference"
      className="rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/50"
    >
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
        The six tones
      </h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ALL_TONES.map((tone) => {
          const info = TONE_INFO[tone];
          return (
            <li
              key={tone}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${info.bg} ${info.border}`}
            >
              <ToneContourGlyph tone={tone} className="shrink-0" />
              <div className="min-w-0">
                <div className={`text-sm font-semibold ${info.text}`}>
                  {info.example.jyutping}{" "}
                  <span className="font-han font-normal text-slate-700 dark:text-slate-300">
                    {info.example.traditional}
                  </span>
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {info.contour}
                  {compact ? null : ` · ${info.example.english}`}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
