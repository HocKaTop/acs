import crypto from "crypto";
import bcrypt from "bcryptjs";

type TokenPayload = {
  sub: string;
  email: string;
  exp: number;
};

const TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12 hours
const SECRET = process.env.AUTH_SECRET || "dev-secret";

const toBase64Url = (value: string) =>
  Buffer.from(value, "utf8").toString("base64url");

const fromBase64Url = (value: string) =>
  Buffer.from(value, "base64url").toString("utf8");

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function createToken(
  userId: string,
  email: string,
): { token: string; expiresAt: number } {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload: TokenPayload = { sub: userId, email, exp };
  const payloadEncoded = toBase64Url(JSON.stringify(payload));

  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(payloadEncoded)
    .digest("base64url");

  return {
    token: `${payloadEncoded}.${signature}`,
    expiresAt: exp,
  };
}

export function verifyToken(token: string | undefined): TokenPayload | null {
  if (!token) return null;
  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) return null;

  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(payloadEncoded)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadEncoded)) as TokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
