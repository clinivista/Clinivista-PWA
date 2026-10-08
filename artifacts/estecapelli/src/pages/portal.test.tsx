import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const api = vi.hoisted(() => ({
  me: undefined as unknown, options: { googleEnabled: true, profile: null } as unknown,
  login: vi.fn(), forgot: vi.fn(), logout: vi.fn(), setup: vi.fn(), invalidate: vi.fn(), navigate: vi.fn(), search: "",
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
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: api.invalidate }) }));
vi.mock("wouter", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
  useLocation: () => ["/", api.navigate],
  useSearch: () => api.search,
}));

import Portal, { PortalSetPassword } from "./portal";

describe("Portal del paciente", () => {
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
    api.login.mockImplementation((_vars, options) => options.onError({ data: { error: "Correo o clave incorrectos." } }));
    render(<Portal />);
    await user.type(screen.getByLabelText("Correo electrónico"), "p@x.cl");
    await user.type(screen.getByLabelText("Clave"), "mala-clave");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(api.login.mock.calls[0][0]).toEqual({ data: { email: "p@x.cl", password: "mala-clave" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Correo o clave incorrectos.");
  });

  it("asks for the email before sending the password link, and always answers the same", async () => {
    const user = userEvent.setup();
    api.forgot.mockImplementation((_vars, options) => options.onSuccess());
    render(<Portal />);
    const forgot = screen.getByRole("button", { name: /Crear o recuperar mi clave/ });
    expect(forgot).toBeDisabled();
    await user.type(screen.getByLabelText("Correo electrónico"), "p@x.cl");
    await user.click(forgot);
    expect(api.forgot.mock.calls[0][0]).toEqual({ data: { email: "p@x.cl" } });
    expect(screen.getByRole("status")).toHaveTextContent(/Si el correo tiene una cuenta/);
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
    expect(api.navigate).toHaveBeenCalledWith("/paciente");
  });
});
