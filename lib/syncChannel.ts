const CH = "ct-sync";

type Msg =
  | { type: "draft"; value: string; at: number }
  | { type: "runs"; value: any; at: number }
  | { type: "clipboard"; value: any; at: number }
  | { type: "theme"; value: string; at: number };

function bc(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  try {
    return new BroadcastChannel(CH);
  } catch {
    return null;
  }
}

export function broadcast(msg: Msg) {
  const c = bc();
  if (!c) return;
  try {
    c.postMessage(msg);
  } catch {}
}

export function onBroadcast(handler: (msg: Msg) => void) {
  const c = bc();
  if (!c) return () => {};
  const onMsg = (e: MessageEvent) => handler(e.data as Msg);
  c.addEventListener("message", onMsg);
  return () => c.removeEventListener("message", onMsg);
}
