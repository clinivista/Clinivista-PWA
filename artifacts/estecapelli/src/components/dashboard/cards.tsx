import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronRight } from "lucide-react";
import { Sparkline, SERIES_COLORS } from "./charts";

// Piezas del Inicio compartidas por el dashboard de clínica y supra-control.
export const cardShape = "rounded-2xl border shadow-[var(--cd-shadow)]";
export const cardClass = `bg-card border-[hsl(var(--card-border))] ${cardShape}`;

export function Skeleton({ className }: { className: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-md bg-muted ${className}`} />;
}

/** Variación porcentual (null = no se puede calcular: no se muestra). */
export function ChangeChip({ pct, lang, label, testId = "home-change" }: { pct: number | null; lang: string; label: (p: string) => string; testId?: string }) {
  if (pct === null) return null;
  const formatted = new Intl.NumberFormat(lang, { style: "percent", signDisplay: "exceptZero", maximumFractionDigits: 0 }).format(pct / 100);
  const tone = pct > 0 ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15" : pct < 0 ? "bg-red-50 text-red-700 ring-red-600/15" : "bg-muted text-muted-foreground ring-border";
  return (
    <span className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ring-1 ring-inset ${tone}`} data-testid={testId}>
      {pct > 0 ? <ArrowUpRight className="h-3 w-3 rtl:-scale-x-100" aria-hidden="true" /> : pct < 0 ? <ArrowDownRight className="h-3 w-3 rtl:-scale-x-100" aria-hidden="true" /> : null}
      <span aria-hidden="true"><bdi>{formatted}</bdi></span>
      <span className="sr-only">{label(formatted)}</span>
    </span>
  );
}

export type StatItem = {
  key: string;
  label: string;
  /** Detalle bajo la etiqueta (p. ej. «21 nuevos este mes»). */
  sub?: string;
  value: number | null | undefined;
  change: number | null;
  spark: number[] | null;
  sparkColor: string;
  icon: ReactNode;
  tone: string;
};

/** Tarjeta de indicador: ícono, cifra grande, etiqueta, chip de variación y mini-gráfico. */
export function StatCard({ item, loading, lang, changeLabel, testId, sparkTestId, chipTestId }: {
  item: StatItem; loading: boolean; lang: string; changeLabel: (p: string) => string; testId: string; sparkTestId: string; chipTestId?: string;
}) {
  const number = new Intl.NumberFormat(lang);
  return (
    <div className={`${cardClass} p-4 md:p-5 flex flex-col gap-3`} data-testid={testId}>
      <div className="flex items-start gap-3.5">
        <span aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl [&_svg]:h-[22px] [&_svg]:w-[22px] ${item.tone}`}>{item.icon}</span>
        <div className="min-w-0 flex-1 flex flex-col-reverse">
          <dt className="text-[13px] leading-snug text-muted-foreground mt-1">
            {item.label}
            {item.sub && <span className="block text-xs text-muted-foreground/90 mt-0.5">{item.sub}</span>}
          </dt>
          <dd className="flex items-center justify-between gap-2">
            <span className="text-[28px] leading-none font-bold tabular-nums text-foreground">
              {loading ? <Skeleton className="h-7 w-14" /> : item.value === undefined || item.value === null ? "—" : number.format(item.value)}
            </span>
            <ChangeChip pct={item.change} lang={lang} label={changeLabel} testId={chipTestId} />
          </dd>
        </div>
      </div>
      {item.spark && (loading ? <Skeleton className="h-8 w-full" /> : <Sparkline values={item.spark} color={item.sparkColor} testId={sparkTestId} />)}
    </div>
  );
}

export type QuickItem = { key: string; title: string; desc: string; icon: ReactNode; tone: string; onClick: () => void; testId: string };

/** Tarjeta de acceso rápido. Con cinco en una fila (escritorio) se compacta para que el título no se corte. */
export function QuickCard({ item, five }: { item: QuickItem; five: boolean }) {
  return (
    <button
      type="button"
      onClick={item.onClick}
      data-testid={item.testId}
      className={`group ${cardClass} min-h-[76px] p-3.5 md:p-4 ${five ? "xl:px-3 xl:gap-3" : ""} flex items-center gap-3.5 text-start transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30`}
    >
      <span aria-hidden="true" className={`flex h-12 w-12 ${five ? "xl:h-11 xl:w-11" : ""} shrink-0 items-center justify-center rounded-xl text-white shadow-sm [&_svg]:h-[22px] [&_svg]:w-[22px] ${item.tone}`}>
        {item.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold text-[15px] ${five ? "xl:text-sm" : ""} leading-snug text-foreground`}>{item.title}</span>
        <span className="block text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.desc}</span>
      </span>
      <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5 ${five ? "xl:hidden 2xl:block" : ""}`} aria-hidden="true" />
    </button>
  );
}

export const quickGridClass = (count: number) =>
  `grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 ${count === 5 ? "xl:grid-cols-5" : count === 4 ? "xl:grid-cols-4" : "lg:grid-cols-3"}`;

export const statGridClass = (count: number) =>
  `grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 ${count === 4 ? "xl:grid-cols-4" : "lg:grid-cols-3"}`;

/** Bienvenida: título grande, subtítulo y la fecha de hoy. */
export function Welcome({ title, subtitle, lang, titleTestId }: { title: string; subtitle: string; lang: string; titleTestId?: string }) {
  const today = new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  return (
    <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-6">
      <div className="min-w-0">
        <h1 className="text-[26px] sm:text-[32px] leading-tight font-extrabold text-foreground tracking-tight break-words" data-testid={titleTestId}>{title}</h1>
        <p className="text-sm sm:text-[15px] text-muted-foreground mt-1">{subtitle}</p>
      </div>
      <time dateTime={new Date().toISOString().slice(0, 10)} className="shrink-0 text-sm font-medium text-muted-foreground first-letter:uppercase sm:pb-1" data-testid="home-date">{today}</time>
    </header>
  );
}

/** Selector del período del gráfico (3, 6 o 12 meses). */
export function RangeSelect<T extends number>({ value, options, onChange, label, optionLabel, testId }: {
  value: T; options: readonly T[]; onChange: (value: T) => void; label: string; optionLabel: (n: T) => string; testId: string;
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value) as T)}
        className="appearance-none h-11 rounded-xl border border-border bg-card ps-3.5 pe-9 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
        data-testid={testId}
      >
        {options.map((n) => <option key={n} value={n}>{optionLabel(n)}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
    </label>
  );
}

/** Leyenda del gráfico de actividad (pacientes nuevos y fotografías). */
export function ChartLegend({ patients, photos }: { patients: string; photos: string }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 mb-2 text-xs font-medium text-muted-foreground" aria-hidden="true">
      <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES_COLORS.patients }} />{patients}</li>
      <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES_COLORS.photos }} />{photos}</li>
    </ul>
  );
}
