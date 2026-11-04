import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider, LANGS } from "@/lib/language";
import { MyDataRequests } from "./my-data-requests";
import { MY_REQUESTS_TEXT, DATA_RIGHTS_TEXT } from "@/lib/data-rights-i18n";

const day = 86_400_000;
const item = (over: Record<string, unknown> = {}) => ({ id: "r1", type: "access", status: "pending", createdAt: new Date().toISOString(), dueAt: new Date(Date.now() + 20 * day).toISOString(), resolutionNote: "", ...over });
const reply = (requests: unknown[], status = 200) => vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ requests }), { status }));
const wrap = () => render(<LanguageProvider><MyDataRequests token="tok-1" /></LanguageProvider>);

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe("Mis solicitudes (paciente)", () => {
  it("muestra el estado y la fecha límite de una solicitud abierta", async () => {
    reply([item()]);
    wrap();
    expect(await screen.findByText(/Recibida · Respuesta hasta el/)).toBeInTheDocument();
  });

  it("marca como vencida una solicitud abierta cuyo plazo pasó", async () => {
    reply([item({ dueAt: new Date(Date.now() - 2 * day).toISOString() })]);
    wrap();
    expect(await screen.findByText(/Plazo vencido el/)).toBeInTheDocument();
  });

  it("muestra la respuesta de la clínica en una solicitud resuelta y no muestra plazo", async () => {
    reply([item({ status: "resolved", resolutionNote: "Te enviamos tu copia" })]);
    wrap();
    expect(await screen.findByText("Resuelta")).toBeInTheDocument();
    expect(screen.getByText(/Te enviamos tu copia/)).toBeInTheDocument();
    expect(screen.queryByText(/Respuesta hasta/)).toBeNull();
  });

  it("avisa cuando no hay solicitudes y cuando falla la carga", async () => {
    reply([]);
    const { unmount } = wrap();
    expect(await screen.findByText("Aún no has hecho solicitudes.")).toBeInTheDocument();
    unmount();
    vi.restoreAllMocks();
    reply([], 500);
    wrap();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar tus solicitudes."));
  });

  it("tiene textos completos en los nueve idiomas", () => {
    for (const { code } of LANGS) {
      const x = MY_REQUESTS_TEXT[code];
      expect(x.title && x.empty && x.loadError && x.note && x.due("1") && x.overdue("1")).toBeTruthy();
      expect(Object.values(x.statuses).every(Boolean)).toBe(true);
      expect(DATA_RIGHTS_TEXT[code].types.withdrawal).toBeTruthy();
    }
  });
});
