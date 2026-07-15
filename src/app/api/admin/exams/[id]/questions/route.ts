import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

const questionSchema = z.object({
  text: z.string().trim().min(3, "نص السؤال قصير جداً"),
  points: z.coerce.number().int().positive("درجة السؤال مطلوبة"),
  choices: z
    .array(
      z.object({
        text: z.string().trim().min(1, "نص الاختيار مطلوب"),
        isCorrect: z.boolean(),
      })
    )
    .length(4, "يجب إدخال 4 اختيارات"),
});

export async function POST(req: Request, ctx: Ctx) {
  try {
    const admin = await requireUser({ role: "ADMIN" });
    const { id: examId } = await ctx.params;

    const exam = await prisma.exam.findFirst({
      where: { id: examId, createdById: admin.id },
      include: {
        _count: { select: { questions: true } },
      },
    });
    if (!exam) return jsonError("الاختبار غير موجود", 404);

    const parsed = questionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "بيانات غير صالحة");
    }

    const data = parsed.data;
    const correctCount = data.choices.filter((c) => c.isCorrect).length;
    if (correctCount !== 1) {
      return jsonError("يجب تحديد اختيار صحيح واحد فقط");
    }

    const question = await prisma.question.create({
      data: {
        examId,
        text: data.text,
        points: data.points,
        order: exam._count.questions + 1,
        choices: {
          create: data.choices.map((c, i) => ({
            text: c.text,
            isCorrect: c.isCorrect,
            order: i + 1,
          })),
        },
      },
      include: { choices: true },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    console.error(error);
    return jsonError("تعذر إضافة السؤال", 500);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const admin = await requireUser({ role: "ADMIN" });
    const { id: examId } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get("questionId");
    if (!questionId) return jsonError("معرّف السؤال مطلوب");

    const exam = await prisma.exam.findFirst({
      where: { id: examId, createdById: admin.id },
    });
    if (!exam) return jsonError("الاختبار غير موجود", 404);

    await prisma.question.deleteMany({
      where: { id: questionId, examId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    return jsonError("تعذر حذف السؤال", 500);
  }
}
