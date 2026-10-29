import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import { Toaster } from "@/components/ui/toaster";
import { IntegrationsPanel } from "./integrations-panel";

const CATALOG = [
  { id: "facebook", category: "redes" }, { id: "instagram", category: "redes" }, { id: "linkedin", category: "redes" },
  { id: "medilink", category: "agenda" }, { id: "agendapro", category: "agenda" }, { id: "reservo", category: "agenda" },
  { id: "whatsapp", category: "mensajeria" },
];

let requested: string[];
let failWrites: boolean;
let fetchSpy: ReturnType<typeof vi.spyOn>;

const json = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  window.localStorage.clear();
  requested = [];
  failWrites = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchSpy = vi.spyOn(globalThis as any, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const method = (init as RequestInit | undefined)?.method ?? "GET";
    if (url.endsWith("/api/clinic/integrations")) return json({ catalog: CATALOG, requested });
    const match = url.match(new RegExp("/api/clinic/integrations/([^/]+)/request$"));
    if (match) {
      if (failWrites) return json({ error: "x" }, 500);
      if (method === "PUT") requested = [...new Set([...requested, match[1]!])];
      if (method === "DELETE") requested = requested.filter((id) => id !== match[1]);
      return json({ catalog: CATALOG, requested });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
});
afterEach(() => vi.restoreAllMocks());

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><LanguageProvider><IntegrationsPanel /><Toaster /></LanguageProvider></QueryClientProvider>);
}

describe("Integraciones disponibles", () => {
  it("muestra redes sociales, sistemas de agenda y mensajería con cada marca como próximamente", async () => {
    renderPanel();
    const redes = await screen.findByTestId("integrations-redes");
    expect(within(redes).getByText("Redes sociales")).toBeInTheDocument();
    for (const name of ["Facebook", "Instagram", "LinkedIn"]) expect(within(redes).getByText(name)).toBeInTheDocument();
    const agenda = screen.getByTestId("integrations-agenda");
    expect(within(agenda).getByText("Sistemas de agenda")).toBeInTheDocument();
    for (const name of ["Medilink", "AgendaPro", "Reservo"]) expect(within(agenda).getByText(name)).toBeInTheDocument();
    expect(screen.getByTestId("integrations-mensajeria")).toBeInTheDocument();
    expect(screen.getAllByText("Próximamente")).toHaveLength(CATALOG.length);
  });

  it("solicita una integración y permite quitar la solicitud", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderPanel();
    const card = await screen.findByTestId("integration-medilink");
    await user.click(within(card).getByRole("button", { name: /Solicitar integración: Medilink/ }));
    expect(await screen.findByTestId("integration-medilink-requested")).toBeInTheDocument();
    expect(requested).toEqual(["medilink"]);
    expect(screen.queryByTestId("integration-agendapro-requested")).not.toBeInTheDocument();
    await user.click(within(screen.getByTestId("integration-medilink")).getByRole("button", { name: /Quitar solicitud: Medilink/ }));
    await waitFor(() => expect(screen.queryByTestId("integration-medilink-requested")).not.toBeInTheDocument());
    expect(requested).toEqual([]);
  });

  it("muestra como solicitadas las que la clínica ya pidió", async () => {
    requested = ["instagram"];
    renderPanel();
    expect(await screen.findByTestId("integration-instagram-requested")).toBeInTheDocument();
    expect(screen.queryByTestId("integration-facebook-requested")).not.toBeInTheDocument();
  });

  it("si no se puede guardar, avisa y no marca la solicitud", async () => {
    failWrites = true;
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderPanel();
    await user.click(await screen.findByRole("button", { name: /Solicitar integración: Reservo/ }));
    expect(await screen.findByText("No pudimos guardar tu solicitud")).toBeInTheDocument();
    expect(screen.queryByTestId("integration-reservo-requested")).not.toBeInTheDocument();
  });

  it("se traduce y en árabe va de derecha a izquierda", async () => {
    window.localStorage.setItem("clinivista_lang", "en");
    const { unmount } = renderPanel();
    expect(await screen.findByText("Social networks")).toBeInTheDocument();
    expect(screen.getAllByText("Coming soon").length).toBeGreaterThan(0);
    unmount();
    window.localStorage.setItem("clinivista_lang", "ar");
    renderPanel();
    expect(await screen.findByTestId("integrations-panel")).toHaveAttribute("dir", "rtl");
  });
});

describe("Integraciones disponibles — logos", () => {
  it("muestra el logo de Reservo y la inicial en las marcas sin logo", async () => {
    renderPanel();
    expect(await screen.findByTestId("integration-reservo-logo")).toBeInTheDocument();
    expect(await screen.findByTestId("integration-medilink-logo")).toBeInTheDocument();
    expect(screen.queryByTestId("integration-facebook-logo")).not.toBeInTheDocument();
  });
});
