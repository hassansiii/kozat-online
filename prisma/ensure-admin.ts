import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("12345678", 10);
  const email = "eadmin28@gmail.com";

  // Update old demo admin email if it still exists
  const oldAdmin = await prisma.user.findUnique({
    where: { email: "admin@kozat.com" },
  });

  if (oldAdmin) {
    await prisma.user.update({
      where: { id: oldAdmin.id },
      data: {
        email,
        passwordHash,
        role: "ADMIN",
        status: "APPROVED",
      },
    });
    console.log("تم تحديث حساب الأدمن إلى:", email);
  } else {
    await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        role: "ADMIN",
        status: "APPROVED",
        fullName: "د. أحمد محمد علي حسين",
      },
      create: {
        email,
        passwordHash,
        fullName: "د. أحمد محمد علي حسين",
        role: "ADMIN",
        status: "APPROVED",
        department: "علوم الحاسوب",
      },
    });
    console.log("تم إنشاء/تحديث حساب الأدمن:", email);
  }

  console.log("كلمة المرور: 12345678");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
