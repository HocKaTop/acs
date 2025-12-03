import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const STREAMS_DIR = path.join(process.cwd(), "streams");

export async function GET() {
  try {
    if (!fs.existsSync(STREAMS_DIR)) {
      return NextResponse.json({ streams: [] });
    }

    const entries = await fs.promises.readdir(STREAMS_DIR, { withFileTypes: true });
    const streams: { id: string; playlist: string }[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const id = entry.name;
      const playlistPath = path.join(STREAMS_DIR, id, "index.m3u8");
      if (fs.existsSync(playlistPath)) {
        streams.push({
          id,
          playlist: `/streams/${id}/index.m3u8`,
        });
      }
    }

    return NextResponse.json({ streams });
  } catch (error) {
    console.error("List streams error", error);
    return NextResponse.json({ error: "failed_to_list" }, { status: 500 });
  }
}
