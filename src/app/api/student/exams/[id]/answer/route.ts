import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { ensureAttemptStillOpen } from "@/lib/exam";

type Ctx = { params: Promise<{ id: string }> };

const answerSchema = z.object({
  attemptId: z.string(),
  questionId: z.string(),
  choiceId: z.string().nullable(),
});

export async function POST(req: Request, ctx: Ctx) {
  try {
    const student = await requireUser({ role: "STUDENT", approved: true });
    const { id: examId } = await ctx.params;
    const data = answerSchema.parse(await req.json());

    const attempt = await prisma.attempt.findFirst({
      where: {
        id: data.attemptId,
        examId,
        studentId: student.id,
        status: "IN_PROGRESS",
      },
    });
    if (!attempt) return jsonError("المحاولة غير موجودة", 404);

    const gate = await ensureAttemptStillOpen(attempt.id);
    if (gate.closed) {
      return jsonError(
        gate.reason === "violations"
          ? "تم إغلاق الاختبار بسبب المخالفات"
          : "انتهى وقت الاختبار وتم التسليم تلقائياً",
        403
      );
    }

    const answer = await prisma.answer.upsert({
      where: {
        attemptId_questionId: {
          attemptId: attempt.id,
          questionId: data.questionId,
        },
      },
      create: {
        attemptId: attempt.id,
        questionId: data.questionId,
        choiceId: data.choiceId,
      },
      update: { choiceId: data.choiceId },
    });

    return NextResponse.json({ answer });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError("بيانات غير صالحة");
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    return jsonError("تعذر حفظ الإجابة", 500);
  }
}
