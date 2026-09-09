"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PROGRESS_EVENT } from "../components/SyncInit";
import { getDeviceId, isSyncCode, setDeviceId } from "../lib/deviceId";
import { pullProgress, pushAllProgress } from "../lib/sync";

type Status = { kind: "idle" | "busy" | "ok" | "error"; message: string };

export default function SyncPage() {
  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });

  useEffect(() => {
    setCode(getDeviceId());
  }, []);

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatus({ kind: "error", message: "Couldn't copy — select the code and copy it manually." });
    }
  }

  async function adopt() {
    const trimmed = input.trim().toLowerCase();
    if (!isSyncCode(trimmed)) {
      setStatus({ kind: "error", message: "That doesn't look like a sync code." });
      return;
    }
    setStatus({ kind: "busy", message: "Fetching progress…" });
    if (!setDeviceId(trimmed)) {
      setStatus({ kind: "error", message: "This browser won't let the app store the code." });
      return;
    }
    const result = await pullProgress(trimmed);
    if (!result.ok) {
      setStatus({ kind: "error", message: result.error ?? "Couldn't reach the server." });
      return;
    }
    // Anything this device knew that the code didn't now belongs to the shared code.
    await pushAllProgress();
    setCode(trimmed);
    setInput("");
    window.dispatchEvent(new Event(PROGRESS_EVENT));
    setStatus({
      kind: "ok",
      message:
        result.merged > 0
          ? `Synced — ${result.merged} words updated from the other device.`
          : "Synced — this device now shares that code.",
    });
  }

  return (
    <main>
      <Link
        href="/"
        className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        ← All levels
      </Link>

      <h1 className="mb-2 mt-3 text-2xl font-bold tracking-tight">Sync</h1>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
        Copy this code to your other phone or device to keep your progress in sync — no
        account needed.
      </p>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          This device&apos;s code
        </h2>
        <p className="mt-2 break-all rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs dark:bg-slate-950">
          {code ?? "…"}
        </p>
        <button
          type="button"
          onClick={() => void copy()}
          disabled={!code}
          className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          {copied ? "Copied" : "Copy code"}
        </button>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Use a code from another device
        </h2>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="paste the code here"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono text-xs outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-slate-400"
        />
        <button
          type="button"
          onClick={() => void adopt()}
          disabled={status.kind === "busy"}
          className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-50 dark:border-slate-700"
        >
          {status.kind === "busy" ? "Syncing…" : "Sync with this code"}
        </button>
        {status.message ? (
          <p
            className={`mt-3 text-xs ${
              status.kind === "error"
                ? "text-rose-600 dark:text-rose-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {status.message}
          </p>
        ) : null}
      </section>

      <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        The code is a random identifier that acts like an unguessable share link. Anyone
        holding it can read and write that progress, so treat it like a link you&apos;d
        rather not post publicly. Only vocabulary progress is stored — no personal data.
      </p>
    </main>
  );
}
