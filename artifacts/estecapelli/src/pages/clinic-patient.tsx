import { useState } from "react";
import { Link, useParams, useSearch } from "wouter";
import { getGetClinicQueryKey, useGetClinic } from "@workspace/api-client-react";
import { AlertCircle, ArrowRight, Camera, ChevronRight, FileSearch, FileText, Info, Loader2, RotateCw, SearchX } from "lucide-react";
import isotipo from "@workspace/brand/svg/clinivista-isotipo.svg";
import PatientFlow, { hasStoredPatientToken } from "@/pages/patient";
import { BrandLogo } from "@/components/brand-logo";
import { PortalLanguageSelect } from "@/components/portal-language-select";
import { useLanguage } from "@/lib/language";
import { ACCESS_TEXT } from "@/lib/access-i18n";

// Dirección propia de cada clínica (/c/<slug>): UNA plantilla para todas. El nombre y el
// logo salen de GET /api/clinics/{slug} (name, logoDataUrl), los mismos que la clínica
// edita en «Identidad»; una clínica nueva aparece así sin configurar nada más.
// Si la clínica no existe no se muestra ninguna otra ni se cae en la principal.
// La bienvenida no altera el flujo: «Iniciar preevaluación» abre el mismo formulario
// con el mismo clinicSlug, y quien retoma (token en la URL, sesión guardada o vuelta
// de Google) entra directo, como antes.

const INK = "#0A1F4D";

/** Iniciales del nombre de la clínica (si no tiene logo). */
export const clinicInitials = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]!.toUpperCase()).join("") || "?";

function Shell({ children, label }: { children: React.ReactNode; label: string }) {
  const { lang } = useLanguage();
  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-br from-[#EEF5FE] via-white to-[#E8F2FE]"
      style={{ color: INK }}
      dir={lang === "ar" ? "rtl" : "ltr"}
      data-testid="clinic-welcome"
    >
      <span className="pointer-events-none absolute -end-48 top-10 h-[640px] w-[640px] rounded-full border-[40px] border-white/70" aria-hidden="true" />
      <header className="relative mx-auto flex h-[72px] max-w-[1100px] items-center justify-between gap-3 px-4 sm:px-6">
        {/* Clinivista queda como plataforma, en pequeño: la protagonista es la clínica */}
        <Link href="/" aria-label="Clinivista" className="rounded-lg opacity-90">
          <BrandLogo variant="logo-sin-lema" alt="Clinivista" className="h-7 sm:h-8" />
        </Link>
        <PortalLanguageSelect label={label} testId="clinic-language" />
      </header>
      <main className="relative mx-auto max-w-[920px] px-4 pb-12 sm:px-6">{children}</main>
    </div>
  );
}

function ClinicWelcome({ name, logoDataUrl, onStart }: { name: string; logoDataUrl: string | null; onStart: () => void }) {
  const { lang } = useLanguage();
  const a = ACCESS_TEXT[lang];
  const icons = [FileText, Camera, FileSearch];
  return (
    <Shell label={a.language}>
      <section className="flex flex-col items-center pt-4 text-center sm:pt-6">
        {logoDataUrl ? (
          <img src={logoDataUrl} alt={name} className="h-28 w-28 rounded-full bg-white object-contain p-3 shadow-[0_10px_30px_-12px_rgba(10,31,77,0.3)] ring-1 ring-slate-200 sm:h-32 sm:w-32" data-testid="clinic-logo" />
        ) : (
          <span className="flex h-28 w-28 items-center justify-center rounded-full bg-[#E3EEFC] text-4xl font-bold tracking-tight sm:h-32 sm:w-32 sm:text-5xl" aria-hidden="true" data-testid="clinic-initials">
            {clinicInitials(name)}
          </span>
        )}
        <p className="mt-4 text-[28px] font-bold leading-tight tracking-[-0.02em] sm:text-[34px]" data-testid="clinic-name">{name}</p>
        <div className="mt-4 flex w-full max-w-md items-center gap-3 text-sm text-[#4A5F82]">
          <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
          <span className="inline-flex items-center gap-1.5"><img src={isotipo} alt="" className="h-4 w-4" />{a.platform}</span>
          <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-[34px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[52px]">
          <span className="block">{a.welcomeLead}</span>
          <span className="block text-[#0B63E5]">{a.welcomeAccent}</span>
        </h1>
        <p className="mt-3 max-w-xl text-[17px] text-[#4A5F82] sm:text-lg">{a.welcomeSub}</p>
        <button
          type="button"
          onClick={onStart}
          className="mt-6 inline-flex min-h-[52px] items-center gap-2 rounded-xl bg-[#0B63E5] px-9 text-[17px] font-semibold text-white shadow-lg shadow-[#0B63E5]/25 transition-colors hover:bg-[#0A55C4]"
          data-testid="clinic-start"
        >
          {a.start}<ArrowRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
        </button>
      </section>

      <ol className="mx-auto mt-10 grid max-w-[760px] grid-cols-3 items-start gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
        {a.steps.map((label, i) => {
          const Icon = icons[i]!;
          return [
            <li key={label} className="flex flex-col items-center gap-2 text-center">
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF3FE] text-[#0B4FC4] sm:h-[72px] sm:w-[72px]" aria-hidden="true">
                <Icon className="h-7 w-7" />
                <span className="absolute -end-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#1D7BF2] text-sm font-bold text-white ring-2 ring-white">{i + 1}</span>
              </span>
              <span className="text-sm font-semibold sm:text-base">{label}</span>
            </li>,
            i < 2 ? <li key={`${label}-sep`} className="hidden pt-6 sm:block" aria-hidden="true"><ChevronRight className="h-6 w-6 text-slate-400 rtl:-scale-x-100" /></li> : null,
          ];
        })}
      </ol>

      <p className="mx-auto mt-8 flex max-w-[760px] items-start justify-center gap-2 rounded-xl bg-[#EEF3FA] px-4 py-3 text-center text-sm text-[#2D4373]">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{a.disclaimer}
      </p>
    </Shell>
  );
}

function Notice({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action: React.ReactNode }) {
  const { lang } = useLanguage();
  return (
    <Shell label={ACCESS_TEXT[lang].language}>
      <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-2xl bg-white p-8 text-center shadow-[0_18px_44px_-18px_rgba(10,31,77,0.25)]" role="alert">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF3FE] text-[#0B4FC4]" aria-hidden="true">{icon}</span>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-[15px] text-[#4A5F82]">{desc}</p>
        {action}
      </div>
    </Shell>
  );
}

export default function ClinicPatient() {
  const { slug = "" } = useParams<{ slug: string }>();
  const normalized = slug.toLowerCase();
  const search = new URLSearchParams(useSearch());
  const { lang } = useLanguage();
  const a = ACCESS_TEXT[lang];
  const { data, isLoading, isError, error, refetch, isFetching } = useGetClinic(normalized, {
    query: { queryKey: getGetClinicQueryKey(normalized), retry: false, staleTime: 5 * 60_000 },
  });
  const notFound = isError && (error as { status?: number } | null)?.status === 404;
  // Quien retoma su preevaluación entra directo al formulario (como siempre).
  const resuming = search.has("token") || search.has("google") || hasStoredPatientToken(normalized);
  const [started, setStarted] = useState(resuming);

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#F3F8FF]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0B63E5]" aria-label={a.loading} />
      </div>
    );
  }
  if (notFound) {
    return (
      <Notice
        icon={<SearchX className="h-7 w-7" />}
        title={a.notFoundTitle}
        desc={a.notFoundDesc}
        action={<Link href="/" className="mt-2 inline-flex min-h-11 items-center rounded-xl bg-[#0B63E5] px-6 font-semibold text-white hover:bg-[#0A55C4]" data-testid="clinic-not-found-home">{a.goHome}</Link>}
      />
    );
  }
  if (isError || !data) {
    // Sin datos de la clínica no se muestra ningún nombre ni se abre el formulario.
    return (
      <Notice
        icon={<AlertCircle className="h-7 w-7" />}
        title={a.errorTitle}
        desc={a.errorDesc}
        action={(
          <button type="button" onClick={() => void refetch()} disabled={isFetching} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0B63E5] px-6 font-semibold text-white hover:bg-[#0A55C4] disabled:opacity-60">
            <RotateCw className="h-4 w-4" aria-hidden="true" />{a.retry}
          </button>
        )}
      />
    );
  }
  if (started) {
    return <PatientFlow clinicSlug={normalized} startAtData={!resuming} onBackToWelcome={resuming ? undefined : () => setStarted(false)} />;
  }
  return <ClinicWelcome name={data.name} logoDataUrl={data.logoDataUrl ?? null} onStart={() => { setStarted(true); window.scrollTo({ top: 0 }); }} />;
}
