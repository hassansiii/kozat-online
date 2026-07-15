"use client";

import { FormEvent, useState } from "react";
import { usePrefs } from "@/components/PreferencesProvider";

export default function AdminDoctorsPage() {
  const { lang, t } = usePrefs();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/admin/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password, subjectName, department }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشل الإنشاء");
      return;
    }
    setMsg(data.message || "تم إنشاء الحساب");
    setFullName("");
    setEmail("");
    setPassword("");
    setSubjectName("");
    setDepartment("");
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-extrabold">
          {lang === "en" ? "Add doctor" : "إضافة دكتور"}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {lang === "en"
            ? "Create another doctor account with full admin access."
            : "أنشئ حساب دكتور جديد بصلاحيات الأدمن كاملة."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="card max-w-xl space-y-4 p-5">
        <div className="field">
          <label>{lang === "en" ? "Doctor name" : "اسم الدكتور"}</label>
          <input
            required
            minLength={3}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={lang === "en" ? "Dr. ..." : "د. ..."}
          />
        </div>
        <div className="field">
          <label>{t("email")}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label>{t("password")}</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="field">
          <label>{lang === "en" ? "Subject name" : "اسم المادة"}</label>
          <input
            required
            minLength={2}
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder={
              lang === "en" ? "e.g. Programming" : "مثال: البرمجة / الرياضيات"
            }
          />
        </div>
        <div className="field">
          <label>{t("department")}</label>
          <input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder={t("departmentPlaceholder")}
          />
        </div>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        {msg && <p className="text-sm text-[var(--success)]">{msg}</p>}

        <button className="btn btn-primary" disabled={loading}>
          {loading
            ? t("saving")
            : lang === "en"
              ? "Create doctor account"
              : "إنشاء حساب الدكتور"}
        </button>
      </form>
    </div>
  );
}
