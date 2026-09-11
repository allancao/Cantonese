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
