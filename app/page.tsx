"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { prefersReducedMotion, shouldReduceEffects, applyFxMode } from "@/lib/motion";

import TopBar from "@/components/TopBar";
import WelcomePopup from "@/components/WelcomePopup";
import UrlInput, { cleanInvalidInRaw, shuffleUrlsInRaw, sortUrlsInRaw } from "@/components/UrlInput";
import Controls from "@/components/Controls";
import Results from "@/components/Results";
import SignupGate from "@/components/SignupGate";
import ProgressStepper, { Stage } from "@/components/ProgressStepper";
import ResumeBanner from "@/components/ResumeBanner";
import RunHistoryPanel from "@/components/RunHistoryPanel";
import ClipboardHistoryPanel from "@/components/ClipboardHistoryPanel";
import Footer from "@/components/Footer";
import type { ThemeId } from "@/components/ThemeStudioBar";

import { parseUrls } from "@/lib/validate";
import { ApiError, generateComments, logout as apiLogout } from "@/lib/api";
import { LS, lsGet, lsGetJson, lsSet, lsSetJson } from "@/lib/storage";
import type { GenerateResponse, Intent, ResultItem, Tone } from "@/lib/types";
import type { ClipboardRecord, RunRecord, RunRequestSnapshot, UserProfile } from "@/lib/persist";
import { nowId } from "@/lib/persist";

const DEFAULT_BACKEND = "https://crowntalk.onrender.com";

export default function Home() {
  const [baseUrl] = useState<string>(() =>
    (process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND).replace(/\/+$/, "")
  );

  const [raw, setRaw] = useState<string>("");
  const urls = useMemo(() => parseUrls(raw), [raw]);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);

  const [langEn, setLangEn] = useState(true);
  const [langNative, setLangNative] = useState(false);
  const [nativeLang, setNativeLang] = useState("bn");
  const [tone, setTone] = useState<Tone>("auto");
  const [intent, setIntent] = useState<Intent>("auto");
  const [includeAlternates, setIncludeAlternates] = useState(false);

  const [token, setToken] = useState<string>("");
  const [authToken, setAuthToken] = useState<string>("");
  const [theme, setTheme] = useState<ThemeId>("neon");

  const [user, setUser] = useState<UserProfile | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [clipboard, setClipboard] = useState<ClipboardRecord[]>([]);
  const [resumeCandidate, setResumeCandidate] = useState<RunRecord | null>(null);

  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [queueTotal, setQueueTotal] = useState(0);
  const [queueDone, setQueueDone] = useState(0);
  const timers = useRef<number[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const suppressAbortRef = useRef(false);
  const queueCancelRef = useRef(false);

  const [error, setError] = useState<string>("");
  const [items, setItems] = useState<ResultItem[]>([]);
  const [runId, setRunId] = useState<string>("");

  const [signupOpen, setSignupOpen] = useState(false);

  // Restore persisted UI state
  useEffect(() => {
    const savedTheme = (lsGet(LS.theme, "neon") as ThemeId) || "neon";
    const savedToken = lsGet(LS.token, "");
    const savedAuth = lsGet(LS.auth, "");
    const savedUser = lsGetJson<UserProfile | null>(LS.user, null);
    const savedRuns = lsGetJson<RunRecord[]>(LS.runs, []);
    const savedClipboard = lsGetJson<ClipboardRecord[]>(LS.clipboard, []);
    const lastRun = lsGet(LS.lastRun, "");
    const draft = lsGet(LS.draft, "");

    setTheme(savedTheme);
    setToken(savedToken);
    setAuthToken(savedAuth);
    setUser(savedUser);
    setRuns(savedRuns);
    setClipboard(savedClipboard);

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

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    lsSet(LS.theme, theme);
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
    lsSetJson(LS.runs, runs);
  }, [runs]);

  useEffect(() => {
    lsSetJson(LS.clipboard, clipboard);
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
    lsSet(LS.draft, JSON.stringify(snapshot));
    lsSet(LS.lastRun, JSON.stringify(snapshot));
  }, [raw, selectedUrls, langEn, langNative, nativeLang, tone, intent, includeAlternates]);

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

  async function generateOneBatch(requestUrls: string[], opts: { append: boolean }) {
    // If a previous request is still in-flight, abort it first.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    startPipeline();

    const resp: GenerateResponse = await generateComments(
      baseUrl,
      {
        urls: requestUrls,
        lang_en: langEn,
        lang_native: langNative,
        native_lang: langNative ? nativeLang : undefined,
        tone: tone === "auto" ? undefined : tone,
        intent: intent === "auto" ? undefined : intent,
        include_alternates: includeAlternates,
      },
      token,
      authToken,
      controller.signal
    );

    const results = resp.results || [];
    const rid = resp.meta?.run_id || nowId("run");
    setRunId(rid);
    setItems((prev) => (opts.append ? [...prev, ...results] : results));
    return { results, rid };
  }

  async function runQueue(allUrls: string[]) {
    if (!ensureAuth()) return;

    queueCancelRef.current = false;
    setError("");
    setLoading(true);
    setStage("fetching");
    setQueueTotal(allUrls.length);
    setQueueDone(0);
    setItems([]);
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

        const { results, rid } = await generateOneBatch(batch, { append: true });
        lastRid = rid;
        combined = [...combined, ...results];
        setQueueDone((prev) => Math.min(allUrls.length, prev + batch.length));
      }

      // Persist to run history
      const okCount = combined.filter((i) => i.status === "ok").length;
      const failedCount = combined.filter((i) => i.status !== "ok").length;
      const request: RunRequestSnapshot = {
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
    <div className="min-h-screen">
      <WelcomePopup />
      <TopBar theme={theme} setTheme={setTheme} baseUrl={baseUrl} user={user} onLogout={logout} />

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
        {resumeCandidate && !items.length ? (
          <ResumeBanner record={resumeCandidate} onResume={resumeLastRun} onDismiss={dismissResume} />
        ) : null}

        <motion.div
          className="grid gap-6 lg:grid-cols-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
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

          <div className="space-y-6">
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
          <div className="rounded-[var(--ct-radius)] border border-red-500/30 bg-red-500/10 p-4 text-sm">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <RunHistoryPanel
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
            onClear={() => setRuns([])}
          />

          <ClipboardHistoryPanel
            items={clipboard}
            onClear={() => setClipboard([])}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
