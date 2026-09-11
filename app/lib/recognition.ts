/**
 * Speech recognition for answering out loud.
 *
 * The Web Speech API is unevenly supported — Chrome and Edge on desktop and
 * Android, Safari from iOS 14.5, nothing on Firefox — so every entry point here
 * reports failure rather than throwing, and the UI keeps typing available.
 *
 * Recognition returns Chinese characters, never Jyutping, which is why a spoken
 * answer is graded through the same character path as a typed one.
 */

export type RecognitionError =
  | "unsupported"
  | "not-allowed"
  | "service-blocked"
  | "no-speech"
  | "audio-capture"
  | "network"
  | "language"
  | "unknown";

export interface RecognitionHandle {
  stop(): void;
  abort(): void;
}

export interface ListenCallbacks {
  onInterim?(transcript: string): void;
  onResult(transcript: string): void;
  /** `raw` is the browser's own error string, surfaced for diagnosis. */
  onError(error: RecognitionError, raw?: string): void;
  onEnd?(): void;
}

interface AlternativeLike {
  transcript: string;
}
interface ResultLike {
  0: AlternativeLike;
  isFinal: boolean;
}
interface ResultEventLike {
  results: { length: number; [index: number]: ResultLike };
}
interface ErrorEventLike {
  error: string;
}
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: ResultEventLike) => void) | null;
  onerror: ((event: ErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type RecognitionConstructor = new () => RecognitionLike;

function constructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function isRecognitionSupported(): boolean {
  return constructor() !== null;
}

/**
 * Google's engine names Cantonese "yue-Hant-HK" while Apple's uses "zh-HK", and
 * asking for the wrong one is a recognisable error, so try them in order.
 */
const LANGUAGES = ["yue-Hant-HK", "zh-HK"];

/**
 * Safari will not start a session while a previous one still holds the audio
 * session, and it signals that by emitting nothing at all — no start, no error,
 * no end — so the UI waits on a recogniser that never runs. Tracking the live
 * instance means the last one is always torn down before a new one begins.
 */
let liveRecognition: RecognitionLike | null = null;

/** Nothing arriving within this long means the session will never produce anything. */
const NO_RESPONSE_MS = 10_000;

function mapError(code: string): RecognitionError {
  switch (code) {
    case "not-allowed":
      return "not-allowed";
    // The browser refused the service rather than the microphone — no amount of
    // changing permissions fixes it, so it needs its own message.
    case "service-not-allowed":
      return "service-blocked";
    case "no-speech":
      return "no-speech";
    case "audio-capture":
      return "audio-capture";
    case "network":
      return "network";
    case "language-not-supported":
      return "language";
    default:
      return "unknown";
  }
}

export function startListening(callbacks: ListenCallbacks): RecognitionHandle | null {
  const Recognition = constructor();
  if (!Recognition) {
    callbacks.onError("unsupported", "no-constructor");
    return null;
  }

  // Release whatever ran last: Safari holds the microphone until it is told not to.
  liveRecognition?.abort();
  liveRecognition = null;

  let active: RecognitionLike | null = null;
  let languageIndex = 0;
  let settled = false;
  let cancelled = false;
  let started = false;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  /**
   * Safari frequently ends a session having only ever emitted interim results,
   * never marking one final. Holding the last interim means a heard answer is
   * still used rather than discarded as "didn't catch that".
   */
  let lastInterim = "";

  function finish() {
    if (watchdog !== undefined) clearTimeout(watchdog);
    watchdog = undefined;
    // Hand the microphone back straight away rather than waiting for teardown on
    // the next attempt, which is what left the following word listening forever.
    active?.abort();
    if (liveRecognition === active) liveRecognition = null;
  }

  function run() {
    const recognition = new Recognition!();
    active = recognition;
    liveRecognition = recognition;

    if (watchdog !== undefined) clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      if (settled || cancelled) return;
      settled = true;
      finish();
      callbacks.onError(
        started ? "no-speech" : "unknown",
        started ? "no-result-before-timeout" : "never-started"
      );
      callbacks.onEnd?.();
    }, NO_RESPONSE_MS);

    recognition.onstart = () => {
      started = true;
    };
    recognition.lang = LANGUAGES[languageIndex];
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
      let interim = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          settled = true;
          finish();
          const text = transcript.trim() || lastInterim;
          if (text) callbacks.onResult(text);
          else callbacks.onError("no-speech", "empty-final-result");
          return;
        }
        interim += transcript;
      }
      if (interim.trim()) {
        lastInterim = interim.trim();
        callbacks.onInterim?.(lastInterim);
      }
    };

    recognition.onerror = (event) => {
      // WebKit reports an unknown locale as "service-not-allowed" rather than
      // "language-not-supported", so both have to advance to the next language —
      // otherwise Safari never gets asked for zh-HK after refusing yue-Hant-HK.
      const retryable =
        event.error === "language-not-supported" || event.error === "service-not-allowed";
      if (retryable && languageIndex + 1 < LANGUAGES.length) {
        languageIndex += 1;
        // Release this attempt before the next one, or it keeps the microphone
        // and the retry is the session that silently never starts.
        recognition.abort();
        if (liveRecognition === recognition) liveRecognition = null;
        run();
        return;
      }
      if (event.error === "aborted" || cancelled) return;
      settled = true;
      finish();
      callbacks.onError(mapError(event.error), event.error);
    };

    recognition.onend = () => {
      if (!settled && !cancelled) {
        settled = true;
        finish();
        // Only a session that produced no transcript at all counts as unheard.
        if (lastInterim) callbacks.onResult(lastInterim);
        else callbacks.onError("no-speech", "ended-without-result");
      }
      callbacks.onEnd?.();
    };

    try {
      recognition.start();
    } catch (error) {
      settled = true;
      finish();
      callbacks.onError("unknown", `start-threw: ${(error as Error).name}`);
    }
  }

  run();

  return {
    stop: () => active?.stop(),
    abort: () => {
      cancelled = true;
      finish();
    },
  };
}

const BASE_MESSAGE: Record<RecognitionError, string> = {
  unsupported: "This browser can't listen — try typing instead.",
  "not-allowed": "Microphone access was blocked. Allow it in your browser settings.",
  "service-blocked": "This browser won't allow speech recognition.",
  "no-speech": "Didn't catch that — tap the mic and try again.",
  "audio-capture": "No microphone found.",
  network: "Speech recognition needs a connection and couldn't reach the service.",
  language: "This browser has no Cantonese recogniser — try typing instead.",
  unknown: "Something went wrong listening — try again or type your answer.",
};

/**
 * Every iOS browser is WebKit underneath, but Apple exposes speech recognition only
 * to Safari, so Chrome and Firefox on iOS fail with a permission-shaped error that
 * no permission change can fix. Naming Safari is the only useful advice there.
 */
function isNonSafariIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const agent = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(agent) && /CriOS|FxiOS|EdgiOS|OPiOS/.test(agent);
}

export function recognitionMessage(error: RecognitionError): string {
  const base = BASE_MESSAGE[error];
  const blocked =
    error === "service-blocked" || error === "not-allowed" || error === "unsupported";
  if (blocked && isNonSafariIos()) {
    return `${base} On iOS, only Safari can do speech recognition — open this page in Safari, or type your answer.`;
  }
  return base;
}
