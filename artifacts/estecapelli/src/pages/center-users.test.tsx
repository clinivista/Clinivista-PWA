import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const api = vi.hoisted(() => ({ patchUser: vi.fn(), createUser: vi.fn() }));

vi.mock("@workspace/api-client-react", () => ({
  getGetDirectorCentersQueryKey: () => ["/api/director/centers"],
  getGetDirectorCenterUsersQueryKey: (id: string) => ["/api/director/centers", id, "users"],
  useGetDirectorCenterUsers: () => ({
    data: { users: [{ id: "u1", email: "ana@x.cl", name: "Ana", role: "medico", active: true, legalRepresentative: false, createdAt: "2026-01-01T00:00:00Z" }] },
    isLoading: false,
    isError: false,
  }),
  useCreateDirectorCenterUser: () => ({ mutate: api.createUser, isPending: false }),
  usePatchDirectorCenterUser: () => ({ mutateAsync: api.patchUser }),
  useResetDirectorCenterUserPassword: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { CenterUsers } from "./center-users";

describe("CenterUsers (supra-control)", () => {
  beforeEach(() => { vi.clearAllMocks(); api.patchUser.mockResolvedValue({}); });

  it("lets the director mark an existing user as legal representative", async () => {
    const u = userEvent.setup();
    render(<CenterUsers centerId="clinic-a" />);
    const row = screen.getByText("Ana").closest("div.rounded-2xl") as HTMLElement;
    await u.click(within(row).getByRole("button", { name: /Hacer representante legal/ }));
    await u.click(within(row).getByRole("button", { name: "Sí, confirmar" }));
    await waitFor(() =>
      expect(api.patchUser).toHaveBeenCalledWith({ id: "clinic-a", userId: "u1", data: { legalRepresentative: true } }),
    );
  });

  it("offers the legal-representative checkbox when creating a user", async () => {
    const u = userEvent.setup();
    render(<CenterUsers centerId="clinic-a" />);
    await u.click(screen.getByRole("button", { name: /Agregar usuario/ }));
    await u.type(screen.getByLabelText("Correo"), "nuevo@x.cl");
    await u.type(screen.getByLabelText("Contraseña"), "password123");
    await u.click(screen.getByLabelText(/Representante legal/));
    await u.click(screen.getByRole("button", { name: "Crear usuario" }));
    expect(api.createUser).toHaveBeenCalledWith(
      { id: "clinic-a", data: expect.objectContaining({ legalRepresentative: true }) },
      expect.anything(),
    );
  });
});
