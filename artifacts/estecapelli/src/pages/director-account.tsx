import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { useToast } from "@/hooks/use-toast";

type Me = { id: string; email: string; name: string; phone: string };
const KEY = ["director-me"];

async function call<T>(url: string, method: "GET" | "PATCH" | "POST", body?: unknown): Promise<T> {
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

  return (
    <div className="grid gap-6 md:grid-cols-2" data-testid="director-account">
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
