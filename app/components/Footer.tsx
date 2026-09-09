import Link from "next/link";

/**
 * The CC BY-SA 3.0 licence on CC-Canto requires attribution in the app itself,
 * not just in the repository, so this renders on every page.
 */
export function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-200 pt-6 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <p>
        Vocabulary, readings and glosses from{" "}
        <a
          className="underline hover:text-slate-700 dark:hover:text-slate-200"
          href="https://cantonese.org"
          target="_blank"
          rel="noreferrer"
        >
          CC-Canto and CC-CEDICT
        </a>{" "}
        (Pleco Software Inc.), licensed CC BY-SA 3.0.
      </p>
      <nav className="mt-3 flex gap-4">
        <Link className="underline hover:text-slate-700 dark:hover:text-slate-200" href="/">
          Levels
        </Link>
        <Link className="underline hover:text-slate-700 dark:hover:text-slate-200" href="/about">
          About
        </Link>
        <Link className="underline hover:text-slate-700 dark:hover:text-slate-200" href="/sync">
          Sync
        </Link>
      </nav>
    </footer>
  );
}
