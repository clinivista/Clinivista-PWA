import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { canManageClinicUsers, requireStaffAuth } from "./auth";
import { DEFAULT_CENTER_ID } from "../lib/clinical-photos";

// Pantalla de Inicio del dashboard de clínica: solo lecturas agregadas de la
// clínica de la sesión, calculadas en SQL (sin una consulta por paciente).
const router: IRouter = Router();

// Las clínicas aún no guardan su zona horaria: los meses se cuentan en hora de Chile.
export const CLINIC_TIME_ZONE = "America/Santiago";
const MONTH_OPTIONS = [3, 6, 12] as const;
const DEFAULT_ACTIVITY = 8;
const MAX_ACTIVITY = 20;

/** "YYYY-MM" de los últimos `count` meses (el actual al final) en la zona horaria de la clínica. */
export function monthWindow(count: number, now = new Date(), timeZone = CLINIC_TIME_ZONE): string[] {
  const [year, month] = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" }).format(now).split("-").map(Number) as [number, number];
  return Array.from({ length: count }, (_, i) => {
    const index = year * 12 + (month - 1) - (count - 1 - i);
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
  });
}

const sameClinic = (centerId: string) => sql`coalesce(l.center_id, ${DEFAULT_CENTER_ID}) = ${centerId}`;
// Fotografías de la clínica: borradores y confirmadas (no las descartadas ni los videos).
const visiblePhoto = sql`p.status in ('draft', 'confirmed') and p.original_mime_type not like 'video/%'`;

type MonthCount = { month: string; count: number };
const rowsOf = <T>(result: unknown) => (result as { rows: T[] }).rows;

router.get("/clinic/overview", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const requested = Number(req.query.months ?? 6);
  const months = (MONTH_OPTIONS as readonly number[]).includes(requested) ? requested : 6;

  // Un conteo por mes calendario de toda la historia de la clínica (pocas filas):
  // de ahí salen a la vez los totales, el mes actual y la ventana pedida.
  const [patientRows, photoRows] = await Promise.all([
    db.execute(sql`
      select to_char(l.created_at at time zone ${CLINIC_TIME_ZONE}, 'YYYY-MM') as month, count(*)::int as count
      from leads l
      where ${sameClinic(staff.centerId)} and l.parent_lead_id is null
      group by 1`),
    db.execute(sql`
      select to_char(p.created_at at time zone ${CLINIC_TIME_ZONE}, 'YYYY-MM') as month, count(*)::int as count
      from clinical_photos p
      join clinical_evaluations e on e.id = p.evaluation_id
      join leads l on l.id = e.lead_id
      where ${sameClinic(staff.centerId)} and ${visiblePhoto}
      group by 1`),
  ]);
  const byMonth = (rows: MonthCount[]) => new Map(rows.map((row) => [row.month, Number(row.count)]));
  const patients = byMonth(rowsOf<MonthCount>(patientRows));
  const photos = byMonth(rowsOf<MonthCount>(photoRows));
  const sum = (counts: Map<string, number>) => [...counts.values()].reduce((total, count) => total + count, 0);
  const window = monthWindow(months);

  // «Profesionales activos» solo para quien puede ver los usuarios de la clínica.
  const [viewer] = await db.select().from(usersTable).where(eq(usersTable.id, staff.userId));
  let activeProfessionals: number | null = null;
  if (viewer && viewer.centerId === staff.centerId && canManageClinicUsers(viewer)) {
    const [row] = rowsOf<{ count: number }>(await db.execute(sql`
      select count(*)::int as count from users
      where center_id = ${staff.centerId} and active and role in ('medico', 'administrativo')`));
    activeProfessionals = Number(row?.count ?? 0);
  }

  res.json({
    monthly: window.map((month) => ({ month, patients: patients.get(month) ?? 0, photos: photos.get(month) ?? 0 })),
    totals: {
      patients: sum(patients),
      photos: sum(photos),
      thisMonth: patients.get(window[window.length - 1]!) ?? 0,
      activeProfessionals,
    },
  });
});

type ActivityRow = { type: string; lead_id: string; lead_name: string; at: Date | string; count: number };

router.get("/clinic/activity", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const requested = Math.trunc(Number(req.query.limit ?? DEFAULT_ACTIVITY));
  const limit = Number.isFinite(requested) ? Math.min(MAX_ACTIVITY, Math.max(1, requested)) : DEFAULT_ACTIVITY;
  const clinic = sameClinic(staff.centerId);

  // Solo qué pasó, con quién y cuándo: ningún dato clínico, nota ni documento.
  // Las fotos del mismo paciente en un mismo día son un solo evento («5 fotografías»).
  const rows = rowsOf<ActivityRow>(await db.execute(sql`
    select type, lead_id, lead_name, at, count from (
      select 'photos' as type, coalesce(l.parent_lead_id, l.id) as lead_id, l.name as lead_name, max(p.created_at) as at, count(*)::int as count
      from clinical_photos p
      join clinical_evaluations e on e.id = p.evaluation_id
      join leads l on l.id = e.lead_id
      where ${clinic} and ${visiblePhoto}
      group by l.id, l.parent_lead_id, l.name, (p.created_at at time zone ${CLINIC_TIME_ZONE})::date
      union all
      select 'patient', l.id, l.name, l.created_at, 1
      from leads l
      where ${clinic} and l.parent_lead_id is null
      union all
      select 'measured', coalesce(l.parent_lead_id, l.id), l.name, a.created_at, 1
      from clinical_photo_audit_events a
      join clinical_evaluations e on e.id = a.evaluation_id
      join leads l on l.id = e.lead_id
      where ${clinic} and a.action = 'measured'
      union all
      select 'discharged', coalesce(l.parent_lead_id, l.id), l.name, l.discharged_at, 1
      from leads l
      where ${clinic} and l.discharged_at is not null
    ) events
    order by at desc
    limit ${limit}`));

  res.json({
    events: rows.map((row) => ({
      type: row.type,
      leadId: row.lead_id,
      leadName: row.lead_name ?? "",
      at: new Date(row.at).toISOString(),
      count: Number(row.count),
    })),
  });
});

export default router;
