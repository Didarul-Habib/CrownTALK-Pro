"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Search } from "lucide-react";
import clsx from "clsx";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SignupGate from "@/components/SignupGate";
import StatusPill from "@/components/StatusPill";
import type { UserProfile } from "@/lib/persist";
import { LS, lsGet, lsGetJson, lsSet, lsSetJson } from "@/lib/storage";
import type {
  ProjectCatalogItem,
  ProjectPostMode,
  ProjectPostResponse,
  QualityMode,
  MarketPostMode,
  MarketPostResponse,
  OfftopicKind,
  OfftopicPostResponse,
} from "@/lib/types";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { UI_LANGS } from "@/lib/uiLanguage";

type UiPostKind = "short" | "medium" | "long" | "thread";

type ProjectHistoryEntry = {
  id: string;
  projectId: string;
  createdAt: number;
  postMode: ProjectPostMode;
  uiPostKind: UiPostKind;
  tone?: "casual" | "professional";
  qualityMode: QualityMode;
  language: string;
  response: ProjectPostResponse;
};

type ProjectHistoryMap = Record<string, ProjectHistoryEntry[]>;


function copyText(text: string) {
  if (!text) return;
  try {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(12);
    }
    toast.success("Copied to clipboard");
  } catch (err) {
    console.error("copy failed", err);
    toast.error("Copy failed");
  }
}

function getBackendBaseUrl(): string {
  const override =
    typeof window !== "undefined" ? (window as any).__CROWNTALK_BACKEND as string | undefined : undefined;
  if (override && typeof override === "string" && override.trim()) return override.trim();
  return process.env.NEXT_PUBLIC_BACKEND_URL || "https://crowntalk.onrender.com";
}

export default function ProjectLabPage() {
  const [baseUrl] = useState<string>(() => getBackendBaseUrl());
  const [accessToken, setAccessToken] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [signupOpen, setSignupOpen] = useState(false);

  const [projects, setProjects] = useState<ProjectCatalogItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [chainFilter, setChainFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [uiPostKind, setUiPostKind] = useState<UiPostKind>("short");
  const [mediumTone, setMediumTone] = useState<"casual" | "professional">("professional");
  const [qualityMode, setQualityMode] = useState<QualityMode>("balanced");
  const [language, setLanguage] = useState<string>("en");

  const [result, setResult] = useState<ProjectPostResponse | null>(null);
  const [projectHistory, setProjectHistory] = useState<ProjectHistoryMap>({});
  const [activeLab, setActiveLab] = useState<"project" | "market" | "offtopic">("project");
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);

  // Market Lab state
  const [marketAsset, setMarketAsset] = useState<string>("BTC");
  const [marketMode, setMarketMode] = useState<MarketPostMode>("short_casual");
  const [marketTone, setMarketTone] = useState<"casual" | "professional">("casual");
  const [marketQuality, setMarketQuality] = useState<QualityMode>("balanced");
  const [marketResult, setMarketResult] = useState<MarketPostResponse | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);

  // Off-topic Lab state
  const [offtopicKind, setOfftopicKind] = useState<OfftopicKind>("random");
  const [offtopicMode, setOfftopicMode] = useState<"short" | "semi_mid">("short");
  const [offtopicTone, setOfftopicTone] = useState<"casual" | "professional">("casual");
  const [offtopicQuality, setOfftopicQuality] = useState<QualityMode>("balanced");
  const [offtopicResult, setOfftopicResult] = useState<OfftopicPostResponse | null>(null);
  const [offtopicLoading, setOfftopicLoading] = useState(false);
  const [offtopicError, setOfftopicError] = useState<string | null>(null);


  // Rehydrate auth from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedToken = lsGet(LS.token, "");
    const savedAuth = lsGet(LS.auth, "");
    const savedUser = lsGetJson<UserProfile | null>(LS.user, null);
    if (savedToken && savedAuth && savedUser) {
      setAccessToken(savedToken);
      setAuthToken(savedAuth);
      setUser(savedUser);
    } else {
      setSignupOpen(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedLang = lsGet(LS.projectLabLang, "en");
      if (savedLang) {
        setLanguage(savedLang);
      }
    } catch {
      // ignore
    }

    try {
      const savedHistory = lsGetJson<ProjectHistoryMap | null>(LS.projectLabHistory, null);
      if (savedHistory && typeof savedHistory === "object") {
        setProjectHistory(savedHistory);
      }
    } catch {
      // ignore
    }
  }, []);


  function ensureAuth(): boolean {
    if (!accessToken || !authToken || !user) {
      setSignupOpen(true);
      toast.error("Sign in to use Project Post Lab");
      return false;
    }
    return true;
  }

  // Load projects once auth is available
  useEffect(() => {
    if (!accessToken || !authToken) return;

    let cancelled = false;
    async function load() {
      setProjectsLoading(true);
      setProjectsError(null);
      try {
        const api = await import("@/lib/api");
        const list = await api.listProjects(baseUrl, accessToken, authToken);
        if (cancelled) return;
        setProjects(list || []);
        if (!selectedProjectId && list && list.length > 0) {
          setSelectedProjectId(list[0].id);
        }
      } catch (err: any) {
        console.error(err);
        if (cancelled) return;
        const msg = err?.message || "Failed to load projects";
        setProjectsError(msg);
        toast.error(msg);
      } finally {
        if (!cancelled) setProjectsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, authToken, baseUrl]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const chains = useMemo(
    () =>
      Array.from(
        new Set(
          projects
            .map((p) => (p.primary_chain || "").trim())
            .filter(Boolean)
        )
      ).sort(),
    [projects]
  );

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          projects
            .map((p) => (p.category || "").trim())
            .filter(Boolean)
        )
      ).sort(),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (chainFilter !== "all" && p.primary_chain !== chainFilter) return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (!q) return true;
      const name = p.name.toLowerCase();
      const ticker = (p.ticker || "").toLowerCase();
      return name.includes(q) || ticker.includes(q);
    });
  }, [projects, search, chainFilter, categoryFilter]);

  const effectivePostMode: ProjectPostMode = useMemo(() => {
    switch (uiPostKind) {
      case "short":
        return "short_casual";
      case "medium":
        return mediumTone === "professional" ? "medium_professional" : "medium_casual";
      case "long":
        return "long_detailed";
      case "thread":
        return "thread_4_6";
      default:
        return "short_casual";
    }
  }, [uiPostKind, mediumTone]);

  const configSummary = useMemo(() => {
    const postLabel =
      uiPostKind === "short"
        ? "Short, casual"
        : uiPostKind === "medium"
        ? "Medium length"
        : uiPostKind === "long"
        ? "Long detailed"
        : "Thread (4–6)";

    const toneLabel =
      uiPostKind === "medium" ? (mediumTone === "professional" ? "Professional tone" : "Casual tone") : null;

    const qualityLabel =
      qualityMode === "fast" ? "Fast" : qualityMode === "pro" ? "Pro" : "Balanced";

    const langLabel =
      UI_LANGS.find((l) => l.id === language)?.label || language?.toUpperCase?.() || "English";

    return [postLabel, toneLabel, qualityLabel, langLabel].filter(Boolean).join(" · ");
  }, [uiPostKind, mediumTone, qualityMode, language]);


  async function handleGenerate(kind: "normal" | "reroll" = "normal") {
    setResultError(null);
    if (!ensureAuth()) return;
    if (!selectedProjectId || !selectedProject) {
      toast.error("Select a project first");
      return;
    }

    const payload = {
      project_id: selectedProjectId,
      post_mode: effectivePostMode,
      tone: uiPostKind === "medium" ? mediumTone : undefined,
      language,
      quality_mode: qualityMode,
    } as const;

    setResultLoading(true);
    try {
      const api = await import("@/lib/api");
      const resp = await api.generateProjectPost(baseUrl, payload, accessToken, authToken);
      setResult(resp);

      const entry: ProjectHistoryEntry = {
        id: `${selectedProjectId}-${Date.now()}`,
        projectId: selectedProjectId,
        createdAt: Date.now(),
        postMode: resp.post_mode as ProjectPostMode,
        uiPostKind,
        tone: uiPostKind === "medium" ? mediumTone : undefined,
        qualityMode,
        language,
        response: resp,
      };

      setProjectHistory((prev) => {
        const next: ProjectHistoryMap = { ...prev };
        const existing = next[selectedProjectId] ? [...next[selectedProjectId]] : [];
        existing.unshift(entry);
        if (existing.length > 5) {
          existing.length = 5;
        }
        next[selectedProjectId] = existing;
        try {
          lsSetJson(LS.projectLabHistory, next);
        } catch {
          // ignore
        }
        return next;
      });

      if (kind === "reroll") {
        toast.success("New variant generated");
      } else {
        toast.success("Project post generated");
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || "Generation failed";
      setResultError(msg);
      toast.error(msg);
    } finally {
      setResultLoading(false);
    }
  }


  async function handleGenerateMarket(kind: "normal" | "reroll" = "normal") {
    setMarketError(null);
    if (!ensureAuth()) return;

    const payload = {
      asset_id: !marketAsset || marketAsset === "RANDOM" ? undefined : marketAsset,
      post_mode: marketMode,
      tone: marketTone,
      language,
      quality_mode: marketQuality,
    } as const;

    setMarketLoading(true);
    try {
      const api = await import("@/lib/api");
      const resp = await api.generateMarketPost(baseUrl, payload, accessToken, authToken);
      setMarketResult(resp);
      if (kind === "reroll") {
        toast.success("New market variant generated");
      } else {
        toast.success("Market post generated");
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || "Market post failed";
      setMarketError(msg);
      toast.error(msg);
    } finally {
      setMarketLoading(false);
    }
  }

  async function handleGenerateOfftopic(kind: "normal" | "reroll" = "normal") {
    setOfftopicError(null);
    if (!ensureAuth()) return;

    const payload = {
      kind: offtopicKind,
      post_mode: offtopicMode,
      tone: offtopicTone,
      language,
      quality_mode: offtopicQuality,
    } as const;

    setOfftopicLoading(true);
    try {
      const api = await import("@/lib/api");
      const resp = await api.generateOfftopicPost(baseUrl, payload, accessToken, authToken);
      setOfftopicResult(resp);
      if (kind === "reroll") {
        toast.success("New off-topic variant generated");
      } else {
        toast.success("Off-topic post generated");
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || "Off-topic post failed";
      setOfftopicError(msg);
      toast.error(msg);
    } finally {
      setOfftopicLoading(false);
    }
  }
  const isThread = result && "tweets" in result;
  const marketIsThread = marketResult && "tweets" in marketResult;
  const hasOfftopic = !!offtopicResult;

  return (
    <>
      <SignupGate
        open={signupOpen}
        baseUrl={baseUrl}
        onClose={() => setSignupOpen(false)}
        onAuthed={(profile, accessToken, sessionToken) => {
          setUser(profile);
          setAccessToken(accessToken);
          setAuthToken(sessionToken);
        }}
      />

            <TooltipProvider>
        <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 pb-12 pt-6 lg:gap-6 lg:pb-16 lg:pt-10">
        
        <div className="mb-2 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--ct-foreground-muted)] hover:text-[color:var(--ct-accent)]"
          >
            <span aria-hidden="true">←</span>
            <span>Back to Comment Generator</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-[10px] uppercase tracking-[0.16em] text-[color:var(--ct-foreground-muted)] sm:inline">
              Project Labs v1
            </span>
            <StatusPill baseUrl={baseUrl} />
          </div>
        </div>

        <div className="sticky top-0 z-20 mb-3 ct-card px-3 py-2.5 sm:px-4 sm:py-3 border border-[color:var(--ct-border-subtle)] backdrop-blur-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                Project post labs
              </p>
              <p className="text-xs leading-relaxed text-[color:var(--ct-foreground-muted)]">
                Pick a lab, then generate ready-to-post tweets and threads grounded in your own research cards.
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <div className="inline-flex self-start rounded-full border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-muted)] p-0.5 text-[10px]">
                {[
                  { id: "project", label: "Project posts" },
                  { id: "market", label: "Market posts" },
                  { id: "offtopic", label: "Off-topic" },
                ].map((lab) => (
                  <button
                    key={lab.id}
                    type="button"
                    onClick={() => setActiveLab(lab.id as "project" | "market" | "offtopic")}
                    className={clsx(
                      "rounded-full px-3 py-1 text-[10px] font-medium transition-colors",
                      activeLab === lab.id
                        ? "bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                        : "text-[color:var(--ct-foreground-muted)] hover:text-[color:var(--ct-foreground-soft)]"
                    )}
                  >
                    {lab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {activeLab === "project" && (
          <>
            <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)]"
        >
          {/* Left: Project catalog */}
          <section className="ct-card flex flex-col gap-3 p-4 lg:p-5">
            <div className="space-y-1.5">
              <h1 className="text-base font-semibold tracking-tight text-[color:var(--ct-foreground-strong)]">
                Project Post Lab
              </h1>
              <p className="text-xs leading-relaxed text-[color:var(--ct-foreground-muted)]">
                Pick a project, choose a style, then generate ready-to-post tweets and threads based on your own research cards.
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--ct-foreground-muted)]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or ticker..."
                  className="h-8 rounded-full border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-muted)] pl-8 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[10px] text-[color:var(--ct-foreground-muted)]">
                <span className="mr-1 font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                  Chains
                </span>
                <button
                  type="button"
                  onClick={() => setChainFilter("all")}
                  className={clsx(
                    "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors duration-150",
                    chainFilter === "all"
                      ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                      : "border-[color:var(--ct-border-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)]"
                  )}
                >
                  All
                </button>
                {chains.map((chain) => (
                  <button
                    key={chain}
                    type="button"
                    onClick={() => setChainFilter(chain)}
                    className={clsx(
                      "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors duration-150",
                      chainFilter === chain
                        ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                        : "border-[color:var(--ct-border-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)]"
                    )}
                  >
                    {chain}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[10px] text-[color:var(--ct-foreground-muted)]">
                <span className="mr-1 font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                  Categories
                </span>
                <button
                  type="button"
                  onClick={() => setCategoryFilter("all")}
                  className={clsx(
                    "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors duration-150",
                    categoryFilter === "all"
                      ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                      : "border-[color:var(--ct-border-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)]"
                  )}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={clsx(
                      "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors duration-150",
                      categoryFilter === cat
                        ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                        : "border-[color:var(--ct-border-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)]"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-2 flex-1 space-y-2 overflow-hidden rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-muted)] p-2">
              {projectsLoading && (
                <div className="flex h-40 items-center justify-center text-xs text-[color:var(--ct-foreground-muted)]">
                  Loading projects…
                </div>
              )}
              {!projectsLoading && projectsError && (
                <div className="flex h-40 items-center justify-center text-xs text-red-400">
                  {projectsError}
                </div>
              )}
              {!projectsLoading && !projectsError && filteredProjects.length === 0 && (
                <div className="flex h-40 items-center justify-center text-xs text-[color:var(--ct-foreground-muted)]">
                  No projects found. Add PROJECT_POST_CARD_V1 files under backend/project_posts.
                </div>
              )}
              {!projectsLoading && !projectsError && filteredProjects.length > 0 && (
                <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
                  {filteredProjects.map((p) => {
                    const isActive = p.id === selectedProjectId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProjectId(p.id)}
                        className={clsx(
                          "w-full rounded-2xl border p-3 text-left transition",
                          "bg-[color:var(--ct-panel)]/60 hover:bg-[color:var(--ct-panel)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]",
                          isActive
                            ? "border-[color:var(--ct-accent)] shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
                            : "border-[color:var(--ct-border-subtle)]"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col gap-0.5">
                            <div className="text-xs font-medium text-[color:var(--ct-foreground-strong)]">
                              {p.name}
                              {p.ticker ? <span className="text-[color:var(--ct-foreground-muted)]"> ({p.ticker})</span> : null}
                            </div>
                            {p.one_line_pitch ? (
                              <p className="line-clamp-2 text-[11px] text-[color:var(--ct-foreground-muted)]">
                                {p.one_line_pitch}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex flex-wrap justify-end gap-1">
                              {p.primary_chain ? (
                                <span className="rounded-full border border-[color:var(--ct-border-subtle)] px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                                  {p.primary_chain}
                                </span>
                              ) : null}
                              {p.category ? (
                                <span className="rounded-full border border-[color:var(--ct-border-subtle)] px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                                  {p.category}
                                </span>
                              ) : null}
                            </div>
                            {p.stage ? (
                              <span className="text-[9px] text-[color:var(--ct-foreground-muted)]">
                                {p.stage}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Right: Composer + Result */}
          <section className="ct-card flex flex-col gap-3 p-4 lg:p-5">
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                Selected project
              </p>
              {selectedProject ? (
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[color:var(--ct-foreground-strong)]">
                      {selectedProject.name}
                    </span>
                    {selectedProject.ticker ? (
                      <span className="rounded-full border border-[color:var(--ct-border-subtle)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                        {selectedProject.ticker}
                      </span>
                    ) : null}
                  </div>
                  {selectedProject.one_line_pitch ? (
                    <p className="text-xs text-[color:var(--ct-foreground-muted)]">
                      {selectedProject.one_line_pitch}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-1 text-[10px] text-[color:var(--ct-foreground-muted)]">
                    {selectedProject.primary_chain ? (
                      <span className="rounded-full border border-[color:var(--ct-border-subtle)] px-2 py-0.5">
                        {selectedProject.primary_chain}
                      </span>
                    ) : null}
                    {selectedProject.category ? (
                      <span className="rounded-full border border-[color:var(--ct-border-subtle)] px-2 py-0.5">
                        {selectedProject.category}
                      </span>
                    ) : null}
                    {selectedProject.stage ? (
                      <span className="rounded-full border border-[color:var(--ct-border-subtle)] px-2 py-0.5">
                        {selectedProject.stage}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[color:var(--ct-foreground-muted)]">
                  Select a project from the list to start.
                </p>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                  Post type
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--ct-border-subtle)] text-[10px] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)] hover:text-[color:var(--ct-foreground-strong)]"
                      aria-label="Post type presets"
                    >
                      ?
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="mb-1 text-xs font-medium">Post type presets</p>
                    <ul className="space-y-1 text-xs">
                      <li>
                        <span className="font-semibold">Short, casual</span> – 20–35 word quick reaction, ideal for replies.
                      </li>
                      <li>
                        <span className="font-semibold">Medium length</span> – 40–80 words with context + a clear angle.
                      </li>
                      <li>
                        <span className="font-semibold">Long detailed</span> – 120–200 word mini-explainer or deep dive.
                      </li>
                      <li>
                        <span className="font-semibold">Thread (4–6)</span> – structured multi-tweet breakdown with a hook and closing take.
                      </li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setUiPostKind("short")}
                  className={clsx(
                    "rounded-xl border px-3 py-2 text-left",
                    uiPostKind === "short"
                      ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                      : "border-[color:var(--ct-border-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)]"
                  )}
                >
                  <div className="font-medium">Short, casual</div>
                  <p className="mt-0.5 text-[11px]">
                    One quick 20–35 word take.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setUiPostKind("medium")}
                  className={clsx(
                    "rounded-xl border px-3 py-2 text-left",
                    uiPostKind === "medium"
                      ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                      : "border-[color:var(--ct-border-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)]"
                  )}
                >
                  <div className="font-medium">Medium length</div>
                  <p className="mt-0.5 text-[11px]">
                    40–80 words with context + angle.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setUiPostKind("long")}
                  className={clsx(
                    "rounded-xl border px-3 py-2 text-left",
                    uiPostKind === "long"
                      ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                      : "border-[color:var(--ct-border-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)]"
                  )}
                >
                  <div className="font-medium">Long detailed</div>
                  <p className="mt-0.5 text-[11px]">
                    120–200 word mini-explainer.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setUiPostKind("thread")}
                  className={clsx(
                    "rounded-xl border px-3 py-2 text-left",
                    uiPostKind === "thread"
                      ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                      : "border-[color:var(--ct-border-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)]"
                  )}
                >
                  <div className="font-medium">Thread (4–6)</div>
                  <p className="mt-0.5 text-[11px]">
                    Structured multi-tweet breakdown.
                  </p>
                </button>
              </div>

              {uiPostKind === "medium" && (
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                    Tone
                  </p>
                  <div className="inline-flex rounded-full border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setMediumTone("casual")}
                      className={clsx(
                        "rounded-full px-3 py-1",
                        mediumTone === "casual"
                          ? "bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                          : "text-[color:var(--ct-foreground-muted)]"
                      )}
                    >
                      Casual
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediumTone("professional")}
                      className={clsx(
                        "rounded-full px-3 py-1",
                        mediumTone === "professional"
                          ? "bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                          : "text-[color:var(--ct-foreground-muted)]"
                      )}
                    >
                      Professional
                    </button>
                  </div>
                </div>
              )}


              {uiPostKind === "thread" && (
                <div className="mt-2 rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-muted)] p-3 text-[11px] text-[color:var(--ct-foreground-muted)]">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                    Thread structure preview
                  </p>
                  <ol className="list-decimal space-y-0.5 pl-4">
                    <li>Hook: 1–2 lines with a sharp takeaway or question.</li>
                    <li>Context: what the project is building and why it matters.</li>
                    <li>Evidence: 1–2 concrete details or metrics from the research card.</li>
                    <li>Risk / nuance: one honest caveat or trade-off.</li>
                    <li>Close: grounded, realistic takeaway with no hype.</li>
                  </ol>
                </div>
              )}

              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                    Quality mode
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--ct-border-subtle)] text-[10px] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)] hover:text-[color:var(--ct-foreground-strong)]"
                        aria-label="Quality mode details"
                      >
                        ?
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p className="mb-1 text-xs font-medium">Quality / speed trade-offs</p>
                      <ul className="space-y-1 text-xs">
                        <li>
                          <span className="font-semibold">Fast</span> – lowest latency, lighter reasoning, good for quick scans.
                        </li>
                        <li>
                          <span className="font-semibold">Balanced</span> – default for most runs; mixes speed and depth.
                        </li>
                        <li>
                          <span className="font-semibold">Pro</span> – slower and more token-heavy, better for nuanced posts and threads.
                        </li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="inline-flex rounded-full border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-0.5 text-[11px]">
                  {(["fast", "balanced", "pro"] as QualityMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setQualityMode(mode)}
                      className={clsx(
                        "rounded-full px-3 py-1 capitalize",
                        qualityMode === mode
                          ? "bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                          : "text-[color:var(--ct-foreground-muted)]"
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-[11px] text-[color:var(--ct-foreground-muted)]">
                <span>Output language:</span>
                <select
                  value={language}
                  onChange={(e) => {
                    const next = e.target.value || "en";
                    setLanguage(next);
                    try {
                      lsSet(LS.projectLabLang, next);
                    } catch {
                      // ignore
                    }
                  }}
                  className="h-7 rounded-full border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-muted)] px-2 text-[11px] text-[color:var(--ct-foreground-strong)]"
                >
                  {UI_LANGS.map((langOpt) => (
                    <option key={langOpt.id} value={langOpt.id}>
                      {langOpt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="default"
                  type="button"
                  disabled={resultLoading || !result}
                  onClick={() => handleGenerate("reroll")}
                  className="h-8 rounded-full border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-muted)] px-3 text-xs"
                >
                  Reroll
                </Button>
                <Button
                  size="sm"
                  type="button"
                  disabled={resultLoading || !selectedProject}
                  onClick={() => handleGenerate("normal")}
                  className="h-9 w-full rounded-full bg-[color:var(--ct-accent)] px-4 text-xs font-medium text-black hover:bg-[color:var(--ct-accent-strong)] sm:h-8 sm:w-auto"
                >
                  {uiPostKind === "thread" ? "Generate thread" : "Generate post"}
                </Button>
              </div>
            </div>

            <div className="mt-4 flex-1 space-y-2 border-t border-[color:var(--ct-border-subtle)] pt-3" aria-live="polite" aria-atomic="false">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                  Result
                </p>
                <div className="flex items-center gap-2 text-[10px]">
                  <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-muted)] px-2 py-0.5">
                    <span
                      className={clsx(
                        "h-1.5 w-1.5 rounded-full",
                        resultLoading
                          ? "animate-pulse bg-[color:var(--ct-accent)]"
                          : resultError
                          ? "bg-red-400"
                          : result
                          ? "bg-[color:var(--ct-ok)]"
                          : "bg-[color:var(--ct-border-subtle)]"
                      )}
                    />
                    <span className="text-[10px] text-[color:var(--ct-foreground-muted)]" aria-live="polite">
                      {resultLoading
                        ? "Generating…"
                        : resultError
                        ? "Error"
                        : result
                        ? "Ready"
                        : "Idle"}
                    </span>
                  </div>
                </div>
              </div>
              {configSummary && (
                <div className="mt-1 flex justify-between gap-2">
                  <span className="inline-flex items-center rounded-full border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-muted)] px-2 py-0.5 text-[10px] text-[color:var(--ct-foreground-muted)]">
                    {configSummary}
                  </span>
                  {resultError ? (
                    <span className="text-[10px] text-red-400">{resultError}</span>
                  ) : null}
                </div>
              )}
              {!result && !resultLoading && (
                <p className="text-xs text-[color:var(--ct-foreground-muted)]">
                  When you generate, the post or thread will appear here using your project&apos;s PROJECT_POST_CARD_V1 as context.
                </p>
              )}
              {resultLoading && (
                <div className="flex h-40 items-center justify-center text-xs text-[color:var(--ct-foreground-muted)]">
                  Generating…
                </div>
              )}
              {!resultLoading && result && !isThread && (
                <div className="flex flex-col gap-2">
                  <div className="rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-3 text-sm leading-relaxed text-[color:var(--ct-foreground-strong)]">
                    {result.text}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      type="button"
                      className="h-8 rounded-full border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] px-3 text-xs"
                      onClick={() => copyText(result.text)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
              {!resultLoading && result && isThread && (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                      Thread ({(result as any).tweets.length} tweets)
                    </p>
                    <Button
                      size="sm"
                      variant="default"
                      type="button"
                      className="h-7 rounded-full border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] px-3 text-[11px]"
                      onClick={() =>
                        copyText(
                          (result as any).tweets
                            .map((t: string) => t.trim())
                            .join("\n\n")
                        )
                      }
                    >
                      Copy full thread
                    </Button>
                  </div>
                  <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1">
                    {(result as any).tweets.map((tweet: string, idx: number) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-3 text-xs leading-relaxed text-[color:var(--ct-foreground-strong)]"
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] text-[color:var(--ct-foreground-muted)]">
                          <span className="font-medium">Tweet {idx + 1}</span>
                          <button
                            type="button"
                            className="text-[10px] text-[color:var(--ct-foreground-muted)] hover:text-[color:var(--ct-accent)]"
                            onClick={() => copyText(tweet)}
                          >
                            Copy
                          </button>
                        </div>
                        <p>{tweet}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </motion.div>

            {selectedProjectId && projectHistory[selectedProjectId]?.length ? (
          <section className="mt-3 rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                Recent for this project (local)
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!selectedProjectId) return;
                  setProjectHistory((prev) => {
                    const next: ProjectHistoryMap = { ...prev };
                    delete next[selectedProjectId];
                    try {
                      lsSetJson(LS.projectLabHistory, next);
                    } catch {
                      // ignore
                    }
                    return next;
                  });
                }}
                className="text-[10px] text-[color:var(--ct-foreground-muted)] hover:text-[color:var(--ct-foreground-soft)]"
              >
                Clear history
              </button>
            </div>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {projectHistory[selectedProjectId]?.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setResult(entry.response)}
                  className="flex flex-col items-start gap-1 rounded-xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-muted)] px-2.5 py-2 text-left hover:border-[color:var(--ct-border-strong)]"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-[color:var(--ct-foreground-strong)]">
                      {entry.postMode === "thread_4_6" ? "Thread (4–6)" : "Single post"}
                    </span>
                    <span className="text-[10px] text-[color:var(--ct-foreground-muted)]" aria-live="polite">
                      {new Date(entry.createdAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[color:var(--ct-foreground-muted)]">
                    <span className="rounded-full bg-[color:var(--ct-panel)] px-2 py-0.5">
                      {entry.language?.toUpperCase?.() || "EN"}
                    </span>
                    <span className="rounded-full bg-[color:var(--ct-panel)] px-2 py-0.5">
                      {entry.qualityMode === "fast"
                        ? "Fast"
                        : entry.qualityMode === "pro"
                        ? "Pro"
                        : "Balanced"}
                    </span>
                    {entry.uiPostKind === "medium" && entry.tone ? (
                      <span className="rounded-full bg-[color:var(--ct-panel)] px-2 py-0.5">
                        {entry.tone === "professional" ? "Professional" : "Casual"}
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </section>
            ) : null}
          </>
        )}


        {/* Market + Off-topic labs */}

        {activeLab === "market" && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mt-4"
          >
          {/* Market Post Lab */}
          <section className="ct-card flex flex-col gap-3 p-4 lg:p-5">
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-ok)]">
                Market posts
              </p>
              <h2 className="text-sm font-semibold tracking-tight text-[color:var(--ct-foreground-strong)]">
                Market Post Lab
              </h2>
              <p className="text-xs leading-relaxed text-[color:var(--ct-foreground-muted)]">
                Pick a token, then generate grounded market takes with live CoinGecko data in CrownTALK tone.
              </p>
            </div>

            <div className="mt-2 grid gap-3 text-xs sm:grid-cols-[minmax(0,0.7fr)_minmax(0,0.3fr)]">
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                    Asset
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["BTC", "ETH", "SOL", "BNB"] as string[]).map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => setMarketAsset(sym)}
                        className={clsx(
                          "rounded-full border px-3 py-1 text-[11px] transition-colors duration-150",
                          marketAsset === sym
                            ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                            : "border-[color:var(--ct-border-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)]"
                        )}
                      >
                        {sym}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setMarketAsset("RANDOM")}
                      className={clsx(
                        "rounded-full border px-3 py-1 text-[11px] transition-colors duration-150",
                        marketAsset === "RANDOM"
                          ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                          : "border-[color:var(--ct-border-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)]"
                      )}
                    >
                      Random
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                    Post type
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMarketMode("short_casual")}
                      className={clsx(
                        "rounded-xl border px-3 py-2 text-left",
                        marketMode === "short_casual"
                          ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                          : "border-[color:var(--ct-border-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)]"
                      )}
                    >
                      <div className="font-medium">Short, casual</div>
                      <p className="mt-0.5 text-[11px]">One quick 20–35 word take.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarketMode("medium_analysis")}
                      className={clsx(
                        "rounded-xl border px-3 py-2 text-left",
                        marketMode === "medium_analysis"
                          ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                          : "border-[color:var(--ct-border-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)]"
                      )}
                    >
                      <div className="font-medium">Medium analysis</div>
                      <p className="mt-0.5 text-[11px]">40–80 words with short market context.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarketMode("thread_4_6")}
                      className={clsx(
                        "rounded-xl border px-3 py-2 text-left",
                        marketMode === "thread_4_6"
                          ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                          : "border-[color:var(--ct-border-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)]"
                      )}
                    >
                      <div className="font-medium">Thread (4–6)</div>
                      <p className="mt-0.5 text-[11px]">Structured market breakdown thread.</p>
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                      Tone
                    </p>
                    <div className="inline-flex rounded-full border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setMarketTone("casual")}
                        className={clsx(
                          "rounded-full px-3 py-1",
                          marketTone === "casual"
                            ? "bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                            : "text-[color:var(--ct-foreground-muted)]"
                        )}
                      >
                        Casual
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarketTone("professional")}
                        className={clsx(
                          "rounded-full px-3 py-1",
                          marketTone === "professional"
                            ? "bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                            : "text-[color:var(--ct-foreground-muted)]"
                        )}
                      >
                        Professional
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                      Quality mode
                    </p>
                    <div className="inline-flex rounded-full border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-0.5 text-[11px]">
                      {(["fast", "balanced", "pro"] as QualityMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setMarketQuality(mode)}
                          className={clsx(
                            "rounded-full px-3 py-1 capitalize",
                            marketQuality === mode
                              ? "bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                              : "text-[color:var(--ct-foreground-muted)]"
                          )}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-muted)] p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-[11px] text-[color:var(--ct-foreground-muted)]">
                    <span>Output language:</span>
                    <select
                      value={language}
                      onChange={(e) => {
                        const next = e.target.value || "en";
                        setLanguage(next);
                        try {
                          lsSet(LS.projectLabLang, next);
                        } catch {
                          // ignore
                        }
                      }}
                      className="h-7 rounded-full border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-muted)] px-2 text-[11px] text-[color:var(--ct-foreground-strong)]"
                    >
                      {UI_LANGS.map((langOpt) => (
                        <option key={langOpt.id} value={langOpt.id}>
                          {langOpt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      disabled={marketLoading || !marketResult}
                      onClick={() => handleGenerateMarket("reroll")}
                      className="h-7 rounded-full border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] px-3 text-[11px]"
                    >
                      Reroll
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      type="button"
                      disabled={marketLoading}
                      onClick={() => handleGenerateMarket("normal")}
                      className="h-9 w-full rounded-full bg-[color:var(--ct-accent)] px-4 text-[11px] font-medium text-black hover:bg-[color:var(--ct-accent-strong)] sm:h-7 sm:w-auto"
                    >
                      {marketMode === "thread_4_6" ? "Generate thread" : "Generate post"}
                    </Button>
                  </div>
                </div>

                <div className="mt-1 flex-1 space-y-2 rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-muted)] p-3" aria-live="polite" aria-atomic="false">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                      Result
                    </p>
                    <div className="flex items-center gap-2 text-[10px]">
                      <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-muted)] px-2 py-0.5">
                        <span
                          className={clsx(
                            "h-1.5 w-1.5 rounded-full",
                            marketLoading
                              ? "animate-pulse bg-[color:var(--ct-accent)]"
                              : marketError
                              ? "bg-red-400"
                              : marketResult
                              ? "bg-[color:var(--ct-ok)]"
                              : "bg-[color:var(--ct-border-subtle)]"
                          )}
                        />
                        <span className="text-[10px] text-[color:var(--ct-foreground-muted)]" aria-live="polite">
                          {marketLoading
                            ? "Generating…"
                            : marketError
                            ? "Error"
                            : marketResult
                            ? "Ready"
                            : "Idle"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {marketError ? (
                    <p className="mt-1 text-[10px] text-red-400">{marketError}</p>
                  ) : null}
                  {!marketResult && !marketLoading && (
                    <p className="text-xs text-[color:var(--ct-foreground-muted)]">
                      When you generate, a live market take for the selected asset will appear here.
                    </p>
                  )}
                  {marketLoading && (
                    <div className="flex h-32 items-center justify-center text-xs text-[color:var(--ct-foreground-muted)]">
                      Generating…
                    </div>
                  )}
                  {!marketLoading && marketResult && !marketIsThread && (
                    <div className="flex flex-col gap-2">
                      <div className="rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-3 text-sm leading-relaxed text-[color:var(--ct-foreground-strong)]">
                        {marketResult.text}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          type="button"
                          className="h-7 rounded-full border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] px-3 text-[11px]"
                          onClick={() => copyText(marketResult.text)}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  )}
                  {!marketLoading && marketResult && marketIsThread && (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between gap-2">
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                          Thread {(marketResult as any).tweets ? `(${(marketResult as any).tweets.length} tweets)` : ""}
                        </p>
                        <Button
                          size="sm"
                          variant="default"
                          type="button"
                          className="h-7 rounded-full border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] px-3 text-[11px]"
                          onClick={() =>
                            copyText(
                              (marketResult as any).tweets
                                .map((t: string) => t.trim())
                                .join("\n\n")
                            )
                          }
                        >
                          Copy full thread
                        </Button>
                      </div>
                      <div className="flex max-h-[260px] flex-col gap-2 overflow-y-auto pr-1">
                        {(marketResult as any).tweets?.map((tweet: string, idx: number) => (
                          <div
                            key={idx}
                            className="rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-3 text-xs leading-relaxed text-[color:var(--ct-foreground-strong)]"
                          >
                            <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] text-[color:var(--ct-foreground-muted)]">
                              <span className="font-medium">Tweet {idx + 1}</span>
                              <button
                                type="button"
                                className="text-[10px] text-[color:var(--ct-foreground-muted)] hover:text-[color:var(--ct-accent)]"
                                onClick={() => copyText(tweet)}
                              >
                                Copy
                              </button>
                            </div>
                            <p>{tweet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          </motion.section>
        )}

        {activeLab === "offtopic" && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mt-4"
          >
          {/* Off-topic / GM Lab */}
          <section className="ct-card flex flex-col gap-3 p-4 lg:p-5">
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-accent)]">
                Off-topic &amp; time-of-day
              </p>
              <h2 className="text-sm font-semibold tracking-tight text-[color:var(--ct-foreground-strong)]">
                Off-topic Post Lab
              </h2>
              <p className="text-xs leading-relaxed text-[color:var(--ct-foreground-muted)]">
                Generate GM, GN, and in-between CT thoughts that match CrownTALK tone.
              </p>
            </div>

            <div className="mt-2 grid gap-3 text-xs sm:grid-cols-[minmax(0,0.7fr)_minmax(0,0.3fr)]">
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                    Mood / time of day
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: "gm_morning", kind: "gm_morning", label: "GM (morning)" },
                      { key: "noon", kind: "noon", label: "Noon" },
                      { key: "afternoon", kind: "afternoon", label: "Afternoon" },
                      { key: "evening", kind: "evening", label: "Evening" },
                      { key: "gn_night", kind: "evening", label: "GN (night)" },
                      { key: "random", kind: "random", label: "Random thought" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setOfftopicKind(opt.kind as OfftopicKind)}
                        className={clsx(
                          "rounded-full border px-3 py-1 text-[11px] transition-colors duration-150",
                          offtopicKind === (opt.kind as OfftopicKind)
                            ? "border-[color:var(--ct-accent)] bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                            : "border-[color:var(--ct-border-subtle)] text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-border-strong)]"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                      Length
                    </p>
                    <div className="inline-flex rounded-full border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setOfftopicMode("short")}
                        className={clsx(
                          "rounded-full px-3 py-1",
                          offtopicMode === "short"
                            ? "bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                            : "text-[color:var(--ct-foreground-muted)]"
                        )}
                      >
                        Short
                      </button>
                      <button
                        type="button"
                        onClick={() => setOfftopicMode("semi_mid")}
                        className={clsx(
                          "rounded-full px-3 py-1",
                          offtopicMode === "semi_mid"
                            ? "bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                            : "text-[color:var(--ct-foreground-muted)]"
                        )}
                      >
                        Semi-mid
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                      Tone
                    </p>
                    <div className="inline-flex rounded-full border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setOfftopicTone("casual")}
                        className={clsx(
                          "rounded-full px-3 py-1",
                          offtopicTone === "casual"
                            ? "bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                            : "text-[color:var(--ct-foreground-muted)]"
                        )}
                      >
                        Casual
                      </button>
                      <button
                        type="button"
                        onClick={() => setOfftopicTone("professional")}
                        className={clsx(
                          "rounded-full px-3 py-1",
                          offtopicTone === "professional"
                            ? "bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                            : "text-[color:var(--ct-foreground-muted)]"
                        )}
                      >
                        Professional
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                    Quality mode
                  </p>
                  <div className="inline-flex rounded-full border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-0.5 text-[11px]">
                    {(["fast", "balanced", "pro"] as QualityMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setOfftopicQuality(mode)}
                        className={clsx(
                          "rounded-full px-3 py-1 capitalize",
                          offtopicQuality === mode
                            ? "bg-[color:var(--ct-accent-soft)] text-[color:var(--ct-accent)]"
                            : "text-[color:var(--ct-foreground-muted)]"
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-muted)] p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-[11px] text-[color:var(--ct-foreground-muted)]">
                    <span>Output language:</span>
                    <select
                      value={language}
                      onChange={(e) => {
                        const next = e.target.value || "en";
                        setLanguage(next);
                        try {
                          lsSet(LS.projectLabLang, next);
                        } catch {
                          // ignore
                        }
                      }}
                      className="h-7 rounded-full border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-muted)] px-2 text-[11px] text-[color:var(--ct-foreground-strong)]"
                    >
                      {UI_LANGS.map((langOpt) => (
                        <option key={langOpt.id} value={langOpt.id}>
                          {langOpt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      disabled={offtopicLoading || !hasOfftopic}
                      onClick={() => handleGenerateOfftopic("reroll")}
                      className="h-7 rounded-full border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] px-3 text-[11px]"
                    >
                      Reroll
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      type="button"
                      disabled={offtopicLoading}
                      onClick={() => handleGenerateOfftopic("normal")}
                      className="h-9 w-full rounded-full bg-[color:var(--ct-accent)] px-4 text-[11px] font-medium text-black hover:bg-[color:var(--ct-accent-strong)] sm:h-7 sm:w-auto"
                    >
                      Generate post
                    </Button>
                  </div>
                </div>

                <div className="mt-1 flex-1 space-y-2 rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-muted)] p-3" aria-live="polite" aria-atomic="false">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                      Result
                    </p>
                    <div className="flex items-center gap-2 text-[10px]">
                      <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-muted)] px-2 py-0.5">
                        <span
                          className={clsx(
                            "h-1.5 w-1.5 rounded-full",
                            offtopicLoading
                              ? "animate-pulse bg-[color:var(--ct-accent)]"
                              : offtopicError
                              ? "bg-red-400"
                              : offtopicResult
                              ? "bg-[color:var(--ct-ok)]"
                              : "bg-[color:var(--ct-border-subtle)]"
                          )}
                        />
                        <span className="text-[10px] text-[color:var(--ct-foreground-muted)]" aria-live="polite">
                          {offtopicLoading
                            ? "Generating…"
                            : offtopicError
                            ? "Error"
                            : offtopicResult
                            ? "Ready"
                            : "Idle"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {offtopicError ? (
                    <p className="mt-1 text-[10px] text-red-400">{offtopicError}</p>
                  ) : null}
                  {!hasOfftopic && !offtopicLoading && (
                    <p className="text-xs text-[color:var(--ct-foreground-muted)]">
                      When you generate, a time-of-day or random thought post will appear here.
                    </p>
                  )}
                  {offtopicLoading && (
                    <div className="flex h-32 items-center justify-center text-xs text-[color:var(--ct-foreground-muted)]">
                      Generating…
                    </div>
                  )}
                  {!offtopicLoading && hasOfftopic && offtopicResult && (
                    <div className="flex flex-col gap-2">
                      <div className="rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-3 text-sm leading-relaxed text-[color:var(--ct-foreground-strong)]">
                        {offtopicResult.text}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          type="button"
                          className="h-7 rounded-full border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] px-3 text-[11px]"
                          onClick={() => copyText(offtopicResult.text)}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
          </motion.section>
        )}

      </main>
      </TooltipProvider>
    </>
  );
}