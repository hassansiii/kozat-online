"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { usePrefs } from "@/components/PreferencesProvider";
import { Suspense } from "react";

function ResetForm() {
  const { t, lang } = usePrefs();
  const router = useRouter();
  const params = useSearchParams();
  const token = useMemo(() => params.get("token") || "", [params]);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/forgot-password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Error");
      return;
    }
    setMsg(data.message);
    setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <h1 className="text-2xl font-extrabold">
        {lang === "en" ? "Reset password" : "تعيين كلمة مرور جديدة"}
      </h1>
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
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      {msg && <p className="text-sm text-[var(--success)]">{msg}</p>}
      <button className="btn btn-primary w-full" disabled={loading || !token}>
        {loading ? t("saving") : lang === "en" ? "Save password" : "حفظ كلمة المرور"}
      </button>
      <Link href="/login" className="block text-center text-sm text-[var(--primary)]">
        {t("signIn")}
      </Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader user={null} />
      <main className="mx-auto max-w-md px-4 py-12">
        <Suspense>
          <ResetForm />
        </Suspense>
      </main>
    </div>
  );
}
