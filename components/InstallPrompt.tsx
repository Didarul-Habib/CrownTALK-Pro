"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Download } from "lucide-react";
import { translate, useUiLang } from "@/lib/i18n";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const STORAGE_KEY = "ct_install_prompt_meta_v1";

type InstallPromptMeta = {
  snoozedUntil?: number;
};

export default function InstallPrompt() {
  const uiLang = useUiLang();
  const t = (key: string) => translate(key, uiLang);

  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const meta = JSON.parse(raw) as InstallPromptMeta;
        if (meta.snoozedUntil && meta.snoozedUntil > Date.now()) {
          setSuppressed(true);
        }
      }
    } catch {
      // ignore
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip as any);
    return () => window.removeEventListener("beforeinstallprompt", onBip as any);
  }, []);

  const canShow = useMemo(
    () => !!evt && !hidden && !suppressed && ready,
    [evt, hidden, suppressed, ready],
  );

  const snooze = (days: number) => {
    try {
      const meta: InstallPromptMeta = {
        snoozedUntil: Date.now() + days * 24 * 60 * 60 * 1000,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
    } catch {
      // ignore
    }
    setHidden(true);
    setSuppressed(true);
  };

  if (!canShow) return null;

  return (
    <div
      className={clsx(
        "fixed bottom-4 right-4 z-[110]",
        "max-w-[320px] rounded-3xl border border-white/10 bg-black/45 backdrop-blur-xl",
        "shadow-[0_18px_45px_rgba(0,0,0,0.55)]",
      )}
    >
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/10">
            <Download className="h-4 w-4 opacity-90" />
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold tracking-tight">
              {t("install.title")}
            </div>
            <div className="mt-0.5 text-[11px] opacity-70">
              {t("install.body")}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                className="ct-btn ct-btn-xs ct-btn-primary"
                onClick={async () => {
                  try {
                    await evt?.prompt();
                    await evt?.userChoice;
                  } finally {
                    // After user responds, don't nag again for a long time
                    snooze(365);
                  }
                }}
              >
                {t("install.install")}
              </button>
              <button className="ct-btn ct-btn-xs" onClick={() => snooze(1)}>
                {t("install.notNow")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
