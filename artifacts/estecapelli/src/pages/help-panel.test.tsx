import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import { HelpPanel } from "./help-panel";
import { loadManual } from "@/lib/help-i18n";
import type { LangCode } from "@/lib/language";

const wrap = (ui: React.ReactNode) => render(
  <LanguageProvider><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider></LanguageProvider>,
);

describe("Ayuda", () => {
  beforeEach(() => { localStorage.setItem("clinivista_lang", "es"); });

  it("los nueve idiomas tienen las mismas secciones que el original", async () => {
    const es = await loadManual("es");
    for (const code of ["en", "pt", "fr", "de", "it", "tr", "ar", "zh"] as LangCode[]) {
      const m = await loadManual(code);
      expect(m.patient.map((s) => s.id)).toEqual(es.patient.map((s) => s.id));
      expect(m.staff.map((s) => s.id)).toEqual(es.staff.map((s) => s.id));
      expect(m.staff.map((s) => s.blocks.length)).toEqual(es.staff.map((s) => s.blocks.length));
    }
  });

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

  it("el chat envía mensajes y muestra la conversación", async () => {
    const sent: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") { sent.push(JSON.parse(String(init.body)).body); return new Response(JSON.stringify({ id: "m2" }), { status: 201 }); }
      return new Response(JSON.stringify({ messages: [{ id: "m1", sender: "support", body: "Hola, ¿en qué te ayudo?", createdAt: new Date().toISOString() }], unread: 0 }), { status: 200 });
    }));
    wrap(<HelpPanel initialTab="support" />);
    expect(await screen.findByText("Hola, ¿en qué te ayudo?")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Escribe tu mensaje…"), "Necesito ayuda{Enter}");
    await waitFor(() => expect(sent).toEqual(["Necesito ayuda"]));
    vi.unstubAllGlobals();
  });
});
