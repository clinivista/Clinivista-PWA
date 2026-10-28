/**
 * Inicio de supra-control con el diseño del Inicio de clínica: cifras reales,
 * variación solo con mes anterior > 0, estados vacíos, campana de tickets en espera,
 * buscador de clínicas y permisos director / supra_admin. Datos ficticios; ningún
 * dato de pacientes. Solo se simula fetch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SupraDashboard, type Dashboard } from "./supra-dashboard";
import { DirectorPanel, normalizeName } from "./director-panel";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

const now = new Date();
const monthKey = (back: number) => { const d = new Date(now.getFullYear(), now.getMonth() - back, 15); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const months = (values: Array<[number, number, number]>) => values.map(([patients, photos, clinics], i) => ({ month: monthKey(values.length - 1 - i), patients, photos, clinics }));
const zeros = () => months(Array.from({ length: 12 }, () => [0, 0, 0] as [number, number, number]));
const ago = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();

const dashboard = (over: Partial<Dashboard> = {}): Dashboard => ({
  generatedAt: now.toISOString(),
  clinics: { total: 5, active: 4, suspended: 1, payments: { upToDate: 2, expiring: 1, overdue: 1, noRecord: 1 }, expiringDays: 7 },
  users: { total: 12, active: 11, blocked: 1, medicos: 5, administrativos: 5, supra: 2 },
  patients: { total: 115, newThisMonth: 5 },
  documents: { transcribed: 57, transcribedThisMonth: 12 },
  tickets: { waiting: 2, attending: 1, resolved: 0, closed: 8, pending: 3, attendedTotal: 9, openedThisMonth: 4, resolvedThisMonth: 3, ratingAverage: 4.5, ratingCount: 6, firstResponseMinutes: 12 },
  services: { light: "green", checks: [{ key: "database", label: "Base de datos", status: "ok", detail: "ok", checkedAt: null }] },
  finance: null,
  ...over,
});

let state: {
  dashboard: Dashboard; monthly: ReturnType<typeof months>; events: object[]; recent: object[]; centers: object[]; waiting: number; me: object;
};

const center = (id: string, name: string) => ({ id, name, slug: id, active: true, paymentStatus: "al_dia", paidUntil: null, patientCount: 3, staffCount: 2, specialty: "capilar", logoDataUrl: null, plan: "basic" });

beforeEach(() => {
  const monthly = zeros();
  monthly[10] = { ...monthly[10]!, patients: 10, photos: 40, clinics: 1 };
  monthly[11] = { ...monthly[11]!, patients: 5, photos: 20, clinics: 1 };
  state = {
    dashboard: dashboard(),
    monthly,
    events: [
      { type: "service_alert", clinicName: null, serviceLabel: "Fotos clínicas (almacenamiento R2)", at: ago(1) },
      { type: "ticket_opened", clinicName: "Clínica Sur", serviceLabel: null, at: ago(2) },
      { type: "ticket_resolved", clinicName: "Clínica Norte", serviceLabel: null, at: ago(3) },
      { type: "clinic_created", clinicName: "Clínica Sur", serviceLabel: null, at: ago(30) },
    ],
    recent: [
      { id: "c2", name: "Clínica Sur", specialty: "capilar", patients: 1, logo: null, createdAt: ago(30), plan: "basic" },
      { id: "c1", name: "Clínica Norte", specialty: "dermatologia", patients: 2, logo: "data:image/png;base64,AAAA", createdAt: ago(800), plan: "titanium" },
    ],
    centers: [center("c1", "Clínica Norte"), center("c2", "Clínica Sur"), center("c3", "Centro Ñuñoa")],
    waiting: 2,
    me: { authenticated: true, user: { id: "d1", email: "dir@example.com", name: "Directora Prueba", role: "director", centerId: null } },
  };
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.startsWith("/api/supra/dashboard")) return json(state.dashboard);
    if (url.startsWith("/api/supra/overview/monthly")) return json({ monthly: state.monthly });
    if (url.startsWith("/api/supra/activity")) return json({ events: state.events });
    if (url.startsWith("/api/supra/clinics/recent")) return json({ clinics: state.recent });
    if (url.startsWith("/api/auth/me")) return json(state.me);
    if (url.startsWith("/api/support/queue")) return json({ counts: { waiting: state.waiting, attending: 0, resolved: 0 }, tickets: [] });
    if (url.startsWith("/api/support/alerts")) return json({ waiting: 0, items: [] });
    if (url.startsWith("/api/supra/admin/banner")) return json({ problems: [], renewals: [] });
    if (url.startsWith("/api/director/centers")) return json({ centers: state.centers });
    if (url.startsWith("/api/director/me")) return json({ id: "d1", email: "dir@example.com", name: "Directora Prueba", phone: "", entryProfile: "medico" });
    return json({});
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("normalizeName", () => {
  it("ignora mayúsculas y tildes", () => {
    expect(normalizeName("  Centro ÑUÑOA ")).toBe("centro nunoa");
  });
});

describe("Inicio de supra-control", () => {
  it("bienvenida, accesos del director e indicadores con las cifras reales", async () => {
    wrap(<SupraDashboard userName="Directora Prueba" canManageUsers onNavigate={() => {}} />);
    expect(screen.getByRole("heading", { level: 1, name: "Bienvenido, Directora Prueba" })).toBeInTheDocument();
    const quick = screen.getByRole("region", { name: "Accesos rápidos" });
    expect(within(quick).getAllByRole("button").map((b) => b.getAttribute("data-testid"))).toEqual(["supra-quick-clinics", "supra-quick-support", "supra-quick-team", "supra-quick-admin"]);
    const clinics = await screen.findByTestId("tile-clinics");
    expect(clinics).toHaveTextContent("Clínicas activas");
    expect(clinics).toHaveTextContent("4");
    expect(clinics).toHaveTextContent("1 suspendida · 5 en total");
    expect(screen.getByTestId("tile-users")).toHaveTextContent("11");
    expect(screen.getByTestId("tile-pending")).toHaveTextContent("2 en espera · 1 en atención");
    expect(screen.getByTestId("tile-documents")).toHaveTextContent("57");
    expect(screen.getByTestId("support-first-response")).toHaveTextContent("12 min");
  });

  it("Pacientes totales: mini-gráfico acumulado y variación real (110 → 115 = +5 %)", async () => {
    wrap(<SupraDashboard />);
    const patients = await screen.findByTestId("tile-patients");
    await waitFor(() => expect(within(patients).getByTestId("supra-change")).toHaveTextContent("+5 %"));
    expect(screen.getByTestId("supra-spark-patients")).toHaveAttribute("data-values", "100,100,100,100,110,115");
    // Sin historial: ni chip ni mini-gráfico en las demás.
    expect(screen.getAllByTestId("supra-change")).toHaveLength(1);
    expect(screen.queryByTestId("supra-spark-clinics")).toBeNull();
  });

  it("sin chip si el mes anterior está en cero", async () => {
    const monthly = zeros();
    monthly[11] = { ...monthly[11]!, patients: 1, photos: 5, clinics: 1 };
    state.monthly = monthly;
    state.dashboard = dashboard({ patients: { total: 1, newThisMonth: 1 } });
    wrap(<SupraDashboard />);
    await screen.findByTestId("tile-patients");
    await screen.findByTestId("supra-spark-patients");
    expect(screen.queryByTestId("supra-change")).toBeNull();
  });

  it("plataforma vacía: ceros reales y estados vacíos", async () => {
    state.monthly = zeros();
    state.events = [];
    state.recent = [];
    state.dashboard = dashboard({
      clinics: { total: 0, active: 0, suspended: 0, payments: { upToDate: 0, expiring: 0, overdue: 0, noRecord: 0 }, expiringDays: 7 },
      users: { total: 0, active: 0, blocked: 0, medicos: 0, administrativos: 0, supra: 0 },
      patients: { total: 0, newThisMonth: 0 },
      tickets: { waiting: 0, attending: 0, resolved: 0, closed: 0, pending: 0, attendedTotal: 0, openedThisMonth: 0, resolvedThisMonth: 0, ratingAverage: null, ratingCount: 0, firstResponseMinutes: null },
    });
    wrap(<SupraDashboard />);
    expect(await screen.findByTestId("tile-clinics")).toHaveTextContent("0");
    expect(await screen.findByTestId("activity-chart-empty")).toHaveTextContent("Aún sin datos en este período");
    expect(await screen.findByTestId("supra-activity-empty")).toBeInTheDocument();
    expect(await screen.findByTestId("supra-recent-empty")).toBeInTheDocument();
    expect(screen.getByTestId("support-rating")).toHaveTextContent("sin valoraciones");
    expect(screen.queryByTestId("supra-change")).toBeNull();
  });

  it("gráfico 3/6/12 meses con pacientes nuevos y fotografías", async () => {
    const user = userEvent.setup();
    wrap(<SupraDashboard />);
    await waitFor(() => expect(screen.getAllByTestId("activity-month")).toHaveLength(6));
    await user.selectOptions(screen.getByLabelText("Período del gráfico"), "12");
    expect(screen.getAllByTestId("activity-month")).toHaveLength(12);
    await user.selectOptions(screen.getByLabelText("Período del gráfico"), "3");
    expect(screen.getAllByTestId("activity-month")[2]).toHaveAttribute("aria-label", expect.stringMatching(/Pacientes nuevos 5, Fotografías 20$/));
  });

  it("actividad reciente: clínicas, tickets y servicios, sin datos de pacientes", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    wrap(<SupraDashboard canManageUsers onNavigate={onNavigate} />);
    const rows = await screen.findAllByTestId("supra-event");
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining("Fotos clínicas (almacenamiento R2)Alerta de servicio"),
      expect.stringContaining("Clínica SurTicket abierto"),
      expect.stringContaining("Clínica NorteTicket resuelto"),
      expect.stringContaining("Clínica SurClínica creada"),
    ]);
    await user.click(rows[1]!);
    expect(onNavigate).toHaveBeenLastCalledWith("support");
    await user.click(rows[0]!);
    expect(onNavigate).toHaveBeenLastCalledWith("admin");
  });

  it("clínicas recientes: logo o inicial, especialidad, plan, pacientes; abre la clínica", async () => {
    const onOpenClinic = vi.fn();
    const user = userEvent.setup();
    wrap(<SupraDashboard onOpenClinic={onOpenClinic} />);
    const cards = await screen.findAllByTestId("supra-recent-clinic");
    expect(cards[0]).toHaveTextContent("Clínica Sur");
    expect(cards[0]).toHaveTextContent("Capilar · Plan Básico");
    expect(cards[0]).toHaveTextContent("1 paciente ·");
    expect(cards[1]).toHaveTextContent("Dermatología · Plan Titanium");
    expect(cards[1]).toHaveTextContent("2 pacientes");
    expect(cards[1]!.querySelector("img")).toHaveAttribute("src", "data:image/png;base64,AAAA");
    await user.click(cards[1]!);
    expect(onOpenClinic).toHaveBeenCalledWith("c1");
  });

  it("supra_admin: sin Equipo ni Servicios y finanzas, y las alertas de servicio no navegan", async () => {
    const onNavigate = vi.fn();
    wrap(<SupraDashboard canManageUsers={false} onNavigate={onNavigate} />);
    const quick = screen.getByRole("region", { name: "Accesos rápidos" });
    expect(within(quick).getAllByRole("button").map((b) => b.getAttribute("data-testid"))).toEqual(["supra-quick-clinics", "supra-quick-support"]);
    const rows = await screen.findAllByTestId("supra-event");
    expect(rows[0]!.tagName).toBe("DIV");
    expect(screen.queryByRole("button", { name: /Ver detalle/ })).toBeNull();
  });
});

describe("Panel de supra-control con la barra superior", () => {
  it("la campana muestra los tickets en espera y abre Soporte", async () => {
    const user = userEvent.setup();
    wrap(<DirectorPanel onLogout={() => {}} />);
    const bell = await screen.findByRole("button", { name: "Tickets en espera: 2" });
    expect(screen.getByTestId("topbar-unread")).toHaveTextContent("2");
    await user.click(bell);
    expect(await screen.findByTestId("supra-inbox")).toBeInTheDocument();
    expect(screen.getByTestId("supra-nav-support")).toHaveAttribute("aria-current", "page");
  });

  it("el buscador lleva a Clínicas y filtra por nombre, sin tildes; sin coincidencias lo dice", async () => {
    const user = userEvent.setup();
    wrap(<DirectorPanel onLogout={() => {}} />);
    await screen.findByTestId("supra-dashboard");
    await user.type(screen.getByTestId("topbar-search"), "nunoa");
    expect(screen.getByTestId("supra-title")).toHaveTextContent("Clínicas");
    expect(await screen.findByTestId("center-card-c3")).toBeInTheDocument();
    expect(screen.queryByTestId("center-card-c1")).toBeNull();
    expect(screen.getByTestId("clinic-filter")).toHaveTextContent("1 de 3");
    await user.clear(screen.getByTestId("topbar-search"));
    await user.type(screen.getByTestId("topbar-search"), "xyz{Enter}");
    expect(screen.getByTestId("clinic-filter-empty")).toHaveTextContent("Ninguna clínica coincide con «xyz».");
    await user.click(screen.getByRole("button", { name: /Quitar filtro/ }));
    expect(await screen.findByTestId("center-card-c1")).toBeInTheDocument();
  });

  it("tocar una clínica reciente abre Clínicas y la resalta", async () => {
    const user = userEvent.setup();
    wrap(<DirectorPanel onLogout={() => {}} />);
    const cards = await screen.findAllByTestId("supra-recent-clinic");
    await user.click(cards[1]!);
    expect(screen.getByTestId("supra-title")).toHaveTextContent("Clínicas");
    await waitFor(() => expect(screen.getByTestId("center-card-c1").parentElement).toHaveAttribute("data-highlighted", "true"));
  });

  it("director: chip con nombre y rol; su menú abre Mi cuenta y cierra la sesión; la tarjeta de ayuda abre el Manual", async () => {
    const onLogout = vi.fn();
    const user = userEvent.setup();
    wrap(<DirectorPanel onLogout={onLogout} />);
    const account = await screen.findByTestId("topbar-account");
    await waitFor(() => expect(account).toHaveTextContent("Directora Prueba"));
    expect(account).toHaveTextContent("Director");
    await user.click(account);
    await user.click(screen.getByTestId("supra-menu-account"));
    expect(screen.getByTestId("supra-title")).toHaveTextContent("Mi cuenta");
    await user.click(screen.getByTestId("supra-help-card"));
    expect(screen.getByTestId("supra-title")).toHaveTextContent("Manual de supra-control");
    await user.click(screen.getByTestId("topbar-account"));
    await user.click(screen.getByTestId("supra-logout"));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("supra_admin: rol «Supra-control», sin Mi cuenta ni Cambiar de clínica, tarjeta de cuenta no navegable", async () => {
    state.me = { authenticated: true, user: { id: "s1", email: "s@example.com", name: "Operador Prueba", role: "supra_admin", centerId: null } };
    const user = userEvent.setup();
    wrap(<DirectorPanel onLogout={() => {}} canManageUsers={false} />);
    const account = await screen.findByTestId("topbar-account");
    await waitFor(() => expect(account).toHaveTextContent("Supra-control"));
    expect(screen.getByTestId("supra-account-card").tagName).toBe("DIV");
    expect(screen.queryByTestId("supra-nav-team")).toBeNull();
    expect(screen.queryByTestId("supra-nav-admin")).toBeNull();
    expect(screen.queryByTestId("supra-quick-team")).toBeNull();
    await user.click(account);
    expect(screen.queryByTestId("supra-menu-account")).toBeNull();
    expect(screen.queryByTestId("supra-menu-switch")).toBeNull();
    expect(screen.getByTestId("supra-logout")).toBeInTheDocument();
  });
});
