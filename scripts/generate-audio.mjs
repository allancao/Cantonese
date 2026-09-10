/**
 * Pre-render one WAV per vocabulary entry with espeak-ng compiled to WebAssembly.
 *
 * The browser's SpeechSynthesis API only speaks Cantonese if the visitor's device
 * happens to have a Cantonese voice installed, which is unreliable on iOS and
 * inconsistent on Android — unusable as the primary path for a listening app. So
 * every clip is rendered at build time instead.
 *
 * The `yue-Latn-jyutping` voice reads Jyutping romanisation directly, tone numbers
 * included, so the audio matches the exact data the app displays with no
 * character-to-reading ambiguity.
 *
 * This script is deliberately NON-FATAL: any failure logs a warning and lets the
 * build continue, because a deployment without audio still works as a text
 * exercise via the fallbacks in app/lib/audio.ts.
 */

import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VOCAB_PATH = path.join(ROOT, "app", "data", "vocab.json");
const OUT_DIR = path.join(ROOT, "public", "audio");
const VOICE = "yue-Latn-jyutping";
const SPEED = 135;

/**
 * espeak-ng starts speaking within ~5ms of sample zero, but phone audio hardware
 * takes 100-300ms to wake on the first play, which swallows the opening syllable —
 * "nei5 hou2" arrives as "hou2". Padding the front gives the device time to spin up
 * before any speech happens.
 */
const LEAD_IN_MS = 300;

/** Insert silence at the start of a PCM WAV, fixing the RIFF and data chunk sizes. */
function padWithSilence(wav, milliseconds) {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const channels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);

  let offset = 12;
  while (offset + 8 <= wav.length) {
    const id = String.fromCharCode(...wav.subarray(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    if (id === "data") break;
    offset += 8 + size + (size % 2);
  }
  if (offset + 8 > wav.length) throw new Error("no data chunk in WAV");

  const bytesPerFrame = channels * (bitsPerSample / 8);
  const silenceBytes =
    Math.round((sampleRate * milliseconds) / 1000) * bytesPerFrame;

  const padded = new Uint8Array(wav.length + silenceBytes);
  padded.set(wav.subarray(0, offset + 8), 0);
  // The gap stays zero-filled, which is silence for signed PCM.
  padded.set(wav.subarray(offset + 8), offset + 8 + silenceBytes);

  const out = new DataView(padded.buffer);
  out.setUint32(4, padded.length - 8, true);
  out.setUint32(offset + 4, view.getUint32(offset + 4, true) + silenceBytes, true);
  return padded;
}

/**
 * text2wav bundles an espeak-ng data set that predates the jyutping voice: it ships
 * `yue`, whose `dictrules 1` reads Latin letters as English words, so "nei5 hou2"
 * comes out spelled letter by letter. This drops in the same voice definition
 * upstream espeak-ng uses, which differs only in `dictrules 2` (read as jyutping)
 * and reuses the zhy translator, phonemes and dictionary that ARE bundled.
 * node_modules is rebuilt on every deploy, so this has to run before generating.
 */
async function installJyutpingVoice() {
  const require = createRequire(import.meta.url);
  const pkg = require.resolve("text2wav/package.json");
  const dest = path.join(path.dirname(pkg), "espeak-ng-data", "lang", "sit", VOICE);
  const src = path.join(ROOT, "scripts", "espeak-voices", VOICE);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
}

async function main() {
  const vocab = JSON.parse(await fs.readFile(VOCAB_PATH, "utf8"));
  const words = vocab.words ?? [];
  await fs.mkdir(OUT_DIR, { recursive: true });
  await installJyutpingVoice();

  // Each synthesis instantiates a fresh WASM module that registers its own process
  // listeners, which trips the default max-listeners warning after ten clips.
  process.setMaxListeners(0);
  const text2wav = (await import("text2wav")).default;

  let generated = 0;
  let present = 0;
  let failed = 0;

  for (const word of words) {
    const outPath = path.join(OUT_DIR, `${word.id}.wav`);
    // A committed neural clip always wins, so don't spend time on a fallback for it.
    if (existsSync(path.join(OUT_DIR, `${word.id}.mp3`)) || existsSync(outPath)) {
      present += 1;
      continue;
    }
    try {
      const wav = await text2wav(word.jyutping, { voice: VOICE, speed: SPEED });
      if (!wav || wav.length < 64) {
        throw new Error(`empty output (${wav ? wav.length : 0} bytes)`);
      }
      await fs.writeFile(outPath, Buffer.from(padWithSilence(wav, LEAD_IN_MS)));
      generated += 1;
    } catch (error) {
      failed += 1;
      console.warn(`[audio] failed ${word.id} (${word.jyutping}): ${error.message}`);
    }
  }

  console.log(
    `[audio] ${generated} generated, ${present} already present, ${failed} failed ` +
      `(of ${words.length} entries)`
  );
}

main().catch((error) => {
  console.warn(`[audio] skipped: ${error.message}`);
  console.warn("[audio] build continues; the app falls back to speech synthesis.");
});
