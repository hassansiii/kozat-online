"use client";

import Link from "next/link";
import { usePrefs } from "@/components/PreferencesProvider";

export function StudentHome({
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
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-extrabold">
          {t("welcome")}، {firstName}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {department} — {stage}
        </p>
      </div>

      <div className="card space-y-4 p-6">
        <h2 className="font-bold">{t("examInstructions")}</h2>
        <ul className="space-y-2 text-sm leading-7 text-[var(--muted)]">
          <li>• {t("instr1")}</li>
          <li>• {t("instr2")}</li>
          <li>• {t("instr3")}</li>
          <li>• {t("instr4")}</li>
        </ul>
        <Link href="/student/exams" className="btn btn-primary">
          {t("viewMyExams")}
        </Link>
      </div>
    </div>
  );
}
