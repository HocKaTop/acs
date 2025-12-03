import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const STREAMS_DIR = path.join(process.cwd(), "streams");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || id.includes("..") || id.includes("/") || id.includes("\\")) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }

  const playlistPath = path.join(STREAMS_DIR, id, "index.m3u8");

  if (!fs.existsSync(playlistPath)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    id,
    playlist: `/streams/${id}/index.m3u8`,
  });
}
