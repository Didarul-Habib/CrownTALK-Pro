export const X_URL_RE =
  /((?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com|mobile\.twitter\.com|m\.twitter\.com)\/(?:(?:[A-Za-z0-9_]{1,15}\/)?status|i\/(?:web\/)?status)\/\d+[^\s]*)/gi;

export function extractUrls(raw: string): string[] {
  const s = String(raw || "");
  const found: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(X_URL_RE); // clone with its own state
  while ((m = re.exec(s)) !== null) {
    const u = (m[1] || m[0] || "").trim();
    if (u) found.push(u);
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of found) {
    const key = u.replace(/[?#].*$/, "");
    if (!seen.has(key)) {
      seen.add(key);
      out.push(u);
    }
  }
  return out;
}

export function parseUrls(raw: string): string[] {
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return extractUrls(lines.join("\n"));
}

export function classifyLines(raw: string): { line: string; urls: string[] }[] {
  const lines = String(raw || "").split(/\r?\n/);
  return lines.map((line) => ({ line, urls: extractUrls(line) }));
}

export function extractUrlsAll(raw: string): string[] {
  const s = String(raw || "");
  const found: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(X_URL_RE);
  while ((m = re.exec(s)) !== null) {
    const u = (m[1] || m[0] || "").trim();
    if (u) found.push(u);
  }
  return found;
}

export function normalizeXUrl(u: string): string {
  return String(u || "").trim().replace(/[?#].*$/, "");
}
