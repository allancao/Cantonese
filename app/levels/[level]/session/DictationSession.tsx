"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { JyutpingSyllable } from "../../../components/JyutpingSyllable";
import { ToneLegend } from "../../../components/ToneLegend";
import { playWord } from "../../../lib/audio";
import { loadSpeed, saveSpeed, SPEED_EVENT, type PlaybackSpeed } from "../../../lib/display";
import { gradeAnswer, gradePronunciation, type MatchResult } from "../../../lib/matching";
import {
  buildSessionQueue,
  DEFAULT_SESSION_SIZE,
  loadProgress,
  recordVerdict,
  saveProgress,
} from "../../../lib/srs";
import {
  isRecognitionSupported,
  recognitionMessage,
  startListening,
  type RecognitionError,
  type RecognitionHandle,
} from "../../../lib/recognition";
import { pushProgress } from "../../../lib/sync";
import { parseJyutping } from "../../../lib/tone";
import type { Verdict, VocabWord } from "../../../lib/types";
import { levelMeta, wordsForLevel } from "../../../lib/vocab";

type InputMode = "type" | "speak";

const MODE_KEY = "jyut-dictation:input-mode";

function loadMode(): InputMode {
  try {
    return window.localStorage.getItem(MODE_KEY) === "speak" ? "speak" : "type";
  } catch {
    return "type";
  }
}

function saveMode(mode: InputMode) {
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Preference only; the session works either way.
  }
}

/** Failures no retry will fix, where the keyboard's own dictation is the way out. */
const BLOCKED_ERRORS: RecognitionError[] = [
  "unsupported",
  "not-allowed",
  "service-blocked",
  "language",
];

const VERDICT_STYLE: Record<Verdict, string> = {
  correct: "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40",
  partial: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40",
  incorrect: "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40",
};

const VERDICT_LABEL: Record<Verdict, string> = {
  correct: "Correct",
  partial: "Almost",
  incorrect: "Not this time",
};

export function DictationSession({ level }: { level: number }) {
  const [queue, setQueue] = useState<VocabWord[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [tally, setTally] = useState({ correct: 0, partial: 0, incorrect: 0 });
  const [playing, setPlaying] = useState(false);
  /** Set when neither a clip nor a device voice is available: reveal and carry on. */
  const [textOnly, setTextOnly] = useState(false);
  const [mode, setMode] = useState<InputMode>("type");
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [micError, setMicError] = useState<RecognitionError | null>(null);
  const [micErrorCode, setMicErrorCode] = useState<string | null>(null);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const micRef = useRef<RecognitionHandle | null>(null);

  useEffect(() => {
    const progress = loadProgress();
    setQueue(buildSessionQueue(wordsForLevel(level), progress, DEFAULT_SESSION_SIZE));
    saveProgress({ ...progress, stats: { ...progress.stats, sessions: progress.stats.sessions + 1 } });
    const supported = isRecognitionSupported();
    setCanSpeak(supported);
    if (supported) setMode(loadMode());
    const refreshSpeed = () => setSpeed(loadSpeed());
    refreshSpeed();
    window.addEventListener(SPEED_EVENT, refreshSpeed);
    return () => window.removeEventListener(SPEED_EVENT, refreshSpeed);
  }, [level]);

  const word = queue?.[index];

  const play = useCallback(async () => {
    if (!word) return;
    setPlaying(true);
    await playWord(word, { onUnrecoverable: () => setTextOnly(true), rate: speed });
    setPlaying(false);
  }, [word, speed]);

  // Autoplay only from the second word on: reaching it required a click or Enter,
  // which satisfies the browser's gesture requirement. The first word needs the button.
  useEffect(() => {
    if (index > 0 && word) void play();
    if (mode === "type") inputRef.current?.focus();
    // `play` is recreated per word, which is exactly when this should re-run.
  }, [index, word, play, mode]);

  // A live recogniser holds the microphone, so it must not outlive the component.
  useEffect(() => () => micRef.current?.abort(), []);

  const submit = useCallback(
    (value: string, spoken = false) => {
      if (!word) return;
      const graded = spoken ? gradePronunciation(value, word) : gradeAnswer(value, word);
      setResult(graded);
      setTally((current) => ({ ...current, [graded.verdict]: current[graded.verdict] + 1 }));

      const next = recordVerdict(loadProgress(), word.id, graded.verdict);
      saveProgress(next);
      pushProgress(word.id, next.words[word.id]);
    },
    [word]
  );

  function listen() {
    if (result) return;
    if (listening) {
      micRef.current?.abort();
      micRef.current = null;
      setListening(false);
      setInterim("");
      return;
    }
    setMicError(null);
    setMicErrorCode(null);
    setInterim("");
    setListening(true);
    micRef.current = startListening({
      onInterim: setInterim,
      onResult: (transcript) => {
        setListening(false);
        setInterim("");
        setAnswer(transcript);
        submit(transcript, true);
      },
      onError: (error, raw) => {
        setListening(false);
        setInterim("");
        setMicError(error);
        setMicErrorCode(raw ?? null);
      },
      onEnd: () => setListening(false),
    });
  }

  function advance() {
    micRef.current?.abort();
    micRef.current = null;
    setResult(null);
    setAnswer("");
    setInterim("");
    setMicError(null);
    setListening(false);
    setTextOnly(false);
    setIndex((current) => current + 1);
  }

  function chooseMode(next: InputMode) {
    micRef.current?.abort();
    setListening(false);
    setInterim("");
    setMicError(null);
    setMode(next);
    saveMode(next);
  }

  if (!queue) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Loading session…</p>;
  }

  const meta = levelMeta(level);

  if (queue.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No words available for this level yet.
        </p>
        <Link href={`/levels/${level}`} className="mt-3 inline-block text-sm underline">
          Back to level {level}
        </Link>
      </div>
    );
  }

  if (index >= queue.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Session complete</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {tally.correct} correct · {tally.partial} almost · {tally.incorrect} missed
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => {
              setQueue(
                buildSessionQueue(wordsForLevel(level), loadProgress(), DEFAULT_SESSION_SIZE)
              );
              setIndex(0);
              setTally({ correct: 0, partial: 0, incorrect: 0 });
            }}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Another session
          </button>
          <Link
            href={`/levels/${level}`}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-700"
          >
            Back to level {level}
          </Link>
        </div>
      </div>
    );
  }

  const syllables = word ? parseJyutping(word.jyutping) : [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <Link href={`/levels/${level}`} className="hover:text-slate-800 dark:hover:text-slate-200">
          ← Level {level} {meta ? meta.name : ""}
        </Link>
        <span>
          {index + 1} / {queue.length}
        </span>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full bg-slate-900 transition-[width] dark:bg-slate-100"
          style={{ width: `${(index / queue.length) * 100}%` }}
        />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => void play()}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-3xl text-white transition active:scale-95 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
          aria-label="Play the audio"
          disabled={playing}
        >
          {playing ? "…" : "▶"}
        </button>
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => saveSpeed(speed === 1 ? 0.75 : 1)}
            aria-pressed={speed !== 1}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              speed === 1
                ? "border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400"
                : "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
            }`}
          >
            {speed === 1 ? "Play slower" : "Slower · 75%"}
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
          {textOnly
            ? "No audio on this device — the characters are shown instead."
            : mode === "speak"
              ? "Listen, then say it back — you're scored on the pronunciation."
              : "Listen, then type what you heard."}
        </p>

        {textOnly && word ? (
          <div className="mt-3">
            <p className="text-center text-2xl font-medium">{word.jyutping}</p>
            <p className="mt-1 text-center font-han text-xl text-slate-500 dark:text-slate-400">
              {word.traditional}
            </p>
          </div>
        ) : null}

        {mode === "speak" && !result && word ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-center text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Say this
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5 text-lg">
              {syllables.map((syllable, position) => (
                <JyutpingSyllable key={`say-${word.id}-${position}`} syllable={syllable} />
              ))}
            </div>
            <p className="mt-2 text-center font-han text-2xl text-slate-600 dark:text-slate-400">
              {word.traditional}
            </p>
          </div>
        ) : null}

        {canSpeak ? (
          <div className="mt-4 flex justify-center gap-1 rounded-lg bg-slate-100 p-1 text-xs dark:bg-slate-950">
            {(["type", "speak"] as InputMode[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => chooseMode(option)}
                className={`rounded-md px-3 py-1.5 font-medium transition ${
                  mode === option
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {option === "type" ? "Type" : "Speak"}
              </button>
            ))}
          </div>
        ) : null}

        {mode === "speak" ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={listen}
              disabled={result !== null}
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 text-2xl transition active:scale-95 disabled:opacity-50 ${
                listening
                  ? "animate-pulse border-rose-400 bg-rose-50 dark:bg-rose-950/40"
                  : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950"
              }`}
              aria-label={listening ? "Stop listening" : "Tap to answer out loud"}
            >
              🎤
            </button>
            <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              {listening
                ? interim || "Listening… tap to stop"
                : result
                  ? " "
                  : "Tap the mic and say the word"}
            </p>
            {micError ? (
              <>
                <p className="mt-1 text-center text-xs text-rose-600 dark:text-rose-400">
                  {recognitionMessage(micError)}
                </p>
                {micErrorCode ? (
                  <p className="mt-0.5 text-center font-mono text-[10px] text-slate-400 dark:text-slate-500">
                    {micErrorCode}
                  </p>
                ) : null}
                {BLOCKED_ERRORS.includes(micError) ? (
                  // The device's own keyboard dictation still works when the browser
                  // refuses the Web Speech API, and it reaches the same grading path.
                  <button
                    type="button"
                    onClick={() => chooseMode("type")}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium dark:border-slate-700"
                  >
                    Speak with your keyboard&apos;s mic key instead
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}

        <form
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (result) advance();
            else submit(answer);
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            readOnly={result !== null}
            placeholder={mode === "speak" ? "or type it here" : "nei5 hou2 or 你好"}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-center outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-slate-400"
          />
          <button
            type="submit"
            className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
          >
            {result ? "Next" : "Check"}
          </button>
        </form>

        {result === null ? (
          <button
            type="button"
            onClick={() => {
              setResult({ verdict: "incorrect", detail: "Skipped.", toneErrors: [] });
              setTally((current) => ({ ...current, incorrect: current.incorrect + 1 }));
              if (word) {
                const next = recordVerdict(loadProgress(), word.id, "incorrect");
                saveProgress(next);
                pushProgress(word.id, next.words[word.id]);
              }
            }}
            className="mt-2 w-full text-center text-xs text-slate-500 underline dark:text-slate-400"
          >
            I don&apos;t know — show me
          </button>
        ) : null}
      </div>

      {result && word ? (
        <div className={`mt-4 rounded-xl border p-5 ${VERDICT_STYLE[result.verdict]}`}>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            {VERDICT_LABEL[result.verdict]}
          </div>
          <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{result.detail}</p>

          {/* Jyutping leads: this is the reading being practised, and the
              characters sit underneath so both are on screen either way. */}
          <div className="mt-4 flex flex-wrap justify-center gap-1.5 text-lg">
            {syllables.map((syllable, position) => (
              <JyutpingSyllable
                key={`${word.id}-${position}`}
                syllable={syllable}
                flagged={result.toneErrors.includes(position)}
              />
            ))}
          </div>

          <p className="mt-3 text-center font-han text-3xl text-slate-600 dark:text-slate-400">
            {word.traditional}
          </p>
          {word.simplified !== word.traditional ? (
            <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
              simplified {word.simplified}
            </p>
          ) : null}

          <p className="mt-4 text-center text-sm text-slate-700 dark:text-slate-300">
            {word.english}
          </p>
          <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
            {word.category}
          </p>
          {result.heard ? (
            <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
              heard <span className="font-han">{result.heard}</span>
              {result.heardJyutping ? ` · ${result.heardJyutping}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6">
        <ToneLegend compact />
      </div>
    </div>
  );
}
