import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const admin = await requireUser({ role: "ADMIN" });
    const { id } = await ctx.params;

    const exam = await prisma.exam.findFirst({
      where: { id, createdById: admin.id },
    });
    if (!exam) return jsonError("الاختبار غير موجود", 404);

    const attempts = await prisma.attempt.findMany({
      where: { examId: id },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            department: true,
            studyType: true,
          },
        },
        violations: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({ exam, attempts });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    return jsonError("خطأ في جلب النتائج", 500);
  }
}
