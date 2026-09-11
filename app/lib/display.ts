/**
 * Whether words lead with Chinese characters or with Jyutping.
 *
 * Beginners working by ear often can't read the characters yet, so showing the
 * romanisation first makes the reveal legible; the characters stay on screen
 * underneath so they're still being absorbed rather than hidden.
 */
export type ScriptPreference = "characters" | "jyutping";

const SCRIPT_KEY = "jyut-dictation:script";
export const SCRIPT_EVENT = "jyut-dictation:script-changed";

export function loadScript(): ScriptPreference {
  if (typeof window === "undefined") return "characters";
  try {
    return window.localStorage.getItem(SCRIPT_KEY) === "jyutping" ? "jyutping" : "characters";
  } catch {
    return "characters";
  }
}

export function saveScript(preference: ScriptPreference): void {
  try {
    window.localStorage.setItem(SCRIPT_KEY, preference);
  } catch {
    // Preference only; the app works either way.
  }
  window.dispatchEvent(new Event(SCRIPT_EVENT));
}

/**
 * Playback speed.
 *
 * The clips are already rendered at -15% of conversational pace, so 0.75x lands
 * near two-thirds of native speed — slow enough to separate the syllables of a
 * phrase, while the prosody still holds together. Going much below that is
 * counterproductive: time-stretching artefacts creep in, and a tone contour
 * smeared over a long vowel stops resembling the one you need to produce.
 */
export const SPEEDS = [1, 0.75] as const;
export type PlaybackSpeed = (typeof SPEEDS)[number];

const SPEED_KEY = "jyut-dictation:speed";
export const SPEED_EVENT = "jyut-dictation:speed-changed";

export function loadSpeed(): PlaybackSpeed {
  if (typeof window === "undefined") return 1;
  try {
    return window.localStorage.getItem(SPEED_KEY) === "0.75" ? 0.75 : 1;
  } catch {
    return 1;
  }
}

export function saveSpeed(speed: PlaybackSpeed): void {
  try {
    window.localStorage.setItem(SPEED_KEY, String(speed));
  } catch {
    // Preference only; playback still works at the default speed.
  }
  window.dispatchEvent(new Event(SPEED_EVENT));
}
