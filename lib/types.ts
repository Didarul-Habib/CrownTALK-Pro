// Keep this aligned with the UI + backend prompt options.
// NOTE: "auto" means "let the backend decide" (we omit the field in the request).
export type Tone = "auto" | "professional" | "casual" | "bold" | "friendly";
export type Intent = "auto" | "neutral" | "agree" | "question" | "soft_pushback";

export type QualityMode = "fast" | "balanced" | "pro";


export type GenerateRequest = {
  urls: string[];
  preset?: string;
  // Preferred output language for generation (e.g., 'en','bn','hi'); backend falls back if omitted.
  output_language?: string;
  // Fast mode: fewer tokens/variants where possible.
  fast?: boolean;
  // Preferred quality preset; backend defaults to "balanced" when omitted.
  quality_mode?: QualityMode;
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
  // Optional human-readable reason for failure (frontend-only)
  reason?: string | null;
  // Primary comments
  comments?: CommentItem[];
  // Optional backend flags (rate-limit, research usage, etc.)
  flags?: any;
  // Whether this URL was part of the last active run
  in_last_run?: boolean;
  // Native language hint from backend (for quality heuristics etc.)
  lang_native?: string | null;
  // Internal timing/latency info
  latency_ms?: number;
  // Optional pipeline timeline events for this URL
  timeline?: { at: number; stage: TimelineStage; note?: string }[];
};

export type TimelineStage =
  | "queued"
  | "sending"
  | "fetching"
  | "generating"
  | "polishing"
  | "finalizing"
  | "done"
  | "error"
  | "received"
  | "failed"
  | "copied"
  | "rerolled";

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

export type ProjectPostMode =
  | "short_casual"
  | "medium_casual"
  | "medium_professional"
  | "long_detailed"
  | "thread_4_6";

export type ProjectCatalogItem = {
  id: string;
  slug: string;
  name: string;
  ticker: string;
  primary_chain: string;
  category: string;
  stage: string;
  one_line_pitch: string;
  has_post_card: boolean;
};

export type ProjectPostResponseSingle = {
  project_id: string;
  post_mode: ProjectPostMode;
  language: string;
  text: string;
  meta?: {
    quality_mode?: QualityMode;
    tokens_used?: number | null;
  };
};

export type ProjectPostResponseThread = {
  project_id: string;
  post_mode: "thread_4_6";
  language: string;
  tweets: string[];
  meta?: {
    quality_mode?: QualityMode;
    tokens_used?: number | null;
  };
};

export type ProjectPostResponse = ProjectPostResponseSingle | ProjectPostResponseThread;



export type MarketPostMode = "short_casual" | "medium_analysis" | "thread_4_6";

export type MarketPostRequestPayload = {
  asset_id?: string | null;
  post_mode: MarketPostMode;
  tone?: "casual" | "professional" | "";
  language?: string;
  quality_mode?: QualityMode;
};

export type MarketPostResponseSingle = {
  asset_id: string;
  post_mode: MarketPostMode;
  language: string;
  text: string;
  meta?: {
    quality_mode?: QualityMode;
    tokens_used?: number | null;
  };
};

export type MarketPostResponseThread = {
  asset_id: string;
  post_mode: "thread_4_6";
  language: string;
  tweets: string[];
  meta?: {
    quality_mode?: QualityMode;
    tokens_used?: number | null;
  };
};

export type MarketPostResponse =
  | MarketPostResponseSingle
  | MarketPostResponseThread;

export type OfftopicKind =
  | "random"
  | "gm_morning"
  | "noon"
  | "afternoon"
  | "evening"
  | "gn_night";

export type OfftopicPostRequestPayload = {
  kind: OfftopicKind;
  post_mode: "short" | "semi_mid";
  tone?: "casual" | "professional" | "";
  language?: string;
  quality_mode?: QualityMode;
};

export type OfftopicPostResponse = {
  kind: OfftopicKind;
  post_mode: "short" | "semi_mid";
  language: string;
  text: string;
  meta?: {
    quality_mode?: QualityMode;
    tokens_used?: number | null;
  };
};

