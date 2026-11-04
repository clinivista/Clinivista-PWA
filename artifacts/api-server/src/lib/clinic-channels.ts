import { eq } from "drizzle-orm";
import { db, centersTable } from "@workspace/db";
import { DEFAULT_CENTER_ID } from "./clinical-photos";

/** Canales con los que una clínica puede entregar resultados. SMS está preparado, pero todavía no envía nada. */
export const ACTIVE_CHANNELS = ["email", "whatsapp"] as const;
export const COMING_CHANNELS = ["sms"] as const;
export type ResultChannel = (typeof ACTIVE_CHANNELS)[number];

/** Clínicas que existían antes de elegir canales: correo y WhatsApp activos hasta que su administración configure. */
export const DEFAULT_CHANNELS: ResultChannel[] = ["email", "whatsapp"];

/** Texto guardado → lista de canales válidos, en orden fijo y sin repetir. Vacío = ninguno (la clínica debe elegir). */
export function parseChannels(stored: string | null | undefined): ResultChannel[] {
  const wanted = new Set(String(stored ?? "").split(",").map((part) => part.trim()));
  return ACTIVE_CHANNELS.filter((channel) => wanted.has(channel));
}

export async function getClinicChannels(centerId: string | null | undefined): Promise<ResultChannel[]> {
  const [center] = await db.select({ resultChannels: centersTable.resultChannels }).from(centersTable).where(eq(centersTable.id, centerId ?? DEFAULT_CENTER_ID));
  return center ? parseChannels(center.resultChannels) : [...DEFAULT_CHANNELS];
}

export async function setClinicChannels(centerId: string, channels: ResultChannel[]): Promise<void> {
  await db.update(centersTable).set({ resultChannels: channels.join(",") }).where(eq(centersTable.id, centerId));
}

/**
 * Valida el canal de resultados elegido contra los canales de la clínica. Devuelve el mensaje de error o null.
 * `required`: el paciente debe haber elegido uno (no hay opción preseleccionada).
 */
export async function channelProblem(centerId: string | null | undefined, channel: string, required: boolean): Promise<string | null> {
  if (!channel) return required ? "Elige cómo quieres recibir tus resultados." : null;
  const allowed = await getClinicChannels(centerId);
  return allowed.includes(channel as ResultChannel) ? null : "Esta clínica no entrega resultados por ese canal. Elige otra opción.";
}
