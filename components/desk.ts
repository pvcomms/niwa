"use client";

import { useEffect, useState } from "react";
import type { About } from "@/lib/margin";

/**
 * What is on the desk right now — the stone open in the reader, the pathway
 * chosen on the alarm, the entry picked on the chronology — so that a note
 * written in the margin can say what it was about. Each view puts its own
 * thing down when the reader picks it, and clears it when they let go.
 */
let current: About | null = null;
const EVENT = "niwa-desk";

export function putOnDesk(about: About | null) {
  const same =
    (current === null && about === null) ||
    (current !== null &&
      about !== null &&
      current.kind === about.kind &&
      current.id === about.id &&
      current.label === about.label);
  if (same) return;
  current = about;
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent(EVENT));
}

export const onDesk = () => current;

export function useOnDesk(): About | null {
  const [about, setAbout] = useState<About | null>(null);
  useEffect(() => {
    setAbout(current);
    const sync = () => setAbout(current);
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return about;
}
