/** Detalle legible de un error de carga (código HTTP y mensaje del servidor) para mostrarlo bajo el aviso genérico. */
export function loadErrorDetail(error: unknown, codeWord = "Código"): string {
  if (!error || typeof error !== "object") return "";
  const { status, data, message } = error as { status?: number; data?: { error?: string } | null; message?: string };
  const server = typeof data?.error === "string" ? data.error : "";
  const parts = [typeof status === "number" ? `${codeWord} ${status}` : "", server || (typeof status === "number" ? "" : message ?? "")].filter(Boolean);
  return parts.join(" · ");
}
