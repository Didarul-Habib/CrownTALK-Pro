"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { LogOut, User as UserIcon, ExternalLink } from "lucide-react";
import type { UserProfile } from "@/lib/persist";

export default function UserMenu({
  user,
  onLogout,
}: {
  user: UserProfile;
  onLogout?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const initials = useMemo(() => {
    const parts = (user.name || "").trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "C";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (a + b).toUpperCase();
  }, [user.name]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-user-menu]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" data-user-menu>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "ct-btn ct-btn-sm",
          "gap-2",
          "bg-[color:var(--ct-surface)]"
        )}
        title={user.name}
      >
        <span
          className="grid h-7 w-7 place-items-center rounded-full border border-white/15"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--ct-accent) 45%, transparent), color-mix(in srgb, var(--ct-accent-2) 45%, transparent))",
            boxShadow: "0 0 0 1px rgba(255,255,255,.10) inset",
          }}
        >
          <span className="text-[11px] font-bold">{initials}</span>
        </span>
        <span className="hidden sm:inline text-xs opacity-90 max-w-[160px] truncate">{user.name}</span>
      </button>

      {open ? (
        <div
          className={clsx(
            "absolute right-0 mt-2 w-72 overflow-hidden rounded-3xl border shadow-2xl",
            "bg-[color:var(--ct-panel)] border-[color:var(--ct-border)] backdrop-blur-xl"
          )}
        >
          <div className="p-4">
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 opacity-80" />
              <div className="text-sm font-semibold tracking-tight">{user.name}</div>
            </div>
            {user.xUrl ? (
              <a
                href={user.xUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-xs opacity-80 hover:opacity-100"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="truncate max-w-[240px]">{user.xUrl}</span>
              </a>
            ) : (
              <div className="mt-2 text-xs opacity-70">X link not set</div>
            )}
          </div>

          <div className="border-t border-[color:var(--ct-border)] p-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout?.();
              }}
              className={clsx(
                "w-full ct-btn ct-btn-sm",
                "justify-start",
                "bg-transparent hover:bg-white/5"
              )}
            >
              <LogOut className="h-4 w-4 opacity-80" />
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
