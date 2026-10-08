import { LANGS, useLanguage, type LangCode } from "@/lib/language";

/** Idioma de la aplicación para las páginas públicas (portal, legales). Se recuerda en el navegador. */
export function LanguagePicker({ label }: { label: string }) {
  const { lang, setLang } = useLanguage();
  return (
    <select
      aria-label={label}
      value={lang}
      onChange={(event) => setLang(event.target.value as LangCode)}
      className="self-end rounded-full border border-[#E8E4DE] bg-white px-3 py-1.5 text-sm font-medium text-gray-700"
    >
      {LANGS.map((item) => (
        <option key={item.code} value={item.code}>{item.flag} {item.name}</option>
      ))}
    </select>
  );
}
