"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { usePrefs } from "@/components/PreferencesProvider";

type LiveAttempt = {
  id: string;
  startedAt: string;
  endsAt: string;
  violationCount: number;
  student: { fullName: string; email: string; department: string | null };
  violations: Array<{ type: string; detail: string | null; createdAt: string }>;
  _count: { answers: number };
};

export default function LiveMonitorPage() {
  const params = useParams();
  const id = params.id as string;
  const { t, lang } = usePrefs();
  const [title, setTitle] = useState("");
  const [live, setLive] = useState<LiveAttempt[]>([]);
  const [qCount, setQCount] = useState(0);

  async function load() {
    const res = await fetch(`/api/admin/exams/${id}/live`);
    const data = await res.json();
    setTitle(data.exam?.title || "");
    setLive(data.live || []);
    setQCount(data.questionCount || 0);
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [id]);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">
            {lang === "en" ? "Live monitoring" : "المراقبة المباشرة"}
          </h1>
          <p className="text-sm text-[var(--muted)]">{title}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/exams/${id}/results`} className="btn btn-ghost">
            {t("results")}
          </Link>
          <Link href={`/admin/exams/${id}`} className="btn btn-secondary">
            {t("backToExam")}
          </Link>
        </div>
      </div>

      <p className="text-sm text-[var(--muted)]">
        {lang === "en"
          ? `${live.length} student(s) currently taking the exam (auto-refresh 5s)`
          : `${live.length} طالب يؤدي الاختبار الآن (تحديث كل 5 ثوانٍ)`}
      </p>

      {live.length === 0 && (
        <p className="card p-6 text-[var(--muted)]">
          {lang === "en" ? "No active attempts" : "لا توجد محاولات جارية"}
        </p>
      )}

      <div className="space-y-3">
        {live.map((a) => {
          const left = Math.max(0, new Date(a.endsAt).getTime() - Date.now());
          const mins = Math.floor(left / 60000);
          const secs = Math.floor((left % 60000) / 1000);
          return (
            <article key={a.id} className="card p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h2 className="font-bold">{a.student.fullName}</h2>
                  <p className="text-sm text-[var(--muted)]">
                    {a.student.email} — {a.student.department}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {lang === "en" ? "Started" : "بدأ"}: {formatDate(a.startedAt, lang)}
                  </p>
                </div>
                <div className="text-sm">
                  <p>
                    {lang === "en" ? "Remaining" : "المتبقي"}: {mins}:
                    {String(secs).padStart(2, "0")}
                  </p>
                  <p>
                    {lang === "en" ? "Answered" : "مجاب"}: {a._count.answers}/{qCount}
                  </p>
                  <p className="text-[var(--danger)]">
                    {t("violations")}: {a.violationCount}
                  </p>
                </div>
              </div>
              {a.violations.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-[var(--danger)]">
                  {a.violations.map((v, i) => (
                    <li key={i}>
                      {v.type} — {v.detail} ({formatDate(v.createdAt, lang)})
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
