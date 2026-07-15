import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { notifyAdmins } from "@/lib/notifications";
import { jsonError } from "@/lib/utils";
import { ensureAttemptStillOpen, gradeAndSubmitAttempt } from "@/lib/exam";

type Ctx = { params: Promise<{ id: string }> };

const violationSchema = z.object({
  attemptId: z.string(),
  type: z.string().min(2),
  detail: z.string().optional(),
});

export async function POST(req: Request, ctx: Ctx) {
  try {
    const student = await requireUser({ role: "STUDENT", approved: true });
    const { id: examId } = await ctx.params;
    const data = violationSchema.parse(await req.json());

    const attempt = await prisma.attempt.findFirst({
      where: {
        id: data.attemptId,
        examId,
        studentId: student.id,
        status: "IN_PROGRESS",
      },
      include: { exam: true },
    });

    if (!attempt) return jsonError("المحاولة غير موجودة", 404);

    const gate = await ensureAttemptStillOpen(attempt.id);
    if (gate.closed) {
      return NextResponse.json({
        violationCount: gate.attempt?.violationCount ?? attempt.violationCount,
        maxViolations: attempt.exam.maxViolations,
        shouldAutoSubmit: true,
        autoSubmitted: true,
        reason: gate.reason,
      });
    }

    const recent = await prisma.violation.findFirst({
      where: {
        attemptId: attempt.id,
        createdAt: { gte: new Date(Date.now() - 8000) },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recent) {
      return NextResponse.json({
        violationCount: attempt.violationCount,
        maxViolations: attempt.exam.maxViolations,
        shouldAutoSubmit: attempt.violationCount >= attempt.exam.maxViolations,
        ignored: true,
      });
    }

    await prisma.violation.create({
      data: {
        attemptId: attempt.id,
        type: data.type,
        detail: data.detail || null,
      },
    });

    const updated = await prisma.attempt.update({
      where: { id: attempt.id },
      data: { violationCount: { increment: 1 } },
      include: { exam: true },
    });

    let shouldAutoSubmit =
      updated.violationCount >= updated.exam.maxViolations;
    let autoSubmitted = false;

    if (shouldAutoSubmit) {
      const closed = await gradeAndSubmitAttempt(updated.id, "violations");
      autoSubmitted = Boolean(closed);
      if (autoSubmitted) {
        await notifyAdmins(
          "تسليم بسبب مخالفات",
          `تم تسليم اختبار «${updated.exam.title}» تلقائياً للطالب ${student.fullName} بسبب تجاوز المخالفات.`,
          `/admin/exams/${examId}/live`
        );
      }
    }

    return NextResponse.json({
      violationCount: updated.violationCount,
      maxViolations: updated.exam.maxViolations,
      shouldAutoSubmit,
      autoSubmitted,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError("بيانات غير صالحة");
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    return jsonError("تعذر تسجيل المخالفة", 500);
  }
}
