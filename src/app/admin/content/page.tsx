"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePrefs } from "@/components/PreferencesProvider";

type Settings = {
  brandName: string;
  homeTag: string;
  homeTitle: string;
  homeDesc: string;
  featuresTitle: string;
  feature1: string;
  feature2: string;
  feature3: string;
  feature4: string;
  feature5: string;
  primaryColor: string;
  primaryDark: string;
  accentColor: string;
  panelFrom: string;
  panelVia: string;
  panelTo: string;
};

const empty: Settings = {
  brandName: "",
  homeTag: "",
  homeTitle: "",
  homeDesc: "",
  featuresTitle: "",
  feature1: "",
  feature2: "",
  feature3: "",
  feature4: "",
  feature5: "",
  primaryColor: "#0d6e5b",
  primaryDark: "#0a5546",
  accentColor: "#c4a35a",
  panelFrom: "#0d6e5b",
  panelVia: "#0a5546",
  panelTo: "#1a3a32",
};

export default function AdminContentPage() {
  const { lang } = usePrefs();
  const [form, setForm] = useState<Settings>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setForm({ ...empty, ...d.settings });
      })
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/admin/site-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "فشل الحفظ");
      return;
    }
    setMsg(data.message || "تم الحفظ");
    if (data.settings) setForm({ ...empty, ...data.settings });
    window.dispatchEvent(new Event("kozat-site-settings-updated"));
  }

  if (loading) {
    return <p className="text-[var(--muted)]">{lang === "en" ? "Loading..." : "جارٍ التحميل..."}</p>;
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-extrabold">
          {lang === "en" ? "Site content & design" : "محتوى وتصميم الموقع"}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {lang === "en"
            ? "Edit the homepage texts, brand name, and colors."
            : "عدّل نصوص الصفحة الرئيسية واسم المنصة والألوان."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-4 p-5">
        <div className="field">
          <label>{lang === "en" ? "Brand name" : "اسم المنصة"}</label>
          <input required value={form.brandName} onChange={(e) => set("brandName", e.target.value)} />
        </div>
        <div className="field">
          <label>{lang === "en" ? "Home tagline" : "السطر التعريفي"}</label>
          <input required value={form.homeTag} onChange={(e) => set("homeTag", e.target.value)} />
        </div>
        <div className="field">
          <label>{lang === "en" ? "Home title" : "عنوان الصفحة الرئيسية"}</label>
          <input required value={form.homeTitle} onChange={(e) => set("homeTitle", e.target.value)} />
        </div>
        <div className="field">
          <label>{lang === "en" ? "Home description" : "وصف الصفحة الرئيسية"}</label>
          <textarea
            required
            rows={4}
            value={form.homeDesc}
            onChange={(e) => set("homeDesc", e.target.value)}
          />
        </div>
        <div className="field">
          <label>{lang === "en" ? "Features title" : "عنوان المميزات"}</label>
          <input
            required
            value={form.featuresTitle}
            onChange={(e) => set("featuresTitle", e.target.value)}
          />
        </div>
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <div className="field" key={n}>
            <label>
              {lang === "en" ? `Feature ${n}` : `ميزة ${n}`}
            </label>
            <input
              required
              value={form[`feature${n}`]}
              onChange={(e) => set(`feature${n}`, e.target.value)}
            />
          </div>
        ))}

        <h2 className="pt-2 text-lg font-bold">
          {lang === "en" ? "Colors" : "الألوان"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ["primaryColor", lang === "en" ? "Primary" : "الأساسي"],
              ["primaryDark", lang === "en" ? "Primary dark" : "الأساسي الغامق"],
              ["accentColor", lang === "en" ? "Accent" : "اللون المميز"],
              ["panelFrom", lang === "en" ? "Panel from" : "تدرج اللوحة (بداية)"],
              ["panelVia", lang === "en" ? "Panel via" : "تدرج اللوحة (وسط)"],
              ["panelTo", lang === "en" ? "Panel to" : "تدرج اللوحة (نهاية)"],
            ] as const
          ).map(([key, label]) => (
            <div className="field" key={key}>
              <label>{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-[var(--border)] bg-transparent p-1"
                />
                <input
                  required
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        {msg && <p className="text-sm text-[var(--success)]">{msg}</p>}

        <button className="btn btn-primary" disabled={saving}>
          {saving
            ? lang === "en"
              ? "Saving..."
              : "جارٍ الحفظ..."
            : lang === "en"
              ? "Save changes"
              : "حفظ التعديلات"}
        </button>
      </form>
    </div>
  );
}
