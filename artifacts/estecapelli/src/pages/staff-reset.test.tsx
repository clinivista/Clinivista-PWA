import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const api = vi.hoisted(() => ({ forgot: vi.fn(), reset: vi.fn(), login: vi.fn(), search: "?token=abc123abc123abc123abc123" }));

vi.mock("@workspace/api-client-react", () => ({
  getGetAuthMeQueryKey: () => ["/api/auth/me"],
  useGetAuthMe: () => ({ data: { authenticated: false }, isLoading: false }),
  useAdminLogin: () => ({ mutate: api.login, isPending: false }),
  useStaffForgot: () => ({ mutate: api.forgot, isPending: false }),
  useStaffReset: () => ({ mutate: api.reset, isPending: false }),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock("wouter", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
  useLocation: () => ["/", vi.fn()],
  useSearch: () => api.search,
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { LanguageProvider, LANGS } from "@/lib/language";
import { STAFF_RESET_TEXT } from "@/lib/staff-reset-i18n";
import Login from "./login";
import StaffReset from "./staff-reset";

describe("Olvido de clave del personal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("pide el enlace desde la pantalla de ingreso y avisa sin revelar si la cuenta existe", async () => {
    const user = userEvent.setup();
    api.forgot.mockImplementation((_vars, options) => options.onSuccess());
    render(<LanguageProvider><Login /></LanguageProvider>);
    await user.click(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
    await user.type(screen.getByPlaceholderText("tu@clinica.cl"), "doc@x.cl");
    await user.click(screen.getByRole("button", { name: "Enviar enlace" }));
    expect(api.forgot.mock.calls[0][0]).toEqual({ data: { email: "doc@x.cl", language: "es" } });
    expect(await screen.findByRole("status")).toHaveTextContent("Si el correo corresponde a una cuenta activa");
  });

  it("guarda la clave nueva solo si coincide y tiene 8 caracteres", async () => {
    const user = userEvent.setup();
    api.reset.mockImplementation((_vars, options) => options.onSuccess());
    render(<LanguageProvider><StaffReset /></LanguageProvider>);
    const save = screen.getByRole("button", { name: "Guardar contraseña" });
    await user.type(screen.getByLabelText("Contraseña nueva"), "clave-nueva-2");
    await user.type(screen.getByLabelText("Repite la contraseña"), "distinta");
    expect(save).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("no coinciden");
    await user.clear(screen.getByLabelText("Repite la contraseña"));
    await user.type(screen.getByLabelText("Repite la contraseña"), "clave-nueva-2");
    await user.click(save);
    expect(api.reset.mock.calls[0][0]).toEqual({ data: { token: "abc123abc123abc123abc123", password: "clave-nueva-2" } });
    expect(await screen.findByRole("status")).toHaveTextContent("tu contraseña fue cambiada");
  });

  it("tiene todos los textos en los nueve idiomas", () => {
    for (const { code } of LANGS) {
      const text = STAFF_RESET_TEXT[code];
      expect(Object.values(text).every((value) => value.trim().length > 0), code).toBe(true);
    }
    expect(Object.keys(STAFF_RESET_TEXT)).toHaveLength(9);
  });
});
