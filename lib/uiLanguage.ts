export type UiLang =
  | "en"
  | "bn"
  | "hi"
  | "ar"
  | "ur"
  | "id"
  | "es"
  | "zh"
  | "ja"
  | "ko";

export const UI_LANGS: Array<{ id: UiLang; label: string }> = [
  { id: "en", label: "English" },
  { id: "bn", label: "বাংলা" },
  { id: "hi", label: "हिन्दी" },
  { id: "ar", label: "العربية" },
  { id: "ur", label: "اردو" },
  { id: "id", label: "Bahasa" },
  { id: "es", label: "Español" },
  { id: "zh", label: "中文" },
  { id: "ja", label: "日本語" },
  { id: "ko", label: "한국어" },
];

const KEY = "ct.uiLang";

export function getUiLang(): UiLang {
  if (typeof window === "undefined") return "en";
  const v = (localStorage.getItem(KEY) || "en") as UiLang;
  return (UI_LANGS.find((x) => x.id === v)?.id || "en") as UiLang;
}

export function setUiLang(lang: UiLang) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, lang);
}
