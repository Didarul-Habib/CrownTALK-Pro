import { test, expect } from "@playwright/test";
import { z } from "zod";

const Envelope = z.object({
  success: z.boolean(),
  requestId: z.string(),
  data: z.any().nullable(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional(),
    })
    .nullable(),
});

test("/health returns standardized envelope", async ({ request }) => {
  const apiBase = process.env.E2E_API_BASE;
  test.skip(!apiBase, "Set E2E_API_BASE to your backend URL to run API contract tests");

  const res = await request.get(`${apiBase}/health`);
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  const parsed = Envelope.safeParse(json);
  expect(parsed.success).toBeTruthy();
});
