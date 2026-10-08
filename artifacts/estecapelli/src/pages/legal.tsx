import type { ReactNode } from "react";
import { Link } from "wouter";
import { LanguagePicker } from "@/components/language-picker";
import { useLanguage } from "@/lib/language";
import { LEGAL_TEXT, type LegalDoc } from "@/lib/legal-i18n";
import { PORTAL_TEXT } from "@/lib/portal-i18n";
import { LOCALES } from "@/pages/portal";

// Datos de contacto que aparecen en las páginas legales. Cambia el correo aquí
// si la plataforma pasa a usar uno propio (por ejemplo contacto@clinivista.cl).
export const LEGAL_CONTACT_EMAIL = "jfferraezhp7@gmail.com";
const UPDATED = new Date("2026-10-08T12:00:00Z");

function Document({ doc }: { doc: (text: (typeof LEGAL_TEXT)["es"]) => LegalDoc }) {
  const { lang } = useLanguage();
  const text = LEGAL_TEXT[lang];
  const current = doc(text);
  const portal = PORTAL_TEXT[lang];

  // "{email}" and "{privacy}" inside a sentence become links.
  const render = (sentence: string): ReactNode[] =>
    sentence.split(/(\{email\}|\{privacy\})/).map((part, index) => {
      if (part === "{email}") return <a key={index} className="underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>;
      if (part === "{privacy}") return <Link key={index} href="/privacidad" className="underline">{text.privacyLinkText}</Link>;
      return part;
    });

  return (
    <div className="min-h-[100dvh] bg-[#F5F2EE] px-4 py-10 flex justify-center" dir={lang === "ar" ? "rtl" : "ltr"}>
      <article className="w-full max-w-2xl flex flex-col gap-5 text-sm leading-relaxed text-foreground">
        <LanguagePicker label={portal.language} />
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight">{current.title}</h1>
          <p className="text-xs text-muted-foreground">
            {text.company} · {text.updated}: {UPDATED.toLocaleDateString(LOCALES[lang], { dateStyle: "long", timeZone: "UTC" })}
          </p>
        </header>
        <p>{current.intro}</p>
        {current.sections.map((section) => (
          <section key={section.h} className="flex flex-col gap-3">
            <h2 className="text-lg font-bold mt-2">{section.h}</h2>
            {section.p?.map((sentence) => <p key={sentence}>{render(sentence)}</p>)}
            {section.ul && (
              <ul className="list-disc ps-5 flex flex-col gap-1">
                {section.ul.map((item) => <li key={item}>{render(item)}</li>)}
              </ul>
            )}
            {section.after?.map((sentence) => <p key={sentence}>{render(sentence)}</p>)}
          </section>
        ))}
        <nav className="flex gap-4 pt-4 text-xs text-muted-foreground border-t border-[#E8E4DE]" aria-label={text.docsNav}>
          <Link href="/privacidad" className="underline">{portal.privacy}</Link>
          <Link href="/terminos" className="underline">{portal.terms}</Link>
        </nav>
      </article>
    </div>
  );
}

export const Privacy = () => <Document doc={(text) => text.privacy} />;
export const Terms = () => <Document doc={(text) => text.terms} />;
