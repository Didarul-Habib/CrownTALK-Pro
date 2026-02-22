// Keep this aligned with the UI + backend prompt options.
// NOTE: "auto" means "let the backend decide" (we omit the field in the request).
export type Tone = "auto" | "professional" | "casual" | "bold" | "friendly";
export type Intent = "auto" | "neutral" | "agree" | "question" | "soft_pushback";

export type GenerateRequest = {
  urls: string[];
  preset?: string;
  // Preferred output language for generation (e.g., 'en','bn','hi'); backend falls back if omitted.
  output_language?: string;
  // Fast mode: fewer tokens/variants where possible.
  fast?: boolean;
  lang_en: boolean;
  lang_native: boolean;
  native_lang?: string;
  tone?: Tone;
  intent?: Intent;
  include_alternates?: boolean;
  // UI voice index (0=Pro, 1=Neutral, 2=Degen, 3=Builder, 4=Analyst)
  voice?: number;
  // Advanced style / quality flags (optional)
  tone_match?: boolean;
  thread_ready?: boolean;
  anti_cringe?: boolean;
};

export type CommentItem = {
  text: string;
  provider?: string;
  alternates?: string[];
};

export type ResultItem = {
  url: string;
  input_url?: string;
  tweet_id?: string;
  handle?: string;
  // Backend-provided lightweight tweet preview
  tweet?: {
    text?: string;
    author_name?: string | null;
    handle?: string | null;
    lang?: string | null;
    entities?: { cashtags?: string[]; handles?: string[]; numbers?: string[] };
  };
  // Backend-provided project match from local project folder
  project?: {
    handle?: string;
    file?: string;
    summary?: string;
  } | null;
  status: "ok" | "error" | "skipped" | "pending";
  reason?: string;
  comments?: CommentItem[];
  // Request-level metadata
  lang_native?: boolean;
  native_lang?: string;
  used_research?: boolean;
  project_handles?: string[];
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
