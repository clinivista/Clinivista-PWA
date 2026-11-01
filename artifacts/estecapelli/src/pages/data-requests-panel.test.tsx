import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider, LANGS } from "@/lib/language";
import { Toaster } from "@/components/ui/toaster";
import { DataRequestsPanel } from "./data-requests-panel";
import { DataRightsDialog } from "@/components/data-rights-dialog";
import { DATA_REQUESTS_PANEL_TEXT, DATA_RIGHTS_TEXT } from "@/lib/data-rights-i18n";

const due = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
const row = (over: Record<string, unknown> = {}) => ({ id: "r1", leadId: "lead-1", type: "portability", message: "Quiero mis datos", status: "pending", dueAt: due(20), resolvedAt: null, resolvedByName: "", resolutionNote: "", patientName: "Paciente Uno", ...over });

const wrap = (ui: React.ReactElement) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LanguageProvider>{ui}<Toaster /></LanguageProvider></QueryClientProvider>,
);

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe("Solicitudes de datos (clínica)", () => {
  it("lista las solicitudes con el paciente y el plazo, y permite resolver", async () => {
    const calls: Array<{ url: string; method: string; body?: string }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input); calls.push({ url, method: init?.method ?? "GET", body: init?.body as string | undefined });
      if (url.endsWith("/api/clinic/data-requests") && !init?.method) return new Response(JSON.stringify({ requests: [row()] }), { status: 200 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    localStorage.setItem("clinivista_lang", "es");
    wrap(<DataRequestsPanel />);
    expect(await screen.findByText("Paciente Uno")).toBeInTheDocument();
    expect(screen.getByText(/Portabilidad/)).toBeInTheDocument();
    expect(screen.getByText(/Responder antes del/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("resolve-r1"));
    await waitFor(() => expect(calls.some((call) => call.method === "PATCH" && call.url.endsWith("/api/clinic/data-requests/r1") && JSON.parse(call.body ?? "{}").status === "resolved")).toBe(true));
    expect(await screen.findByText("Cambio guardado")).toBeInTheDocument();
  });

  it("marca como vencida una solicitud fuera de plazo y muestra el aviso vacío cuando no hay", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ requests: [row({ dueAt: due(-2) })] }), { status: 200 }));
    localStorage.setItem("clinivista_lang", "es");
    const first = wrap(<DataRequestsPanel />);
    expect(await screen.findByText("Vencida")).toBeInTheDocument();
    first.unmount();
    spy.mockResolvedValue(new Response(JSON.stringify({ requests: [] }), { status: 200 }));
    wrap(<DataRequestsPanel />);
    expect(await screen.findByTestId("data-requests-empty")).toBeInTheDocument();
  });

  it("muestra quién abrió la ficha", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("access-log")) return new Response(JSON.stringify({ events: [{ id: "e1", userId: "u1", action: "view", createdAt: new Date().toISOString() }] }), { status: 200 });
      return new Response(JSON.stringify({ requests: [row()] }), { status: 200 });
    });
    localStorage.setItem("clinivista_lang", "es");
    wrap(<DataRequestsPanel />);
    fireEvent.click(await screen.findByRole("button", { name: /Quién abrió esta ficha/ }));
    expect(await screen.findByText("Abrió la ficha")).toBeInTheDocument();
  });
});

describe("Mis datos y derechos (paciente)", () => {
  it("envía la solicitud con el tipo elegido y muestra la fecha límite", async () => {
    const calls: Array<{ url: string; body: string }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      calls.push({ url: String(input), body: String(init?.body) });
      return new Response(JSON.stringify({ ok: true, id: "x", dueAt: due(30) }), { status: 201 });
    });
    localStorage.setItem("clinivista_lang", "es");
    wrap(<DataRightsDialog token="tok-1" />);
    fireEvent.click(screen.getByTestId("data-rights-open"));
    fireEvent.click(screen.getByLabelText(/Eliminación de mis datos/));
    fireEvent.click(screen.getByTestId("data-rights-send"));
    expect(await screen.findByTestId("data-rights-sent")).toHaveTextContent(/Solicitud enviada/);
    expect(calls[0].url).toBe("/api/patients/tok-1/data-requests");
    expect(JSON.parse(calls[0].body).type).toBe("erasure");
  });

  it("avisa cuando hay demasiadas solicitudes o falla el envío", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 429 }));
    localStorage.setItem("clinivista_lang", "es");
    wrap(<DataRightsDialog token="tok-1" />);
    fireEvent.click(screen.getByTestId("data-rights-open"));
    fireEvent.click(screen.getByTestId("data-rights-send"));
    expect(await screen.findByText(/demasiadas solicitudes/)).toBeInTheDocument();
    spy.mockResolvedValue(new Response("{}", { status: 500 }));
    fireEvent.click(screen.getByTestId("data-rights-send"));
    expect(await screen.findByText(/No pudimos enviar tu solicitud/)).toBeInTheDocument();
  });
});

describe("Textos en los nueve idiomas", () => {
  it.each(LANGS.map((language) => language.code))("en %s: todos los textos existen y el botón coincide con la política", (code) => {
    const rights = DATA_RIGHTS_TEXT[code];
    const panel = DATA_REQUESTS_PANEL_TEXT[code];
    for (const value of [rights.button, rights.title, rights.intro, rights.send, rights.error, rights.tooMany, panel.nav, panel.title, panel.intro, panel.resolve, panel.reject]) expect(value.trim().length).toBeGreaterThan(1);
    expect(Object.values(rights.types).every((text) => text.trim().length > 1)).toBe(true);
    expect(Object.keys(panel.statuses)).toEqual(["pending", "in_progress", "resolved", "rejected"]);
    expect(rights.sentTitle("1/1/2027")).toContain("1/1/2027");
    // El nombre del botón que cita la política de privacidad debe ser el mismo que ve el paciente.
    expect(JSON.stringify(LEGAL_PRIVACY(code))).toContain(rights.button);
  });
});

import { LEGAL_TEXT } from "@/lib/legal-i18n";
const LEGAL_PRIVACY = (code: keyof typeof LEGAL_TEXT) => LEGAL_TEXT[code].privacy.sections;
