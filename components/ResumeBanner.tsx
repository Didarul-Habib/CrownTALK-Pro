"use client";

import clsx from "clsx";
import { Clock3, Play, X as CloseIcon } from "lucide-react";
import type { RunRecord } from "@/lib/persist";
import { translate, useUiLang } from "@/lib/i18n";

function formatTime(ts: number) {
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function ResumeBanner({
  record,
  onResume,
  onDismiss,
}: {
  record: RunRecord;
  onResume: () => void;
  onDismiss: () => void;
}) {
  const uiLang = useUiLang();
  const t = (key: string) => translate(key, uiLang);
  const title = record.label || t("resume.titleFallback");

  return (
    <div
      className={clsx(
        "ct-card",
        "mb-4 border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)]/80 p-4",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="ct-chip">
          <Clock3 className="h-4 w-4 opacity-80" />
          <span className="text-xs opacity-85">{t("resume.badge")}</span>
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">{title}</div>
          <div className="mt-0.5 text-xs opacity-70">
            {formatTime(record.at)} • {record.results.length} URL
            {record.results.length === 1 ? "" : "s"} • {record.okCount} {t("history.ok")} •{" "}
            {record.failedCount} {t("history.failed")}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 justify-end">
        <button type="button" className="ct-btn ct-btn-sm" onClick={onDismiss}>
          <CloseIcon className="h-4 w-4 opacity-80" />
          {t("resume.dismiss")}
        </button>
        <button type="button" className="ct-btn ct-btn-primary ct-btn-sm" onClick={onResume}>
          <Play className="h-4 w-4 opacity-90" />
          {t("resume.resume")}
        </button>
      </div>
    </div>
  );
}
