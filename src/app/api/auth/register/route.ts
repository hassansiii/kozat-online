import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword, toPublicUser } from "@/lib/auth";
import { notifyAdmins } from "@/lib/notifications";
import { isQuadName, jsonError } from "@/lib/utils";

const registerSchema = z.object({
  fullName: z.string().trim().min(1, "الاسم الرباعي مطلوب"),
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل"),
  department: z.string().min(2),
  stage: z.string().min(1),
  studyType: z.enum(["MORNING", "EVENING"]),
  doctorName: z.string().trim().min(3, "اسم الدكتور مطلوب"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    if (!isQuadName(data.fullName)) {
      return jsonError("أدخل الاسم الرباعي كاملاً (أربع كلمات على الأقل)");
    }

    const exists = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (exists) return jsonError("البريد الإلكتروني مستخدم مسبقاً", 409);

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        fullName: data.fullName.trim(),
        email: data.email.toLowerCase().trim(),
        passwordHash,
        department: data.department,
        stage: data.stage,
        studyType: data.studyType,
        doctorName: data.doctorName.trim(),
        role: "STUDENT",
        status: "PENDING",
      },
    });

    await notifyAdmins(
      "تسجيل طالب جديد",
      `سجّل الطالب ${user.fullName} لدى الدكتور ${user.doctorName} في قسم ${user.department} ويحتاج موافقة.`,
      "/admin/students"
    );

    await createSession(toPublicUser(user));

    return NextResponse.json({
      user: toPublicUser(user),
      message: "تم إنشاء الحساب بنجاح. بانتظار موافقة الدكتور.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message || "بيانات غير صالحة");
    }
    console.error(error);
    return jsonError("حدث خطأ أثناء التسجيل", 500);
  }
}
