import type { GenerateRequest, GenerateResponse } from "./types";

export async function generateComments(payload: GenerateRequest) {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!base) throw new Error("Missing NEXT_PUBLIC_BACKEND_URL");

  const res = await fetch(`${base.replace(/\/$/, "")}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Backend error: ${res.status} ${txt}`);
  }

  return (await res.json()) as GenerateResponse;
}
