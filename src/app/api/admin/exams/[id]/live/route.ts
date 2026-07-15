import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { autoSubmitIfExpired } from "@/lib/exam";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const admin = await requireUser({ role: "ADMIN" });
    const { id } = await ctx.params;

    const exam = await prisma.exam.findFirst({
      where: { id, createdById: admin.id },
    });
    if (!exam) return jsonError("الاختبار غير موجود", 404);

    const live = await prisma.attempt.findMany({
      where: { examId: id, status: "IN_PROGRESS" },
      include: {
        student: {
          select: { id: true, fullName: true, email: true, department: true },
        },
        violations: { orderBy: { createdAt: "desc" }, take: 5 },
        _count: { select: { answers: true } },
      },
      orderBy: { startedAt: "desc" },
    });

    // Auto-close expired while monitoring
    const cleaned = [];
    for (const a of live) {
      const updated = await autoSubmitIfExpired(a.id);
      if (updated && updated.status === "IN_PROGRESS") cleaned.push(a);
    }

    return NextResponse.json({
      exam,
      live: cleaned,
      questionCount: await prisma.question.count({ where: { examId: id } }),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    return jsonError("خطأ", 500);
  }
}
