import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/utils";

export async function GET() {
  try {
    const admin = await requireUser({ role: "ADMIN" });

    const [studentsPending, examsCount, attemptsCount, recentNotifications] =
      await Promise.all([
        prisma.user.count({
          where: { role: "STUDENT", status: "PENDING" },
        }),
        prisma.exam.count({ where: { createdById: admin.id } }),
        prisma.attempt.count({
          where: { exam: { createdById: admin.id } },
        }),
        prisma.notification.findMany({
          where: { userId: admin.id },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

    const recentStudents = await prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        fullName: true,
        email: true,
        department: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      stats: {
        studentsPending,
        examsCount,
        attemptsCount,
      },
      recentStudents,
      recentNotifications,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    return jsonError("خطأ", 500);
  }
}
