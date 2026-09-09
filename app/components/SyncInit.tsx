"use client";

import { useEffect } from "react";
import { getDeviceId } from "../lib/deviceId";
import { pullProgress } from "../lib/sync";

export const PROGRESS_EVENT = "jyut-dictation:progress-updated";

/**
 * Claims a device id on first visit and merges anything the server already holds for
 * it. Runs once per page load and never blocks rendering — if the network is gone,
 * the local progress the app already has is simply what gets used.
 */
export function SyncInit() {
  useEffect(() => {
    getDeviceId();
    let cancelled = false;
    void pullProgress().then((result) => {
      if (!cancelled && result.ok && result.merged > 0) {
        window.dispatchEvent(new Event(PROGRESS_EVENT));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
