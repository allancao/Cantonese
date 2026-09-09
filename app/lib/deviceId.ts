const DEVICE_KEY = "jyut-dictation:device_id";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isSyncCode(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/**
 * The device id doubles as the sync code: a random UUID nobody can guess, working
 * like an unguessable share link. That is the whole auth model — no accounts, and
 * nothing sensitive behind it beyond vocabulary progress.
 */
export function getDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.localStorage.getItem(DEVICE_KEY);
    if (existing && isSyncCode(existing)) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, created);
    return created;
  } catch {
    return null;
  }
}

/** Adopting another device's code is how two devices end up sharing progress. */
export function setDeviceId(id: string): boolean {
  if (!isSyncCode(id)) return false;
  try {
    window.localStorage.setItem(DEVICE_KEY, id.trim().toLowerCase());
    return true;
  } catch {
    return false;
  }
}
