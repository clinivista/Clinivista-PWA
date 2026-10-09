import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "@/lib/language";
import { PasswordInput } from "./password-input";

describe("PasswordInput", () => {
  it("oculta la contraseña y la muestra al tocar el ojo", async () => {
    const user = userEvent.setup();
    render(<LanguageProvider><PasswordInput aria-label="clave" defaultValue="secreta123" /></LanguageProvider>);
    const input = screen.getByLabelText("clave");
    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(input).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(input).toHaveAttribute("type", "password");
  });
});
