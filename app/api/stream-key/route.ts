import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

const generateStreamKey = () => crypto.randomBytes(24).toString("hex");

async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, streamKey: true },
  });

  return user;
}

export async function GET() {
  const user = await getUserFromToken();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (user.streamKey) {
    return NextResponse.json({ streamKey: user.streamKey });
  }

  const streamKey = generateStreamKey();
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { streamKey },
    select: { streamKey: true },
  });

  return NextResponse.json({ streamKey: updated.streamKey });
}

export async function POST() {
  const user = await getUserFromToken();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const streamKey = generateStreamKey();
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { streamKey },
    select: { streamKey: true },
  });

  return NextResponse.json({ streamKey: updated.streamKey, regenerated: true });
}
