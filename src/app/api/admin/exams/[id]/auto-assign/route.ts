import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import { jsonError } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const admin = await requireUser({ role: "ADMIN" });
    const { id } = await ctx.params;

    const exam = await prisma.exam.findFirst({
      where: { id, createdById: admin.id },
    });
    if (!exam) return jsonError("الاختبار غير موجود", 404);

    const baseWhere = {
      role: "STUDENT" as const,
      status: "APPROVED" as const,
      ...(exam.department ? { department: exam.department } : {}),
      ...(exam.studyType ? { studyType: exam.studyType } : {}),
    };

    const doctorKey = admin.fullName.replace(/^د\.?\s*/u, "").trim();
    let students = await prisma.user.findMany({
      where: {
        ...baseWhere,
        doctorName: { contains: doctorKey },
      },
      select: { id: true },
    });

    // إن لم يُسجَّل أحد باسم هذا الدكتور، نرجع لتعيين حسب القسم/نوع الدراسة
    if (students.length === 0) {
      students = await prisma.user.findMany({
        where: baseWhere,
        select: { id: true },
      });
    }

    let added = 0;
    for (const s of students) {
      try {
        await prisma.examAssignment.create({
          data: { examId: id, studentId: s.id },
        });
        await notifyUser(
          s.id,
          "تم تعيين اختبار لك",
          `تم تعيين اختبار «${exam.title}» لك.`,
          "/student/exams"
        );
        added += 1;
      } catch {
        // already assigned
      }
    }

    return NextResponse.json({
      added,
      totalMatched: students.length,
      message: `تم تعيين ${added} طالب تلقائياً`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    return jsonError("تعذر التعيين التلقائي", 500);
  }
}
