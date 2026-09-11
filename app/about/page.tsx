import Link from "next/link";
import { ToneLegend } from "../components/ToneLegend";

export const metadata = { title: "About — Jyut Dictation" };

export default function AboutPage() {
  return (
    <main>
      <Link
        href="/"
        className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        ← All levels
      </Link>

      <h1 className="mb-4 mt-3 text-2xl font-bold tracking-tight">About</h1>

      <div className="space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        <section>
          <h2 className="mb-1.5 font-semibold text-slate-900 dark:text-slate-100">How it works</h2>
          <p>
            Each round plays a Cantonese word or phrase. Type what you heard — either the
            Jyutping romanisation (<code>nei5 hou2</code>) or the Chinese characters
            (你好), whichever you are practising. The answer then shows the characters,
            the tone-coloured Jyutping and the English meaning.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 font-semibold text-slate-900 dark:text-slate-100">
            Why tones, not stress
          </h2>
          <p>
            Cantonese is a tonal language: it has no English-style lexical stress, so
            there is no &ldquo;stressed syllable&rdquo; to mark. What changes meaning is
            the pitch contour of every syllable. Each one here is colour-coded by its
            tone and carries a small glyph tracing its pitch, so 詩 <em>si1</em> and 時{" "}
            <em>si4</em> stay visibly distinct.
          </p>
          <p className="mt-2">
            That is also why the feedback separates <em>right word, wrong tone</em> from a
            plain miss — it is the single most useful thing the app can tell you.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 font-semibold text-slate-900 dark:text-slate-100">
            Answering out loud
          </h2>
          <p>
            <em>Speak</em> mode is pronunciation practice rather than recall: the
            Jyutping and the characters are shown up front, so you know exactly what
            to say, and the score is only about how you say it. It uses your
            browser&apos;s own speech recognition — Chrome, Edge and Safari have it;
            Firefox doesn&apos;t — and it needs a connection.
          </p>
          <p className="mt-2">
            Grading works by romanising what the recogniser heard and comparing it
            syllable by syllable. Say the wrong tone and a recogniser trained on native
            speech hears a different word — 睡 <em>seoi6</em> instead of 水{" "}
            <em>seoi2</em> — and that word&apos;s reading is what reveals the slip, so
            the app can tell you which syllable went astray.
          </p>
          <p className="mt-2">
            Worth being clear about what that is: a measure of whether a recogniser
            understood you as saying the right word, not a phonetic analysis of your
            voice. It catches wrong tones and wrong syllables well. It can&apos;t tell
            you that an otherwise-correct vowel was a little too open.
          </p>
          <p className="mt-2">
            If your browser refuses — iOS in particular is inconsistent about this —
            switch to <em>Type</em> and use the microphone key on your own keyboard
            instead. Your device dictates straight into the answer box, and the app
            grades it identically. On iOS that needs a Cantonese keyboard added under
            Settings → General → Keyboard.
          </p>
          <p className="mt-2">
            One thing to know: recognition returns characters, not Jyutping, so a spoken
            answer can&apos;t be marked for tone the way a typed one can. It is still a
            real tone check, just an indirect one — say the wrong tone and the recogniser
            usually hears a different word, which comes back as a miss. For explicit
            per-syllable tone feedback, type the Jyutping.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 font-semibold text-slate-900 dark:text-slate-100">Scheduling</h2>
          <p>
            Words move through five Leitner boxes with intervals of 0, 1, 3, 7 and 16 days.
            A correct answer promotes a word, a miss sends it back to the first box, and
            getting the word right but the tone wrong holds it where it is — that shouldn&apos;t
            erase progress, but it shouldn&apos;t advance it either. Box five counts as mastered.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 font-semibold text-slate-900 dark:text-slate-100">Audio</h2>
          <p>
            Every clip is pre-rendered at build time with espeak-ng, using a voice that
            reads Jyutping directly, tone numbers included — so what you hear matches the
            reading shown exactly. It is synthetic and robotic, but tonally correct. If a
            clip cannot be fetched the app falls back to your device&apos;s own Cantonese
            voice, and failing that shows the characters so the round still works.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 font-semibold text-slate-900 dark:text-slate-100">
            Progress and sync
          </h2>
          <p>
            Progress is kept on your device. To carry it to a phone or tablet, open{" "}
            <Link href="/sync" className="underline">
              Sync
            </Link>{" "}
            and copy the code across — there are no accounts and nothing to sign up for.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 font-semibold text-slate-900 dark:text-slate-100">Credits</h2>
          <p>
            All 247 words, their Jyutping readings and their glosses come from{" "}
            <a
              className="underline"
              href="https://cantonese.org"
              target="_blank"
              rel="noreferrer"
            >
              CC-Canto and CC-CEDICT
            </a>
            , published by Pleco Software Inc. under a Creative Commons
            Attribution-ShareAlike 3.0 licence. Nothing here is invented: every reading is
            dictionary-sourced.
          </p>
        </section>
      </div>

      <div className="mt-8">
        <ToneLegend />
      </div>
    </main>
  );
}
