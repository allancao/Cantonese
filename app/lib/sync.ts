import { getDeviceId } from "./deviceId";
import { loadProgress, saveProgress } from "./srs";
import { supabase } from "./supabase";
import type { ProgressState, WordProgress } from "./types";

interface RemoteRow {
  device_id: string;
  word_id: string;
  box: number;
  due_at: string;
  correct_count: number;
  incorrect_count: number;
  last_seen_at: string;
  updated_at: string;
}

function toWordProgress(row: RemoteRow): WordProgress {
  return {
    box: row.box,
    dueAt: row.due_at,
    correctCount: row.correct_count,
    incorrectCount: row.incorrect_count,
    lastSeenAt: row.last_seen_at,
    updatedAt: row.updated_at,
  };
}

function toRow(deviceId: string, wordId: string, progress: WordProgress): RemoteRow {
  return {
    device_id: deviceId,
    word_id: wordId,
    box: progress.box,
    due_at: progress.dueAt,
    correct_count: progress.correctCount,
    incorrect_count: progress.incorrectCount,
    last_seen_at: progress.lastSeenAt,
    updated_at: progress.updatedAt,
  };
}

/**
 * Fire-and-forget: localStorage is the fast source of truth during a session, so a
 * failed upsert (offline, blocked, rate-limited) must never block or fail the UI.
 */
export function pushProgress(wordId: string, progress: WordProgress): void {
  const deviceId = getDeviceId();
  if (!deviceId) return;
  void supabase()
    .from("word_progress")
    .upsert(toRow(deviceId, wordId, progress), { onConflict: "device_id,word_id" })
    .then(undefined, () => undefined);
}

/** Newest write wins per word, so either device can be ahead on any given word. */
export function mergeRemote(
  local: ProgressState,
  rows: RemoteRow[]
): { state: ProgressState; changed: number } {
  const words = { ...local.words };
  let changed = 0;
  for (const row of rows) {
    const incoming = toWordProgress(row);
    const existing = words[row.word_id];
    if (!existing || new Date(incoming.updatedAt) > new Date(existing.updatedAt)) {
      words[row.word_id] = incoming;
      changed += 1;
    }
  }
  return { state: { ...local, words }, changed };
}

export interface PullResult {
  ok: boolean;
  merged: number;
  error?: string;
}

/** Pull this device's rows and merge them into local progress. */
export async function pullProgress(deviceId?: string): Promise<PullResult> {
  const id = deviceId ?? getDeviceId();
  if (!id) return { ok: false, merged: 0, error: "No sync code on this device." };

  try {
    const { data, error } = await supabase()
      .from("word_progress")
      .select("*")
      .eq("device_id", id);
    if (error) return { ok: false, merged: 0, error: error.message };

    const { state, changed } = mergeRemote(loadProgress(), (data ?? []) as RemoteRow[]);
    saveProgress(state);
    return { ok: true, merged: changed };
  } catch (error) {
    return { ok: false, merged: 0, error: (error as Error).message };
  }
}

/** Upload every locally-known word, so a freshly adopted code inherits this device. */
export async function pushAllProgress(): Promise<PullResult> {
  const deviceId = getDeviceId();
  if (!deviceId) return { ok: false, merged: 0, error: "No sync code on this device." };

  const local = loadProgress();
  const rows = Object.entries(local.words).map(([wordId, progress]) =>
    toRow(deviceId, wordId, progress)
  );
  if (rows.length === 0) return { ok: true, merged: 0 };

  try {
    const { error } = await supabase()
      .from("word_progress")
      .upsert(rows, { onConflict: "device_id,word_id" });
    if (error) return { ok: false, merged: 0, error: error.message };
    return { ok: true, merged: rows.length };
  } catch (error) {
    return { ok: false, merged: 0, error: (error as Error).message };
  }
}
