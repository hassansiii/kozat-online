"use client";

import { usePrefs } from "@/components/PreferencesProvider";

export function PendingContent({
  firstName,
  department,
  stage,
}: {
  firstName: string;
  department?: string | null;
  stage?: string | null;
}) {
  const { t } = usePrefs();

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="card animate-fade-up space-y-4 p-8 text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl"
          style={{
            background: "color-mix(in srgb, var(--warning) 16%, transparent)",
          }}
        >
          ⏳
        </div>
        <h1 className="text-2xl font-extrabold">{t("pendingTitle")}</h1>
        <p className="leading-8 text-[var(--muted)]">
          {t("welcome")} {firstName} — {t("pendingDesc")}
        </p>
        <p className="text-sm text-[var(--muted)]">
          {t("department")}: {department} — {t("stage")}: {stage}
        </p>
      </div>
    </main>
  );
}
