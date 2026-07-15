"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { type Lang, type Theme, t as translate } from "@/lib/i18n";

type Prefs = {
  lang: Lang;
  theme: Theme;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  t: (key: string) => string;
  dir: "rtl" | "ltr";
};

const PrefsContext = createContext<Prefs | null>(null);

function applyDom(lang: Lang, theme: Theme) {
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === "ar" ? "rtl" : "ltr";
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const savedLang = (localStorage.getItem("kozat_lang") as Lang) || "ar";
    const savedTheme =
      (localStorage.getItem("kozat_theme") as Theme) ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    const nextLang = savedLang === "en" ? "en" : "ar";
    const nextTheme = savedTheme === "dark" ? "dark" : "light";
    setLangState(nextLang);
    setThemeState(nextTheme);
    applyDom(nextLang, nextTheme);
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    localStorage.setItem("kozat_lang", next);
    applyDom(next, (localStorage.getItem("kozat_theme") as Theme) || "light");
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem("kozat_theme", next);
    applyDom(
      (localStorage.getItem("kozat_lang") as Lang) || "ar",
      next
    );
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next = prev === "ar" ? "en" : "ar";
      localStorage.setItem("kozat_lang", next);
      applyDom(next, (localStorage.getItem("kozat_theme") as Theme) || theme);
      return next;
    });
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("kozat_theme", next);
      applyDom((localStorage.getItem("kozat_lang") as Lang) || lang, next);
      return next;
    });
  }, [lang]);

  const value = useMemo<Prefs>(
    () => ({
      lang,
      theme,
      setLang,
      toggleLang,
      setTheme,
      toggleTheme,
      t: (key: string) => translate(lang, key),
      dir: lang === "ar" ? "rtl" : "ltr",
    }),
    [lang, theme, setLang, toggleLang, setTheme, toggleTheme]
  );

  return (
    <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
  );
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used within PreferencesProvider");
  return ctx;
}

export function useT() {
  return usePrefs().t;
}
