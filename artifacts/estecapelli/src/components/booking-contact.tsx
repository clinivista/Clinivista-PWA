import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, MessageCircle, Phone } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { BOOKING_TEXT, whatsappDigits } from "@/lib/booking-i18n";

type Contact = { phone: string; whatsapp: string; bookingUrl: string; bookingName: string };

/** «Para agendar su hora puede hacerlo a través de…»: llamar, WhatsApp y agendar en línea, según lo que la clínica haya puesto. */
export function BookingContact({ token }: { token: string }) {
  const { lang } = useLanguage();
  const x = BOOKING_TEXT[lang];
  const { data } = useQuery({
    queryKey: ["/api/patients/contact", token],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${encodeURIComponent(token)}/contact`);
      if (!response.ok) throw new Error();
      return (await response.json()) as Contact;
    },
    retry: false,
    staleTime: 5 * 60_000,
  });
  if (!data) return null;
  const phone = data.phone.trim();
  const wa = whatsappDigits(data.whatsapp);
  if (!phone && !wa && !data.bookingUrl) return null;
  const button = "flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-bold text-white shadow-sm active:scale-[0.98] transition-transform";
  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-start" data-testid="booking-contact" dir={lang === "ar" ? "rtl" : "ltr"}>
      <p className="mb-3 text-base font-bold text-foreground">{x.intro}</p>
      <div className="flex flex-col gap-2.5">
        {phone && (
          <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={`${button} bg-slate-700`} data-testid="booking-call">
            <Phone className="h-5 w-5" aria-hidden="true" /> {x.call} · <bdi dir="ltr">{phone}</bdi>
          </a>
        )}
        {wa && (
          <a href={`https://wa.me/${wa}?text=${encodeURIComponent(x.waText)}`} target="_blank" rel="noreferrer" className={`${button} bg-[#25D366] text-slate-900`} data-testid="booking-whatsapp">
            <MessageCircle className="h-5 w-5" aria-hidden="true" /> {x.whatsapp}
          </a>
        )}
        {data.bookingUrl && (
          <a href={data.bookingUrl} target="_blank" rel="noreferrer noopener" className={`${button} bg-primary`} data-testid="booking-online">
            <CalendarCheck className="h-5 w-5" aria-hidden="true" /> {x.online}
          </a>
        )}
      </div>
    </section>
  );
}
