import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, Users, Link2, FileCheck2, Camera, UserCheck, CalendarClock, Scissors, Stethoscope, ScanFace,
  HeartPulse, KeyRound, Globe, ArrowRight, CheckCircle2, FileText, MonitorSmartphone, Images, BarChart3, ExternalLink,
} from "lucide-react";
import logoConLema from "@workspace/brand/svg/clinivista-logo.svg";
import { SPECIALTIES } from "./specialties";
import { COPY, initialLang, type LangCode } from "./i18n";
import { IMAGES } from "./images";
import { PLANS } from "./plans";
import { RESOURCES } from "./resources";
import { Header, LangSelect, type NavItem } from "./components/Header";
import { Photo, IllustrativeTag, CompareSlider } from "./components/Photo";
import { DeviceStage } from "./components/DeviceStage";

const CONTACT_EMAIL = "jfferraezhp7@gmail.com";
// TODO: agregar botón de WhatsApp cuando tengamos una línea de negocio dedicada.
const APP_URL = "https://app.clinivista.cl";
const ADMIN_LOGIN_URL = `${APP_URL}/admin/login`;

type Icon = React.ComponentType<{ className?: string }>;
const STEP_ICONS: Icon[] = [Link2, FileCheck2, Camera, UserCheck, CalendarClock];
const SECURITY_ICONS: Icon[] = [Users, FileCheck2, Link2, KeyRound];
const BENEFIT_ICONS: Icon[] = [FileText, MonitorSmartphone, Images, BarChart3];
// Especialidades disponibles con foto (orden del diseño).
const AVAILABLE_CARDS = [
  { slug: "dermatologico", img: IMAGES.dermatologia, Icon: ScanFace },
  { slug: "capilar", img: IMAGES.tricologia, Icon: Scissors },
  { slug: "plastico", img: IMAGES.cirugiaPlastica, Icon: HeartPulse },
] as const;

const card = "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(10,31,77,0.04),0_8px_24px_-12px_rgba(10,31,77,0.12)]";
const eyebrow = "text-[13px] font-semibold uppercase tracking-[0.14em] text-[#1D5FD8]";
const h2 = "text-[30px] font-bold leading-[1.1] tracking-[-0.025em] text-[#0A1F4D] sm:text-[38px]";

export default function App() {
  const [lang, setLang] = useState<LangCode>(initialLang);
  const t = COPY[lang];
  const rtl = lang === "ar";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.title = t.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", t.description);
    try { localStorage.setItem("clinivista_lang", lang); } catch { /* storage unavailable */ }
  }, [lang, rtl, t]);

  // «Planes» y «Recursos» solo aparecen si sus archivos de datos tienen contenido.
  const navItems: NavItem[] = useMemo(() => [
    { id: "inicio", label: t.nav.home },
    { id: "funciones", label: t.nav.features },
    { id: "especialidades", label: t.nav.specialties },
    ...(PLANS.length ? [{ id: "planes", label: t.nav.plans }] : []),
    ...(RESOURCES.length ? [{ id: "recursos", label: t.nav.resources }] : []),
    { id: "seguridad", label: t.nav.security },
    { id: "contacto", label: t.nav.contact },
  ], [t]);
  const pick = <T extends { es: string }>(value: T) => (value as Partial<Record<LangCode, string>>)[lang] ?? value.es;
  const upcoming = SPECIALTIES.filter((s) => !s.available);

  return (
    <div className="min-h-screen bg-white font-sans text-[#2D4373]">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-[#0A1F4D] focus:shadow-lg">{t.skip}</a>
      <Header t={t} lang={lang} setLang={setLang} items={navItems} loginUrl={ADMIN_LOGIN_URL} />

      <main id="contenido">
        {/* Hero */}
        <section id="inicio" className="relative overflow-hidden bg-gradient-to-br from-[#E9F3FE] via-[#F1F7FF] to-white">
          <div className="absolute inset-y-0 end-0 hidden w-[64%] lg:block">
            <Photo img={IMAGES.hero} lang={lang} eager sizes="(min-width: 1024px) 64vw, 100vw" className="h-full w-full object-cover ltr:object-right rtl:object-right" />
            <div className="absolute inset-y-0 start-0 w-1/2 from-[#EDF5FE] to-transparent ltr:bg-gradient-to-r rtl:bg-gradient-to-l" aria-hidden="true" />
          </div>
          <div className="relative mx-auto grid max-w-[1280px] gap-8 px-4 pb-10 pt-10 sm:px-6 lg:min-h-[500px] lg:grid-cols-[minmax(0,520px)_1fr] lg:px-8 lg:pb-8 lg:pt-10">
            <div className="relative z-10">
              <p className={eyebrow}>{t.eyebrow}</p>
              <h1 className="mt-3 text-[38px] font-bold leading-[1.05] tracking-[-0.035em] text-[#0A1F4D] sm:text-[46px] lg:text-[44px]">{t.h1}</h1>
              <p className="mt-4 max-w-[520px] text-[17px] leading-relaxed lg:text-base lg:leading-snug">{t.sub}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#contacto" className="inline-flex min-h-[52px] items-center gap-2 rounded-xl bg-[#0B2D5B] px-7 text-base font-semibold text-white shadow-lg shadow-[#0B2D5B]/20 transition-colors hover:bg-[#123b73]">
                  {t.demo}<ArrowRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
                </a>
                <a href="#funciones" className="inline-flex min-h-[52px] items-center rounded-xl border border-[#9cc0f5] bg-white px-7 text-base font-semibold text-[#0B2D5B] transition-colors hover:bg-[#F2F8FF]">{t.learn}</a>
              </div>
              <ul className="mt-6 flex flex-col gap-2.5 text-[15px] text-[#0A1F4D] sm:flex-row sm:flex-wrap sm:gap-x-5 lg:text-sm">
                {t.trust.map((item) => (
                  <li key={item} className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 fill-[#0A6DFE] text-white" aria-hidden="true" />{item}</li>
                ))}
              </ul>
            </div>
            {/* Visual: en escritorio, sobre la foto (de fondo, al lado opuesto del texto). La foto no se invierte en
                árabe, así que los equipos van siempre a la izquierda, sobre el portátil de la foto. En pantallas chicas,
                foto debajo del texto. */}
            <div className="relative">
              <div className="relative overflow-hidden rounded-2xl lg:hidden">
                <Photo img={IMAGES.hero} lang={lang} sizes="100vw" className="aspect-[1774/887] w-full object-cover" decorative />
              </div>
              <div
                className="relative mx-auto -mt-16 [--s:0.56] min-[420px]:[--s:0.62] sm:-mt-24 sm:[--s:0.85] lg:absolute lg:left-0 lg:top-[40px] lg:mx-0 lg:mt-0 lg:[--s:0.7] xl:[--s:0.88]"
                style={{ width: "calc(600px * var(--s))", height: "calc(370px * var(--s))" }}
                role="img"
                aria-label={`${t.example}: Clinivista — ${t.mock.sections[1]} (${t.mock.patientName})`}
              >
                <div className="origin-top-left" style={{ transform: "scale(var(--s))" }} aria-hidden="true">
                  <DeviceStage t={t} lang={lang} />
                </div>
              </div>
            </div>
          </div>
          <p className="relative pb-4 text-center text-xs text-[#4A5F82]">{t.demoNote}</p>
        </section>

        {/* Especialidades */}
        <section id="especialidades" className="scroll-mt-20 border-b border-slate-100 bg-white">
          <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-12 sm:px-6 xl:grid-cols-[minmax(0,1fr)_1px_300px] lg:px-8">
            <div>
              <h2 className={eyebrow}>{t.specAvailable}</h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {AVAILABLE_CARDS.map(({ slug, img, Icon }) => (
                  <li key={slug} className={`${card} flex gap-3 p-3`}>
                    <div className="relative h-[104px] w-[80px] shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      <Photo img={img} lang={lang} sizes="80px" className="h-full w-full object-cover" />
                      <IllustrativeTag label={t.illustrative} className="inset-x-1 bottom-1 text-center !text-[8px]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E3F2FE] text-[#1D5FD8]" aria-hidden="true"><Icon className="h-[18px] w-[18px]" /></span>
                        <h3 className="text-base font-bold leading-tight text-[#0A1F4D]">{t.specCardName[slug]}</h3>
                      </div>
                      <span className="mt-2 inline-block rounded-full bg-[#D9F3EF] px-2.5 py-0.5 text-xs font-semibold text-[#0B5E57]">{t.available}</span>
                      <p className="mt-1.5 text-sm leading-snug">{t.specDesc[slug]}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hidden bg-slate-200 xl:block" aria-hidden="true" />
            <div>
              <h2 className={eyebrow}>{t.specUpcoming}</h2>
              <div className="mt-4 rounded-2xl bg-[#E6F1FD] p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#1D5FD8]" aria-hidden="true"><Stethoscope className="h-6 w-6" /></span>
                  <p className="text-[15px] leading-snug text-[#0A1F4D]">{t.specUpcomingText}</p>
                </div>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {upcoming.map((s) => (
                    <li key={s.slug} className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-[#2D4373]">{(t.spec[s.slug] ?? [s.name])[0]}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Resultados visibles / funciones */}
        <section id="funciones" className="scroll-mt-20 bg-white">
          <div className="mx-auto grid max-w-[1280px] items-start gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)] lg:px-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,300px)_minmax(0,1.35fr)]">
            <div>
              <p className={eyebrow}>{t.resultsEyebrow}</p>
              <h2 className={`mt-3 ${h2}`}>{t.resultsTitle}</h2>
              <p className="mt-4 text-[17px] leading-relaxed">{t.resultsText}</p>
              <ul className="mt-6 space-y-3 text-[16px] text-[#0A1F4D]">
                {t.resultsList.map((item) => (
                  <li key={item} className="flex items-center gap-2.5"><CheckCircle2 className="h-5 w-5 shrink-0 fill-[#0A6DFE] text-white" aria-hidden="true" />{item}</li>
                ))}
              </ul>
            </div>
            <figure className="mx-auto w-full max-w-[300px]">
              <div className={`${card} p-2.5`}>
                <CompareSlider img={IMAGES.skin} lang={lang} before={t.mock.before} after={t.mock.after} label={t.compareLabel} tag={t.illustrative} sizes="(min-width: 1024px) 660px, 90vw" />
              </div>
              <figcaption className="mt-2 text-center text-xs text-[#4A5F82]">{t.simulation}</figcaption>
            </figure>
            <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4 xl:col-span-1 xl:grid-cols-2">
              {t.benefits.map(([title, desc], i) => {
                const Icon = BENEFIT_ICONS[i]!;
                return (
                  <li key={title} className={`${card} flex items-start gap-3.5 p-4`}>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E7F4FE] text-[#1D5FD8]" aria-hidden="true"><Icon className="h-6 w-6" /></span>
                    <div className="min-w-0">
                      <h3 className="text-[17px] font-bold leading-snug text-[#0A1F4D]">{title}</h3>
                      <p className="mt-1 text-sm leading-snug">{desc}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Cómo funciona (5 pasos) */}
        <section id="como" className="scroll-mt-20 bg-[#F5F9FF]">
          <div className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className={eyebrow}>{t.stepsEyebrow}</p>
              <h2 className={`mt-3 ${h2}`}>{t.stepsTitle}</h2>
            </div>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {t.steps.map(([title, desc], i) => {
                const Icon = STEP_ICONS[i]!;
                return (
                  <li key={title} className={`${card} p-5`}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B2D5B] text-sm font-bold text-white">{i + 1}</span>
                      <Icon className="h-6 w-6 text-[#1D5FD8]" aria-hidden="true" />
                    </div>
                    <h3 className="mt-3 text-base font-bold text-[#0A1F4D]">{title}</h3>
                    <p className="mt-1 text-sm leading-snug">{desc}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Planes y recursos: solo con contenido real en src/plans.ts y src/resources.ts */}
        {PLANS.length > 0 && (
          <section id="planes" className="scroll-mt-20 bg-white">
            <div className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6 lg:px-8">
              <h2 className={`text-center ${h2}`}>{t.plansTitle}</h2>
              <ul className="mt-8 grid gap-4 md:grid-cols-3">
                {PLANS.map((plan) => (
                  <li key={plan.id} className={`${card} p-6`}>
                    <h3 className="text-xl font-bold text-[#0A1F4D]">{pick(plan.name)}</h3>
                    {plan.price && <p className="mt-1 text-lg font-semibold text-[#1D5FD8]">{pick(plan.price)}</p>}
                    <ul className="mt-4 space-y-2 text-sm">{plan.features.map((f, i) => <li key={i} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#0A6DFE]" aria-hidden="true" />{pick(f)}</li>)}</ul>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
        {RESOURCES.length > 0 && (
          <section id="recursos" className="scroll-mt-20 bg-white">
            <div className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6 lg:px-8">
              <h2 className={`text-center ${h2}`}>{t.resourcesTitle}</h2>
              <ul className="mt-8 grid gap-4 md:grid-cols-3">
                {RESOURCES.map((r) => (
                  <li key={r.id}><a href={r.href} className={`${card} flex h-full flex-col p-6 hover:border-[#9cc0f5]`}><span className="flex items-center gap-2 text-lg font-bold text-[#0A1F4D]">{pick(r.title)}<ExternalLink className="h-4 w-4" aria-hidden="true" /></span>{r.description && <span className="mt-2 text-sm">{pick(r.description)}</span>}</a></li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Seguridad */}
        <section id="seguridad" className="scroll-mt-20 bg-white">
          <div className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-[#EEF5FE] px-5 py-10 sm:px-10">
              <div className="mx-auto max-w-2xl text-center">
                <p className={eyebrow}>{t.securityEyebrow}</p>
                <h2 className={`mt-3 ${h2}`}>{t.securityTitle}</h2>
              </div>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {t.security.map(([title, desc], i) => {
                  const Icon = SECURITY_ICONS[i]!;
                  return (
                    <li key={title} className={`${card} p-5`}>
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E3F2FE] text-[#0B7A6E]" aria-hidden="true"><Icon className="h-5 w-5" /></span>
                      <h3 className="mt-3 text-base font-bold leading-snug text-[#0A1F4D]">{title}</h3>
                      <p className="mt-1 text-sm leading-snug">{desc}</p>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-[#0A1F4D]"><Globe className="h-4 w-4 text-[#1D5FD8]" aria-hidden="true" />{t.languagesNote}<ShieldCheck className="ms-3 h-4 w-4 text-[#0B7A6E]" aria-hidden="true" /></p>
            </div>
          </div>
        </section>

        {/* Solicitar demostración (mismo destino de siempre: correo) */}
        <section id="contacto" className="scroll-mt-20 bg-white">
          <div className="mx-auto max-w-[1280px] px-4 pb-14 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-gradient-to-br from-[#0B2D5B] to-[#1D56CC] px-5 py-14 text-center text-white">
              <h2 className="text-[30px] font-bold leading-tight tracking-[-0.025em] sm:text-[38px]">{t.demoTitle}</h2>
              <p className="mx-auto mt-3 max-w-xl text-white/85">{t.demoText}</p>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t.demoSubject)}`}
                className="mt-7 inline-flex min-h-[52px] items-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-[#0B2D5B] shadow-lg transition-transform hover:scale-[1.02]"
              >
                {t.demoCta} <span dir="ltr">{CONTACT_EMAIL}</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-5 px-4 py-8 sm:px-6 md:flex-row lg:px-8">
          <img src={logoConLema} alt="Clinivista — Registro fotográfico clínico" width={934} height={292} className="h-12 w-auto" />
          <nav className="flex flex-wrap items-center justify-center gap-1 text-sm" aria-label={t.nav.contact}>
            <a href={`${APP_URL}/privacidad`} className="inline-flex min-h-11 items-center rounded-lg px-3 hover:text-[#0A1F4D] hover:underline">{t.privacy}</a>
            <a href={`${APP_URL}/terminos`} className="inline-flex min-h-11 items-center rounded-lg px-3 hover:text-[#0A1F4D] hover:underline">{t.terms}</a>
            <a href={ADMIN_LOGIN_URL} className="inline-flex min-h-11 items-center rounded-lg px-3 hover:text-[#0A1F4D] hover:underline">{t.login}</a>
            <LangSelect lang={lang} setLang={setLang} label={t.language} />
          </nav>
          <p className="text-xs text-[#4A5F82]">© {new Date().getFullYear()} Clinivista. {t.rights}</p>
        </div>
      </footer>
    </div>
  );
}
