import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { LanguageProvider } from "@/lib/language";
import { SYSTEM_TEXT } from "@/lib/system-pages-i18n";
import NotFound from "./not-found";
import { ErrorBoundary } from "@/components/error-boundary";

function Boom(): never {
  throw new Error("fallo de prueba");
}

describe("pantallas de sistema", () => {
  it("las nueve lenguas tienen todos los textos", () => {
    for (const text of Object.values(SYSTEM_TEXT)) for (const value of Object.values(text)) expect(value.trim().length).toBeGreaterThan(0);
    expect(Object.keys(SYSTEM_TEXT)).toHaveLength(9);
  });

  it("la página no encontrada está en el idioma de la persona y vuelve al inicio", () => {
    window.localStorage.setItem("clinivista_lang", "pt");
    render(<LanguageProvider><Router hook={memoryLocation({ path: "/nada" }).hook}><NotFound /></Router></LanguageProvider>);
    expect(screen.getByRole("heading", { name: "Página não encontrada" })).toBeInTheDocument();
    expect(screen.getByTestId("not-found-home")).toHaveAttribute("href", "/");
    expect(screen.queryByText(/router/i)).not.toBeInTheDocument();
    window.localStorage.removeItem("clinivista_lang");
  });

  it("el error inesperado se muestra con la marca, en el idioma guardado y sin detalles internos", () => {
    window.localStorage.setItem("clinivista_lang", "ar");
    const spy = console.error;
    console.error = () => undefined;
    try {
      render(<ErrorBoundary><Boom /></ErrorBoundary>);
    } finally {
      console.error = spy;
      window.localStorage.removeItem("clinivista_lang");
    }
    expect(screen.getByTestId("error-fallback")).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("heading", { name: SYSTEM_TEXT.ar.errorTitle })).toBeInTheDocument();
  });
});
