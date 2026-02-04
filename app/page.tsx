"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

import TopBar from "@/components/TopBar";
import UrlInput, { cleanInvalidInRaw, shuffleUrlsInRaw, sortUrlsInRaw } from "@/components/UrlInput";
import Controls from "@/components/Controls";
import Results from "@/components/Results";
import AccessGate from "@/components/AccessGate";
import ProgressStepper, { Stage } from "@/components/ProgressStepper";
import type { ThemeId } from "@/components/ThemeStudioBar";

import { parseUrls } from "@/lib/validate";
import { generateComments } from "@/lib/api";
import { LS, lsGet, lsSet } from "@/lib/storage";
import type { GenerateResponse, Intent, ResultItem, Tone } from "@/lib/types";

const DEFAULT_BACKEND = "https://crowntalk.onrender.com";

export default function Home() {
  const [raw, setRaw] = useState<string>("");
  const urls = useMemo(() => parseUrls(raw), [raw]);

  const [langEn, setLangEn] = useState(true);
  const [langNative, setLangNative] = useState(false);
  const [nativeLang, setNativeLang] = useState("bn");
  const [tone, setTone] = useState<Tone>("professional");
  const [intent, setIntent] = useState<Intent>("neutral");
  const [includeAlternates, setIncludeAlternates] = useState(false);

  const [baseUrl, setBaseUrl] = useState<string>(DEFAULT_BACKEND);
  const [token, setToken] = useState<string>("");
  const [theme, setTheme] = useState<ThemeId>("neon");

  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const timers = useRef<number[]>([]);

  const [error, setError] = useState<string>("");
  const [items, setItems] = useState<ResultItem[]>([]);
  const [runId, setRunId] = useState<string>("");

  const [gateOpen, setGateOpen] = useState(false);

  // Restore persisted UI state
  useEffect(() => {
    const savedTheme = (lsGet(LS.theme, "neon") as ThemeId) || "neon";
    const savedBackend = lsGet(LS.backend, "");
    const savedToken = lsGet(LS.token, "");
    const lastRun = lsGet(LS.lastRun, "");

    setTheme(savedTheme);
    setBaseUrl(savedBackend || process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND);
    setToken(savedToken);

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
    lsSet(LS.backend, baseUrl);
  }, [baseUrl]);

  useEffect(() => {
    lsSet(LS.token, token);
  }, [token]);

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
      window.setTimeout(() => setStage("generating"), 280),
      window.setTimeout(() => setStage("polishing"), 900),
      window.setTimeout(() => setStage("finalizing"), 1500)
    );
  }

  async function run(requestUrls: string[]) {
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

      setItems(resp.results || []);
      setRunId(resp.meta?.run_id || "");
      setStage("done");
    } catch (e: any) {
      const msg = e?.message || "Unknown error";
      setError(msg);
      setStage("idle");

      // If backend gate is enabled and we didn't send a token, show gate automatically.
      if (String(msg).includes("403") && String(msg).includes("missing_access")) {
        setGateOpen(true);
      }
    } finally {
      clearTimers();
      setLoading(false);
      // return to idle after a short moment
      window.setTimeout(() => setStage("idle"), 900);
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

  return (
    <div className="min-h-screen">
      <TopBar theme={theme} setTheme={setTheme} baseUrl={baseUrl} />

      <AccessGate
        open={gateOpen}
        baseUrl={baseUrl}
        onClose={() => setGateOpen(false)}
        onToken={(t) => setToken(t)}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <motion.div
          className="grid gap-6 md:grid-cols-2"
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
              setBaseUrl={setBaseUrl}
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
        />

        {error ? (
          <div className="rounded-[var(--ct-radius)] border border-red-500/30 bg-red-500/10 p-4 text-sm">
            {error}
          </div>
        ) : null}
      </main>
    </div>
  );
}
