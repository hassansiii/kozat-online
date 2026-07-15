"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrefs } from "@/components/PreferencesProvider";

export default function NewExamPage() {
  const router = useRouter();
  const { t } = usePrefs();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subjectName: "",
    description: "",
    durationValue: 30,
    durationUnit: "minutes" as "minutes" | "hours",
    department: "",
    studyType: "MORNING" as "MORNING" | "EVENING" | "",
    maxViolations: 3,
    passingScore: 50,
    totalScore: "100",
    shuffleQuestions: true,
    status: "DRAFT" as "DRAFT" | "PUBLISHED",
    startsAt: "",
    endsAt: "",
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const durationMinutes =
      form.durationUnit === "hours"
        ? Math.round(form.durationValue * 60)
        : Math.round(form.durationValue);

    if (!form.title.trim() || form.title.trim().length < 3) {
      setError("خطأ في حقل «عنوان الاختبار»: يجب أن يكون 3 أحرف على الأقل");
      setLoading(false);
      return;
    }

    if (!form.subjectName.trim() || form.subjectName.trim().length < 2) {
      setError("خطأ في حقل «اسم المادة»: اكتب اسم المادة (حرفين على الأقل)");
      setLoading(false);
      return;
    }

    if (!durationMinutes || durationMinutes < 1) {
      setError("خطأ في حقل «المدة»: أدخل مدة صحيحة (دقيقة واحدة على الأقل)");
      setLoading(false);
      return;
    }

    const totalScore = Math.round(Number(form.totalScore));
    if (!Number.isFinite(totalScore) || totalScore <= 0) {
      setError("خطأ في حقل «الدرجة الكلية»: يجب أن تكون أكبر من صفر");
      setLoading(false);
      return;
    }

    if (form.maxViolations < 1 || form.maxViolations > 20) {
      setError("خطأ في حقل «أقصى مخالفات»: بين 1 و 20");
      setLoading(false);
      return;
    }

    if (form.passingScore < 0 || form.passingScore > 100) {
      setError("خطأ في حقل «درجة النجاح»: بين 0 و 100");
      setLoading(false);
      return;
    }

    if (form.startsAt && form.endsAt) {
      const start = new Date(form.startsAt);
      const end = new Date(form.endsAt);
      if (end <= start) {
        setError(
          "خطأ في حقل «تاريخ الانتهاء»: يجب أن يكون بعد تاريخ البداية"
        );
        setLoading(false);
        return;
      }
    }

    const res = await fetch("/api/admin/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        subjectName: form.subjectName.trim(),
        description: form.description.trim() || null,
        durationMinutes,
        department: form.department.trim() || null,
        studyType: form.studyType || null,
        maxViolations: Number(form.maxViolations) || 3,
        passingScore: Number(form.passingScore) || 50,
        totalScore,
        shuffleQuestions: form.shuffleQuestions,
        status: form.status,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      }),
    });

    let data: { error?: string; exam?: { id: string } } = {};
    try {
      data = await res.json();
    } catch {
      setError("تعذر قراءة رد الخادم. تأكد أن السيرفر يعمل ثم أعد المحاولة.");
      setLoading(false);
      return;
    }

    setLoading(false);
    if (!res.ok) {
      setError(data.error || "تعذر إنشاء الاختبار لسبب غير معروف");
      return;
    }
    router.push(`/admin/exams/${data.exam!.id}`);
  }

  return (
    <div className="animate-fade-up">
      <h1 className="mb-1 text-2xl font-extrabold">{t("createExam")}</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">{t("createExamSub")}</p>

      <form onSubmit={onSubmit} className="card space-y-4 p-5">
        <div className="field">
          <label>{t("examTitle")}</label>
          <input
            required
            minLength={3}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div className="field">
          <label>اسم المادة</label>
          <input
            required
            minLength={2}
            value={form.subjectName}
            onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
            placeholder="مثال: البرمجة / الرياضيات"
          />
        </div>

        <div className="field">
          <label>{t("examDesc")}</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="field">
            <label>{t("duration")}</label>
            <input
              type="number"
              min={1}
              step={1}
              required
              value={form.durationValue}
              onChange={(e) =>
                setForm({
                  ...form,
                  durationValue: Math.max(1, Number(e.target.value) || 1),
                })
              }
            />
          </div>
          <div className="field">
            <label>{t("durationUnit")}</label>
            <select
              value={form.durationUnit}
              onChange={(e) =>
                setForm({
                  ...form,
                  durationUnit: e.target.value as "minutes" | "hours",
                  durationValue: e.target.value === "hours" ? 1 : 30,
                })
              }
            >
              <option value="minutes">{t("minutes")}</option>
              <option value="hours">{t("hours")}</option>
            </select>
          </div>
          <div className="field">
            <label>{t("totalScore")}</label>
            <input
              type="number"
              min={1}
              step={1}
              required
              value={form.totalScore}
              onChange={(e) => setForm({ ...form, totalScore: e.target.value })}
            />
          </div>
        </div>

        <p className="rounded-xl bg-[var(--soft)] px-3 py-2 text-sm text-[var(--fg)]">
          {t("totalScoreHint")}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label>{t("departmentOptional")}</label>
            <input
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder={t("departmentPlaceholder")}
            />
          </div>
          <div className="field">
            <label>{t("studyType")}</label>
            <select
              value={form.studyType}
              onChange={(e) =>
                setForm({
                  ...form,
                  studyType: e.target.value as "MORNING" | "EVENING" | "",
                })
              }
            >
              <option value="">{t("all")}</option>
              <option value="MORNING">{t("morning")}</option>
              <option value="EVENING">{t("evening")}</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label>{t("startsAt")}</label>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            />
          </div>
          <div className="field">
            <label>{t("endsAt")}</label>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="field">
            <label>{t("passingPercent")}</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.passingScore}
              onChange={(e) =>
                setForm({ ...form, passingScore: Number(e.target.value) })
              }
            />
          </div>
          <div className="field">
            <label>{t("maxViolations")}</label>
            <input
              type="number"
              min={1}
              value={form.maxViolations}
              onChange={(e) =>
                setForm({ ...form, maxViolations: Number(e.target.value) })
              }
            />
          </div>
          <div className="field">
            <label>{t("status")}</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as "DRAFT" | "PUBLISHED",
                })
              }
            >
              <option value="DRAFT">{t("draft")}</option>
              <option value="PUBLISHED">{t("publishNow")}</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.shuffleQuestions}
            onChange={(e) =>
              setForm({ ...form, shuffleQuestions: e.target.checked })
            }
          />
          {t("shuffle")}
        </label>

        {error && (
          <p className="rounded-xl px-3 py-2 text-sm text-[var(--danger)]" style={{ background: "color-mix(in srgb, var(--danger) 12%, transparent)" }}>
            {error}
          </p>
        )}

        <button className="btn btn-primary" disabled={loading}>
          {loading ? t("saving") : t("saveAndQuestions")}
        </button>
      </form>
    </div>
  );
}
