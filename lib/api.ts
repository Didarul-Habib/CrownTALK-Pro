import type { GenerateRequest, GenerateResponse } from "./types";

const ACCESS_HEADER = "X-Crowntalk-Token";

export async function verifyAccess(baseUrl: string, code: string) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/verify_access`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Access verify failed: ${res.status} ${txt}`);
  }
  return (await res.json()) as { ok: boolean; token: string };
}

export async function ping(baseUrl: string) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/ping`, { method: "GET" });
  return res.ok;
}

export async function generateComments(baseUrl: string, payload: GenerateRequest, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers[ACCESS_HEADER] = token;

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/comment`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Backend error: ${res.status} ${txt}`);
  }

  return (await res.json()) as GenerateResponse;
}
