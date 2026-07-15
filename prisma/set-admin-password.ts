import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "eadmin28@gmail.com";
  const password = "admin2222admin2222";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: "د. أحمد محمد علي حسين",
        role: "ADMIN",
        status: "APPROVED",
        department: "علوم الحاسوب",
      },
    });
    console.log("تم إنشاء الأدمن:", email);
  } else {
    await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        role: "ADMIN",
        status: "APPROVED",
      },
    });
    console.log("تم تحديث كلمة مرور الأدمن:", email);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
