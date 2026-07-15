import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { notifyStudents } from "@/lib/notifications";
import { jsonError } from "@/lib/utils";

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  message: z.string().trim().min(2).max(2000),
  link: z.string().trim().max(300).optional().or(z.literal("")),
  audience: z.enum(["ALL", "APPROVED", "PENDING"]).default("APPROVED"),
});

export async function POST(req: Request) {
  try {
    await requireUser({ role: "ADMIN" });
    const data = schema.parse(await req.json());

    const count = await notifyStudents(data.title, data.message, {
      link: data.link || "/student/notifications",
      audience: data.audience,
    });

    return NextResponse.json({
      sent: count,
      message: `تم إرسال الإعلان إلى ${count} طالب`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message || "بيانات غير صالحة");
    }
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    console.error(error);
    return jsonError("تعذر إرسال الإعلان", 500);
  }
}
