import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const ROOT = "/home/deck/Documents/streamview/acs/streams";

export async function GET(
  req: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: fileParts } = await context.params;

  const filePath = path.join(ROOT, ...fileParts);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const data = fs.readFileSync(filePath);

  let contentType = "application/octet-stream";

  if (filePath.endsWith(".m3u8")) {
    contentType = "application/vnd.apple.mpegurl";
  } else if (filePath.endsWith(".ts")) {
    contentType = "video/mp2t";
  }

  return new NextResponse(data, {
    headers: {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
    },
  });
}
