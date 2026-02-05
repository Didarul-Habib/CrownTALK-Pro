// URL parsing + normalization utilities for X/Twitter links.
//
// Important: Keep regex + normalization aligned with workers/url.worker.ts
// so behavior is consistent whether worker parsing is enabled or not.

export const X_URL_RE =
  /(https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/(?:[A-Za-z0-9_]+)\/(?:status|statuses)\/\d+[^\s]*)|(https?:\/\/(?:www\.)?x\.com\/i\/(?:status|statuses)\/\d+[^\s]*)/gi;

function stripTrailingJunk(u: string) {
  // common messy paste endings like ")" or punctuation
  return u.replace(/\)+$/, "").replace(/[\]\.,;:!?]+$/, "");
}

/** Normalize for UI + dedupe: https, x.com, strip query/hash, strip trailing junk */
export function normalizeXUrl(u: string): string {
  let url = String(u || "").trim();
  if (!url) return "";
  url = stripTrailingJunk(url);

  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  // Normalize twitter.com -> x.com
  url = url.replace(/^https?:\/\/(www\.)?twitter\.com\//i, "https://x.com/");
  // Normalize www.x.com -> x.com
  url = url.replace(/^https?:\/\/(www\.)?x\.com\//i, "https://x.com/");
  // Strip query/hash
  url = url.replace(/[?#].*$/, "");
  return url;
}

export function extractUrls(raw: string): string[] {
  const s = String(raw || "");
  const found: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(X_URL_RE); // clone w/ state
  while ((m = re.exec(s)) !== null) {
    const u = (m[1] || m[2] || "").trim();
    if (u) found.push(u);
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of found) {
    const norm = normalizeXUrl(u);
    if (!norm) continue;
    const key = norm; // already stripped query/hash
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(norm);
  }
  return out;
}

export function parseUrls(raw: string): string[] {
  // Accepts one-per-line, but also extracts URLs from messy paste.
  const lines = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const extracted = extractUrls(lines.join("\n"));
  return extracted;
}

export function classifyLines(raw: string): Array<{ line: string; urls: string[] }> {
  const lines = raw.split(/\r?\n/);
  return lines.map((line) => {
    const urls = extractUrls(line);
    return { line, urls };
  });
}

// Like extractUrls, but returns all matches (including duplicates).
export function extractUrlsAll(raw: string): string[] {
  const s = String(raw || "");
  const found: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(X_URL_RE);
  while ((m = re.exec(s)) !== null) {
    const u = (m[1] || m[2] || "").trim();
    if (u) found.push(normalizeXUrl(u));
  }
  return found.filter(Boolean);
}
