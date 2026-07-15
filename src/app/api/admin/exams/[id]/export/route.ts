import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

function formatResult(score: number | null, maxScore: number | null) {
  if (score == null) return "—";
  if (maxScore == null) return String(score);
  return `${score} / ${maxScore}`;
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const admin = await requireUser({ role: "ADMIN" });
    const { id } = await ctx.params;

    const exam = await prisma.exam.findFirst({
      where: { id, createdById: admin.id },
      include: {
        assignments: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                department: true,
              },
            },
          },
        },
        attempts: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                department: true,
              },
            },
          },
        },
      },
    });
    if (!exam) return jsonError("الاختبار غير موجود", 404);

    type Row = {
      fullName: string;
      department: string;
      result: string;
    };

    const byStudent = new Map<string, Row>();

    for (const a of exam.assignments) {
      byStudent.set(a.student.id, {
        fullName: a.student.fullName,
        department: a.student.department || "—",
        result: "—",
      });
    }

    for (const attempt of exam.attempts) {
      const submitted =
        attempt.status === "SUBMITTED" ||
        attempt.status === "AUTO_SUBMITTED";
      byStudent.set(attempt.studentId, {
        fullName: attempt.student.fullName,
        department: attempt.student.department || "—",
        result: submitted
          ? formatResult(attempt.score, attempt.maxScore)
          : "—",
      });
    }

    const rows = Array.from(byStudent.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName, "ar")
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "كوزات أونلاين";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("النتائج", {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }],
    });

    sheet.mergeCells("A1:D1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `نتائج الاختبار: ${exam.title}`;
    titleCell.font = { bold: true, size: 16, color: { argb: "FF0F3D32" } };
    titleCell.alignment = { horizontal: "right", vertical: "middle" };
    sheet.getRow(1).height = 28;

    sheet.mergeCells("A2:D2");
    const metaCell = sheet.getCell("A2");
    metaCell.value = `تاريخ التصدير: ${new Date().toLocaleString("ar-IQ")}`;
    metaCell.font = { size: 11, color: { argb: "FF666666" } };
    metaCell.alignment = { horizontal: "right", vertical: "middle" };

    const headers = ["ت", "اسم الطالب", "القسم", "النتيجة"];
    const headerRow = sheet.getRow(3);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F766E" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF0D9488" } },
        left: { style: "thin", color: { argb: "FF0D9488" } },
        bottom: { style: "thin", color: { argb: "FF0D9488" } },
        right: { style: "thin", color: { argb: "FF0D9488" } },
      };
    });
    headerRow.height = 22;

    rows.forEach((r, idx) => {
      const row = sheet.getRow(idx + 4);
      const values = [idx + 1, r.fullName, r.department, r.result];
      values.forEach((v, i) => {
        const cell = row.getCell(i + 1);
        cell.value = v;
        cell.alignment = {
          horizontal: i === 0 || i === 3 ? "center" : "right",
          vertical: "middle",
        };
        cell.font = { size: 11 };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
        if (idx % 2 === 1) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF0FDFA" },
          };
        }
      });
    });

    sheet.getColumn(1).width = 8;
    sheet.getColumn(2).width = 36;
    sheet.getColumn(3).width = 24;
    sheet.getColumn(4).width = 16;

    const buffer = await workbook.xlsx.writeBuffer();
    const bytes = Buffer.from(buffer);

    const safeName = exam.title
      .replace(/[^\w\u0600-\u06FF\-]+/g, "_")
      .slice(0, 40);
    const filenameAscii = `exam-${id}-results.xlsx`;
    const filenameUtf8 = `نتائج-${safeName || id}.xlsx`;

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filenameAscii}"; filename*=UTF-8''${encodeURIComponent(filenameUtf8)}`,
        "Cache-Control": "no-store",
        "Content-Length": String(bytes.length),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("يجب تسجيل الدخول", 401);
    if (msg === "FORBIDDEN") return jsonError("غير مصرح", 403);
    console.error(error);
    return jsonError("تعذر تصدير ملف Excel", 500);
  }
}
