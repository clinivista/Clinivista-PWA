import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import { HelpPanel } from "./help-panel";


const wrap = (ui: React.ReactNode) => render(
  <LanguageProvider><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider></LanguageProvider>,
);

describe("Ayuda", () => {
  beforeEach(() => { localStorage.setItem("clinivista_lang", "es"); });

  it("muestra el manual, busca y cambia de parte", async () => {
    wrap(<HelpPanel />);
    const article = await screen.findByTestId("help-article");
    expect(article).toHaveTextContent(/\d\.\d/);
    await userEvent.type(screen.getByPlaceholderText("Buscar en el manual…"), "zzzzqq");
    expect(await screen.findByText("No hay resultados.")).toBeInTheDocument();
    await userEvent.clear(screen.getByPlaceholderText("Buscar en el manual…"));
    await userEvent.click(screen.getByTestId("help-part-patient"));
    await waitFor(() => expect(screen.getByTestId("help-article")).toHaveTextContent("1.1"));
  });

  it("el manual cambia según la especialidad de la clínica", async () => {
    const { unmount } = wrap(<HelpPanel specialty="dermatologia" />);
    const article = await screen.findByTestId("help-article");
    expect(article).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(/Tipos de consulta y varias consultas por paciente/).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Varias clínicas con el mismo correo/).length).toBeGreaterThan(0);
    unmount();
    wrap(<HelpPanel specialty="capilar" />);
    await screen.findByTestId("help-article");
    await waitFor(() => expect(screen.getAllByText(/Varias clínicas con el mismo correo/).length).toBeGreaterThan(0));
    expect(screen.queryByText(/Tipos de consulta y varias consultas por paciente/)).not.toBeInTheDocument();
  });

  it("soporte: abre un ticket nuevo cuando no hay uno activo", async () => {
    const created: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") { created.push(JSON.parse(String(init.body))); return new Response(JSON.stringify({ id: "t1" }), { status: 201 }); }
      return new Response(JSON.stringify({ active: null, history: [{ id: "h1", number: 3, subject: "Fotos", status: "closed", createdAt: new Date().toISOString(), closedAt: new Date().toISOString(), rating: 5, ratingComment: "", attendants: [] }] }), { status: 200 });
    }));
    wrap(<HelpPanel initialTab="support" />);
    expect(await screen.findByTestId("ticket-new")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-history")).toHaveTextContent("Ticket #3 · Fotos");
    const create = screen.getByTestId("ticket-create");
    expect(create).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Asunto"), "Problema con usuarios");
    await userEvent.type(screen.getByLabelText("Describe tu consulta…"), "No puedo crear un usuario");
    await userEvent.click(create);
    await waitFor(() => expect(created).toEqual([{ subject: "Problema con usuarios", body: "No puedo crear un usuario", language: "es" }]));
    vi.unstubAllGlobals();
  });

  it("soporte: el ticket activo muestra el chat con el mensaje automático y se escribe en él", async () => {
    const sent: string[] = [];
    const ticket = { id: "t1", number: 7, subject: "Fotos", status: "waiting", createdAt: new Date().toISOString(), closedAt: null, rating: null, ratingComment: "", attendants: [] };
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") { sent.push(JSON.parse(String(init.body)).body); return new Response(JSON.stringify({ id: "m3" }), { status: 201 }); }
      if (String(url).includes("/messages")) {
        return new Response(JSON.stringify({ ticket, messages: [
          { id: "m1", sender: "staff", body: "No puedo subir fotos", createdAt: new Date().toISOString() },
          { id: "m2", sender: "system", body: "Recibimos tu consulta. Será atendida a la mayor brevedad posible.", createdAt: new Date().toISOString() },
        ] }), { status: 200 });
      }
      return new Response(JSON.stringify({ active: ticket, history: [] }), { status: 200 });
    }));
    wrap(<HelpPanel initialTab="support" />);
    expect(await screen.findByText(/Recibimos tu consulta/)).toBeInTheDocument();
    expect(screen.getByTestId("ticket-status")).toHaveTextContent("En espera");
    expect(screen.getByTestId("support-system-message")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Escribe tu mensaje…"), "Sigo con el problema{Enter}");
    await waitFor(() => expect(sent).toEqual(["Sigo con el problema"]));
    vi.unstubAllGlobals();
  });

  it("soporte: un ticket resuelto pide la valoración y no deja escribir", async () => {
    const rated: unknown[] = [];
    const ticket = { id: "t1", number: 7, subject: "Fotos", status: "resolved", createdAt: new Date().toISOString(), closedAt: null, rating: null, ratingComment: "", attendants: [{ id: "d1", name: "Dora" }] };
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") { rated.push(JSON.parse(String(init.body))); return new Response(JSON.stringify({ id: "t1" }), { status: 200 }); }
      if (String(url).includes("/messages")) return new Response(JSON.stringify({ ticket, messages: [] }), { status: 200 });
      return new Response(JSON.stringify({ active: ticket, history: [] }), { status: 200 });
    }));
    wrap(<HelpPanel initialTab="support" />);
    expect(await screen.findByTestId("ticket-rating")).toBeInTheDocument();
    expect(screen.queryByTestId("support-send")).toBeNull();
    expect(screen.getByText(/Atendido por: Dora/)).toBeInTheDocument();
    expect(screen.getByTestId("ticket-rate-send")).toBeDisabled();
    await userEvent.click(screen.getByTestId("star-4"));
    await userEvent.type(screen.getByLabelText("Comentario (opcional)"), "Buen trato");
    await userEvent.click(screen.getByTestId("ticket-rate-send"));
    await waitFor(() => expect(rated).toEqual([{ rating: 4, comment: "Buen trato" }]));
    vi.unstubAllGlobals();
  });
});
