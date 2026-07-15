import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError } from "@/lib/utils";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return jsonError("يجب تسجيل الدخول", 401);

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch {
    return jsonError("خطأ في جلب الإشعارات", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getSession();
    if (!user) return jsonError("يجب تسجيل الدخول", 401);

    const body = await req.json().catch(() => ({}));
    const id = body?.id as string | undefined;

    if (id) {
      await prisma.notification.updateMany({
        where: { id, userId: user.id },
        data: { read: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("تعذر تحديث الإشعارات", 500);
  }
}
