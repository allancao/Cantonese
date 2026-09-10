/**
 * Render the vocabulary with Google Cloud Text-to-Speech (yue-HK).
 *
 * espeak-ng is tonally correct but unmistakably robotic. These voices sound far
 * more natural, at the cost of the guarantee espeak gave us: espeak reads our
 * Jyutping directly, tone numbers included, whereas Google reads the characters
 * and picks its own reading. For polyphones that reading may differ from the one
 * the app displays — see scripts/curriculum.py for the pinned ones — so spot-check
 * those after regenerating.
 *
 * Output is committed to the repo, so this runs by hand rather than at build time
 * and the deploy never needs an API key:
 *
 *     GOOGLE_TTS_API_KEY=... node scripts/generate-audio-google.mjs
 *
 * Add --force to overwrite clips that already exist.
 */

import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VOCAB_PATH = path.join(ROOT, "app", "data", "vocab.json");
const OUT_DIR = path.join(ROOT, "public", "audio");
const ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";

const VOICE = process.env.GOOGLE_TTS_VOICE ?? "yue-HK-Standard-A";
const LANGUAGE = "yue-HK";
/** Slower than conversational, because this is dictation practice for learners. */
const SPEAKING_RATE = 0.85;
/**
 * Phone audio hardware takes 100-300ms to wake on first play and swallows whatever
 * is playing. A leading SSML break is silence baked into the clip itself, which
 * needs no post-processing of the encoded audio.
 */
const LEAD_IN_MS = 300;

function escapeXml(text) {
  return text.replace(
    /[<>&'"]/g,
    (character) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character]
  );
}

async function synthesise(apiKey, text) {
  const response = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { ssml: `<speak><break time="${LEAD_IN_MS}ms"/>${escapeXml(text)}</speak>` },
      voice: { languageCode: LANGUAGE, name: VOICE },
      audioConfig: { audioEncoding: "MP3", speakingRate: SPEAKING_RATE },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${body.slice(0, 200)}`);
  }
  const payload = await response.json();
  if (!payload.audioContent) throw new Error("no audioContent in response");
  return Buffer.from(payload.audioContent, "base64");
}

async function main() {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_TTS_API_KEY is not set");

  const force = process.argv.includes("--force");
  const vocab = JSON.parse(await fs.readFile(VOCAB_PATH, "utf8"));
  const words = vocab.words ?? [];
  await fs.mkdir(OUT_DIR, { recursive: true });

  let written = 0;
  let skipped = 0;
  const failures = [];

  for (const word of words) {
    const outPath = path.join(OUT_DIR, `${word.id}.mp3`);
    if (!force && existsSync(outPath)) {
      skipped += 1;
      continue;
    }
    try {
      const audio = await synthesise(apiKey, word.traditional);
      if (audio.length < 256) throw new Error(`suspiciously small (${audio.length} bytes)`);
      await fs.writeFile(outPath, audio);
      written += 1;
    } catch (error) {
      failures.push(`${word.id} (${word.traditional}): ${error.message}`);
    }
  }

  for (const failure of failures) console.warn(`[google-tts] failed ${failure}`);
  console.log(
    `[google-tts] ${written} written, ${skipped} already present, ${failures.length} failed ` +
      `(of ${words.length} entries, voice ${VOICE})`
  );
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[google-tts] ${error.message}`);
  process.exitCode = 1;
});
