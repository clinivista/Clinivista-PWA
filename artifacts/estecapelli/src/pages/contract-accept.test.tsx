import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const state = vi.hoisted(() => ({ search: "?token=abc123abc123abc123abc123" }));
vi.mock("wouter", () => ({ useSearch: () => state.search, Link: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { LanguageProvider } from "@/lib/language";
import { CONTRACT_TEXT } from "@/lib/contract-i18n";
import ContractAccept from "./contract-accept";

const contract = { title: "Contrato", version: "v1", hash: "h1", clauses: [{ title: "1. Objeto", body: "Licencia de uso." }], annexTitle: "Anexo: Plan Basic", annex: [{ label: "Almacenamiento", value: "50 GB" }] };
const info = (accepted: unknown = null) => ({ clinicName: "Clínica A", recipientName: "Lia", plan: "basic", contract, accepted });
let posted: unknown = null;

function stub(get: { status: number; body: unknown }, post: { status: number } = { status: 201 }) {
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") { posted = JSON.parse(String(init.body)); return new Response("{}", { status: post.status }); }
    return new Response(JSON.stringify(get.body), { status: get.status });
  }));
}
const mount = () => render(<LanguageProvider><ContractAccept /></LanguageProvider>);

beforeEach(() => { posted = null; localStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Página de aceptación del contrato (enlace del correo)", () => {
  it("enlace inválido o vencido: avisa sin mostrar el contrato", async () => {
    stub({ status: 404, body: { error: "x" } });
    mount();
    expect(await screen.findByTestId("contract-invalid")).toHaveTextContent(CONTRACT_TEXT.es.linkInvalid);
    expect(screen.queryByTestId("contract-text")).toBeNull();
  });

  it("muestra el contrato y solo acepta con la casilla marcada, enviando token, versión y huella", async () => {
    stub({ status: 200, body: info() });
    mount();
    expect(await screen.findByTestId("contract-text")).toHaveTextContent("Licencia de uso.");
    const accept = screen.getByRole("button", { name: CONTRACT_TEXT.es.accept });
    expect(accept).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(accept);
    await waitFor(() => expect(posted).toEqual({ token: "abc123abc123abc123abc123", version: "v1", hash: "h1" }));
    expect(await screen.findByTestId("contract-done")).toHaveTextContent(CONTRACT_TEXT.es.thanks);
  });

  it("si ya estaba aceptado, lo dice y no pide aceptar de nuevo", async () => {
    stub({ status: 200, body: info({ at: "2026-11-02T15:00:00Z", by: "Lia" }) });
    mount();
    expect(await screen.findByTestId("contract-done")).toHaveTextContent(/2026/);
    expect(screen.queryByRole("button", { name: CONTRACT_TEXT.es.accept })).toBeNull();
  });
});
