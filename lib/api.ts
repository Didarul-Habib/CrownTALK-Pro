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
  // Supports both legacy {error,code} and new envelope {success,false,error:{code,message}}
  if (body && typeof body === "object") {
    const envErr = (body as any).error;
    if (envErr && typeof envErr === "object") {
      const code = envErr.code ? ` (${envErr.code})` : "";
      const msg = envErr.message ? String(envErr.message) : JSON.stringify(envErr);
      return `${msg}${code}`;
    }
    const code = (body as any).code ? ` (${(body as any).code})` : "";
    const msg = (body as any).error ? String((body as any).error) : JSON.stringify(body);
    return `${msg}${code}`;
  }
  return `HTTP ${res.status}`;
}


export async function verifyAccess(baseUrl: string, code: string) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/verify_access`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  const body = await readBody(res);
  const data = (body && typeof body === 'object' && 'success' in (body as any)) ? ((body as any).data ?? body) : body;

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

export async function pingWithLatency(baseUrl: string): Promise<{ ok: boolean; ms: number }> {
  const t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/ping`, { method: "GET" });
    const t1 = (typeof performance !== "undefined" ? performance.now() : Date.now());
    return { ok: res.ok, ms: Math.max(0, Math.round(t1 - t0)) };
  } catch {
    const t1 = (typeof performance !== "undefined" ? performance.now() : Date.now());
    return { ok: false, ms: Math.max(0, Math.round(t1 - t0)) };
  }
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
  const data = (body && typeof body === 'object' && 'success' in (body as any)) ? ((body as any).data ?? body) : body;

  if (!res.ok) {
    throw new ApiError(res.status, `Backend error: ${errMessage(res, body)}`, body);
  }

  // Backend returns { results: [...ok], failed: [...failed] }.
  const okRaw = (data?.results || []) as any[];
  const failedRaw = (data?.failed || []) as any[];

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

export type StreamUpdate =
  | { type: "meta"; run_id?: string }
  | { type: "result"; item: ResultItem }
  | { type: "done"; results: ResultItem[] };

export async function generateCommentsStream(
  baseUrl: string,
  payload: GenerateRequest,
  accessToken: string,
  authToken: string,
  signal: AbortSignal | undefined,
  onUpdate: (u: StreamUpdate) => void
): Promise<GenerateResponse> {
  // Best-effort streaming: try SSE / NDJSON on the same endpoint. If it doesn't stream, fall back.
  const headers: Record<string, string> = { "Content-Type": "application/json", "Accept": "text/event-stream, application/x-ndjson, application/json" };
  if (accessToken) headers[ACCESS_HEADER] = accessToken;
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const base = baseUrl.replace(/\/$/, "");
  const firstUrl = Array.isArray((payload as any).urls) ? String((payload as any).urls[0] || "") : "";
  const streamUrl = `${base}/comment/stream`;
  const bulkUrl = `${base}/comment`;
  const useDedicatedStream = Array.isArray((payload as any).urls) && (payload as any).urls.length === 1 && firstUrl;
  const url = useDedicatedStream ? streamUrl : bulkUrl;
  let res: Response | null = null;
  try {
    const reqBody = useDedicatedStream ? { url: firstUrl, preset: (payload as any).preset, output_language: (payload as any).output_language, fast: (payload as any).fast } : payload;
    res = await fetch(url, { method: "POST", headers, body: JSON.stringify(reqBody), signal });
  } catch (e: any) {
    // network error -> fall back to normal (will throw a better ApiError)
    return await generateComments(baseUrl, payload, accessToken, authToken, signal);
  }

  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    const body = await readBody(res);
    throw new ApiError(res.status, `Backend error: ${errMessage(res, body)}`, body);
  }

  // If not streamy, parse as JSON and return.
  if (!ct.includes("text/event-stream") && !ct.includes("application/x-ndjson")) {
    const body = await readBody(res);
    const data = (body && typeof body === 'object' && 'success' in (body as any)) ? ((body as any).data ?? body) : body;
    // mimic generateComments parsing
    const okRaw = (data?.results || []) as any[];
    const failedRaw = (data?.failed || []) as any[];
    const ok: ResultItem[] = okRaw.map((it) => ({
      url: String(it.url || ""),
      status: "ok",
      comments: Array.isArray(it.comments) ? it.comments : [],
    }));
    const failed: ResultItem[] = failedRaw.map((f) => ({
      url: String(f.url || ""),
      status: "error",
      reason: String(f.reason || f.error || "Failed"),
    }));
    const results = [...ok, ...failed];
    return { results, meta: { run_id: body?.meta?.run_id } };
  }

  // Streaming reader
  const reader = res.body?.getReader();
  if (!reader) {
    return await generateComments(baseUrl, payload, accessToken, authToken, signal);
  }
  const decoder = new TextDecoder();
  let buf = "";
  const collected: ResultItem[] = [];
  const flushLine = (line: string) => {
    const t = line.trim();
    if (!t) return;
    // SSE "data: ..."
    const raw = t.startsWith("data:") ? t.slice(5).trim() : t;
    try {
      const obj = JSON.parse(raw);
      // Common patterns
      if (obj?.meta?.run_id) onUpdate({ type: "meta", run_id: obj.meta.run_id });
      if (obj?.type === "result" && obj?.item) {
        collected.push(obj.item);
        onUpdate({ type: "result", item: obj.item });
      } else if (obj?.result?.url) {
        const item = obj.result as ResultItem;
        collected.push(item);
        onUpdate({ type: "result", item });
      } else if (Array.isArray(obj?.results)) {
        for (const it of obj.results) {
          collected.push(it);
          onUpdate({ type: "result", item: it });
        }
      } else if (obj?.type === "done") {
        onUpdate({ type: "done", results: collected });
      }
    } catch {
      // ignore non-json
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    // split into lines
    const parts = buf.split(/\r?\n/);
    buf = parts.pop() || "";
    for (const line of parts) flushLine(line);
  }
  // final flush
  flushLine(buf);
  onUpdate({ type: "done", results: collected });

  return { results: collected, meta: {} };
}
