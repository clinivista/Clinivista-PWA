/**
 * Pantalla de Inicio del dashboard de clínica: solo números que entrega la API,
 * accesos según permisos y miniaturas a partir de coverPhotoId. Solo se simula
 * fetch, así que corre el flujo real de react-query. Datos ficticios.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import { ClinicHome } from "./clinic-home";

let fetchSpy: ReturnType<typeof vi.spyOn>;
let leads: object[];
let leadsStatus: number;

const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(12, 0, 0, 0);
const lastYear = new Date(thisMonth); lastYear.setFullYear(lastYear.getFullYear() - 1);
const lead = (id: string, name: string, createdAt: Date, photoCount: number, coverPhotoId: string | null, extra: object = {}) => ({
  id, token: `t-${id}`, name, phone: "+56900000000", status: "nuevo", photoCount, coverPhotoId,
  createdAt: createdAt.toISOString(), updatedAt: createdAt.toISOString(), ...extra,
});

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  window.localStorage.clear();
  leadsStatus = 200;
  leads = [
    lead("l1", "Ana Ejemplo", thisMonth, 5, "ph1", { consultTypeName: "Control" }),
    lead("l2", "Bruno Prueba", thisMonth, 2, null),
    lead("l3", "Carla Demo", lastYear, 0, null),
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchSpy = vi.spyOn(globalThis as any, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/api/leads/stats")) return jsonResponse({ total: 3, counts: { nuevo: 3 }, transcribedDocuments: 0 });
    if (url.includes("/api/leads")) return leadsStatus === 200 ? jsonResponse({ leads }) : jsonResponse({ error: "x" }, leadsStatus);
    if (url.endsWith("/api/clinic/users")) {
      const user = (id: string, active: boolean) => ({ id, email: `${id}@example.com`, name: id, role: "medico", active, legalRepresentative: false, isSelf: false, createdAt: "2026-01-01T00:00:00Z" });
      return jsonResponse({ users: [user("u1", true), user("u2", true), user("u3", false)] });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
});

afterEach(() => vi.restoreAllMocks());

function renderHome(over: Partial<React.ComponentProps<typeof ClinicHome>> = {}) {
  const props = {
    userName: "Usuaria Prueba", canManageUsers: true, canEditPhases: false,
    onNewPatient: vi.fn(), onOpenPatients: vi.fn(), onOpenReport: vi.fn(), onOpenPhases: vi.fn(), onOpenUsers: vi.fn(), onOpenLead: vi.fn(),
    ...over,
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><LanguageProvider><ClinicHome {...props} /></LanguageProvider></QueryClientProvider>);
  return props;
}

const stat = (key: string) => screen.getByTestId(`home-stat-${key}`);
const requested = (part: string) => fetchSpy.mock.calls.some(([url]) => String(url).includes(part));

describe("Inicio del dashboard de clínica", () => {
  it("saluda con el nombre real y muestra los cuatro indicadores con los datos de la API", async () => {
    renderHome();
    expect(screen.getByRole("heading", { name: "Hola, Usuaria Prueba" })).toBeInTheDocument();
    expect(screen.getByTestId("home-date").textContent).toBe(
      new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()),
    );
    await waitFor(() => expect(within(stat("total")).getByText("3")).toBeInTheDocument());
    expect(within(stat("photos")).getByText("7")).toBeInTheDocument(); // 5 + 2 + 0
    expect(within(stat("month")).getByText("2")).toBeInTheDocument(); // l1 y l2; l3 es del año pasado
    await waitFor(() => expect(within(stat("professionals")).getByText("2")).toBeInTheDocument()); // solo activos
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("oculta «Profesionales activos» sin permiso y no pide los usuarios", async () => {
    renderHome({ canManageUsers: false });
    await waitFor(() => expect(within(stat("total")).getByText("3")).toBeInTheDocument());
    expect(screen.queryByTestId("home-stat-professionals")).not.toBeInTheDocument();
    expect(screen.queryByText("Profesionales activos")).not.toBeInTheDocument();
    expect(requested("/api/clinic/users")).toBe(false);
  });

  it("sin pacientes muestra el estado vacío con el botón Nuevo paciente", async () => {
    leads = [];
    const user = userEvent.setup();
    const props = renderHome();
    const empty = await screen.findByTestId("home-empty");
    expect(within(empty).getByText("Aún no hay pacientes")).toBeInTheDocument();
    await user.click(within(empty).getByRole("button", { name: /Agregar paciente/ }));
    expect(props.onNewPatient).toHaveBeenCalledTimes(1);
  });

  it("la miniatura usa coverPhotoId y sin él muestra iniciales, sin pedir ninguna foto", async () => {
    renderHome();
    const rows = await screen.findAllByTestId("home-recent");
    expect(rows).toHaveLength(3);
    const thumb = within(rows[0]).getByTestId("home-thumb");
    expect(thumb).toHaveAttribute("src", "/api/leads/l1/photos/ph1");
    expect(thumb).toHaveAttribute("loading", "lazy");
    expect(within(rows[1]).queryByRole("img", { hidden: true })).not.toBeInTheDocument();
    expect(within(rows[1]).getByTestId("home-initials")).toHaveTextContent("BP");
    expect(document.querySelectorAll('img[src*="/api/leads/l2/"], img[src*="/api/leads/l3/"]')).toHaveLength(0);
    expect(within(rows[0]).getByText("Control")).toBeInTheDocument();
  });

  it("muestra como máximo los seis pacientes más recientes y abre la ficha al tocar uno", async () => {
    leads = Array.from({ length: 8 }, (_, i) => lead(`n${i}`, `Paciente ${i}`, thisMonth, 0, null));
    const user = userEvent.setup();
    const props = renderHome();
    const rows = await screen.findAllByTestId("home-recent");
    expect(rows).toHaveLength(6);
    await user.click(rows[2]);
    expect(props.onOpenLead).toHaveBeenCalledWith("n2");
  });

  it("si falla la carga avisa y permite reintentar", async () => {
    leadsStatus = 500;
    const user = userEvent.setup();
    renderHome();
    const alert = await screen.findByRole("alert");
    leadsStatus = 200;
    await user.click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(await screen.findAllByTestId("home-recent")).toHaveLength(3);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    // Administrativo: gestiona usuarios, no edita fases.
    ["administrativo", { canManageUsers: true, canEditPhases: false }, ["home-new-patient", "home-patients", "home-report", "home-users"]],
    // Médico sin representación legal: solo lo común.
    ["médico", { canManageUsers: false, canEditPhases: false }, ["home-new-patient", "home-patients", "home-report"]],
    // Representante legal o director dentro de la clínica con ese perfil: todo.
    ["representante legal / director", { canManageUsers: true, canEditPhases: true }, ["home-new-patient", "home-patients", "home-report", "home-phases", "home-users"]],
  ] as const)("un %s ve solo los accesos que le corresponden", async (_role, perms, expected) => {
    renderHome(perms);
    const quick = screen.getByRole("region", { name: "Accesos rápidos" });
    expect(within(quick).getAllByRole("button").map((b) => b.getAttribute("data-testid"))).toEqual(expected);
  });

  it("los accesos llevan a las pantallas existentes", async () => {
    const user = userEvent.setup();
    const props = renderHome({ canEditPhases: true });
    await user.click(screen.getByTestId("home-new-patient"));
    await user.click(screen.getByTestId("home-patients"));
    await user.click(screen.getByTestId("home-report"));
    await user.click(screen.getByTestId("home-phases"));
    await user.click(screen.getByTestId("home-users"));
    for (const fn of [props.onNewPatient, props.onOpenPatients, props.onOpenReport, props.onOpenPhases, props.onOpenUsers]) expect(fn).toHaveBeenCalledTimes(1);
  });

  it("en árabe se muestra de derecha a izquierda", async () => {
    window.localStorage.setItem("clinivista_lang", "ar");
    renderHome();
    expect(screen.getByTestId("clinic-home")).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("heading", { name: "مرحبًا، Usuaria Prueba" })).toBeInTheDocument();
  });
});
