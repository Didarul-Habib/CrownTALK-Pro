"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ThemeId =
  | "aurora"
  | "sakura"
  | "mono"
  | "neon"
  | "sunset"
  | "matrix"
  | "midnight";

const THEMES: Array<{ id: ThemeId; label: string }> = [
  { id: "neon", label: "Neon" },
  { id: "aurora", label: "Aurora" },
  { id: "sakura", label: "Sakura" },
  { id: "sunset", label: "Sunset" },
  { id: "matrix", label: "Matrix" },
  { id: "midnight", label: "Midnight" },
  { id: "mono", label: "Mono" },
];

export default function ThemePicker({
  value,
  onChange,
}: {
  value: ThemeId;
  onChange: (t: ThemeId) => void;
}) {
  const activeLabel = useMemo(
    () => THEMES.find((t) => t.id === value)?.label ?? value,
    [value]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4 opacity-80" />
          <span className="opacity-90">{activeLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onSelect={() => onChange(t.id)}
            className={t.id === value ? "bg-white/5" : undefined}
          >
            {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
