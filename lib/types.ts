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
  // Degree of "hype" / promotional tone; 0 = flat, 1 = max hype.
  hype_level?: number;
  // Max number of comments per URL (usually 2).
  max_per_url?: number;
  // Whether to ask backend for extra alternate takes per provider.
  include_alternates?: boolean;
  // Optional project key for extra context / alignment.
  project?: string;
  // Whether to enable Pro/KOL-style rewrites (more polished).
  pro_mode?: boolean;
  // Optional speaking/writing voice preset key.
  voice?: number | string;
  // Whether to emit extra telemetry / debug info.
  debug?: boolean;
};

export type CommentItem = {
  text: string;
  // Optional English gloss for native-language comments
  translation_en?: string;
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
    entities?: { cashtags?: string[] | null } | null;
  } | null;
  // Optional matched project profile (if any)
  project?: {
    handle?: string | null;
    file?: string | null;
  } | null;
  status: "pending" | "ok" | "error";
  error_code?: string | null;
  error_message?: string | null;
  // Primary comments
  comments?: CommentItem[];
  // Whether this URL was part of the last active run
  in_last_run?: boolean;
  // Native language hint from backend (for quality heuristics etc.)
  lang_native?: string | null;
  // Internal timing/latency info
  latency_ms?: number;
};

export type TimelineStage =
  | "queued"
  | "fetching"
  | "generating"
  | "polishing"
  | "finalizing"
  | "done"
  | "error";

export type TimelineEntry = {
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
