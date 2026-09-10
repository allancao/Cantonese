import { speakCantonese } from "./speech";
import type { VocabWord } from "./types";

export type PlaybackSource = "file" | "speech";

export interface PlayOptions {
  /**
   * Called when neither the pre-rendered clip nor a device Cantonese voice is
   * available, so the UI can reveal the characters and continue as a text exercise
   * rather than leaving the learner stuck on silence.
   */
  onUnrecoverable?: () => void;
}

/**
 * Bumped whenever the generated clips change, so browsers holding a cached copy at
 * the same path fetch the new one. Clips are served from a stable filename, so
 * without this a listener keeps the old audio indefinitely.
 */
const AUDIO_VERSION = "2";

function playFile(word: VocabWord): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio(`/audio/${word.id}.wav?v=${AUDIO_VERSION}`);
    let settled = false;
    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    audio.addEventListener("error", () => settle(false), { once: true });
    audio.addEventListener("playing", () => settle(true), { once: true });
    audio.play().then(
      () => settle(true),
      () => settle(false)
    );
  });
}

/** Pre-rendered clip, then device speech synthesis, then give up gracefully. */
export async function playWord(
  word: VocabWord,
  options: PlayOptions = {}
): Promise<PlaybackSource | null> {
  if (await playFile(word)) return "file";
  if (await speakCantonese(word.traditional)) return "speech";
  options.onUnrecoverable?.();
  return null;
}
