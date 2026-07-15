"use client";

import { useEffect } from "react";

type ThemeColors = {
  primaryColor?: string;
  primaryDark?: string;
  accentColor?: string;
};

function applyColors(colors: ThemeColors) {
  const root = document.documentElement;
  if (colors.primaryColor) root.style.setProperty("--primary", colors.primaryColor);
  if (colors.primaryDark) root.style.setProperty("--primary-dark", colors.primaryDark);
  if (colors.accentColor) root.style.setProperty("--accent", colors.accentColor);
}

export function SiteTheme({
  initial,
}: {
  initial?: ThemeColors | null;
}) {
  useEffect(() => {
    if (initial) applyColors(initial);

    async function load() {
      try {
        const res = await fetch("/api/site-settings");
        const data = await res.json();
        if (data.settings) applyColors(data.settings);
      } catch {
        // ignore
      }
    }

    load();
    window.addEventListener("kozat-site-settings-updated", load);
    return () => window.removeEventListener("kozat-site-settings-updated", load);
  }, [initial]);

  return null;
}
