import { Link } from "wouter";
import { BrandLogo } from "@/components/brand-logo";
import { LanguagePicker } from "@/components/language-picker";
import { ComplianceSeal, COMPLIANCE_PUBLIC } from "@/components/compliance-seal";
import { useLanguage } from "@/lib/language";
import { COMPLIANCE_TEXT } from "@/lib/compliance-i18n";
import { PORTAL_TEXT } from "@/lib/portal-i18n";
import NotFound from "@/pages/not-found";

// Página pública «Cumplimiento»: qué hace Clinivista, qué le toca a cada clínica y qué falta. Solo se muestra si está activada.
export function Compliance({ force = false }: { force?: boolean }) {
  const { lang } = useLanguage();
  const x = COMPLIANCE_TEXT[lang];
  const portal = PORTAL_TEXT[lang];
  if (!COMPLIANCE_PUBLIC && !force) return <NotFound />;
  const list = (items: string[]) => <ul className="list-disc ps-5 flex flex-col gap-1">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
  return (
    <div className="min-h-[100dvh] cv-page px-4 py-10 flex justify-center" dir={lang === "ar" ? "rtl" : "ltr"}>
      <article className="w-full max-w-2xl flex flex-col gap-5 text-sm leading-relaxed text-foreground">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" aria-label="Clinivista"><BrandLogo variant="logo-sin-lema" alt="Clinivista" className="h-9" /></Link>
          <LanguagePicker label={portal.language} />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">{x.title}</h1>
        <p>{x.intro}</p>
        <section className="flex flex-col gap-2"><h2 className="text-lg font-bold mt-2">{x.doTitle}</h2>{list(x.doItems)}</section>
        <section className="flex flex-col gap-2"><h2 className="text-lg font-bold mt-2">{x.clinicTitle}</h2>{list(x.clinicItems)}</section>
        <section className="flex flex-col gap-2"><h2 className="text-lg font-bold mt-2">{x.pendingTitle}</h2>{list(x.pendingItems)}</section>
        <p className="text-xs text-muted-foreground border-t border-[#E8E4DE] pt-4">{x.notice}</p>
        <div className="flex items-center justify-between gap-3">
          <Link href="/privacidad" className="underline text-xs text-muted-foreground">{portal.privacy}</Link>
          <ComplianceSeal />
        </div>
      </article>
    </div>
  );
}
