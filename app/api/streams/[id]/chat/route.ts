import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import crypto from "crypto";

type ChatMessage = {
  id: string;
  userId: string;
  userEmail: string;
  text: string;
  createdAt: string;
};

const STREAMS_DIR = path.join(process.cwd(), "streams");
const MAX_MESSAGES = 200;
const MAX_MESSAGE_LENGTH = 500;

const isBadId = (id: string) =>
  !id || id.includes("..") || id.includes("/") || id.includes("\\");

const chatFilePath = (id: string) => path.join(STREAMS_DIR, id, "chat.json");

async function readMessages(id: string): Promise<ChatMessage[]> {
  try {
    const file = chatFilePath(id);
    const raw = await fs.promises.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as ChatMessage[];
    }
    if (Array.isArray(parsed?.messages)) {
      return parsed.messages as ChatMessage[];
    }
    return [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    console.error("Failed to read chat file", error);
    return [];
  }
}

async function writeMessages(id: string, messages: ChatMessage[]) {
  const file = chatFilePath(id);
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  const compact = messages.slice(-MAX_MESSAGES);
  await fs.promises.writeFile(file, JSON.stringify(compact, null, 2), "utf8");
}

async function ensureStreamExists(id: string) {
  const playlistPath = path.join(STREAMS_DIR, id, "index.m3u8");
  try {
    await fs.promises.access(playlistPath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (isBadId(id)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }

  const exists = await ensureStreamExists(id);
  if (!exists) {
    return NextResponse.json({ error: "stream_not_found" }, { status: 404 });
  }

  const messages = await readMessages(id);
  return NextResponse.json({ messages });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (isBadId(id)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }

  const exists = await ensureStreamExists(id);
  if (!exists) {
    return NextResponse.json({ error: "stream_not_found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const rawText = typeof body?.text === "string" ? body.text : "";
  const text = rawText.trim();

  if (!text) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }

  if (text.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "too_long" }, { status: 400 });
  }

  const messages = await readMessages(id);
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    userId: user.id,
    userEmail: user.email,
    text,
    createdAt: new Date().toISOString(),
  };

  messages.push(message);
  await writeMessages(id, messages);

  return NextResponse.json({ ok: true, message });
}
