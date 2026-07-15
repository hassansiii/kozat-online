"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { usePrefs } from "@/components/PreferencesProvider";

export default function ForgotPasswordPage() {
  const { t, lang } = usePrefs();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setNote("");
    setLink("");
    setCopied(false);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    setMsg(data.message || data.error || "");
    setNote(data.note || "");
    if (data.resetPath) {
      const absolute =
        typeof window !== "undefined"
          ? `${window.location.origin}${data.resetPath}`
          : data.resetPath;
      setLink(absolute);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader user={null} />
      <main className="mx-auto max-w-md px-4 py-12">
        <form onSubmit={onSubmit} className="card space-y-4 p-6">
          <div>
            <h1 className="text-2xl font-extrabold">
              {lang === "en" ? "Forgot password" : "استعادة كلمة المرور"}
            </h1>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              {lang === "en"
                ? "Enter your email. Because email delivery is not configured yet, the reset link will appear here on this page."
                : "أدخل بريدك. بما أن إرسال البريد غير مفعّل حالياً، سيظهر رابط إعادة التعيين هنا داخل الصفحة."}
            </p>
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
          {msg && <p className="text-sm text-[var(--muted)]">{msg}</p>}
          {note && (
            <p
              className="rounded-xl px-3 py-2 text-sm text-[var(--fg)]"
              style={{
                background: "color-mix(in srgb, var(--primary) 12%, transparent)",
              }}
            >
              {note}
            </p>
          )}
          {link && (
            <div className="space-y-2">
              <p className="break-all rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--fg)]">
                {link}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href={link} className="btn btn-primary flex-1">
                  {lang === "en" ? "Open reset link" : "فتح رابط إعادة التعيين"}
                </Link>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={copyLink}
                >
                  {copied
                    ? lang === "en"
                      ? "Copied"
                      : "تم النسخ"
                    : lang === "en"
                      ? "Copy"
                      : "نسخ"}
                </button>
              </div>
            </div>
          )}
          <button className="btn btn-secondary w-full" disabled={loading}>
            {loading
              ? t("saving")
              : lang === "en"
                ? "Create reset link"
                : "إنشاء رابط الاستعادة"}
          </button>
          <Link href="/login" className="block text-center text-sm text-[var(--primary)]">
            {t("signIn")}
          </Link>
        </form>
      </main>
    </div>
  );
}
