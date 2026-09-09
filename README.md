# Jyut Dictation

A web app for learning Cantonese vocabulary by ear. Hear a word, type what you heard,
then see the characters, the tone-coloured Jyutping and the English gloss. A Leitner
scheduler decides when each word comes back.

247 words across six levels, from `你好` to `塞翁失馬`.

## Two things that shape the whole project

**Jyutping, not pinyin.** Pinyin romanises Mandarin. Every romanisation here is Jyutping
with numeric tones (`nei5 hou2`).

**Tone, not stress.** Cantonese is tonal and has no English-style lexical stress, so there
is no stressed syllable to mark. What a learner needs marked is the tone of every
syllable, which is why each one is colour-coded 1–6 and carries a pitch-contour glyph.
The feedback separates *right word, wrong tone* from a plain miss for the same reason.

## Data

Vocabulary, readings and glosses come from **CC-Canto** and **CC-CEDICT** (Pleco Software
Inc.), licensed CC BY-SA 3.0 — attribution is a licence requirement and appears in the app
footer and on `/about`. No reading is hand-written: `scripts/build_vocab.py` joins the
hand-picked curriculum in `scripts/curriculum.py` against the dictionary and fails the
build if a word is not attested there.

```bash
git clone --depth 1 https://github.com/amadeusine/cc-canto-data.git
python3 scripts/build_vocab.py cc-canto-data     # rewrites app/data/vocab.json
```

`app/data/vocab.json` is committed, so this only needs re-running when the curriculum
changes. (Use the GitHub mirror above — `cantonese.org` is blocked by some egress proxies.)

## Audio

The browser's `SpeechSynthesis` API only speaks Cantonese if the visitor's device happens
to have a Cantonese voice installed, which is unreliable on iOS and inconsistent on
Android. So every clip is pre-rendered at build time by `scripts/generate-audio.mjs` using
espeak-ng compiled to WebAssembly (`text2wav` — no system binary, no API key, no cost).

The `yue-Latn-jyutping` voice reads Jyutping romanisation directly, tone numbers included,
so the audio matches the exact data the app displays. text2wav bundles an espeak-ng data
set that predates that voice, so the build drops in `scripts/espeak-voices/yue-Latn-jyutping`
first — the same definition upstream ships, reusing the bundled `zhy` tables.

`public/audio/` is gitignored and regenerated on every build (247 clips, ~8MB, a few
seconds). The script is non-fatal: if it fails the build still succeeds and the app falls
back to device speech synthesis, then to showing the characters as a text exercise.

Playback order lives in `app/lib/audio.ts`.

## Scheduling

Leitner boxes 1–5 in `localStorage`, intervals of 0, 1, 3, 7 and 16 days. Correct promotes,
incorrect resets to box 1, and **partial holds the box steady** — right word, wrong tone
shouldn't erase progress, but shouldn't advance it either. Box 5 counts as mastered.

Sessions serve due words first, then never-seen words, then least-recently-seen.

## Access control

`middleware.ts` gates the whole site behind HTTP Basic Auth. Vercel's own Password
Protection is a paid Pro add-on and is password-only, so this does the job instead:
real usernames, as many credentials as you like, free on any plan.

Set one environment variable in the Vercel project — comma-separated `user:password`
pairs:

```
BASIC_AUTH_USERS="allan:s3cret,gwen:h0nkhonk"
```

A username cannot contain `:` or `,`; a password cannot contain `,` (the first colon
separates each pair, so passwords may contain colons). Changing the variable takes
effect on the next request — no redeploy needed.

The gate covers every path, the audio clips and JS bundle included, not just the HTML.
Browsers replay credentials automatically, so it costs one prompt on first load.

**It fails closed.** If `BASIC_AUTH_USERS` is unset in production every request gets a
503 — a missing variable must never silently publish the site. Local `npm run dev`
skips the gate entirely so development needs no setup.

Turn Vercel Authentication off in the project's Deployment Protection settings once
this is live, or you'll be asked to log in twice.

## Sync

Supabase, no accounts. The client generates a random UUID stored as `device_id`; that UUID
*is* the sync code, working like an unguessable share link. Paste it into another device on
`/sync` to share progress. Writes are fire-and-forget so the UI never blocks or fails
offline; on load, remote rows merge with local and the newer `updated_at` wins per word.

The project URL and publishable key are committed in `app/lib/supabaseConfig.ts` — publishable
keys are designed to be public in frontend code, so the deploy needs no environment variables.

## Develop

```bash
npm install
npm run dev      # predev regenerates any missing audio
npm run build
npx eslint .
```

Next.js App Router, TypeScript, Tailwind, system font stacks (`next/font/google` fails
where Google Fonts is unreachable). Mobile-first — this is a phone study app.

## Licensing

CC-Canto and CC-CEDICT are CC BY-SA 3.0; derivative distributions of the dictionary data
inherit ShareAlike. espeak-ng is GPLv3 and is used only as a build-time generator producing
audio output, which does not impose GPL terms on the app itself.
