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
import type { UserProfile } from "@/lib/persist";
import { LS, lsGet, lsGetJson } from "@/lib/storage";
import type {
  ProjectCatalogItem,
  ProjectPostMode,
  ProjectPostResponse,
  QualityMode,
} from "@/lib/types";

type UiPostKind = "short" | "medium" | "long" | "thread";

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
  const [language] = useState<"en">("en");

  const [result, setResult] = useState<ProjectPostResponse | null>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);

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

  const isThread = result && "tweets" in result;

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

      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 pb-12 pt-6 lg:pb-16 lg:pt-10">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-[color:var(--ct-foreground-muted)] hover:text-[color:var(--ct-accent)]"
          >
            <span aria-hidden="true">←</span>
            <span>Back to Comment Generator</span>
          </Link>
          <span className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--ct-foreground-muted)]">
            Project Post Lab v1
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)]"
        >
          {/* Left: Project catalog */}
          <section className="flex flex-col gap-3 rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-4 lg:p-5">
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
                    "rounded-full border px-2 py-0.5",
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
                      "rounded-full border px-2 py-0.5",
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
                    "rounded-full border px-2 py-0.5",
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
                      "rounded-full border px-2 py-0.5",
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
          <section className="flex flex-col gap-3 rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-4 lg:p-5">
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

            <div className="mt-3 space-y-3 rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-muted)] p-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                Post type
              </p>
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

              <div className="mt-2 space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                  Quality mode
                </p>
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

            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="text-[11px] text-[color:var(--ct-foreground-muted)]">
                Output language: <span className="font-medium text-[color:var(--ct-foreground-strong)]">English</span>
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
                  className="h-8 rounded-full bg-[color:var(--ct-accent)] px-4 text-xs font-medium text-black hover:bg-[color:var(--ct-accent-strong)]"
                >
                  {uiPostKind === "thread" ? "Generate thread" : "Generate post"}
                </Button>
              </div>
            </div>

            <div className="mt-3 flex-1 space-y-2 rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel-muted)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ct-foreground-soft)]">
                  Result
                </p>
                {resultError ? (
                  <span className="text-[10px] text-red-400">{resultError}</span>
                ) : null}
              </div>
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
                  <div className="rounded-2xl border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] p-3 text-xs leading-relaxed text-[color:var(--ct-foreground-strong)]">
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
      </main>
    </>
  );
}
