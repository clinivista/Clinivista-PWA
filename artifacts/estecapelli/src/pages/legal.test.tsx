import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Privacy, Terms, LEGAL_CONTACT_EMAIL } from "./legal";

describe("Páginas legales", () => {
  it("la política de privacidad explica datos, Google, derechos y contacto", () => {
    render(<Privacy />);
    expect(screen.getByRole("heading", { level: 1, name: "Política de privacidad" })).toBeInTheDocument();
    expect(screen.getByText(/solo tu nombre y tu correo verificado/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tus derechos" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: LEGAL_CONTACT_EMAIL })[0]).toHaveAttribute("href", `mailto:${LEGAL_CONTACT_EMAIL}`);
  });

  it("los términos aclaran que no reemplazan una consulta presencial y enlazan a la privacidad", () => {
    render(<Terms />);
    expect(screen.getByRole("heading", { level: 1, name: "Términos de servicio" })).toBeInTheDocument();
    expect(screen.getByText(/no reemplaza una consulta presencial/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "política de privacidad" })[0]).toHaveAttribute("href", "/privacidad");
  });
});
