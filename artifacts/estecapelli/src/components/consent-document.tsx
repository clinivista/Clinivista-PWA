import type { ReactNode } from "react";
import { PHOTO_CONSENT_UI } from "@/lib/photo-consent-i18n";
import type { LangCode } from "@/lib/language";

type Props = {
  lang: LangCode;
  clinicName: string;
  clinicLogo?: string | null;
  patientName?: string;
  title: string;
  intro: string;
  points: string[];
  /** Casilla de aceptación, firma, etc.: se muestra al pie del documento. */
  children?: ReactNode;
  /** Nivel del título: h1 en la página propia, h2 cuando va dentro de otra página. */
  heading?: "h1" | "h2";
};

/**
 * La autorización como documento formal: encabezado con el logo y el nombre de la clínica, datos del paciente,
 * puntos numerados y, al pie, lo que el paciente debe hacer (aceptar, firmar). Se usa en el enlace y en la firma en pantalla.
 */
export function ConsentDocument({ lang, clinicName, clinicLogo, patientName, title, intro, points, children, heading: Heading = "h1" }: Props) {
  const ui = PHOTO_CONSENT_UI[lang];
  const date = new Date().toLocaleDateString(lang, { dateStyle: "long" });
  return (
    <article className="overflow-hidden rounded-3xl border border-[#E8E4DE] bg-white shadow-sm" dir={lang === "ar" ? "rtl" : "ltr"} data-testid="consent-document">
      <header className="flex items-center gap-4 border-b border-[#E8E4DE] bg-[#F8F6F2] px-5 py-4 md:px-8">
        {clinicLogo ? (
          <img src={clinicLogo} alt={clinicName} className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-[#E8E4DE]" data-testid="consent-clinic-logo" />
        ) : (
          <div aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-xl font-extrabold text-primary-foreground">
            {(clinicName || "").trim().charAt(0).toUpperCase() || "C"}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold leading-tight text-foreground" data-testid="consent-clinic-name">{clinicName}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ui.sheetLabel}</p>
        </div>
      </header>

      <div className="space-y-5 px-5 py-6 md:px-8">
        <div>
          <Heading className="text-xl font-extrabold text-foreground md:text-2xl">{title}</Heading>
          {(patientName || date) && (
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {patientName ? (<div className="flex gap-2"><dt className="text-muted-foreground">{ui.patientLabel}:</dt><dd className="font-semibold">{patientName}</dd></div>) : null}
              <div className="flex gap-2"><dt className="text-muted-foreground">{ui.dateLabel}:</dt><dd className="font-semibold">{date}</dd></div>
            </dl>
          )}
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{intro}</p>
        </div>

        <ol className="space-y-3 text-sm leading-relaxed">
          {points.map((point, index) => (
            <li key={point} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
              <span className="pt-0.5">{point}</span>
            </li>
          ))}
        </ol>

        {children ? <div className="space-y-4 border-t border-[#E8E4DE] pt-5">{children}</div> : null}
      </div>
    </article>
  );
}
