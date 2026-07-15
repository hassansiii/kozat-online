"use client";

import { FormEvent, useState } from "react";
import { usePrefs } from "@/components/PreferencesProvider";

export default function AdminAnnouncementsPage() {
  const { lang } = usePrefs();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("/student/notifications");
  const [audience, setAudience] = useState<"ALL" | "APPROVED" | "PENDING">(
    "APPROVED"
  );
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message, link, audience }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشل الإرسال");
      return;
    }
    setMsg(data.message || "تم الإرسال");
    setTitle("");
    setMessage("");
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-extrabold">
          {lang === "en" ? "Announcements" : "إعلانات للطلاب"}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {lang === "en"
            ? "Send a manual notification to students."
            : "أرسل إعلاناً يدوياً يصل كإشعار داخل حسابات الطلاب."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="card max-w-2xl space-y-4 p-5">
        <div className="field">
          <label>{lang === "en" ? "Title" : "عنوان الإعلان"}</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={lang === "en" ? "Important notice" : "تنويه مهم"}
          />
        </div>
        <div className="field">
          <label>{lang === "en" ? "Message" : "نص الإعلان"}</label>
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              lang === "en"
                ? "Write the announcement text..."
                : "اكتب نص الإعلان هنا..."
            }
          />
        </div>
        <div className="field">
          <label>{lang === "en" ? "Audience" : "المستهدفون"}</label>
          <select
            value={audience}
            onChange={(e) =>
              setAudience(e.target.value as "ALL" | "APPROVED" | "PENDING")
            }
          >
            <option value="APPROVED">
              {lang === "en" ? "Approved students" : "الطلاب المقبولون"}
            </option>
            <option value="PENDING">
              {lang === "en" ? "Pending students" : "بانتظار الموافقة"}
            </option>
            <option value="ALL">
              {lang === "en" ? "All students" : "كل الطلاب"}
            </option>
          </select>
        </div>
        <div className="field">
          <label>{lang === "en" ? "Link (optional)" : "رابط (اختياري)"}</label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/student/exams"
          />
        </div>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        {msg && <p className="text-sm text-[var(--success)]">{msg}</p>}

        <button className="btn btn-primary" disabled={loading}>
          {loading
            ? lang === "en"
              ? "Sending..."
              : "جارٍ الإرسال..."
            : lang === "en"
              ? "Send announcement"
              : "إرسال الإعلان"}
        </button>
      </form>
    </div>
  );
}
