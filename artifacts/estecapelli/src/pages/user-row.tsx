import { useState } from "react";
import { Check, Copy, KeyRound, Loader2, Scale, ShieldOff, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export type ManagedUser = { id: string; email: string; name: string; role: string; active: boolean; legalRepresentative?: boolean };

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
  /** Si se entrega, aparece "Eliminar" (borrado definitivo, con confirmación). */
  onDelete?: () => Promise<unknown>;
  /** Si se entrega, aparece el botón para marcar/quitar al representante legal. */
  setLegalRepresentative?: (value: boolean) => Promise<unknown>;
  /** La fila de quien está usando el panel: se muestra "Tú" y sin acciones. */
  isSelf?: boolean;
};

type Pending = "reset" | "block" | "delete" | "legal" | null;

// Si el servidor explica el rechazo (p. ej. "debe quedar al menos un administrativo"),
// se muestra ese motivo en vez de un error genérico.
const serverReason = (error: unknown): string | undefined =>
  (error as { data?: { error?: string } | null } | null)?.data?.error;

// Una fila de usuario con sus dos acciones sensibles. Ambas piden confirmación
// antes de ejecutarse, y la contraseña temporal vive solo en el estado de este
// componente: el servidor no la guarda ni la repite.
export function UserRow({ user, manageable = true, setActive, resetPassword, onDelete, setLegalRepresentative, isSelf = false }: Props) {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async (action: () => Promise<void>, errorMessage: string) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: serverReason(error) ?? errorMessage });
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

  const confirmDelete = () =>
    run(async () => {
      await onDelete?.();
      toast({ title: "Usuario eliminado", description: `${user.email} ya no existe en esta clínica.` });
    }, "No pudimos eliminar a este usuario.");

  const confirmLegal = () =>
    run(async () => {
      await setLegalRepresentative?.(!user.legalRepresentative);
      toast({
        title: user.legalRepresentative ? "Ya no es representante legal" : "Representante legal asignado",
        description: user.legalRepresentative
          ? "Conserva su cuenta; solo pierde la gestión de usuarios si no es administrativo."
          : "Puede gestionar los usuarios de esta clínica.",
      });
    }, "No pudimos cambiar el representante legal.");

  const confirmActions: Record<Exclude<Pending, null>, () => Promise<void>> = {
    reset: confirmReset,
    block: confirmToggle,
    delete: confirmDelete,
    legal: confirmLegal,
  };

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
      {/* Con cuatro acciones (panel de clínica) los botones van debajo para no apretar el nombre. */}
      <div className={`flex flex-col gap-3 ${onDelete || setLegalRepresentative ? "" : "sm:flex-row sm:items-center"}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground truncate">{user.name || "Sin nombre"}</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white text-slate-600">
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
            {user.legalRepresentative && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">Representante legal</span>
            )}
            {isSelf && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">Tú</span>
            )}
            {!user.active && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">Bloqueado</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground break-all">{user.email}</p>
        </div>

        {manageable && !isSelf && confirming === null && (
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
            {setLegalRepresentative && (
              <Button size="sm" variant="outline" className="rounded-full font-semibold" onClick={() => setConfirming("legal")}>
                <Scale className="w-4 h-4 mr-2" />
                {user.legalRepresentative ? "Quitar representante legal" : "Hacer representante legal"}
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full font-semibold text-red-700 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={() => setConfirming("delete")}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Eliminar
              </Button>
            )}
          </div>
        )}

        {manageable && !isSelf && confirming !== null && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              className="rounded-full font-semibold"
              disabled={busy}
              onClick={confirmActions[confirming]}
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {confirming === "reset" ? "Sí, restablecer"
                : confirming === "delete" ? "Sí, eliminar"
                : confirming === "legal" ? "Sí, confirmar"
                : user.active ? "Sí, bloquear" : "Sí, desbloquear"}
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
      {confirming === "delete" && (
        <p className="text-xs font-medium text-red-700">
          Se eliminará la cuenta de {user.email} para siempre y se cerrará su sesión. No se puede deshacer; si solo quieres quitarle el acceso, usa Bloquear.
        </p>
      )}
      {confirming === "legal" && (
        <p className="text-xs text-muted-foreground">
          {user.legalRepresentative
            ? "Dejará de ser representante legal. Si es médico, perderá el acceso a la gestión de usuarios."
            : "El representante legal puede gestionar los usuarios de esta clínica, aunque sea médico."}
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
