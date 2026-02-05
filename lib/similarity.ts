// Lightweight, backend-free semantic similarity for short social replies.
// Not “true embeddings”, but good enough to catch near-duplicates across a batch.

const STOP = new Set([
  "a","an","and","are","as","at","be","but","by","for","from","has","have","he","her","his","i","if","in","into",
  "is","it","its","just","me","my","of","on","or","our","so","that","the","their","them","then","there","they","this",
  "to","too","up","us","was","we","were","what","when","where","who","why","with","you","your",
]);

function normalizeText(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[@#][\p{L}\p{N}_]+/gu, " ")
    .replace(/[“”‘’]/g, "'")
    .replace(/[^\p{L}\p{N}\s'’]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string) {
  const t = normalizeText(s);
  if (!t) return [] as string[];
  return t
    .split(" ")
    .map((w) => w.trim())
    .filter((w) => w.length >= 2)
    .filter((w) => !STOP.has(w));
}

function add(map: Map<string, number>, key: string, val = 1) {
  map.set(key, (map.get(key) || 0) + val);
}

function vectorize(s: string) {
  const t = tokens(s);
  const v = new Map<string, number>();

  // Unigrams
  for (const w of t) add(v, `u:${w}`, 1);
  // Bigrams (slightly higher weight, catches “same phrasing”)
  for (let i = 0; i < t.length - 1; i++) add(v, `b:${t[i]}_${t[i + 1]}`, 1.6);

  // Light length normalization to avoid “short reply” bias.
  const denom = Math.sqrt(Array.from(v.values()).reduce((a, x) => a + x * x, 0)) || 1;
  for (const [k, x] of v.entries()) v.set(k, x / denom);
  return v;
}

export function cosineSimilarity(a: string, b: string) {
  const va = vectorize(a);
  const vb = vectorize(b);
  if (!va.size || !vb.size) return 0;
  let dot = 0;
  // Iterate smaller map
  const [sm, lg] = va.size < vb.size ? [va, vb] : [vb, va];
  for (const [k, x] of sm.entries()) {
    const y = lg.get(k);
    if (y) dot += x * y;
  }
  return Math.max(0, Math.min(1, dot));
}

export type SimilarityFlag = {
  url: string;
  maxSim: number;
  withUrl?: string;
};

// Returns a map url -> {maxSim, withUrl} for the most similar other reply.
export function findNearDuplicates(
  pairs: { url: string; text: string }[],
  threshold = 0.84,
  maxN = 220
) {
  const list = pairs.filter((p) => p.text.trim());
  const out = new Map<string, SimilarityFlag>();
  if (list.length < 2) return out;

  // Safety cap (n^2). For huge runs, we still provide value without freezing the UI.
  const capped = list.length > maxN ? list.slice(0, maxN) : list;

  for (let i = 0; i < capped.length; i++) {
    for (let j = i + 1; j < capped.length; j++) {
      const a = capped[i];
      const b = capped[j];
      const sim = cosineSimilarity(a.text, b.text);
      if (sim < threshold) continue;

      const prevA = out.get(a.url);
      if (!prevA || sim > prevA.maxSim) out.set(a.url, { url: a.url, maxSim: sim, withUrl: b.url });
      const prevB = out.get(b.url);
      if (!prevB || sim > prevB.maxSim) out.set(b.url, { url: b.url, maxSim: sim, withUrl: a.url });
    }
  }
  return out;
}

export type SpamFlag = {
  url: string;
  reason: string;
};

const GENERIC = [
  "love this",
  "great post",
  "great work",
  "amazing",
  "so cool",
  "this is awesome",
  "nice one",
  "keep it up",
];

export function detectSpammy(text: string): string | null {
  const t = normalizeText(text);
  if (!t) return null;

  // Too short + generic praise → botty
  if (t.split(" ").length <= 5) {
    for (const g of GENERIC) if (t.includes(g)) return "Very short + generic praise";
  }

  // Excessive punctuation
  const bangs = (text.match(/!/g) || []).length;
  if (bangs >= 4) return "Too many exclamation marks";

  // Emoji spam (rough heuristic)
  const emojiCount = (text.match(/[\p{Extended_Pictographic}]/gu) || []).length;
  if (emojiCount >= 6) return "Too many emojis";

  // ALL CAPS shouting
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  const caps = (text.match(/[A-Z]/g) || []).length;
  if (letters >= 12 && caps / Math.max(1, letters) > 0.75) return "Looks like shouting (ALL CAPS)";

  return null;
}
