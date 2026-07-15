"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { isQuadName, STAGES } from "@/lib/utils";
import { usePrefs } from "@/components/PreferencesProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { t, lang } = usePrefs();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    doctorName: "",
    email: "",
    password: "",
    department: "",
    stage: STAGES[0] as string,
    studyType: "MORNING",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!isQuadName(form.fullName)) {
      setError(
        lang === "en"
          ? "Enter your full four-part name (at least four words)."
          : "أدخل الاسم الرباعي كاملاً (أربع كلمات على الأقل)."
      );
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    router.push("/pending");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <SiteHeader user={null} />
      <main className="mx-auto max-w-xl px-4 py-10">
        <form onSubmit={onSubmit} className="card animate-fade-up space-y-4 p-6">
          <div>
            <h1 className="text-2xl font-extrabold">{t("registerTitle")}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">{t("registerSubtitle")}</p>
          </div>

          <div className="field">
            <label>{t("fullName")}</label>
            <input
              required
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              placeholder={t("fullNamePlaceholder")}
            />
          </div>

          <div className="field">
            <label>{lang === "en" ? "Doctor's name" : "اسم الدكتور"}</label>
            <input
              required
              minLength={3}
              value={form.doctorName}
              onChange={(e) => set("doctorName", e.target.value)}
              placeholder={
                lang === "en"
                  ? "Enter your doctor's name"
                  : "اكتب اسم الدكتور المسؤول عنك"
              }
            />
          </div>

          <div className="field">
            <label>{t("email")}</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>

          <div className="field">
            <label>{t("password")}</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field">
              <label>{t("department")}</label>
              <input
                required
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
                placeholder={t("departmentPlaceholder")}
              />
            </div>
            <div className="field">
              <label>{t("stage")}</label>
              <select value={form.stage} onChange={(e) => set("stage", e.target.value)}>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>{t("studyType")}</label>
            <select
              value={form.studyType}
              onChange={(e) => set("studyType", e.target.value)}
            >
              <option value="MORNING">{t("morning")}</option>
              <option value="EVENING">{t("evening")}</option>
            </select>
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

          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? t("registering") : t("createAccount")}
          </button>

          <p className="text-center text-sm text-[var(--muted)]">
            {t("haveAccount")}{" "}
            <Link href="/login" className="font-bold text-[var(--primary)]">
              {t("signIn")}
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
