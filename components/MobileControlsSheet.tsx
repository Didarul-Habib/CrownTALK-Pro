
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Controls from "@/components/Controls";
import type { Intent, Tone, QualityMode } from "@/lib/types";
import type { ThemeId } from "@/components/ThemeStudioBar";

export default function MobileControlsSheet({
  open,
  onOpenChange,
  baseUrl,
  langEn,
  setLangEn,
  langNative,
  setLangNative,
  nativeLang,
  setNativeLang,
  tone,
  setTone,
  intent,
  setIntent,
  includeAlternates,
  setIncludeAlternates,
  fastMode,
  setFastMode,
  qualityMode,
  setQualityMode,
  preset,
  setPreset,
  voice,
  setVoice,
  onGenerate,
  onCancel,
  onClear,
  loading,
  clearDisabled,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  baseUrl: string;

  langEn: boolean;
  setLangEn: (v: boolean) => void;
  langNative: boolean;
  setLangNative: (v: boolean) => void;
  nativeLang: string;
  setNativeLang: (v: string) => void;

  tone: Tone;
  setTone: (v: Tone) => void;
  intent: Intent;
  setIntent: (v: Intent) => void;

  includeAlternates: boolean;
  setIncludeAlternates: (v: boolean) => void;

  fastMode: boolean;
  setFastMode: (v: boolean) => void;

  qualityMode: QualityMode;
  setQualityMode: (v: QualityMode) => void;

  preset: string;
  setPreset: (v: string) => void;

  voice: number;
  setVoice: (v: number) => void;

  onGenerate: () => void;
  onCancel?: () => void;
  onClear?: () => void;
  loading: boolean;
  clearDisabled?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Centered modal (mobile-safe). DialogContent already positions itself
        // centered using left/top + translate. Mixing that with bottom/left/right
        // positioning can push the modal off-screen on mobile.
        className="p-0 max-h-[85vh] overflow-hidden flex flex-col border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)]"
      >
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-base">Controls</DialogTitle>
          <div className="mt-2 h-1.5 w-12 rounded-full bg-white/10 mx-auto" />
        </DialogHeader>
        <div className="px-3 pb-5 pt-2 overflow-auto flex-1">
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
            fastMode={fastMode}
            setFastMode={setFastMode}
            qualityMode={qualityMode}
            setQualityMode={setQualityMode}
            preset={preset}
            setPreset={setPreset}
            voice={voice}
            setVoice={setVoice}
            baseUrl={baseUrl}
            onGenerate={onGenerate}
            onCancel={onCancel}
            onClear={onClear}
            loading={loading}
            clearDisabled={clearDisabled}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
