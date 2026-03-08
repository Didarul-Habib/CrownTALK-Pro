export {};

type WorkerMessageIn = { type: "parse"; raw: string };

type WorkerMessageOut = {
  type: "parsed";
  raw: string;
  urls: string[];
  invalid: string[];
};

const X_STATUS_RE = /(https?:\/\/(?:www\.)?(?:x\.com|twitter\.com|mobile\.twitter\.com|m\.twitter\.com)\/[A-Za-z0-9_]+\/status\/\d+[^\s]*)|(https?:\/\/(?:www\.)?(?:x\.com|twitter\.com|mobile\.twitter\.com|m\.twitter\.com)\/i\/(?:web\/)?status\/\d+[^\s]*)/gi;

function normalizeXUrl(u: string) {
  let s = String(u || "").trim();
  s = s.replace(/^[\s\("'\[]+/, "").replace(/[\s\)\]">'.,!]+$/, "");
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  s = s.replace(/[?#].*$/, "");
  s = s.replace(/^https?:\/\/(?:www\.)?twitter\.com\//i, "https://x.com/");
  s = s.replace(/^https?:\/\/(?:www\.)?mobile\.twitter\.com\//i, "https://x.com/");
  s = s.replace(/^https?:\/\/(?:www\.)?m\.twitter\.com\//i, "https://x.com/");
  s = s.replace(/\/i\/web\/status\//i, "/i/status/");
  return s;
}

function extractUrls(raw: string): string[] {
  const found: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(X_STATUS_RE);
  while ((m = re.exec(String(raw || ""))) !== null) {
    const u = (m[1] || m[2] || "").trim();
    if (u) found.push(normalizeXUrl(u));
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of found) {
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function parseRaw(raw: string) {
  const urls = extractUrls(raw);
  const invalid: string[] = [];
  for (const line of String(raw || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!extractUrls(trimmed).length) invalid.push(trimmed);
  }
  return { urls, invalid };
}

self.onmessage = (ev: MessageEvent<WorkerMessageIn>) => {
  const msg = ev.data;
  if (!msg || msg.type !== "parse") return;
  const { urls, invalid } = parseRaw(msg.raw || "");
  const out: WorkerMessageOut = { type: "parsed", raw: msg.raw, urls, invalid };
  // @ts-ignore
  self.postMessage(out);
};
