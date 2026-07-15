import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "kozat_session";

async function getPayload(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET || "kozat-online-dev-secret-change-in-production"
    );
    const { payload } = await jwtVerify(token, secret);
    return payload as {
      id: string;
      role: string;
      status: string;
    };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const user = await getPayload(req);

  if (pathname.startsWith("/admin")) {
    if (!user) return NextResponse.redirect(new URL("/login", req.url));
    if (user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/student", req.url));
    }
  }

  if (pathname.startsWith("/student") || pathname.startsWith("/exam")) {
    if (!user) return NextResponse.redirect(new URL("/login", req.url));
    if (user.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    if (pathname.startsWith("/exam") && user.status !== "APPROVED") {
      return NextResponse.redirect(new URL("/pending", req.url));
    }
  }

  if (pathname === "/pending") {
    if (!user) return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*", "/exam/:path*", "/pending"],
};
