import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { notifyAdmins } from "@/lib/notifications";
import { jsonError } from "@/lib/utils";
import { gradeAndSubmitAttempt } from "@/lib/exam";

type Ctx = { params: Promise<{ id: string }> };

const submitSchema = z.object({
  attemptId: z.string(),
  reason: z.enum(["manual", "timeout", "violations"]).optional(),
});

export async function POST(req: Request, ctx: Ctx) {
  try {
    const student = await requireUser({ role: "STUDENT", approved: true });
    const { id: examId } = await ctx.params;
    const data = submitSchema.parse(await req.json());

    const attempt = await prisma.attempt.findFirst({
      where: {
        id: data.attemptId,
        examId,
        studentId: student.id,
      },
      include: { exam: true },
    });

    if (!attempt) return jsonError("المحاولة غير موجودة", 404);
    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({
        attempt: {
          id: attempt.id,
          score: attempt.score,
          maxScore: attempt.maxScore,
          status: attempt.status,
          passingScore: attempt.exam.passingScore,
        },
      });
    }

    let reason = data.reason || "manual";
    if (new Date() > attempt.endsAt) reason = "timeout";

    const updated = await gradeAndSubmitAttempt(attempt.id, reason);
    if (!updated) return jsonError("تعذر التسليم", 500);

    await notifyAdmins(
      "تسليم اختبار",
      `سلّم الطالب ${student.fullName} اختبار «${attempt.exam.title}» بدرجة ${updated.score}/${updated.maxScore}.`,
      `/admin/exams/${examId}/results`
    );

    return NextResponse.json({
      attempt: {
        id: updated.id,
        score: updated.score,
        maxScore: updated.maxScore,
        status: updated.status,
        passingScore: attempt.exam.passingScore,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError("بيانات غير صالحة");
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    console.error(error);
    return jsonError("تعذر تسليم الاختبار", 500);
  }
}
