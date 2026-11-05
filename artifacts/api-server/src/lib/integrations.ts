import { and, eq } from "drizzle-orm";
import { db, clinicBookingLinksTable, integrationRequestsTable, usersTable } from "@workspace/db";
import { uid } from "./helpers";

/** Catálogo de «Integraciones disponibles». Aún no se conecta ninguna: la clínica solo puede pedirla. */
export const INTEGRATION_CATALOG = [
  { id: "facebook", category: "redes" },
  { id: "instagram", category: "redes" },
  { id: "linkedin", category: "redes" },
  { id: "tiktok", category: "redes" },
  { id: "youtube", category: "redes" },
  { id: "medilink", category: "agenda" },
  { id: "agendapro", category: "agenda" },
  { id: "reservo", category: "agenda" },
  { id: "google_calendar", category: "agenda" },
  { id: "whatsapp", category: "mensajeria" },
] as const;

export type IntegrationId = (typeof INTEGRATION_CATALOG)[number]["id"];

export const isIntegration = (value: unknown): value is IntegrationId =>
  typeof value === "string" && INTEGRATION_CATALOG.some((item) => item.id === value);

/** Integraciones pedidas por una clínica. Si la tabla aún no existe devuelve vacío (el catálogo sigue visible). */
export async function requestedIntegrations(centerId: string): Promise<string[]> {
  try {
    const rows = await db.select().from(integrationRequestsTable).where(eq(integrationRequestsTable.centerId, centerId));
    return rows.map((row) => row.integration);
  } catch {
    return [];
  }
}

export type IntegrationRequestRow = { integration: string; requestedByName: string; requestedByEmail: string; createdAt: string };

/** Detalle para supra-control: quién pidió qué y cuándo. */
export async function integrationRequestsOf(centerId: string): Promise<IntegrationRequestRow[]> {
  try {
    const rows = await db.select().from(integrationRequestsTable).where(eq(integrationRequestsTable.centerId, centerId));
    return rows
      .map((row) => ({ integration: row.integration, requestedByName: row.requestedByName, requestedByEmail: row.requestedByEmail, createdAt: row.createdAt.toISOString() }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

/** Registra la solicitud (idempotente: pedirla dos veces no duplica ni cambia a quién la pidió). */
export async function requestIntegration(centerId: string, integration: IntegrationId, userId: string): Promise<void> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  await db.insert(integrationRequestsTable).values({
    id: uid(),
    centerId,
    integration,
    requestedByUserId: userId,
    requestedByName: user?.name ?? "",
    requestedByEmail: user?.email ?? "",
  }).onConflictDoNothing();
}

export async function cancelIntegrationRequest(centerId: string, integration: IntegrationId): Promise<void> {
  await db.delete(integrationRequestsTable).where(and(eq(integrationRequestsTable.centerId, centerId), eq(integrationRequestsTable.integration, integration)));
}

/** Sistemas de agenda donde la clínica puede pegar su link de agendamiento en línea, en el orden en que se ofrece al paciente. */
export const BOOKING_INTEGRATIONS = ["medilink", "agendapro", "reservo"] as const;
export type BookingIntegration = (typeof BOOKING_INTEGRATIONS)[number];
export const isBookingIntegration = (value: unknown): value is BookingIntegration =>
  typeof value === "string" && (BOOKING_INTEGRATIONS as readonly string[]).includes(value);

const MAX_LINK = 300;

/** "" = quitar el link; el texto limpio si es un enlace https válido; null si no sirve. Sin http (inseguro) ni javascript:. */
export function parseBookingUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text === "") return "";
  if (text.length > MAX_LINK) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Links de agendamiento de la clínica: integración → enlace. Si la tabla aún no existe devuelve vacío. */
export async function bookingLinksOf(centerId: string): Promise<Record<string, string>> {
  try {
    const rows = await db.select().from(clinicBookingLinksTable).where(eq(clinicBookingLinksTable.centerId, centerId));
    return Object.fromEntries(rows.map((row) => [row.integration, row.url]));
  } catch {
    return {};
  }
}

export async function saveBookingLink(centerId: string, integration: BookingIntegration, url: string): Promise<void> {
  if (url === "") {
    await db.delete(clinicBookingLinksTable).where(and(eq(clinicBookingLinksTable.centerId, centerId), eq(clinicBookingLinksTable.integration, integration)));
    return;
  }
  await db.insert(clinicBookingLinksTable).values({ centerId, integration, url })
    .onConflictDoUpdate({ target: [clinicBookingLinksTable.centerId, clinicBookingLinksTable.integration], set: { url, updatedAt: new Date() } });
}

export type ClinicContact = { phone: string; whatsapp: string; bookingUrl: string; bookingName: string };
