import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, Building2, ChevronRight, Camera, FileSearch, FileText, Hospital, Info, UserRound } from "lucide-react";
import isotipo from "@workspace/brand/svg/clinivista-isotipo.svg";
import { useLanguage } from "@/lib/language";
import { PortalLanguageSelect } from "@/components/portal-language-select";
import { BrandLogo } from "@/components/brand-logo";
import { PORTAL_HOME_TEXT } from "@/lib/portal-home-i18n";

// Portada de app.clinivista.cl: portal compartido de pacientes y equipos de cada clínica.
// Rutas (las mismas de antes): paciente → /patient, equipo → /admin/login, cuenta del paciente → /paciente.
// Desde la raíz no hay contexto de clínica: /patient crea la preevaluación en la clínica principal
// (DEFAULT_CENTER_ID en el servidor); por eso se pide usar el enlace que envía cada clínica.

const OUTFIT_HREF = "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap";
const INK = "#0A1F4D";
const card = "rounded-2xl bg-white shadow-[0_1px_2px_rgba(10,31,77,0.04),0_10px_30px_-14px_rgba(10,31,77,0.18)]";

/** Isotipo grande con el «campo visual» de la cámara (decorativo; el logo no cambia). */
function HeroMark() {
  return (
    <div className="pointer-events-none relative mx-auto aspect-[4/3] w-full max-w-[460px]" aria-hidden="true" dir="ltr">
      {/* Halo azul claro para que el haz blanco se distinga */}
      <span className="absolute left-[8%] top-0 aspect-square h-full rounded-full bg-[radial-gradient(circle,#C9DFFB_0%,#DCEAFD_45%,transparent_71%)]" />
      <span className="absolute left-[2%] top-[-6%] aspect-square h-[112%] rounded-full border border-white" />
      {/* Haz de luz desde la lente hacia la derecha */}
      <span
        className="absolute left-[44%] top-[24%] h-[52%] w-[58%] bg-gradient-to-r from-white via-white/90 to-white/0"
        style={{ clipPath: "polygon(0 42%, 100% 0, 100% 100%, 0 58%)" }}
      />
      <img src={isotipo} alt="" className="absolute left-[14%] top-[4%] h-[92%] w-auto drop-shadow-[0_24px_40px_rgba(10,109,254,0.25)]" />
    </div>
  );
}

export default function Home() {
  const { lang } = useLanguage();
  const h = PORTAL_HOME_TEXT[lang];
  const stepIcons = [FileText, Camera, FileSearch];

  // Tipografía de la marca (Outfit) solo en esta pantalla.
  useEffect(() => {
    if (document.querySelector(`link[href="${OUTFIT_HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = OUTFIT_HREF;
    document.head.appendChild(link);
  }, []);

  return (
    <div
      className="min-h-[100dvh] bg-gradient-to-b from-[#EAF3FE] via-[#F4F9FF] to-[#F7FAFE] motion-safe:scroll-smooth"
      style={{ fontFamily: '"Outfit", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif', color: INK }}
      dir={lang === "ar" ? "rtl" : "ltr"}
      data-testid="portal-home"
    >
      <header className="border-b border-slate-200/70 bg-white">
        <div className="mx-auto flex h-[76px] sm:h-[92px] max-w-[1360px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Clinivista" className="shrink-0 rounded-lg">
            <BrandLogo variant="logo" alt="Clinivista — Registro fotográfico clínico" className="h-9 min-[400px]:h-11 sm:h-16" />
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <PortalLanguageSelect label={h.language} />
            <span className="hidden h-8 w-px bg-slate-200 sm:block" aria-hidden="true" />
            <Link
              href="/admin/login"
              className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#1D5FD8] px-2.5 text-sm font-semibold text-[#0B4FC4] transition-colors hover:bg-[#EAF2FC] sm:px-5 sm:text-[15px]"
              data-testid="home-team-access"
            >
              <Building2 className="h-5 w-5" aria-hidden="true" />{h.teamAccess}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1360px] px-4 pb-10 sm:px-6 lg:px-8">
        {/* Título */}
        <section className="grid items-center gap-6 pt-8 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:pt-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.32em] text-[#4A5F82] sm:text-[13px]">{h.eyebrow}</p>
            <h1 className="mt-4 text-[40px] font-bold leading-[1.02] tracking-[-0.035em] sm:text-[56px] lg:text-[72px]">
              <span className="block">{h.titleLead}</span>
              <span className="block text-[#0B63E5]">{h.titleAccent}</span>
            </h1>
            <p className="mt-4 max-w-[680px] text-lg leading-snug text-[#4A5F82] sm:text-[22px] lg:text-[26px]">{h.subtitle}</p>
          </div>
          <div className="hidden md:block"><HeroMark /></div>
        </section>

        {/* Accesos: paciente primero (también en el orden del DOM), equipo después */}
        <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" aria-label={`${h.patientTitle} · ${h.teamTitle}`}>
          <article className={`${card} flex flex-col gap-5 border-2 border-[#BFD7F7] !bg-[#F6FAFF] p-6 sm:flex-row sm:items-start sm:p-8`} data-testid="home-patient-card">
            <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#E6F1FD] text-[#0B4FC4] sm:h-32 sm:w-32" aria-hidden="true">
              <UserRound className="h-12 w-12 sm:h-16 sm:w-16" strokeWidth={1.6} />
            </span>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-[-0.02em] sm:text-[30px]">{h.patientTitle}</h2>
              <p className="mt-1.5 text-[17px] leading-snug text-[#4A5F82]">{h.patientDesc}</p>
              <Link
                href="/patient"
                className="mt-5 inline-flex min-h-[52px] items-center gap-2 rounded-xl bg-[#0B63E5] px-7 text-[17px] font-semibold text-white shadow-lg shadow-[#0B63E5]/25 transition-colors hover:bg-[#0A55C4]"
                data-testid="home-start"
              >
                {h.patientCta}<ArrowRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
              <p className="mt-3 flex items-start gap-2 text-sm text-[#4A5F82]"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{h.patientHint}</p>
              <p className="mt-2 text-sm text-[#4A5F82]">
                {h.resultsPrompt}{" "}
                <Link href="/paciente" className="inline-flex min-h-11 items-center font-semibold text-[#0B4FC4] underline-offset-4 hover:underline" data-testid="home-results">{h.resultsLink}</Link>
              </p>
            </div>
          </article>

          <article className={`${card} flex flex-col gap-5 border border-slate-200/80 p-6 sm:flex-row sm:items-start sm:p-8`} data-testid="home-team-card">
            <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#E6F1FD] text-[#0B4FC4] sm:h-32 sm:w-32" aria-hidden="true">
              <Hospital className="h-12 w-12 sm:h-16 sm:w-16" strokeWidth={1.6} />
            </span>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-[-0.02em] sm:text-[30px]">{h.teamTitle}</h2>
              <p className="mt-1.5 text-[17px] leading-snug text-[#4A5F82]">{h.teamDesc}</p>
              <Link
                href="/admin/login"
                className="mt-5 inline-flex min-h-[52px] items-center gap-2 rounded-xl border-2 border-[#0B63E5] bg-white px-7 text-[17px] font-semibold text-[#0B4FC4] transition-colors hover:bg-[#F2F8FF]"
                data-testid="home-team-start"
              >
                {h.teamCta}<ArrowRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </div>
          </article>
        </section>

        {/* Así funciona */}
        <section className="mt-10" aria-labelledby="home-how">
          <h2 id="home-how" className="text-[28px] font-bold tracking-[-0.025em] sm:text-[34px]">{h.howTitle}</h2>
          <ol className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
            {h.steps.map(([title, desc], i) => {
              const Icon = stepIcons[i]!;
              return [
                <li key={title} className={`${card} flex items-start gap-4 p-5`}>
                  <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#EAF3FE] text-[#0B4FC4]" aria-hidden="true">
                    <Icon className="h-7 w-7" />
                    <span className="absolute -end-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#1D7BF2] text-sm font-bold text-white ring-2 ring-white">{i + 1}</span>
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold leading-snug">{title}</h3>
                    <p className="mt-1 text-[15px] leading-snug text-[#4A5F82]">{desc}</p>
                  </div>
                </li>,
                i < 2 ? <li key={`${title}-sep`} className="hidden lg:block" aria-hidden="true"><ChevronRight className="h-6 w-6 text-slate-400 rtl:-scale-x-100" /></li> : null,
              ];
            })}
          </ol>
          <p className="mt-5 flex items-start justify-center gap-2 rounded-xl bg-[#EEF3FA] px-4 py-3 text-center text-sm text-[#2D4373]" data-testid="home-disclaimer">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{h.disclaimer}
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-200/70 bg-white">
        <div className="mx-auto flex max-w-[1360px] flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
          <BrandLogo variant="logo" alt="Clinivista — Registro fotográfico clínico" className="h-10" />
          <nav className="flex items-center gap-1 text-[15px]" aria-label={`${h.privacy} · ${h.terms}`}>
            <Link href="/privacidad" className="inline-flex min-h-11 items-center rounded-lg px-3 text-[#2D4373] hover:underline">{h.privacy}</Link>
            <span className="h-5 w-px bg-slate-300" aria-hidden="true" />
            <Link href="/terminos" className="inline-flex min-h-11 items-center rounded-lg px-3 text-[#2D4373] hover:underline">{h.terms}</Link>
          </nav>
          <p className="text-xs text-[#4A5F82]">© {new Date().getFullYear()} Clinivista. {h.rights}</p>
        </div>
      </footer>
    </div>
  );
}
