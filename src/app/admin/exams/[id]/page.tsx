"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePrefs } from "@/components/PreferencesProvider";

type Choice = { id?: string; text: string; isCorrect: boolean };
type Question = {
  id: string;
  text: string;
  points: number;
  choices: Array<{ id: string; text: string; isCorrect: boolean }>;
};
type Student = {
  id: string;
  fullName: string;
  email: string;
  status: string;
};
type Exam = {
  id: string;
  title: string;
  subjectName: string | null;
  description: string | null;
  status: string;
  durationMinutes: number;
  maxViolations: number;
  totalScore: number;
  questions: Question[];
  assignments: Array<{ student: Student }>;
};

export default function ExamManagePage() {
  const params = useParams();
  const id = params.id as string;
  const { t, lang } = usePrefs();
  const [exam, setExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [qText, setQText] = useState("");
  const [points, setPoints] = useState("1");
  const [choices, setChoices] = useState<Choice[]>([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);

  async function load() {
    const [examRes, studentsRes] = await Promise.all([
      fetch(`/api/admin/exams/${id}`),
      fetch("/api/admin/students"),
    ]);
    const examData = await examRes.json();
    const studentsData = await studentsRes.json();
    setExam(examData.exam);
    const approved = (studentsData.students || []).filter(
      (s: Student) => s.status === "APPROVED"
    );
    setStudents(approved);
    setSelected(
      (examData.exam?.assignments || []).map(
        (a: { student: Student }) => a.student.id
      )
    );
  }

  useEffect(() => {
    load();
  }, [id]);

  const questionsTotal = useMemo(
    () => (exam?.questions || []).reduce((sum, q) => sum + q.points, 0),
    [exam]
  );

  async function addQuestion(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");

    const pts = Math.round(Number(points));
    if (!Number.isFinite(pts) || pts <= 0) {
      setError(t("pointsMustBePositive"));
      return;
    }

    if (editingId) {
      const res = await fetch(`/api/admin/exams/${id}/questions/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: qText, points: pts, choices }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error");
        return;
      }
      setEditingId(null);
      setMsg(lang === "en" ? "Question updated" : "تم تحديث السؤال");
    } else {
      const res = await fetch(`/api/admin/exams/${id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: qText, points: pts, choices }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error");
        return;
      }
      setMsg(t("questionAdded"));
    }

    setQText("");
    setPoints("1");
    setChoices([
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ]);
    await load();
  }

  async function deleteQuestion(questionId: string) {
    setError("");
    await fetch(`/api/admin/exams/${id}/questions?questionId=${questionId}`, {
      method: "DELETE",
    });
    await load();
  }

  async function saveAssignments() {
    setMsg("");
    setError("");
    const res = await fetch(`/api/admin/exams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignStudentIds: selected }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error");
      return;
    }
    setMsg(t("studentsAssigned"));
    await load();
  }

  async function autoAssign() {
    setMsg("");
    setError("");
    const res = await fetch(`/api/admin/exams/${id}/auto-assign`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error");
      return;
    }
    setMsg(data.message || t("studentsAssigned"));
    await load();
  }

  async function saveExamSettings() {
    if (!exam) return;
    setError("");
    const res = await fetch(`/api/admin/exams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: exam.title,
        subjectName: exam.subjectName,
        description: exam.description,
        durationMinutes: exam.durationMinutes,
        totalScore: exam.totalScore,
        maxViolations: exam.maxViolations,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Error");
      return;
    }
    setMsg(lang === "en" ? "Exam settings saved" : "تم حفظ إعدادات الاختبار");
    await load();
  }

  async function publish() {
    setError("");
    if (!exam) return;
    if (exam.questions.length === 0) {
      setError(t("addQuestionFirst"));
      return;
    }
    const res = await fetch(`/api/admin/exams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PUBLISHED" }),
    });
    if (res.ok) {
      setMsg(t("examPublished"));
      await load();
    }
  }

  if (!exam) return <p className="text-[var(--muted)]">{t("loading")}</p>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{exam.title}</h1>
          <p className="text-sm text-[var(--muted)]">
            {exam.subjectName ? `${exam.subjectName} — ` : ""}
            {exam.durationMinutes} {t("minutes")} — {t("maxViolations")}:{" "}
            {exam.maxViolations}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/exams/${id}/live`} className="btn btn-ghost">
            {lang === "en" ? "Live" : "مراقبة"}
          </Link>
          <Link href={`/admin/exams/${id}/results`} className="btn btn-ghost">
            {t("results")}
          </Link>
          <a
            href={`/api/admin/exams/${id}/export-pdf`}
            className="btn btn-primary"
          >
            {lang === "en" ? "PDF results" : "نتائج PDF"}
          </a>
          {exam.status !== "PUBLISHED" && (
            <button className="btn btn-primary" onClick={publish}>
              {t("publishExam")}
            </button>
          )}
          {exam.status === "PUBLISHED" && (
            <button
              className="btn btn-secondary"
              onClick={async () => {
                await fetch(`/api/admin/exams/${id}`, {
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
        </div>
      </div>

      <section className="card space-y-3 p-5">
        <h2 className="font-bold">
          {lang === "en" ? "Edit exam settings" : "تعديل إعدادات الاختبار"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="field">
            <label>{t("examTitle")}</label>
            <input
              value={exam.title}
              onChange={(e) => setExam({ ...exam, title: e.target.value })}
            />
          </div>
          <div className="field">
            <label>اسم المادة</label>
            <input
              value={exam.subjectName || ""}
              onChange={(e) =>
                setExam({ ...exam, subjectName: e.target.value })
              }
              placeholder="مثال: البرمجة"
            />
          </div>
          <div className="field">
            <label>{t("duration")} ({t("minutes")})</label>
            <input
              type="number"
              min={1}
              value={exam.durationMinutes}
              onChange={(e) =>
                setExam({ ...exam, durationMinutes: Number(e.target.value) })
              }
            />
          </div>
          <div className="field">
            <label>{t("totalScore")}</label>
            <input
              type="number"
              min={1}
              value={exam.totalScore}
              onChange={(e) =>
                setExam({ ...exam, totalScore: Number(e.target.value) })
              }
            />
          </div>
          <div className="field">
            <label>{t("maxViolations")}</label>
            <input
              type="number"
              min={1}
              value={exam.maxViolations}
              onChange={(e) =>
                setExam({ ...exam, maxViolations: Number(e.target.value) })
              }
            />
          </div>
        </div>
        <div className="field">
          <label>{t("examDesc")}</label>
          <textarea
            rows={2}
            value={exam.description || ""}
            onChange={(e) => setExam({ ...exam, description: e.target.value })}
          />
        </div>
        <button className="btn btn-secondary" onClick={saveExamSettings}>
          {lang === "en" ? "Save settings" : "حفظ الإعدادات"}
        </button>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-sm text-[var(--muted)]">{t("totalScore")}</p>
          <p className="mt-1 text-2xl font-extrabold text-[var(--primary)]">
            {exam.totalScore}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-[var(--muted)]">
            {t("questionPointsSum")}
          </p>
          <p className="mt-1 text-2xl font-extrabold">{questionsTotal}</p>
        </div>
      </div>

      {msg && (
        <p className="rounded-xl px-3 py-2 text-sm text-[var(--success)]" style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)" }}>
          {msg}
        </p>
      )}
      {error && (
        <p className="rounded-xl px-3 py-2 text-sm text-[var(--danger)]" style={{ background: "color-mix(in srgb, var(--danger) 12%, transparent)" }}>
          {error}
        </p>
      )}

      <section className="card space-y-4 p-5">
        <h2 className="font-bold">
          {editingId
            ? lang === "en"
              ? "Edit question"
              : "تعديل السؤال"
            : t("addQuestion")}
        </h2>
        <form onSubmit={addQuestion} className="space-y-3">
          <div className="field">
            <label>{t("questionText")}</label>
            <textarea
              required
              rows={2}
              value={qText}
              onChange={(e) => setQText(e.target.value)}
            />
          </div>
          <div className="field max-w-[220px]">
            <label>{t("questionPoints")}</label>
            <input
              type="number"
              min={1}
              step={1}
              required
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
            <p className="text-xs text-[var(--muted)]">{t("questionPointsHint")}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {choices.map((c, i) => (
              <div key={i} className="rounded-xl border border-[var(--border)] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {t("choice")} {i + 1}
                  </span>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="radio"
                      name="correct"
                      checked={c.isCorrect}
                      onChange={() =>
                        setChoices(
                          choices.map((item, idx) => ({
                            ...item,
                            isCorrect: idx === i,
                          }))
                        )
                      }
                    />
                    {t("correct")}
                  </label>
                </div>
                <input
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--fg)]"
                  value={c.text}
                  onChange={(e) => {
                    const next = [...choices];
                    next[i] = { ...next[i], text: e.target.value };
                    setChoices(next);
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary">
              {editingId
                ? lang === "en"
                  ? "Save question"
                  : "حفظ السؤال"
                : t("addQuestionBtn")}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setEditingId(null);
                  setQText("");
                  setPoints("1");
                  setChoices([
                    { text: "", isCorrect: true },
                    { text: "", isCorrect: false },
                    { text: "", isCorrect: false },
                    { text: "", isCorrect: false },
                  ]);
                }}
              >
                {lang === "en" ? "Cancel" : "إلغاء"}
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-bold">
          {t("questions")} ({exam.questions.length})
        </h2>
        {exam.questions.length === 0 && (
          <p className="text-sm text-[var(--muted)]">{t("noQuestions")}</p>
        )}
        {exam.questions.map((q, idx) => (
          <div key={q.id} className="rounded-xl border border-[var(--border)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {idx + 1}. {q.text}{" "}
                  <span className="text-sm text-[var(--primary)]">
                    ({q.points} {t("pointsUnit")})
                  </span>
                </p>
                <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                  {q.choices.map((c) => (
                    <li key={c.id}>
                      {c.isCorrect ? "✓ " : "• "}
                      {c.text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditingId(q.id);
                    setQText(q.text);
                    setPoints(String(q.points));
                    setChoices(
                      q.choices.map((c) => ({
                        id: c.id,
                        text: c.text,
                        isCorrect: c.isCorrect,
                      }))
                    );
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  {lang === "en" ? "Edit" : "تعديل"}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => deleteQuestion(q.id)}
                >
                  {t("delete")}
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-bold">{t("assignStudents")}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {students.map((s) => (
            <label
              key={s.id}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(s.id)}
                onChange={(e) => {
                  if (e.target.checked) setSelected([...selected, s.id]);
                  else setSelected(selected.filter((x) => x !== s.id));
                }}
              />
              <span>
                {s.fullName}
                <span className="block text-xs text-[var(--muted)]">{s.email}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" onClick={saveAssignments}>
            {t("saveAssignment")}
          </button>
          <button className="btn btn-primary" onClick={autoAssign}>
            {lang === "en"
              ? "Auto-assign by department/study type"
              : "تعيين تلقائي حسب القسم/نوع الدراسة"}
          </button>
        </div>
      </section>
    </div>
  );
}
