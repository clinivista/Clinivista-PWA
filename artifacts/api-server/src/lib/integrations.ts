import { and, eq } from "drizzle-orm";
import { db, integrationRequestsTable, usersTable } from "@workspace/db";
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
