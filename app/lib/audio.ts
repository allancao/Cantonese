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
  /** Playback rate, 1 being the clip as rendered. */
  rate?: number;
}

/**
 * Bumped whenever the generated clips change, so browsers holding a cached copy at
 * the same path fetch the new one. Clips are served from a stable filename, so
 * without this a listener keeps the old audio indefinitely.
 */
const AUDIO_VERSION = "2";

/**
 * MP3 first: those are the committed neural-voice clips. The .wav is the espeak
 * fallback the build generates for anything the neural pass hasn't covered, so a
 * newly added word still has audio before someone reruns the local script.
 */
const EXTENSIONS = ["mp3", "wav"] as const;

/**
 * Whichever extension last worked is tried first. Without this, a deployment that
 * has only espeak .wav clips would 404 on .mp3 before every single play, adding a
 * round trip of silence on exactly the mobile connections least able to spare it.
 */
let preferred: (typeof EXTENSIONS)[number] = "mp3";

function playUrl(url: string, rate: number): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    // Cantonese tones ARE pitch, so slowing playback must time-stretch rather than
    // resample — otherwise every tone drags downward and the app teaches the wrong
    // contour. Modern browsers default this on; Safari needs the prefixed property.
    const stretchable = audio as HTMLAudioElement & { webkitPreservesPitch?: boolean };
    stretchable.preservesPitch = true;
    stretchable.webkitPreservesPitch = true;
    audio.playbackRate = rate;
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
  const rate = options.rate ?? 1;
  const order = [preferred, ...EXTENSIONS.filter((e) => e !== preferred)];
  for (const extension of order) {
    if (await playUrl(`/audio/${word.id}.${extension}?v=${AUDIO_VERSION}`, rate)) {
      preferred = extension;
      return "file";
    }
  }
  if (await speakCantonese(word.traditional, rate)) return "speech";
  options.onUnrecoverable?.();
  return null;
}
