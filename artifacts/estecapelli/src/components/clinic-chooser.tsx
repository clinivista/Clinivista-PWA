import { useState } from "react";
import { Building2, Loader2, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { useLanguage } from "@/lib/language";
import { CLINIC_ACCESS_TEXT } from "@/lib/clinic-access-i18n";

export type ChooserClinic = { id: string; name: string; role: "medico" | "administrativo" };

/** Cambia la clínica de la sesión (null = volver a la pantalla de elección). */
export async function selectClinic(centerId: string | null): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/clinic", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ centerId }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function post(path: string, body?: unknown): Promise<boolean> {
  try {
    const response = await fetch(path, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Pantalla al iniciar sesión. El personal ve solo las clínicas donde su correo y clave
 * coinciden; un director ve todas las clínicas y además "Supra-control".
 */
export function ClinicChooser({ clinics, onChosen, director = false }: { clinics: ChooserClinic[]; onChosen: () => void; director?: boolean }) {
  const { lang } = useLanguage();
  const c = CLINIC_ACCESS_TEXT[lang];
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("");
  const shown = clinics.filter((clinic) => clinic.name.toLowerCase().includes(filter.trim().toLowerCase()));

  const run = async (key: string, action: () => Promise<boolean>) => {
    setBusy(key);
    setError(false);
    if (await action()) onChosen();
    else { setError(true); setBusy(null); }
  };
  const choose = (id: string) => run(id, () => (director ? post("/api/auth/enter-clinic", { centerId: id }) : selectClinic(id)));

  return (
    <div className="min-h-[100dvh] bg-[#F5F2EE] flex items-center justify-center p-4" data-testid="clinic-chooser">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-sm p-6 sm:p-8">
        <BrandLogo className="h-14 w-14 rounded-xl mb-5" />
        <h1 className="text-xl font-extrabold text-foreground">{c.title}</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-5">{director ? c.subtitleDirector : c.subtitle}</p>
        {director && (
          <div className="flex items-center gap-3 rounded-2xl bg-[#0B1F33] text-white p-4 mb-3" data-testid="choose-supra">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-bold break-words">{c.supraName}</p>
              <p className="text-xs text-white/70">{c.supraSub}</p>
            </div>
            <Button type="button" variant="secondary" className="rounded-full shrink-0" disabled={busy !== null} onClick={() => run("supra", () => post("/api/auth/leave-clinic"))}>
              {busy === "supra" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{c.enter}
            </Button>
          </div>
        )}
        {clinics.length > 6 && (
          <Input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={c.search} aria-label={c.search} className="h-11 rounded-2xl mb-3" />
        )}
        <ul className="flex flex-col gap-3">
          {shown.map((clinic) => (
            <li key={clinic.id} className="flex items-center gap-3 rounded-2xl bg-[#F5F2EE] p-4">
              <Building2 className="w-5 h-5 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground break-words">{clinic.name}</p>
                {!director && <p className="text-xs text-muted-foreground">{clinic.role === "medico" ? c.roleMedico : c.roleAdministrativo}</p>}
              </div>
              <Button type="button" className="rounded-full shrink-0" disabled={busy !== null} onClick={() => choose(clinic.id)} aria-label={`${c.enter}: ${clinic.name}`}>
                {busy === clinic.id && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{c.enter}
              </Button>
            </li>
          ))}
        </ul>
        {error && <p role="alert" className="text-sm text-destructive mt-4">{c.failed}</p>}
      </div>
    </div>
  );
}
