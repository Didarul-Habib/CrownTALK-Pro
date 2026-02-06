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

test("backend /health matches envelope", async ({ request }) => {
  const apiBase = process.env.E2E_API_BASE;
  test.skip(!apiBase, "E2E_API_BASE not set");

  const res = await request.get(`${apiBase}/health`);
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  const parsed = Envelope.safeParse(json);
  expect(parsed.success).toBeTruthy();
});
