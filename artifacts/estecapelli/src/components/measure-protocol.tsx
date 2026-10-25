import { Coins } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { MEASURE_REFERENCES } from "@/lib/measure-references";
import { MEASURE_TEXT, coinLabel } from "@/lib/measure-i18n";

/** Dibujo simple: piel con la lesión y, pegada al lado, la moneda de referencia. */
function Illustration() {
  return (
    <svg viewBox="0 0 220 110" role="img" aria-hidden="true" className="w-full max-w-[220px] mx-auto">
      <rect x="2" y="2" width="216" height="106" rx="14" fill="#F3D9C4" />
      <ellipse cx="78" cy="56" rx="30" ry="22" fill="#B4553A" opacity="0.85" />
      <circle cx="156" cy="56" r="26" fill="#C9C9CF" stroke="#8D8D95" strokeWidth="3" />
      <circle cx="156" cy="56" r="15" fill="#E3C46E" stroke="#B89A3E" strokeWidth="2" />
      <line x1="130" y1="94" x2="182" y2="94" stroke="#0ea5e9" strokeWidth="3" />
      <line x1="48" y1="94" x2="108" y2="94" stroke="#f59e0b" strokeWidth="3" />
    </svg>
  );
}

/** Instrucciones para el paciente: cómo poner la moneda junto a la lesión y tomar la foto. */
export function MeasureProtocol() {
  const { lang } = useLanguage();
  const c = MEASURE_TEXT[lang];
  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3" aria-label={c.protoTitle} data-testid="measure-protocol">
      <h4 className="font-bold text-foreground flex items-center gap-2"><Coins className="w-4 h-4 text-primary" />{c.protoTitle}</h4>
      <p className="text-sm text-muted-foreground">{c.protoIntro}</p>
      <Illustration />
      <ol className="list-decimal ps-5 flex flex-col gap-1.5 text-sm text-foreground">
        {c.protoSteps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{c.protoCoins}</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 text-sm">
          {MEASURE_REFERENCES.map((reference) => <li key={reference.id}>{coinLabel(reference, lang)}</li>)}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">{c.protoDisclaimer}</p>
    </section>
  );
}
