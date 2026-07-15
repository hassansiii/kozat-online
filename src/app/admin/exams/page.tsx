"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDate, formatDuration } from "@/lib/utils";
import { usePrefs } from "@/components/PreferencesProvider";

type Exam = {
  id: string;
  title: string;
  subjectName: string | null;
  status: string;
  durationMinutes: number;
  createdAt: string;
  _count: { questions: number; attempts: number; assignments: number };
};

export default function AdminExamsPage() {
  const { t, lang } = usePrefs();
  const [exams, setExams] = useState<Exam[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/exams");
    const data = await res.json();
    setExams(data.exams || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function deleteExam(exam: Exam) {
    const ok = confirm(`${t("deleteExamConfirm")}\n${exam.title}`);
    if (!ok) return;

    setDeletingId(exam.id);
    const res = await fetch(`/api/admin/exams/${exam.id}`, { method: "DELETE" });
    setDeletingId(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || t("deleteFailed"));
      return;
    }

    setExams((prev) => prev.filter((e) => e.id !== exam.id));
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{t("exams")}</h1>
          <p className="text-sm text-[var(--muted)]">{t("examsManageSub")}</p>
        </div>
        <Link href="/admin/exams/new" className="btn btn-primary">
          {t("newExamShort")}
        </Link>
      </div>

      <div className="space-y-3">
        {exams.length === 0 && (
          <p className="card p-6 text-[var(--muted)]">{t("noExamsYet")}</p>
        )}
        {exams.map((exam) => (
          <article key={exam.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{exam.title}</h2>
                {exam.subjectName && (
                  <p className="mt-1 text-sm text-[var(--primary)]">
                    المادة: {exam.subjectName}
                  </p>
                )}
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {t("duration")}: {formatDuration(exam.durationMinutes, lang)} —{" "}
                  {exam._count.questions} {t("questionsCount")} —{" "}
                  {exam._count.assignments} {t("assignedStudents")} —{" "}
                  {exam._count.attempts} {t("attempts")}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {t("createdAt")} {formatDate(exam.createdAt, lang)}
                </p>
              </div>
              <span
                className={`badge ${
                  exam.status === "PUBLISHED" ? "badge-published" : "badge-draft"
                }`}
              >
                {exam.status === "PUBLISHED"
                  ? t("published")
                  : exam.status === "CLOSED"
                    ? t("closed")
                    : t("draft")}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/admin/exams/${exam.id}`} className="btn btn-secondary">
                {t("manageQuestions")}
              </Link>
              <Link
                href={`/admin/exams/${exam.id}/results`}
                className="btn btn-ghost"
              >
                {t("results")}
              </Link>
              <Link
                href={`/admin/exams/${exam.id}/live`}
                className="btn btn-ghost"
              >
                {lang === "en" ? "Live" : "مراقبة"}
              </Link>
              {exam.status === "PUBLISHED" && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={async () => {
                    await fetch(`/api/admin/exams/${exam.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "CLOSED" }),
                    });
                    await load();
                  }}
                >
                  {t("closed")}
                </button>
              )}
              <button
                type="button"
                className="btn btn-danger"
                disabled={deletingId === exam.id}
                onClick={() => deleteExam(exam)}
              >
                {deletingId === exam.id ? t("deleting") : t("delete")}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
