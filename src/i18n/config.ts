import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import csCommon from "./locales/cs/common.json";
import esCommon from "./locales/es/common.json";

export const SUPPORTED_LANGUAGES = ["en", "cs", "es"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = "lang";

const stored =
  typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
const initialLang: SupportedLanguage =
  stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)
    ? (stored as SupportedLanguage)
    : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon },
    cs: { common: csCommon },
    es: { common: esCommon },
  },
  lng: initialLang,
  fallbackLng: "en",
  defaultNS: "common",
  ns: ["common"],
  interpolation: { escapeValue: false },
  returnNull: false,
});

if (typeof document !== "undefined") {
  document.documentElement.lang = initialLang;
}

i18n.on("languageChanged", (lng) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, lng);
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
  }
});

export default i18n;
