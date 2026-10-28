/**
 * Pantalla de Inicio del dashboard de clínica: cifras, gráfico y actividad salen de
 * /clinic/overview y /clinic/activity; las fichas, de la lista de pacientes. Sin datos,
 * estados vacíos con ceros reales; el chip de variación solo si el mes anterior > 0.
 * Solo se simula fetch (corre el flujo real de react-query). Datos ficticios.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import { ClinicHome } from "./clinic-home";
import { cumulative, percentChange } from "@/lib/home-i18n";
import { niceScale } from "./home-charts";

let fetchSpy: ReturnType<typeof vi.spyOn>;
let leads: object[];
let overview: { monthly: Array<{ month: string; patients: number; photos: number }>; totals: { patients: number; photos: number; thisMonth: number; activeProfessionals: number | null } };
let events: object[];
let failOverview: boolean;

const now = new Date();
const monthKey = (back: number) => { const d = new Date(now.getFullYear(), now.getMonth() - back, 15); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const months = (values: Array<[number, number]>) => values.map(([patients, photos], i) => ({ month: monthKey(values.length - 1 - i), patients, photos }));
const zeros = (n: number) => months(Array.from({ length: n }, () => [0, 0] as [number, number]));
const lead = (id: string, name: string, coverPhotoId: string | null, extra: object = {}) => ({
  id, token: `t-${id}`, name, phone: "+56900000000", status: "nuevo", photoCount: 0, coverPhotoId,
  createdAt: new Date(now.getTime() - 3 * 3600_000).toISOString(), updatedAt: now.toISOString(), ...extra,
});

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// Como la clínica real del usuario: 1 paciente, 5 fotos, 2 profesionales, todo este mes.
const singlePatientClinic = () => {
  const monthly = zeros(12);
  monthly[11] = { ...monthly[11]!, patients: 1, photos: 5 };
  return { monthly, totals: { patients: 1, photos: 5, thisMonth: 1, activeProfessionals: 2 } };
};

beforeEach(() => {
  window.localStorage.clear();
  failOverview = false;
  leads = [lead("l1", "Ana Ejemplo", "ph1", { consultTypeName: "Control" }), lead("l2", "Bruno Prueba", null)];
  overview = singlePatientClinic();
  events = [
    { type: "photos", leadId: "l1", leadName: "Ana Ejemplo", at: new Date(now.getTime() - 2 * 3600_000).toISOString(), count: 5 },
    { type: "patient", leadId: "l2", leadName: "Bruno Prueba", at: new Date(now.getTime() - 3 * 3600_000).toISOString(), count: 1 },
    { type: "measured", leadId: "l1", leadName: "Ana Ejemplo", at: new Date(now.getTime() - 4 * 3600_000).toISOString(), count: 1 },
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchSpy = vi.spyOn(globalThis as any, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/api/clinic/overview")) return failOverview ? jsonResponse({ error: "x" }, 500) : jsonResponse(overview);
    if (url.includes("/api/clinic/activity")) return jsonResponse({ events });
    if (url.includes("/api/leads")) return jsonResponse({ leads });
    throw new Error(`Unexpected request: ${url}`);
  });
});

afterEach(() => vi.restoreAllMocks());

function renderHome(over: Partial<React.ComponentProps<typeof ClinicHome>> = {}) {
  const props = {
    userName: "Usuaria Prueba", canManageUsers: true, canEditPhases: false, specialty: "dermatologia" as const,
    onNewPatient: vi.fn(), onOpenPatients: vi.fn(), onOpenReport: vi.fn(), onOpenPhases: vi.fn(), onOpenUsers: vi.fn(), onOpenLead: vi.fn(),
    ...over,
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><LanguageProvider><ClinicHome {...props} /></LanguageProvider></QueryClientProvider>);
  return props;
}

const stat = (key: string) => screen.getByTestId(`home-stat-${key}`);
const requested = (part: string) => fetchSpy.mock.calls.some(([url]) => String(url).includes(part));

describe("cálculos del Inicio", () => {
  it("la variación solo existe si el período anterior es > 0", () => {
    expect(percentChange(12, 10)).toBe(20);
    expect(percentChange(5, 0)).toBeNull();
    expect(percentChange(5, undefined)).toBeNull();
    expect(percentChange(8, 10)).toBe(-20);
  });
  it("el acumulado mensual termina en el total real", () => {
    expect(cumulative(10, [1, 0, 2, 3])).toEqual([5, 5, 7, 10]);
    expect(cumulative(0, [0, 0])).toEqual([0, 0]);
  });
  it("la escala del gráfico usa números redondos", () => {
    expect(niceScale(0)).toEqual({ top: 4, step: 1 });
    expect(niceScale(5)).toEqual({ top: 8, step: 2 });
    expect(niceScale(73)).toEqual({ top: 80, step: 20 });
  });
});

describe("Inicio del dashboard de clínica", () => {
  it("da la bienvenida con el nombre real y la fecha de hoy", () => {
    renderHome();
    expect(screen.getByRole("heading", { level: 1, name: "Bienvenido, Usuaria Prueba" })).toBeInTheDocument();
    expect(screen.getByTestId("home-date").textContent).toBe(
      new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()),
    );
  });

  it("clínica con 1 paciente: las cifras reales y ningún chip (el mes anterior está en cero)", async () => {
    renderHome();
    await waitFor(() => expect(within(stat("total")).getByText("1")).toBeInTheDocument());
    expect(within(stat("photos")).getByText("5")).toBeInTheDocument();
    expect(within(stat("month")).getByText("1")).toBeInTheDocument();
    expect(within(stat("professionals")).getByText("2")).toBeInTheDocument();
    expect(screen.queryByTestId("home-change")).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    // Mini-gráfico de los últimos 6 meses: acumulado real (0… hasta 1).
    expect(screen.getByTestId("home-spark-total")).toHaveAttribute("data-values", "0,0,0,0,0,1");
    expect(screen.getByTestId("home-spark-photos")).toHaveAttribute("data-values", "0,0,0,0,0,5");
    // Profesionales activos no tiene historial: ni chip ni mini-gráfico.
    expect(screen.queryByTestId("home-spark-professionals")).not.toBeInTheDocument();
  });

  it("con mes anterior > 0 muestra la variación real, en verde o rojo", async () => {
    const monthly = zeros(12);
    monthly[10] = { ...monthly[10]!, patients: 10, photos: 40 };
    monthly[11] = { ...monthly[11]!, patients: 5, photos: 20 };
    overview = { monthly, totals: { patients: 115, photos: 460, thisMonth: 5, activeProfessionals: 4 } };
    renderHome();
    await waitFor(() => expect(within(stat("total")).getByText("115")).toBeInTheDocument());
    // Total: 110 al cierre del mes anterior → 115 = +5 %. Registros: 10 → 5 = −50 %.
    expect(within(stat("total")).getByTestId("home-change")).toHaveTextContent("+5 %");
    expect(within(stat("total")).getByText("+5 % respecto al mes anterior")).toHaveClass("sr-only");
    expect(within(stat("photos")).getByTestId("home-change")).toHaveTextContent("+5 %");
    const month = within(stat("month")).getByTestId("home-change");
    expect(month).toHaveTextContent("-50 %");
    expect(month.className).toMatch(/red/);
  });

  it("clínica vacía: ceros reales, «Aún sin datos» en el gráfico y estados vacíos", async () => {
    leads = []; events = [];
    overview = { monthly: zeros(12), totals: { patients: 0, photos: 0, thisMonth: 0, activeProfessionals: 1 } };
    const user = userEvent.setup();
    const props = renderHome();
    await waitFor(() => expect(within(stat("total")).getByText("0")).toBeInTheDocument());
    expect(screen.getByTestId("activity-chart-empty")).toHaveTextContent("Aún sin datos en este período");
    expect(screen.getAllByTestId("activity-month")).toHaveLength(6);
    expect(document.querySelectorAll('[data-testid="activity-chart"] path')).toHaveLength(0); // ninguna barra
    expect(await screen.findByTestId("home-activity-empty")).toBeInTheDocument();
    const empty = await screen.findByTestId("home-empty");
    await user.click(within(empty).getByRole("button", { name: /Agregar paciente/ }));
    expect(props.onNewPatient).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("home-change")).not.toBeInTheDocument();
  });

  it("mientras carga muestra esqueletos, no cifras", () => {
    fetchSpy.mockImplementation(() => new Promise(() => undefined));
    renderHome();
    expect(stat("total").querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(within(stat("total")).queryByText(/\d/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("activity-chart")).not.toBeInTheDocument();
  });

  it("el gráfico cambia entre 3, 6 y 12 meses y cada mes se puede leer con el teclado", async () => {
    const user = userEvent.setup();
    renderHome();
    await waitFor(() => expect(screen.getAllByTestId("activity-month")).toHaveLength(6));
    await user.selectOptions(screen.getByLabelText("Período del gráfico"), "12");
    expect(screen.getAllByTestId("activity-month")).toHaveLength(12);
    await user.selectOptions(screen.getByLabelText("Período del gráfico"), "3");
    const bars = screen.getAllByTestId("activity-month");
    expect(bars).toHaveLength(3);
    const current = bars[2]!;
    expect(current).toHaveAttribute("aria-label", expect.stringMatching(/Nuevos pacientes 1, Fotografías 5$/));
    current.focus();
    expect(await screen.findByTestId("activity-tooltip")).toHaveTextContent(/Fotografías: 5/);
    // Tabla equivalente para lectores de pantalla.
    expect(screen.getByRole("table", { name: "Actividad fotográfica" })).toBeInTheDocument();
  });

  it("actividad reciente: eventos reales con «hace X», abre la ficha y «Ver todas» lleva a Pacientes", async () => {
    const user = userEvent.setup();
    const props = renderHome();
    const rows = await screen.findAllByTestId("home-event");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Ana Ejemplo");
    expect(rows[0]).toHaveTextContent("5 fotografías registradas");
    expect(rows[0]).toHaveTextContent("hace 2 horas");
    expect(rows[1]).toHaveTextContent("Paciente nuevo");
    expect(rows[2]).toHaveTextContent("Medición guardada");
    await user.click(rows[1]!);
    expect(props.onOpenLead).toHaveBeenCalledWith("l2");
    await user.click(within(screen.getByRole("region", { name: "Actividad reciente" })).getByRole("button", { name: /Ver todas/ }));
    expect(props.onOpenPatients).toHaveBeenCalledTimes(1);
  });

  it("pacientes recientes: foto de portada o iniciales, tipo de atención o especialidad, y abre la ficha", async () => {
    const user = userEvent.setup();
    const props = renderHome();
    const cards = await screen.findAllByTestId("home-recent");
    expect(cards).toHaveLength(2);
    expect(within(cards[0]!).getByTestId("home-thumb")).toHaveAttribute("src", "/api/leads/l1/photos/ph1");
    expect(within(cards[0]!).getByText("Control")).toBeInTheDocument();
    expect(within(cards[1]!).getByTestId("home-initials")).toHaveTextContent("BP");
    expect(within(cards[1]!).getByText("Dermatología")).toBeInTheDocument();
    expect(document.querySelectorAll('img[src*="/api/leads/l2/"]')).toHaveLength(0);
    await user.click(cards[1]!);
    expect(props.onOpenLead).toHaveBeenCalledWith("l2");
  });

  it("muestra como máximo seis pacientes recientes", async () => {
    leads = Array.from({ length: 8 }, (_, i) => lead(`n${i}`, `Paciente ${i}`, null));
    renderHome();
    expect(await screen.findAllByTestId("home-recent")).toHaveLength(6);
  });

  it("si falla la carga avisa y permite reintentar", async () => {
    failOverview = true;
    const user = userEvent.setup();
    renderHome();
    const alert = await screen.findByRole("alert");
    failOverview = false;
    await user.click(within(alert).getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(within(stat("total")).getByText("1")).toBeInTheDocument();
  });

  it.each([
    // Administrativo: gestiona usuarios, no edita fases.
    ["administrativo", { canManageUsers: true, canEditPhases: false }, ["home-new-patient", "home-patients", "home-report", "home-users"], true],
    // Médico sin representación legal: solo lo común.
    ["médico", { canManageUsers: false, canEditPhases: false }, ["home-new-patient", "home-patients", "home-report"], false],
    // Representante legal: todo.
    ["representante legal", { canManageUsers: true, canEditPhases: true }, ["home-new-patient", "home-patients", "home-report", "home-phases", "home-users"], true],
    // Director dentro de la clínica: fases según su perfil, nunca Usuarios.
    ["director", { canManageUsers: false, canEditPhases: true }, ["home-new-patient", "home-patients", "home-report", "home-phases"], false],
  ] as const)("un %s ve solo los accesos e indicadores que le corresponden", async (_role, perms, expected, seesProfessionals) => {
    if (!seesProfessionals) overview = { ...overview, totals: { ...overview.totals, activeProfessionals: null } };
    renderHome(perms);
    const quick = screen.getByRole("region", { name: "Accesos rápidos" });
    expect(within(quick).getAllByRole("button").map((b) => b.getAttribute("data-testid"))).toEqual(expected);
    await waitFor(() => expect(within(stat("total")).getByText("1")).toBeInTheDocument());
    expect(screen.queryByTestId("home-stat-professionals") !== null).toBe(seesProfessionals);
    expect(requested("/api/clinic/users")).toBe(false);
  });

  it("los accesos llevan a las pantallas existentes", async () => {
    const user = userEvent.setup();
    const props = renderHome({ canEditPhases: true });
    for (const id of ["home-new-patient", "home-patients", "home-report", "home-phases", "home-users"]) await user.click(screen.getByTestId(id));
    for (const fn of [props.onNewPatient, props.onOpenPatients, props.onOpenReport, props.onOpenPhases, props.onOpenUsers]) expect(fn).toHaveBeenCalledTimes(1);
  });

  it("en árabe va de derecha a izquierda, pero el eje del tiempo del gráfico no se invierte", async () => {
    window.localStorage.setItem("clinivista_lang", "ar");
    renderHome();
    expect(screen.getByTestId("clinic-home")).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("heading", { level: 1, name: "مرحبًا بك، Usuaria Prueba" })).toBeInTheDocument();
    const chart = await screen.findByTestId("activity-chart");
    expect(chart.closest("[dir]")).toHaveAttribute("dir", "ltr");
  });
});
