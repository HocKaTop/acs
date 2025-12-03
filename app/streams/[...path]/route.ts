import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STREAMS_DIR = path.join(process.cwd(), "streams");

const CONTENT_TYPES: Record<string, string> = {
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
};

async function handleFile(
  request: Request,
  filePath: string,
  ext: string,
  stats: fs.Stats,
) {
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  // HEAD запрос — только заголовки
  if (request.method === "HEAD") {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Length": stats.size.toString(),
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  }

  // Поддержка range-запросов для .ts
  const range = request.headers.get("range");
  if (range && ext === ".ts") {
    const matches = range.match(/bytes=(\d+)-(\d+)?/);
    if (matches) {
      const start = parseInt(matches[1], 10);
      const end = matches[2] ? parseInt(matches[2], 10) : stats.size - 1;

      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });

      return new NextResponse(stream as unknown as BodyInit, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${stats.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": contentType,
          "Cache-Control": "no-store",
        },
      });
    }
  }

  const stream = fs.createReadStream(filePath);

  return new NextResponse(stream as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Length": stats.size.toString(),
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path: pathSegments } = await params;
  const segments = pathSegments ?? [];
  if (segments.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const targetPath = path.join(STREAMS_DIR, ...segments);
  const normalized = path.resolve(targetPath);

  if (!normalized.startsWith(STREAMS_DIR)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!fs.existsSync(normalized)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ext = path.extname(normalized).toLowerCase();
  const stats = await fs.promises.stat(normalized);

  return handleFile(request, normalized, ext, stats);
}
