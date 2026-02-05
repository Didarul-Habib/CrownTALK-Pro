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
  authToken: string,
  signal?: AbortSignal
): Promise<GenerateResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers[ACCESS_HEADER] = accessToken;
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/comment`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  const body = await readBody(res);

  if (!res.ok) {
    throw new ApiError(res.status, `Backend error: ${errMessage(res, body)}`, body);
  }

  // Backend returns { results: [...ok], failed: [...failed] }.
  const okRaw = (body?.results || []) as any[];
  const failedRaw = (body?.failed || []) as any[];

  const ok: ResultItem[] = okRaw.map((it) => {
    const url = String(it.url || "");
    // Accept multiple backend shapes:
    // 1) {comments:[{text, provider, alternates?}...]}  (preferred)
    // 2) {comments:["...","..."]}                      (strings)
    // 3) {comment:"...", alternates:[...]}            (single + alternates)
    // 4) {text:"..."}                                (single)
    const rawComments = Array.isArray(it.comments) ? it.comments : null;

    let comments: any[] = [];
    if (rawComments) {
      comments = rawComments
        .map((c: any) => {
          if (typeof c === "string") return { text: c };
          if (c && typeof c === "object") {
            // If backend uses {comment, alternates}
            if (typeof c.comment === "string" && !c.text) {
              return {
                text: c.comment,
                provider: c.provider,
                alternates: Array.isArray(c.alternates) ? c.alternates : undefined,
              };
            }
            return {
              text: String(c.text ?? c.comment ?? ""),
              provider: c.provider,
              alternates: Array.isArray(c.alternates) ? c.alternates : undefined,
            };
          }
          return { text: String(c ?? "") };
        })
        .filter((c: any) => c.text);
    } else if (typeof it.comment === "string") {
      comments = [
        {
          text: it.comment,
          provider: it.provider,
          alternates: Array.isArray(it.alternates) ? it.alternates : undefined,
        },
      ];
    } else if (typeof it.text === "string") {
      comments = [
        {
          text: it.text,
          provider: it.provider,
          alternates: Array.isArray(it.alternates) ? it.alternates : undefined,
        },
      ];
    }

    return { url, status: "ok", comments };
  });

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

/**
 * Streaming-capable version of generateComments.
 * - If backend responds with JSON -> behaves like generateComments
 * - If backend responds with SSE (text/event-stream) or NDJSON (application/x-ndjson),
 *   it will incrementally emit parsed ResultItem batches via onPartial.
 */
export async function generateCommentsSmart(
  baseUrl: string,
  payload: GenerateRequest,
  accessToken: string,
  authToken: string,
  onPartial?: (partial: ResultItem[], meta?: any) => void,
  signal?: AbortSignal
): Promise<GenerateResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers[ACCESS_HEADER] = accessToken;
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/comment`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  const ct = (res.headers.get("content-type") || "").toLowerCase();

  // JSON path
  if (!ct.includes("text/event-stream") && !ct.includes("application/x-ndjson")) {
    const body = await readBody(res);
    if (!res.ok) throw new ApiError(res.status, `Backend error: ${errMessage(res, body)}`, body);

    const okRaw = (body?.results || []) as any[];
    const failedRaw = (body?.failed || []) as any[];

    const ok: ResultItem[] = okRaw.map((it) => {
      const url = String(it.url || "");
      const rawComments = Array.isArray(it.comments) ? it.comments : null;

      let comments: any[] = [];
      if (rawComments) {
        comments = rawComments
          .map((c: any) => {
            if (typeof c === "string") return { text: c };
            if (c && typeof c === "object") {
              if (typeof c.comment === "string" && !c.text) {
                return { text: c.comment, provider: c.provider, alternates: Array.isArray(c.alternates) ? c.alternates : undefined };
              }
              return { text: String(c.text ?? c.comment ?? ""), provider: c.provider, alternates: Array.isArray(c.alternates) ? c.alternates : undefined };
            }
            return { text: String(c ?? "") };
          })
          .filter((c: any) => c.text);
      } else if (typeof it.comment === "string") {
        comments = [{ text: it.comment, provider: it.provider, alternates: Array.isArray(it.alternates) ? it.alternates : undefined }];
      } else if (typeof it.text === "string") {
        comments = [{ text: it.text, provider: it.provider, alternates: Array.isArray(it.alternates) ? it.alternates : undefined }];
      }

      return { url, status: "ok", comments };
    });

    const failed: ResultItem[] = failedRaw.map((f) => ({
      url: String(f.url || ""),
      status: "error",
      reason: String(f.reason || f.code || "error"),
      comments: [],
    }));

    const results = [...ok, ...failed];
    onPartial?.(results, body?.meta);
    return { results, meta: body?.meta || undefined };
  }

  // Stream path
  if (!res.ok) {
    const body = await readBody(res);
    throw new ApiError(res.status, `Backend error: ${errMessage(res, body)}`, body);
  }

  const reader = res.body?.getReader();
  if (!reader) return { results: [], meta: undefined };

  const decoder = new TextDecoder();
  let buffer = "";
  let meta: any = undefined;
  const all: ResultItem[] = [];

  const emit = (items: ResultItem[]) => {
    if (!items.length) return;
    all.push(...items);
    onPartial?.(items, meta);
  };

  const parseLine = (line: string) => {
    const s = line.trim();
    if (!s) return;
    const jsonStr = s.startsWith("data:") ? s.slice(5).trim() : s;
    try {
      const obj = JSON.parse(jsonStr);
      if (obj?.meta) meta = obj.meta;
      if (obj?.result) emit([obj.result as ResultItem]);
      if (Array.isArray(obj?.results)) emit(obj.results as ResultItem[]);
    } catch {}
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\n\n|\n/);
    buffer = parts.pop() || "";
    for (const p of parts) parseLine(p);
  }
  if (buffer.trim()) parseLine(buffer);

  return { results: all, meta };
}
