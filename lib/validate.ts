export const X_URL_RE =
  /(https?:\/\/(?:www\.)?(?:x\.com|twitter\.com|mobile\.twitter\.com|m\.twitter\.com)\/[A-Za-z0-9_]+\/status\/\d+[^\s]*)|(https?:\/\/(?:www\.)?(?:x\.com|twitter\.com|mobile\.twitter\.com|m\.twitter\.com)\/i\/(?:web\/)?status\/\d+[^\s]*)/gi;

export function extractUrls(raw: string): string[] {
  const s = String(raw || "");
  const found: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(X_URL_RE); // clone w/ state
  while ((m = re.exec(s)) !== null) {
    const u = (m[1] || m[2] || "").trim();
    if (u) found.push(normalizeXUrl(u));
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
    if (u) found.push(u);
  }
  return found;
}

export function normalizeXUrl(u: string): string {
  let s = String(u || "").trim();
  // strip surrounding punctuation commonly included in paste
  s = s.replace(/^[\s\("'\[]+/, "").replace(/[\s\)\]">'.,!]+$/, "");
  // drop query/hash
  s = s.replace(/[?#].*$/, "");
  // normalize host to x.com
  s = s.replace(/^https?:\/\/(?:www\.)?twitter\.com\//i, "https://x.com/");
  s = s.replace(/^https?:\/\/(?:www\.)?mobile\.twitter\.com\//i, "https://x.com/");
  s = s.replace(/^https?:\/\/(?:www\.)?m\.twitter\.com\//i, "https://x.com/");
  // normalize /i/web/status -> /i/status
  s = s.replace(/\/i\/web\/status\//i, "/i/status/");
  return s;
}
