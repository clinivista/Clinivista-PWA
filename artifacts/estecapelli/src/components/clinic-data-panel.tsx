import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language";
import { CLINIC_DATA_TEXT } from "@/lib/clinic-data-i18n";

type ClinicData = { name: string; documentKind: "rut" | "pasaporte"; country: string; rut: string; address: string; phone: string; whatsapp: string; email: string };
type Draft = { address: string; phone: string; whatsapp: string; email: string };

const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;
const phoneOk = (value: string) => /^\+?[\d\s().-]{5,29}$/.test(value.trim()) && (value.match(/\d/g) ?? []).length >= 6;
const KEY = ["/api/clinic/profile"];

function countryName(code: string, lang: string) {
  try { return new Intl.DisplayNames([lang], { type: "region" }).of(code) ?? code; } catch { return code; }
}

/**
 * «Datos de la clínica»: el representante legal actualiza dirección, teléfono, WhatsApp y correo de la empresa.
 * El país y el RUT (o pasaporte) se muestran bloqueados: solo soporte los cambia desde supra-control.
 */
export function ClinicDataPanel() {
  const { lang } = useLanguage();
  const x = CLINIC_DATA_TEXT[lang];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const response = await fetch("/api/clinic/profile", { credentials: "include" });
      if (!response.ok) throw new Error(String(response.status));
      return (await response.json()) as ClinicData;
    },
  });
  const [draft, setDraft] = useState<Draft>({ address: "", phone: "", whatsapp: "", email: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setDraft({ address: data.address, phone: data.phone, whatsapp: data.whatsapp, email: data.email }); }, [data]);

  if (isLoading) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" aria-label={x.loading} /></div>;
  if (isError || !data) return <p role="alert" className="p-6 text-sm text-destructive">{x.loadError}</p>;

  const problems = {
    address: draft.address.trim() === "" ? x.required : "",
    phone: draft.phone.trim() === "" ? x.required : phoneOk(draft.phone) ? "" : x.invalidPhone,
    whatsapp: draft.whatsapp.trim() === "" || phoneOk(draft.whatsapp) ? "" : x.invalidPhone,
    email: draft.email.trim() === "" || EMAIL.test(draft.email.trim()) ? "" : x.invalidEmail,
  };
  const valid = Object.values(problems).every((problem) => problem === "");
  const dirty = (Object.keys(draft) as Array<keyof Draft>).some((key) => draft[key] !== data[key]);

  const save = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/clinic/profile", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const body = (await response.json().catch(() => null)) as (ClinicData & { error?: string }) | null;
      if (!response.ok || !body) { toast({ variant: "destructive", title: x.cantSave, description: body?.error ?? x.tryAgain }); return; }
      queryClient.setQueryData(KEY, body);
      toast({ title: x.saved });
    } catch {
      toast({ variant: "destructive", title: x.cantSave, description: x.tryAgain });
    } finally {
      setBusy(false);
    }
  };

  const field = (id: keyof Draft, label: string, props: { type?: string; max: number; help?: string; placeholder?: string; required?: boolean }) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`clinic-data-${id}`} className="text-xs font-bold text-slate-600">{label}{props.required ? " *" : ""}</label>
      <Input id={`clinic-data-${id}`} type={props.type ?? "text"} autoComplete="off" maxLength={props.max} placeholder={props.placeholder} className="h-11 rounded-full"
        value={draft[id]} aria-invalid={draft[id] !== "" && problems[id] !== ""} onChange={(event) => setDraft((prev) => ({ ...prev, [id]: event.target.value }))} />
      {draft[id] !== "" && problems[id] !== "" ? <p role="alert" className="text-xs text-red-700">{problems[id]}</p> : props.help ? <p className="text-xs text-muted-foreground">{props.help}</p> : null}
    </div>
  );

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 rounded-[1.75rem] bg-white p-6 shadow-sm md:p-8" data-testid="clinic-data-panel" aria-labelledby="clinic-data-title">
      <div>
        <h2 id="clinic-data-title" className="flex items-center gap-2 text-lg font-extrabold"><Building2 className="h-5 w-5 text-primary" aria-hidden />{x.title}</h2>
        <p className="text-sm text-muted-foreground">{x.subtitle}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-[#F5F2EE] p-4" data-testid="clinic-data-fixed">
        <p className="flex items-center gap-1.5 text-sm font-bold"><Lock className="h-4 w-4" aria-hidden />{x.fixedTitle}</p>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <div><dt className="text-xs font-bold text-slate-600">{x.name}</dt><dd className="font-semibold"><bdi>{data.name}</bdi></dd></div>
          <div><dt className="text-xs font-bold text-slate-600">{x.country}</dt><dd className="font-semibold">{countryName(data.country, lang)}</dd></div>
          <div><dt className="text-xs font-bold text-slate-600">{data.documentKind === "pasaporte" ? x.passport : x.rut}</dt><dd className="font-semibold"><bdi>{data.rut || "—"}</bdi></dd></div>
        </dl>
        <p className="text-xs text-muted-foreground">{x.fixedNote}</p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); if (valid && dirty && !busy) void save(); }}>
        <p className="text-sm font-bold">{x.editableTitle}</p>
        {field("address", x.address, { max: 200, required: true })}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("phone", x.phone, { type: "tel", max: 30, required: true, placeholder: "+56 2 2345 6789" })}
          {field("whatsapp", x.whatsapp, { type: "tel", max: 30, help: x.whatsappHelp, placeholder: "+56 9 1234 5678" })}
        </div>
        {field("email", x.email, { type: "email", max: 120, help: x.emailHelp, placeholder: "contacto@clinica.cl" })}
        <div className="flex justify-end">
          <Button type="submit" className="rounded-full px-6" disabled={!valid || !dirty || busy}>
            {busy ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : null}{x.save}
          </Button>
        </div>
      </form>
    </section>
  );
}
