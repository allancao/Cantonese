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
  onError(error: RecognitionError): void;
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

function mapError(code: string): RecognitionError {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "not-allowed";
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
    callbacks.onError("unsupported");
    return null;
  }

  let active: RecognitionLike | null = null;
  let languageIndex = 0;
  let settled = false;
  let cancelled = false;

  function run() {
    const recognition = new Recognition!();
    active = recognition;
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
          callbacks.onResult(transcript.trim());
          return;
        }
        interim += transcript;
      }
      if (interim) callbacks.onInterim?.(interim.trim());
    };

    recognition.onerror = (event) => {
      if (event.error === "language-not-supported" && languageIndex + 1 < LANGUAGES.length) {
        languageIndex += 1;
        run();
        return;
      }
      if (event.error === "aborted" || cancelled) return;
      settled = true;
      callbacks.onError(mapError(event.error));
    };

    recognition.onend = () => {
      // Ending without a final result means the listener heard nothing usable.
      if (!settled && !cancelled) {
        settled = true;
        callbacks.onError("no-speech");
      }
      callbacks.onEnd?.();
    };

    try {
      recognition.start();
    } catch {
      settled = true;
      callbacks.onError("unknown");
    }
  }

  run();

  return {
    stop: () => active?.stop(),
    abort: () => {
      cancelled = true;
      active?.abort();
    },
  };
}

export const RECOGNITION_MESSAGE: Record<RecognitionError, string> = {
  unsupported: "This browser can't listen — try typing instead.",
  "not-allowed": "Microphone access was blocked. Allow it in your browser settings.",
  "no-speech": "Didn't catch that — tap the mic and try again.",
  "audio-capture": "No microphone found.",
  network: "Speech recognition needs a connection and couldn't reach the service.",
  language: "This browser has no Cantonese recogniser — try typing instead.",
  unknown: "Something went wrong listening — try again or type your answer.",
};
