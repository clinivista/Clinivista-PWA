import { useState } from "react";
import {
  ShieldCheck,
  Users,
  Cloud,
  Link2,
  FileCheck2,
  Camera,
  UserCheck,
  CalendarClock,
  Scissors,
  Stethoscope,
  Sparkles,
  HeartPulse,
  Smile,
  Footprints,
  Activity,
  PersonStanding,
  Eye,
  Menu,
  X,
  Lock,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import { SPECIALTIES, type Specialty } from "./specialties";

const CONTACT_EMAIL = "jfferraezhp7@gmail.com";
// TODO: agregar botón de WhatsApp cuando tengamos una línea de negocio dedicada.

const ADMIN_LOGIN_URL = "https://app.clinivista.cl/admin/login";

const SPECIALTY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  capilar: Scissors,
  dermatologico: Stethoscope,
  estetico: Sparkles,
  plastico: HeartPulse,
  dental: Smile,
  heridas: Footprints,
  vascular: Activity,
  movimiento: PersonStanding,
  oculofacial: Eye,
};

const STEPS = [
  { icon: Link2, title: "Enlace seguro", desc: "El paciente recibe un enlace único de su clínica." },
  { icon: FileCheck2, title: "Consentimiento", desc: "El paciente otorga su consentimiento explícito." },
  { icon: Camera, title: "Fotos guiadas", desc: "El paciente toma las fotos siguiendo el protocolo." },
  { icon: UserCheck, title: "Revisión humana", desc: "Un profesional revisa, valida y añade notas." },
  { icon: CalendarClock, title: "Controles", desc: "Seguimiento estructurado y trazable en el tiempo." },
];

const NAV_LINKS = [
  { href: "#producto", label: "Producto" },
  { href: "#especialidades", label: "Especialidades" },
  { href: "#seguridad", label: "Seguridad" },
  { href: "#demo", label: "Solicitar demo" },
];

function Logo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black ${className}`}>
      <img src="/clinivista-logo.png" alt="Clinivista" className="h-full w-full object-contain" />
    </span>
  );
}

function SpecialtyCard({ specialty }: { specialty: Specialty }) {
  const Icon = SPECIALTY_ICONS[specialty.slug] ?? Sparkles;
  return (
    <div
      className={`flex items-start gap-4 rounded-2xl border p-5 transition-colors ${
        specialty.available
          ? "border-emerald-200 bg-white shadow-sm"
          : "border-[#E8E4DE] bg-white/60"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          specialty.available ? "bg-emerald-50 text-emerald-600" : "bg-[#F5F2EE] text-[#0B1F33]/40"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={`font-bold ${specialty.available ? "text-[#0B1F33]" : "text-[#0B1F33]/70"}`}>
            {specialty.name}
          </h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
              specialty.available ? "bg-emerald-100 text-emerald-700" : "bg-[#E8E4DE] text-[#0B1F33]/50"
            }`}
          >
            {specialty.available ? "Disponible" : "Próximamente"}
          </span>
        </div>
        <p className="mt-1 text-sm text-[#0B1F33]/60">{specialty.tagline}</p>
      </div>
    </div>
  );
}

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F2EE] font-sans text-[#0B1F33]">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-[#E8E4DE] bg-[#F5F2EE]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
          <a href="#" className="flex items-center gap-3">
            <Logo />
            <span className="text-lg font-extrabold tracking-tight">Clinivista</span>
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-semibold text-[#0B1F33]/70 hover:text-[#0B1F33]">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <a href={ADMIN_LOGIN_URL} className="text-sm font-semibold text-[#0B1F33]/70 hover:text-[#0B1F33]">
              Iniciar sesión
            </a>
            <a
              href="#demo"
              className="rounded-full bg-[#0B1F33] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#0B1F33]/20 transition-transform hover:scale-[1.02]"
            >
              Solicitar demo
            </a>
          </div>
          <button
            type="button"
            aria-label="Abrir menú"
            className="md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileOpen && (
          <div className="border-t border-[#E8E4DE] px-5 py-4 md:hidden">
            <nav className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="text-sm font-semibold" onClick={() => setMobileOpen(false)}>
                  {link.label}
                </a>
              ))}
              <a href={ADMIN_LOGIN_URL} className="text-sm font-semibold text-[#0B1F33]/70">
                Iniciar sesión
              </a>
              <a
                href="#demo"
                className="rounded-full bg-[#0B1F33] px-5 py-2.5 text-center text-sm font-bold text-white"
                onClick={() => setMobileOpen(false)}
              >
                Solicitar demo
              </a>
            </nav>
          </div>
        )}
      </header>

      {/* Hero */}
      <section id="producto" className="relative overflow-hidden bg-[#0B1F33] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(600px circle at 15% 20%, rgba(52,211,153,0.25), transparent 60%), radial-gradient(500px circle at 85% 0%, rgba(167,139,250,0.25), transparent 55%), radial-gradient(700px circle at 50% 100%, rgba(79,142,247,0.2), transparent 60%)",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" /> Preevaluación fotográfica clínica
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Registro fotográfico clínico para cada especialidad
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/70">
              Tus pacientes envían fotos guiadas por un protocolo clínico antes de la primera consulta. Tu equipo médico
              revisa, decide factibilidad y agenda — sin ida y vuelta por WhatsApp.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#demo"
                className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-bold text-[#0B1F33] shadow-lg shadow-emerald-400/20 transition-transform hover:scale-[1.02]"
              >
                Solicitar demo
              </a>
              <a
                href="#especialidades"
                className="rounded-full border border-white/25 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                Ver especialidades
              </a>
            </div>
            <dl className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" />
                <div>
                  <dt className="text-sm font-bold">Datos protegidos</dt>
                  <dd className="text-xs text-white/60">Consentimiento explícito y acceso por roles.</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 shrink-0 text-blue-300" />
                <div>
                  <dt className="text-sm font-bold">Multi-clínica</dt>
                  <dd className="text-xs text-white/60">Cada clínica ve solo sus propios pacientes.</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Cloud className="h-5 w-5 shrink-0 text-violet-300" />
                <div>
                  <dt className="text-sm font-bold">Siempre disponible</dt>
                  <dd className="text-xs text-white/60">El paciente entra desde cualquier dispositivo.</dd>
                </div>
              </div>
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur">
              <div className="rounded-[2rem] bg-[#050609] p-5">
                <div className="mb-4 flex items-center justify-between text-white/60">
                  <span className="text-xs font-semibold">Preevaluación · Vista frontal</span>
                  <Camera className="h-4 w-4" />
                </div>
                <div className="flex aspect-[3/4] items-center justify-center rounded-2xl border border-dashed border-white/20">
                  <div className="h-28 w-28 rounded-full border-2 border-emerald-400/60" />
                </div>
                <p className="mt-4 text-center text-xs text-white/50">
                  Mantén el rostro centrado y con buena iluminación.
                </p>
              </div>
            </div>
            <div className="absolute -bottom-8 -right-4 w-52 rounded-2xl border border-[#E8E4DE] bg-white p-4 text-[#0B1F33] shadow-xl sm:-right-10">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                <Lock className="h-3 w-3" /> Conexión segura
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Control 2 · 18 jul
              </div>
              <p className="mt-1 text-[11px] text-[#0B1F33]/50">Revisado por el equipo médico</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-[#E8E4DE] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
          <div className="grid gap-6 sm:grid-cols-5">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex flex-col items-center text-center sm:items-start sm:text-left">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0B1F33] text-sm font-bold text-white">
                  {i + 1}
                </span>
                <step.icon className="mt-3 h-5 w-5 text-emerald-600" />
                <h3 className="mt-2 text-sm font-bold">{step.title}</h3>
                <p className="mt-1 text-xs text-[#0B1F33]/60">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section id="especialidades" className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight">Una plataforma, cada especialidad</h2>
          <p className="mt-3 text-[#0B1F33]/60">
            Cada especialidad tiene su propio protocolo de fotos y preguntas clínicas. Hoy Capilar está en operación
            con nuestra clínica piloto; el resto se va habilitando por fases.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SPECIALTIES.map((s) => (
            <SpecialtyCard key={s.slug} specialty={s} />
          ))}
        </div>
      </section>

      {/* Security */}
      <section id="seguridad" className="border-y border-[#E8E4DE] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-5 py-8 text-sm font-semibold text-[#0B1F33]/70 sm:px-8">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Datos protegidos
          </span>
          <span className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-emerald-600" /> Consentimiento explícito
          </span>
          <span className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-emerald-600" /> Acceso por roles
          </span>
        </div>
      </section>

      {/* Demo request */}
      <section id="demo" className="bg-[#0B1F33] text-white">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8">
          <h2 className="text-3xl font-extrabold tracking-tight">Solicita una demo para tu clínica</h2>
          <p className="mt-3 text-white/70">
            Cuéntanos tu especialidad y te mostramos cómo se vería el protocolo de preevaluación para tus pacientes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Quiero una demo de Clinivista")}`}
              className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-bold text-[#0B1F33] shadow-lg shadow-emerald-400/20 transition-transform hover:scale-[1.02]"
            >
              Escribir a {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#050609] py-10 text-white/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="text-sm font-bold text-white">Clinivista</span>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} Clinivista. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
