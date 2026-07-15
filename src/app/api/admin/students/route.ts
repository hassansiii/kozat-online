import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import { jsonError } from "@/lib/utils";

export async function GET() {
  try {
    await requireUser({ role: "ADMIN" });
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        fullName: true,
        email: true,
        department: true,
        stage: true,
        studyType: true,
        doctorName: true,
        status: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ students });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    return jsonError("خطأ في جلب الطلاب", 500);
  }
}

const actionSchema = z.object({
  studentId: z.string(),
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

export async function PATCH(req: Request) {
  try {
    await requireUser({ role: "ADMIN" });
    const data = actionSchema.parse(await req.json());

    const student = await prisma.user.findFirst({
      where: { id: data.studentId, role: "STUDENT" },
    });
    if (!student) return jsonError("الطالب غير موجود", 404);

    const status = data.action === "approve" ? "APPROVED" : "REJECTED";
    const updated = await prisma.user.update({
      where: { id: student.id },
      data: { status },
    });

    await notifyUser(
      student.id,
      data.action === "approve" ? "تم قبول حسابك" : "تم رفض حسابك",
      data.action === "approve"
        ? "يمكنك الآن الدخول وأداء الاختبارات المتاحة لك."
        : data.reason || "تم رفض حسابك من قبل الدكتور. تواصل معه للمزيد.",
      data.action === "approve" ? "/student" : "/pending"
    );

    return NextResponse.json({ student: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError("بيانات غير صالحة");
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    return jsonError("تعذر تحديث حالة الطالب", 500);
  }
}

const deleteSchema = z.object({
  studentId: z.string(),
});

export async function DELETE(req: Request) {
  try {
    await requireUser({ role: "ADMIN" });
    const data = deleteSchema.parse(await req.json());

    const student = await prisma.user.findFirst({
      where: { id: data.studentId, role: "STUDENT" },
    });
    if (!student) return jsonError("الطالب غير موجود", 404);

    await prisma.user.delete({ where: { id: student.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError("بيانات غير صالحة");
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    console.error(error);
    return jsonError("تعذر حذف الطالب", 500);
  }
}
