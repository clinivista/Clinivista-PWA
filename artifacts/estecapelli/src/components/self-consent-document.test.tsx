import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SelfConsentDocument } from "./self-consent-document";

afterEach(() => { vi.restoreAllMocks(); });

describe("Documento de consentimiento del registro propio", () => {
  it("muestra el nombre y logo de la clínica, la introducción y los puntos", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({
      language: "es", title: "Autorización para fotografías clínicas", intro: "{clinic} recibirá tus datos.", points: ["Para qué: evaluar.", "Quién las ve: el equipo."],
    }), { status: 200 }));
    render(<SelfConsentDocument lang="es" clinicName="Capilar Demo" clinicLogo="data:image/png;base64,AAAA" patientName="Ana" />);
    expect(await screen.findByTestId("consent-clinic-name")).toHaveTextContent("Capilar Demo");
    expect(screen.getByTestId("consent-clinic-logo")).toHaveAttribute("src", "data:image/png;base64,AAAA");
    expect(screen.getByText("Capilar Demo recibirá tus datos.")).toBeInTheDocument();
    expect(screen.getByText(/Quién las ve/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Autorización para fotografías clínicas");
  });
  it("si falla la carga no muestra nada y no rompe el formulario", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("x"));
    const { container } = render(<SelfConsentDocument lang="es" clinicName="X" />);
    await new Promise((r) => setTimeout(r, 20));
    expect(container).toBeEmptyDOMElement();
  });
});
