import { useEffect, useState } from "react";
import {
  ShieldCheck, Users, Cloud, Link2, FileCheck2, Camera, UserCheck, CalendarClock, Scissors, Stethoscope,
  Sparkles, HeartPulse, Smile, Footprints, Activity, PersonStanding, Eye, Menu, X, Lock, KeyRound, ChevronRight,
  CalendarDays, MoreVertical, ChevronLeft, Zap, Globe,
} from "lucide-react";
import { SPECIALTIES } from "./specialties";
import { COPY, LANGS, initialLang, type LangCode } from "./i18n";
import { Logo } from "./Logo";

const CONTACT_EMAIL = "jfferraezhp7@gmail.com";
// TODO: agregar botón de WhatsApp cuando tengamos una línea de negocio dedicada.
const ADMIN_LOGIN_URL = "https://app.clinivista.cl/admin/login";

type Icon = React.ComponentType<{ className?: string }>;
const SPECIALTY_ICONS: Record<string, Icon> = {
  capilar: Scissors, dermatologico: Stethoscope, estetico: Sparkles, plastico: HeartPulse, dental: Smile,
  heridas: Footprints, vascular: Activity, movimiento: PersonStanding, oculofacial: Eye,
};
const STEP_ICONS: Icon[] = [Link2, FileCheck2, Camera, UserCheck, CalendarClock];
const FEATURE_ICONS: Icon[] = [ShieldCheck, Users, Cloud];
const SECURITY_ICONS: Icon[] = [ShieldCheck, FileCheck2, KeyRound];

const BLUE = "#0d3b9e";

/** Foto de ejemplo estilizada (no es una imagen de un paciente real). */
function Thumb() {
  return (
    <span
      className="h-14 w-14 shrink-0 rounded-lg"
      style={{ background: "radial-gradient(circle at 50% 50%, #7a4a3a 0 14%, transparent 15%), radial-gradient(circle at 40% 30%, #f1c4ab, #e0a98c)" }}
    />
  );
}

export default function App() {
  const [lang, setLang] = useState<LangCode>(initialLang);
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = COPY[lang];
  const rtl = lang === "ar";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.title = t.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", t.description);
    try { localStorage.setItem("clinivista_lang", lang); } catch { /* storage unavailable */ }
  }, [lang, rtl, t]);

  const navLinks = [
    { href: "#producto", label: t.nav[0] },
    { href: "#especialidades", label: t.nav[1] },
    { href: "#seguridad", label: t.nav[2] },
    { href: "#demo", label: t.demo },
  ];

  const picker = (
    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
      <Globe className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{t.language}</span>
      <select
        value={lang}
        onChange={(event) => setLang(event.target.value as LangCode)}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
        aria-label={t.language}
      >
        {LANGS.map((l) => (<option key={l.code} value={l.code}>{l.name}</option>))}
      </select>
    </label>
  );

  return (
    <div className="min-h-screen bg-[#f4f8fd] font-sans text-[#0c2d6b]">
      <div className="mx-auto max-w-[1240px] px-3 sm:px-6">
        {/* Nav */}
        <header className="sticky top-0 z-40 -mx-3 border-b border-slate-200/70 bg-white/90 px-3 backdrop-blur sm:mx-0 sm:mt-3 sm:rounded-2xl sm:border sm:px-6 sm:shadow-sm">
          <div className="flex items-center justify-between gap-4 py-3">
            <a href="#" aria-label="Clinivista"><Logo /></a>
            <nav className="hidden items-center gap-7 lg:flex">
              {navLinks.slice(0, 3).map((l) => (
                <a key={l.href} href={l.href} className="text-sm font-semibold text-slate-700 hover:text-[#0d3b9e]">{l.label}</a>
              ))}
            </nav>
            <div className="hidden items-center gap-4 md:flex">
              {picker}
              <a href={ADMIN_LOGIN_URL} className="text-sm font-semibold text-slate-700 hover:text-[#0d3b9e]">{t.login}</a>
              <a href="#demo" className="rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.02]" style={{ background: BLUE }}>{t.demo}</a>
            </div>
            <button type="button" aria-label={t.menu} className="md:hidden" onClick={() => setMobileOpen((v) => !v)}>
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
          {mobileOpen && (
            <div className="border-t border-slate-200 py-4 md:hidden">
              <nav className="flex flex-col gap-4">
                {navLinks.map((l) => (
                  <a key={l.href} href={l.href} className="text-sm font-semibold" onClick={() => setMobileOpen(false)}>{l.label}</a>
                ))}
                <a href={ADMIN_LOGIN_URL} className="text-sm font-semibold text-slate-600">{t.login}</a>
                {picker}
              </nav>
            </div>
          )}
        </header>

        {/* Hero */}
        <section id="producto" className="mt-3 overflow-hidden rounded-3xl bg-gradient-to-br from-[#e8f1fc] via-[#f1f7fe] to-white px-5 py-10 sm:px-10 md:py-14">
          <div className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
            <div>
              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">{t.h1}</h1>
              <p className="mt-4 text-xl text-slate-600">{t.sub}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#demo" className="rounded-xl px-6 py-3 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.02]" style={{ background: BLUE }}>{t.demo}</a>
                <a href="#como" className="rounded-xl border bg-white px-6 py-3 text-sm font-bold transition-colors hover:bg-slate-50" style={{ borderColor: BLUE, color: BLUE }}>{t.learn}</a>
              </div>
              <dl className="mt-9 grid gap-5 sm:grid-cols-3">
                {t.features.map(([title, desc], i) => {
                  const Icon = FEATURE_ICONS[i];
                  return (
                    <div key={title} className="flex items-start gap-2.5">
                      <Icon className="mt-0.5 h-6 w-6 shrink-0 text-teal-600" />
                      <div>
                        <dt className="text-sm font-bold">{title}</dt>
                        <dd className="mt-0.5 text-xs leading-snug text-slate-500">{desc}</dd>
                      </div>
                    </div>
                  );
                })}
              </dl>
            </div>

            {/* Phone + timeline (ilustración con datos de ejemplo) */}
            <div className="relative mx-auto flex w-full max-w-[520px] items-center justify-center gap-4" dir="ltr">
              <div className="w-[190px] shrink-0 rounded-[2rem] border-[6px] border-slate-900 bg-white shadow-2xl">
                <div className="px-3 pb-2 pt-4">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-700"><ChevronLeft className="h-3 w-3" />{t.guided}</div>
                  <p className="mt-2 text-center text-[10px] font-semibold text-slate-500">{t.frontal}</p>
                  <p className="mx-auto mt-1 max-w-[140px] text-center text-[9px] leading-tight text-slate-400">{t.tip}</p>
                </div>
                <div className="relative h-[150px]" style={{ background: "radial-gradient(circle at 50% 50%, #8a5543 0 6%, transparent 7%), linear-gradient(135deg, #e9b8a0, #d49a7e)" }}>
                  <span className="absolute inset-x-8 inset-y-6 rounded-md border border-white/70" />
                  <span className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80" />
                </div>
                <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
                  <X className="h-3.5 w-3.5" />
                  <span className="h-8 w-8 rounded-full border-2 border-white bg-white/90" />
                  <Zap className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="hidden w-[250px] shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:block">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{t.timeline}</span>
                  <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700"><Lock className="h-2.5 w-2.5" />{t.secure}</span>
                </div>
                <ul className="mt-2 divide-y divide-slate-100">
                  {[t.initial, `${t.control} 1`, `${t.control} 2`].map((label) => (
                    <li key={label} className="flex items-center gap-2 py-2">
                      <Thumb />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold">{label}</p>
                        <p className="text-[9px] text-slate-400">{t.example}</p>
                      </div>
                      <MoreVertical className="h-3.5 w-3.5 text-slate-300" />
                    </li>
                  ))}
                </ul>
                <div className="mt-1 flex items-center gap-2 rounded-lg bg-slate-50 p-2">
                  <CalendarDays className="h-4 w-4 text-[#0d3b9e]" />
                  <span className="flex-1 text-[10px] font-semibold">{t.next}</span>
                  <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold">{t.schedule}</span>
                </div>
                <p className="mt-2 flex items-center justify-center gap-1 text-[10px] font-semibold text-[#0d3b9e]">{t.history}<ChevronRight className={`h-3 w-3 ${rtl ? "" : ""}`} /></p>
              </div>
            </div>
          </div>
        </section>

        {/* Pasos */}
        <section id="como" className="mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-8">
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {t.steps.map(([title, desc], i) => {
              const Icon = STEP_ICONS[i];
              return (
                <li key={title} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: BLUE }}>{i + 1}</span>
                  <Icon className="mt-0.5 h-6 w-6 shrink-0 text-[#0d3b9e]" />
                  <div>
                    <h3 className="text-sm font-bold">{title}</h3>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">{desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Especialidades */}
        <section id="especialidades" className="py-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight">{t.specTitle}</h2>
            <p className="mt-3 text-slate-600">{t.specSub}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SPECIALTIES.map((s) => {
              const Icon = SPECIALTY_ICONS[s.slug] ?? Sparkles;
              const [name, tagline] = t.spec[s.slug] ?? [s.name, s.tagline];
              return (
                <div key={s.slug} className={`relative flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm ${s.available ? "border-[#7fb0ee] ring-1 ring-[#bcd6f7]" : "border-slate-200"}`}>
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#e8f1fc] text-[#0d3b9e]"><Icon className="h-7 w-7" /></span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold">{name}</h3>
                    <p className="text-sm text-slate-500">{tagline}</p>
                  </div>
                  <span className={`absolute end-4 top-3 rounded-md px-2 py-0.5 text-[10px] font-bold ${s.available ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {s.available ? t.available : t.soon}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Seguridad */}
        <section id="seguridad" className="rounded-2xl border border-[#cfe0f6] bg-[#eaf2fc] px-5 py-5">
          <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-bold">
            {t.security.map((label, i) => {
              const Icon = SECURITY_ICONS[i];
              return (<li key={label} className="flex items-center gap-2"><Icon className="h-5 w-5 text-teal-600" />{label}</li>);
            })}
          </ul>
        </section>

        {/* Demo */}
        <section id="demo" className="mt-6 rounded-3xl px-5 py-14 text-center text-white" style={{ background: "linear-gradient(135deg, #0d3b9e, #1d56cc)" }}>
          <h2 className="text-3xl font-extrabold tracking-tight">{t.demoTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">{t.demoText}</p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t.demoSubject)}`}
            className="mt-7 inline-block rounded-xl bg-white px-6 py-3 text-sm font-bold shadow-lg transition-transform hover:scale-[1.02]"
            style={{ color: BLUE }}
          >
            {t.demoCta} <span dir="ltr">{CONTACT_EMAIL}</span>
          </a>
        </section>

        <footer className="flex flex-col items-center justify-between gap-3 py-8 text-slate-500 sm:flex-row">
          <Logo />
          <p className="text-xs">© {new Date().getFullYear()} Clinivista. {t.rights}</p>
        </footer>
      </div>
    </div>
  );
}
