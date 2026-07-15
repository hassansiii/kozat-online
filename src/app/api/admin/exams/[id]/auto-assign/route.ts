import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
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

    if (students.length === 0) {
      students = await prisma.user.findMany({
        where: baseWhere,
        select: { id: true },
      });
    }

    if (students.length === 0) {
      return NextResponse.json({
        added: 0,
        totalMatched: 0,
        message: "لا يوجد طلاب مطابقون للتعيين",
      });
    }

    const existing = await prisma.examAssignment.findMany({
      where: { examId: id },
      select: { studentId: true },
    });
    const already = new Set(existing.map((e) => e.studentId));
    const toAdd = students.filter((s) => !already.has(s.id));

    if (toAdd.length > 0) {
      await prisma.examAssignment.createMany({
        data: toAdd.map((s) => ({ examId: id, studentId: s.id })),
        skipDuplicates: true,
      });

      await prisma.notification.createMany({
        data: toAdd.map((s) => ({
          userId: s.id,
          title: "تم تعيين اختبار لك",
          message: `تم تعيين اختبار «${exam.title}» لك.`,
          link: "/student/exams",
        })),
      });
    }

    return NextResponse.json({
      added: toAdd.length,
      totalMatched: students.length,
      message: `تم تعيين ${toAdd.length} طالب تلقائياً`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    return jsonError("تعذر التعيين التلقائي", 500);
  }
}
