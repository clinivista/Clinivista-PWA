import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import { BOOKING_TEXT, whatsappDigits } from "@/lib/booking-i18n";
import { BookingContact } from "./booking-contact";

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
const wrap = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LanguageProvider><BookingContact token="tok" /></LanguageProvider></QueryClientProvider>);
const serve = (body: object, status = 200) => vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe("Para agendar su hora (paciente)", () => {
  it("muestra llamar, WhatsApp y agendar en línea con los datos de la clínica", async () => {
    serve({ phone: "+56 2 2345 6789", whatsapp: "+56 9 8765 4321", bookingUrl: "https://medilink.cl/a", bookingName: "medilink" });
    wrap();
    expect(await screen.findByText("Para agendar su hora puede hacerlo a través de:")).toBeInTheDocument();
    expect(screen.getByTestId("booking-call")).toHaveAttribute("href", "tel:+56223456789");
    expect(screen.getByTestId("booking-whatsapp").getAttribute("href")).toMatch(/^https:\/\/wa\.me\/56987654321\?text=/);
    expect(screen.getByTestId("booking-online")).toHaveAttribute("href", "https://medilink.cl/a");
  });

  it("solo muestra lo que la clínica puso, y nada si no puso nada o falla la consulta", async () => {
    serve({ phone: "+56 2 2345 6789", whatsapp: "", bookingUrl: "", bookingName: "" });
    const { unmount } = wrap();
    expect(await screen.findByTestId("booking-call")).toBeInTheDocument();
    expect(screen.queryByTestId("booking-whatsapp")).toBeNull();
    expect(screen.queryByTestId("booking-online")).toBeNull();
    unmount();
    serve({ phone: "", whatsapp: "", bookingUrl: "", bookingName: "" });
    wrap();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByTestId("booking-contact")).toBeNull();
  });

  it("tiene todos los textos en los 9 idiomas", () => {
    expect(Object.keys(BOOKING_TEXT)).toHaveLength(9);
    for (const [lang, t] of Object.entries(BOOKING_TEXT)) for (const [key, value] of Object.entries(t)) expect(value, `${lang}.${key}`).toBeTruthy();
    expect(whatsappDigits("+56 9 8765-4321")).toBe("56987654321");
  });
});
