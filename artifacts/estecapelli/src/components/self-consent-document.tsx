import { useEffect, useState } from "react";
import { ConsentDocument } from "@/components/consent-document";
import type { LangCode } from "@/lib/language";

type Info = { language: string; title: string; intro: string; points: string[] };

/**
 * El documento que lee quien se registra por su cuenta, con el nombre y el logo de la clínica. Es el mismo texto
 * que acepta el paciente con el enlace y en la clínica; solo cambia la introducción (aquí él envía sus fotos).
 */
export function SelfConsentDocument({ lang, clinicName, clinicLogo, patientName }: { lang: LangCode; clinicName: string; clinicLogo?: string | null; patientName?: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/consents/photo-info?lang=${lang}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body: Info | null) => { if (!cancelled) setInfo(body); })
      .catch(() => { if (!cancelled) setInfo(null); });
    return () => { cancelled = true; };
  }, [lang]);
  if (!info) return null;
  return (
    <div data-testid="self-consent-document">
      <ConsentDocument lang={lang} heading="h2" clinicName={clinicName} clinicLogo={clinicLogo} patientName={patientName?.trim() || undefined}
        title={info.title} intro={info.intro.replace("{clinic}", clinicName)} points={info.points} />
    </div>
  );
}
