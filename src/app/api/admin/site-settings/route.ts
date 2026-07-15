import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { jsonError } from "@/lib/utils";

const hex = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "لون غير صالح");

const updateSchema = z.object({
  brandName: z.string().trim().min(2).max(80),
  homeTag: z.string().trim().min(2).max(120),
  homeTitle: z.string().trim().min(2).max(120),
  homeDesc: z.string().trim().min(10).max(2000),
  featuresTitle: z.string().trim().min(2).max(120),
  feature1: z.string().trim().min(2).max(300),
  feature2: z.string().trim().min(2).max(300),
  feature3: z.string().trim().min(2).max(300),
  feature4: z.string().trim().min(2).max(300),
  feature5: z.string().trim().min(2).max(300),
  primaryColor: hex,
  primaryDark: hex,
  accentColor: hex,
  panelFrom: hex,
  panelVia: hex,
  panelTo: hex,
});

export async function GET() {
  try {
    await requireUser({ role: "ADMIN" });
    const settings = await getSiteSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    return jsonError("تعذر جلب الإعدادات", 500);
  }
}

export async function PUT(req: Request) {
  try {
    await requireUser({ role: "ADMIN" });
    const data = updateSchema.parse(await req.json());

    const settings = await prisma.siteSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...data },
      update: data,
    });

    return NextResponse.json({
      settings,
      message: "تم حفظ محتوى وتصميم الموقع",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message || "بيانات غير صالحة");
    }
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    console.error(error);
    return jsonError("تعذر حفظ الإعدادات", 500);
  }
}
