import { ChevronDown, Globe } from "lucide-react";
import { useLanguage, LANGS, type LangCode } from "@/lib/language";

/** Selector de idioma de las pantallas de entrada (globo + código) con un <select> nativo encima: accesible y sin librerías. */
export function PortalLanguageSelect({ label, testId = "home-language" }: { label: string; testId?: string }) {
  const { lang, setLang } = useLanguage();
  return (
    <label className="relative inline-flex h-11 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-[#0A1F4D] hover:bg-[#EAF2FC] focus-within:ring-2 focus-within:ring-[#1D5FD8]">
      <Globe className="h-5 w-5" aria-hidden="true" />
      <span aria-hidden="true">{lang.toUpperCase()}</span>
      <ChevronDown className="h-4 w-4" aria-hidden="true" />
      <select
        value={lang}
        onChange={(event) => setLang(event.target.value as LangCode)}
        aria-label={label}
        className="absolute inset-0 cursor-pointer opacity-0"
        data-testid={testId}
      >
        {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
      </select>
    </label>
  );
}
