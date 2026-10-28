/**
 * /admin/login con el nuevo estilo: mismo comportamiento (credenciales, error,
 * parámetro next, recuperación real por correo) y enlace para volver al inicio.
 * Solo se simula fetch: corre el flujo real de react-query.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
let calls: Array<{ url: string; body?: unknown }>;
let loginOk: boolean;

beforeEach(() => {
  window.localStorage.clear();
  calls = []; loginOk = true;
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (url.endsWith("/api/auth/me")) return json({ authenticated: false });
    if (url.endsWith("/api/auth/login")) return loginOk ? json({ ok: true }) : json({ error: "x" }, 401);
    if (url.includes("/api/auth/forgot")) return json({ ok: true });
    return json({});
  }));
});
afterEach(() => { vi.unstubAllGlobals(); window.history.replaceState({}, "", "/"); });

const renderAt = (url: string) => { window.history.replaceState({}, "", url); return render(<App />); };

describe("/admin/login", () => {
  it("muestra el nuevo acceso con campos etiquetados y «Volver al inicio»", async () => {
    renderAt("/admin/login");
    expect(await screen.findByRole("heading", { level: 1, name: "Accede a tu clínica" })).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText(/Contraseña/, { selector: "input" })).toHaveAttribute("type", "password");
    expect(screen.getByTestId("login-back")).toHaveAttribute("href", "/");
    expect(screen.getByRole("button", { name: /Iniciar sesión/ })).toBeDisabled();
  });

  it("inicia sesión con las credenciales y respeta el parámetro next", async () => {
    const user = userEvent.setup();
    const push = vi.spyOn(window.history, "pushState");
    renderAt("/admin/login?next=%2Fadmin%3Flead%3Dabc");
    await user.type(await screen.findByLabelText("Correo electrónico"), "persona@example.com");
    await user.type(screen.getByLabelText(/Contraseña/, { selector: "input" }), "clave-de-prueba");
    await user.click(screen.getByRole("button", { name: /Iniciar sesión/ }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/api/auth/login"))).toBe(true));
    expect(calls.find((c) => c.url.endsWith("/api/auth/login"))?.body).toEqual({ email: "persona@example.com", password: "clave-de-prueba" });
    // Tras entrar, va al destino de next (el panel, al ver la sesión simulada como cerrada, vuelve a pedir login).
    await waitFor(() => expect(push.mock.calls.some((call) => String(call[2]) === "/admin?lead=abc")).toBe(true));
  });

  it("con credenciales incorrectas se queda en el login", async () => {
    loginOk = false;
    const user = userEvent.setup();
    renderAt("/admin/login");
    await user.type(await screen.findByLabelText("Correo electrónico"), "persona@example.com");
    await user.type(screen.getByLabelText(/Contraseña/, { selector: "input" }), "mala");
    await user.click(screen.getByRole("button", { name: /Iniciar sesión/ }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/api/auth/login"))).toBe(true));
    expect(window.location.pathname).toBe("/admin/login");
  });

  it("«¿Olvidaste tu contraseña?» usa la recuperación real (correo con enlace a /admin/clave)", async () => {
    const user = userEvent.setup();
    renderAt("/admin/login");
    await user.click(await screen.findByTestId("login-forgot"));
    await user.type(screen.getByLabelText("Correo electrónico"), "persona@example.com");
    await user.click(screen.getByRole("button", { name: /Enviar/ }));
    await waitFor(() => expect(calls.some((c) => c.url.includes("/api/auth/forgot"))).toBe(true));
    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  it("en árabe va de derecha a izquierda", async () => {
    window.localStorage.setItem("clinivista_lang", "ar");
    renderAt("/admin/login");
    expect(await screen.findByTestId("login-page")).toHaveAttribute("dir", "rtl");
  });
});

describe("/c/:slug en la app (rutas reales)", () => {
  it("una clínica inexistente muestra «No encontramos esta clínica» sin datos de otra", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo) => String(input).includes("/api/clinics/no-existe") ? json({ error: "Esta clínica no existe." }, 404) : json({})));
    renderAt("/c/no-existe");
    expect(await screen.findByRole("alert")).toHaveTextContent("No encontramos esta clínica");
  });

  it("una clínica existente muestra su nombre real desde la API", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo) => String(input).includes("/api/clinics/clinica-uno") ? json({ name: "Clínica Uno", logoDataUrl: null, specialty: "capilar" }) : json({})));
    renderAt("/c/clinica-uno");
    expect(await screen.findByTestId("clinic-name")).toHaveTextContent("Clínica Uno");
    expect(screen.getByTestId("clinic-initials")).toHaveTextContent("CU");
  });
});
