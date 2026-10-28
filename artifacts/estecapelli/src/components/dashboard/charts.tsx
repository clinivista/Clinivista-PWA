import { useEffect, useId, useRef, useState } from "react";

/** Textos del gráfico de actividad (los aportan el Inicio de clínica y el de supra-control). */
export type ChartText = { chartTitle: string; chartPatients: string; chartPhotos: string; chartEmpty: string; chartMonth: string };

// Serie «Nuevos pacientes» y «Fotografías»: azul oscuro y violeta claro. Se distinguen
// también con daltonismo (ΔE 18), a diferencia de un azul y un violeta de igual luminosidad.
export const SERIES_COLORS = { patients: "#1D5FB8", photos: "#A78BFA" } as const;

/** Mini-gráfico de una tarjeta de indicador. Decorativo: la cifra y el chip ya dicen lo mismo. */
export function Sparkline({ values, color, testId }: { values: number[]; color: string; testId?: string }) {
  const gradient = useId();
  const width = 120;
  const height = 32;
  const pad = 3;
  const max = Math.max(...values, 0);
  const min = Math.min(...values, max);
  const span = max - min;
  const points = values.map((value, i) => {
    const x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * width;
    // Sin variación (p. ej. todo en cero) la línea queda plana abajo: no se inventa una tendencia.
    const y = span === 0 ? height - pad : height - pad - ((value - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block h-8 w-full" aria-hidden="true" focusable="false" data-testid={testId} data-values={values.join(",")}>
      <defs>
        <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradient})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export type MonthPoint = { month: string; patients: number; photos: number };

const monthDate = (month: string) => {
  const [year, m] = month.split("-").map(Number) as [number, number];
  return new Date(year, m - 1, 15);
};

/** Escala «redonda» con 4 tramos: 0–4, 0–8, 0–20, 0–80, 0–200… */
export function niceScale(max: number): { top: number; step: number } {
  if (max <= 4) return { top: 4, step: 1 };
  const raw = max / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * power).find((candidate) => candidate >= raw)!;
  return { top: step * 4, step };
}

/**
 * Barras agrupadas por mes (pacientes nuevos y fotografías). El eje del tiempo va
 * siempre de izquierda a derecha, también en árabe, como los números. Cada mes se
 * puede enfocar con el teclado y muestra su detalle; hay además una tabla para
 * lectores de pantalla.
 */
export function ActivityChart({ data, lang, text }: { data: MonthPoint[]; lang: string; text: ChartText }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(640);
  const [measuredH, setMeasuredH] = useState(240);
  const [active, setActive] = useState<number | null>(null);
  const captionId = useId();

  useEffect(() => {
    const element = wrapRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.width <= 0) return;
      setMeasured(entry.contentRect.width);
      setMeasuredH(entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // En pantallas angostas cada mes conserva un ancho mínimo y el gráfico se desplaza en horizontal.
  const width = Math.max(measured, data.length * 40 + 40);
  // Ocupa el alto de su tarjeta (junto a «Actividad reciente»), nunca menos de 240 px.
  const height = Math.max(240, Math.floor(measuredH));
  const margin = { top: 12, right: 8, bottom: 28, left: 32 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const max = Math.max(0, ...data.flatMap((d) => [d.patients, d.photos]));
  const { top, step } = niceScale(max);
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const column = plotW / Math.max(1, data.length);
  const barW = Math.max(6, Math.min(18, (column - 14) / 2));
  const y = (value: number) => margin.top + plotH - (value / top) * plotH;
  const number = new Intl.NumberFormat(lang);
  const shortMonth = new Intl.DateTimeFormat(lang, { month: "short" });
  const longMonth = new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" });
  const empty = max === 0;

  const bar = (x: number, value: number, color: string, key: string) => {
    if (value <= 0) return null;
    const h = Math.max(2, (value / top) * plotH);
    const r = Math.min(4, barW / 2, h);
    const yTop = margin.top + plotH - h;
    // Esquinas redondeadas solo arriba; la base queda recta sobre el eje.
    const d = `M${x} ${margin.top + plotH} V${yTop + r} Q${x} ${yTop} ${x + r} ${yTop} H${x + barW - r} Q${x + barW} ${yTop} ${x + barW} ${yTop + r} V${margin.top + plotH} Z`;
    return <path key={key} d={d} fill={color} />;
  };

  const activePoint = active === null ? null : data[active];
  const tooltipLeft = active === null ? 0 : margin.left + column * active + column / 2;

  return (
    <div className="relative flex-1 min-h-[240px]" dir="ltr">
      <div ref={wrapRef} className="absolute inset-0 overflow-x-auto overflow-y-hidden overscroll-x-contain" data-testid="activity-chart">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" aria-labelledby={captionId} onMouseLeave={() => setActive(null)}>
          <title id={captionId}>{text.chartTitle}</title>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} stroke="hsl(var(--border))" strokeDasharray={tick === 0 ? undefined : "3 4"} />
              <text x={margin.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">{number.format(tick)}</text>
            </g>
          ))}
          {data.map((point, i) => {
            const x0 = margin.left + column * i;
            const center = x0 + column / 2;
            const label = `${longMonth.format(monthDate(point.month))}: ${text.chartPatients} ${number.format(point.patients)}, ${text.chartPhotos} ${number.format(point.photos)}`;
            return (
              <g
                key={point.month}
                role="img"
                aria-label={label}
                tabIndex={0}
                className="outline-none focus-visible:[&>rect:first-child]:stroke-[hsl(var(--ring))]"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                data-testid="activity-month"
              >
                <rect x={x0 + 2} y={margin.top} width={column - 4} height={plotH} rx={8} fill={active === i ? "hsl(var(--muted))" : "transparent"} stroke="transparent" strokeWidth={2} />
                {bar(center - barW - 1, point.patients, SERIES_COLORS.patients, "p")}
                {bar(center + 1, point.photos, SERIES_COLORS.photos, "f")}
                <text x={center} y={height - 8} textAnchor="middle" className="fill-muted-foreground text-[11px] capitalize">{shortMonth.format(monthDate(point.month)).replace(".", "")}</text>
              </g>
            );
          })}
        </svg>
      </div>
      {empty && (
        <p className="pointer-events-none absolute inset-x-0 top-[38%] text-center text-sm font-medium text-muted-foreground" data-testid="activity-chart-empty">{text.chartEmpty}</p>
      )}
      {activePoint && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(tooltipLeft - (wrapRef.current?.scrollLeft ?? 0), 80), measured - 80) }}
          data-testid="activity-tooltip"
        >
          <p className="font-semibold text-foreground capitalize mb-1">{longMonth.format(monthDate(activePoint.month))}</p>
          <p className="flex items-center gap-2 text-foreground"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES_COLORS.patients }} aria-hidden="true" />{text.chartPatients}: <b className="tabular-nums">{number.format(activePoint.patients)}</b></p>
          <p className="flex items-center gap-2 text-foreground"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES_COLORS.photos }} aria-hidden="true" />{text.chartPhotos}: <b className="tabular-nums">{number.format(activePoint.photos)}</b></p>
        </div>
      )}
      <table className="sr-only">
        <caption>{text.chartTitle}</caption>
        <thead><tr><th scope="col">{text.chartMonth}</th><th scope="col">{text.chartPatients}</th><th scope="col">{text.chartPhotos}</th></tr></thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.month}><th scope="row">{longMonth.format(monthDate(point.month))}</th><td>{point.patients}</td><td>{point.photos}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
