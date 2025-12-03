import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createToken, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const normalizedEmail = (email as string | undefined)?.trim().toLowerCase();
    if (!normalizedEmail || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    const { token, expiresAt } = createToken(user.id, user.email);
    const cookieStore = await cookies();

    cookieStore.set("auth_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(expiresAt * 1000),
    });

    return NextResponse.json({
      ok: true,
      expiresAt,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error("Login error", error);
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
}
