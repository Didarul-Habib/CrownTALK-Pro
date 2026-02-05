"use client";

import { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { getUiLang, type UiLang } from "@/lib/uiLanguage";
import { initAnalytics } from "@/lib/analytics";
import SplashScreen from "@/components/SplashScreen";
import InstallPrompt from "@/components/InstallPrompt";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [uiLang, setUiLangState] = useState<UiLang>("en");
  const [messages, setMessages] = useState<any>(null);
  const [showSplash, setShowSplash] = useState(false);

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: 1 },
          mutations: { retry: 0 },
        },
      }),
    []
  );

  useEffect(() => {
    initAnalytics();
    setUiLangState(getUiLang());
    // Premium refresh splash (once per hard-load)
    try {
      const seen = sessionStorage.getItem("ct_splash_seen");
      if (!seen) {
        setShowSplash(true);
        sessionStorage.setItem("ct_splash_seen", "1");
      }
    } catch {}
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const msgs = (await import(`../messages/${uiLang}.json`)).default;
        if (active) setMessages(msgs);
      } catch {
        const msgs = (await import(`../messages/en.json`)).default;
        if (active) setMessages(msgs);
      }
    })();
    return () => {
      active = false;
    };
  }, [uiLang]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "ct.uiLang" && e.newValue) setUiLangState(e.newValue as UiLang);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!messages) return <>{children}</>;

  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale={uiLang} messages={messages}>
        <SplashScreen show={showSplash} onDone={() => setShowSplash(false)} />
        <InstallPrompt />
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}
