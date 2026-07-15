"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDate, formatDuration } from "@/lib/utils";
import { usePrefs } from "@/components/PreferencesProvider";

type Exam = {
  id: string;
  title: string;
  subjectName: string | null;
  description: string | null;
  durationMinutes: number;
  startsAt: string | null;
  endsAt: string | null;
  questionCount: number;
  maxViolations: number;
  attempt: {
    id: string;
    status: string;
    score: number | null;
    maxScore: number | null;
  } | null;
};

export default function StudentExamsPage() {
  const { t, lang } = usePrefs();
  const [exams, setExams] = useState<Exam[]>([]);

  useEffect(() => {
    fetch("/api/student/exams")
      .then((r) => r.json())
      .then((d) => setExams(d.exams || []));
  }, []);

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-extrabold">{t("myExams")}</h1>
        <p className="text-sm text-[var(--muted)]">{t("myExamsSub")}</p>
      </div>

      <div className="space-y-3">
        {exams.length === 0 && (
          <p className="card p-6 text-[var(--muted)]">{t("noExams")}</p>
        )}
        {exams.map((exam) => {
          const done = exam.attempt && exam.attempt.status !== "IN_PROGRESS";
          return (
            <article key={exam.id} className="card p-4">
              <h2 className="text-lg font-bold">{exam.title}</h2>
              {exam.subjectName && (
                <p className="mt-1 text-sm font-semibold text-[var(--primary)]">
                  المادة: {exam.subjectName}
                </p>
              )}
              <p className="mt-1 text-sm text-[var(--muted)]">{exam.description}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {t("duration")}: {formatDuration(exam.durationMinutes, lang)} —{" "}
                {exam.questionCount} {t("questionsCount")} — {t("maxViolations")}:{" "}
                {exam.maxViolations}
              </p>
              <p className="text-xs text-[var(--muted)]">
                {formatDate(exam.startsAt, lang)} → {formatDate(exam.endsAt, lang)}
              </p>

              <div className="mt-3">
                {done ? (
                  <p className="font-bold text-[var(--primary)]">
                    {t("score")}: {exam.attempt?.score}/{exam.attempt?.maxScore}
                  </p>
                ) : (
                  <Link href={`/exam/${exam.id}`} className="btn btn-primary">
                    {exam.attempt?.status === "IN_PROGRESS"
                      ? t("continueExam")
                      : t("startExam")}
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
