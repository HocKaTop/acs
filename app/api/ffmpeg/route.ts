import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

const STREAMS_DIR = path.join(process.cwd(), "streams");

const globalForFfmpeg = globalThis as unknown as {
  ffmpegProcesses?: Map<string, ReturnType<typeof spawn>>;
};

const processes =
  globalForFfmpeg.ffmpegProcesses ?? new Map<string, ReturnType<typeof spawn>>();

if (!globalForFfmpeg.ffmpegProcesses) {
  globalForFfmpeg.ffmpegProcesses = processes;
}

async function getUser() {
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

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const streamKey = user.streamKey;
  if (!streamKey) {
    return NextResponse.json(
      { error: "stream_key_missing", message: "Сначала сгенерируйте ключ потока." },
      { status: 400 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const categoryId = body?.categoryId || null;

    // Создаём или обновляем запись стрима в БД
    await (prisma as any).stream.upsert({
      where: { id: streamKey },
      update: { categoryId },
      create: {
        id: streamKey,
        userId: user.id,
        categoryId,
      },
    });
  } catch (dbError) {
    console.error("Database error:", dbError);
  }

  const input = `rtmp://localhost/live/${streamKey}`;
  const outDir = path.join(STREAMS_DIR, streamKey);
  const output = path.join(outDir, "index.m3u8");

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Останавливаем предыдущий процесс для этого пользователя, если он есть
  const existing = processes.get(user.id);
  if (existing) {
    existing.kill("SIGTERM");
    processes.delete(user.id);
  }

  const args = [
    "-y",
    "-i",
    input,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-tune",
    "zerolatency",
    "-c:a",
    "aac",
    "-f",
    "hls",
    "-hls_time",
    "2",
    "-hls_list_size",
    "6",
    "-hls_flags",
    "delete_segments+append_list+omit_endlist",
    "-reset_timestamps",
    "1",
    "-hls_segment_filename",
    path.join(outDir, "segment_%d.ts"),
    output,
  ];

  const ff = spawn("ffmpeg", args, { stdio: "ignore" });

  processes.set(user.id, ff);

  ff.on("close", () => {
    processes.delete(user.id);
  });

  return NextResponse.json({
    ok: true,
    pid: ff.pid,
    input,
    output,
  });
}
