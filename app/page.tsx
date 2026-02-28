"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {prefersReducedMotion, shouldReduceEffects, prefersReducedEffects} from "@/lib/motion";
import { useMutation } from "@tanstack/react-query";

import TopBar from "@/components/TopBar";
import WelcomePopup from "@/components/WelcomePopup";
import OnboardingTour from "@/components/OnboardingTour";
import UrlInput, { cleanInvalidInRaw, shuffleUrlsInRaw, sortUrlsInRaw } from "@/components/UrlInput";
import Controls from "@/components/Controls";
import MobileActionBar from "@/components/MobileActionBar";
import MobileControlsSheet from "@/components/MobileControlsSheet";
import MobilePresetsSheet from "@/components/MobilePresetsSheet";
import Results from "@/components/Results";
import SignupGate from "@/components/SignupGate";
import ProgressStepper, { Stage } from "@/components/ProgressStepper";
import ResumeBanner from "@/components/ResumeBanner";
import SessionDiffBanner from "@/components/SessionDiffBanner";
// Heavy panels are lazy-loaded for better route-level performance.
import Footer from "@/components/Footer";
import type { ThemeId } from "@/components/ThemeStudioBar";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { translate, useUiLang } from "@/lib/i18n";
import { parseUrls } from "@/lib/validate";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { ApiError, logout as apiLogout, cancelActiveRun } from "@/lib/api";
import type { SourcePreview } from "@/lib/api";
import { LS, lsGet, lsGetJson, lsSet, lsSetJson } from "@/lib/storage";
import { logMetric } from "@/lib/metrics";
import type { GenerateResponse, Intent, ResultItem, Tone, QualityMode } from "@/lib/types";
import type { TimelineStage } from "@/lib/types";
import type { ClipboardRecord, RunRecord, RunRequestSnapshot, UserProfile } from "@/lib/persist";
import { nowId } from "@/lib/persist";
import { idbGet, idbSet } from "@/lib/idb";
import { loadPrefs, savePrefs, type UserPrefs } from "@/lib/prefs";
import type { SessionPreset } from "@/lib/sessionPresets";
import { loadSessionPresets, saveSessionPresets } from "@/lib/sessionPresets";
import { useUndoStack } from "@/lib/useUndoStack";
import { useOnline } from "@/lib/useOnline";
import { broadcast, onBroadcast } from "@/lib/syncChannel";
import { decodeSharePayload, makeShareUrl } from "@/lib/share";
import { useRenderCount } from "@/lib/useRenderCount";

const DEFAULT_BACKEND = "https://crowntalk.onrender.com";

const PerfPanel = dynamic(() => import("@/components/PerfPanel"), { ssr: false });
const RunHistoryPanelLazy = dynamic(() => import("@/components/RunHistoryPanel"), { ssr: false });
const ClipboardHistoryPanelLazy = dynamic(() => import("@/components/ClipboardHistoryPanel"), { ssr: false });
const RenderProfilerPanelLazy = dynamic(() => import("@/components/RenderProfilerPanel"), { ssr: false });
const RunTimingsPanelLazy = dynamic(() => import("@/components/RunTimingsPanel"), { ssr: false });

export default function Home() {
  const uiLang = useUiLang();

  useRenderCount("Home");
  const reduceFx = prefersReducedEffects();
  const [baseUrl] = useState<string>(() =>
    (process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND).replace(/\/+$/, "")
  );

  const [showRenderProfiler, setShowRenderProfiler] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      setShowRenderProfiler(true);
      return;
    }
    try {
      if (typeof window !== "undefined" && window.location.search.includes("ff_render=1")) {
        setShowRenderProfiler(true);
      }
    } catch {
      // ignore
    }
  }, []);

              useEffect(() => {
                if (typeof window === "undefined") return;
                try {
                  const flag = lsGet(LS.promptProto, "0") === "1";
                  setUsePromptProto(flag);
                } catch {
                  // ignore
                }
              }, []);
            
  const [usePromptProto, setUsePromptProto] = useState(false);

  const rawStack = useUndoStack("", 80);
  const raw = rawStack.value;
  const setRaw = rawStack.set;
  const debouncedRaw = useDebouncedValue(raw, 180);
  const urls = useMemo(() => parseUrls(debouncedRaw), [debouncedRaw]);
  const loadDemoRun = () => {
    // Demo run: pre-fill a few sample X links so new users can see output without thinking.
    const demoUrls = [
      "https://x.com/cz_binance/status/1725292931962040418",
      "https://x.com/ThiccyAltcoin/status/1745869203539626062",
      "https://x.com/milesdeutscher/status/1756701714206280204",
    ];
    setRaw(demoUrls.join("\n"));
  };

  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);

  const [inputMode, setInputMode] = useState<"urls" | "source">("urls");
  const [sourceUrl, setSourceUrl] = useState<string>("");
  const [sourcePrev, setSourcePrev] = useState<SourcePreview | null>(null);

  const [langEn, setLangEn] = useState(false);
  const [langNative, setLangNative] = useState(true);
  const [nativeLang, setNativeLang] = useState("auto");

  const [tone, setTone] = useState<Tone>("auto");
  const [intent, setIntent] = useState<Intent>("auto");
  const [includeAlternates, setIncludeAlternates] = useState(false);
  const [fastMode, setFastMode] = useState(false);
  const [qualityMode, setQualityMode] = useState<QualityMode>("balanced");

  // Quality mode is the primary UX control; keep the legacy fast flag in sync for older backends.
  useEffect(() => {
    setFastMode(qualityMode === "fast");
  }, [qualityMode]);
  const [preset, setPreset] = useState<string>("auto");
  const [voice, setVoice] = useState<number>(1);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [mobilePresetsOpen, setMobilePresetsOpen] = useState(false);
  const [failStreak, setFailStreak] = useState(0);

  const [token, setToken] = useState<string>("");
  const [authToken, setAuthToken] = useState<string>("");
  const [theme, setTheme] = useState<ThemeId>("neon");

  function applyVoice(v: number) {
    // 0 Pro, 1 Neutral, 2 Degen, 3 Builder, 4 Analyst
    if (v === 0) {
      setTone("professional");
      setIntent("neutral");
    } else if (v === 1) {
      setTone("auto");
      setIntent("auto");
    } else if (v === 2) {
      setTone("bold");
      setIntent("agree");
    } else if (v === 3) {
      setTone("friendly");
      setIntent("question");
    } else {
      setTone("professional");
      setIntent("question");
    }
  }

  useEffect(() => {
    applyVoice(voice);
    // Load saved session presets on first mount (client-side only)
    if (typeof window !== "undefined") {
      setSessionPresets(loadSessionPresets());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice]);

  useEffect(() => {
    if (preset === "auto") return;
    if (preset === "congrats") {
      setTone((t) => (t === "auto" ? "friendly" : t));
      setIntent((i) => (i === "auto" ? "agree" : i));
    } else if (preset === "support") {
      setTone((t) => (t === "auto" ? "friendly" : t));
      setIntent((i) => (i === "auto" ? "question" : i));
    } else if (preset === "builder") {
      setTone((t) => (t === "auto" ? "friendly" : t));
      setIntent((i) => (i === "auto" ? "question" : i));
    } else if (preset === "defi" || preset === "perps") {
      setTone((t) => (t === "auto" ? "professional" : t));
      setIntent((i) => (i === "auto" ? "question" : i));
    } else if (preset === "scam") {
      setTone((t) => (t === "auto" ? "professional" : t));
      setIntent((i) => (i === "auto" ? "question" : i));
    } else if (preset === "greeting") {
      setTone((t) => (t === "auto" ? "friendly" : t));
      setIntent((i) => (i === "auto" ? "neutral" : i));
    }
  }, [preset]);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionPresets, setSessionPresets] = useState<SessionPreset[]>([]);

  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [clipboard, setClipboard] = useState<ClipboardRecord[]>([]);
  const [resumeCandidate, setResumeCandidate] = useState<RunRecord | null>(null);
  const [dismissDiffId, setDismissDiffId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [queueTotal, setQueueTotal] = useState(0);
  const [queueDone, setQueueDone] = useState(0);
  const [runTotal, setRunTotal] = useState(0);
  const [runDone, setRunDone] = useState(0);
  const [runOk, setRunOk] = useState(0);
  const [runCancelled, setRunCancelled] = useState(false);
  const timers = useRef<number[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const suppressAbortRef = useRef(false);
  const runStartedAtRef = useRef(0);
  const queueCancelRef = useRef(false);

  // Expose queue metrics for lightweight UI components (e.g., ProgressStepper) without widening props.
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).__ct_queueTotal = queueTotal;
    (window as any).__ct_queueDone = queueDone;
  }, [queueTotal, queueDone]);

  // Keep the current run's canonical order so we can safely merge results without
  // duplicating cards (prevents the "10 urls for a 5-url run" bug).
  const activeRunOrderRef = useRef<string[]>([]);

  const STAGE_ORDER: Record<Stage, number> = {
    idle: 0,
    fetching: 1,
    generating: 2,
    polishing: 3,
    finalizing: 4,
    done: 5,
  };

  function advanceStage(next: Stage) {
    setStage((prev) => (STAGE_ORDER[next] > STAGE_ORDER[prev] ? next : prev));
  }

  function extractStatusId(u: string): string | null {
    const s = String(u || "");
    const m = s.match(/\/status\/(\d{5,})/);
    return m?.[1] || null;
  }

  function stageFromProgress(done: number, total: number): Stage {
    if (!total || total <= 0) return "generating";
    const p = Math.max(0, Math.min(1, done / total));
    if (p <= 0.08) return "fetching";
    if (p < 0.78) return "generating";
    if (p < 0.96) return "polishing";
    return "finalizing";
  }


  function updateAvgMsPerUrl(durationMs: number, urlCount: number) {
    try {
      if (!urlCount || urlCount <= 0) return;
      const perUrl = Math.max(1500, Math.round(durationMs / urlCount));
      const prevRaw = lsGet(LS.avgMsPerUrl, "");
      const prev = prevRaw ? Number(prevRaw) : NaN;
      const next = Number.isFinite(prev) ? Math.round(prev * 0.75 + perUrl * 0.25) : perUrl;
      // Clamp to sane bounds (ms/url) so one weird run does not ruin the UX.
      const clamped = Math.max(3000, Math.min(60000, next));
      lsSet(LS.avgMsPerUrl, String(clamped));
    } catch {
      // ignore
    }
  }

  function mergeIncomingResults(prev: ResultItem[], incoming: ResultItem[]) {
  // Frontend-only helper: update comment text/lock state for a given URL+index.
  function updateCommentMeta(url: string, index: number, patch: { text?: string; is_locked?: boolean }) {
    setItems((prev) =>
      prev.map((it) => {
        const key = ((it as any).input_url || it.url) as string;
        const targetKey = ((url as any) || "") as string;
        if (!key || !targetKey) return it;
        if (key !== targetKey && it.url !== url) return it;
        if (!Array.isArray(it.comments)) return it;
        if (index < 0 || index >= it.comments.length) return it;
        const nextComments = it.comments.map((c, i) =>
          i === index
            ? ({
                ...c,
                ...(patch.text !== undefined ? { text: patch.text, is_user_edited: true } : {}),
                ...(patch.is_locked !== undefined ? { is_locked: patch.is_locked } : {}),
              } as any)
            : c
        );
        return { ...it, comments: nextComments };
      })
    );
  }

    const order = activeRunOrderRef.current || [];
    const orderSet = new Set(order);
    const byId = new Map<string, string>();
    for (const u of order) {
      const id = extractStatusId(u);
      if (id) byId.set(id, u);
    }

    const map = new Map<string, ResultItem>();
    for (const p of prev) {
      const key = ((p as any).input_url || p.url) as string;
      map.set(key, p);
    }

    for (const r of incoming || []) {
      const rInput = String((r as any)?.input_url || "").trim();
      const rUrl = String((r as any)?.url || "").trim();
      let key = rInput || rUrl;

      // If the backend rewrites display URLs (e.g., /i/status -> /handle/status),
      // map by tweet_id as a fallback.
      if (key && !orderSet.has(key)) {
        const rid =
          ((r as any)?.tweet_id ? String((r as any).tweet_id) : "") ||
          extractStatusId(rInput) ||
          extractStatusId(rUrl);
        if (rid && byId.has(rid)) key = byId.get(rid)!;
      }

      const existing = map.get(key);
      const merged: any = { ...(existing || {}), ...(r || {}) };

      // If there are user-locked comments on the existing item, never drop them.
      if (
        existing &&
        Array.isArray(existing.comments) &&
        existing.comments.some((c: any) => (c as any)?.is_locked)
      ) {
        const prevComments = existing.comments as any[];
        const lockedComments = prevComments.filter((c: any) => (c as any)?.is_locked);
        const newComments = Array.isArray((r as any)?.comments) ? ((r as any).comments as any[]) : [];
        if (lockedComments.length) {
          // Simple merge: keep all locked comments first, then append new ones.
          const mergedComments: any[] = [...lockedComments];

          for (const nc of newComments) {
            const text = String((nc as any)?.text ?? "").trim().toLowerCase();
            if (!text) {
              mergedComments.push(nc);
              continue;
            }
            const dup = mergedComments.some((c: any) => {
              const t2 = String((c as any)?.text ?? "").trim().toLowerCase();
              return t2 && t2 === text;
            });
            if (!dup) mergedComments.push(nc);
          }

          merged.comments = mergedComments;
        }
      }

      // Preserve timeline + versions (frontend-only) across updates.
      if (existing?.timeline) merged.timeline = existing.timeline;
      if ((existing as any)?.versions) merged.versions = (existing as any).versions;

      // Track versions for rerolls / overwrites.
      if (
        existing?.status === "ok" &&
        existing.comments?.length &&
        (r as any)?.status === "ok" &&
        (r as any)?.comments?.length
      ) {
        const versions = [...(((existing as any).versions as any[]) || [])];
        if (!versions.length) {
          versions.push({ at: Date.now(), label: "original", comments: existing.comments });
        }
        versions.push({ at: Date.now(), label: "reroll", comments: (r as any).comments || [] });
        merged.versions = versions;
      }

      // Stabilize keys.
      const stableInput = (existing as any)?.input_url || rInput || key;
      merged.input_url = stableInput;
      merged.url = rUrl || existing?.url || stableInput;
      merged.status = (r as any)?.status || existing?.status || "ok";

      map.set(key, merged as ResultItem);
    }

    // Output in stable order first.
    const out: ResultItem[] = [];
    const seen = new Set<string>();
    for (const u of order) {
      const it = map.get(u);
      if (it) {
        out.push({ ...it, input_url: (it as any).input_url || u, url: it.url || u } as any);
        seen.add(u);
      }
    }
    for (const [k, it] of map.entries()) {
      if (seen.has(k)) continue;
      out.push({ ...it, input_url: (it as any).input_url || k, url: it.url || k } as any);
    }

    // Final de-dupe by stable key.
    const finalMap = new Map<string, ResultItem>();
    for (const it of out) {
      const k = ((it as any).input_url || it.url) as string;
      if (!finalMap.has(k)) finalMap.set(k, it);
    }
    return Array.from(finalMap.values());
  }

const genMutation = useMutation({
  mutationFn: async (vars: { requestUrls: string[]; signal?: AbortSignal }) => {
    return await (await import("@/lib/api")).generateCommentsStream(
      baseUrl,
      {
        urls: vars.requestUrls,
        lang_en: langEn,
        lang_native: langNative,
        native_lang: langNative ? nativeLang : undefined,
        tone: tone === "auto" ? undefined : tone,
        intent: intent === "auto" ? undefined : intent,
        voice,
        include_alternates: includeAlternates,
        // Preferred quality mode; backend falls back to "balanced" when omitted.
        quality_mode: qualityMode,
        // Legacy flags for backwards compatibility with older backends.
        fast: qualityMode === "fast" || fastMode,
        pro_mode: qualityMode === "pro",
        preset: preset !== "auto" ? preset : undefined,
        // Preferred output language for the primary generation pass.
        // When Native is on, let the backend auto-detect from the tweet unless user picked a specific code.
        output_language: langNative
          ? nativeLang === "auto"
            ? "auto"
            : nativeLang
          : "en",
      },
      token,
      authToken,
      vars.signal,
(u) => {
  // StreamUpdate handler: keep queue and run summary in sync with backend events.
  if (u.type === "meta") {
    if (u.run_id) setRunId(u.run_id);
    const total = (u as any).total;
    if (typeof total === "number" && total > 0) {
      // Initialize queue + run summary on first meta.
      setQueueTotal(total);
      setQueueDone(0);
      setRunTotal(total);
      setRunDone(0);
      setRunOk(0);
      setRunCancelled(false);
      // Enter fetching stage as soon as we know there is work.
      advanceStage("fetching");
    }
    return;
  }

  if (u.type === "status") {
    const s = String((u as any).stage || "");
    const total = (u as any).total;
    const done = (u as any).done;

    // Prefer explicit progress numbers from the stream when available.
    if (typeof total === "number" && total >= 0) {
      setQueueTotal(total);
      setRunTotal(total);
    }
    if (typeof done === "number" && done >= 0) {
      startTransition(() => {
        setQueueDone(done);
        setRunDone(done);
      });
    }

    // Map backend stages to coarse UI stages.
    if (s === "fetching" || s === "extracting") {
      advanceStage("fetching");
    } else if (s === "generating") {
      advanceStage("generating");
    } else if (s === "polishing") {
      advanceStage("polishing");
    } else if (s === "finalizing") {
      advanceStage("finalizing");
    }
    return;
  }

  if (u.type === "result") {
    // Merge each per-URL result into the list as it arrives.
    startTransition(() => {
      setItems((prev) => mergeIncomingResults(prev, [u.item as any]));
    });
    return;
  }

  if (u.type === "done") {
    const total = (u as any).total;
    const done = (u as any).done;
    const ok = (u as any).ok_count;
    const cancelled = Boolean((u as any).cancelled);

    if (typeof total === "number" && total >= 0) {
      setQueueTotal(total);
      setRunTotal(total);
    }
    if (typeof done === "number" && done >= 0) {
      setQueueDone(done);
      setRunDone(done);
    }
    if (typeof ok === "number" && ok >= 0) {
      setRunOk(ok);
    }
    setRunCancelled(cancelled);
    // Let the batch runner flip us to "done"; here we just ensure
    // the visual pipeline is in its final segment.
    advanceStage("finalizing");
    return;
  }
}
    );
  },
  retry: 0,
});

  const genFromUrlMutation = useMutation({
    mutationFn: async (vars: { source_url: string; signal?: AbortSignal }) => {
      const api = await import("@/lib/api");
      return api.commentFromUrlStream(
        baseUrl,
        {
          source_url: vars.source_url,
          // Language toggles: mirror the main generator so previews respect Native/English settings.
          output_language: langNative
            ? nativeLang === "auto"
              ? "auto"
              : nativeLang
            : "en",
          fast: fastMode,
          quote_mode: true,
          lang_en: langEn,
          lang_native: langNative,
          native_lang: langNative ? nativeLang : undefined,
        },
        token,
        authToken,
        vars.signal,
        (u) => {
          if (u.type === "status" && u.stage) {
            // Map backend stages to UI stages
            const s = String(u.stage);
            if (s === "fetching" || s === "extracting") setStage("fetching");
            else if (s === "generating") setStage("generating");
            else if (s === "finalizing") setStage("finalizing");
          }
          if (u.type === "result" && (u as any).item) {
            const it = (u as any).item;
            setItems([{ url: String(it.url || vars.source_url || ""), status: "ok", comments: (it.comments || []).map((t: any) => typeof t === "string" ? { text: t } : t), title: it.title, excerpt: it.excerpt, citations: it.citations } as any]);
          }
        }
      );
    },
    retry: 0,
  });

  const [error, setError] = useState<string>("");
  const [items, setItems] = useState<ResultItem[]>([]);
  const [runId, setRunId] = useState<string>("");

  const [signupOpen, setSignupOpen] = useState(false);

  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);

  const online = useOnline();
  const nowMs = Date.now();
  const inCooldown = cooldownUntil > nowMs;
  const cooldownLeftSec = Math.max(0, Math.ceil((cooldownUntil - nowMs) / 1000));
  const canGenerate = !inCooldown && online;

  // Thread/Article URL preview (debounced)
  useEffect(() => {
    if (inputMode !== "source") return;
    if (!sourceUrl.trim()) {
      setSourcePrev(null);
      return;
    }
    const h = window.setTimeout(async () => {
      try {
        const api = await import("@/lib/api");
        const prev = await api.sourcePreview(baseUrl, sourceUrl.trim(), token, authToken);
        setSourcePrev(prev);
      } catch {
        setSourcePrev(null);
      }
    }, 450);
    return () => window.clearTimeout(h);
  }, [inputMode, sourceUrl, baseUrl, token, authToken]);


  // Restore persisted UI state
  useEffect(() => {
    const savedTheme = (lsGet(LS.theme, "neon") as ThemeId) || "neon";
    const savedToken = lsGet(LS.token, "");
    const savedAuth = lsGet(LS.auth, "");
    const savedUser = lsGetJson<UserProfile | null>(LS.user, null);
    const savedRuns = lsGetJson<RunRecord[]>(LS.runs, []);
    const savedClipboard = lsGetJson<ClipboardRecord[]>(LS.clipboard, []);
    const lastRun = lsGet(LS.lastRun, "");
    const dismissDiff = lsGet(LS.dismissSessionDiff, "");
    const draft = lsGet(LS.draft, "");
    const dismissedDiff = lsGet(LS.dismissSessionDiff, "");

    setTheme(savedTheme);
    setToken(savedToken);
    setAuthToken(savedAuth);
    setUser(savedUser);
    setRuns(savedRuns);
    setClipboard(savedClipboard);
    setDismissDiffId(dismissDiff);
    setDismissDiffId(dismissedDiff);


// Load prefs + IDB data (runs/clipboard/queued)
(async () => {
  const p = await loadPrefs();
  setPrefs(p);
  // Only apply defaults if there isn't an existing draft.
  if (!draft && !lastRun) {
    setLangEn(p.defaultLangEn);
    setLangNative(p.defaultLangNative);
    setNativeLang(p.defaultNativeLang);
    // @ts-ignore
    setTone(p.defaultTone);
    // @ts-ignore
    setIntent(p.defaultIntent);
    setIncludeAlternates(p.defaultIncludeAlternates);
  }

  const idbRuns = await idbGet<RunRecord[]>("ct:runs", []);
  const idbClip = await idbGet<ClipboardRecord[]>("ct:clipboard", []);
  if (idbRuns?.length) setRuns(idbRuns);
  if (idbClip?.length) setClipboard(idbClip);
})().catch(() => {});

    // Draft takes precedence over lastRun snapshot (draft is "live" autosave)
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (typeof parsed?.raw === "string") setRaw(parsed.raw);
        if (Array.isArray(parsed?.selectedUrls)) setSelectedUrls(parsed.selectedUrls);
        if (typeof parsed?.langEn === "boolean") setLangEn(parsed.langEn);
        if (typeof parsed?.langNative === "boolean") setLangNative(parsed.langNative);
        if (typeof parsed?.nativeLang === "string") setNativeLang(parsed.nativeLang);
        if (typeof parsed?.tone === "string") setTone(parsed.tone);
        if (typeof parsed?.intent === "string") setIntent(parsed.intent);
        if (typeof parsed?.includeAlternates === "boolean") setIncludeAlternates(parsed.includeAlternates);
      } catch {}
      return;
    }

    if (lastRun) {
      try {
        const parsed = JSON.parse(lastRun);
        if (typeof parsed?.raw === "string") setRaw(parsed.raw);
        if (typeof parsed?.langEn === "boolean") setLangEn(parsed.langEn);
        if (typeof parsed?.langNative === "boolean") setLangNative(parsed.langNative);
        if (typeof parsed?.nativeLang === "string") setNativeLang(parsed.nativeLang);
        if (typeof parsed?.tone === "string") setTone(parsed.tone);
        if (typeof parsed?.intent === "string") setIntent(parsed.intent);
        if (typeof parsed?.includeAlternates === "boolean") setIncludeAlternates(parsed.includeAlternates);
      } catch {}
    }
  }, []);


// Import shared run via URL hash (#share=...)
useEffect(() => {
  try {
    const h = String(window.location.hash || "");
    const m = h.match(/share=([^&]+)/);
    if (!m) return;
    const payload = decodeSharePayload(m[1]);
    if (!payload) return;
    if (payload?.raw && typeof payload.raw === "string") setRaw(payload.raw);
    if (Array.isArray(payload?.selectedUrls)) setSelectedUrls(payload.selectedUrls);
    if (payload?.run && payload.run?.results) {
      setItems(payload.run.results);
      setRunId(payload.run.id || "");
    }
    toast.success("Imported shared run");
    // Clean hash
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  } catch {}
}, []);

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    lsSet(LS.theme, theme);
    broadcast({ type: "theme", value: theme, at: Date.now() });
  }, [theme]);

  useEffect(() => {
    try {
      if (!token) {
        localStorage.removeItem(LS.token);
        return;
      }
    } catch {}
    lsSet(LS.token, token);
  }, [token]);

  useEffect(() => {
    try {
      if (!authToken) {
        localStorage.removeItem(LS.auth);
        return;
      }
    } catch {}
    lsSet(LS.auth, authToken);
  }, [authToken]);

  useEffect(() => {
    try {
      if (!user) {
        localStorage.removeItem(LS.user);
        return;
      }
    } catch {}
    lsSetJson(LS.user, user);
  }, [user]);

  useEffect(() => {
    // Apply retention (prefs-based)
    const limit = prefs?.historyRetention ?? 20;
    const trimmed = runs.slice(0, limit);
    if (trimmed.length !== runs.length) setRuns(trimmed);
    lsSetJson(LS.runs, trimmed);
    idbSet("ct:runs", trimmed).catch(() => {});
    broadcast({ type: "runs", value: trimmed, at: Date.now() });
  }, [runs, prefs]);

  useEffect(() => {
    const trimmed = clipboard.slice(0, 60);
    if (trimmed.length !== clipboard.length) setClipboard(trimmed);
    lsSetJson(LS.clipboard, trimmed);
    idbSet("ct:clipboard", trimmed).catch(() => {});
    broadcast({ type: "clipboard", value: trimmed, at: Date.now() });
  }, [clipboard]);

  useEffect(() => {
    const snapshot = {
      raw,
      selectedUrls,
      langEn,
      langNative,
      nativeLang,
      tone,
      intent,
      includeAlternates,
    };
    // "draft" is a live autosave; "lastRun" is kept for backward compatibility
    const snapStr = JSON.stringify(snapshot);
    lsSet(LS.draft, snapStr);
    lsSet(LS.lastRun, snapStr);
    broadcast({ type: "draft", value: snapStr, at: Date.now() });
  }, [raw, selectedUrls, langEn, langNative, nativeLang, tone, intent, includeAlternates]);


// Cross-tab sync (draft/runs/clipboard/theme)
useEffect(() => {
  let lastAt = 0;
  return onBroadcast((msg) => {
    if (!msg || typeof (msg as any).type !== "string") return;
    if ((msg as any).at && (msg as any).at < lastAt) return;
    lastAt = (msg as any).at || Date.now();
    if (msg.type === "draft" && typeof msg.value === "string") {
      // Don't clobber if user is actively typing (soft check)
      try {
        const active = document.activeElement as HTMLElement | null;
        const isTyping = !!active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT");
        if (isTyping) return;
      } catch {}
      try {
        const parsed = JSON.parse(msg.value);
        if (typeof parsed?.raw === "string") setRaw(parsed.raw);
        if (Array.isArray(parsed?.selectedUrls)) setSelectedUrls(parsed.selectedUrls);
      } catch {}
    }
    if (msg.type === "runs" && Array.isArray(msg.value)) setRuns(msg.value as any);
    if (msg.type === "clipboard" && Array.isArray(msg.value)) setClipboard(msg.value as any);
    if (msg.type === "theme" && typeof msg.value === "string") setTheme(msg.value as any);
  });
}, []);

  // Keep selection consistent as the user edits the input.
  useEffect(() => {
    setSelectedUrls((prev) => {
      const setPrev = new Set(prev);
      const next: string[] = [];
      // keep existing selected that still exist
      for (const u of urls) if (setPrev.has(u)) next.push(u);
      // auto-select new URLs
      for (const u of urls) if (!setPrev.has(u)) next.push(u);
      return next;
    });
  }, [urls]);

  function clearTimers() {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }


function addTimelineEvent(url: string, stage: TimelineStage, note?: string) {
  setItems((prev) =>
    prev.map((it) => {
      if (it.url !== url && (it as any).input_url !== url) return it;
      const ev = { at: Date.now(), stage, note };
      const next = { ...it, timeline: [...(it.timeline || []), ev] };
      return next;
    })
  );
}

function addTimelineMany(urls: string[], stage: TimelineStage, note?: string) {
  if (!urls.length) return;
  const setU = new Set(urls);
  setItems((prev) =>
    prev.map((it) => {
      const iu = (it as any).input_url;
      if (!setU.has(it.url) && (!iu || !setU.has(iu))) return it;
      const ev = { at: Date.now(), stage, note };
      return { ...it, timeline: [...(it.timeline || []), ev] };
    })
  );
}

  function startPipeline() {
    clearTimers();
    setStage("fetching");

    // Soft, approximate stage progression for multi-URL runs.
    // Timers are always cleared on completion / cancel / error via clearTimers().
    const isLowFx = prefersReducedEffects();
    const [t1, t2, t3] = isLowFx ? [700, 2100, 3600] : [1400, 3400, 6200];

    timers.current.push(
      window.setTimeout(() => setStage("generating"), t1),
      window.setTimeout(() => setStage("polishing"), t2),
      window.setTimeout(() => setStage("finalizing"), t3)
    );
  }

  function ensureAuth() {
    if (!user || !token || !authToken) {
      setSignupOpen(true);
      return false;
    }
    return true;
  }


async function queueRunOffline(requestUrls: string[]) {
  const snapshot = {
    id: nowId("q"),
    at: Date.now(),
    request: {
      urls: requestUrls,
      langEn,
      langNative,
      nativeLang,
      tone,
      intent,
      includeAlternates,
    },
  };
  const existing = await idbGet<any[]>("ct:queuedRuns", []);
  const next = [snapshot, ...existing].slice(0, 10);
  await idbSet("ct:queuedRuns", next);
  lsSetJson(LS.queuedRuns, next as any);
  toast("Offline — queued this run. It will resume when you're online.");
}

  async function generateOneBatch(requestUrls: string[], opts: { append: boolean }) {
    // If a previous request is still in-flight, abort it first.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const resp: GenerateResponse = await genMutation.mutateAsync({ requestUrls, signal: controller.signal });

    const results = resp.results || [];
    const rid = resp.meta?.run_id || nowId("run");
    // Keep the runId stable across batches.
    setRunId((prev) => prev || rid);

    // Robust merge (dedupes by input_url / tweet_id and preserves the requested order).
    setItems((prev) => mergeIncomingResults(prev, results as any));
    return { results, rid };
  }

  async function runQueue(allUrls: string[]) {
    if (!ensureAuth()) return;

    if (!online) {
      await queueRunOffline(allUrls);
      return;
    }

    queueCancelRef.current = false;
    runStartedAtRef.current = Date.now();
    logMetric("run_started", { url_count: allUrls.length });
    setError("");
    setLoading(true);
    setStage("fetching");
    setQueueTotal(allUrls.length);
    setQueueDone(0);
    setRunTotal(allUrls.length);
    setRunDone(0);
    setRunOk(0);
    setRunCancelled(false);
    activeRunOrderRef.current = allUrls;
    // Optimistic placeholders (skeleton cards) so the UI feels instant.
    setItems(
      allUrls.map((url) => ({
        url,
        input_url: url,
        status: "pending" as const,
        comments: [],
        reason: "Generating…",
        in_last_run: true,
        timeline: [{ at: Date.now(), stage: "queued" as const }],
      })) as any,
    );
    setRunId("");

    const BATCH_SIZE = 6;
    const batches: string[][] = [];
    for (let i = 0; i < allUrls.length; i += BATCH_SIZE) {
      batches.push(allUrls.slice(i, i + BATCH_SIZE));
    }
    if (batches.length > 1) {
      toast(`Queued ${batches.length} batches (${allUrls.length} URLs)`);
    }

    let combined: ResultItem[] = allUrls.map((url) => ({
      url,
      input_url: url,
      status: "pending" as const,
      comments: [],
      reason: "Generating…",
      in_last_run: true,
    })) as any;
    let lastRid = "";
    let runIdLocal = "";
    let doneSoFar = 0;
    let completedOk = false;

    try {
      for (let bi = 0; bi < batches.length; bi++) {
        if (queueCancelRef.current) throw Object.assign(new Error("Queue canceled"), { name: "AbortError" });
        const batch = batches[bi];
        toast(`Generating batch ${bi + 1}/${batches.length}…`);
        advanceStage("generating");
        addTimelineMany(batch, "sending");

        const { results, rid } = await generateOneBatch(batch, { append: true });
        lastRid = rid;
        if (!runIdLocal && rid) runIdLocal = rid;
        combined = mergeIncomingResults(combined, results as any);
        doneSoFar = Math.min(allUrls.length, doneSoFar + batch.length);
        const stageGuess = stageFromProgress(doneSoFar, allUrls.length);
        advanceStage(stageGuess);
        startTransition(() => setQueueDone(doneSoFar));
        // Mark received/failed
        for (const r of results as any[]) addTimelineEvent((r as any).input_url || r.url, r.status === "ok" ? "received" : "failed");
      }

      // Persist to run history
      const okCount = combined.filter((i) => i.status === "ok").length;
      const failedCount = combined.filter((i) => i.status === "error").length;
      
// Ensure run summary reflects the final state, even if the backend
// did not emit a `done` event (e.g., non-streaming fallback).
setRunTotal(allUrls.length);
setRunDone(allUrls.length);
setRunOk(okCount);
setRunCancelled(false);

const request: RunRequestSnapshot = {
        mode: "urls",
        urls: allUrls,
        langEn,
        langNative,
        nativeLang,
        tone,
        intent,
        includeAlternates,
      };
      const record: RunRecord = {
        id: runIdLocal || lastRid || nowId("run"),
        mode: "urls",
        at: Date.now(),
        request,
        results: combined,
        okCount,
        failedCount,
      };

      // Persist run immediately so it survives refresh and participates in Resume banner.
      setRuns((prev) => {
        const limit = prefs?.historyRetention ?? 20;
        const next = [record, ...prev.filter((r) => r.id !== record.id)].slice(0, limit);
        return next;
      });
      lsSet(LS.lastRunResult, record.id);
      lsSet(LS.dismissResume, "");

      updateAvgMsPerUrl(Date.now() - (runStartedAtRef.current || Date.now()), allUrls.length);
      completedOk = true;

  const elapsedMs = runStartedAtRef.current ? Date.now() - runStartedAtRef.current : undefined;
        logMetric("run_completed", { url_count: allUrls.length, ok_count: okCount, failed_count: failedCount, duration_ms: elapsedMs });
      setStage("done");
      toast.success(`Generation finished (${okCount} ok${failedCount ? `, ${failedCount} failed` : ""})`);

      // Confetti (subtle) — respects reduced-motion / reduced-data
      if (okCount > 0 && !shouldReduceEffects(lsGet(LS.fxMode, "auto") as any)) {
        try {
          confetti({ particleCount: 70, spread: 65, startVelocity: 18, origin: { y: 0.35 } });
        } catch {}
      }

      // Auto-scroll to results (mobile only, and only if results are off-screen).
      window.requestAnimationFrame(() => {
        const el = document.getElementById("ct-results");
        if (!el) return;

        const active = document.activeElement as HTMLElement | null;
        // Don't scroll if the user is typing in any input/textarea (including the URL box).
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;
        const inputRoot = document.getElementById("ct-url-input");
        if (active && inputRoot && inputRoot.contains(active)) return;

        // On larger screens keep the controls in view; avoid surprising jumps.
        if (window.innerWidth >= 768) return;

        const rect = el.getBoundingClientRect();
        const viewportH = window.innerHeight || 0;
        // Only nudge the view if the results panel is mostly below the fold.
        if (rect.top > viewportH * 0.75) {
          el.scrollIntoView({
            behavior: prefersReducedMotion() ? "auto" : "smooth",
            block: "start",
          });
        }
      });
    } catch (e: any) {
      if (e?.name === "AbortError") {
        logMetric("run_cancelled", { reason: "abort_error" });
        if (!suppressAbortRef.current) setError("Generation cancelled.");
        suppressAbortRef.current = false;
        setStage("idle");
        return;
      }

      const msg = e?.message || "Unknown error";
      setError(msg);
      setStage("idle");

// Circuit breaker: if we keep failing, cool down briefly to avoid a bad loop.
setFailStreak((prev) => {
  const next = prev + 1;
  if (next >= 3) {
    const until = Date.now() + 30_000;
    setCooldownUntil((cur) => (cur > until ? cur : until));
    try { toast.error("Backend busy. Cooling down for 30s."); } catch {}
    return 0;
  }
  return next;
});


      const status: number | undefined = e && typeof e.status === "number" ? (e.status as number) : undefined;
      const code = e?.body?.code;

      // Run lock conflicts: surface a clear, non-fatal message.
      if (status === 409 || code === "run_conflict") {
        try {
          toast.error("A run is already active. Cancel it first.");
        } catch {}
        return;
      }

      if (
        status === 401 ||
        code === "missing_auth" ||
        code === "bad_auth" ||
        code === "expired_auth" ||
        code === "revoked_auth" ||
        code === "inactive_user"
      ) {
        setAuthToken("");
        setSignupOpen(true);
      }
      if (status === 403 || code === "missing_access" || code === "forbidden") {
        setSignupOpen(true);
      }

      if (status === 429) {
        const retryAfter = Number(e?.body?.retry_after || e?.body?.retryAfter || 30);
        const until = Date.now() + Math.max(5, retryAfter) * 1000;
        setCooldownUntil(until);
        toast.error(`Rate limited. Cooling down for ${Math.max(5, retryAfter)}s`);
      }
    } finally {
      abortRef.current = null;
      clearTimers();
      // If a run fails or is cancelled mid-way, mark any remaining pending
      // cards as errors so the shimmer skeleton disappears and the user can retry.
      if (!completedOk) {
        setItems((prev) =>
          prev.map((it) =>
            it.status === "pending" && (!it.comments || it.comments.length === 0)
              ? {
                  ...it,
                  status: "error",
                  reason: queueCancelRef.current ? "Cancelled." : "No comment generated (run did not complete).",
                }
              : it,
          ),
        );
      }
      setLoading(false);
      window.setTimeout(() => setStage("idle"), 1600);
    }
  }

  function cancelRun() {
    logMetric("run_cancelled", { reason: "user_cancel" });
    suppressAbortRef.current = false;
    queueCancelRef.current = true;
    try { toast("Canceled"); } catch {}
    clearTimers();
    setStage("idle");
    // Abort the local fetch stream.
    abortRef.current?.abort();
    // Best-effort server-side cancellation so the backend stops work early.
    try {
      cancelActiveRun(baseUrl, runId || null, token, authToken);
    } catch {
      // Ignore cancellation errors; this is best-effort.
    }
    setQueueTotal(0);
    setQueueDone(0);
  }

  function clearAll() {
    // In case something is still running, stop it.
    try { toast("Cleared"); } catch {}
    suppressAbortRef.current = true;
    queueCancelRef.current = true;
    abortRef.current?.abort();
    setRaw("");
    setItems([]);
    setRunId("");
    setError("");
    setStage("idle");
    setQueueTotal(0);
    setQueueDone(0);
    setRunTotal(0);
    setRunDone(0);
    setRunOk(0);
    setRunCancelled(false);
  }

  async function onGenerate() {
    // Rate limit cooldown
    if (cooldownUntil && Date.now() < cooldownUntil) {
      const s = Math.ceil((cooldownUntil - Date.now()) / 1000);
      toast.error(`Rate-limited. Try again in ${s}s.`);
      return;
    }

    if (inputMode === "source") {
      if (!ensureAuth()) return;
      const u = sourceUrl.trim();
      if (!u) {
        setError("Paste a thread/article URL.");
        toast.error("Please paste a thread/article URL");
        return;
      }
      // Cancel any existing run
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setStage("generating");
      setError("");
      try {
        const resp = await genFromUrlMutation.mutateAsync({ source_url: u, signal: ac.signal });
        setItems([resp.item as any]);
        const rid = nowId("run");
        setRunId(rid);

        // Persist as a run (source mode) so it appears in History + syncs to IndexedDB.
        const request: RunRequestSnapshot = {
          mode: "source",
          sourceUrl: u,
          urls: [u],
          langEn,
          langNative,
          nativeLang,
          tone,
          intent,
          includeAlternates,
        };
        const record: RunRecord = {
          id: rid,
          mode: "source",
          at: Date.now(),
          request,
          results: [resp.item as any],
          okCount: 1,
          failedCount: 0,
        };

        // Persist run so it appears in History and can be resumed later.
        setRuns((prev) => {
          const limit = prefs?.historyRetention ?? 20;
          const next = [record, ...prev].slice(0, limit);
          return next;
        });
        lsSet(LS.lastRunResult, rid);
        lsSet(LS.dismissResume, "");

      } catch (e: any) {
        if (e?.name === "AbortError") {
          setError("Generation cancelled.");
          setStage("idle");
          try { toast("Canceled"); } catch {}
          return;
        }

        const msg = e instanceof ApiError ? e.message : (e?.message || "Failed to generate from URL");
        setError(msg);
        try { toast.error(msg); } catch {}

        const status: number | undefined = e && typeof (e as any).status === "number" ? ((e as any).status as number) : undefined;
        const code = (e as any)?.body?.code;

        if (
          status === 401 ||
          code === "missing_auth" ||
          code === "bad_auth" ||
          code === "expired_auth" ||
          code === "revoked_auth" ||
          code === "inactive_user"
        ) {
          setAuthToken("");
          setSignupOpen(true);
        }
        if (status === 403 || code === "missing_access" || code === "forbidden") {
          setSignupOpen(true);
        }

        if (status === 429) {
          const retryAfter = Number((e as any)?.body?.retry_after || (e as any)?.body?.retryAfter || 30);
          const until = Date.now() + Math.max(5, retryAfter) * 1000;
          setCooldownUntil(until);
          try { toast.error(`Rate limited. Cooling down for ${Math.max(5, retryAfter)}s`); } catch {}
        }
      } finally {
        setLoading(false);
        setStage("idle");
      }
      return;
    }

    const validSelected = selectedUrls.filter((u) => urls.includes(u));
    const requestUrls = validSelected.length ? validSelected : urls;
    if (!requestUrls.length) {
      setError("Paste at least 1 valid X status URL.");
      try { toast.error("Please paste at least one valid X post URL"); } catch {}
      return;
    }
    if (selectedUrls.length && !validSelected.length) {
      toast.error("Your selection contains no valid post URLs");
      return;
    }
    await runQueue(requestUrls);
  }

  async function rerollUrl(url: string) {
    logMetric("reroll_clicked", { url_present: Boolean(url) });
    addTimelineEvent(url, "rerolled");
    await runQueue([url]);
  }

  const failedUrls = useMemo(() => {
    const out: string[] = [];
    for (const it of items) {
      // Only count true failures ("pending" is not a failure).
      if (it.status === "error") out.push(((it as any).input_url || it.url) as string);
    }
    return out;
  }, [items]);

  async function retryFailedOnly() {
    if (!failedUrls.length) return;
    await runQueue(failedUrls);
  }

  // Resume banner selection
  useEffect(() => {
    const lastId = lsGet(LS.lastRunResult, "");
    const dismissed = lsGet(LS.dismissResume, "");
    if (!lastId) {
      setResumeCandidate(null);
      return;
    }
    if (dismissed && dismissed === lastId) {
      setResumeCandidate(null);
      return;
    }
    const found = runs.find((r) => r.id === lastId) || null;
    setResumeCandidate(found);
  }, [runs]);

  const latestRun = runs[0] || null;
  const showSessionDiff = useMemo(() => {
    if (!latestRun) return false;
    if (dismissDiffId && dismissDiffId === latestRun.id) return false;
    const cur = new Set(urls);
    const prev = new Set(latestRun.request.urls || []);
    // Show only when there is an actual diff.
    for (const u of urls) if (!prev.has(u)) return true;
    for (const u of latestRun.request.urls) if (!cur.has(u)) return true;
    return false;
  }, [latestRun, dismissDiffId, urls]);

  function resumeLastRun() {
    if (!resumeCandidate) return;
    const r = resumeCandidate;
    setRaw(r.request.urls.join("\n"));
    setSelectedUrls(r.request.urls);
    setLangEn(r.request.langEn);
    setLangNative(r.request.langNative);
    setNativeLang(r.request.nativeLang);
    setTone(r.request.tone);
    setIntent(r.request.intent);
    setIncludeAlternates(r.request.includeAlternates);
    setItems(r.results);
    setRunId(r.id);
    setError("");
    setResumeCandidate(null);
    lsSet(LS.dismissResume, r.id);
  }

  function dismissResume() {
    if (!resumeCandidate) return;
    lsSet(LS.dismissResume, resumeCandidate.id);
    setResumeCandidate(null);
  }

  function onCopied(text: string, url?: string) {
    logMetric("variant_copied", { has_url: Boolean(url) });
    if (url) addTimelineEvent(url, "copied");
    const rec: ClipboardRecord = {
      id: nowId("clip"),
      at: Date.now(),
      url,
      text,
    };
    setClipboard((prev) => [rec, ...prev].slice(0, 30));
  }

  function logout() {
    // Best-effort server logout (revokes the session token)
    if (token && authToken) {
      apiLogout(baseUrl, token, authToken).catch(() => {});
    }

    try {
      localStorage.removeItem(LS.user);
      localStorage.removeItem(LS.token);
      localStorage.removeItem(LS.auth);
    } catch {}

    setUser(null);
    setToken("");
    setAuthToken("");
  }


  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (!loading) {
          onGenerate();
        }
      } else if (e.key === "Escape") {
        if (loading) {
          e.preventDefault();
          cancelRun();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [loading, onGenerate, cancelRun]);


  function saveCurrentAsPreset() {
    if (typeof window === "undefined") return;
    const name = window.prompt("Preset name?");
    if (!name) return;
    const preset: SessionPreset = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      createdAt: Date.now(),
      config: {
        langEn,
        langNative,
        nativeLang,
        tone,
        intent,
        qualityMode,
        includeAlternates,
        fastMode,
        voice,
      },
    };
    setSessionPresets((prev) => {
      const next = [preset, ...prev].slice(0, 20);
      saveSessionPresets(next);
      return next;
    });
  }

  function applySessionPreset(id: string) {
    const p = sessionPresets.find((sp) => sp.id === id);
    if (!p) return;
    const { config } = p;
    setLangEn(config.langEn);
    setLangNative(config.langNative);
    setNativeLang(config.nativeLang);
    setTone(config.tone as any);
    setIntent(config.intent as any);
    setQualityMode(config.qualityMode);
    setIncludeAlternates(config.includeAlternates);
    setFastMode(config.fastMode);
    setVoice(config.voice);
  }

  return (
    <div className="min-h-screen pb-28">
      <WelcomePopup />
      <OnboardingTour />
      <TopBar theme={theme} setTheme={setTheme} baseUrl={baseUrl} user={user} onLogout={logout} />
      <PerfPanel />
      <RunTimingsPanelLazy items={items} />
      {showRenderProfiler ? <RenderProfilerPanelLazy /> : null}

      <SignupGate
        open={signupOpen}
        baseUrl={baseUrl}
        onClose={() => setSignupOpen(false)}
        onAuthed={(profile, accessToken, sessionToken) => {
          setUser(profile);
          setToken(accessToken);
          setAuthToken(sessionToken);
        }}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {showSessionDiff && latestRun ? (
          <SessionDiffBanner
            currentUrls={urls}
            lastRunUrls={latestRun.request.urls}
            onDismiss={() => {
              lsSet(LS.dismissSessionDiff, latestRun.id);
              setDismissDiffId(latestRun.id);
            }}
          />
        ) : null}

        {resumeCandidate && !items.length ? (
          <ResumeBanner record={resumeCandidate} onResume={resumeLastRun} onDismiss={dismissResume} />
        ) : null}

        <motion.div
          className="grid gap-6 lg:grid-cols-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceFx ? { duration: 0 } : { duration: 0.35 }}
        >
          <div className="space-y-4">
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as any)}>
              <TabsList className="w-full">
                <TabsTrigger value="urls" className="flex-1">X URLs</TabsTrigger>
                <TabsTrigger value="source" className="flex-1">Thread + Article</TabsTrigger>
              </TabsList>
            </Tabs>

            {inputMode === "urls" ? (
              <UrlInput
                value={raw}
                onChange={setRaw}
                onUndo={rawStack.undo}
                onRedo={rawStack.redo}
                canUndo={rawStack.canUndo}
                canRedo={rawStack.canRedo}
                selected={selectedUrls}
                onSelectedChange={setSelectedUrls}
                helper={`${urls.length} valid URL${urls.length === 1 ? "" : "s"} detected`}
                onSort={() => setRaw(sortUrlsInRaw(raw))}
                onCleanInvalid={() => setRaw(cleanInvalidInRaw(raw))}
                onShuffle={() => setRaw(shuffleUrlsInRaw(raw))}
                      onLoadDemo={loadDemoRun}
/>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Reply from a link</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="block text-sm text-ct-muted">Paste an X thread URL or any article URL</label>
                  <input
                    id="ct-url-input"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://x.com/... or https://example.com/article"
                    className="w-full rounded-[var(--ct-radius)] border border-ct-border bg-ct-bg/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                  />
                  {sourcePrev ? (
                    <div className="rounded-[var(--ct-radius)] border border-ct-border bg-ct-panel/50 p-3">
                      <div className="text-sm font-semibold">{sourcePrev.title}</div>
                      <div className="mt-1 text-xs text-ct-muted line-clamp-4">{sourcePrev.excerpt}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-ct-muted">We’ll preview the page once you paste a valid URL.</div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <div className="block">
              <div className="lg:hidden mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold opacity-80">{translate("controls.title", uiLang)}</div>
                <button type="button" className="ct-btn ct-btn-xs" onClick={() => setMobileControlsOpen(true)}>
                  {translate("controls.openSheet", uiLang)}
                </button>
              </div>
              <Controls
              langEn={langEn}
              setLangEn={setLangEn}
              langNative={langNative}
              setLangNative={setLangNative}
              nativeLang={nativeLang}
              setNativeLang={setNativeLang}
              tone={tone}
              setTone={setTone}
              intent={intent}
              setIntent={setIntent}
              includeAlternates={includeAlternates}
              setIncludeAlternates={setIncludeAlternates}
              fastMode={fastMode}
              setFastMode={setFastMode}
              qualityMode={qualityMode}
              setQualityMode={setQualityMode}
              sessionPresets={sessionPresets}
              onSavePreset={saveCurrentAsPreset}
              onApplyPreset={applySessionPreset}
              preset={preset}
              setPreset={setPreset}
              voice={voice}
              setVoice={setVoice}
              baseUrl={baseUrl}
              onGenerate={onGenerate}
              onCancel={cancelRun}
              onClear={clearAll}
              loading={loading}
              clearDisabled={!raw.trim() && !items.length && !error}
            />

            <ProgressStepper stage={stage} />
          </div>
          </div>
        </motion.div>

        <Results
          items={items}
          isDemoRun={isDemoRun}
          runId={runId}
          onRerollUrl={rerollUrl}
          onRetryUrl={(u) => runQueue([u])}
          onRetryFailed={retryFailedOnly}
          failedCount={failedUrls.length}
          onClear={() => {
            setItems([]);
            setRunId("");
            setError("");
          }}
          onCopy={onCopied}
          onUpdateCommentMeta={updateCommentMeta}
          loading={loading}
          queueTotal={queueTotal}
          queueDone={queueDone}
          runTotal={runTotal}
          runDone={runDone}
          runOk={runOk}
          runCancelled={runCancelled}
          qualityMode={qualityMode}
          langEn={langEn}
          langNative={langNative}
          nativeLang={nativeLang}
        />

        
{error ? (
          <div className="rounded-[var(--ct-radius)] border border-red-500/30 bg-red-500/10 p-4 text-sm space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">Something went wrong</div>
                <div className="mt-1 opacity-90">{error}</div>
              </div>
              {inCooldown ? (
                <span className="ct-chip text-[11px] border border-yellow-400/30 bg-yellow-400/10 text-yellow-100">
                  Cooldown {cooldownLeftSec}s
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" className="ct-btn ct-btn-xs" onClick={() => { setFastMode(true); toast("Enabled Fast mode"); }}>
                Try Fast mode
              </button>
              <button type="button" className="ct-btn ct-btn-xs" onClick={() => { setIncludeAlternates(false); toast("Disabled alternates"); }}>
                Disable alternates
              </button>
              <button
                type="button"
                className="ct-btn ct-btn-xs"
                onClick={() => {
                  setPreset("auto");
                  setVoice(1);
                  setTone("auto");
                  setIntent("auto");
                  toast("Reset controls");
                }}
              >
                Reset
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <div id="ct-history" className="scroll-mt-24">
            <RunHistoryPanelLazy
            runs={runs}
            onLoad={(id) => {
              const r = runs.find((x) => x.id === id);
              if (!r) return;
              setRaw(r.request.urls.join("\n"));
              setSelectedUrls(r.request.urls);
              setLangEn(r.request.langEn);
              setLangNative(r.request.langNative);
              setNativeLang(r.request.nativeLang);
              setTone(r.request.tone);
              setIntent(r.request.intent);
              setIncludeAlternates(r.request.includeAlternates);
              setItems(r.results);
              setRunId(r.id);
              setError("");
              if (typeof window !== "undefined") {
                window.scrollTo({
                  top: 0,
                  behavior: prefersReducedMotion() ? "auto" : "smooth",
                });
              }
            }}
            onRemove={(id) => setRuns((prev) => prev.filter((r) => r.id !== id))}
            onShare={prefs?.enableShareLinks ? (id) => {
              const r = runs.find((x) => x.id === id);
              if (!r) return;
              const payload = { raw: r.request.urls.join("\n"), selectedUrls: r.request.urls, run: r };
              const url = makeShareUrl(payload);
              navigator.clipboard.writeText(url).then(() => toast.success("Share link copied")).catch(() => toast.error("Couldn't copy"));
            } : undefined}
            onClear={() => setRuns([])}
            onExport={async () => {
              try {
                const api = await import("@/lib/api");
                const blob = await api.exportHistory(baseUrl, "json", token, authToken, 2000);
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "crowntalk-history.json";
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                toast.success("History exported");
              } catch (e: any) {
                toast.error(e?.message || "Export failed");
              }
            }}
          />

          </div>
          <ClipboardHistoryPanelLazy
            items={clipboard}
            onClear={() => setClipboard([])}
            onTogglePin={(id) =>
              setClipboard((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)))
            }
          />
        </div>
      </main>

      <Footer />

      {/* Mobile UX: bottom action bar + sheets (previously not wired, so buttons appeared to do nothing). */}
      <MobileControlsSheet
        open={mobileControlsOpen}
        onOpenChange={setMobileControlsOpen}
        langEn={langEn}
        setLangEn={setLangEn}
        langNative={langNative}
        setLangNative={setLangNative}
        nativeLang={nativeLang}
        setNativeLang={setNativeLang}
        tone={tone}
        setTone={setTone}
        intent={intent}
        setIntent={setIntent}
        includeAlternates={includeAlternates}
        setIncludeAlternates={setIncludeAlternates}
        fastMode={fastMode}
        setFastMode={setFastMode}
        qualityMode={qualityMode}
        setQualityMode={setQualityMode}
        preset={preset}
        setPreset={setPreset}
        voice={voice}
        setVoice={setVoice}
        baseUrl={baseUrl}
        onGenerate={onGenerate}
        onCancel={cancelRun}
        onClear={clearAll}
        loading={loading}
        clearDisabled={(!raw.trim() && !items.length && !error) || loading}
      />

      <MobilePresetsSheet
        open={mobilePresetsOpen}
        onOpenChange={setMobilePresetsOpen}
        preset={preset}
        setPreset={setPreset}
        voice={voice}
        setVoice={setVoice}
      />

      <MobileActionBar
        loading={loading}
        canGenerate={
          canGenerate &&
          (inputMode === "urls"
            ? (selectedUrls.length ? selectedUrls.length > 0 : urls.length > 0)
            : !!sourceUrl.trim())
        }
        onGenerate={onGenerate}
        onOpenControls={() => setMobileControlsOpen(true)}
        onOpenPresets={() => setMobilePresetsOpen(true)}
        onOpenHistory={() => {
          const el = document.getElementById("ct-history");
          el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
        }}
      />
    </div>
  );
