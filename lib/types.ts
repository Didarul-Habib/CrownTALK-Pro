export type Tone = "professional" | "neutral" | "playful";
export type Intent = "neutral" | "agree" | "question" | "soft_pushback";

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
  status: "ok" | "error" | "skipped";
  reason?: string;
  comments?: CommentItem[];
};

export type GenerateResponse = {
  results: ResultItem[];
  meta?: { run_id?: string };
};
