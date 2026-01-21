import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const user = await (prisma as any).user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, nickname: true },
    });

    if (!user) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error("Get profile error", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { nickname } = await request.json();

    if (nickname !== null && nickname !== undefined) {
      if (typeof nickname !== "string" || nickname.trim().length === 0) {
        return NextResponse.json({ error: "invalid_nickname" }, { status: 400 });
      }

      // Проверяем уникальность nickname
      if (nickname.trim().length > 0) {
        const existing = await (prisma as any).user.findUnique({
          where: { nickname: nickname.trim() },
          select: { id: true },
        });

        if (existing && existing.id !== payload.sub) {
          return NextResponse.json({ error: "nickname_taken" }, { status: 409 });
        }
      }
    }

    const user = await (prisma as any).user.update({
      where: { id: payload.sub },
      data: {
        nickname: nickname ? nickname.trim() : null,
      },
      select: { id: true, email: true, nickname: true },
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error("Update profile error", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
