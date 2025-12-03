import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import path from "path";
import fs from "fs";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STREAMS_DIR = path.join(process.cwd(), "streams");

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { streamKey: true },
  });

  if (!user?.streamKey) {
    return NextResponse.json({ error: "no_stream_key" }, { status: 400 });
  }

  const streamPath = path.resolve(path.join(STREAMS_DIR, user.streamKey));
  if (!streamPath.startsWith(STREAMS_DIR)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const exists = await fs.promises
      .access(streamPath, fs.constants.R_OK)
      .then(() => true)
      .catch(() => false);

    if (exists) {
      await fs.promises.rm(streamPath, { recursive: true, force: true });
      return NextResponse.json({ ok: true, removed: true });
    }

    return NextResponse.json({ ok: true, removed: false });
  } catch (error) {
    console.error("Failed to stop stream", error);
    return NextResponse.json({ error: "failed_to_stop" }, { status: 500 });
  }
}
