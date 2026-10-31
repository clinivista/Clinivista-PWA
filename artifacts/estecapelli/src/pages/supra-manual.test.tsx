import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SupraManual } from "./supra-manual";
import { loadSupraManual } from "@/lib/help-i18n";

describe("Manual de supra-control", () => {
  it("cubre todas las secciones del panel y marca lo que es solo del director", async () => {
    const sections = await loadSupraManual();
    const keys = sections.map((s) => s.key);
    for (const k of ["acceso", "inicio", "clinicas", "planes", "soporte", "equipo", "servicios", "especialidades", "solucion"]) expect(keys).toContain(k);
    expect(sections.filter((s) => s.directorOnly).map((s) => s.key)).toEqual(["equipo", "servicios"]);
    sections.forEach((s, i) => expect(s.id).toBe(String(i + 1)));
  });

  it("menciona cada función del panel de supra-control", async () => {
    const text = JSON.stringify(await loadSupraManual());
    for (const word of ["Crear clínica", "Registrar pago hasta", "Suspender", "Identidad", "Exportar datos", "Entrar a la clínica", "Marcar como resuelto", "Historial", "Revisar ahora", "Registrar movimiento", "Dermatología", "Cirugía plástica", "Capilar", "Datos de la clínica", "Integraciones solicitadas", "Aplicar cambio", "Guardar límites", "Registrar horas", "Enviar contrato por correo", "Reenviar contrato por correo"]) expect(text).toContain(word);
  });

  it("se puede leer, buscar y navegar; lo solo-director lleva su marca", async () => {
    render(<SupraManual />);
    const article = await screen.findByTestId("supra-manual-article");
    expect(article).toHaveTextContent("Quién es quién");
    await userEvent.click(screen.getByTestId("supra-manual-equipo"));
    expect(within(screen.getByTestId("supra-manual-article")).getByTestId("director-only")).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText("Buscar en el manual…"), "zzzzqq");
    expect(await screen.findByText("No hay resultados.")).toBeInTheDocument();
  });
});
