"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { usePrefs } from "@/components/PreferencesProvider";

type Notification = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export default function NotificationsPage() {
  const { t, lang } = usePrefs();
  const [items, setItems] = useState<Notification[]>([]);

  async function load() {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    setItems(data.notifications || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function markAll() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await load();
  }

  async function markOne(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{t("notifications")}</h1>
        <button className="btn btn-secondary" onClick={markAll}>
          {t("markAllRead")}
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <p className="card p-6 text-[var(--muted)]">{t("noNotifications")}</p>
        )}
        {items.map((n) => (
          <article
            key={n.id}
            className={`card p-4 ${n.read ? "opacity-70" : "border-[var(--primary)]"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold">{n.title}</h2>
                <p className="text-sm text-[var(--muted)]">{n.message}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {formatDate(n.createdAt, lang)}
                </p>
              </div>
              <div className="flex gap-2">
                {!n.read && (
                  <button className="btn btn-ghost" onClick={() => markOne(n.id)}>
                    {t("read")}
                  </button>
                )}
                {n.link && (
                  <Link href={n.link} className="btn btn-secondary">
                    {t("open")}
                  </Link>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
