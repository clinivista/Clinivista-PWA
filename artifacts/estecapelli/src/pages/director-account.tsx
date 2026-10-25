import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { useToast } from "@/hooks/use-toast";

type Profile = "medico" | "administrativo" | "representante_legal";
type Me = { id: string; email: string; name: string; phone: string; entryProfile?: Profile };
const PROFILES: { id: Profile; title: string; text: string }[] = [
  { id: "medico", title: "Médico", text: "Ves pacientes, fotos, diagnósticos e informes como un médico de la clínica." },
  { id: "administrativo", title: "Administrativo", text: "Ves lo que ve el personal administrativo de la clínica." },
  { id: "representante_legal", title: "Representante legal", text: "Como médico, y además configuras fases, tipos de consulta e informes de la clínica." },
];
const KEY = ["director-me"];

async function call<T>(url: string, method: "GET" | "PATCH" | "POST" | "PUT", body?: unknown): Promise<T> {
  const response = await fetch(url, { method, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "No pudimos guardar el cambio.");
  return data;
}

// «Mi cuenta» del director: sus datos de contacto, el correo con el que entra y su clave.
// Cambiar el correo o la clave pide la clave actual.
export function DirectorAccount() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: KEY, queryFn: () => call<Me>("/api/director/me", "GET"), retry: false });
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [currentForEmail, setCurrentForEmail] = useState("");
  const [pass, setPass] = useState({ current: "", next: "", repeat: "" });
  const [busy, setBusy] = useState<"data" | "pass" | null>(null);

  useEffect(() => { if (me) setForm({ name: me.name, phone: me.phone, email: me.email }); }, [me]);
  if (!me) return <Loader2 className="w-5 h-5 animate-spin" aria-label="Cargando" />;

  const emailChanged = form.email.trim().toLowerCase() !== me.email.toLowerCase();

  const saveData = async () => {
    setBusy("data");
    try {
      const saved = await call<Me>("/api/director/me", "PATCH", {
        name: form.name, phone: form.phone,
        ...(emailChanged ? { email: form.email, currentPassword: currentForEmail } : {}),
      });
      queryClient.setQueryData(KEY, saved);
      setCurrentForEmail("");
      toast({ title: "Datos actualizados" });
    } catch (error) {
      toast({ variant: "destructive", title: "No pudimos guardar", description: (error as Error).message });
    } finally { setBusy(null); }
  };

  const savePassword = async () => {
    if (pass.next !== pass.repeat) { toast({ variant: "destructive", title: "Las claves nuevas no coinciden" }); return; }
    setBusy("pass");
    try {
      await call("/api/director/me/password", "POST", { currentPassword: pass.current, newPassword: pass.next });
      setPass({ current: "", next: "", repeat: "" });
      toast({ title: "Clave actualizada", description: "Se cerraron tus otras sesiones abiertas." });
    } catch (error) {
      toast({ variant: "destructive", title: "No pudimos cambiar la clave", description: (error as Error).message });
    } finally { setBusy(null); }
  };

  const chooseProfile = async (profile: Profile) => {
    try {
      await call("/api/director/me/entry-profile", "PUT", { profile });
      queryClient.setQueryData(KEY, { ...me, entryProfile: profile });
      toast({ title: "Perfil de ingreso actualizado", description: "Aplica a todas las clínicas." });
    } catch (error) {
      toast({ variant: "destructive", title: "No pudimos guardar", description: (error as Error).message });
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2" data-testid="director-account">
      <section className="md:col-span-2 bg-white rounded-[1.75rem] shadow-sm border border-[#E8E4DE] p-6 flex flex-col gap-3" aria-label="Perfil de ingreso a las clínicas">
        <div>
          <h2 className="text-lg font-bold">Perfil de ingreso a las clínicas</h2>
          <p className="text-sm text-muted-foreground">Elige con qué perfil entras a cualquier clínica. Vale para todas hasta que lo cambies aquí, y solo se cambia desde supra-control.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Perfil de ingreso">
          {PROFILES.map((option) => {
            const selected = (me.entryProfile ?? "medico") === option.id;
            return (
              <button key={option.id} type="button" role="radio" aria-checked={selected} data-testid={`entry-profile-${option.id}`}
                onClick={() => void chooseProfile(option.id)}
                className={`text-left rounded-2xl border p-4 ${selected ? "border-primary bg-primary/5 ring-2 ring-primary" : "border-[#E8E4DE] hover:bg-[#F5F2EE]"}`}>
                <span className="block font-bold">{option.title}</span>
                <span className="block text-sm text-muted-foreground mt-1">{option.text}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-[1.75rem] shadow-sm border border-[#E8E4DE] p-6 flex flex-col gap-3" aria-label="Mis datos">
        <h2 className="text-lg font-bold">Mis datos</h2>
        <label className="text-sm font-semibold flex flex-col gap-1">Nombre
          <Input className="h-11 rounded-2xl" value={form.name} maxLength={100} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label className="text-sm font-semibold flex flex-col gap-1">Teléfono
          <Input className="h-11 rounded-2xl" value={form.phone} maxLength={30} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </label>
        <label className="text-sm font-semibold flex flex-col gap-1">Correo de acceso
          <Input className="h-11 rounded-2xl" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        {emailChanged && (
          <label className="text-sm font-semibold flex flex-col gap-1">Clave actual (para cambiar el correo)
            <PasswordInput className="h-11 rounded-2xl" autoComplete="current-password" value={currentForEmail} onChange={(event) => setCurrentForEmail(event.target.value)} />
          </label>
        )}
        <Button className="rounded-full self-start" disabled={busy !== null || (emailChanged && currentForEmail === "")} onClick={() => void saveData()} data-testid="save-director-data">
          {busy === "data" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Guardar datos
        </Button>
      </section>

      <section className="bg-white rounded-[1.75rem] shadow-sm border border-[#E8E4DE] p-6 flex flex-col gap-3" aria-label="Cambiar clave">
        <h2 className="text-lg font-bold">Cambiar clave</h2>
        <label className="text-sm font-semibold flex flex-col gap-1">Clave actual
          <PasswordInput className="h-11 rounded-2xl" autoComplete="current-password" value={pass.current} onChange={(event) => setPass({ ...pass, current: event.target.value })} />
        </label>
        <label className="text-sm font-semibold flex flex-col gap-1">Clave nueva (mínimo 8 caracteres)
          <PasswordInput className="h-11 rounded-2xl" autoComplete="new-password" value={pass.next} onChange={(event) => setPass({ ...pass, next: event.target.value })} />
        </label>
        <label className="text-sm font-semibold flex flex-col gap-1">Repite la clave nueva
          <PasswordInput className="h-11 rounded-2xl" autoComplete="new-password" value={pass.repeat} onChange={(event) => setPass({ ...pass, repeat: event.target.value })} />
        </label>
        <Button className="rounded-full self-start" disabled={busy !== null || pass.current === "" || pass.next.length < 8} onClick={() => void savePassword()} data-testid="save-director-password">
          {busy === "pass" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Cambiar clave
        </Button>
      </section>
    </div>
  );
}
