import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

const STREAMS_DIR = path.join(process.cwd(), "streams");

export async function GET() {
  try {
    if (!fs.existsSync(STREAMS_DIR)) {
      return NextResponse.json({ streams: [] });
    }

    const entries = await fs.promises.readdir(STREAMS_DIR, { withFileTypes: true });
    const streams: any[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const id = entry.name;
      const playlistPath = path.join(STREAMS_DIR, id, "index.m3u8");
      if (fs.existsSync(playlistPath)) {
        // Получаем информацию о категории и пользователе из БД
        let streamData: any = null;
        try {
          streamData = await (prisma as any).stream.findUnique({
            where: { id },
            include: {
              category: { select: { id: true, name: true } },
              user: { select: { id: true, email: true, nickname: true } },
            },
          });
        } catch (err) {
          // Игнорируем ошибки БД
        }

        streams.push({
          id,
          playlist: `/streams/${id}/index.m3u8`,
          categoryId: streamData?.categoryId || null,
          category: streamData?.category || null,
          user: streamData?.user || null,
          displayName: streamData?.displayName || null,
        });
      }
    }

    return NextResponse.json({ streams });
  } catch (error) {
    console.error("List streams error", error);
    return NextResponse.json({ error: "failed_to_list" }, { status: 500 });
  }
}
