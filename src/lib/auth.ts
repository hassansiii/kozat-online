import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { AccountStatus, Role, StudyType } from "@prisma/client";

const COOKIE_NAME = "kozat_session";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: AccountStatus;
  department: string | null;
  stage: string | null;
  studyType: StudyType | null;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    department: user.department,
    stage: user.stage,
    studyType: user.studyType,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = payload.id as string;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      department: user.department,
      stage: user.stage,
      studyType: user.studyType,
    };
  } catch {
    return null;
  }
}

export async function requireUser(options?: {
  role?: Role;
  approved?: boolean;
}) {
  const user = await getSession();
  if (!user) throw new Error("UNAUTHORIZED");
  if (options?.role && user.role !== options.role) throw new Error("FORBIDDEN");
  if (options?.approved && user.role === "STUDENT" && user.status !== "APPROVED") {
    throw new Error("PENDING_APPROVAL");
  }
  return user;
}

export function toPublicUser(user: {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: AccountStatus;
  department: string | null;
  stage: string | null;
  studyType: StudyType | null;
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    department: user.department,
    stage: user.stage,
    studyType: user.studyType,
  };
}
