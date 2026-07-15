"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePrefs } from "@/components/PreferencesProvider";

type SiteSettings = {
  homeTag: string;
  homeTitle: string;
  homeDesc: string;
  featuresTitle: string;
  feature1: string;
  feature2: string;
  feature3: string;
  feature4: string;
  feature5: string;
  panelFrom: string;
  panelVia: string;
  panelTo: string;
};

export function HomeContent({
  isLoggedIn,
  role,
  status,
  initialSettings,
}: {
  isLoggedIn?: boolean;
  role?: string;
  status?: string;
  initialSettings?: SiteSettings | null;
}) {
  const { t, lang } = usePrefs();
  const [settings, setSettings] = useState<SiteSettings | null>(
    initialSettings || null
  );

  useEffect(() => {
    function load() {
      fetch("/api/site-settings")
        .then((r) => r.json())
        .then((d) => {
          if (d.settings) setSettings(d.settings);
        })
        .catch(() => {});
    }
    load();
    window.addEventListener("kozat-site-settings-updated", load);
    return () => window.removeEventListener("kozat-site-settings-updated", load);
  }, []);

  const dashboardHref =
    role === "ADMIN"
      ? "/admin"
      : status === "APPROVED"
        ? "/student"
        : "/pending";

  const tag = settings?.homeTag || t("homeTag");
  const title = settings?.homeTitle || t("homeTitle");
  const desc = settings?.homeDesc || t("homeDesc");
  const featuresTitle = settings?.featuresTitle || t("homeFeaturesTitle");
  const features = [
    settings?.feature1 || t("feature1"),
    settings?.feature2 || t("feature2"),
    settings?.feature3 || t("feature3"),
    settings?.feature4 || t("feature4"),
    settings?.feature5 || t("feature5"),
  ];
  const panelFrom = settings?.panelFrom || "#0d6e5b";
  const panelVia = settings?.panelVia || "#0a5546";
  const panelTo = settings?.panelTo || "#1a3a32";

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-2 lg:items-center">
      <section className="animate-fade-up space-y-6">
        <p className="text-sm font-bold tracking-wide text-[var(--accent)]">
          {tag}
        </p>
        <h1 className="text-4xl font-extrabold leading-tight text-[var(--fg)] md:text-5xl">
          {title}
        </h1>
        <p className="max-w-xl text-lg leading-8 text-[var(--muted)]">{desc}</p>

        <div className="flex flex-wrap gap-3">
          {!isLoggedIn ? (
            <>
              <Link href="/register" className="btn btn-primary">
                {t("createAccount")}
              </Link>
              <Link href="/login" className="btn btn-secondary">
                {t("login")}
              </Link>
            </>
          ) : (
            <Link href={dashboardHref} className="btn btn-primary">
              {lang === "en" ? "Go to dashboard" : "الانتقال للوحة التحكم"}
            </Link>
          )}
        </div>
      </section>

      <section className="animate-fade-up card relative overflow-hidden p-8 [animation-delay:120ms]">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background: `linear-gradient(145deg, ${panelFrom} 0%, ${panelVia} 45%, ${panelTo} 100%)`,
          }}
        />
        <div className="relative space-y-5 text-white">
          <h2 className="text-2xl font-bold">{featuresTitle}</h2>
          <ul className="space-y-3 text-sm leading-7 text-white/90">
            {features.map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
