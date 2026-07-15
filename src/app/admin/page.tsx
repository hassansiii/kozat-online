"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDate, statusLabel } from "@/lib/utils";
import { usePrefs } from "@/components/PreferencesProvider";

type Dash = {
  stats: {
    studentsPending: number;
    examsCount: number;
    attemptsCount: number;
  };
  recentStudents: Array<{
    id: string;
    fullName: string;
    email: string;
    department: string | null;
    status: string;
    createdAt: string;
  }>;
  recentNotifications: Array<{
    id: string;
    title: string;
    message: string;
    createdAt: string;
  }>;
};

export default function AdminDashboardPage() {
  const { t, lang } = usePrefs();
  const [data, setData] = useState<Dash | null>(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserName(d.user?.fullName || ""))
      .catch(() => {});
  }, []);

  if (!data) {
    return <p className="text-[var(--muted)]">{t("loading")}</p>;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-extrabold">
          {t("welcome")}
          {userName ? `، ${userName}` : ""}
        </h1>
        <p className="text-sm text-[var(--muted)]">{t("adminDashboardSub")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-[var(--muted)]">{t("pendingApproval")}</p>
          <p className="mt-2 text-3xl font-extrabold text-[var(--warning)]">
            {data.stats.studentsPending}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-[var(--muted)]">{t("exams")}</p>
          <p className="mt-2 text-3xl font-extrabold text-[var(--primary)]">
            {data.stats.examsCount}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-[var(--muted)]">{t("attempts")}</p>
          <p className="mt-2 text-3xl font-extrabold">{data.stats.attemptsCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/exams/new" className="btn btn-primary">
          {t("newExam")}
        </Link>
        <Link href="/admin/students" className="btn btn-secondary">
          {t("reviewStudents")}
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-bold">{t("recentRegistrations")}</h2>
          <div className="space-y-3">
            {data.recentStudents.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2 last:border-0"
              >
                <div>
                  <p className="font-semibold">{s.fullName}</p>
                  <p className="text-xs text-[var(--muted)]">{s.department}</p>
                </div>
                <span
                  className={`badge ${
                    s.status === "PENDING"
                      ? "badge-pending"
                      : s.status === "APPROVED"
                        ? "badge-approved"
                        : "badge-rejected"
                  }`}
                >
                  {statusLabel(s.status, lang)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-bold">{t("recentNotifications")}</h2>
          <div className="space-y-3">
            {data.recentNotifications.length === 0 && (
              <p className="text-sm text-[var(--muted)]">{t("noNotifications")}</p>
            )}
            {data.recentNotifications.map((n) => (
              <div key={n.id} className="border-b border-[var(--border)] pb-2 last:border-0">
                <p className="font-semibold">{n.title}</p>
                <p className="text-sm text-[var(--muted)]">{n.message}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {formatDate(n.createdAt, lang)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
