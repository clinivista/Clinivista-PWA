import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGetDirectorCentersQueryKey } from "@workspace/api-client-react";
import { CalendarClock, Clock3, Gauge, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type PlanId = "basic" | "unlimited" | "titanium";
type HoursKind = "incluidas" | "compradas" | "usadas" | "ajuste";
type Defaults = { patientsPerMonth: number; storageGb: number; transcriptionsPerMonth: number; includedHours: number };
type View = {
  plan: PlanId;
  pendingPlan: PlanId | null;
  pendingPlanFrom: string | null;
  billing: { stage: string; paidUntil: string | null; auto: boolean; restricted: boolean };
  limits: Defaults & { fromClinic: { patientsPerMonth: boolean; storageGb: boolean } };
  planDefaults: Defaults;
  usage: { patientsThisMonth: number; storageBytes: number; transcriptionsThisMonth: number };
  hours: { includedMinutes: number; purchasedMinutes: number; adjustMinutes: number; usedMinutes: number; balanceMinutes: number; canBuy: boolean; customWork: boolean };
  hoursLog: Array<{ id: string; kind: HoursKind; minutes: number; note: string; createdAt: string }>;
};

const PLAN_NAMES: Record<PlanId, string> = { basic: "Básico", unlimited: "Ilimitado", titanium: "Titanium" };
const STAGES: Record<string, string> = {
  sin_registro: "Sin pago registrado", al_dia: "Al día", aviso: "Por vencer", gracia: "En gracia", solo_lectura: "Solo lectura", suspendida: "Suspendida",
};
const KIND_LABEL: Record<HoursKind, string> = { incluidas: "Incluidas en el contrato", compradas: "Compradas", usadas: "Usadas", ajuste: "Ajuste" };
const GB = 1024 * 1024 * 1024;

const hoursText = (minutes: number) => `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(minutes / 60)} h`;
const dateText = (iso: string) => new Date(iso).toLocaleDateString("es-CL", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Santiago" });
const limitText = (value: number) => (value === 0 ? "sin límite" : new Intl.NumberFormat("es-CL").format(value));

async function send(url: string, method: "PUT" | "POST", body: unknown): Promise<View> {
  const response = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(detail?.error ?? "");
  }
  return (await response.json()) as View;
}

/** Supra-control: plan, límites propios, cobro automático y horas de una clínica. Solo español. */
export function CenterPlanPanel({ centerId, centerName }: { centerId: string; centerName: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const base = `/api/director/centers/${encodeURIComponent(centerId)}`;
  const key = ["/api/director/centers", centerId, "plan"];
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await fetch(`${base}/plan`, { credentials: "include" });
      if (!response.ok) throw new Error();
      return (await response.json()) as View;
    },
  });
  const [target, setTarget] = useState<PlanId>("basic");
  const [now, setNow] = useState(false);
  const [patients, setPatients] = useState("");
  const [storage, setStorage] = useState("");
  const [hoursKind, setHoursKind] = useState<HoursKind>("incluidas");
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data || !data.limits) return;
    setTarget(data.plan);
    setPatients(data.limits.fromClinic.patientsPerMonth ? String(data.limits.patientsPerMonth) : "");
    setStorage(data.limits.fromClinic.storageGb ? String(data.limits.storageGb) : "");
  }, [data?.plan, data?.limits?.patientsPerMonth, data?.limits?.storageGb, data?.limits?.fromClinic?.patientsPerMonth, data?.limits?.fromClinic?.storageGb]);

  if (!data || typeof data.plan !== "string" || !data.limits || !data.usage) return null;

  const run = async (action: () => Promise<View>, success: string, refreshList = false) => {
    setBusy(true);
    try {
      queryClient.setQueryData(key, await action());
      if (refreshList) await queryClient.invalidateQueries({ queryKey: getGetDirectorCentersQueryKey() });
      toast({ title: centerName, description: success });
    } catch (error) {
      toast({ variant: "destructive", title: "No pudimos guardar", description: error instanceof Error && error.message ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const parseLimit = (text: string): number | null | undefined => {
    if (text.trim() === "") return null;
    const value = Number(text);
    return Number.isInteger(value) && value >= 0 && value <= 100000 ? value : undefined;
  };
  const patientsValue = parseLimit(patients);
  const storageValue = parseLimit(storage);
  const limitsValid = patientsValue !== undefined && storageValue !== undefined;
  const limitsDirty = limitsValid
    && (patientsValue !== (data.limits.fromClinic.patientsPerMonth ? data.limits.patientsPerMonth : null) || storageValue !== (data.limits.fromClinic.storageGb ? data.limits.storageGb : null));

  const hoursNumber = Number(hours);
  const hoursValid = hours.trim() !== "" && Number.isFinite(hoursNumber) && Math.round(hoursNumber * 60) % 15 === 0 && (hoursKind === "ajuste" ? hoursNumber !== 0 : hoursNumber > 0);
  const downgrade = ["basic", "unlimited", "titanium"].indexOf(target) < ["basic", "unlimited", "titanium"].indexOf(data.plan);
  const storageUsed = data.usage.storageBytes / GB;
  const mark = (own: boolean) => (own ? " (propio)" : " (del plan)");

  return (
    <div className="flex flex-col gap-4 pt-4 border-t border-[#E8E4DE]" data-testid={`plan-panel-${centerId}`}>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"><Gauge className="w-4 h-4" /> Plan, límites y horas</p>

      {/* Plan */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <label htmlFor={`plan-target-${centerId}`} className="text-sm text-muted-foreground">Plan:</label>
          <select
            id={`plan-target-${centerId}`}
            className="h-10 min-w-40 rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground"
            value={target}
            disabled={busy}
            onChange={(event) => setTarget(event.target.value as PlanId)}
          >
            {(Object.keys(PLAN_NAMES) as PlanId[]).map((plan) => <option key={plan} value={plan}>{PLAN_NAMES[plan]}</option>)}
          </select>
          <Button size="sm" className="rounded-full" disabled={busy || target === data.plan && !data.pendingPlan}
            onClick={() => void run(() => send(`${base}/plan-change`, "PUT", { plan: target, ...(now ? { mode: "now" } : {}) }), target === data.plan ? "Cambio programado anulado." : downgrade && !now && data.billing.paidUntil ? "Cambio programado para cuando venza lo pagado." : `Plan actualizado a ${PLAN_NAMES[target]}.`, true)}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar cambio"}
          </Button>
        </div>
        {downgrade && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" className="h-4 w-4" checked={now} onChange={(event) => setNow(event.target.checked)} />
            Bajar de inmediato, sin esperar a que venza lo pagado
          </label>
        )}
        <p className="text-xs text-muted-foreground">Subir de plan se aplica al instante. Bajar queda programado para cuando vence lo pagado (o se aplica ya si no hay pago registrado). No se borra nada.</p>
        {data.pendingPlan && data.pendingPlanFrom && (
          <p className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="plan-pending">
            <CalendarClock className="w-4 h-4" /> Bajará a {PLAN_NAMES[data.pendingPlan]} el {dateText(data.pendingPlanFrom)}.
            <Button size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => void run(() => send(`${base}/plan-change`, "PUT", { mode: "cancel" }), "Cambio programado anulado.", true)}>Anular</Button>
          </p>
        )}
      </div>

      {/* Uso del mes */}
      <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-3" data-testid="plan-usage">
        <li><span className="font-semibold">Pacientes del mes:</span> {data.usage.patientsThisMonth} de {limitText(data.limits.patientsPerMonth)}{mark(data.limits.fromClinic.patientsPerMonth)}</li>
        <li><span className="font-semibold">Almacenamiento:</span> {new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(storageUsed)} GB de {limitText(data.limits.storageGb)}{data.limits.storageGb === 0 ? "" : " GB"}{mark(data.limits.fromClinic.storageGb)}</li>
        <li><span className="font-semibold">Transcripciones:</span> {data.usage.transcriptionsThisMonth} de {data.limits.transcriptionsPerMonth} (se fija en «Transcripción de documentos»)</li>
      </ul>

      {/* Límites propios */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={`limit-patients-${centerId}`} className="text-xs text-muted-foreground">Pacientes nuevos al mes</label>
            <Input id={`limit-patients-${centerId}`} type="number" inputMode="numeric" min={0} max={100000} className="h-10 w-36 rounded-full" placeholder={`Plan: ${limitText(data.planDefaults.patientsPerMonth)}`} value={patients} onChange={(event) => setPatients(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`limit-storage-${centerId}`} className="text-xs text-muted-foreground">Almacenamiento (GB)</label>
            <Input id={`limit-storage-${centerId}`} type="number" inputMode="numeric" min={0} max={100000} className="h-10 w-36 rounded-full" placeholder={`Plan: ${limitText(data.planDefaults.storageGb)}`} value={storage} onChange={(event) => setStorage(event.target.value)} />
          </div>
          <Button size="sm" className="rounded-full" disabled={busy || !limitsValid || !limitsDirty}
            onClick={() => void run(() => send(`${base}/plan-settings`, "PUT", { patientsPerMonth: patientsValue, storageGb: storageValue }), "Límites guardados.")}>
            Guardar límites
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Vacío = el valor del plan · 0 = sin límite. Los pacientes y archivos ya guardados nunca se borran: al llegar al tope solo se impide agregar más.</p>
      </div>

      {/* Cobro */}
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4" checked={data.billing.auto} disabled={busy}
            onChange={(event) => void run(() => send(`${base}/plan-settings`, "PUT", { billingAuto: event.target.checked }), event.target.checked ? "Suspensión automática activada." : "Suspensión automática desactivada.")} />
          Aplicar restricciones automáticas por falta de pago
        </label>
        <p className="text-xs text-muted-foreground">
          Estado actual: <strong>{STAGES[data.billing.stage] ?? data.billing.stage}</strong>{data.billing.paidUntil ? ` (pagado hasta el ${dateText(data.billing.paidUntil)})` : ""}.
          Con esto activo: aviso 7 días antes de vencer, 5 días de gracia, solo lectura hasta el día 20 y suspensión desde el día 21. Los datos se conservan y todo vuelve al registrar el pago.
        </p>
      </div>

      {/* Horas */}
      <div className="flex flex-col gap-2" data-testid="plan-hours">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Clock3 className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold">Horas:</span>
          saldo {hoursText(data.hours.balanceMinutes)} · incluidas {hoursText(data.hours.includedMinutes)} · compradas {hoursText(data.hours.purchasedMinutes)} · usadas {hoursText(data.hours.usedMinutes)}
        </p>
        <p className="text-xs text-muted-foreground">
          Plan {PLAN_NAMES[data.plan]}: {data.hours.canBuy ? "puede comprar horas adicionales" : "no puede comprar horas adicionales"}; {data.hours.customWork ? "admite mejoras a medida" : "no admite mejoras a medida"}. Horas que se sugieren al contratar: {data.planDefaults.includedHours}.
        </p>
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          <select aria-label="Tipo de movimiento de horas" className="h-10 rounded-xl border border-input bg-card px-3 text-sm" value={hoursKind} onChange={(event) => setHoursKind(event.target.value as HoursKind)}>
            {(Object.keys(KIND_LABEL) as HoursKind[]).map((kind) => <option key={kind} value={kind} disabled={kind === "compradas" && !data.hours.canBuy}>{KIND_LABEL[kind]}</option>)}
          </select>
          <Input aria-label="Horas" type="number" inputMode="decimal" step={0.25} className="h-10 w-24 rounded-full" placeholder="Horas" value={hours} onChange={(event) => setHours(event.target.value)} />
          <Input aria-label="Detalle del movimiento" className="h-10 min-w-48 flex-1 rounded-full" maxLength={300} placeholder="Detalle (qué se hizo o se contrató)" value={note} onChange={(event) => setNote(event.target.value)} />
          <Button size="sm" className="rounded-full" disabled={busy || !hoursValid}
            onClick={() => void run(async () => { const result = await send(`${base}/hours`, "POST", { kind: hoursKind, hours: hoursNumber, note }); setHours(""); setNote(""); return result; }, "Horas registradas.")}>
            Registrar horas
          </Button>
        </div>
        {data.hoursLog.length > 0 && (
          <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground" data-testid="plan-hours-log">
            {data.hoursLog.slice(0, 6).map((row) => (
              <li key={row.id}>{dateText(row.createdAt)} · {KIND_LABEL[row.kind]} · {hoursText(row.minutes)}{row.note ? ` · ${row.note}` : ""}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
