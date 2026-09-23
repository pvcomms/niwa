"use client";

import { useEffect, useState } from "react";
import type { ThemeName } from "@/lib/palette";

/**
 * The theme both views share. The layout's inline script has already painted
 * the stored choice onto <html> before first paint; this reads it back once,
 * and only then starts writing — writing first stored "paper" over the choice
 * on every load.
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeName>("paper");
  const [known, setKnown] = useState(false);

  useEffect(() => {
    if (document.documentElement.dataset.theme === "sumi") setTheme("sumi");
    setKnown(true);
  }, []);

  useEffect(() => {
    if (!known) return;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("niwa-theme", theme);
    } catch {
      /* private window */
    }
  }, [theme, known]);

  return [theme, setTheme] as const;
}
