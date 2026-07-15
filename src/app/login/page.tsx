"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { usePrefs } from "@/components/PreferencesProvider";

export default function LoginPage() {
  const router = useRouter();
  const { t, lang } = usePrefs();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    if (data.user.role === "ADMIN") router.push("/admin");
    else if (data.user.status === "APPROVED") router.push("/student");
    else router.push("/pending");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <SiteHeader user={null} />
      <main className="mx-auto max-w-md px-4 py-12">
        <form onSubmit={onSubmit} className="card animate-fade-up space-y-5 p-6">
          <div>
            <h1 className="text-2xl font-extrabold">{t("loginTitle")}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">{t("loginSubtitle")}</p>
          </div>

          <div className="field">
            <label htmlFor="fullName">
              {lang === "en" ? "Name" : "الاسم"}
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={
                lang === "en"
                  ? "Your registered name (required for students)"
                  : "اسمك المسجّل (مطلوب للطلاب — يظهر للأدمن في الأعلى إن أدخلته)"
              }
            />
          </div>

          <div className="field">
            <label htmlFor="email">{t("email")}</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
            />
          </div>

          <div className="field">
            <label htmlFor="password">{t("password")}</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
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
            {loading ? t("signingIn") : t("login")}
          </button>

          <p className="text-center text-sm text-[var(--muted)]">
            {t("newStudent")}{" "}
            <Link href="/register" className="font-bold text-[var(--primary)]">
              {t("createAccount")}
            </Link>
          </p>
          <p className="text-center text-sm">
            <Link href="/forgot-password" className="text-[var(--primary)]">
              {lang === "en" ? "Forgot password?" : "نسيت كلمة المرور؟"}
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
