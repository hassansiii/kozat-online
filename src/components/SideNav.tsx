"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrefs } from "@/components/PreferencesProvider";

export function SideNav({ role }: { role: "ADMIN" | "STUDENT" }) {
  const pathname = usePathname();
  const { t, lang } = usePrefs();

  const adminLinks = [
    { href: "/admin", label: t("overview") },
    { href: "/admin/students", label: t("students") },
    { href: "/admin/exams", label: t("exams") },
    {
      href: "/admin/doctors",
      label: lang === "en" ? "Add doctor" : "إضافة دكتور",
    },
    {
      href: "/admin/content",
      label: lang === "en" ? "Site content" : "محتوى الموقع",
    },
    {
      href: "/admin/announcements",
      label: lang === "en" ? "Announcements" : "الإعلانات",
    },
    { href: "/admin/notifications", label: t("notifications") },
  ];

  const studentLinks = [
    { href: "/student", label: t("myDashboard") },
    { href: "/student/exams", label: t("myExams") },
    { href: "/student/notifications", label: t("notifications") },
  ];

  const links = role === "ADMIN" ? adminLinks : studentLinks;

  return (
    <aside className="card h-fit p-3 md:sticky md:top-24">
      <p className="mb-2 px-2 text-xs font-bold text-[var(--muted)]">
        {role === "ADMIN" ? t("adminNav") : t("studentNav")}
      </p>
      <div className="flex gap-2 overflow-x-auto md:flex-col">
        {links.map((link) => {
          const active =
            pathname === link.href ||
            (link.href !== "/admin" &&
              link.href !== "/student" &&
              pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted)] hover:bg-[var(--soft)]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
