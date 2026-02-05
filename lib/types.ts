// Keep this aligned with the UI + backend prompt options.
// NOTE: "auto" means "let the backend decide" (we omit the field in the request).
export type Tone = "auto" | "professional" | "casual" | "bold" | "friendly";
export type Intent = "auto" | "neutral" | "agree" | "question" | "soft_pushback";

export type GenerateRequest = {
  urls: string[];
  lang_en: boolean;
  lang_native: boolean;
  native_lang?: string;
  tone?: Tone;
  intent?: Intent;
  include_alternates?: boolean;
};

export type CommentItem = {
  text: string;
  provider?: string;
  alternates?: string[];
};

export type ResultItem = {
  url: string;
  status: "ok" | "error" | "skipped" | "pending";
  reason?: string;
  comments?: CommentItem[];
  // UI-only metadata (frontend upgrades)
  timeline?: TimelineEvent[];
  versions?: ResultVersion[];
  flags?: {
    spamReason?: string | null;
    similarity?: { maxSim: number; withUrl?: string } | null;
  };
};

export type TimelineStage =
  | "queued"
  | "sending"
  | "received"
  | "copied"
  | "rerolled"
  | "failed"
  | "skipped";

export type TimelineEvent = {
  at: number;
  stage: TimelineStage;
  note?: string;
};

export type ResultVersion = {
  at: number;
  label: "original" | "reroll";
  comments: CommentItem[];
};

export type GenerateResponse = {
  results: ResultItem[];
  meta?: { run_id?: string };
};
