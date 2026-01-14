import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const STREAMS_DIR = path.join(process.cwd(), "streams");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Проверяем наличие плейлиста
    const playlistPath = path.join(STREAMS_DIR, id, "index.m3u8");
    
    if (!fs.existsSync(playlistPath)) {
      return NextResponse.json({
        thumbnail: null,
        message: "Stream playlist not found",
      });
    }

    // Возвращаем URL плейлиста как превью
    // HLS плейлист можно воспроизвести в видеоэлементе с использованием hls.js
    const playlistUrl = `/streams/${id}/index.m3u8`;

    return NextResponse.json({
      thumbnail: playlistUrl,
      type: "hls",
    });
  } catch (error) {
    console.error("Error getting thumbnail:", error);
    return NextResponse.json({ error: "Failed to get thumbnail" }, { status: 500 });
  }
}
