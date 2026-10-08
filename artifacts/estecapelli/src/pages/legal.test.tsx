import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider, LANGS } from "@/lib/language";
import { LEGAL_TEXT } from "@/lib/legal-i18n";
import { PORTAL_TEXT } from "@/lib/portal-i18n";
import { Privacy, Terms, LEGAL_CONTACT_EMAIL } from "./legal";

const inLanguage = (code: string, ui: React.ReactElement) => {
  localStorage.setItem("clinivista_lang", code);
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

describe("Páginas legales", () => {
  it("la política de privacidad explica datos, Google, derechos y contacto", () => {
    localStorage.clear();
    render(<Privacy />);
    expect(screen.getByRole("heading", { level: 1, name: "Política de privacidad" })).toBeInTheDocument();
    expect(screen.getByText(/solo tu nombre y tu correo verificado/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tus derechos" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: LEGAL_CONTACT_EMAIL })[0]).toHaveAttribute("href", `mailto:${LEGAL_CONTACT_EMAIL}`);
  });

  it("los términos aclaran que no reemplazan una consulta presencial y enlazan a la privacidad", () => {
    localStorage.clear();
    render(<Terms />);
    expect(screen.getByRole("heading", { level: 1, name: "Términos de servicio" })).toBeInTheDocument();
    expect(screen.getByText(/no reemplaza una consulta presencial/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "política de privacidad" })[0]).toHaveAttribute("href", "/privacidad");
  });

  it.each(LANGS.map((language) => language.code))("en %s: título, contacto, enlace a privacidad y secciones completas", (code) => {
    const { unmount } = inLanguage(code, <Terms />);
    const text = LEGAL_TEXT[code];
    expect(screen.getByRole("heading", { level: 1, name: text.terms.title })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: LEGAL_CONTACT_EMAIL }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: text.privacyLinkText }).every((link) => link.getAttribute("href") === "/privacidad")).toBe(true);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(text.terms.sections.length);
    expect(document.querySelector("div[dir]")).toHaveAttribute("dir", code === "ar" ? "rtl" : "ltr");
    unmount();
    inLanguage(code, <Privacy />);
    expect(screen.getByRole("heading", { level: 1, name: text.privacy.title })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(text.privacy.sections.length);
    expect(screen.getByRole("link", { name: PORTAL_TEXT[code].terms })).toHaveAttribute("href", "/terminos");
  });

  it("todos los idiomas tienen las mismas secciones y los mismos marcadores", () => {
    const shape = (code: keyof typeof LEGAL_TEXT) => {
      const { privacy, terms } = LEGAL_TEXT[code];
      return [privacy, terms].map((doc) => doc.sections.map((section) => [section.p?.length ?? 0, section.ul?.length ?? 0, section.after?.length ?? 0, JSON.stringify(section.p?.concat(section.ul ?? [], section.after ?? []).join("").match(/\{(email|privacy)\}/g) ?? [])]));
    };
    for (const { code } of LANGS) expect(shape(code)).toEqual(shape("es"));
  });
});
