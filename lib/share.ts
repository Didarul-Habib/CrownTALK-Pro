"use client";

export function encodeSharePayload(obj: any): string {
  const json = JSON.stringify(obj);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  // url-safe
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeSharePayload(token: string): any | null {
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((token.length + 3) % 4);
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function makeShareUrl(payload: any): string {
  const t = encodeSharePayload(payload);
  const url = new URL(window.location.href);
  url.hash = `share=${t}`;
  return url.toString();
}
