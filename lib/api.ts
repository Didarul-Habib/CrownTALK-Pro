const HMAC_SECRET = process.env.NEXT_PUBLIC_CT_HMAC_SECRET;

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

async function addRequestSignature(headers: Record<string, string>, body: string) {
  if (!HMAC_SECRET) return;
  const ts = Math.floor(Date.now() / 1000).toString();
  headers["X-CT-Timestamp"] = ts;
  headers["X-CT-Signature"] = await hmacSha256Hex(HMAC_SECRET, `${ts}.${body}`);
}

function normalizeResultItem(raw: any, request?: any): ResultItem {
  const url = String(raw?.url || "");
  const inputUrl = String((raw as any)?.input_url || url);
  const status = (raw?.status as any) || "ok";

  const base: ResultItem = {
    url,
    input_url: inputUrl,
    tweet_id: raw?.tweet_id ? String(raw.tweet_id) : undefined,
    handle: raw?.handle ? String(raw.handle) : undefined,
    tweet: raw?.tweet,
    project: raw?.project ?? null,
    status,
    reason: raw?.reason ? String(raw.reason) : raw?.code ? String(raw.code) : undefined,
    comments: Array.isArray(raw?.comments) ? raw.comments : [],
    flags: raw?.flags,
  };

  // Request-level metadata (for quality badges / history UI)
  if (request && typeof request === "object") {
    if ("lang_native" in request) {
      (base as any).lang_native = Boolean((request as any).lang_native);
    }
    if ((request as any).native_lang) {
      (base as any).native_lang = String((request as any).native_lang);
    }
  }
  if (typeof (raw as any)?.used_research === "boolean") {
    (base as any).used_research = Boolean((raw as any).used_research);
  }

  if (Array.isArray((raw as any)?.project_handles)) {
    const arr = (raw as any).project_handles
      .map((x: any) => (typeof x === "string" ? x.trim() : ""))
      .filter((x: string) => !!x);
    if (arr.length) (base as any).project_handles = arr;
  }

  return base;
}

export type UrlStreamUpdate =
  | { type: "status"; stage: string }
  | { type: "result"; item: ResultItem & { title?: string; excerpt?: string; citations?: any[] } }
  | { type: "done" }
  | { type: "error"; code?: string; message?: string };

export async function commentFromUrlStream(
  baseUrl: string,
  payload: {
    source_url: string;
    preset?: string;
    output_language?: string;
    fast?: boolean;
    quote_mode?: boolean;
    include_alternates?: boolean;
    lang_en?: boolean;
    lang_native?: boolean;
    native_lang?: string;
    tone?: string;
    intent?: string;
    voice?: number;
    tone_match?: boolean;
    thread_ready?: boolean;
    anti_cringe?: boolean;
  },
  accessToken: string,
  authToken: string,
  signal: AbortSignal | undefined,
  onUpdate: (u: UrlStreamUpdate) => void
): Promise<{ item: ResultItem & { title?: string; excerpt?: string; citations?: any[] } }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "text/event-stream, application/json",
  };
  if (accessToken) headers[ACCESS_HEADER] = accessToken;
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const bodyStr = JSON.stringify(payload);
  await addRequestSignature(headers, bodyStr);

  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/comment_from_url/stream`, {
    method: "POST",
    headers,
    body: bodyStr,
    signal,
  });

  const ct = res.headers.get("content-type") || "";
  // If backend doesn't stream for any reason, fall back.
  if (!ct.includes("text/event-stream")) {
    return await commentFromUrl(baseUrl, payload, accessToken, authToken, signal);
  }
  if (!res.ok) {
    const body = await readBody(res);
    throw new ApiError(res.status, `Generate from URL failed: ${errMessage(res, body)}`, body);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    return await commentFromUrl(baseUrl, payload, accessToken, authToken, signal);
  }

  const decoder = new TextDecoder();
  let buf = "";
  let lastItem: any = null;

  const flushLine = (line: string) => {
    const t = line.trim();
    if (!t) return;
    if (!t.startsWith("data:")) return;
    const raw = t.slice(5).trim();
    try {
      const obj = JSON.parse(raw);
      if (obj?.stage) onUpdate({ type: "status", stage: String(obj.stage) });
      if (obj?.type === "result" && obj?.item) {
        lastItem = obj.item;
        onUpdate({ type: "result", item: obj.item });
      }
      if (obj?.ok === true || obj?.type === "done") {
        onUpdate({ type: "done" });
      }
      if (obj?.code || obj?.message) {
        // not always an error, but safe to ignore
      }
    } catch {
      // ignore
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      flushLine(line);
    }
  }

  if (!lastItem) {
    throw new ApiError(502, "No result received from stream");
  }
  return { item: lastItem };
}
import type { GenerateRequest, GenerateResponse, ResultItem, QualityMode, ProjectCatalogItem, ProjectPostMode, ProjectPostResponse } from "./types";

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
  // Supports both legacy {error,code} and new envelope {success:false,error:{code,message}}
  if (body && typeof body === "object") {
    let code: string | undefined;
    let message: string | undefined;

    const envErr = (body as any).error;
    if (envErr && typeof envErr === "object") {
      if (envErr.code) code = String(envErr.code);
      if (envErr.message) message = String(envErr.message);
    } else {
      if ((body as any).code) code = String((body as any).code);
      if ((body as any).error) message = String((body as any).error);
    }

    const lower = code ? code.toLowerCase() : "";

    // Friendly mappings for common backend codes
    if (lower === "bad_signature") {
      return "Your API signature looks invalid. Try refreshing the page or logging in again.";
    }
    if (lower === "rate_limited" || lower === "too_many_requests") {
      return "You've hit the rate limit. Try again in a moment.";
    }
    if (lower === "invalid_token" || lower === "auth_required") {
      return "Your session has expired or is invalid. Please log in again.";
    }

    if (message && code) return `${message} (${code})`;
    if (message) return message;
    if (code) return `Error (${code})`;

    try {
      return JSON.stringify(body);
    } catch {
      // fall through
    }
  }
  return `HTTP ${res.status}`;
}



function unwrapEnvelope<T = any>(body: any): T {
  if (body && typeof body === 'object' && (body as any).success === true && 'data' in body) {
    return (body as any).data as T;
  }
  return body as T;
}

export async function verifyAccess(baseUrl: string, code: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const bodyStr = JSON.stringify({ code });
  await addRequestSignature(headers, bodyStr);

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/verify_access`, {
    method: "POST",
    headers,
    body: bodyStr,
  });

  const body = await readBody(res);
  const data = unwrapEnvelope(body);

  if (!res.ok) {
    throw new ApiError(res.status, `Access verify failed: ${errMessage(res, body)}`, body);
  }
  return data as { ok: boolean; token: string };
}

export async function cancelActiveRun(
  baseUrl: string,
  runId: string | null | undefined,
  accessToken: string,
  authToken: string
): Promise<void> {
  if (!runId) return;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers[ACCESS_HEADER] = accessToken;
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const bodyStr = JSON.stringify({ run_id: runId });
  await addRequestSignature(headers, bodyStr);
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/run/cancel`, {
      method: "POST",
      headers,
      body: bodyStr,
    });
    // Drain body so the connection can be reused; ignore errors.
    await readBody(res);
  } catch {
    // Best-effort; failures here should not break the UI.
  }
}


export async function signup(
  baseUrl: string,
  payload: { name: string; x_link: string; password: string },
  accessToken: string
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers[ACCESS_HEADER] = accessToken;

    const bodyStr = JSON.stringify(payload);
  await addRequestSignature(headers, bodyStr);

const res = await fetch(`${baseUrl.replace(/\/$/, "")}/signup`, {
    method: "POST",
    headers,
    body: bodyStr,
  });

  const body = await readBody(res);
  const data = unwrapEnvelope(body);
  if (!res.ok) {
    throw new ApiError(res.status, `Signup failed: ${errMessage(res, body)}`, body);
  }
  return data as { ok: boolean; user: { id: number; name: string; x_link: string }; token: string; expires_at: number };
}

export async function login(
  baseUrl: string,
  payload: { x_link: string; password: string },
  accessToken: string
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers[ACCESS_HEADER] = accessToken;

    const bodyStr = JSON.stringify(payload);
  await addRequestSignature(headers, bodyStr);

const res = await fetch(`${baseUrl.replace(/\/$/, "")}/login`, {
    method: "POST",
    headers,
    body: bodyStr,
  });

  const body = await readBody(res);
  const data = unwrapEnvelope(body);
  if (!res.ok) {
    throw new ApiError(res.status, `Login failed: ${errMessage(res, body)}`, body);
  }
  return data as { ok: boolean; user: { id: number; name: string; x_link: string }; token: string; expires_at: number };
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
  const data = unwrapEnvelope(body);
  if (!res.ok) {
    throw new ApiError(res.status, `Logout failed: ${errMessage(res, body)}`, body);
  }
  return data as { ok: boolean };
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

    const bodyStr = JSON.stringify(payload);
  await addRequestSignature(headers, bodyStr);

const res = await fetch(`${baseUrl.replace(/\/$/, "")}/comment`, {
    method: "POST",
    headers,
    body: bodyStr,
    signal,
  });

  const headerRunId = res.headers.get("X-Run-Id") || undefined;

  const body = await readBody(res);
  const data = unwrapEnvelope<any>(body);

  if (!res.ok) {
    throw new ApiError(res.status, `Backend error: ${errMessage(res, body)}`, body);
  }

  // Backend returns { results: [...ok], failed: [...failed] } inside an optional envelope.
  const okRaw = (data?.results || []) as any[];
  const failedRaw = (data?.failed || []) as any[];

  const ok: ResultItem[] = okRaw.map((it) => normalizeResultItem(it, payload));
  const failed: ResultItem[] = failedRaw.map((f) =>
    normalizeResultItem(
      {
        ...f,
        status: (f as any)?.status || "error",
        comments: [],
      },
      payload
    )
  );

  // meta can live on the outer envelope.
  const meta = body && typeof body === "object" ? (body as any).meta : undefined;

  const mergedMeta = headerRunId ? { run_id: headerRunId } : meta || undefined;

  return { results: [...ok, ...failed], meta: mergedMeta };
}

export type StreamUpdate =
  | { type: "meta"; run_id?: string; total?: number; skipped_duplicates?: number; quality_mode?: string }
  | { type: "status"; stage: string; index?: number; total?: number; done?: number; url?: string }
  | { type: "result"; item: ResultItem }
  | { type: "done"; results: ResultItem[]; run_id?: string; total?: number; done?: number; ok_count?: number; cancelled?: boolean };

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
    const reqBody = useDedicatedStream
      ? (() => {
          const { urls, ...rest } = payload as any;
          return { ...rest, url: firstUrl };
        })()
      : payload;
    const bodyStr = JSON.stringify(reqBody);
    await addRequestSignature(headers, bodyStr);
    res = await fetch(url, { method: "POST", headers, body: bodyStr, signal });
  } catch (e: any) {
    // network error -> fall back to normal (will throw a better ApiError)
    return await generateComments(baseUrl, payload, accessToken, authToken, signal);
  }

  const ct = res.headers.get("content-type") || "";
  const headerRunId = res.headers.get("X-Run-Id") || undefined;
  if (!res.ok) {
    const body = await readBody(res);
    throw new ApiError(res.status, `Backend error: ${errMessage(res, body)}`, body);
  }

  // If not streamy, parse as JSON and return.
  if (!ct.includes("text/event-stream") && !ct.includes("application/x-ndjson")) {
    const body = await readBody(res);
    // mimic generateComments parsing
    const data = unwrapEnvelope<any>(body);
    const okRaw = (data?.results || []) as any[];
    const failedRaw = (data?.failed || []) as any[];
    const ok: ResultItem[] = okRaw.map((it) => normalizeResultItem(it, payload));
    const failed: ResultItem[] = failedRaw.map((f) =>
      normalizeResultItem(
        {
          ...f,
          status: (f as any)?.status || "error",
          comments: [],
        },
        payload
      )
    );
    const results = [...ok, ...failed];
    const meta = body && typeof body === "object" ? (body as any).meta : undefined;
    const mergedMeta = headerRunId ? { run_id: headerRunId } : meta || undefined;
    return { results, meta: mergedMeta };
  }

  // Streaming reader
  const reader = res.body?.getReader();
  if (!reader) {
    return await generateComments(baseUrl, payload, accessToken, authToken, signal);
  }
  const decoder = new TextDecoder();
  let buf = "";
  const collected: ResultItem[] = [];
  let runId: string | undefined = headerRunId;
  if (runId) onUpdate({ type: "meta", run_id: runId });
  const flushLine = (line: string) => {
    const t = line.trim();
    if (!t) return;
    // SSE "data: ..." (but accept plain JSON lines too)
    const raw = t.startsWith("data:") ? t.slice(5).trim() : t;
    try {
      const obj = JSON.parse(raw);

      // META: run id + batch metadata
      const metaRunId =
        obj?.meta?.run_id ||
        obj?.run_id ||
        (obj?.type === "meta" ? obj?.run_id : undefined);
      const metaTotal =
        (obj?.meta && typeof obj.meta.total === "number" ? obj.meta.total : undefined) ||
        (typeof obj.total === "number" ? obj.total : undefined);
      const skipped =
        (obj?.meta && typeof obj.meta.skipped_duplicates === "number" ? obj.meta.skipped_duplicates : undefined) ||
        (typeof obj.skipped_duplicates === "number" ? obj.skipped_duplicates : undefined);
      const qualityMode =
        (obj?.meta && typeof obj.meta.quality_mode === "string" ? obj.meta.quality_mode : undefined) ||
        (typeof obj.quality_mode === "string" ? obj.quality_mode : undefined);

      if (metaRunId || metaTotal !== undefined || skipped !== undefined || qualityMode !== undefined) {
        if (metaRunId) runId = metaRunId;
        onUpdate({
          type: "meta",
          run_id: metaRunId || runId,
          total: metaTotal,
          skipped_duplicates: skipped,
          quality_mode: qualityMode,
        });
      }

      // STATUS: stage + optional progress numbers
      if (obj?.type === "status" && obj?.stage) {
        const index = typeof obj.index === "number" ? obj.index : undefined;
        const total = typeof obj.total === "number" ? obj.total : undefined;
        const done = typeof obj.done === "number" ? obj.done : undefined;
        const url = typeof obj.url === "string" ? obj.url : undefined;
        onUpdate({
          type: "status",
          stage: String(obj.stage),
          index,
          total,
          done,
          url,
        });
      }

      // RESULT payloads (single or arrays)
      if (obj?.type === "result" && obj?.item) {
        const item = normalizeResultItem(obj.item, payload);
        collected.push(item);
        onUpdate({ type: "result", item });
      } else if (obj?.result?.url) {
        const item = normalizeResultItem(obj.result, payload);
        collected.push(item);
        onUpdate({ type: "result", item });
      } else if (Array.isArray(obj?.results)) {
        for (const it of obj.results) {
          const item = normalizeResultItem(it, payload);
          collected.push(item);
          onUpdate({ type: "result", item });
        }
      }

      // DONE marker (with optional batch summary)
      if (obj?.type === "done" || obj?.ok === true) {
        const doneTotal = typeof obj.total === "number" ? obj.total : undefined;
        const doneCount = typeof obj.done === "number" ? obj.done : undefined;
        const okCount = typeof obj.ok_count === "number" ? obj.ok_count : undefined;
        const cancelled =
          typeof obj.cancelled === "boolean" ? obj.cancelled : undefined;
        const doneRunId =
          typeof obj.run_id === "string" && obj.run_id
            ? obj.run_id
            : runId;
        onUpdate({
          type: "done",
          results: collected,
          run_id: doneRunId,
          total: doneTotal,
          done: doneCount,
          ok_count: okCount,
          cancelled,
        });
      }
    } catch {
      // ignore non-json
    }
  };;

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

  return { results: collected, meta: runId ? { run_id: runId } : undefined };
}

export type SourcePreview = { title: string; excerpt: string; source_url: string };

export async function sourcePreview(
  baseUrl: string,
  source_url: string,
  accessToken: string,
  authToken: string
): Promise<SourcePreview> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers[ACCESS_HEADER] = accessToken;
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const bodyStr = JSON.stringify({ source_url });
  await addRequestSignature(headers, bodyStr);

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/source_preview`, {
    method: "POST",
    headers,
    body: bodyStr,
  });

  const body = await readBody(res);
  const data = body && typeof body === "object" && "success" in (body as any) ? (body as any).data : body;
  if (!res.ok) {
    throw new ApiError(res.status, `Source preview failed: ${errMessage(res, body)}`, body);
  }
  return data as SourcePreview;
}

export async function commentFromUrl(
  baseUrl: string,
  payload: {
    source_url: string;
    output_language?: string;
    fast?: boolean;
    quote_mode?: boolean;
  },
  accessToken: string,
  authToken: string,
  signal?: AbortSignal
): Promise<{ item: ResultItem & { title?: string; excerpt?: string; citations?: any[] } }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers[ACCESS_HEADER] = accessToken;
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    const bodyStr = JSON.stringify(payload);
  await addRequestSignature(headers, bodyStr);

const res = await fetch(`${baseUrl.replace(/\/$/, "")}/comment_from_url`, {
    method: "POST",
    headers,
    body: bodyStr,
    signal,
  });

  const body = await readBody(res);
  const data = body && typeof body === "object" && "success" in (body as any) ? (body as any).data : body;
  if (!res.ok) {
    throw new ApiError(res.status, `Generate from URL failed: ${errMessage(res, body)}`, body);
  }
  return data as any;
}


export async function exportHistory(
  baseUrl: string,
  format: "json" | "csv" | "txt",
  accessToken: string,
  authToken: string,
  limit = 1000
): Promise<Blob> {
  const headers: Record<string, string> = {};
  if (accessToken) headers[ACCESS_HEADER] = accessToken;
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const url = `${baseUrl.replace(/\/+$/, "")}/history/export?format=${encodeURIComponent(format)}&limit=${limit}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await readBody(res);
    throw new ApiError(res.status, `Export failed: ${errMessage(res, body)}`, body);
  }
  return await res.blob();
}

export async function listProjects(
  baseUrl: string,
  accessToken: string,
  authToken: string
): Promise<ProjectCatalogItem[]> {
  const headers: Record<string, string> = {};
  if (accessToken) headers[ACCESS_HEADER] = accessToken;
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/projects`, {
    method: "GET",
    headers,
  });

  const body = await readBody(res);
  const data = unwrapEnvelope<ProjectCatalogItem[]>(body);

  if (!res.ok) {
    throw new ApiError(res.status, `Projects fetch failed: ${errMessage(res, body)}`, body);
  }

  return data || [];
}

export type ProjectPostPayload = {
  project_id: string;
  post_mode: ProjectPostMode;
  tone?: "casual" | "professional";
  language?: string;
  quality_mode?: QualityMode;
};

export async function generateProjectPost(
  baseUrl: string,
  payload: ProjectPostPayload,
  accessToken: string,
  authToken: string
): Promise<ProjectPostResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) headers[ACCESS_HEADER] = accessToken;
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const bodyStr = JSON.stringify(payload);
  await addRequestSignature(headers, bodyStr);

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/project_post`, {
    method: "POST",
    headers,
    body: bodyStr,
  });

  const body = await readBody(res);
  const data = unwrapEnvelope<ProjectPostResponse>(body);

  if (!res.ok) {
    throw new ApiError(res.status, `Project post failed: ${errMessage(res, body)}`, body);
  }

  return data;
}

