import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UserRow } from "./user-row";

const user = { id: "u1", email: "ana@x.cl", name: "Ana", phone: "+56 9 1111 2222", role: "medico", active: true, rut: "00000000-0", specialty: "dermatologo" };
const base = { user, setActive: vi.fn(), resetPassword: vi.fn() };

describe("UserRow: editar datos", () => {
  it("edita nombre y rol; el correo se ve pero no se puede cambiar", async () => {
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    render(<UserRow {...base} updateProfile={updateProfile} roleEditable />);
    fireEvent.click(screen.getByRole("button", { name: /Editar datos/ }));
    const email = screen.getByLabelText("Correo") as HTMLInputElement;
    expect(email.value).toBe("ana@x.cl");
    expect(email.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Ana María" } });
    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "administrativo" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ name: "Ana María", role: "administrativo" }));
  });

  it("sin cambios no llama al servidor", async () => {
    const updateProfile = vi.fn();
    render(<UserRow {...base} updateProfile={updateProfile} roleEditable />);
    fireEvent.click(screen.getByRole("button", { name: /Editar datos/ }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(screen.queryByTestId("user-edit-form")).toBeNull());
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("en tu propia fila solo editas el nombre", async () => {
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    render(<UserRow {...base} isSelf updateProfile={updateProfile} roleEditable />);
    fireEvent.click(screen.getByRole("button", { name: /Editar mis datos/ }));
    expect((screen.getByLabelText("Rol") as HTMLSelectElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Yo" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ name: "Yo" }));
  });

  it("cambia la contraseña solo si tiene 8 o más caracteres", async () => {
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    render(<UserRow {...base} updateProfile={updateProfile} roleEditable />);
    fireEvent.click(screen.getByRole("button", { name: /Editar datos/ }));
    fireEvent.change(screen.getByLabelText(/Nueva contraseña/), { target: { value: "corta" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(updateProfile).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Nueva contraseña/), { target: { value: "clave-larga-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ password: "clave-larga-1" }));
  });

  it("muestra el teléfono y permite cambiarlo", async () => {
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    render(<UserRow {...base} updateProfile={updateProfile} roleEditable />);
    expect(screen.getByTestId("user-phone").textContent).toContain("+56 9 1111 2222");
    fireEvent.click(screen.getByRole("button", { name: /Editar datos/ }));
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "+56 2 2222 3333" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ phone: "+56 2 2222 3333" }));
  });
});
