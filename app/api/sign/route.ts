/**
 * Server-side HMAC signing endpoint.
 *
 * The client sends { ts, body } and receives { signature }.
 * The secret is read from CT_HMAC_SECRET (no NEXT_PUBLIC_ prefix — server-only).
 * This keeps the signing key out of the browser bundle entirely.
 *
 * Rate: not auth-gated (client has no session yet for signup/verify requests),
 * but body must be non-empty JSON and ts must be within ±120 s of server time
 * to prevent replay abuse.
 */
import { NextRequest, NextResponse } from "next/server";

const SECRET = process.env.CT_HMAC_SECRET;

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!SECRET) {
    // HMAC disabled (no secret configured) — return empty so client skips signing.
    return NextResponse.json({ signature: null, ts: null });
  }

  let body: { ts?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { ts, body: msgBody } = body;

  if (!ts || !msgBody) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Reject stale timestamps (±120s). This prevents replay of signed requests.
  const tsNum = Number(ts);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(tsNum) || Math.abs(now - tsNum) > 120) {
    return NextResponse.json({ error: "stale_timestamp" }, { status: 400 });
  }

  const signature = await hmacSha256Hex(SECRET, `${ts}.${msgBody}`);
  return NextResponse.json({ signature, ts });
}
