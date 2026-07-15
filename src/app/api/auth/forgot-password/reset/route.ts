import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { jsonError } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const body = z
      .object({
        token: z.string().min(10),
        password: z.string().min(8),
      })
      .parse(await req.json());

    const user = await prisma.user.findFirst({
      where: {
        resetToken: body.token,
        resetTokenExpires: { gt: new Date() },
      },
    });

    if (!user) return jsonError("الرابط غير صالح أو منتهي", 400);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(body.password),
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return NextResponse.json({ message: "تم تحديث كلمة المرور بنجاح" });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError("بيانات غير صالحة");
    return jsonError("تعذر التحديث", 500);
  }
}
