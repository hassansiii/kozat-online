import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import {
  ensureAttemptStillOpen,
  seededShuffle,
  type QuestionOrderItem,
} from "@/lib/exam";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const student = await requireUser({ role: "STUDENT", approved: true });
    const { id } = await ctx.params;

    const assignment = await prisma.examAssignment.findUnique({
      where: {
        examId_studentId: { examId: id, studentId: student.id },
      },
      include: {
        exam: {
          include: {
            questions: {
              include: { choices: true },
              orderBy: { order: "asc" },
            },
            attempts: {
              where: { studentId: student.id },
              include: { answers: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!assignment || assignment.exam.status !== "PUBLISHED") {
      return jsonError("الاختبار غير متاح", 404);
    }

    const exam = assignment.exam;
    const now = new Date();
    if (exam.startsAt && now < exam.startsAt) {
      return jsonError("لم يحن موعد الاختبار بعد", 403);
    }
    if (exam.endsAt && now > exam.endsAt) {
      return jsonError("انتهى موعد الاختبار", 403);
    }

    let existing = exam.attempts[0] || null;
    if (existing && existing.status === "IN_PROGRESS") {
      const gate = await ensureAttemptStillOpen(existing.id);
      if (gate.closed) {
        return jsonError(
          gate.reason === "violations"
            ? "تم إغلاق الاختبار بسبب المخالفات"
            : "انتهى وقت الاختبار وتم التسليم تلقائياً",
          403
        );
      }
      const refreshed = await prisma.attempt.findUnique({
        where: { id: existing.id },
        include: { answers: true },
      });
      if (!refreshed) return jsonError("المحاولة غير موجودة", 404);
      existing = refreshed;
    }

    if (existing && existing.status !== "IN_PROGRESS") {
      return jsonError("تم تسليم هذا الاختبار مسبقاً", 403);
    }

    let attempt = existing;
    if (!attempt) {
      const endsAt = new Date(now.getTime() + exam.durationMinutes * 60 * 1000);
      let order: QuestionOrderItem[] = exam.questions.map((q) => ({
        questionId: q.id,
        choiceIds: q.choices.map((c) => c.id),
      }));

      if (exam.shuffleQuestions) {
        const seed = `${exam.id}:${student.id}`;
        const shuffledQs = seededShuffle(exam.questions, seed);
        order = shuffledQs.map((q) => ({
          questionId: q.id,
          choiceIds: seededShuffle(
            q.choices.map((c) => c.id),
            `${seed}:${q.id}`
          ),
        }));
      }

      attempt = await prisma.attempt.create({
        data: {
          examId: exam.id,
          studentId: student.id,
          endsAt,
          maxScore: exam.questions.reduce((s, q) => s + q.points, 0),
          questionOrder: JSON.stringify(order),
        },
        include: { answers: true },
      });
    }

    const qMap = new Map(exam.questions.map((q) => [q.id, q]));
    let orderItems: QuestionOrderItem[] = [];
    try {
      orderItems = attempt.questionOrder
        ? (JSON.parse(attempt.questionOrder) as QuestionOrderItem[])
        : [];
    } catch {
      orderItems = [];
    }

    if (orderItems.length === 0) {
      orderItems = exam.questions.map((q) => ({
        questionId: q.id,
        choiceIds: q.choices.map((c) => c.id),
      }));
    }

    const questions = orderItems
      .map((item) => {
        const q = qMap.get(item.questionId);
        if (!q) return null;
        const choiceMap = new Map(q.choices.map((c) => [c.id, c]));
        const choices = item.choiceIds
          .map((cid) => choiceMap.get(cid))
          .filter(Boolean)
          .map((c) => ({ id: c!.id, text: c!.text }));
        return {
          id: q.id,
          text: q.text,
          points: q.points,
          choices:
            choices.length > 0
              ? choices
              : q.choices.map((c) => ({ id: c.id, text: c.text })),
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      exam: {
        id: exam.id,
        title: exam.title,
        subjectName: exam.subjectName,
        description: exam.description,
        durationMinutes: exam.durationMinutes,
        maxViolations: exam.maxViolations,
      },
      attempt: {
        id: attempt.id,
        startedAt: attempt.startedAt,
        endsAt: attempt.endsAt,
        violationCount: attempt.violationCount,
        answers: attempt.answers.map((a) => ({
          questionId: a.questionId,
          choiceId: a.choiceId,
        })),
      },
      questions,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    if (msg === "PENDING_APPROVAL") return jsonError("حسابك بانتظار الموافقة", 403);
    console.error(error);
    return jsonError("تعذر بدء الاختبار", 500);
  }
}
