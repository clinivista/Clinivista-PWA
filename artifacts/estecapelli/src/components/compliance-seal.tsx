import { ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/lib/language";
import { COMPLIANCE_TEXT } from "@/lib/compliance-i18n";

/** El sello y la página «Cumplimiento» se publican solo cuando se activa VITE_COMPLIANCE_PUBLIC=on (después de la revisión legal). */
export const COMPLIANCE_PUBLIC = import.meta.env.VITE_COMPLIANCE_PUBLIC === "on";

// Sello «Diseñado para ayudar a cumplir la Ley 21.719». No es una certificación ni dice que se cumple todo: lo dice su propio texto.
export function ComplianceSeal() {
  const { lang } = useLanguage();
  const x = COMPLIANCE_TEXT[lang];
  if (!COMPLIANCE_PUBLIC) return null;
  return (
    <Link href="/cumplimiento" className="inline-flex items-center gap-3 rounded-2xl border border-[#E8E4DE] bg-white px-4 py-2.5 no-underline" data-testid="compliance-seal" aria-label={`${x.seal}. ${x.sealSub}`}>
      <ShieldCheck className="w-7 h-7 text-primary shrink-0" aria-hidden="true" />
      <span className="flex flex-col text-start leading-tight">
        <span className="text-sm font-bold text-foreground">{x.seal}</span>
        <span className="text-xs text-muted-foreground">{x.sealSub}</span>
      </span>
    </Link>
  );
}
