import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/site-settings";
import { jsonError } from "@/lib/utils";

export async function GET() {
  try {
    const settings = await getSiteSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error(error);
    return jsonError("تعذر جلب إعدادات الموقع", 500);
  }
}
