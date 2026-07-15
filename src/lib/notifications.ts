import { prisma } from "./prisma";

export async function notifyUser(
  userId: string,
  title: string,
  message: string,
  link?: string
) {
  return prisma.notification.create({
    data: { userId, title, message, link },
  });
}

export async function notifyAdmins(
  title: string,
  message: string,
  link?: string
) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      title,
      message,
      link,
    })),
  });
}

export async function notifyStudents(
  title: string,
  message: string,
  opts?: {
    link?: string;
    audience?: "ALL" | "APPROVED" | "PENDING";
  }
) {
  const audience = opts?.audience || "APPROVED";
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      ...(audience === "ALL"
        ? {}
        : { status: audience === "APPROVED" ? "APPROVED" : "PENDING" }),
    },
    select: { id: true },
  });

  if (students.length === 0) return 0;

  await prisma.notification.createMany({
    data: students.map((s) => ({
      userId: s.id,
      title,
      message,
      link: opts?.link || "/student/notifications",
    })),
  });

  return students.length;
}
