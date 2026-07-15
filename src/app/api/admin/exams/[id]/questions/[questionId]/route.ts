import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string; questionId: string }> };

const updateSchema = z.object({
  text: z.string().trim().min(3).optional(),
  points: z.coerce.number().int().positive().optional(),
  choices: z
    .array(
      z.object({
        id: z.string().optional(),
        text: z.string().trim().min(1),
        isCorrect: z.boolean(),
      })
    )
    .length(4)
    .optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const admin = await requireUser({ role: "ADMIN" });
    const { id: examId, questionId } = await ctx.params;

    const exam = await prisma.exam.findFirst({
      where: { id: examId, createdById: admin.id },
    });
    if (!exam) return jsonError("الاختبار غير موجود", 404);

    const question = await prisma.question.findFirst({
      where: { id: questionId, examId },
    });
    if (!question) return jsonError("السؤال غير موجود", 404);

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "بيانات غير صالحة");
    }
    const data = parsed.data;

    if (data.choices) {
      const correct = data.choices.filter((c) => c.isCorrect).length;
      if (correct !== 1) return jsonError("يجب تحديد اختيار صحيح واحد فقط");
      await prisma.choice.deleteMany({ where: { questionId } });
      await prisma.choice.createMany({
        data: data.choices.map((c, i) => ({
          questionId,
          text: c.text,
          isCorrect: c.isCorrect,
          order: i + 1,
        })),
      });
    }

    const updated = await prisma.question.update({
      where: { id: questionId },
      data: {
        text: data.text,
        points: data.points,
      },
      include: { choices: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ question: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    return jsonError("تعذر التعديل", 500);
  }
}
