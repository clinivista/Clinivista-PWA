import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const api = vi.hoisted(() => ({
  me: undefined as unknown, options: { googleEnabled: true, profile: null } as unknown,
  login: vi.fn(), forgot: vi.fn(), logout: vi.fn(), setup: vi.fn(), invalidate: vi.fn(), reset: vi.fn(), navigate: vi.fn(), search: "",
}));

vi.mock("@workspace/api-client-react", () => ({
  getGetPortalMeQueryKey: () => ["/api/portal/me"],
  getGetPortalOptionsQueryKey: () => ["/api/portal/options"],
  useGetPortalMe: () => ({ data: api.me, isLoading: false }),
  useGetPortalOptions: () => ({ data: api.options }),
  usePortalLogin: () => ({ mutate: api.login, isPending: false }),
  usePortalForgot: () => ({ mutate: api.forgot, isPending: false }),
  usePortalLogout: () => ({ mutate: api.logout, isPending: false }),
  usePortalSetup: () => ({ mutate: api.setup, isPending: false }),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: api.invalidate, resetQueries: api.reset }) }));
vi.mock("wouter", () => ({
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => <a href={href} {...rest}>{children}</a>,
  useLocation: () => ["/", api.navigate],
  useSearch: () => api.search,
}));

import { LanguageProvider, LANGS } from "@/lib/language";
import { PORTAL_TEXT } from "@/lib/portal-i18n";
import Portal, { PortalSetPassword } from "./portal";

describe("Portal del paciente", () => {
  it("offers to edit while the clinic has not started, and only additional information once it is reviewing", () => {
    api.me = { email: "p@x.cl", cases: [
      { leadId: "l1", clinicName: "Clínica Uno", patientName: "Ana", results: [], editToken: "tok-1", locked: false },
      { leadId: "l2", clinicName: "Clínica Dos", patientName: "Ana", results: [], editToken: "tok-2", locked: true },
    ] };
    render(<Portal />);
    expect(screen.getByRole("link", { name: "Modificar mi evaluación" })).toHaveAttribute("href", "/patient?token=tok-1");
    expect(screen.getByRole("link", { name: "Enviar información adicional" })).toHaveAttribute("href", "/patient?token=tok-2");
  });

  it("shows «Mis datos y derechos» and the list of requests with their deadline in each case", async () => {
    api.me = { email: "p@x.cl", cases: [{ leadId: "l1", clinicName: "Clínica Uno", patientName: "Ana", results: [], editToken: "tok-1", locked: false }] };
    const due = new Date(Date.now() + 10 * 86_400_000).toISOString();
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ requests: [{ id: "r1", type: "withdrawal", status: "pending", createdAt: new Date().toISOString(), dueAt: due, resolutionNote: "" }] }), { status: 200 }));
    render(<LanguageProvider><Portal /></LanguageProvider>);
    expect(screen.getByTestId("data-rights-open")).toBeInTheDocument();
    expect(await screen.findByText("Retirar mi consentimiento (para el futuro)")).toBeInTheDocument();
    expect(screen.getByText(/Recibida · Respuesta hasta el/)).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith("/api/patients/tok-1/data-requests");
    spy.mockRestore();
  });

  it("logout resets the session query so the stale results disappear", async () => {
    const user = userEvent.setup();
    api.me = { email: "p@x.cl", cases: [] };
    api.logout.mockImplementation((_vars, options) => options.onSuccess());
    render(<Portal />);
    await user.click(screen.getByRole("button", { name: /Cerrar sesión/i }));
    expect(api.reset).toHaveBeenCalledWith({ queryKey: ["/api/portal/me"] });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    api.me = undefined;
    api.options = { googleEnabled: true, profile: null };
    api.search = "";
  });

  it("offers Google and email-with-password when signed out", () => {
    render(<Portal />);
    expect(screen.getByTestId("google-start")).toHaveAttribute("href", "/api/portal/google/start?next=/paciente");
    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
    expect(screen.getByLabelText("Clave")).toBeInTheDocument();
  });

  it("hides the Google button when it is not configured, and says so after a failed Google attempt", () => {
    api.options = { googleEnabled: false, profile: null };
    api.search = "google=error";
    render(<Portal />);
    expect(screen.queryByTestId("google-start")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/No pudimos entrar con Google/);
  });

  it("signs in with email and password, and shows the server's message when it fails", async () => {
    const user = userEvent.setup();
    api.login.mockImplementation((_vars, options) => options.onError({ status: 401 }));
    render(<Portal />);
    await user.type(screen.getByLabelText("Correo electrónico"), "p@x.cl");
    await user.type(screen.getByLabelText("Clave"), "mala-clave");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(api.login.mock.calls[0][0]).toEqual({ data: { email: "p@x.cl", password: "mala-clave" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Correo o clave incorrectos.");
  });

  it("opens the recover screen, asks for the email, and tells the patient what happened", async () => {
    const user = userEvent.setup();
    api.forgot.mockImplementation((_vars, options) => options.onSuccess({ ok: true }));
    render(<Portal />);
    expect(screen.getByTestId("first-time-hint")).toBeInTheDocument();
    await user.click(screen.getByTestId("open-recover"));
    const send = screen.getByTestId("recover-send");
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText("Correo electrónico"), "p@x.cl");
    await user.click(send);
    expect(api.forgot.mock.calls[0][0]).toEqual({ data: { email: "p@x.cl", language: "es" } });
    expect(screen.getByTestId("recover-done")).toHaveTextContent(/Revisa tu correo/);
    expect(screen.getByTestId("recover-done")).toHaveTextContent(/p@x.cl/);
    expect(screen.getByTestId("recover-resend")).toBeDisabled();
  });

  it("says plainly when too many links were requested instead of pretending one was sent", async () => {
    const user = userEvent.setup();
    api.forgot.mockImplementation((_vars, options) => options.onSuccess({ ok: true, throttled: true }));
    render(<Portal />);
    await user.click(screen.getByTestId("open-recover"));
    await user.type(screen.getByLabelText("Correo electrónico"), "p@x.cl");
    await user.click(screen.getByTestId("recover-send"));
    expect(screen.getByTestId("recover-done")).toHaveTextContent(/Ya pediste varios enlaces/);
    expect(screen.getByTestId("recover-done")).not.toHaveTextContent(/Revisa tu correo/);
  });

  it("shows an error when the request fails, and can go back to sign in", async () => {
    const user = userEvent.setup();
    api.forgot.mockImplementation((_vars, options) => options.onError({ status: 500 }));
    render(<Portal />);
    await user.click(screen.getByTestId("open-recover"));
    await user.type(screen.getByLabelText("Correo electrónico"), "p@x.cl");
    await user.click(screen.getByTestId("recover-send"));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await user.click(screen.getByTestId("recover-back"));
    expect(screen.getByTestId("open-recover")).toBeInTheDocument();
  });

  it("shows the confirmation banner after the password was created", () => {
    api.search = "clave=ok";
    render(<Portal />);
    expect(screen.getByTestId("password-created")).toBeInTheDocument();
    api.search = "";
  });

  it("lists the delivered results of each clinic, and says when there are none yet", () => {
    api.me = {
      email: "p@x.cl",
      cases: [
        { leadId: "l1", clinicName: "Clínica Uno", patientName: "Paciente Uno", results: [{ id: "d1", createdAt: "2026-02-01T10:00:00Z" }] },
        { leadId: "l2", clinicName: "Clínica Dos", patientName: "Paciente Uno", results: [] },
      ],
    };
    render(<Portal />);
    expect(screen.getByText("Clínica Uno")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Resultados ·/ })).toHaveAttribute("href", "/api/portal/results/d1");
    expect(screen.getByText(/Todavía no hay resultados/)).toBeInTheDocument();
    expect(screen.getByText(/Sesión iniciada como p@x.cl/)).toBeInTheDocument();
  });

  it("the emailed link lets the patient choose a password of at least 8 characters, typed twice", async () => {
    const user = userEvent.setup();
    api.search = "token=abc123";
    api.setup.mockImplementation((_vars, options) => options.onSuccess());
    render(<PortalSetPassword />);
    const save = screen.getByRole("button", { name: "Guardar clave" });
    await user.type(screen.getByLabelText(/Nueva clave/), "corta");
    expect(save).toBeDisabled();
    await user.clear(screen.getByLabelText(/Nueva clave/));
    await user.type(screen.getByLabelText(/Nueva clave/), "clave-segura-1");
    await user.type(screen.getByLabelText("Repite la clave"), "clave-segura-2");
    expect(screen.getByRole("alert")).toHaveTextContent("Las claves no coinciden.");
    expect(save).toBeDisabled();
    await user.clear(screen.getByLabelText("Repite la clave"));
    await user.type(screen.getByLabelText("Repite la clave"), "clave-segura-1");
    await user.click(save);
    expect(api.setup.mock.calls[0][0]).toEqual({ data: { token: "abc123", password: "clave-segura-1" } });
    expect(api.navigate).toHaveBeenCalledWith("/paciente?clave=ok");
  });

  it("an expired or used link explains why and offers to request a new one", async () => {
    const user = userEvent.setup();
    api.search = "token=viejo";
    api.setup.mockImplementation((_vars, options) => options.onError({ status: 400 }));
    render(<PortalSetPassword />);
    await user.type(screen.getByLabelText(/Nueva clave/), "clave-segura-1");
    await user.type(screen.getByLabelText("Repite la clave"), "clave-segura-1");
    await user.click(screen.getByRole("button", { name: "Guardar clave" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/ya no sirve/);
    expect(screen.getByTestId("request-new-link")).toHaveAttribute("href", "/paciente?recover=1");
  });

  it.each(LANGS.map((language) => language.code))("in %s: shows the portal in that language, with the failure message chosen by status", async (code) => {
    const user = userEvent.setup();
    localStorage.setItem("clinivista_lang", code);
    const text = PORTAL_TEXT[code];
    api.login.mockImplementation((_vars, options) => options.onError({ status: 429 }));
    render(<LanguageProvider><Portal /></LanguageProvider>);
    expect(screen.getByRole("heading", { level: 1, name: text.loginTitle })).toBeInTheDocument();
    expect(screen.getByTestId("google-start")).toHaveTextContent(text.googleButton);
    await user.type(screen.getByLabelText(text.emailLabel), "p@x.cl");
    await user.type(screen.getByLabelText(text.passwordLabel), "una-clave-1");
    await user.click(screen.getByRole("button", { name: text.enter }));
    expect(screen.getByRole("alert")).toHaveTextContent(text.tooMany);
    expect(document.querySelector("div[dir]")).toHaveAttribute("dir", code === "ar" ? "rtl" : "ltr");
    localStorage.clear();
  });

  it("every language has every portal text", () => {
    for (const { code } of LANGS) {
      for (const [key, value] of Object.entries(PORTAL_TEXT[code])) expect(value, `${code}.${key}`).toBeTruthy();
    }
  });
});
