/**
 * SpeechSynthesis fallback for when the pre-rendered clip cannot be fetched.
 *
 * This is only ever a fallback: whether a Cantonese voice exists at all is up to
 * the visitor's device, which is exactly why the app ships its own audio.
 */

function cantoneseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => {
    const lang = voice.lang.toLowerCase().replace("_", "-");
    return lang.startsWith("yue") || lang === "zh-hk";
  });
}

/** Voices populate asynchronously on most browsers, so wait briefly for them. */
function waitForVoices(timeoutMs = 1000): Promise<void> {
  return new Promise((resolve) => {
    if (window.speechSynthesis.getVoices().length > 0) {
      resolve();
      return;
    }
    const timer = window.setTimeout(finish, timeoutMs);
    function finish() {
      window.clearTimeout(timer);
      window.speechSynthesis.removeEventListener("voiceschanged", finish);
      resolve();
    }
    window.speechSynthesis.addEventListener("voiceschanged", finish);
  });
}

export function isSpeechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Returns false when no Cantonese voice is installed, so the caller can degrade. */
export async function speakCantonese(text: string, rate = 1): Promise<boolean> {
  if (!isSpeechAvailable()) return false;
  await waitForVoices();
  const voice = cantoneseVoice();
  if (!voice) return false;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  // Already slower than conversational; the preference scales it further.
  utterance.rate = 0.85 * rate;
  window.speechSynthesis.speak(utterance);
  return true;
}
