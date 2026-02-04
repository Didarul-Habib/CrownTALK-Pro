import type { GenerateRequest, GenerateResponse, ResultItem } from "./types";

const ACCESS_HEADER = "X-Crowntalk-Token";

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, message: string, body?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function readBody(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return await res.json().catch(() => null);
  }
  return await res.text().catch(() => "");
}

function errMessage(res: Response, body: any) {
  if (body && typeof body === "object") {
    const code = body.code ? ` (${body.code})` : "";
    const msg = body.error ? String(body.error) : JSON.stringify(body);
    return `${res.status} ${msg}${code}`;
  }
  const txt = (typeof body === "string" ? body : "").trim();
  return `${res.status} ${txt || res.statusText}`.trim();
}

export async function verifyAccess(baseUrl: string, code: string) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/verify_access`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  const body = await readBody(res);

  if (!res.ok) {
    throw new ApiError(res.status, `Access verify failed: ${errMessage(res, body)}`, body);
  }
  return body as { ok: boolean; token: string };
}

export async function signup(
  baseUrl: string,
  payload: { name: string; x_link: string; password: string },
  accessToken: string
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers[ACCESS_HEADER] = accessToken;

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/signup`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const body = await readBody(res);
  if (!res.ok) {
    throw new ApiError(res.status, `Signup failed: ${errMessage(res, body)}`, body);
  }
  return body as { ok: boolean; user: { id: number; name: string; x_link: string }; token: string; expires_at: number };
}

export async function login(
  baseUrl: string,
  payload: { x_link: string; password: string },
  accessToken: string
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers[ACCESS_HEADER] = accessToken;

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/login`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const body = await readBody(res);
  if (!res.ok) {
    throw new ApiError(res.status, `Login failed: ${errMessage(res, body)}`, body);
  }
  return body as { ok: boolean; user: { id: number; name: string; x_link: string }; token: string; expires_at: number };
}

export async function logout(baseUrl: string, accessToken: string, authToken: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers[ACCESS_HEADER] = accessToken;
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/logout`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });

  const body = await readBody(res);
  if (!res.ok) {
    throw new ApiError(res.status, `Logout failed: ${errMessage(res, body)}`, body);
  }
  return body as { ok: boolean };
}

export async function ping(baseUrl: string) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/ping`, { method: "GET" });
  return res.ok;
}

export async function generateComments(
  baseUrl: string,
  payload: GenerateRequest,
  accessToken: string,
  authToken: string
): Promise<GenerateResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers[ACCESS_HEADER] = accessToken;
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/comment`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const body = await readBody(res);

  if (!res.ok) {
    throw new ApiError(res.status, `Backend error: ${errMessage(res, body)}`, body);
  }

  // Backend returns { results: [...ok], failed: [...failed] }.
  const okRaw = (body?.results || []) as any[];
  const failedRaw = (body?.failed || []) as any[];

  const ok: ResultItem[] = okRaw.map((it) => ({
    url: String(it.url || ""),
    status: "ok",
    comments: Array.isArray(it.comments) ? it.comments : [],
  }));

  const failed: ResultItem[] = failedRaw.map((f) => ({
    url: String(f.url || ""),
    status: "error",
    reason: String(f.reason || f.code || "error"),
    comments: [],
  }));

  return {
    results: [...ok, ...failed],
    meta: body?.meta || undefined,
  };
}
