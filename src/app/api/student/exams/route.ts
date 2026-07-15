import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { autoSubmitIfExpired } from "@/lib/exam";

export async function GET() {
  try {
    const student = await requireUser({ role: "STUDENT", approved: true });

    const assignments = await prisma.examAssignment.findMany({
      where: { studentId: student.id },
      include: {
        exam: {
          include: {
            _count: { select: { questions: true } },
            attempts: {
              where: { studentId: student.id },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const exams = [];
    for (const a of assignments) {
      if (a.exam.status !== "PUBLISHED" && a.exam.status !== "CLOSED") continue;

      let attempt = a.exam.attempts[0] || null;
      if (attempt?.status === "IN_PROGRESS") {
        const updated = await autoSubmitIfExpired(attempt.id);
        if (updated) {
          attempt = {
            ...attempt,
            status: updated.status,
            score: updated.score,
            maxScore: updated.maxScore,
            submittedAt: updated.submittedAt,
          } as typeof attempt;
        }
      }

      // CLOSED exams only show if student already has an attempt
      if (a.exam.status === "CLOSED" && !attempt) continue;

      exams.push({
        id: a.exam.id,
        title: a.exam.title,
        subjectName: a.exam.subjectName,
        description: a.exam.description,
        durationMinutes: a.exam.durationMinutes,
        startsAt: a.exam.startsAt,
        endsAt: a.exam.endsAt,
        questionCount: a.exam._count.questions,
        maxViolations: a.exam.maxViolations,
        attempt,
      });
    }

    return NextResponse.json({ exams });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    if (msg === "PENDING_APPROVAL") return jsonError("حسابك بانتظار الموافقة", 403);
    return jsonError("خطأ في جلب الاختبارات", 500);
  }
}
