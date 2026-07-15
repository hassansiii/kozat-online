import path from "path";
import PDFDocument from "pdfkit";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ArabicShaper } = require("arabic-persian-reshaper") as {
  ArabicShaper: { convertArabic: (s: string) => string };
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bidiFactory = require("bidi-js") as () => {
  getEmbeddingLevels: (
    text: string,
    dir?: "ltr" | "rtl"
  ) => { levels: Uint8Array };
  getReorderSegments: (
    text: string,
    levels: { levels: Uint8Array },
    start?: number,
    end?: number
  ) => Array<[number, number]>;
  getMirroredCharactersMap: (
    text: string,
    levels: { levels: Uint8Array }
  ) => Map<number, string>;
};

const bidi = bidiFactory();

/** يجهّز النص العربي للرسم في PDFKit (تشكيل الحروف + اتجاه RTL) */
export function prepareArabic(input: string): string {
  const text = String(input ?? "");
  if (!text) return "";

  const reshaped = ArabicShaper.convertArabic(text);
  const embeddingLevels = bidi.getEmbeddingLevels(reshaped, "rtl");
  const chars = Array.from(reshaped);

  const mirrored = bidi.getMirroredCharactersMap(reshaped, embeddingLevels);
  mirrored.forEach((ch, i) => {
    chars[i] = ch;
  });

  const flips = bidi.getReorderSegments(reshaped, embeddingLevels);
  for (const [start, end] of flips) {
    const slice = chars.slice(start, end + 1).reverse();
    for (let i = start; i <= end; i++) {
      chars[i] = slice[i - start];
    }
  }

  return chars.join("");
}

export function arabicFontPath() {
  const candidates = [
    path.join(process.cwd(), "public", "fonts", "Amiri-Regular.ttf"),
    path.join(process.cwd(), "src", "fonts", "Amiri-Regular.ttf"),
  ];
  const fs = require("fs") as typeof import("fs");
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

export type PdfResultRow = {
  fullName: string;
  score: number | null;
  maxScore: number | null;
  status: string;
};

export async function buildResultsPdf(opts: {
  examTitle: string;
  rows: PdfResultRow[];
  generatedAt?: Date;
}): Promise<Buffer> {
  const fontPath = arabicFontPath();
  const generatedAt = opts.generatedAt || new Date();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      info: {
        Title: `نتائج — ${opts.examTitle}`,
        Author: "كوزات أونلاين",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.registerFont("Arabic", fontPath);
    doc.font("Arabic");

    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const right = left + pageWidth;

    function drawRtl(text: string, xRight: number, y: number, size = 14) {
      doc.fontSize(size);
      const prepared = prepareArabic(text);
      const w = doc.widthOfString(prepared);
      doc.text(prepared, xRight - w, y, { lineBreak: false });
    }

    // عنوان
    drawRtl("كوزات أونلاين", right, 48, 20);
    drawRtl(`نتائج الاختبار: ${opts.examTitle}`, right, 78, 16);

    const dateStr = new Intl.DateTimeFormat("ar-IQ", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(generatedAt);
    drawRtl(`تاريخ التصدير: ${dateStr}`, right, 104, 11);

    doc
      .moveTo(left, 128)
      .lineTo(right, 128)
      .strokeColor("#0d6e5b")
      .lineWidth(1.5)
      .stroke();

    // أعمدة الجدول (من اليمين لليسار): # | الاسم | الدرجة | من أصل
    const colNo = right;
    const colName = right - 40;
    const colScore = left + 140;
    const colMax = left + 70;
    let y = 148;

    function ensureSpace(need = 28) {
      if (y + need > doc.page.height - 56) {
        doc.addPage();
        doc.font("Arabic");
        y = 48;
        drawHeaderRow();
        y += 26;
      }
    }

    function drawHeaderRow() {
      doc.rect(left, y - 4, pageWidth, 24).fill("#0d6e5b");
      doc.fillColor("#ffffff");
      drawRtl("ت", colNo - 8, y, 12);
      drawRtl("اسم الطالب", colName - 8, y, 12);
      drawRtl("الدرجة", colScore, y, 12);
      drawRtl("من أصل", colMax, y, 12);
      doc.fillColor("#000000");
    }

    drawHeaderRow();
    y += 28;

    opts.rows.forEach((row, idx) => {
      ensureSpace();
      if (idx % 2 === 1) {
        doc.rect(left, y - 4, pageWidth, 24).fill("#f3f7f6");
        doc.fillColor("#000000");
      }

      const scoreText =
        row.score == null || Number.isNaN(row.score)
          ? "—"
          : String(row.score);
      const maxText =
        row.maxScore == null || Number.isNaN(row.maxScore)
          ? "—"
          : String(row.maxScore);

      drawRtl(String(idx + 1), colNo - 8, y, 12);
      drawRtl(row.fullName, colName - 8, y, 12);

      // الأرقام تُرسم مباشرة (LTR)
      doc.fontSize(12);
      doc.text(scoreText, colScore - 50, y, {
        width: 50,
        align: "center",
        lineBreak: false,
      });
      doc.text(maxText, colMax - 50, y, {
        width: 50,
        align: "center",
        lineBreak: false,
      });

      y += 26;
    });

    y += 16;
    ensureSpace(40);
    drawRtl(`عدد الطلاب: ${opts.rows.length}`, right, y, 12);

    doc.end();
  });
}
