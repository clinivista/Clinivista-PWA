import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SupraDashboard, type Dashboard } from "./supra-dashboard";
import { DirectorPanel } from "./director-panel";

const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
afterEach(() => vi.unstubAllGlobals());

const base = (over: Partial<Dashboard> = {}): Dashboard => ({
  generatedAt: new Date().toISOString(),
  clinics: { total: 5, active: 4, suspended: 1, payments: { upToDate: 2, expiring: 1, overdue: 1, noRecord: 1 }, expiringDays: 7 },
  users: { total: 12, active: 11, blocked: 1, medicos: 5, administrativos: 5, supra: 2 },
  patients: { total: 340, newThisMonth: 21 },
  documents: { transcribed: 57, transcribedThisMonth: 12 },
  tickets: { waiting: 2, attending: 1, resolved: 0, closed: 8, pending: 3, attendedTotal: 9, openedThisMonth: 4, resolvedThisMonth: 3, ratingAverage: 4.5, ratingCount: 6, firstResponseMinutes: 12 },
  services: { light: "green", checks: [{ key: "database", label: "Base de datos", status: "ok", detail: "ok", checkedAt: null }] },
  finance: null,
  ...over,
});

describe("Dashboard de supra-control", () => {
  it("muestra cifras, soporte y semáforo verde", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(base())));
    wrap(<SupraDashboard />);
    expect(await screen.findByTestId("tile-clinics")).toHaveTextContent("5");
    expect(screen.getByTestId("tile-patients")).toHaveTextContent("21 nuevos este mes");
    expect(screen.getByTestId("tile-documents")).toHaveTextContent("Documentos transcritos");
    expect(screen.getByTestId("tile-documents")).toHaveTextContent("57");
    expect(screen.getByTestId("tile-documents")).toHaveTextContent("12 este mes");
    expect(screen.getByTestId("tile-pending")).toHaveTextContent("3");
    expect(screen.getByTestId("support-first-response")).toHaveTextContent("12 min");
    expect(screen.getByTestId("traffic-light")).toHaveAttribute("data-light", "green");
    expect(screen.getByTestId("traffic-light-title")).toHaveTextContent("Todos los servicios funcionan");
    expect(screen.queryByTestId("card-finance")).toBeNull();
  });

  it.each([["yellow", "Hay alguna alerta"], ["red", "Algún servicio no funciona"]] as const)("semáforo %s", async (light, text) => {
    vi.stubGlobal("fetch", vi.fn(async () => json(base({ services: { light, checks: [{ key: "storage", label: "Fotos", status: light === "red" ? "fail" : "warn", detail: "x", checkedAt: null }] } }))));
    wrap(<SupraDashboard />);
    expect(await screen.findByTestId("traffic-light-title")).toHaveTextContent(text);
    expect(screen.getByTestId("light-storage")).toHaveTextContent(light === "red" ? "Con falla" : "Atención");
  });

  it("muestra finanzas solo si el servidor las envía", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(base({ finance: { month: "2026-10", totals: { CLP: { income: 100000, expense: 40000, balance: 60000 } } } }))));
    wrap(<SupraDashboard />);
    expect(await screen.findByTestId("finance-CLP")).toHaveTextContent("Balance");
  });
});

describe("Panel de supra-control con menú lateral", () => {
  const stub = () => vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.startsWith("/api/supra/dashboard")) return json(base());
    if (url.startsWith("/api/support/queue")) return json({ counts: { waiting: 2, attending: 0, resolved: 0 }, tickets: [] });
    if (url.startsWith("/api/support/alerts")) return json({ waiting: 0, items: [] });
    if (url.startsWith("/api/supra/admin/banner")) return json({ problems: [], renewals: [] });
    return json({ centers: [] });
  }));

  it("aplica el tema a portales solo mientras el panel está montado", () => {
    stub();
    const { unmount } = wrap(<DirectorPanel onLogout={() => {}} />);
    expect(document.body).toHaveClass("supra-dashboard");
    expect(document.body).not.toHaveClass("clinic-dashboard");
    unmount();
    expect(document.body).not.toHaveClass("supra-dashboard");
  });

  it("abre en el dashboard y navega por el menú", async () => {
    stub();
    wrap(<DirectorPanel onLogout={() => {}} />);
    expect(await screen.findByTestId("supra-dashboard")).toBeInTheDocument();
    expect(await screen.findByTestId("supra-nav-badge")).toHaveTextContent("2");
    await userEvent.click(screen.getByTestId("supra-nav-support"));
    expect(await screen.findByTestId("supra-inbox")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("supra-nav-clinics"));
    expect(await screen.findByRole("button", { name: /Crear clínica/ })).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("supra-nav-team"));
    expect(screen.getByTestId("supra-title")).toHaveTextContent("Equipo de supra-control");
  });

  it("un administrativo no ve equipo, administración ni cambiar de clínica", async () => {
    stub();
    wrap(<DirectorPanel onLogout={() => {}} canManageUsers={false} />);
    await screen.findByTestId("supra-dashboard");
    expect(screen.queryByTestId("supra-nav-team")).toBeNull();
    expect(screen.queryByTestId("supra-nav-admin")).toBeNull();
    expect(screen.queryByTestId("director-choose-clinic")).toBeNull();
  });

  it("en tablets la tarjeta de cada clínica apila el nombre y los botones (no los aprieta en una fila)", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.startsWith("/api/supra/dashboard")) return json(base());
      if (url.startsWith("/api/support/queue")) return json({ counts: { waiting: 0, attending: 0, resolved: 0 }, tickets: [] });
      if (url.startsWith("/api/support/alerts")) return json({ waiting: 0, items: [] });
      if (url.startsWith("/api/supra/admin/banner")) return json({ problems: [], renewals: [] });
      return json({ centers: [{ id: "c1", name: "Clínica con un nombre bastante largo de prueba", slug: "larga", active: true, paymentStatus: "al_dia", paidUntil: null, patientCount: 3, staffCount: 2, specialty: "capilar", logoDataUrl: "data:image/png;base64,AAAA" }] });
    }));
    wrap(<DirectorPanel onLogout={() => {}} />);
    await userEvent.click(await screen.findByTestId("supra-nav-clinics"));
    const card = await screen.findByTestId("center-card-c1");
    expect(card.className).toContain("flex-col");
    // Los botones van siempre debajo de los datos: en PC y tablets con menú lateral no queda espacio para ponerlos al lado.
    expect(card.className).not.toMatch(/flex-row/);
    const name = screen.getByRole("heading", { name: "Clínica con un nombre bastante largo de prueba" });
    expect(name.className).toContain("break-words");
    expect(name.className).not.toContain("truncate");
  });
});
