import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, toPublicUser, verifyPassword } from "@/lib/auth";
import { jsonError } from "@/lib/utils";

const loginSchema = z.object({
  fullName: z.string().trim().optional().default(""),
  email: z.string().email(),
  password: z.string().min(1),
});

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = loginSchema.parse(body);

    let user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
      return jsonError("الاسم أو البريد أو كلمة المرور غير صحيحة", 401);
    }

    if (user.role === "STUDENT") {
      if (!data.fullName || data.fullName.trim().length < 3) {
        return jsonError("الاسم مطلوب لتسجيل دخول الطالب", 400);
      }
      if (normalizeName(user.fullName) !== normalizeName(data.fullName)) {
        return jsonError("الاسم غير مطابق للحساب المسجّل", 401);
      }
      if (user.status === "REJECTED") {
        return jsonError("تم رفض حسابك. تواصل مع الدكتور.", 403);
      }
    }

    // إذا أدخل الأدمن اسماً عند الدخول نحفظه ليظهر في الأعلى
    if (user.role === "ADMIN" && data.fullName.trim().length >= 3) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { fullName: data.fullName.trim() },
      });
    }

    await createSession(toPublicUser(user));

    return NextResponse.json({ user: toPublicUser(user) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message || "بيانات غير صالحة");
    }
    console.error(error);
    return jsonError("حدث خطأ أثناء تسجيل الدخول", 500);
  }
}
