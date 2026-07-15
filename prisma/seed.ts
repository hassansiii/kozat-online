import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.violation.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.choice.deleteMany();
  await prisma.question.deleteMany();
  await prisma.examAssignment.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("admin2222admin2222", 10);

  const admin = await prisma.user.create({
    data: {
      email: "eadmin28@gmail.com",
      passwordHash,
      fullName: "د. أحمد محمد علي حسين",
      role: "ADMIN",
      status: "APPROVED",
      department: "علوم الحاسوب",
    },
  });

  const studentPasswordHash = await bcrypt.hash("12345678", 10);

  const student = await prisma.user.create({
    data: {
      email: "student@kozat.com",
      passwordHash: studentPasswordHash,
      fullName: "علي حسن كريم جاسم",
      role: "STUDENT",
      status: "APPROVED",
      department: "علوم الحاسوب",
      stage: "الثانية",
      studyType: "MORNING",
      doctorName: "د. أحمد محمد علي حسين",
    },
  });

  const pending = await prisma.user.create({
    data: {
      email: "pending@kozat.com",
      passwordHash: studentPasswordHash,
      fullName: "سارة محمود عبد الله ناصر",
      role: "STUDENT",
      status: "PENDING",
      department: "هندسة البرمجيات",
      stage: "الأولى",
      studyType: "EVENING",
      doctorName: "د. أحمد محمد علي حسين",
    },
  });

  const exam = await prisma.exam.create({
    data: {
      title: "اختبار تجريبي — أساسيات البرمجة",
      description:
        "اختبار تجريبي لقياس فهم أساسيات البرمجة. يُرجى الالتزام بتعليمات الامتحان وعدم مغادرة الشاشة.",
      durationMinutes: 30,
      startsAt: new Date(Date.now() - 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      department: "علوم الحاسوب",
      studyType: "MORNING",
      status: "PUBLISHED",
      shuffleQuestions: true,
      maxViolations: 3,
      passingScore: 50,
      createdById: admin.id,
      questions: {
        create: [
          {
            text: "ما هي لغة البرمجة المستخدمة في تطوير الويب من جانب العميل؟",
            order: 1,
            points: 2,
            choices: {
              create: [
                { text: "JavaScript", isCorrect: true, order: 1 },
                { text: "Python", isCorrect: false, order: 2 },
                { text: "Java", isCorrect: false, order: 3 },
                { text: "C++", isCorrect: false, order: 4 },
              ],
            },
          },
          {
            text: "ماذا يعني HTML؟",
            order: 2,
            points: 2,
            choices: {
              create: [
                { text: "HyperText Markup Language", isCorrect: true, order: 1 },
                { text: "High Transfer Machine Language", isCorrect: false, order: 2 },
                { text: "Home Tool Markup Language", isCorrect: false, order: 3 },
                { text: "Hyperlink Text Management Language", isCorrect: false, order: 4 },
              ],
            },
          },
          {
            text: "أي من التالي يُستخدم لتصميم واجهات المواقع؟",
            order: 3,
            points: 2,
            choices: {
              create: [
                { text: "CSS", isCorrect: true, order: 1 },
                { text: "SQL", isCorrect: false, order: 2 },
                { text: "FTP", isCorrect: false, order: 3 },
                { text: "HTTP", isCorrect: false, order: 4 },
              ],
            },
          },
          {
            text: "ما هو الناتج المنطقي لـ true && false ؟",
            order: 4,
            points: 2,
            choices: {
              create: [
                { text: "false", isCorrect: true, order: 1 },
                { text: "true", isCorrect: false, order: 2 },
                { text: "null", isCorrect: false, order: 3 },
                { text: "undefined", isCorrect: false, order: 4 },
              ],
            },
          },
        ],
      },
    },
    include: { questions: true },
  });

  await prisma.examAssignment.create({
    data: { examId: exam.id, studentId: student.id },
  });

  await prisma.notification.create({
    data: {
      userId: admin.id,
      title: "طالب بانتظار الموافقة",
      message: `سجّل الطالب ${pending.fullName} ويحتاج موافقتك.`,
      link: "/admin/students",
    },
  });

  await prisma.notification.create({
    data: {
      userId: student.id,
      title: "اختبار جديد متاح",
      message: `تم تعيين اختبار «${exam.title}» لك.`,
      link: "/student/exams",
    },
  });

  console.log("تم إنشاء البيانات التجريبية:");
  console.log("الدكتور: eadmin28@gmail.com / admin2222admin2222");
  console.log("الطالب:  student@kozat.com / 12345678");
  console.log("بانتظار الموافقة: pending@kozat.com / 12345678");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
