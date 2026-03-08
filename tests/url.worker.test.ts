/**
 * Tests for workers/url.worker.ts regex — Bug 6 regression.
 * The original regex used \\w and \\d (double-escaped) which in a regex literal
 * match literal backslash characters, not word chars / digits.
 */
import { describe, it, expect } from "vitest";

// Extract just the regex from the worker file for isolated testing
const X_URL_RE =
  /^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/(?:(?:[A-Za-z0-9_]{1,15}\/(?:status|statuses))|i\/(?:web\/)?status)\/\d+/i;

describe("url.worker X_URL_RE (Bug 6 regression)", () => {
  const validUrls = [
    "https://x.com/elon/status/1234567890",
    "https://twitter.com/user/status/9876543210",
    "https://x.com/i/status/1234567890",
    "https://x.com/i/web/status/1234567890",
    "https://www.twitter.com/user/status/123",
    "https://www.x.com/user/status/456",
    "http://x.com/user/status/789",
  ];

  const invalidUrls = [
    "https://x.com/user",
    "https://x.com/nostatushere",
    "https://google.com/status/123",
    "https://x.com",
    "not a url",
    "",
  ];

  for (const url of validUrls) {
    it(`matches valid tweet URL: ${url}`, () => {
      expect(X_URL_RE.test(url)).toBe(true);
    });
  }

  for (const url of invalidUrls) {
    it(`rejects non-tweet URL: ${url || "(empty)"}`, () => {
      expect(X_URL_RE.test(url)).toBe(false);
    });
  }

  it("double-escaped \\\\w does NOT match tweet URLs (documents the original bug)", () => {
    // This is what the broken regex looked like — it would never match because
    // [\\w] in a regex literal means: character class containing backslash and 'w'
    const BROKEN_RE = /(https?:\/\/)?(www\.)?(x\.com|twitter\.com)\/(?:[\\w]+)\/(status|statuses)\/(\\d+)/i;
    expect(BROKEN_RE.test("https://x.com/user/status/1234567890")).toBe(false);
  });
});
