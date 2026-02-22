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

  // Fact-safe ≈ no risky / overconfident claim vocabulary.
  let claimClean = true;
  for (const p of CLAIM_RISK_PHRASES) {
    if (t.includes(p)) {
      claimClean = false;
      break;
    }
  }
  if (/(nfa|dyor)/.test(t)) claimClean = false;
  if (claimClean) badges.push("factSafe");

  // Low hype ≈ avoid moon/pump/ape etc.
  let lowHype = true;
  for (const p of HYPE_PHRASES) {
    if (t.includes(p)) {
      lowHype = false;
      break;
    }
  }
  if (lowHype) badges.push("lowHype");

  // Native tone is driven by the request toggles (lang_native)
  if (opts?.lang_native) {
    badges.push("nativeTone");
  }

  return { badges };
}
