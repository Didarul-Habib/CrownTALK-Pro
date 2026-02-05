"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Download } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  const canShow = useMemo(() => !!evt && !hidden, [evt, hidden]);

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip as any);
    return () => window.removeEventListener("beforeinstallprompt", onBip as any);
  }, []);

  if (!canShow) return null;

  return (
    <div className={clsx(
      "fixed bottom-4 right-4 z-[110]",
      "max-w-[320px] rounded-3xl border border-white/10 bg-black/45 backdrop-blur-xl",
      "p-3 shadow-2xl"
    )}>
      <div className="flex items-start gap-3">
        <div className="mt-1 rounded-2xl border border-white/10 bg-white/5 p-2">
          <Download className="h-4 w-4 opacity-80" />
        </div>
        <div className="min-w-0">
          <div className="text-[12px] font-semibold tracking-tight">Install CrownTALK</div>
          <div className="mt-0.5 text-[11px] opacity-70">
            Add to your home screen for faster launch and offline queuing.
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              className="ct-btn ct-btn-xs ct-btn-primary"
              onClick={async () => {
                try {
                  await evt?.prompt();
                  await evt?.userChoice;
                } finally {
                  setHidden(true);
                }
              }}
            >
              Install
            </button>
            <button className="ct-btn ct-btn-xs" onClick={() => setHidden(true)}>
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
