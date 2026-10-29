import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import { ContractNotice } from "./contract-notice";
import { CONTRACT_TEXT } from "@/lib/contract-i18n";

const contract = {
  title: "Contrato de servicio Clinivista", version: "v1", hash: "abc",
  clauses: [{ title: "1. Objeto", body: "Licencia de uso." }], annexTitle: "Anexo: Plan Basic", annex: [{ label: "Almacenamiento", value: "50 GB" }],
};
const view = (over: Record<string, unknown> = {}) => ({ enabled: true, plan: "basic", accepted: false, acceptance: null, canAccept: true, contract, ...over });

let posted: unknown = null;
function stub(payload: unknown, ok = true) {
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") { posted = JSON.parse(String(init.body)); return new Response("{}", { status: 201 }); }
    return ok ? new Response(JSON.stringify(payload), { status: 200 }) : new Response("{}", { status: 500 });
  }));
}
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LanguageProvider><ContractNotice /></LanguageProvider></QueryClientProvider>);

beforeEach(() => { posted = null; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("ContractNotice", () => {
  it("no muestra nada si el contrato está apagado, ya aceptado o la consulta falla", async () => {
    for (const [payload, ok] of [[{ enabled: false }, true], [view({ accepted: true }), true], [{}, false]] as const) {
      stub(payload, ok);
      const { unmount } = mount();
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(screen.queryByTestId("contract-notice")).toBeNull();
      unmount();
    }
  });

  it("avisa, abre el contrato y solo acepta tras marcar la casilla, enviando versión y huella", async () => {
    stub(view());
    mount();
    await userEvent.click(await screen.findByRole("button", { name: CONTRACT_TEXT.es.review }));
    expect(await screen.findByTestId("contract-text")).toHaveTextContent("Licencia de uso.");
    const accept = screen.getByRole("button", { name: CONTRACT_TEXT.es.accept });
    expect(accept).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox"));
    expect(accept).toBeEnabled();
    await userEvent.click(accept);
    await waitFor(() => expect(posted).toEqual({ version: "v1", hash: "abc" }));
  });

  it("quien no puede aceptar solo lee el contrato", async () => {
    stub(view({ canAccept: false }));
    mount();
    await userEvent.click(await screen.findByRole("button", { name: CONTRACT_TEXT.es.review }));
    expect(await screen.findByText(CONTRACT_TEXT.es.onlyAdmin)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CONTRACT_TEXT.es.accept })).toBeNull();
  });
});

describe("CONTRACT_TEXT", () => {
  it("las 9 lenguas tienen las mismas claves y ninguna vacía", () => {
    const keys = Object.keys(CONTRACT_TEXT.es).sort();
    expect(Object.keys(CONTRACT_TEXT)).toHaveLength(9);
    for (const text of Object.values(CONTRACT_TEXT)) {
      expect(Object.keys(text).sort()).toEqual(keys);
      for (const value of Object.values(text)) expect(value.length).toBeGreaterThan(0);
    }
  });
});
