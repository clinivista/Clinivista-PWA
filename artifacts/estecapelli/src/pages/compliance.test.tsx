import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider, LANGS } from "@/lib/language";
import { COMPLIANCE_TEXT } from "@/lib/compliance-i18n";
import { Compliance } from "./compliance";

afterEach(() => { vi.unstubAllEnvs(); localStorage.clear(); });

describe("Página y sello de cumplimiento", () => {
  it("no se publica mientras VITE_COMPLIANCE_PUBLIC no esté activada", () => {
    localStorage.setItem("clinivista_lang", "es");
    render(<LanguageProvider><Compliance /></LanguageProvider>);
    expect(screen.queryByRole("heading", { name: "Cumplimiento y protección de datos" })).toBeNull();
    expect(screen.queryByTestId("compliance-seal")).toBeNull();
  });

  it.each(LANGS.map((language) => language.code))("en %s: la página lista lo que falta y aclara que no es una certificación", (code) => {
    localStorage.setItem("clinivista_lang", code);
    const { unmount } = render(<LanguageProvider><Compliance force /></LanguageProvider>);
    const x = COMPLIANCE_TEXT[code];
    expect(screen.getByRole("heading", { level: 1, name: x.title })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
    expect(x.doItems.length).toBeGreaterThanOrEqual(7);
    expect(x.pendingItems).toHaveLength(3);
    expect(x.notice).toContain("21.719");
    // El sello nunca afirma que se cumple todo: dice «diseñado para ayudar».
    expect(x.seal).toContain("21.719");
    unmount();
  });

  it("todos los idiomas tienen la misma cantidad de puntos", () => {
    const shape = (code: keyof typeof COMPLIANCE_TEXT) => [COMPLIANCE_TEXT[code].doItems.length, COMPLIANCE_TEXT[code].clinicItems.length, COMPLIANCE_TEXT[code].pendingItems.length];
    for (const { code } of LANGS) expect(shape(code)).toEqual(shape("es"));
  });
});
