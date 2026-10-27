import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { MEASURE_TEXT } from "@/lib/measure-i18n";
import { buildMeasureTrends, type TrendInput } from "@/lib/measure-trend";
import { formatMm } from "@/components/measure-dialog";

/** Cómo va cambiando la medida de una misma lesión entre las fases (solo para el personal). */
export function MeasureTrend({ phases }: { phases: TrendInput[] }) {
  const { lang } = useLanguage();
  const c = MEASURE_TEXT[lang];
  const series = useMemo(() => buildMeasureTrends(phases), [phases]);
  if (series.length === 0) return null;
  return (
    <section className="rounded-2xl border border-[#E8E4DE] bg-[#FBFAF8] p-4 mb-5" data-testid="measure-trend" aria-label={c.trendTitle}>
      <h4 className="font-bold text-foreground">{c.trendTitle}</h4>
      <div className="flex flex-col gap-4 mt-3">
        {series.map((item) => {
          const top = Math.max(...item.rows.map((row) => row.lengthMm), 1);
          return (
            <div key={item.label}>
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {item.rows.map((row) => {
                  const change = row.change;
                  const text = !change ? c.trendFirst
                    : change.verdict === "same" ? c.trendSame
                    : change.verdict === "up" ? c.trendUp(String(change.pct), formatMm(Math.abs(change.deltaMm), lang))
                    : c.trendDown(String(change.pct), formatMm(Math.abs(change.deltaMm), lang));
                  const Icon = !change || change.verdict === "same" ? Minus : change.verdict === "up" ? ArrowUpRight : ArrowDownRight;
                  return (
                    <li key={row.photoId} className="text-xs" data-testid="measure-trend-row">
                      <div className="flex items-center gap-2">
                        <span className="w-28 shrink-0 truncate text-muted-foreground">{row.phaseName}</span>
                        <div className="flex-1 h-2 rounded-full bg-black/5 overflow-hidden" aria-hidden="true">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (row.lengthMm / top) * 100)}%` }} />
                        </div>
                        <bdi dir="ltr" className="shrink-0 font-bold text-foreground">{formatMm(row.lengthMm, lang)} mm</bdi>
                        <bdi dir="ltr" className="shrink-0 text-muted-foreground">±{row.uncertaintyPct}%</bdi>
                      </div>
                      <p className="ps-[7.5rem] flex items-center gap-1 text-muted-foreground"><Icon className="w-3 h-3" aria-hidden="true" />{text}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-3">{c.trendNote}</p>
    </section>
  );
}
