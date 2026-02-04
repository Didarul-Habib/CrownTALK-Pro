export function parseUrls(raw: string): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const urls = Array.from(new Set(lines));

  // Accept x.com or twitter.com status URLs
  return urls.filter((u) =>
    /https?:\/\/(x\.com|twitter\.com)\/.+\/status\/\d+/i.test(u)
  );
}
