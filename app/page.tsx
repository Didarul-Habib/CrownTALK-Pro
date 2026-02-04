"use client";

import { useMemo, useState } from "react";
import TopBar from "@/components/TopBar";
import UrlInput from "@/components/UrlInput";
import Controls from "@/components/Controls";
import Results from "@/components/Results";
import { parseUrls } from "@/lib/validate";
import { generateComments } from "@/lib/api";
import type { GenerateResponse, Intent, ResultItem, Tone } from "@/lib/types";

export default function Home() {
  const [raw, setRaw] = useState<string>("");
  const urls = useMemo(() => parseUrls(raw), [raw]);

  const [langEn, setLangEn] = useState(true);
  const [langNative, setLangNative] = useState(false);
  const [nativeLang, setNativeLang] = useState("bn");
  const [tone, setTone] = useState<Tone>("professional");
  const [intent, setIntent] = useState<Intent>("neutral");
  const [includeAlternates, setIncludeAlternates] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [items, setItems] = useState<ResultItem[]>([]);
  const [runId, setRunId] = useState<string>("");

  async function run(requestUrls: string[]) {
    setError("");
    setLoading(true);
    try {
      const resp: GenerateResponse = await generateComments({
        urls: requestUrls,
        lang_en: langEn,
        lang_native: langNative,
        native_lang: langNative ? nativeLang : undefined,
        tone,
        intent,
        include_alternates: includeAlternates,
      });
      setItems(resp.results || []);
      setRunId(resp.meta?.run_id || "");
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen">
      <TopBar />

      <main className="mx-auto max-w-5xl p-4 md:p-6 grid gap-6 md:grid-cols-2">
        <section className="space-y-4">
          <UrlInput
            value={raw}
            onChange={setRaw}
            helper={`${urls.length} valid URLs detected`}
          />

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
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
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onGenerate}
              disabled={loading}
              className="flex-1 rounded-2xl bg-neutral-100 text-neutral-950 font-medium py-3 disabled:opacity-60"
            >
              {loading ? "Generating…" : "Generate"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRaw("");
                setItems([]);
                setRunId("");
                setError("");
              }}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-neutral-200"
            >
              Clear
            </button>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {runId ? (
            <div className="text-xs text-neutral-500">Run: {runId}</div>
          ) : null}

          <div className="text-xs text-neutral-500">
            Tip: Keep “Professional” tone for higher trust. Hashtags are disabled by design.
          </div>
        </section>

        <section className="space-y-4">
          <Results items={items} onRerollUrl={rerollUrl} />
        </section>
      </main>
    </div>
  );
}
