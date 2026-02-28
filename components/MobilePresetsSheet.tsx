
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import clsx from "clsx";

export default function MobilePresetsSheet({
  open,
  onOpenChange,
  preset,
  setPreset,
  voice,
  setVoice,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preset: string;
  setPreset: (v: string) => void;
  voice: number;
  setVoice: (v: number) => void;
}) {
  const presets = [
    { key: "auto", label: "Auto", desc: "Let CrownTALK decide." },
    { key: "congrats", label: "Congrats", desc: "Milestones, wins, airdrops." },
    { key: "support", label: "Support", desc: "Sad posts, setbacks, empathy." },
    { key: "builder", label: "Builder", desc: "Shipping, devlogs, product updates." },
    { key: "defi", label: "DeFi", desc: "Yields, TVL, LP, mechanics." },
    { key: "perps", label: "Perps", desc: "Funding, OI, leverage, liquidations." },
    { key: "scam", label: "Scam alert", desc: "Rugs, hacks, phishing warnings." },
    { key: "greeting", label: "GM/GN", desc: "Short, natural greetings." },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed bottom-0 left-0 right-0 top-auto max-h-[80vh] translate-y-0 rounded-t-[28px] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)] p-0 shadow-[0_-20px_80px_rgba(0,0,0,0.55)]">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-base">Presets</DialogTitle>
          <div className="mt-2 h-1.5 w-12 rounded-full bg-white/10 mx-auto" />
        </DialogHeader>

        <div className="px-4 pb-5 pt-2 overflow-auto">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs opacity-70">Voice</div>
              <div className="text-[11px] opacity-70">
                {voice === 0 ? "Pro" : voice === 1 ? "Neutral" : voice === 2 ? "Degen" : voice === 3 ? "Builder" : "Analyst"}
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={4}
              step={1}
              value={voice}
              onChange={(e) => setVoice(Number(e.target.value))}
              className="w-full accent-[color:var(--ct-accent)]"
            />
            <div className="flex justify-between text-[10px] opacity-60">
              <span>Pro</span><span>Neutral</span><span>Degen</span><span>Builder</span><span>Analyst</span>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setPreset(p.key);
                  onOpenChange(false);
                }}
                className={clsx(
                  "rounded-[20px] border p-3 text-left transition",
                  "border-[color:var(--ct-border)] bg-[color:var(--ct-surface)]",
                  p.key === preset
                    ? "border-[color:var(--ct-accent)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--ct-accent)_35%,transparent)]"
                    : "hover:bg-white/5"
                )}
              >
                <div className="text-sm font-semibold">{p.label}</div>
                <div className="text-[11px] opacity-70">{p.desc}</div>
              </button>
            ))}
          </div>

          <div className="mt-4 text-[11px] opacity-60">
            Tip: Presets work great with “Fast mode” off when you want maximum quality.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
