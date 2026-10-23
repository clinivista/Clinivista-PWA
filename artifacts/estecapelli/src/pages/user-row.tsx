import { useState } from "react";
import { Check, Copy, KeyRound, Loader2, Pencil, Scale, ShieldOff, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { useToast } from "@/hooks/use-toast";

export type ManagedUser = { id: string; email: string; name: string; phone?: string; role: string; active: boolean; legalRepresentative?: boolean };

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
  /** Si se entrega, aparece "Editar": nombre y (si roleEditable) rol. El correo es el identificador y no se cambia. */
  updateProfile?: (changes: { name?: string; role?: "medico" | "administrativo"; password?: string; phone?: string }) => Promise<unknown>;
  /** Permite cambiar entre Médico y Administrativo (no aplica al equipo de supra-control). */
  roleEditable?: boolean;
};

type Pending = "reset" | "block" | "delete" | "legal" | null;

// Si el servidor explica el rechazo (p. ej. "debe quedar al menos un administrativo"),
// se muestra ese motivo en vez de un error genérico.
const serverReason = (error: unknown): string | undefined =>
  (error as { data?: { error?: string } | null } | null)?.data?.error;

// Una fila de usuario con sus dos acciones sensibles. Ambas piden confirmación
// antes de ejecutarse, y la contraseña temporal vive solo en el estado de este
// componente: el servidor no la guarda ni la repite.
export function UserRow({ user, manageable = true, setActive, resetPassword, onDelete, setLegalRepresentative, isSelf = false, updateProfile, roleEditable = false }: Props) {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftPassword, setDraftPassword] = useState("");
  const [draftPhone, setDraftPhone] = useState(user.phone ?? "");
  const [draftName, setDraftName] = useState(user.name);
  const [draftRole, setDraftRole] = useState<"medico" | "administrativo">(user.role === "administrativo" ? "administrativo" : "medico");
  const canEdit = Boolean(updateProfile) && (manageable || isSelf);

  const saveProfile = async () => {
    const changes: { name?: string; role?: "medico" | "administrativo"; password?: string; phone?: string } = {};
    if (draftPassword) {
      if (draftPassword.length < 8) {
        toast({ variant: "destructive", title: "Contraseña muy corta", description: "Debe tener al menos 8 caracteres." });
        return;
      }
      changes.password = draftPassword;
    }
    if (draftName.trim() !== user.name) changes.name = draftName.trim();
    if (draftPhone.trim() !== (user.phone ?? "")) changes.phone = draftPhone.trim();
    if (roleEditable && !isSelf && draftRole !== user.role) changes.role = draftRole;
    if (Object.keys(changes).length === 0) { setEditing(false); return; }
    setBusy(true);
    try {
      await updateProfile?.(changes);
      toast({
        title: "Datos actualizados",
        description: (changes.role || (changes.password && !isSelf)) ? "Se cerró la sesión abierta de esta persona." : undefined,
      });
      setDraftPassword("");
      setEditing(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: serverReason(error) ?? "No pudimos guardar los cambios." });
    } finally {
      setBusy(false);
    }
  };

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
          {user.phone && <p className="text-sm text-muted-foreground break-all" data-testid="user-phone">Tel. {user.phone}</p>}
        </div>

        {manageable && !isSelf && confirming === null && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canEdit && !editing && (
              <Button size="sm" variant="outline" className="rounded-full font-semibold" onClick={() => { setDraftName(user.name); setDraftPhone(user.phone ?? ""); setDraftRole(user.role === "administrativo" ? "administrativo" : "medico"); setDraftPassword(""); setEditing(true); }}>
                <Pencil className="w-4 h-4 mr-2" /> Editar datos
              </Button>
            )}
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

      {isSelf && canEdit && !editing && (
        <Button size="sm" variant="outline" className="rounded-full font-semibold self-start" onClick={() => { setDraftName(user.name); setDraftPhone(user.phone ?? ""); setDraftPassword(""); setEditing(true); }}>
          <Pencil className="w-4 h-4 mr-2" /> Editar mis datos
        </Button>
      )}

      {editing && (
        <div className="rounded-xl bg-white p-3 flex flex-col gap-2" data-testid="user-edit-form">
          <label className="text-xs font-bold text-slate-600" htmlFor={`edit-name-${user.id}`}>Nombre</label>
          <Input id={`edit-name-${user.id}`} value={draftName} maxLength={100} className="h-10 rounded-full" onChange={(event) => setDraftName(event.target.value)} />
          <label className="text-xs font-bold text-slate-600" htmlFor={`edit-phone-${user.id}`}>Teléfono</label>
          <Input id={`edit-phone-${user.id}`} type="tel" value={draftPhone} maxLength={30} placeholder="+56 9 1234 5678" className="h-10 rounded-full" onChange={(event) => setDraftPhone(event.target.value)} />
          <label className="text-xs font-bold text-slate-600" htmlFor={`edit-email-${user.id}`}>Correo</label>
          <Input id={`edit-email-${user.id}`} value={user.email} readOnly disabled className="h-10 rounded-full" />
          <p className="text-xs text-muted-foreground">El correo identifica la cuenta y no se puede cambiar.</p>
          <label className="text-xs font-bold text-slate-600" htmlFor={`edit-password-${user.id}`}>Nueva contraseña (opcional)</label>
          <PasswordInput id={`edit-password-${user.id}`} autoComplete="new-password" minLength={8} placeholder="Déjala vacía para no cambiarla"
            className="h-10 rounded-full" value={draftPassword} onChange={(event) => setDraftPassword(event.target.value)} />
          <p className="text-xs text-muted-foreground">Mínimo 8 caracteres. Avisa a la persona su nueva contraseña.</p>
          {roleEditable && (
            <>
              <label className="text-xs font-bold text-slate-600" htmlFor={`edit-role-${user.id}`}>Rol</label>
              <select id={`edit-role-${user.id}`} disabled={isSelf} className="h-10 rounded-full border border-input bg-white px-4 text-sm disabled:opacity-60"
                value={draftRole} onChange={(event) => setDraftRole(event.target.value as typeof draftRole)}>
                <option value="medico">Médico</option>
                <option value="administrativo">Administrativo</option>
              </select>
              {isSelf && <p className="text-xs text-muted-foreground">No puedes cambiar tu propio rol.</p>}
            </>
          )}
          <div className="flex gap-2">
            <Button size="sm" className="rounded-full font-semibold" disabled={busy} onClick={saveProfile}>
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Guardar
            </Button>
            <Button size="sm" variant="outline" className="rounded-full font-semibold" disabled={busy} onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
        </div>
      )}

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
