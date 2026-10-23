import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LANGS } from "@/lib/language";
import { CLINIC_ACCESS_TEXT } from "@/lib/clinic-access-i18n";
import { ClinicChooser } from "./clinic-chooser";

describe("ClinicChooser", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const clinics = [
    { id: "a", name: "Clínica Norte", role: "medico" as const },
    { id: "b", name: "Clínica Sur", role: "administrativo" as const },
  ];
  beforeEach(() => { fetchSpy.mockReset(); });

  it("muestra solo las clínicas recibidas, con su rol en cada una", () => {
    render(<ClinicChooser clinics={clinics} onChosen={vi.fn()} />);
    expect(screen.getByText("Clínica Norte")).toBeInTheDocument();
    expect(screen.getByText("Clínica Sur")).toBeInTheDocument();
    expect(screen.queryByText("Clínica Oculta")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByText("Médico")).toBeInTheDocument();
    expect(screen.getByText("Administrativo")).toBeInTheDocument();
  });

  it("al elegir una pide entrar a esa clínica y avisa", async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const onChosen = vi.fn();
    render(<ClinicChooser clinics={clinics} onChosen={onChosen} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Entrar: Clínica Sur" }));
    await waitFor(() => expect(onChosen).toHaveBeenCalled());
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/auth/clinic");
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ centerId: "b" });
  });

  it("si el servidor la rechaza, muestra el error y no entra", async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ error: "No tienes acceso a esa clínica." }), { status: 403 }));
    const onChosen = vi.fn();
    render(<ClinicChooser clinics={clinics} onChosen={onChosen} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Entrar: Clínica Norte" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onChosen).not.toHaveBeenCalled();
  });

  it("los textos existen en los nueve idiomas", () => {
    for (const { code } of LANGS) {
      const text = CLINIC_ACCESS_TEXT[code];
      for (const value of [text.title, text.subtitle, text.enter, text.switchClinic, text.currentClinic, text.roleMedico, text.roleAdministrativo, text.failed, text.backToSupra, text.directorBanner("X")]) {
        expect(value.trim().length, code).toBeGreaterThan(0);
      }
      expect(text.directorBanner("Clínica Z"), code).toContain("Clínica Z");
    }
  });
});
