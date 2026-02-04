"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

import TopBar from "@/components/TopBar";
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
import { generateComments } from "@/lib/api";
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

  const [langEn, setLangEn] = useState(true);
  const [langNative, setLangNative] = useState(false);
  const [nativeLang, setNativeLang] = useState("bn");
  const [tone, setTone] = useState<Tone>("professional");
  const [intent, setIntent] = useState<Intent>("neutral");
  const [includeAlternates, setIncludeAlternates] = useState(false);

  const [token, setToken] = useState<string>("");
  const [theme, setTheme] = useState<ThemeId>("neon");

  const [user, setUser] = useState<UserProfile | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [clipboard, setClipboard] = useState<ClipboardRecord[]>([]);
  const [resumeCandidate, setResumeCandidate] = useState<RunRecord | null>(null);

  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const timers = useRef<number[]>([]);

  const [error, setError] = useState<string>("");
  const [items, setItems] = useState<ResultItem[]>([]);
  const [runId, setRunId] = useState<string>("");

  const [signupOpen, setSignupOpen] = useState(false);

  // Restore persisted UI state
  useEffect(() => {
    const savedTheme = (lsGet(LS.theme, "neon") as ThemeId) || "neon";
    const savedToken = lsGet(LS.token, "");
    const savedUser = lsGetJson<UserProfile | null>(LS.user, null);
    const savedRuns = lsGetJson<RunRecord[]>(LS.runs, []);
    const savedClipboard = lsGetJson<ClipboardRecord[]>(LS.clipboard, []);
    const lastRun = lsGet(LS.lastRun, "");

    setTheme(savedTheme);
    setToken(savedToken);
    setUser(savedUser);
    setRuns(savedRuns);
    setClipboard(savedClipboard);

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
      langEn,
      langNative,
      nativeLang,
      tone,
      intent,
      includeAlternates,
    };
    lsSet(LS.lastRun, JSON.stringify(snapshot));
  }, [raw, langEn, langNative, nativeLang, tone, intent, includeAlternates]);

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
    if (!user || !token) {
      setSignupOpen(true);
      return false;
    }
    return true;
  }

  async function run(requestUrls: string[]) {
    if (!ensureAuth()) return;

    setError("");
    setLoading(true);
    startPipeline();

    try {
      const resp: GenerateResponse = await generateComments(
        baseUrl,
        {
          urls: requestUrls,
          lang_en: langEn,
          lang_native: langNative,
          native_lang: langNative ? nativeLang : undefined,
          tone,
          intent,
          include_alternates: includeAlternates,
        },
        token
      );

      const results = resp.results || [];
      const rid = resp.meta?.run_id || nowId("run");

      setItems(results);
      setRunId(rid);

      // Persist to run history (and enable "Resume last run" after reload)
      const okCount = results.filter((i) => i.status === "ok").length;
      const failedCount = results.filter((i) => i.status !== "ok").length;
      const request: RunRequestSnapshot = {
        urls: requestUrls,
        langEn,
        langNative,
        nativeLang,
        tone,
        intent,
        includeAlternates,
      };
      const record: RunRecord = {
        id: rid,
        at: Date.now(),
        request,
        results,
        okCount,
        failedCount,
      };

      setRuns((prev) => [record, ...prev.filter((r) => r.id !== record.id)].slice(0, 20));
      lsSet(LS.lastRunResult, record.id);
      lsSet(LS.dismissResume, "");
      setStage("done");
    } catch (e: any) {
      const msg = e?.message || "Unknown error";
      setError(msg);
      setStage("idle");

      // If backend gate is enabled and we didn't send a token, show gate automatically.
      if (String(msg).includes("403") && String(msg).includes("missing_access")) {
        setSignupOpen(true);
      }
    } finally {
      clearTimers();
      setLoading(false);
      // return to idle after a short moment
      window.setTimeout(() => setStage("idle"), 1600);
    }
  }

  async function onGenerate() {
    if (!urls.length) {
      setError("Paste at least 1 valid X status URL.");
      return;
    }
    await run(urls);
  }

  async function rerollUrl(url: string) {
    await run([url]);
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
    await run(failedUrls);
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
    try {
      localStorage.removeItem(LS.user);
      localStorage.removeItem(LS.token);
    } catch {}
    setUser(null);
    setToken("");
  }

  return (
    <div className="min-h-screen">
      <TopBar theme={theme} setTheme={setTheme} baseUrl={baseUrl} user={user} onLogout={logout} />

      <SignupGate
        open={signupOpen}
        baseUrl={baseUrl}
        onClose={() => setSignupOpen(false)}
        onAuthed={(profile, t) => {
          setUser(profile);
          setToken(t);
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
              loading={loading}
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
