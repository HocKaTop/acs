import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createToken, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MIN_PASSWORD_LENGTH = 6;

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const normalizedEmail = (email as string | undefined)?.trim().toLowerCase();
    if (
      !normalizedEmail ||
      !normalizedEmail.includes("@") ||
      typeof password !== "string" ||
      password.length < MIN_PASSWORD_LENGTH
    ) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
      },
      select: { id: true, email: true },
    });

    const { token, expiresAt } = createToken(user.id, user.email);
    const cookieStore = await cookies();

    cookieStore.set("auth_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(expiresAt * 1000),
    });

    return NextResponse.json({ ok: true, user, expiresAt });
  } catch (error) {
    console.error("Register error", error);
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
}
