import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGetDirectorCentersQueryKey } from "@workspace/api-client-react";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { COUNTRIES, documentKind, documentProblem } from "@/lib/profile-fields";

type Profile = { country: string; rut: string; address: string; phone: string };

/** Supra-control: país, RUT (o pasaporte fuera de Chile), dirección y teléfono de la clínica. Van en el contrato; se pueden completar y corregir. Solo español. */
export function CenterProfilePanel({ centerId }: { centerId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const url = `/api/director/centers/${encodeURIComponent(centerId)}/profile`;
  const key = ["/api/director/centers", centerId, "profile"];
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error();
      return (await response.json()) as Profile;
    },
  });
  const [draft, setDraft] = useState<Profile>({ country: "CL", rut: "", address: "", phone: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data && typeof data.country === "string") setDraft(data); }, [data]);
  if (!data || typeof data.country !== "string") return null;

  const passport = documentKind(draft.country) === "pasaporte";
  const missing = !data.rut || !data.address || !data.phone;
  const problem = documentProblem(draft.rut, draft.country);
  const valid = !problem && draft.address.trim() !== "" && draft.phone.trim() !== "";
  const dirty = draft.country !== data.country || draft.rut !== data.rut || draft.address !== data.address || draft.phone !== data.phone;

  const save = async () => {
    setBusy(true);
    try {
      const response = await fetch(url, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const body = (await response.json().catch(() => null)) as (Profile & { error?: string }) | null;
      if (!response.ok || !body) { toast({ variant: "destructive", title: "No pudimos guardar los datos", description: body?.error ?? "Inténtalo de nuevo." }); return; }
      queryClient.setQueryData(key, body);
      await queryClient.invalidateQueries({ queryKey: getGetDirectorCentersQueryKey() });
      await queryClient.invalidateQueries({ queryKey: ["/api/director/centers", centerId, "contract"] });
      toast({ title: "Datos de la clínica guardados" });
    } catch {
      toast({ variant: "destructive", title: "No pudimos guardar los datos", description: "Inténtalo de nuevo." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-[#E8E4DE]" data-testid={`profile-panel-${centerId}`}>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <Building2 className="w-4 h-4" /> Datos de la clínica
        {missing && <span className="ms-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800" data-testid="profile-missing">Faltan datos</span>}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`profile-country-${centerId}`} className="text-xs font-bold text-slate-600">País</label>
          <select id={`profile-country-${centerId}`} className="h-10 rounded-full border border-input bg-[#F5F2EE] px-4 text-sm" value={draft.country} onChange={(event) => setDraft((prev) => ({ ...prev, country: event.target.value }))}>
            {COUNTRIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`profile-doc-${centerId}`} className="text-xs font-bold text-slate-600">{passport ? "Pasaporte" : "RUT"} *</label>
          <Input id={`profile-doc-${centerId}`} autoComplete="off" maxLength={30} placeholder={passport ? "N.º de pasaporte" : "12.345.678-5"} className="h-10 rounded-full" value={draft.rut} onChange={(event) => setDraft((prev) => ({ ...prev, rut: event.target.value }))} />
          {draft.rut !== "" && problem === "invalid" && <p role="alert" className="text-xs text-red-700">{passport ? "El pasaporte debe tener entre 5 y 20 letras o números." : "El RUT no es válido. Revisa el dígito verificador."}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`profile-address-${centerId}`} className="text-xs font-bold text-slate-600">Dirección *</label>
          <Input id={`profile-address-${centerId}`} autoComplete="off" maxLength={200} className="h-10 rounded-full" value={draft.address} onChange={(event) => setDraft((prev) => ({ ...prev, address: event.target.value }))} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`profile-phone-${centerId}`} className="text-xs font-bold text-slate-600">Teléfono *</label>
          <Input id={`profile-phone-${centerId}`} type="tel" autoComplete="off" maxLength={30} placeholder="+56 2 2345 6789" className="h-10 rounded-full" value={draft.phone} onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{passport ? "Fuera de Chile la clínica y su gente se identifican con pasaporte." : "En Chile se identifica con RUT; para demostraciones sirve 00000000-0."} Estos datos rellenan el contrato.</p>
      <Button size="sm" className="rounded-full self-start" disabled={busy || !valid || !dirty} onClick={() => void save()} data-testid="profile-save">
        {busy && <Loader2 className="w-4 h-4 animate-spin me-2" />} Guardar datos
      </Button>
    </div>
  );
}
