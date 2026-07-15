import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import { jsonError } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

async function getOwnedExam(id: string, adminId: string) {
  return prisma.exam.findFirst({
    where: { id, createdById: adminId },
    include: {
      questions: {
        include: { choices: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
      assignments: {
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              department: true,
              status: true,
            },
          },
        },
      },
      _count: { select: { attempts: true } },
    },
  });
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const admin = await requireUser({ role: "ADMIN" });
    const { id } = await ctx.params;
    const exam = await getOwnedExam(id, admin.id);
    if (!exam) return jsonError("الاختبار غير موجود", 404);
    return NextResponse.json({ exam });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    return jsonError("خطأ", 500);
  }
}

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  subjectName: z.string().trim().min(2).optional().nullable(),
  description: z.string().optional().nullable(),
  durationMinutes: z.coerce.number().int().min(1).max(24 * 60).optional(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  studyType: z.enum(["MORNING", "EVENING"]).optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).optional(),
  shuffleQuestions: z.boolean().optional(),
  maxViolations: z.coerce.number().int().min(1).max(20).optional(),
  passingScore: z.coerce.number().int().min(0).max(100).optional(),
  totalScore: z.coerce.number().int().positive().optional(),
  assignStudentIds: z.array(z.string()).optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const admin = await requireUser({ role: "ADMIN" });
    const { id } = await ctx.params;
    const existing = await prisma.exam.findFirst({
      where: { id, createdById: admin.id },
    });
    if (!existing) return jsonError("الاختبار غير موجود", 404);

    const data = updateSchema.parse(await req.json());

    const exam = await prisma.exam.update({
      where: { id },
      data: {
        title: data.title,
        subjectName: data.subjectName,
        description: data.description,
        durationMinutes: data.durationMinutes,
        startsAt:
          data.startsAt === undefined
            ? undefined
            : data.startsAt
              ? new Date(data.startsAt)
              : null,
        endsAt:
          data.endsAt === undefined
            ? undefined
            : data.endsAt
              ? new Date(data.endsAt)
              : null,
        department: data.department,
        studyType: data.studyType,
        status: data.status,
        shuffleQuestions: data.shuffleQuestions,
        maxViolations: data.maxViolations,
        passingScore: data.passingScore,
        totalScore: data.totalScore,
      },
    });

    if (data.assignStudentIds) {
      await prisma.examAssignment.deleteMany({ where: { examId: id } });
      if (data.assignStudentIds.length > 0) {
        await prisma.examAssignment.createMany({
          data: data.assignStudentIds.map((studentId) => ({
            examId: id,
            studentId,
          })),
        });

        for (const studentId of data.assignStudentIds) {
          await notifyUser(
            studentId,
            "تم تعيين اختبار لك",
            `تم تعيين اختبار «${exam.title}» لك.`,
            "/student/exams"
          );
        }
      }
    }

    const full = await getOwnedExam(id, admin.id);
    return NextResponse.json({ exam: full });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError("بيانات غير صالحة");
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    console.error(error);
    return jsonError("تعذر التحديث", 500);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const admin = await requireUser({ role: "ADMIN" });
    const { id } = await ctx.params;
    const existing = await prisma.exam.findFirst({
      where: { id, createdById: admin.id },
    });
    if (!existing) return jsonError("الاختبار غير موجود", 404);
    await prisma.exam.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    return jsonError("تعذر الحذف", 500);
  }
}
