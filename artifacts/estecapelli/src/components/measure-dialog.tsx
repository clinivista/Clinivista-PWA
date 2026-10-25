import { useState } from "react";
import { Ruler } from "lucide-react";
import type { PhotoMeasurement } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MeasureTool, type MeasurePayload } from "@/components/measure-tool";
import { useLanguage } from "@/lib/language";
import { MEASURE_TEXT } from "@/lib/measure-i18n";

/** «58,0 mm» / «5.8 cm»: la medida en milímetros con el decimal del idioma. */
export const formatMm = (mm: number, lang: string) => mm.toFixed(1).replace(".", lang === "en" || lang === "zh" || lang === "tr" ? "." : ",");

type Props = {
  /** Dirección de la medida de esta foto (PUT guarda, DELETE quita). */
  endpoint: string;
  imageUrl: string;
  role: "patient" | "staff";
  measurement: PhotoMeasurement | null | undefined;
  onChanged: (measurement: PhotoMeasurement | null) => void;
  disabled?: boolean;
  compact?: boolean;
};

async function call(endpoint: string, method: "PUT" | "DELETE", body?: unknown): Promise<PhotoMeasurement | null> {
  const response = await fetch(endpoint, {
    method, credentials: "include", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as { measurement?: PhotoMeasurement | null; error?: string };
  if (!response.ok) throw new Error(data.error ?? "");
  return data.measurement ?? null;
}

/** Botón «Medir» + la medida actual de la foto; abre la herramienta de medición en una ventana. */
export function MeasureDialog({ endpoint, imageUrl, role, measurement, onChanged, disabled, compact }: Props) {
  const { lang } = useLanguage();
  const c = MEASURE_TEXT[lang];
  const [open, setOpen] = useState(false);

  const save = async (payload: MeasurePayload) => {
    onChanged(await call(endpoint, "PUT", payload));
    setOpen(false);
  };
  const remove = async () => {
    await call(endpoint, "DELETE");
    onChanged(null);
    setOpen(false);
  };

  return (
    <div className={`flex flex-col gap-1.5 ${compact ? "items-center" : ""}`} data-testid="measure-dialog">
      {measurement && (
        <p className="text-xs font-bold text-primary" data-testid="measure-badge">
          {c.measuredBadge(formatMm(measurement.lengthMm, lang))} · ±{measurement.uncertaintyPct}%
          {role === "staff" && <span className="block font-medium text-muted-foreground">{c.measuredBy(measurement.by === "patient" ? c.patientBy : measurement.byName || c.staffBy)}</span>}
        </p>
      )}
      <Button type="button" size="sm" variant="outline" className="rounded-full h-8 px-3 text-xs" disabled={disabled} onClick={() => setOpen(true)} data-testid="measure-open">
        <Ruler className="w-3.5 h-3.5 mr-1.5" />{role === "patient" ? (measurement ? c.remeasureButton : c.measureButton) : (measurement ? c.remeasureButton : c.staffMeasure)}
      </Button>
      {role === "patient" && !measurement && !compact && <p className="text-xs text-muted-foreground">{c.optionalNote}</p>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>{c.toolTitle}</DialogTitle>
            <DialogDescription>{role === "patient" ? c.resultNoteLead : c.toolTitle}</DialogDescription>
          </DialogHeader>
          {open && <MeasureTool imageUrl={imageUrl} role={role} initial={measurement} onSave={save} onRemove={remove} onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
