import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/utils";

const FIELD_LABELS: Record<string, string> = {
  title: "عنوان الاختبار",
  subjectName: "اسم المادة",
  description: "الوصف",
  durationMinutes: "المدة",
  startsAt: "تاريخ البداية",
  endsAt: "تاريخ الانتهاء",
  department: "القسم",
  studyType: "نوع الدراسة",
  status: "الحالة",
  shuffleQuestions: "ترتيب عشوائي",
  maxViolations: "أقصى مخالفات",
  passingScore: "درجة النجاح",
  totalScore: "الدرجة الكلية",
};

function formatExamZodError(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return "بيانات غير صالحة";
  const key = String(issue.path[0] || "");
  const label = FIELD_LABELS[key] || key || "غير معروف";
  return `خطأ في حقل «${label}»: ${issue.message}`;
}

export async function GET() {
  try {
    const admin = await requireUser({ role: "ADMIN" });
    const exams = await prisma.exam.findMany({
      where: { createdById: admin.id },
      include: {
        _count: { select: { questions: true, attempts: true, assignments: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ exams });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    return jsonError("خطأ في جلب الاختبارات", 500);
  }
}

const examSchema = z.object({
  title: z
    .string({ error: "هذا الحقل مطلوب" })
    .trim()
    .min(3, "يجب أن يكون 3 أحرف على الأقل"),
  subjectName: z
    .string({ error: "هذا الحقل مطلوب" })
    .trim()
    .min(2, "يجب أن يكون حرفين على الأقل"),
  description: z.string().optional().nullable(),
  durationMinutes: z.coerce
    .number({ error: "أدخل رقماً صحيحاً" })
    .int("يجب أن تكون المدة عدداً صحيحاً")
    .min(1, "يجب أن تكون دقيقة واحدة على الأقل")
    .max(24 * 60, "أقصى مدة مسموحة 24 ساعة"),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  studyType: z
    .union([
      z.literal("MORNING"),
      z.literal("EVENING"),
      z.literal(""),
      z.null(),
    ])
    .optional(),
  status: z
    .union([
      z.literal("DRAFT"),
      z.literal("PUBLISHED"),
      z.literal("CLOSED"),
    ])
    .optional(),
  shuffleQuestions: z.boolean().optional(),
  maxViolations: z.coerce
    .number({ error: "أدخل رقماً صحيحاً" })
    .int("يجب أن يكون عدداً صحيحاً")
    .min(1, "الحد الأدنى مخالفة واحدة")
    .max(20, "الحد الأقصى 20 مخالفة")
    .optional(),
  passingScore: z.coerce
    .number({ error: "أدخل رقماً صحيحاً" })
    .int("يجب أن يكون عدداً صحيحاً")
    .min(0, "لا يمكن أن تكون أقل من 0")
    .max(100, "لا يمكن أن تكون أكثر من 100")
    .optional(),
  totalScore: z.coerce
    .number({ error: "أدخل رقماً صحيحاً" })
    .int("يجب أن يكون عدداً صحيحاً")
    .positive("يجب أن تكون أكبر من صفر")
    .optional(),
});

export async function POST(req: Request) {
  try {
    const admin = await requireUser({ role: "ADMIN" });
    const body = await req.json();
    const parsed = examSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(formatExamZodError(parsed.error));
    }

    const data = parsed.data;
    const studyType =
      data.studyType === "" || data.studyType == null ? null : data.studyType;

    if (data.startsAt && data.endsAt) {
      const start = new Date(data.startsAt);
      const end = new Date(data.endsAt);
      if (Number.isNaN(start.getTime())) {
        return jsonError("خطأ في حقل «تاريخ البداية»: التاريخ غير صالح");
      }
      if (Number.isNaN(end.getTime())) {
        return jsonError("خطأ في حقل «تاريخ الانتهاء»: التاريخ غير صالح");
      }
      if (end <= start) {
        return jsonError(
          "خطأ في حقل «تاريخ الانتهاء»: يجب أن يكون بعد تاريخ البداية"
        );
      }
    }

    const exam = await prisma.exam.create({
      data: {
        title: data.title,
        subjectName: data.subjectName,
        description: data.description?.trim() || null,
        durationMinutes: data.durationMinutes,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        department: data.department?.trim() || null,
        studyType,
        status: data.status || "DRAFT",
        shuffleQuestions: data.shuffleQuestions ?? true,
        maxViolations: data.maxViolations ?? 3,
        passingScore: data.passingScore ?? 50,
        totalScore: data.totalScore ?? 100,
        createdById: admin.id,
      },
    });

    return NextResponse.json({ exam }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    console.error(error);
    if (msg.includes("subjectName") || msg.includes("Unknown argument")) {
      return jsonError(
        "خطأ في حقل «اسم المادة»: أعد تشغيل السيرفر ثم حاول مجدداً",
        500
      );
    }
    return jsonError(
      `تعذر إنشاء الاختبار: ${msg || "خطأ غير معروف في الخادم"}`,
      500
    );
  }
}
