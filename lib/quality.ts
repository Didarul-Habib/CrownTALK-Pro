// Lightweight comment quality heuristics for UI-only badges.
// These intentionally mirror (in a simplified way) the backend guards
// so we can surface hints like "Fact-safe" / "Low hype" without
// changing any filtering behaviour.

const CLAIM_RISK_PHRASES: string[] = [
  // Overconfident / unverifiable claims
  "guaranteed",
  "100%",
  "certain",
  "confirmed",
  "officially confirmed",
  "insider",
  "leaked",
  "i know",
  "trust me",
  // Personal experience claims (often hallucinated)
  "i bought",
  "i aped",
  "i used",
  "i tested",
  "i tried",
  "i just used",
  "i made",
  "i earned",
  "my bag",
  "my position",
  // Hard shill / advice
  "buy now",
  "sell now",
  "not financial advice",
  "financial advice",
  "you should buy",
  "you should sell",
  "easy money",
];

const HYPE_PHRASES: string[] = [
  "to the moon",
  "moon",
  "moonshot",
  "pump",
  "pump it",
  "ape in",
  "send it",
  "lambo",
  "🚀",
];

export type QualityBadge = "factSafe" | "lowHype" | "nativeTone";

export type QualityInfo = {
  badges: QualityBadge[];
};

export function getQualityInfo(text: string, opts?: { lang_native?: boolean | null }): QualityInfo {
  const t = (text || "").toLowerCase();
  const badges: QualityBadge[] = [];

  if (!t.trim()) return { badges };

  const hasNumber = /[0-9]/.test(t) || /\b(apr|apy|x)\b/.test(t);
  const hasPercent = /%/.test(t) || /\bpercent\b/.test(t);
  const hasMoney = /\$[0-9]/.test(t);

  const HEDGE_WORDS = [
    "might",
    "could",
    "seems",
    "seems like",
    "looks like",
    "feels like",
    "based on",
    "depending on",
    "if ",
    "assuming",
    "as long as",
    "on track",
    "trend",
    "trends",
  ];

  let risky = false;
  for (const p of CLAIM_RISK_PHRASES) {
    if (t.includes(p)) {
      risky = true;
      break;
    }
  }
  if (/\b(nfa|dyor)\b/.test(t)) risky = true;

  let hypey = false;
  for (const p of HYPE_PHRASES) {
    if (t.includes(p)) {
      hypey = true;
      break;
    }
  }

  // Only tag "Fact-safe" when the reply is actually making some kind of
  // quantitative / factual statement but without obvious risky language.
  if (!risky && (hasNumber || hasPercent || hasMoney)) {
    badges.push("factSafe");
  }

  // Only tag "Low hype" when the reply clearly uses hedging / careful
  // language and avoids hype words. This keeps badges from appearing
  // identically on every single comment.
  const hasHedge = HEDGE_WORDS.some((w) => t.includes(w));
  if (!hypey && hasHedge) {
    badges.push("lowHype");
  }

  // Native tone is driven by the request toggles (lang_native)
  if (opts?.lang_native) {
    badges.push("nativeTone");
  }

  return { badges };
}
