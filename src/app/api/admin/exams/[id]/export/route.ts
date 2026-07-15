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
            fullName: true,
            email: true,
            department: true,
            studyType: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    const header = [
      "fullName",
      "email",
      "department",
      "studyType",
      "status",
      "score",
      "maxScore",
      "violations",
      "startedAt",
      "submittedAt",
    ];

    const rows = attempts.map((a) =>
      [
        a.student.fullName,
        a.student.email,
        a.student.department || "",
        a.student.studyType || "",
        a.status,
        a.score ?? "",
        a.maxScore ?? "",
        a.violationCount,
        a.startedAt.toISOString(),
        a.submittedAt?.toISOString() || "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );

    const csv = "\uFEFF" + [header.join(","), ...rows].join("\n");
    const filename = `exam-${id}-results.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    return jsonError("تعذر التصدير", 500);
  }
}
