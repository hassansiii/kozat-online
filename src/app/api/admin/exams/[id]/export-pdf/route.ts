import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { buildResultsPdf } from "@/lib/arabic-pdf";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const admin = await requireUser({ role: "ADMIN" });
    const { id } = await ctx.params;

    const exam = await prisma.exam.findFirst({
      where: { id, createdById: admin.id },
      include: {
        assignments: {
          include: {
            student: { select: { id: true, fullName: true } },
          },
        },
        attempts: {
          include: {
            student: { select: { id: true, fullName: true } },
          },
        },
      },
    });
    if (!exam) return jsonError("الاختبار غير موجود", 404);

    const byStudent = new Map<
      string,
      {
        fullName: string;
        score: number | null;
        maxScore: number | null;
        status: string;
        submittedAt: Date | null;
      }
    >();

    for (const a of exam.assignments) {
      byStudent.set(a.student.id, {
        fullName: a.student.fullName,
        score: null,
        maxScore: null,
        status: "لم يؤدِّ",
        submittedAt: null,
      });
    }

    for (const attempt of exam.attempts) {
      const submitted =
        attempt.status === "SUBMITTED" ||
        attempt.status === "AUTO_SUBMITTED";
      byStudent.set(attempt.studentId, {
        fullName: attempt.student.fullName,
        score: submitted ? attempt.score : null,
        maxScore: submitted ? attempt.maxScore : null,
        status: attempt.status,
        submittedAt: attempt.submittedAt,
      });
    }

    const rows = Array.from(byStudent.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName, "ar")
    );

    const pdf = await buildResultsPdf({
      examTitle: exam.title,
      rows,
    });

    const safeName = exam.title
      .replace(/[^\w\u0600-\u06FF\-]+/g, "_")
      .slice(0, 40);
    const filenameAscii = `exam-${id}-results.pdf`;
    const filenameUtf8 = `results-${safeName || id}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filenameAscii}"; filename*=UTF-8''${encodeURIComponent(filenameUtf8)}`,
        "Cache-Control": "no-store",
        "Content-Length": String(pdf.length),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    console.error(error);
    return jsonError("تعذر إنشاء ملف PDF", 500);
  }
}
