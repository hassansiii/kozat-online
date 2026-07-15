import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireUser, toPublicUser } from "@/lib/auth";
import { jsonError } from "@/lib/utils";

const schema = z.object({
  fullName: z.string().trim().min(3, "اسم الدكتور مطلوب"),
  email: z.string().email("بريد غير صالح"),
  password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل"),
  subjectName: z.string().trim().min(2, "اسم المادة مطلوب"),
  department: z.string().trim().optional(),
});

export async function POST(req: Request) {
  try {
    await requireUser({ role: "ADMIN" });
    const data = schema.parse(await req.json());

    const email = data.email.toLowerCase().trim();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return jsonError("البريد الإلكتروني مستخدم مسبقاً", 409);

    const passwordHash = await hashPassword(data.password);
    const doctor = await prisma.user.create({
      data: {
        fullName: data.fullName.trim(),
        email,
        passwordHash,
        subjectName: data.subjectName.trim(),
        department: data.department?.trim() || null,
        role: "ADMIN",
        status: "APPROVED",
      },
    });

    return NextResponse.json({
      doctor: toPublicUser(doctor),
      message: "تم إنشاء حساب الدكتور بنجاح",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message || "بيانات غير صالحة");
    }
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    console.error(error);
    return jsonError("تعذر إنشاء حساب الدكتور", 500);
  }
}
