import { useState } from "react";
import { Check, Copy, KeyRound, Loader2, ShieldOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export type ManagedUser = { id: string; email: string; name: string; role: string; active: boolean };

const ROLE_LABEL: Record<string, string> = {
  medico: "Médico",
  administrativo: "Administrativo",
  director: "Director",
  supra_admin: "Administrativo supra-control",
};

type Props = {
  user: ManagedUser;
  /** false para filas de solo lectura (p. ej. un director dentro del equipo). */
  manageable?: boolean;
  /** Bloquea (false) o desbloquea (true) el acceso de este usuario. */
  setActive: (active: boolean) => Promise<unknown>;
  /** Genera y devuelve la contraseña temporal (se muestra una sola vez). */
  resetPassword: () => Promise<string>;
};

type Pending = "reset" | "block" | null;

// Una fila de usuario con sus dos acciones sensibles. Ambas piden confirmación
// antes de ejecutarse, y la contraseña temporal vive solo en el estado de este
// componente: el servidor no la guarda ni la repite.
export function UserRow({ user, manageable = true, setActive, resetPassword }: Props) {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async (action: () => Promise<void>, errorMessage: string) => {
    setBusy(true);
    try {
      await action();
    } catch {
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };

  const confirmReset = () =>
    run(async () => {
      setCopied(false);
      setPassword(await resetPassword());
    }, "No pudimos restablecer la contraseña.");

  const confirmToggle = () =>
    run(async () => {
      await setActive(!user.active);
      toast({
        title: user.active ? "Acceso bloqueado" : "Acceso restablecido",
        description: user.active
          ? "Esta persona ya no puede entrar y su sesión abierta se cerró."
          : "Esta persona puede volver a iniciar sesión.",
      });
    }, "No pudimos cambiar el acceso de este usuario.");

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      toast({ variant: "destructive", title: "No se pudo copiar", description: "Selecciona la contraseña y cópiala a mano." });
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-[#F5F2EE] p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground truncate">{user.name || "Sin nombre"}</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white text-slate-600">
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
            {!user.active && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">Bloqueado</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground break-all">{user.email}</p>
        </div>

        {manageable && confirming === null && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full font-semibold"
              onClick={() => {
                setPassword(null);
                setConfirming("reset");
              }}
            >
              <KeyRound className="w-4 h-4 mr-2" /> Restablecer contraseña
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full font-semibold"
              onClick={() => setConfirming("block")}
            >
              {user.active ? <ShieldOff className="w-4 h-4 mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              {user.active ? "Bloquear acceso" : "Desbloquear acceso"}
            </Button>
          </div>
        )}

        {manageable && confirming !== null && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              className="rounded-full font-semibold"
              disabled={busy}
              onClick={confirming === "reset" ? confirmReset : confirmToggle}
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {confirming === "reset" ? "Sí, restablecer" : user.active ? "Sí, bloquear" : "Sí, desbloquear"}
            </Button>
            <Button size="sm" variant="outline" className="rounded-full font-semibold" disabled={busy} onClick={() => setConfirming(null)}>
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {confirming === "reset" && (
        <p className="text-xs text-muted-foreground">
          Se creará una contraseña temporal y se cerrará la sesión abierta de este usuario.
        </p>
      )}
      {confirming === "block" && (
        <p className="text-xs text-muted-foreground">
          {user.active
            ? "Esta persona no podrá iniciar sesión y se cerrará su sesión abierta. Las demás cuentas no se ven afectadas."
            : "Esta persona podrá volver a iniciar sesión con su contraseña actual."}
        </p>
      )}

      {password && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex flex-col gap-2" role="status">
          <p className="text-sm font-semibold text-emerald-800 break-all">Contraseña temporal para {user.email}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 break-all rounded-lg bg-white px-3 py-2 text-base font-mono tracking-wide select-all">
              {password}
            </code>
            <Button size="sm" variant="outline" className="rounded-full shrink-0" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copiada" : "Copiar"}
            </Button>
          </div>
          <p className="text-xs text-emerald-800">Cópiala ahora y entrégasela a la persona: no se puede volver a ver.</p>
          <Button size="sm" variant="ghost" className="rounded-full self-start" onClick={() => setPassword(null)}>
            Ocultar
          </Button>
        </div>
      )}
    </div>
  );
}
