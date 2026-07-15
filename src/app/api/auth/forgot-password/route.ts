import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { jsonError } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const body = z
      .object({ email: z.string().email() })
      .parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase().trim() },
    });

    // Always return success message to avoid email enumeration
    if (!user) {
      return NextResponse.json({
        message: "إذا كان البريد مسجلاً، ستصلك تعليمات إعادة التعيين.",
      });
    }

    const token = randomBytes(24).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      message: "تم إنشاء رابط إعادة التعيين.",
      resetPath: `/reset-password?token=${token}`,
      note: "البريد الإلكتروني غير مفعّل حالياً — انسخ الرابط أدناه أو افتحه مباشرة (صالح لمدة ساعة).",
    });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError("بريد غير صالح");
    return jsonError("تعذر الطلب", 500);
  }
}
