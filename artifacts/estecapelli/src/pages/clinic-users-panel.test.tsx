import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const api = vi.hoisted(() => ({
  users: [] as Array<Record<string, unknown>>,
  deleteUser: vi.fn(),
  patchUser: vi.fn(),
  resetPassword: vi.fn(),
  createUser: vi.fn(),
}));

vi.mock("@workspace/api-client-react", () => ({
  getGetClinicUsersQueryKey: () => ["/api/clinic/users"],
  useGetClinicUsers: () => ({ data: { users: api.users }, isLoading: false, isError: false }),
  useCreateClinicUser: () => ({ mutate: api.createUser, isPending: false }),
  usePatchClinicUser: () => ({ mutateAsync: api.patchUser }),
  useResetClinicUserPassword: () => ({ mutateAsync: api.resetPassword }),
  useDeleteClinicUser: () => ({ mutateAsync: api.deleteUser }),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

import { ClinicUsersPanel } from "./clinic-users-panel";

const user = (over: Record<string, unknown>) => ({
  id: "u", email: "u@x.cl", name: "Persona", role: "medico", active: true, legalRepresentative: false, isSelf: false, createdAt: "2026-01-01T00:00:00Z", ...over,
});
const setup = () => userEvent.setup();

describe("ClinicUsersPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.users = [
      user({ id: "me", email: "me@x.cl", name: "Yo Mismo", role: "administrativo", isSelf: true }),
      user({ id: "doc", email: "doc@x.cl", name: "Doctora", role: "medico", legalRepresentative: true }),
      user({ id: "blk", email: "blk@x.cl", name: "Bloqueado", role: "administrativo", active: false }),
    ];
    api.deleteUser.mockResolvedValue(undefined);
    api.patchUser.mockResolvedValue({});
  });

  it("lists the clinic's users with role, legal-representative and blocked badges", () => {
    render(<ClinicUsersPanel />);
    expect(screen.getByText("Doctora")).toBeInTheDocument();
    expect(screen.getByText("Representante legal")).toBeInTheDocument();
    expect(screen.getByText("Bloqueado", { selector: "span.rounded-full" })).toBeInTheDocument();
    expect(screen.getByText("Tú")).toBeInTheDocument();
  });

  it("offers no actions on the signed-in user's own row", () => {
    render(<ClinicUsersPanel />);
    // 2 other users × (reset, block, legal, delete); none for "Tú".
    expect(screen.getAllByRole("button", { name: /Eliminar/ })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Restablecer contraseña/ })).toHaveLength(2);
  });

  it("asks for confirmation before deleting, and only then deletes", async () => {
    const u = setup();
    render(<ClinicUsersPanel />);
    const row = screen.getByText("Doctora").closest("div.rounded-2xl") as HTMLElement;
    await u.click(within(row).getByRole("button", { name: /Eliminar/ }));
    expect(api.deleteUser).not.toHaveBeenCalled();
    expect(within(row).getByText(/No se puede deshacer/)).toBeInTheDocument();
    await u.click(within(row).getByRole("button", { name: "Sí, eliminar" }));
    await waitFor(() => expect(api.deleteUser).toHaveBeenCalledWith({ userId: "doc" }));
  });

  it("cancelling the confirmation deletes nothing", async () => {
    const u = setup();
    render(<ClinicUsersPanel />);
    const row = screen.getByText("Doctora").closest("div.rounded-2xl") as HTMLElement;
    await u.click(within(row).getByRole("button", { name: /Eliminar/ }));
    await u.click(within(row).getByRole("button", { name: "Cancelar" }));
    expect(api.deleteUser).not.toHaveBeenCalled();
  });

  it("shows the server's reason when a deletion is refused (last manager)", async () => {
    api.deleteUser.mockRejectedValue({ data: { error: "Debe quedar al menos un administrativo o representante legal activo en la clínica." } });
    const u = setup();
    render(<ClinicUsersPanel />);
    const row = screen.getByText("Doctora").closest("div.rounded-2xl") as HTMLElement;
    await u.click(within(row).getByRole("button", { name: /Eliminar/ }));
    await u.click(within(row).getByRole("button", { name: "Sí, eliminar" }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: expect.stringContaining("Debe quedar al menos un administrativo") })),
    );
  });

  it("blocks, unblocks and toggles the legal representative through the API", async () => {
    const u = setup();
    render(<ClinicUsersPanel />);
    const blocked = screen.getByText("Bloqueado", { selector: "span.truncate" }).closest("div.rounded-2xl") as HTMLElement;
    await u.click(within(blocked).getByRole("button", { name: /Desbloquear acceso/ }));
    await u.click(within(blocked).getByRole("button", { name: "Sí, desbloquear" }));
    await waitFor(() => expect(api.patchUser).toHaveBeenCalledWith({ userId: "blk", data: { active: true } }));

    const doc = screen.getByText("Doctora").closest("div.rounded-2xl") as HTMLElement;
    await u.click(within(doc).getByRole("button", { name: /Quitar representante legal/ }));
    await u.click(within(doc).getByRole("button", { name: "Sí, confirmar" }));
    await waitFor(() => expect(api.patchUser).toHaveBeenCalledWith({ userId: "doc", data: { legalRepresentative: false } }));
  });

  it("creates a user as legal representative", async () => {
    const u = setup();
    render(<ClinicUsersPanel />);
    await u.click(screen.getAllByRole("button", { name: /Agregar usuario/ })[0]);
    await u.type(screen.getByLabelText("Correo"), "nuevo@x.cl");
    await u.type(screen.getByLabelText("Contraseña"), "password123");
    await u.click(screen.getByLabelText(/Representante legal/));
    await u.click(screen.getByRole("button", { name: "Crear usuario" }));
    expect(api.createUser).toHaveBeenCalledWith(
      { data: expect.objectContaining({ email: "nuevo@x.cl", role: "medico", legalRepresentative: true }) },
      expect.anything(),
    );
  });
});
