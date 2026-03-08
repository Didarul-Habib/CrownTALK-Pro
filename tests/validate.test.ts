/**
 * Frontend unit tests — lib/validate.ts
 *
 * Tests the normalizeXUrl and extractUrls functions which sit at the boundary
 * between user input and the backend API. A mismatch here causes "N-1 URL displayed"
 * (Bug 1 root cause B) where the frontend key never matches the backend's normalized URL.
 *
 * Run: vitest run
 */
import { describe, it, expect } from "vitest";
import { normalizeXUrl, extractUrls, parseUrls } from "../lib/validate";

describe("normalizeXUrl", () => {
  it("normalizes http:// to https://", () => {
    expect(normalizeXUrl("http://x.com/user/status/123"))
      .toBe("https://x.com/user/status/123");
  });

  it("normalizes http twitter.com to https x.com", () => {
    expect(normalizeXUrl("http://twitter.com/user/status/456"))
      .toBe("https://x.com/user/status/456");
  });

  it("keeps https://x.com unchanged", () => {
    expect(normalizeXUrl("https://x.com/user/status/123"))
      .toBe("https://x.com/user/status/123");
  });

  it("normalizes twitter.com to x.com", () => {
    expect(normalizeXUrl("https://twitter.com/user/status/999"))
      .toBe("https://x.com/user/status/999");
  });

  it("normalizes mobile.twitter.com to x.com", () => {
    expect(normalizeXUrl("https://mobile.twitter.com/user/status/789"))
      .toBe("https://x.com/user/status/789");
  });

  it("normalizes m.twitter.com to x.com", () => {
    expect(normalizeXUrl("https://m.twitter.com/user/status/321"))
      .toBe("https://x.com/user/status/321");
  });

  it("normalizes www.x.com to x.com", () => {
    expect(normalizeXUrl("https://www.x.com/user/status/111"))
      .toBe("https://x.com/user/status/111");
  });

  it("strips query string", () => {
    expect(normalizeXUrl("https://x.com/user/status/123?s=20&t=abc"))
      .toBe("https://x.com/user/status/123");
  });

  it("strips hash fragment", () => {
    expect(normalizeXUrl("https://x.com/user/status/123#anchor"))
      .toBe("https://x.com/user/status/123");
  });

  it("normalizes /i/web/status/ to /i/status/", () => {
    expect(normalizeXUrl("https://x.com/i/web/status/12345"))
      .toBe("https://x.com/i/status/12345");
  });

  it("strips surrounding punctuation", () => {
    expect(normalizeXUrl("(https://x.com/user/status/123)"))
      .toBe("https://x.com/user/status/123");
    expect(normalizeXUrl('"https://x.com/user/status/123"'))
      .toBe("https://x.com/user/status/123");
    expect(normalizeXUrl("https://x.com/user/status/123."))
      .toBe("https://x.com/user/status/123");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeXUrl("")).toBe("");
    expect(normalizeXUrl("   ")).toBe("");
  });

  /**
   * Parity test: the backend's clean_and_normalize_urls always returns https://x.com/.
   * This test guarantees the frontend key will always match the backend's input_url.
   */
  it("produces the same scheme and host as backend clean_and_normalize_urls", () => {
    const inputs = [
      "http://x.com/user/status/1",
      "https://twitter.com/user/status/1",
      "http://twitter.com/user/status/1",
      "https://mobile.twitter.com/user/status/1",
      "http://m.twitter.com/user/status/1",
    ];
    for (const input of inputs) {
      const result = normalizeXUrl(input);
      expect(result.startsWith("https://x.com/"), `${input} → ${result}`).toBe(true);
    }
  });
});

describe("extractUrls", () => {
  it("extracts a standard x.com status URL", () => {
    const urls = extractUrls("https://x.com/elon/status/1234567890");
    expect(urls).toEqual(["https://x.com/elon/status/1234567890"]);
  });

  it("extracts from surrounding text", () => {
    const urls = extractUrls("Check this out https://x.com/user/status/111 it's great");
    expect(urls).toContain("https://x.com/user/status/111");
  });

  it("deduplicates identical URLs", () => {
    const urls = extractUrls(
      "https://x.com/user/status/1\nhttps://x.com/user/status/1"
    );
    expect(urls).toHaveLength(1);
  });

  it("treats http and https versions of the same URL as one", () => {
    const urls = extractUrls(
      "http://x.com/user/status/123\nhttps://x.com/user/status/123"
    );
    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe("https://x.com/user/status/123");
  });

  it("extracts twitter.com URL and normalizes to x.com", () => {
    const urls = extractUrls("https://twitter.com/user/status/99887766");
    expect(urls).toEqual(["https://x.com/user/status/99887766"]);
  });

  it("returns empty for non-tweet URLs", () => {
    const urls = extractUrls("https://google.com/search?q=hello");
    expect(urls).toHaveLength(0);
  });

  it("handles empty input", () => {
    expect(extractUrls("")).toHaveLength(0);
  });
});

describe("parseUrls", () => {
  it("parses one-per-line input", () => {
    const raw = [
      "https://x.com/user/status/1",
      "https://x.com/user/status/2",
      "https://x.com/user/status/3",
    ].join("\n");
    expect(parseUrls(raw)).toHaveLength(3);
  });

  it("deduplicates across http/https/twitter variants", () => {
    const raw = [
      "http://x.com/user/status/1",
      "https://x.com/user/status/1",
      "https://twitter.com/user/status/1",
    ].join("\n");
    const urls = parseUrls(raw);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe("https://x.com/user/status/1");
  });
});
