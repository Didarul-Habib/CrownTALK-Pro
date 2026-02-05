/* eslint-disable no-restricted-globals */
export const X_URL_RE =
  /(https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[A-Za-z0-9_]+\/status\/\d+[^\s]*)|(https?:\/\/(?:www\.)?x\.com\/i\/status\/\d+[^\s]*)/gi;

function extractUrlsAll(raw: string): string[] {
  const s = String(raw || "");
  const found: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(X_URL_RE);
  while ((m = re.exec(s)) !== null) {
    const u = (m[1] || m[2] || "").trim();
    if (u) found.push(u);
  }
  return found;
}

function normalizeXUrl(u: string): string {
  return String(u || "").trim().replace(/[?#].*$/, "");
}

function extractUrls(raw: string): string[] {
  const s = String(raw || "");
  const found: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(X_URL_RE);
  while ((m = re.exec(s)) !== null) {
    const u = (m[1] || m[2] || "").trim();
    if (u) found.push(u);
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of found) {
    const key = normalizeXUrl(u);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function parseUrls(raw: string): string[] {
  const lines = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return extractUrls(lines.join("\n"));
}

function classifyLines(raw: string): Array<{ line: string; urls: string[] }> {
  const lines = raw.split(/\r?\n/);
  return lines.map((line) => ({ line, urls: extractUrls(line) }));
}

function buildInbox(raw: string) {
  const ordered = extractUrlsAll(raw).map((u) => normalizeXUrl(u)).filter((u, i, a) => a.indexOf(u) === i);
  const dupMap = new Map<string, number>();
  for (const u of extractUrlsAll(raw)) {
    const key = normalizeXUrl(u);
    dupMap.set(key, (dupMap.get(key) || 0) + 1);
  }
  return ordered.map((u) => {
    const lower = u.toLowerCase();
    const isStatus = /\/status\/\d+/.test(lower) || /x\.com\/i\/status\/\d+/.test(lower);
    return { url: u, valid: isStatus, duplicateCount: dupMap.get(u) || 1 };
  });
}

type Msg = { type: "analyze"; raw: string; requestId: number } | { type: "ping"; requestId: number };

self.onmessage = (e: MessageEvent<Msg>) => {
  const msg = e.data;
  if (msg.type === "ping") {
    // @ts-ignore
    self.postMessage({ type: "pong", requestId: msg.requestId });
    return;
  }
  if (msg.type === "analyze") {
    const raw = String(msg.raw || "");
    const urls = parseUrls(raw);
    const lineInfo = classifyLines(raw);
    const allUrls = extractUrlsAll(raw).map((u) => normalizeXUrl(u));
    const inbox = buildInbox(raw);
    // @ts-ignore
    self.postMessage({ type: "result", requestId: msg.requestId, urls, lineInfo, allUrls, inbox });
  }
};
