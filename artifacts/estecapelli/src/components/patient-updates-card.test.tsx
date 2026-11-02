import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import { PatientUpdatesCard, UpdatesBadge } from "./patient-updates-card";

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
const wrap = (ui: React.ReactElement) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LanguageProvider>{ui}</LanguageProvider></QueryClientProvider>,
);
const now = new Date().toISOString();
const payload = {
  updates: [
    { id: "u1", kind: "data", details: { changes: { city: { from: "", to: "Santiago" } } }, createdAt: now, seenAt: null },
    { id: "u2", kind: "photo", details: { view: "Frontal" }, createdAt: now, seenAt: null },
  ],
  additions: [{ id: "a1", note: "Una mancha nueva", status: "pending", createdAt: now, resolvedByName: "", files: [{ index: 0, mimeType: "image/png" }] }],
};

describe("Novedades del paciente (clínica)", () => {
  it("muestra qué cambió, la foto reemplazada y el envío adicional con su imagen", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
    localStorage.setItem("clinivista_lang", "es");
    wrap(<PatientUpdatesCard leadId="lead-1" />);
    expect(await screen.findByText("Cambió sus datos")).toBeInTheDocument();
    expect(screen.getByText(/Ciudad:/)).toBeInTheDocument();
    expect(screen.getByText("Santiago")).toBeInTheDocument();
    expect(screen.getByText(/Reemplazó la foto: Frontal/)).toBeInTheDocument();
    expect(screen.getByText("Una mancha nueva")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("src", "/api/leads/lead-1/additions/a1/files/0");
  });

  it("incorpora o descarta un envío y marca las novedades como vistas", async () => {
    const calls: Array<{ url: string; method: string; body?: string }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input); const method = init?.method ?? "GET";
      calls.push({ url, method, body: init?.body as string | undefined });
      return new Response(JSON.stringify(method === "GET" ? payload : { ok: true }), { status: 200 });
    });
    localStorage.setItem("clinivista_lang", "es");
    wrap(<PatientUpdatesCard leadId="lead-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Incorporar a la ficha" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH" && c.url.endsWith("/additions/a1") && JSON.parse(c.body ?? "{}").status === "incorporated")).toBe(true));
    fireEvent.click(await screen.findByRole("button", { name: "Marcar como vistas" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.url.endsWith("/patient-updates/seen"))).toBe(true));
  });

  it("no muestra nada cuando el paciente no tiene novedades, y el distintivo solo aparece con novedades", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ updates: [], additions: [] }), { status: 200 }));
    localStorage.setItem("clinivista_lang", "es");
    const first = wrap(<PatientUpdatesCard leadId="lead-1" />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(first.container.querySelector("[data-testid=patient-updates]")).toBeNull();
    first.unmount();
    wrap(<><UpdatesBadge count={0} /><UpdatesBadge count={2} /></>);
    expect(screen.getAllByTestId("updates-badge")).toHaveLength(1);
  });
});
