"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDate, studyTypeLabel } from "@/lib/utils";
import { usePrefs } from "@/components/PreferencesProvider";

type Attempt = {
  id: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  violationCount: number;
  startedAt: string;
  submittedAt: string | null;
  student: {
    fullName: string;
    email: string;
    department: string | null;
    studyType: "MORNING" | "EVENING" | null;
  };
  violations: Array<{ id: string; type: string; detail: string | null; createdAt: string }>;
};

export default function ExamResultsPage() {
  const params = useParams();
  const id = params.id as string;
  const { t, lang } = usePrefs();
  const [examTitle, setExamTitle] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/exams/${id}/results`)
      .then((r) => r.json())
      .then((d) => {
        setExamTitle(d.exam?.title || "");
        setAttempts(d.attempts || []);
      });
  }, [id]);

  async function downloadPdf() {
    setPdfLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/exams/${id}/export-pdf`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "تعذر تحميل PDF");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `results-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("تعذر تحميل ملف PDF");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{t("examResults")}</h1>
          <p className="text-sm text-[var(--muted)]">{examTitle}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={downloadPdf}
            disabled={pdfLoading}
          >
            {pdfLoading
              ? lang === "en"
                ? "Downloading…"
                : "جارٍ التحميل…"
              : lang === "en"
                ? "Export PDF"
                : "تصدير PDF"}
          </button>
          <a
            href={`/api/admin/exams/${id}/export`}
            className="btn btn-secondary"
          >
            {lang === "en" ? "Export CSV" : "تصدير CSV"}
          </a>
          <Link href={`/admin/exams/${id}/live`} className="btn btn-ghost">
            {lang === "en" ? "Live" : "مراقبة"}
          </Link>
          <Link href={`/admin/exams/${id}`} className="btn btn-ghost">
            {t("backToExam")}
          </Link>
        </div>
      </div>

      {error && (
        <p
          className="rounded-xl px-3 py-2 text-sm text-[var(--danger)]"
          style={{
            background: "color-mix(in srgb, var(--danger) 12%, transparent)",
          }}
        >
          {error}
        </p>
      )}

      {attempts.length === 0 && (
        <p className="card p-6 text-[var(--muted)]">{t("noAttempts")}</p>
      )}

      <div className="space-y-3">
        {attempts.map((a) => (
          <article key={a.id} className="card p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="font-bold">{a.student.fullName}</h2>
                <p className="text-sm text-[var(--muted)]">
                  {a.student.email} — {a.student.department} —{" "}
                  {studyTypeLabel(a.student.studyType, lang)}
                </p>
              </div>
              <div className="text-start">
                <p className="text-xl font-extrabold text-[var(--primary)]">
                  {a.score ?? "—"} / {a.maxScore ?? "—"}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {t("violations")}: {a.violationCount}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {t("started")}: {formatDate(a.startedAt, lang)} — {t("submitted")}:{" "}
              {a.submittedAt ? formatDate(a.submittedAt, lang) : t("notSubmittedYet")} —{" "}
              {t("status")}: {a.status}
            </p>
            {a.violations.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-[var(--danger)]">
                {a.violations.map((v) => (
                  <li key={v.id}>
                    {v.type} — {v.detail || ""} ({formatDate(v.createdAt, lang)})
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
