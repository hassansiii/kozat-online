import { prisma } from "@/lib/prisma";

export const DEFAULT_SITE_SETTINGS = {
  id: "default",
  brandName: "كوزات أونلاين",
  homeTag: "منصة أكاديمية للاختبارات",
  homeTitle: "كوزات أونلاين",
  homeDesc:
    "أنشئ حساباً أو سجّل دخولك للبدء. حسابات الطلاب الجديدة تُحفظ تلقائياً وبانتظار موافقة الدكتور.",
  featuresTitle: "ماذا تقدم المنصة؟",
  feature1: "لوحة إدارة للدكتور لإنشاء الكوزات والأسئلة",
  feature2: "موافقة على تسجيل الطلاب مع إشعارات فورية",
  feature3: "مؤقّت للاختبار وتسليم تلقائي عند انتهاء الوقت",
  feature4: "وضع ملء الشاشة وتسجيل مخالفات مغادرة الصفحة",
  feature5: "نتائج وإحصائيات لكل محاولة",
  primaryColor: "#0d6e5b",
  primaryDark: "#0a5546",
  accentColor: "#c4a35a",
  panelFrom: "#0d6e5b",
  panelVia: "#0a5546",
  panelTo: "#1a3a32",
};

export async function getSiteSettings() {
  const existing = await prisma.siteSettings.findUnique({
    where: { id: "default" },
  });
  if (existing) return existing;

  return prisma.siteSettings.create({
    data: DEFAULT_SITE_SETTINGS,
  });
}
