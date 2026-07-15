"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Choice = { id: string; text: string };
type Question = { id: string; text: string; points: number; choices: Choice[] };

type ExamPayload = {
  exam: {
    id: string;
    title: string;
    subjectName: string | null;
    description: string | null;
    durationMinutes: number;
    maxViolations: number;
  };
  attempt: {
    id: string;
    startedAt: string;
    endsAt: string;
    violationCount: number;
    answers: Array<{ questionId: string; choiceId: string | null }>;
  };
  questions: Question[];
};

function formatRemain(ms: number) {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ExamTakePage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ExamPayload | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [remainMs, setRemainMs] = useState(0);
  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    maxScore: number;
    status: string;
    passingScore: number;
  } | null>(null);

  const current = data?.questions[index];

  const answeredCount = useMemo(
    () => Object.values(answers).filter((v) => v).length,
    [answers]
  );

  const submitExam = useCallback(
    async (reason: "manual" | "timeout" | "violations" = "manual") => {
      if (!data || submitting) return;
      setSubmitting(true);
      try {
        const res = await fetch(`/api/student/exams/${examId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId: data.attempt.id, reason }),
        });
        const json = await res.json();
        if (document.fullscreenElement) {
          await document.exitFullscreen().catch(() => {});
        }
        if (res.ok) {
          setResult({
            score: json.attempt.score,
            maxScore: json.attempt.maxScore,
            status: json.attempt.status,
            passingScore: json.attempt.passingScore,
          });
        } else {
          setError(json.error || "تعذر التسليم");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [data, examId, submitting]
  );

  const reportViolation = useCallback(
    async (type: string, detail?: string) => {
      if (!data || submitting || result) return;
      const now = Date.now();
      const last = (window as unknown as { __kozatLastViolation?: number })
        .__kozatLastViolation;
      if (last && now - last < 8000) return;
      (window as unknown as { __kozatLastViolation?: number }).__kozatLastViolation =
        now;

      const res = await fetch(`/api/student/exams/${examId}/violation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: data.attempt.id,
          type,
          detail,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.ignored) return;
      setViolations(json.violationCount);
      setWarning(
        `تحذير: تم تسجيل مخالفة (${json.violationCount}/${json.maxViolations}). لا تغادر الشاشة.`
      );
      if (json.shouldAutoSubmit) {
        await submitExam("violations");
      }
    },
    [data, examId, result, submitExam, submitting]
  );

  async function startExam() {
    setLoading(true);
    setError("");
    try {
      // ملء الشاشة إن توفر، وإلا نكمل على الموبايل بدون إيقاف
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void> | void;
      };
      try {
        if (document.fullscreenEnabled && el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        }
      } catch {
        // iOS / متصفحات بدون دعم — نتابع الامتحان
      }

      const res = await fetch(`/api/student/exams/${examId}/start`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "تعذر بدء الاختبار");
        if (document.fullscreenElement) {
          await document.exitFullscreen().catch(() => {});
        }
        setLoading(false);
        return;
      }

      const map: Record<string, string | null> = {};
      for (const a of json.attempt.answers) {
        map[a.questionId] = a.choiceId;
      }
      setAnswers(map);
      setData(json);
      setViolations(json.attempt.violationCount);
      setRemainMs(new Date(json.attempt.endsAt).getTime() - Date.now());
      setReady(true);
    } catch {
      setError("تعذر بدء الاختبار. أعد المحاولة.");
    }
    setLoading(false);
  }

  async function saveAnswer(questionId: string, choiceId: string) {
    if (!data) return;
    setAnswers((prev) => ({ ...prev, [questionId]: choiceId }));
    await fetch(`/api/student/exams/${examId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attemptId: data.attempt.id,
        questionId,
        choiceId,
      }),
    });
  }

  useEffect(() => {
    if (!ready || !data || result) return;
    const timer = setInterval(() => {
      const left = new Date(data.attempt.endsAt).getTime() - Date.now();
      setRemainMs(left);
      if (left <= 0) {
        clearInterval(timer);
        submitExam("timeout");
      }
    }, 500);
    return () => clearInterval(timer);
  }, [ready, data, result, submitExam]);

  useEffect(() => {
    if (!ready || result) return;

    const onVisibility = () => {
      if (document.hidden) {
        reportViolation("leave_screen", "مغادرة التبويب أو إخفاء الصفحة");
      }
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        reportViolation("leave_screen", "الخروج من ملء الشاشة");
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onContext = (e: Event) => e.preventDefault();
    const onCopy = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "v", "x", "p", "s", "u"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }
      if (e.key === "F12" || e.key === "PrintScreen") {
        e.preventDefault();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("paste", onCopy);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("paste", onCopy);
      document.removeEventListener("keydown", onKey);
    };
  }, [ready, result, reportViolation]);

  if (result) {
    const percent = Math.round((result.score / (result.maxScore || 1)) * 100);
    const passed = percent >= result.passingScore;
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
        <div className="card w-full max-w-md space-y-4 p-8 text-center">
          <h1 className="text-2xl font-extrabold">تم تسليم الاختبار</h1>
          <p className="text-4xl font-extrabold text-[var(--primary)]">
            {result.score} / {result.maxScore}
          </p>
          <p className={passed ? "text-[var(--success)]" : "text-[var(--danger)]"}>
            النسبة {percent}% — {passed ? "ناجح" : "راسب"}
          </p>
          <button className="btn btn-primary w-full" onClick={() => router.push("/student/exams")}>
            العودة لاختباراتي
          </button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
        <div className="card w-full max-w-lg space-y-4 p-8">
          <h1 className="text-2xl font-extrabold">الاستعداد للاختبار</h1>
          <ul className="space-y-2 text-sm leading-7 text-[var(--muted)]">
            <li>• سيُفعَّل ملء الشاشة إن كان مدعوماً على جهازك.</li>
            <li>• على بعض الهواتف (مثل آيفون) يستمر الامتحان بدون ملء شاشة.</li>
            <li>• مغادرة الصفحة أو إخفاؤها تُحسب مخالفة.</li>
            <li>• عند تجاوز المخالفات أو انتهاء الوقت يُسلَّم الاختبار تلقائياً من الخادم.</li>
            <li>• تُحفظ إجاباتك تلقائياً أثناء الحل.</li>
          </ul>
          {error && (
            <p className="rounded-xl bg-[#fef3f2] px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          )}
          <button className="btn btn-primary w-full" onClick={startExam} disabled={loading}>
            {loading ? "جارٍ التجهيز..." : "بدء الاختبار"}
          </button>
          <button className="btn btn-ghost w-full" onClick={() => router.push("/student/exams")}>
            رجوع
          </button>
        </div>
      </div>
    );
  }

  if (!data || !current) return null;

  return (
    <div className="exam-lock">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-4">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3">
          <div>
            <h1 className="font-bold">{data.exam.title}</h1>
            {data.exam.subjectName && (
              <p className="text-sm font-semibold text-emerald-200">
                المادة: {data.exam.subjectName}
              </p>
            )}
            <p className="text-xs text-white/70">
              سؤال {index + 1} من {data.questions.length} — مجاب{" "}
              {answeredCount}/{data.questions.length}
            </p>
          </div>
          <div className="text-left">
            <p
              className={`text-2xl font-extrabold ${
                remainMs < 60_000 ? "text-amber-300" : "text-emerald-300"
              }`}
            >
              {formatRemain(remainMs)}
            </p>
            <p className="text-xs text-white/70">
              مخالفات: {violations}/{data.exam.maxViolations}
            </p>
          </div>
        </header>

        {warning && (
          <div className="mb-4 rounded-xl bg-amber-500/20 px-4 py-3 text-sm text-amber-100">
            {warning}
          </div>
        )}

        <main className="card flex-1 space-y-5 bg-[#0d2a24] p-5 text-white">
          <p className="text-lg font-bold leading-8">{current.text}</p>
          <div className="space-y-3">
            {current.choices.map((c) => {
              const selected = answers[current.id] === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => saveAnswer(current.id, c.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-right transition ${
                    selected
                      ? "border-emerald-400 bg-emerald-400/20"
                      : "border-white/15 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {c.text}
                </button>
              );
            })}
          </div>
        </main>

        <footer className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              className="btn btn-secondary"
              disabled={index === 0 || submitting}
              onClick={() => setIndex((i) => i - 1)}
            >
              السابق
            </button>
            {index >= data.questions.length - 1 ? (
              <button
                className="btn btn-primary"
                disabled={submitting}
                onClick={() => {
                  if (confirm("هذا آخر سؤال. هل تريد تسليم الاختبار الآن؟")) {
                    submitExam("manual");
                  }
                }}
              >
                {submitting ? "جارٍ التسليم..." : "إنهاء وتسليم الاختبار"}
              </button>
            ) : (
              <button
                className="btn btn-secondary"
                disabled={submitting}
                onClick={() => setIndex((i) => i + 1)}
              >
                التالي
              </button>
            )}
          </div>
          <button
            className="btn btn-primary"
            disabled={submitting}
            onClick={() => {
              if (confirm("هل أنت متأكد من تسليم الاختبار؟")) {
                submitExam("manual");
              }
            }}
          >
            {submitting ? "جارٍ التسليم..." : "تسليم الاختبار"}
          </button>
        </footer>

        <div className="mt-4 flex flex-wrap gap-2">
          {data.questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-9 w-9 rounded-lg text-sm font-bold ${
                i === index
                  ? "bg-emerald-400 text-[#06201a]"
                  : answers[q.id]
                    ? "bg-white/20"
                    : "bg-white/5"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
