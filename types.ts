export type Tone =
  | "professional"
  | "casual"
  | "friendly"
  | "witty"
  | "controversial"
  | "empathetic"
  | "direct";

export type Length = "short" | "medium" | "long";

export type GenerateMode = "text" | "url";

export type GenerateRequest = {
  mode: GenerateMode;

  // one of these
  text?: string;
  url?: string;

  langEn: boolean;
  langNative: boolean;
  nativeLang: string;

  tone: Tone;
  length: Length;

  variants: number;
  fastMode?: boolean;

  // optional flags (safe even if backend ignores)
  includeEmoji?: boolean;
  useHashtags?: boolean;
};

export type ResultItem = {
  id: string;
  text: string;
  tone?: Tone;
  lang?: string;
  meta?: Record<string, any>;
};

export type GenerateResponse = {
  ok: boolean;
  results: ResultItem[];
  failed?: { index: number; error: string }[];
  requestId?: string;
  meta?: Record<string, any>;
};
