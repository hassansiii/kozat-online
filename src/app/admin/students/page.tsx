"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDate, statusLabel, studyTypeLabel } from "@/lib/utils";
import { usePrefs } from "@/components/PreferencesProvider";

type Student = {
  id: string;
  fullName: string;
  email: string;
  department: string | null;
  stage: string | null;
  studyType: "MORNING" | "EVENING" | null;
  doctorName: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

export default function AdminStudentsPage() {
  const { t, lang } = usePrefs();
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [doctorFilter, setDoctorFilter] = useState("ALL");
  const [doctorQuery, setDoctorQuery] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/students");
    const data = await res.json();
    setStudents(data.students || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function act(studentId: string, action: "approve" | "reject") {
    setLoadingId(studentId);
    await fetch("/api/admin/students", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, action }),
    });
    await load();
    setLoadingId(null);
  }

  async function deleteStudent(student: Student) {
    const ok = confirm(`${t("deleteStudentConfirm")}\n${student.fullName}`);
    if (!ok) return;

    setLoadingId(student.id);
    const res = await fetch("/api/admin/students", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id }),
    });
    setLoadingId(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || t("deleteFailed"));
      return;
    }

    setStudents((prev) => prev.filter((s) => s.id !== student.id));
  }

  const doctorNames = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      const name = s.doctorName?.trim();
      if (name) set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [students]);

  const filtered = students.filter((s) => {
    if (filter !== "ALL" && s.status !== filter) return false;
    if (doctorFilter !== "ALL") {
      if ((s.doctorName || "").trim() !== doctorFilter) return false;
    }
    if (doctorQuery.trim()) {
      const q = doctorQuery.trim().toLowerCase();
      const dn = (s.doctorName || "").toLowerCase();
      if (!dn.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{t("students")}</h1>
          <p className="text-sm text-[var(--muted)]">{t("studentsManageSub")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--fg)]"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="ALL">{t("filterAll")}</option>
            <option value="PENDING">{t("pendingApproval")}</option>
            <option value="APPROVED">{t("approved")}</option>
            <option value="REJECTED">{t("rejected")}</option>
          </select>
          <select
            className="rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--fg)]"
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
          >
            <option value="ALL">
              {lang === "en" ? "All doctors" : "كل الدكاترة"}
            </option>
            {doctorNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <input
            className="min-w-[10rem] rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--fg)]"
            value={doctorQuery}
            onChange={(e) => setDoctorQuery(e.target.value)}
            placeholder={
              lang === "en" ? "Search by doctor" : "بحث باسم الدكتور"
            }
          />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="card p-6 text-[var(--muted)]">{t("noStudentsFilter")}</p>
        )}
        {filtered.map((s) => (
          <article key={s.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold">{s.fullName}</h2>
                <p className="text-sm text-[var(--muted)]">{s.email}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {s.department} — {t("stageLabel")} {s.stage} —{" "}
                  {studyTypeLabel(s.studyType, lang)}
                </p>
                {s.doctorName && (
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {lang === "en" ? "Doctor" : "الدكتور"}: {s.doctorName}
                  </p>
                )}
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {t("registeredAt")} {formatDate(s.createdAt, lang)}
                </p>
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

            <div className="mt-4 flex flex-wrap gap-2">
              {s.status === "PENDING" && (
                <>
                  <button
                    className="btn btn-primary"
                    disabled={loadingId === s.id}
                    onClick={() => act(s.id, "approve")}
                  >
                    {t("accept")}
                  </button>
                  <button
                    className="btn btn-danger"
                    disabled={loadingId === s.id}
                    onClick={() => act(s.id, "reject")}
                  >
                    {t("reject")}
                  </button>
                </>
              )}
              <button
                className="btn btn-danger"
                disabled={loadingId === s.id}
                onClick={() => deleteStudent(s)}
              >
                {loadingId === s.id ? t("deleting") : t("delete")}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
