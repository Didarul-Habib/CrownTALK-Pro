"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ProjectCatalogItem = {
  id: string;
  slug: string;
  name: string;
  ticker: string;
  primary_chain: string;
  category: string;
  stage: string;
  one_line_pitch: string;
  has_post_card: boolean;
};

type ProjectPostMode =
  | "short_casual"
  | "medium_casual"
  | "medium_professional"
  | "long_detailed"
  | "thread_4_6";

type MarketPostMode = "short_casual" | "medium_analysis" | "thread_4_6";

type OfftopicKind =
  | "random"
  | "gm_morning"
  | "noon"
  | "afternoon"
  | "evening"
  | "gn_night";

type QualityMode = "fast" | "balanced" | "pro";

type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error?: { code?: string; message?: string };
};

type ProjectPostResult = {
  text: string;
  runtime_ms?: number;
  tokens_used?: number;
};

type MarketPostResult = {
  text: string;
  runtime_ms?: number;
  tokens_used?: number;
};

type OfftopicPostResult = {
  text: string;
  runtime_ms?: number;
  tokens_used?: number;
};

type LabMode = "project" | "market" | "offtopic";

const DEFAULT_BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") ??
  "https://crowntalk.onrender.com";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${DEFAULT_BACKEND}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }

  const json = (await res.json()) as ApiEnvelope<T>;
  if (!json.success) {
    throw new Error(json.error?.message || "Request failed");
  }
  if (!json.data) {
    throw new Error("Empty response from server");
  }
  return json.data;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${DEFAULT_BACKEND}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }

  const json = (await res.json()) as ApiEnvelope<T>;
  if (!json.success) {
    throw new Error(json.error?.message || "Request failed");
  }
  if (!json.data) {
    throw new Error("Empty response from server");
  }
  return json.data;
}

const PROJECT_MODES: {
  id: ProjectPostMode;
  label: string;
  hint: string;
}[] = [
  {
    id: "short_casual",
    label: "Short casual",
    hint: "One compact CT-style reply",
  },
  {
    id: "medium_casual",
    label: "Medium casual",
    hint: "A bit more context, still light",
  },
  {
    id: "medium_professional",
    label: "Medium professional",
    hint: "More structured, professional tone",
  },
  {
    id: "long_detailed",
    label: "Long detailed",
    hint: "Deep dive reply, more serious",
  },
  {
    id: "thread_4_6",
    label: "Thread (4–6)",
    hint: "Mini thread with clear flow",
  },
];

const MARKET_MODES: {
  id: MarketPostMode;
  label: string;
  hint: string;
}[] = [
  {
    id: "short_casual",
    label: "Short market take",
    hint: "Quick one-liner view",
  },
  {
    id: "medium_analysis",
    label: "Medium analysis",
    hint: "A bit more structured market view",
  },
  {
    id: "thread_4_6",
    label: "Thread (4–6)",
    hint: "Narrative market thread",
  },
];

const QUALITY_OPTIONS: {
  id: QualityMode;
  label: string;
  hint: string;
}[] = [
  {
    id: "fast",
    label: "Fast",
    hint: "Lower token use, OK quality",
  },
  {
    id: "balanced",
    label: "Balanced",
    hint: "Default blend of speed + quality",
  },
  {
    id: "pro",
    label: "Pro",
    hint: "Higher quality, higher token use",
  },
];

const OFFTOPIC_KIND_LABEL: Record<OfftopicKind, string> = {
  random: "Random",
  gm_morning: "GM (morning)",
  noon: "Noon",
  afternoon: "Afternoon",
  evening: "Evening",
  gn_night: "GN (night)",
};

const OFFTOPIC_ORDER: OfftopicKind[] = [
  "random",
  "gm_morning",
  "noon",
  "afternoon",
  "evening",
  "gn_night",
];

export default function ProjectsPage() {
  const [labMode, setLabMode] = useState<LabMode>("project");

  // Project lab
  const [projects, setProjects] = useState<ProjectCatalogItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const [projectMode, setProjectMode] = useState<ProjectPostMode>(
    "medium_professional",
  );
  const [projectQuality, setProjectQuality] =
    useState<QualityMode>("balanced");
  const [projectLanguage, setProjectLanguage] = useState<string>("en");
  const [projectTone, setProjectTone] = useState<"builder" | "neutral" | "hype">(
    "builder",
  );
  const [projectText, setProjectText] = useState<string>("");
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectRuntimeMs, setProjectRuntimeMs] = useState<number | null>(null);
  const [projectTokens, setProjectTokens] = useState<number | null>(null);

  // Market lab
  const [marketAsset, setMarketAsset] = useState<string>("");
  const [marketMode, setMarketMode] =
    useState<MarketPostMode>("medium_analysis");
  const [marketQuality, setMarketQuality] =
    useState<QualityMode>("balanced");
  const [marketTone, setMarketTone] = useState<
    "neutral" | "cautious" | "aggressive"
  >("neutral");
  const [marketText, setMarketText] = useState<string>("");
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketRuntimeMs, setMarketRuntimeMs] = useState<number | null>(null);
  const [marketTokens, setMarketTokens] = useState<number | null>(null);

  // Offtopic lab
  const [offtopicKind, setOfftopicKind] = useState<OfftopicKind>("random");
  const [offtopicLength, setOfftopicLength] = useState<"short" | "semi_mid">(
    "short",
  );
  const [offtopicTone, setOfftopicTone] = useState<"casual" | "builder">(
    "casual",
  );
  const [offtopicIncludeCrypto, setOfftopicIncludeCrypto] =
    useState<boolean>(true);
  const [offtopicQuality, setOfftopicQuality] =
    useState<QualityMode>("balanced");
  const [offtopicText, setOfftopicText] = useState<string>("");
  const [offtopicLoading, setOfftopicLoading] = useState(false);
  const [offtopicRuntimeMs, setOfftopicRuntimeMs] = useState<number | null>(
    null,
  );
  const [offtopicTokens, setOfftopicTokens] = useState<number | null>(null);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setProjectsLoading(true);
      try {
        const data = await getJson<ProjectCatalogItem[]>("/projects");
        if (cancelled) return;
        setProjects(data);
        if (!selectedProjectId && data.length > 0) {
          setSelectedProjectId(data[0].id);
        }
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to load project catalog",
        );
      } finally {
        if (!cancelled) {
          setProjectsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGenerateProject() {
    if (!selectedProjectId) {
      toast.error("Select a project first.");
      return;
    }

    setProjectLoading(true);
    setProjectRuntimeMs(null);
    setProjectTokens(null);

    try {
      const body = {
        project_id: selectedProjectId,
        post_mode: projectMode,
        tone: projectTone,
        language: projectLanguage || "en",
        quality_mode: projectQuality,
      };

      const data = await postJson<ProjectPostResult>("/project_post", body);
      setProjectText(data.text);
      setProjectRuntimeMs(data.runtime_ms ?? null);
      setProjectTokens(data.tokens_used ?? null);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to generate project post",
      );
    } finally {
      setProjectLoading(false);
    }
  }

  async function handleGenerateMarket() {
    const asset = marketAsset.trim();
    if (!asset) {
      toast.error("Enter a token / asset symbol first.");
      return;
    }

    setMarketLoading(true);
    setMarketRuntimeMs(null);
    setMarketTokens(null);

    try {
      const body = {
        asset_id: asset,
        post_mode: marketMode,
        tone: marketTone,
        language: "en",
        quality_mode: marketQuality,
      };

      const data = await postJson<MarketPostResult>("/market_post", body);
      setMarketText(data.text);
      setMarketRuntimeMs(data.runtime_ms ?? null);
      setMarketTokens(data.tokens_used ?? null);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to generate market post",
      );
    } finally {
      setMarketLoading(false);
    }
  }

  async function handleGenerateOfftopic(kindOverride?: OfftopicKind) {
    const kind = kindOverride ?? offtopicKind;

    setOfftopicLoading(true);
    setOfftopicRuntimeMs(null);
    setOfftopicTokens(null);

    try {
      const body = {
        kind,
        post_mode: offtopicLength,
        tone: offtopicTone,
        language: "en",
        quality_mode: offtopicQuality,
        include_crypto: offtopicIncludeCrypto,
      };

      const data = await postJson<OfftopicPostResult>("/offtopic_post", body);
      setOfftopicKind(kind);
      setOfftopicText(data.text);
      setOfftopicRuntimeMs(data.runtime_ms ?? null);
      setOfftopicTokens(data.tokens_used ?? null);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to generate off-topic post",
      );
    } finally {
      setOfftopicLoading(false);
    }
  }

  async function handleCopy(text: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy");
    }
  }

  return (
    <TooltipProvider>
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 pb-10 pt-6 lg:pb-16 lg:pt-10">
        <header className="flex flex-col gap-3 border-b border-[color:var(--ct-border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold sm:text-lg">
                CrownTALK Labs
              </h1>
              <p className="text-xs text-[color:var(--ct-foreground-muted)] sm:text-sm">
                Project cards, market posts & off-topic CT riffs in one place.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <Link
              href="/"
              className="text-xs text-[color:var(--ct-foreground-muted)] hover:text-[color:var(--ct-foreground)]"
            >
              ← Back to main reply generator
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--ct-panel-subtle)] px-3 py-1 text-[0.68rem] font-medium uppercase tracking-wide text-[color:var(--ct-foreground-muted)]">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--ct-accent-soft)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--ct-accent)]" />
                </span>
                Live lab utilities • internal use
              </div>
              <p className="text-xs text-[color:var(--ct-foreground-muted)] sm:text-[0.78rem]">
                Use these presets to prototype project-focused posts, quick
                market takes, or daily GM/GN riffs.
              </p>
            </div>

            <div className="mt-2 flex justify-end sm:mt-0">
              <div className="inline-flex rounded-full bg-[color:var(--ct-panel-subtle)] p-1 text-xs">
                {(
                  [
                    ["project", "Project Lab"],
                    ["market", "Market Lab"],
                    ["offtopic", "Off-topic"],
                  ] as [LabMode, string][]
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setLabMode(mode)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[0.72rem] font-medium transition",
                      labMode === mode
                        ? "bg-[color:var(--ct-panel)] text-[color:var(--ct-foreground)] shadow-sm"
                        : "text-[color:var(--ct-foreground-muted)] hover:text-[color:var(--ct-foreground)]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Tabs
          value={labMode}
          onValueChange={(value) => setLabMode(value as LabMode)}
          className="mt-1 flex-1"
        >
          <TabsList className="hidden">
            <TabsTrigger value="project">Project</TabsTrigger>
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="offtopic">Off-topic</TabsTrigger>
          </TabsList>

          {/* PROJECT LAB */}
          <TabsContent value="project" className="mt-0 space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold sm:text-base">
                        Project Lab
                      </h2>
                      <p className="text-[0.72rem] text-[color:var(--ct-foreground-muted)] sm:text-xs">
                        Generate positioned replies using the research cards.
                      </p>
                    </div>
                    {projectsLoading ? (
                      <span className="text-[0.7rem] text-[color:var(--ct-foreground-muted)]">
                        Loading…
                      </span>
                    ) : projects.length ? (
                      <span className="text-[0.7rem] text-[color:var(--ct-foreground-muted)]">
                        {projects.length} projects
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[0.72rem] font-medium text-[color:var(--ct-foreground-muted)]">
                      Project
                    </label>
                    <select
                      className="w-full rounded-xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-subtle)] px-3 py-2 text-xs outline-none ring-0 transition focus:border-[color:var(--ct-accent)] focus:ring-1 focus:ring-[color:var(--ct-accent-soft)]"
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      disabled={projectsLoading}
                    >
                      {!projects.length && (
                        <option value="">No projects loaded</option>
                      )}
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.ticker ? `(${p.ticker})` : ""} ·{" "}
                          {p.category}
                        </option>
                      ))}
                    </select>

                    {selectedProject && (
                      <p className="text-[0.7rem] text-[color:var(--ct-foreground-muted)]">
                        {selectedProject.one_line_pitch}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[0.72rem] font-medium text-[color:var(--ct-foreground-muted)]">
                        <span>Post style</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {PROJECT_MODES.map((mode) => (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => setProjectMode(mode.id)}
                            className={cn(
                              "rounded-xl border px-2 py-1.5 text-left text-[0.7rem] transition",
                              projectMode === mode.id
                                ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-foreground)] shadow-sm"
                                : "border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)] hover:text-[color:var(--ct-foreground)]",
                            )}
                          >
                            <div className="font-medium">{mode.label}</div>
                            <div className="mt-0.5 text-[0.68rem]">
                              {mode.hint}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[0.72rem] font-medium text-[color:var(--ct-foreground-muted)]">
                        <span>Quality</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {QUALITY_OPTIONS.map((q) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setProjectQuality(q.id)}
                            className={cn(
                              "rounded-xl border px-2 py-1.5 text-left text-[0.7rem] transition",
                              projectQuality === q.id
                                ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-foreground)] shadow-sm"
                                : "border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)] hover:text-[color:var(--ct-foreground)]",
                            )}
                          >
                            <div className="font-medium">{q.label}</div>
                            <div className="mt-0.5 text-[0.68rem]">
                              {q.hint}
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-[0.72rem] font-medium text-[color:var(--ct-foreground-muted)]">
                          <span>Tone</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              ["builder", "Builder"],
                              ["neutral", "Neutral"],
                              ["hype", "Higher energy"],
                            ] as const
                          ).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                setProjectTone(value as typeof projectTone)
                              }
                              className={cn(
                                "rounded-xl border px-2 py-1.5 text-[0.7rem] transition",
                                projectTone === value
                                  ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-foreground)] shadow-sm"
                                  : "border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)] hover:text-[color:var(--ct-foreground)]",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        <label className="block text-[0.72rem] font-medium text-[color:var(--ct-foreground-muted)]">
                          Output language (ISO, e.g. "en", "es", "zh")
                        </label>
                        <Input
                          value={projectLanguage}
                          onChange={(e) =>
                            setProjectLanguage(e.target.value.trim())
                          }
                          placeholder="en"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleGenerateProject}
                      disabled={projectLoading || !selectedProjectId}
                      className="h-8 px-3 text-xs font-medium"
                    >
                      {projectLoading ? "Generating…" : "Generate project post"}
                    </Button>

                    <div className="flex items-center gap-3 text-[0.7rem] text-[color:var(--ct-foreground-muted)]">
                      {projectRuntimeMs != null && (
                        <span>~{projectRuntimeMs} ms</span>
                      )}
                      {projectTokens != null && (
                        <span>{projectTokens} tokens</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex min-h-[260px] flex-col rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-3 sm:p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">Preview</h3>
                    <p className="text-[0.72rem] text-[color:var(--ct-foreground-muted)]">
                      Final copy exactly as it would be posted.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={!projectText}
                    onClick={() => handleCopy(projectText)}
                    className="h-7 w-7 text-[0.7rem]"
                  >
                    ⧉
                  </Button>
                </div>
                <div className="relative flex-1 rounded-xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-subtle)] p-3 text-xs leading-relaxed">
                  {projectText ? (
                    <pre className="whitespace-pre-wrap break-words text-[0.78rem]">
                      {projectText}
                    </pre>
                  ) : (
                    <p className="text-[0.72rem] text-[color:var(--ct-foreground-muted)]">
                      No project post yet. Choose a project and generate to see
                      a CrownTALK-style reply.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

                    {/* MARKET LAB */}
          <TabsContent value="market" className="mt-0 space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold sm:text-base">
                        Market Lab
                      </h2>
                      <p className="text-[0.72rem] text-[color:var(--ct-foreground-muted)] sm:text-xs">
                        Free-form market takes for any ticker / asset.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[0.72rem] font-medium text-[color:var(--ct-foreground-muted)]">
                      Asset / ticker
                    </label>
                    <Input
                      value={marketAsset}
                      onChange={(e) => setMarketAsset(e.target.value)}
                      placeholder='e.g. "BTC", "ETH", "SOL", "OP"'
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[0.72rem] font-medium text-[color:var(--ct-foreground-muted)]">
                        <span>Post style</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {MARKET_MODES.map((mode) => (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => setMarketMode(mode.id)}
                            className={cn(
                              "rounded-xl border px-2 py-1.5 text-left text-[0.7rem] transition",
                              marketMode === mode.id
                                ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-foreground)] shadow-sm"
                                : "border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)] hover:text-[color:var(--ct-foreground)]",
                            )}
                          >
                            <div className="font-medium">{mode.label}</div>
                            <div className="mt-0.5 text-[0.68rem]">
                              {mode.hint}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[0.72rem] font-medium text-[color:var(--ct-foreground-muted)]">
                        <span>Quality</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {QUALITY_OPTIONS.map((q) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setMarketQuality(q.id)}
                            className={cn(
                              "rounded-xl border px-2 py-1.5 text-left text-[0.7rem] transition",
                              marketQuality === q.id
                                ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-foreground)] shadow-sm"
                                : "border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)] hover:text-[color:var(--ct-foreground)]",
                            )}
                          >
                            <div className="font-medium">{q.label}</div>
                            <div className="mt-0.5 text-[0.68rem]">
                              {q.hint}
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-[0.72rem] font-medium text-[color:var(--ct-foreground-muted)]">
                          <span>Tone</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              ["neutral", "Neutral"],
                              ["cautious", "Cautious"],
                              ["aggressive", "Aggressive"],
                            ] as const
                          ).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                setMarketTone(value as typeof marketTone)
                              }
                              className={cn(
                                "rounded-xl border px-2 py-1.5 text-[0.7rem] transition",
                                marketTone === value
                                  ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-foreground)] shadow-sm"
                                  : "border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)] hover:text-[color:var(--ct-foreground)]",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleGenerateMarket}
                      disabled={marketLoading || !marketAsset.trim()}
                      className="h-8 px-3 text-xs font-medium"
                    >
                      {marketLoading ? "Generating…" : "Generate market post"}
                    </Button>

                    <div className="flex items-center gap-3 text-[0.7rem] text-[color:var(--ct-foreground-muted)]">
                      {marketRuntimeMs != null && (
                        <span>~{marketRuntimeMs} ms</span>
                      )}
                      {marketTokens != null && (
                        <span>{marketTokens} tokens</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex min-h-[260px] flex-col rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-3 sm:p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">Preview</h3>
                    <p className="text-[0.72rem] text-[color:var(--ct-foreground-muted)]">
                      Market-flavored CT post.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={!marketText}
                    onClick={() => handleCopy(marketText)}
                    className="h-7 w-7 text-[0.7rem]"
                  >
                    ⧉
                  </Button>
                </div>
                <div className="relative flex-1 rounded-xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-subtle)] p-3 text-xs leading-relaxed">
                  {marketText ? (
                    <pre className="whitespace-pre-wrap break-words text-[0.78rem]">
                      {marketText}
                    </pre>
                  ) : (
                    <p className="text-[0.72rem] text-[color:var(--ct-foreground-muted)]">
                      No market post yet. Add a ticker / asset and generate a
                      contextual take.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* OFFTOPIC LAB */}
          <TabsContent value="offtopic" className="mt-0 space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold sm:text-base">
                        Off-topic Lab
                      </h2>
                      <p className="text-[0.72rem] text-[color:var(--ct-foreground-muted)] sm:text-xs">
                        Daily GM/GN riffs, random thoughts, and softer CT posts.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[0.72rem] font-medium text-[color:var(--ct-foreground-muted)]">
                        <span>Time-of-day preset</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {OFFTOPIC_ORDER.map((kind) => (
                          <button
                            key={kind}
                            type="button"
                            onClick={() => setOfftopicKind(kind)}
                            className={cn(
                              "rounded-xl border px-2 py-1.5 text-[0.7rem] transition",
                              offtopicKind === kind
                                ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-foreground)] shadow-sm"
                                : "border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)] hover:text-[color:var(--ct-foreground)]",
                            )}
                          >
                            {OFFTOPIC_KIND_LABEL[kind]}
                          </button>
                        ))}
                      </div>
                      <p className="text-[0.68rem] text-[color:var(--ct-foreground-muted)]">
                        GN (night) is tuned for softer end-of-day reflections
                        with a subtle crypto / builder lens.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[0.72rem] font-medium text-[color:var(--ct-foreground-muted)]">
                          <span>Length</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(
                            [
                              ["short", "Short"],
                              ["semi_mid", "Semi-mid"],
                            ] as const
                          ).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                setOfftopicLength(value as typeof offtopicLength)
                              }
                              className={cn(
                                "rounded-xl border px-2 py-1.5 text-[0.7rem] transition",
                                offtopicLength === value
                                  ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-foreground)] shadow-sm"
                                  : "border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)] hover:text-[color:var(--ct-foreground)]",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[0.72rem] font-medium text-[color:var(--ct-foreground-muted)]">
                          <span>Tone</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(
                            [
                              ["casual", "Casual"],
                              ["builder", "Builder lens"],
                            ] as const
                          ).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                setOfftopicTone(value as typeof offtopicTone)
                              }
                              className={cn(
                                "rounded-xl border px-2 py-1.5 text-[0.7rem] transition",
                                offtopicTone === value
                                  ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-foreground)] shadow-sm"
                                  : "border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)] hover:text-[color:var(--ct-foreground)]",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-2 text-[0.72rem] text-[color:var(--ct-foreground-muted)]">
                        <input
                          type="checkbox"
                          className="h-3 w-3 rounded border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-subtle)]"
                          checked={offtopicIncludeCrypto}
                          onChange={(e) =>
                            setOfftopicIncludeCrypto(e.target.checked)
                          }
                        />
                        <span>Keep a light crypto / builder angle</span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleGenerateOfftopic()}
                        disabled={offtopicLoading}
                        className="h-8 px-3 text-xs font-medium"
                      >
                        {offtopicLoading
                          ? "Generating…"
                          : "Generate off-topic post"}
                      </Button>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={offtopicLoading}
                            onClick={() => handleGenerateOfftopic("gn_night")}
                            className="h-8 px-3 text-xs font-medium"
                          >
                            GN preset
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-[0.72rem]">
                          Generate a night-time reflection style post (GN
                          preset) with a softer vibe. Uses the dedicated
                          <span className="font-semibold"> gn_night</span>{" "}
                          backend prompt.
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex items-center gap-3 text-[0.7rem] text-[color:var(--ct-foreground-muted)]">
                      {offtopicRuntimeMs != null && (
                        <span>~{offtopicRuntimeMs} ms</span>
                      )}
                      {offtopicTokens != null && (
                        <span>{offtopicTokens} tokens</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex min-h-[260px] flex-col rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-3 sm:p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">Preview</h3>
                    <p className="text-[0.72rem] text-[color:var(--ct-foreground-muted)]">
                      Lightweight off-topic CT copy.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={!offtopicText}
                    onClick={() => handleCopy(offtopicText)}
                    className="h-7 w-7 text-[0.7rem]"
                  >
                    ⧉
                  </Button>
                </div>
                <div className="relative flex-1 rounded-xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-subtle)] p-3 text-xs leading-relaxed">
                  {offtopicText ? (
                    <pre className="whitespace-pre-wrap break-words text-[0.78rem]">
                      {offtopicText}
                    </pre>
                  ) : (
                    <p className="text-[0.72rem] text-[color:var(--ct-foreground-muted)]">
                      No off-topic post yet. Pick a time-of-day (GM / GN /
                      random) and generate a softer CT riff.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
          
