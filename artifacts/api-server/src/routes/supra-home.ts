import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { requireSupraAuth } from "./auth";
import { CLINIC_TIME_ZONE, monthWindow } from "./clinic-home";
import { CHECK_LABELS } from "../lib/service-monitor";

// Inicio de supra-control: solo cifras agregadas de la plataforma y datos de
// clínicas, tickets y servicios. Nunca nombres, fotos ni identificadores de pacientes.
const router: IRouter = Router();

const MONTH_OPTIONS = [3, 6, 12] as const;
const DEFAULT_ACTIVITY = 8;
const MAX_ACTIVITY = 20;
const DEFAULT_RECENT = 6;
const MAX_RECENT = 20;

type MonthCount = { month: string; count: number };
const rowsOf = <T>(result: unknown) => (result as { rows: T[] }).rows;
const clamp = (raw: unknown, fallback: number, max: number) => {
  const value = Math.trunc(Number(raw ?? fallback));
  return Number.isFinite(value) ? Math.min(max, Math.max(1, value)) : fallback;
};
// Mismo criterio que el resumen de la plataforma: sin pacientes de demostración ni consultas adicionales.
const realPatient = sql`coalesce(l.is_demo, false) = false and l.parent_lead_id is null`;
const monthOf = (column: ReturnType<typeof sql>) => sql`to_char(${column} at time zone ${CLINIC_TIME_ZONE}, 'YYYY-MM')`;

router.get("/supra/overview/monthly", async (req, res): Promise<void> => {
  if (!requireSupraAuth(req, res)) return;
  const requested = Number(req.query.months ?? 6);
  const months = (MONTH_OPTIONS as readonly number[]).includes(requested) ? requested : 6;
  const window = monthWindow(months);
  const since = window[0]!;

  // Un conteo por mes (desde el primer mes de la ventana) de cada tabla, todas las clínicas.
  const [patients, photos, clinics] = await Promise.all([
    db.execute(sql`
      select ${monthOf(sql`l.created_at`)} as month, count(*)::int as count from leads l
      where ${realPatient} and ${monthOf(sql`l.created_at`)} >= ${since} group by 1`),
    db.execute(sql`
      select ${monthOf(sql`p.created_at`)} as month, count(*)::int as count
      from clinical_photos p
      join clinical_evaluations e on e.id = p.evaluation_id
      join leads l on l.id = e.lead_id
      where coalesce(l.is_demo, false) = false and p.status in ('draft', 'confirmed') and p.original_mime_type not like 'video/%'
        and ${monthOf(sql`p.created_at`)} >= ${since}
      group by 1`),
    db.execute(sql`
      select ${monthOf(sql`c.created_at`)} as month, count(*)::int as count from clinical_centers c
      where ${monthOf(sql`c.created_at`)} >= ${since} group by 1`),
  ]);
  const byMonth = (result: unknown) => new Map(rowsOf<MonthCount>(result).map((row) => [row.month, Number(row.count)]));
  const [p, f, c] = [byMonth(patients), byMonth(photos), byMonth(clinics)];
  res.json({ monthly: window.map((month) => ({ month, patients: p.get(month) ?? 0, photos: f.get(month) ?? 0, clinics: c.get(month) ?? 0 })) });
});

type ActivityRow = { type: string; clinic_name: string | null; service_key: string | null; at: Date | string };

router.get("/supra/activity", async (req, res): Promise<void> => {
  if (!requireSupraAuth(req, res)) return;
  const limit = clamp(req.query.limit, DEFAULT_ACTIVITY, MAX_ACTIVITY);
  // De los tickets solo se usa la clínica y la fecha: el asunto lo escribe la clínica y podría nombrar a un paciente.
  const rows = rowsOf<ActivityRow>(await db.execute(sql`
    select type, clinic_name, service_key, at from (
      select 'clinic_created' as type, c.name as clinic_name, null::text as service_key, c.created_at as at
      from clinical_centers c
      union all
      select 'ticket_opened', c.name, null, t.created_at
      from support_tickets t left join clinical_centers c on c.id = t.center_id
      union all
      select 'ticket_resolved', c.name, null, coalesce(t.resolved_at, t.closed_at)
      from support_tickets t left join clinical_centers c on c.id = t.center_id
      where t.resolved_at is not null or t.closed_at is not null
      union all
      select 'service_alert', null, s.check_key, s.changed_at
      from admin_service_status s
      where s.status in ('warn', 'fail')
    ) events
    order by at desc
    limit ${limit}`));
  res.json({
    events: rows.map((row) => ({
      type: row.type,
      clinicName: row.clinic_name ?? null,
      serviceLabel: row.service_key ? (CHECK_LABELS[row.service_key] ?? row.service_key) : null,
      at: new Date(row.at).toISOString(),
    })),
  });
});

type RecentRow = { id: string; name: string; specialty: string; logo: string | null; created_at: Date | string; plan: string; patients: number };

router.get("/supra/clinics/recent", async (req, res): Promise<void> => {
  if (!requireSupraAuth(req, res)) return;
  const limit = clamp(req.query.limit, DEFAULT_RECENT, MAX_RECENT);
  // Un solo conteo agrupado de pacientes para las clínicas pedidas (sin una consulta por clínica).
  const rows = rowsOf<RecentRow>(await db.execute(sql`
    select c.id, c.name, c.specialty, c.logo_data_url as logo, c.created_at, c.plan, coalesce(n.patients, 0)::int as patients
    from (select * from clinical_centers order by created_at desc limit ${limit}) c
    left join (
      select l.center_id, count(*)::int as patients from leads l where ${realPatient} group by l.center_id
    ) n on n.center_id = c.id
    order by c.created_at desc`));
  res.json({
    clinics: rows.map((row) => ({
      id: row.id,
      name: row.name,
      specialty: row.specialty,
      patients: Number(row.patients),
      logo: row.logo ?? null,
      createdAt: new Date(row.created_at).toISOString(),
      plan: row.plan,
    })),
  });
});

export default router;
