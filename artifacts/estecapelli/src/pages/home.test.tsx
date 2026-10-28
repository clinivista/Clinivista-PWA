/**
 * Portada de app.clinivista.cl: los accesos van a las rutas de siempre
 * (/patient, /admin/login, /paciente), las invitaciones antiguas /?token=… siguen
 * redirigiendo, el paciente va antes que el equipo y el idioma cambia los textos.
 * Se renderiza la app completa con sus rutas reales; solo se simula fetch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async () => json({ authenticated: false }, 200)));
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

function renderAt(url: string) {
  window.history.replaceState({}, "", url);
  return render(<App />);
}

describe("Portada (/)", () => {
  it("«Iniciar preevaluación» lleva a /patient", async () => {
    const user = userEvent.setup();
    renderAt("/");
    const start = await screen.findByRole("link", { name: /Iniciar preevaluación/ });
    expect(start).toHaveAttribute("href", "/patient");
    await user.click(start);
    await waitFor(() => expect(window.location.pathname).toBe("/patient"));
  });

  it("«Acceso equipo» y «Acceder a mi clínica» llevan a /admin/login", async () => {
    renderAt("/");
    expect(await screen.findByRole("link", { name: /Acceso equipo/ })).toHaveAttribute("href", "/admin/login");
    expect(screen.getByRole("link", { name: /Acceder a mi clínica/ })).toHaveAttribute("href", "/admin/login");
  });

  it("«Acceder a mi clínica» abre el inicio de sesión del equipo", async () => {
    const user = userEvent.setup();
    renderAt("/");
    await user.click(await screen.findByRole("link", { name: /Acceder a mi clínica/ }));
    await waitFor(() => expect(window.location.pathname).toBe("/admin/login"));
  });

  it("tiene el enlace a /paciente para ver resultados, y los enlaces legales reales", async () => {
    renderAt("/");
    expect(await screen.findByRole("link", { name: "Ver mis resultados" })).toHaveAttribute("href", "/paciente");
    expect(screen.getByRole("link", { name: "Privacidad" })).toHaveAttribute("href", "/privacidad");
    expect(screen.getByRole("link", { name: "Términos" })).toHaveAttribute("href", "/terminos");
  });

  it("pide usar el enlace de la clínica y avisa que no reemplaza una consulta", async () => {
    renderAt("/");
    expect(await screen.findByText(/Usa el enlace que te envió tu clínica/)).toBeInTheDocument();
    expect(screen.getByTestId("home-disclaimer")).toHaveTextContent("no reemplaza una consulta médica");
  });

  it("un solo h1, y el acceso de pacientes va antes que el del equipo (orden del DOM)", async () => {
    renderAt("/");
    const patient = await screen.findByTestId("home-patient-card");
    const team = screen.getByTestId("home-team-card");
    expect(patient.compareDocumentPosition(team) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("no muestra cifras sin respaldo de la portada anterior", async () => {
    renderAt("/");
    await screen.findByTestId("portal-home");
    expect(screen.queryByText("24h")).toBeNull();
    expect(screen.queryByText("100%")).toBeNull();
    expect(screen.queryByText("4–6")).toBeNull();
  });

  it("el selector de idioma cambia los textos y se recuerda", async () => {
    const user = userEvent.setup();
    renderAt("/");
    await user.selectOptions(await screen.findByLabelText("Idioma"), "en");
    expect(await screen.findByRole("link", { name: /Start pre-evaluation/ })).toHaveAttribute("href", "/patient");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your clinical record,step by step");
    expect(window.localStorage.getItem("clinivista_lang")).toBe("en");
  });

  it("en árabe va de derecha a izquierda", async () => {
    window.localStorage.setItem("clinivista_lang", "ar");
    renderAt("/");
    const home = await screen.findByTestId("portal-home");
    expect(home).toHaveAttribute("dir", "rtl");
    expect(within(home).getByRole("link", { name: /ابدأ التقييم المسبق/ })).toHaveAttribute("href", "/patient");
  });
});

describe("Invitaciones antiguas (/?token=…)", () => {
  it("/?token=ABC redirige a /patient?token=ABC", async () => {
    renderAt("/?token=ABC");
    await waitFor(() => expect(`${window.location.pathname}${window.location.search}`).toBe("/patient?token=ABC"));
    expect(screen.queryByTestId("portal-home")).toBeNull();
  });
});
