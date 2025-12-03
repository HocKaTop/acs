import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(
  req: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: fileParts } = await context.params;

  const filePath = path.join(process.cwd(), "streams", ...fileParts);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const data = fs.readFileSync(filePath);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*"
  };

  if (filePath.endsWith(".m3u8")) {
    headers["Content-Type"] = "application/x-mpegURL";
}
 else if (filePath.endsWith(".ts")) {
    headers["Content-Type"] = "video/mp2t";
  }

  return new NextResponse(data, { headers });
}
