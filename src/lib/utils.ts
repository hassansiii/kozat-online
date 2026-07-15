import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export const STAGES = ["الأولى", "الثانية", "الثالثة", "الرابعة"] as const;

export function formatDuration(minutes: number, lang: Lang = "ar") {
  if (minutes < 60) return `${minutes} ${t(lang, "minutes")}`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return hours === 1 ? t(lang, "hourOne") : `${hours} ${t(lang, "hoursUnit")}`;
  }
  return `${hours} ${t(lang, "hourAnd")} ${mins} ${t(lang, "minutes")}`;
}

export function formatDate(
  date: Date | string | null | undefined,
  lang: Lang = "ar"
) {
  if (!date) return "—";
  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

/** @deprecated use formatDate */
export function arabicDate(date: Date | string | null | undefined) {
  return formatDate(date, "ar");
}

export function statusLabel(status: string, lang: Lang) {
  if (status === "PENDING") return t(lang, "pendingApproval");
  if (status === "APPROVED") return t(lang, "approved");
  if (status === "REJECTED") return t(lang, "rejected");
  return status;
}

export function studyTypeLabel(
  studyType: "MORNING" | "EVENING" | null | undefined,
  lang: Lang
) {
  if (studyType === "MORNING") return t(lang, "morning");
  if (studyType === "EVENING") return t(lang, "evening");
  return "—";
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

/** اسم رباعي: أربع كلمات على الأقل بعد إزالة الفراغات الزائدة */
export function isQuadName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 4;
}

// Keep old exports for any leftover imports during transition
export const STUDY_TYPE_LABELS = {
  MORNING: "صباحي",
  EVENING: "مسائي",
} as const;

export const STATUS_LABELS = {
  PENDING: "بانتظار الموافقة",
  APPROVED: "مقبول",
  REJECTED: "مرفوض",
} as const;
