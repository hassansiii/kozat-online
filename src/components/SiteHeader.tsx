"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, GraduationCap, Languages, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { usePrefs } from "@/components/PreferencesProvider";

type User = {
  id: string;
  fullName: string;
  role: "ADMIN" | "STUDENT";
  status: string;
};

export function SiteHeader({ user: initialUser }: { user: User | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, lang, theme, toggleLang, toggleTheme } = usePrefs();
  const [user, setUser] = useState<User | null>(initialUser);
  const [unread, setUnread] = useState(0);

  const [brandName, setBrandName] = useState("");

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    function loadBrand() {
      fetch("/api/site-settings")
        .then((r) => r.json())
        .then((d) => {
          if (d.settings?.brandName) setBrandName(d.settings.brandName);
        })
        .catch(() => {});
    }
    loadBrand();
    window.addEventListener("kozat-site-settings-updated", loadBrand);
    return () =>
      window.removeEventListener("kozat-site-settings-updated", loadBrand);
  }, []);

  useEffect(() => {
    if (!initialUser) {
      setUser(null);
      return;
    }
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUser(d.user);
      })
      .catch(() => {});
  }, [initialUser, pathname]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setUnread(d.unreadCount || 0))
      .catch(() => {});
  }, [user, pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const home =
    user?.role === "ADMIN"
      ? "/admin"
      : user?.status === "APPROVED"
        ? "/student"
        : user
          ? "/pending"
          : "/";

  const displayName = user?.fullName?.trim() || "";
  const roleLabel =
    user?.role === "ADMIN"
      ? lang === "en"
        ? "Doctor"
        : "دكتور"
      : lang === "en"
        ? "Student"
        : "طالب";

  return (
    <header className="site-header sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href={home} className="flex items-center gap-2 font-bold text-[var(--primary)]">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
            <GraduationCap size={18} />
          </span>
          <span className="text-lg">{brandName || t("brand")}</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <button
            type="button"
            className="btn-icon"
            onClick={toggleLang}
            title={lang === "ar" ? t("switchToEnglish") : t("switchToArabic")}
            aria-label={lang === "ar" ? t("switchToEnglish") : t("switchToArabic")}
          >
            <Languages size={17} />
          </button>

          <button
            type="button"
            className="btn-icon"
            onClick={toggleTheme}
            title={theme === "light" ? t("darkMode") : t("lightMode")}
            aria-label={theme === "light" ? t("darkMode") : t("lightMode")}
          >
            {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
          </button>

          {!user && (
            <>
              <Link className="btn btn-ghost" href="/login">
                {t("login")}
              </Link>
              <Link className="btn btn-primary" href="/register">
                {t("registerStudent")}
              </Link>
            </>
          )}

          {user && (
            <>
              <div className="hidden text-end sm:block">
                <p className="max-w-[220px] truncate font-bold text-[var(--fg)]" title={displayName}>
                  {displayName}
                </p>
                <p className="text-xs text-[var(--muted)]">{roleLabel}</p>
              </div>
              <Link
                href={user.role === "ADMIN" ? "/admin/notifications" : "/student/notifications"}
                className="relative btn-icon"
                title={t("notifications")}
              >
                <Bell size={17} />
                {unread > 0 && (
                  <span className="absolute -top-1 -start-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] text-white">
                    {unread}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={logout}
                className="btn-icon"
                title={t("logout")}
              >
                <LogOut size={17} />
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
