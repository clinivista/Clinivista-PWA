import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CenterIntegrationsPanel } from "./center-integrations-panel";

afterEach(() => vi.restoreAllMocks());

const json = (body: object) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
const renderPanel = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CenterIntegrationsPanel centerId="clinic-a" /></QueryClientProvider>);

describe("Supra-control: integraciones solicitadas", () => {
  it("lista qué pidió la clínica, quién y cuándo", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(globalThis as any, "fetch").mockResolvedValue(json({ requests: [
      { integration: "medilink", requestedByName: "Ana Admin", requestedByEmail: "ana@x.cl", createdAt: "2026-10-10T12:00:00Z" },
      { integration: "instagram", requestedByName: "", requestedByEmail: "beto@x.cl", createdAt: "2026-10-12T12:00:00Z" },
    ] }));
    renderPanel();
    expect(await screen.findByTestId("requested-medilink")).toHaveTextContent("Medilink · Ana Admin");
    expect(screen.getByTestId("requested-instagram")).toHaveTextContent("Instagram · beto@x.cl");
    expect(screen.getByText("Integraciones solicitadas")).toBeInTheDocument();
  });

  it("sin solicitudes lo dice", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(globalThis as any, "fetch").mockResolvedValue(json({ requests: [] }));
    renderPanel();
    expect(await screen.findByText("La clínica aún no ha pedido ninguna integración.")).toBeInTheDocument();
  });

  it("si falla la consulta no muestra nada", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(globalThis as any, "fetch").mockResolvedValue(new Response("{}", { status: 500 }));
    const { container } = renderPanel();
    await new Promise((r) => setTimeout(r, 30));
    expect(container).toBeEmptyDOMElement();
  });
});
