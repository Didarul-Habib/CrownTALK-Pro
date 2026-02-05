export {};

type WorkerMessageIn = { type: "parse"; raw: string };

type WorkerMessageOut = {
  type: "parsed";
  raw: string;
  urls: string[];
  invalid: string[];
};

const X_URL_RE = /(https?:\/\/)?(www\.)?(x\.com|twitter\.com)\/[\w]+\/(status|statuses)\/(\d+)/i;

function normalizeUrl(u: string) {
  let url = u.trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\)+$/, "").replace(/\s+/g, "");
  // Normalize twitter.com -> x.com
  url = url.replace(/https?:\/\/(www\.)?twitter\.com\//i, "https://x.com/");
  return url;
}

function parseRaw(raw: string) {
  const seen = new Set<string>();
  const urls: string[] = [];
  const invalid: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Extract URLs in the line (space-separated input)
    const parts = trimmed.split(/\s+/);
    for (const part of parts) {
      const norm = normalizeUrl(part);
      if (!norm) continue;
      if (seen.has(norm)) continue;
      seen.add(norm);

      if (X_URL_RE.test(norm)) urls.push(norm);
      else invalid.push(norm);
    }
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
