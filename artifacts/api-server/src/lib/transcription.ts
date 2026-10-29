import sharp from "sharp";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db, centersTable, clinicalPhotosTable, evaluationsTable, photoTranscriptionsTable, transcriptionSettingsTable, transcriptionUsageTable } from "@workspace/db";
import { uid } from "./helpers";
import { PLAN_DEFAULT_LIMITS, centerPlan } from "./plans";

/** Básica = modelo económico (1 unidad de la cuota). Avanzada = reintento con un modelo más potente (2 unidades). */
export type TranscriptionTier = "basic" | "advanced";
export const TIER_UNITS: Record<TranscriptionTier, number> = { basic: 1, advanced: 2 };

export const MAX_TRANSCRIPTION_CHARS = 20_000;
const MAX_QUOTA = 100_000;
const IMAGE_MAX_SIDE = 1568;

export class TranscriptionError extends Error {
  constructor(message: string, readonly status: 400 | 403 | 404 | 409 | 429 | 502 | 503 = 400) {
    super(message);
  }
}

/** Los modelos se eligen por variable de entorno, así se cambian desde Render sin tocar el código. */
export function modelFor(tier: TranscriptionTier): string {
  const fromEnv = (tier === "basic" ? process.env.TRANSCRIPTION_MODEL : process.env.TRANSCRIPTION_ADVANCED_MODEL)?.trim();
  return fromEnv || (tier === "basic" ? "claude-haiku-5-5" : "claude-sonnet-5-5");
}

/**
 * Precio en USD por millón de tokens (entrada / salida) de cada nivel. Son los
 * de la tabla de Anthropic para Haiku 5.5 y Sonnet 5.5; si cambian, se ajustan
 * por variables de entorno sin tocar el código.
 */
export function ratesFor(tier: TranscriptionTier): { input: number; output: number } {
  const pick = (name: string, fallback: number) => {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  };
  return tier === "basic"
    ? { input: pick("TRANSCRIPTION_PRICE_BASIC_INPUT", 0.1), output: pick("TRANSCRIPTION_PRICE_BASIC_OUTPUT", 0.5) }
    : { input: pick("TRANSCRIPTION_PRICE_ADVANCED_INPUT", 2), output: pick("TRANSCRIPTION_PRICE_ADVANCED_OUTPUT", 10) };
}

export function estimateCostUsd(tier: TranscriptionTier, inputTokens: number, outputTokens: number): number {
  const rate = ratesFor(tier);
  return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
}

/** Consumo y costo estimado de IA de un mes (UTC) para supra-control: por clínica, por nivel y los últimos 12 meses. */
export async function getAiUsageReport(month: string) {
  const [year, mon] = month.split("-").map(Number) as [number, number];
  const from = new Date(Date.UTC(year, mon - 1, 1));
  const to = new Date(Date.UTC(year, mon, 1));
  const historyFrom = new Date(Date.UTC(year, mon - 12, 1));
  const rows = await db.select().from(transcriptionUsageTable)
    .where(and(gte(transcriptionUsageTable.createdAt, historyFrom), lt(transcriptionUsageTable.createdAt, to)));
  const cost = (row: { tier: string; inputTokens: number; outputTokens: number }) =>
    estimateCostUsd(row.tier === "advanced" ? "advanced" : "basic", row.inputTokens, row.outputTokens);
  const inMonth = rows.filter((row) => row.createdAt >= from);

  const sum = (list: typeof rows) => ({
    calls: list.length,
    units: list.reduce((n, row) => n + row.units, 0),
    inputTokens: list.reduce((n, row) => n + row.inputTokens, 0),
    outputTokens: list.reduce((n, row) => n + row.outputTokens, 0),
    costUsd: list.reduce((n, row) => n + cost(row), 0),
  });

  const centerIds = [...new Set(inMonth.map((row) => row.centerId))];
  const names = new Map<string, string>();
  const quotas = new Map<string, number>();
  if (centerIds.length) {
    for (const row of await db.select({ id: centersTable.id, name: centersTable.name }).from(centersTable).where(inArray(centersTable.id, centerIds))) names.set(row.id, row.name);
    for (const row of await db.select().from(transcriptionSettingsTable).where(inArray(transcriptionSettingsTable.centerId, centerIds))) quotas.set(row.centerId, row.monthlyQuota);
  }
  const history = Array.from({ length: 12 }, (_, i) => {
    const start = new Date(Date.UTC(year, mon - 12 + i, 1));
    const end = new Date(Date.UTC(year, mon - 11 + i, 1));
    return { month: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`, ...sum(rows.filter((row) => row.createdAt >= start && row.createdAt < end)) };
  });
  return {
    month,
    available: transcriptionConfigured(),
    rates: { basic: { model: modelFor("basic"), ...ratesFor("basic") }, advanced: { model: modelFor("advanced"), ...ratesFor("advanced") } },
    totals: sum(inMonth),
    byTier: (["basic", "advanced"] as const).map((tier) => ({ tier, model: modelFor(tier), ...sum(inMonth.filter((row) => row.tier === tier)) })),
    byClinic: centerIds.map((id) => ({
      centerId: id,
      name: names.get(id) ?? id,
      monthlyQuota: quotas.get(id) ?? defaultQuota(),
      ...sum(inMonth.filter((row) => row.centerId === id)),
    })).sort((a, b) => b.costUsd - a.costUsd),
    history,
  };
}

export const transcriptionConfigured = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY?.trim());

export function defaultQuota(): number {
  const parsed = Number(process.env.TRANSCRIPTION_DEFAULT_QUOTA);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_QUOTA ? parsed : 100;
}

export type TranscriptionSettings = { monthlyQuota: number; advancedEnabled: boolean };

/** Sin fila propia, la cuota es la del plan de la clínica (TRANSCRIPTION_DEFAULT_QUOTA, si existe, manda sobre todos). */
async function planQuota(centerId: string): Promise<number> {
  if (Number.isInteger(Number(process.env.TRANSCRIPTION_DEFAULT_QUOTA)) && process.env.TRANSCRIPTION_DEFAULT_QUOTA?.trim()) return defaultQuota();
  return PLAN_DEFAULT_LIMITS[await centerPlan(centerId)].transcriptionsPerMonth;
}

export async function getTranscriptionSettings(centerId: string): Promise<TranscriptionSettings> {
  const [row] = await db.select().from(transcriptionSettingsTable).where(eq(transcriptionSettingsTable.centerId, centerId));
  return row ? { monthlyQuota: row.monthlyQuota, advancedEnabled: row.advancedEnabled } : { monthlyQuota: await planQuota(centerId), advancedEnabled: false };
}

export async function saveTranscriptionSettings(centerId: string, input: { monthlyQuota?: number; advancedEnabled?: boolean }): Promise<TranscriptionSettings> {
  const current = await getTranscriptionSettings(centerId);
  const next = { ...current, ...input };
  if (!Number.isInteger(next.monthlyQuota) || next.monthlyQuota < 0 || next.monthlyQuota > MAX_QUOTA) {
    throw new TranscriptionError(`La cuota debe ser un número entero entre 0 y ${MAX_QUOTA}.`);
  }
  await db.insert(transcriptionSettingsTable)
    .values({ centerId, monthlyQuota: next.monthlyQuota, advancedEnabled: next.advancedEnabled })
    .onConflictDoUpdate({
      target: transcriptionSettingsTable.centerId,
      set: { monthlyQuota: next.monthlyQuota, advancedEnabled: next.advancedEnabled, updatedAt: new Date() },
    });
  return next;
}

/** El mes de la cuota es el mes calendario UTC: simple y predecible para todas las clínicas. */
function monthBounds(now = new Date()): { from: Date; to: Date } {
  return {
    from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    to: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

export async function getMonthlyUsage(centerId: string): Promise<{ units: number; inputTokens: number; outputTokens: number }> {
  const { from, to } = monthBounds();
  const [row] = await db.select({
    units: sql<number>`coalesce(sum(${transcriptionUsageTable.units}), 0)::int`,
    inputTokens: sql<number>`coalesce(sum(${transcriptionUsageTable.inputTokens}), 0)::int`,
    outputTokens: sql<number>`coalesce(sum(${transcriptionUsageTable.outputTokens}), 0)::int`,
  }).from(transcriptionUsageTable)
    .where(and(eq(transcriptionUsageTable.centerId, centerId), gte(transcriptionUsageTable.createdAt, from), lt(transcriptionUsageTable.createdAt, to)));
  return row ?? { units: 0, inputTokens: 0, outputTokens: 0 };
}

export async function getTranscriptionStatus(centerId: string) {
  const [settings, usage] = await Promise.all([getTranscriptionSettings(centerId), getMonthlyUsage(centerId)]);
  return {
    available: transcriptionConfigured(),
    monthlyQuota: settings.monthlyQuota,
    used: usage.units,
    remaining: Math.max(0, settings.monthlyQuota - usage.units),
    advancedEnabled: settings.advancedEnabled,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
  };
}

const PROMPT = [
  "Transcribe fielmente el documento de la imagen (una ficha o formulario clínico, posiblemente manuscrito).",
  "Reglas: conserva el orden, los saltos de línea y la estructura (títulos, campos, tablas simples como líneas con ' | ').",
  "Escribe en el mismo idioma del documento. No inventes ni completes datos que no se vean.",
  "Si una palabra o número no se puede leer con seguridad, escribe [ilegible]; si dudas, escribe la mejor lectura seguida de [?].",
  "Responde solo con la transcripción, sin comentarios ni explicaciones.",
].join("\n");

/** La imagen se reduce antes de enviarla: baja mucho el costo sin perder lo legible. */
async function prepareImage(bytes: Buffer): Promise<string> {
  const jpeg = await sharp(bytes, { limitInputPixels: 80_000_000 })
    .rotate()
    .resize({ width: IMAGE_MAX_SIDE, height: IMAGE_MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  return jpeg.toString("base64");
}

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export async function runTranscription(bytes: Buffer, tier: TranscriptionTier): Promise<{ text: string; model: string; inputTokens: number; outputTokens: number }> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new TranscriptionError("La transcripción no está configurada en el servidor.", 503);
  const model = modelFor(tier);
  const data = await prepareImage(bytes).catch(() => { throw new TranscriptionError("No se pudo leer la imagen."); });

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data } },
            { type: "text", text: PROMPT },
          ],
        }],
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new TranscriptionError("El servicio de transcripción no respondió. Intenta de nuevo en unos minutos.", 502);
  }
  if (!response.ok) {
    throw new TranscriptionError("El servicio de transcripción no pudo procesar la imagen. Intenta de nuevo en unos minutos.", 502);
  }
  const body = (await response.json()) as AnthropicResponse;
  const text = (body.content ?? []).filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n").trim();
  if (!text) throw new TranscriptionError("El servicio de transcripción devolvió una respuesta vacía.", 502);
  return {
    text: text.slice(0, MAX_TRANSCRIPTION_CHARS),
    model,
    inputTokens: body.usage?.input_tokens ?? 0,
    outputTokens: body.usage?.output_tokens ?? 0,
  };
}

/** Verifica la cuota, transcribe, guarda el texto y registra el uso. Solo se cobra lo que sale bien. */
export async function transcribePhoto(input: {
  centerId: string;
  photoId: string;
  tier: TranscriptionTier;
  bytes: Buffer;
  userId: string;
  userName: string;
}): Promise<{ text: string; tier: TranscriptionTier; model: string }> {
  const settings = await getTranscriptionSettings(input.centerId);
  if (input.tier === "advanced" && !settings.advancedEnabled) {
    throw new TranscriptionError("El reintento con modelo avanzado no está habilitado en el plan de esta clínica.", 403);
  }
  const usage = await getMonthlyUsage(input.centerId);
  if (usage.units + TIER_UNITS[input.tier] > settings.monthlyQuota) {
    throw new TranscriptionError("La clínica alcanzó su cuota mensual de transcripciones. Puedes escribir el texto a mano o esperar al próximo mes.", 429);
  }

  const result = await runTranscription(input.bytes, input.tier);
  const now = new Date();
  await db.insert(transcriptionUsageTable).values({
    id: uid(12),
    centerId: input.centerId,
    photoId: input.photoId,
    tier: input.tier,
    model: result.model,
    units: TIER_UNITS[input.tier],
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });
  await db.insert(photoTranscriptionsTable)
    .values({
      photoId: input.photoId,
      text: result.text,
      tier: input.tier,
      model: result.model,
      transcribedByUserId: input.userId,
      transcribedByName: input.userName,
      transcribedAt: now,
    })
    .onConflictDoUpdate({
      target: photoTranscriptionsTable.photoId,
      set: {
        text: result.text, tier: input.tier, model: result.model,
        transcribedByUserId: input.userId, transcribedByName: input.userName, transcribedAt: now,
        editedByName: null, editedAt: null,
      },
    });
  return { text: result.text, tier: input.tier, model: result.model };
}

export async function saveManualTranscription(photoId: string, text: string, userName: string): Promise<void> {
  const trimmed = text.slice(0, MAX_TRANSCRIPTION_CHARS);
  const now = new Date();
  await db.insert(photoTranscriptionsTable)
    .values({ photoId, text: trimmed, tier: "manual", model: "", transcribedByName: userName, transcribedAt: now, editedByName: userName, editedAt: now })
    .onConflictDoUpdate({
      target: photoTranscriptionsTable.photoId,
      set: { text: trimmed, editedByName: userName, editedAt: now },
    });
}

/** Documentos transcritos con IA (no los escritos a mano) cuya foto sigue vigente; de una clínica o de todas. */
export async function countTranscribedDocuments(centerId?: string): Promise<{ total: number; thisMonth: number }> {
  const { from } = monthBounds();
  const [row] = await db.select({
    total: sql<number>`count(*)::int`,
    thisMonth: sql<number>`count(*) filter (where ${photoTranscriptionsTable.transcribedAt} >= ${from})::int`,
  }).from(photoTranscriptionsTable)
    .innerJoin(clinicalPhotosTable, eq(clinicalPhotosTable.id, photoTranscriptionsTable.photoId))
    .innerJoin(evaluationsTable, eq(evaluationsTable.id, clinicalPhotosTable.evaluationId))
    .where(and(
      inArray(clinicalPhotosTable.status, ["draft", "confirmed"]),
      sql`${photoTranscriptionsTable.text} <> ''`,
      inArray(photoTranscriptionsTable.tier, ["basic", "advanced"]),
      centerId ? eq(evaluationsTable.centerId, centerId) : undefined,
    ));
  return { total: row?.total ?? 0, thisMonth: row?.thisMonth ?? 0 };
}
