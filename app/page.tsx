"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { prefersReducedMotion, shouldReduceEffects, applyFxMode } from "@/lib/motion";
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
import RenderProfilerPanel from "@/components/RenderProfilerPanel";
import type { ThemeId } from "@/components/ThemeStudioBar";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { parseUrls } from "@/lib/validate";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { ApiError, logout as apiLogout } from "@/lib/api";
import type { SourcePreview } from "@/lib/api";
import { LS, lsGet, lsGetJson, lsSet, lsSetJson } from "@/lib/storage";
import type { GenerateResponse, Intent, ResultItem, Tone } from "@/lib/types";
import type { TimelineStage } from "@/lib/types";
import type { ClipboardRecord, RunRecord, RunRequestSnapshot, UserProfile } from "@/lib/persist";
import { nowId } from "@/lib/persist";
import { idbGet, idbSet } from "@/lib/idb";
import { loadPrefs, savePrefs, type UserPrefs } from "@/lib/prefs";
import { useUndoStack } from "@/lib/useUndoStack";
import { useOnline } from "@/lib/useOnline";
import { broadcast, onBroadcast } from "@/lib/syncChannel";
import { decodeSharePayload, makeShareUrl } from "@/lib/share";
import { useRenderCount } from "@/lib/useRenderCount";

const DEFAULT_BACKEND = "https://crowntalk.onrender.com";

const PerfPanel = dynamic(() => import("@/components/PerfPanel"), { ssr: false });
const RunHistoryPanelLazy = dynamic(() => import("@/components/RunHistoryPanel"), { ssr: false });
const ClipboardHistoryPanelLazy = dynamic(() => import("@/components/ClipboardHistoryPanel"), { ssr: false });

export default function Home() {
  useRenderCount("Home");
  const [baseUrl] = useState<string>(() =>
    (process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND).replace(/\/+$/, "")
  );

  const rawStack = useUndoStack("", 80);
  const raw = rawStack.value;
  const setRaw = rawStack.set;
  const debouncedRaw = useDebouncedValue(raw, 180);
  const urls = useMemo(() => parseUrls(debouncedRaw), [debouncedRaw]);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);

  const [inputMode, setInputMode] = useState<"urls" | "source">("urls");
  const [sourceUrl, setSourceUrl] = useState<string>("");
  const [sourcePrev, setSourcePrev] = useState<SourcePreview | null>(null);

  const [langEn, setLangEn] = useState(true);
  const [langNative, setLangNative] = useState(false);
  const [nativeLang, setNativeLang] = useState("bn");

  const [tone, setTone] = useState<Tone>("auto");
  const [intent, setIntent] = useState<Intent>("auto");
  const [includeAlternates, setIncludeAlternates] = useState(false);
  const [fastMode, setFastMode] = useState(false);
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
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [clipboard, setClipboard] = useState<ClipboardRecord[]>([]);
  const [resumeCandidate, setResumeCandidate] = useState<RunRecord | null>(null);
  const [dismissDiffId, setDismissDiffId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [queueTotal, setQueueTotal] = useState(0);
  const [queueDone, setQueueDone] = useState(0);
  const timers = useRef<number[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const suppressAbortRef = useRef(false);
  const queueCancelRef = useRef(false);

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
        include_alternates: includeAlternates,
        fast: fastMode,
        preset: preset !== "auto" ? preset : undefined,
        output_language: langNative ? nativeLang : undefined,
      },
      token,
      authToken,
      vars.signal,
      (u) => {
        if (u.type === "meta" && u.run_id) setRunId(u.run_id);
        if (u.type === "result") {
          startTransition(() => {
            setItems((prev) => {
              const byUrl = new Map(prev.map((p) => [p.url, p]));
              const p = byUrl.get(u.item.url);
              const nextItem = { ...(p || u.item), ...u.item, status: u.item.status || "ok" };
              // versions: keep original before overwrite
              if (p?.status === "ok" && p.comments?.length && u.item.status === "ok" && u.item.comments?.length) {
                const versions = [...(p.versions || [])];
                if (!versions.length) versions.push({ at: Date.now(), label: "original", comments: p.comments });
                versions.push({ at: Date.now(), label: "reroll", comments: u.item.comments || [] });
                (nextItem as any).versions = versions;
              }
              return prev.map((x) => (x.url === u.item.url ? nextItem : x));
            });
          });
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
          output_language: langNative ? nativeLang : undefined,
          fast: fastMode,
          quote_mode: true,
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

  const online = useOnline();
  const nowMs = Date.now();
  const inCooldown = cooldownUntil > nowMs;
  const cooldownLeftSec = Math.max(0, Math.ceil((cooldownUntil - nowMs) / 1000));
  const canGenerate = !inCooldown && online;
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);

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

  // Auto battery-saver / reduced-motion FX mode (can be overridden via LS.fxMode)
  useEffect(() => {
    const mode = (lsGet(LS.fxMode, "auto") as any) || "auto";
    applyFxMode(mode);
  }, []);

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
      if (it.url !== url) return it;
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
      if (!setU.has(it.url)) return it;
      const ev = { at: Date.now(), stage, note };
      return { ...it, timeline: [...(it.timeline || []), ev] };
    })
  );
}

  function startPipeline() {
    clearTimers();
    setStage("fetching");
    timers.current.push(
      window.setTimeout(() => setStage("generating"), 650),
      window.setTimeout(() => setStage("polishing"), 1850),
      window.setTimeout(() => setStage("finalizing"), 2900)
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

    startPipeline();

    const resp: GenerateResponse = await genMutation.mutateAsync({ requestUrls, signal: controller.signal });

    const results = resp.results || [];
    const rid = resp.meta?.run_id || nowId("run");
    setRunId(rid);
    setItems((prev) => {
      const byUrl = new Map(results.map((r) => [r.url, r]));
      // Replace placeholders / older entries in-place to keep list stable.
      const next = prev.map((p) => byUrl.get(p.url) || p);
      // Append any truly new URLs (shouldn't happen, but safe).
      for (const r of results) if (!prev.find((p) => p.url === r.url)) next.push(r);
      return opts.append ? next : results;
    });
    return { results, rid };
  }

  async function runQueue(allUrls: string[]) {
    if (!ensureAuth()) return;

    if (!online) {
      await queueRunOffline(allUrls);
      return;
    }

    queueCancelRef.current = false;
    setError("");
    setLoading(true);
    setStage("fetching");
    setQueueTotal(allUrls.length);
    setQueueDone(0);
    // Optimistic placeholders (skeleton cards) so the UI feels instant.
    setItems(allUrls.map((url) => ({ url, status: "pending" as const, reason: "Generating…", timeline: [{ at: Date.now(), stage: "queued" as const }] })));
    setRunId("");

    const BATCH_SIZE = 6;
    const batches: string[][] = [];
    for (let i = 0; i < allUrls.length; i += BATCH_SIZE) {
      batches.push(allUrls.slice(i, i + BATCH_SIZE));
    }
    if (batches.length > 1) {
      toast(`Queued ${batches.length} batches (${allUrls.length} URLs)`);
    }

    let combined: ResultItem[] = [];
    let lastRid = "";

    try {
      for (let bi = 0; bi < batches.length; bi++) {
        if (queueCancelRef.current) throw Object.assign(new Error("Queue canceled"), { name: "AbortError" });
        const batch = batches[bi];
        toast(`Generating batch ${bi + 1}/${batches.length}…`);
        addTimelineMany(batch, "sending");

        const { results, rid } = await generateOneBatch(batch, { append: true });
        lastRid = rid;
        combined = [...combined, ...results];
        startTransition(() => setQueueDone((prev) => Math.min(allUrls.length, prev + batch.length)));
        // Mark received/failed
        for (const r of results) addTimelineEvent(r.url, r.status === "ok" ? "received" : "failed");
      }

      // Persist to run history
      const okCount = combined.filter((i) => i.status === "ok").length;
      const failedCount = combined.filter((i) => i.status !== "ok").length;
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
        id: lastRid || nowId("run"),
        mode: "urls",
        at: Date.now(),
        request,
        results: combined,
        okCount,
        failedCount,
      };
      setRuns((prev) => [record, ...prev.filter((r) => r.id !== record.id)].slice(0, 20));
      lsSet(LS.lastRunResult, record.id);
      lsSet(LS.dismissResume, "");

      setStage("done");
      toast.success(`Generation finished (${okCount} ok${failedCount ? `, ${failedCount} failed` : ""})`);

      // Confetti (subtle) — respects reduced-motion / reduced-data
      if (okCount > 0 && !shouldReduceEffects(lsGet(LS.fxMode, "auto") as any)) {
        try {
          confetti({ particleCount: 70, spread: 65, startVelocity: 18, origin: { y: 0.35 } });
        } catch {}
      }

      // Auto-scroll to results
      window.requestAnimationFrame(() => {
        const el = document.getElementById("ct-results");
        el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      });
    } catch (e: any) {
      if (e?.name === "AbortError") {
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
      setLoading(false);
      window.setTimeout(() => setStage("idle"), 1600);
    }
  }

  function cancelRun() {
    suppressAbortRef.current = false;
    queueCancelRef.current = true;
    try { toast("Canceled"); } catch {}
    clearTimers();
    setStage("idle");
    abortRef.current?.abort();
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
  }

  async function onGenerate() {
    // Rate limit cooldown
    if (cooldownUntil && Date.now() < cooldownUntil) {
      const s = Math.ceil((cooldownUntil - Date.now()) / 1000);
      toast.error(`Rate-limited. Try again in ${s}s.`);
      return;
    }

    if (inputMode === "source") {
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
        setRuns((prev) => [record, ...prev].slice(0, 120));
        try { lsSetJson(LS.runs, [record, ...(lsGetJson<RunRecord[]>(LS.runs, []) || [])].slice(0, 120)); } catch {}
        try { await idbSet("ct:runs", [record, ...(runs || [])].slice(0, 120)); } catch {}

      } catch (e: any) {
        const msg = e instanceof ApiError ? e.message : "Failed to generate from URL";
        setError(msg);
        try { toast.error(msg); } catch {}
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
    addTimelineEvent(url, "rerolled");
    await runQueue([url]);
  }

  const failedUrls = useMemo(() => {
    const out: string[] = [];
    for (const it of items) {
      // ResultItem doesn't have a boolean `ok`; success is encoded in `status`.
      if (it.status !== "ok") out.push(it.url);
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

  return (
    <div className="min-h-screen pb-28">
      <WelcomePopup />
      <TopBar theme={theme} setTheme={setTheme} baseUrl={baseUrl} user={user} onLogout={logout} />
      <PerfPanel />
      <RenderProfilerPanel />

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
          transition={{ duration: 0.35 }}
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
                selected={selectedUrls}
                onSelectedChange={setSelectedUrls}
                helper={`${urls.length} valid URL${urls.length === 1 ? "" : "s"} detected`}
                onSort={() => setRaw(sortUrlsInRaw(raw))}
                onCleanInvalid={() => setRaw(cleanInvalidInRaw(raw))}
                onShuffle={() => setRaw(shuffleUrlsInRaw(raw))}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Reply from a link</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="block text-sm text-ct-muted">Paste an X thread URL or any article URL</label>
                  <input
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
            <div className="hidden lg:block">
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

            <ProgressStepper stage={loading ? stage : "idle"} />
          </div>
        </motion.div>

        <Results
          items={items}
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
          loading={loading}
          queueTotal={queueTotal}
          queueDone={queueDone}
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
    </div>
  );
}