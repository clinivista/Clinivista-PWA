import { useState } from "react";
import { Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { useGetDirectorCenterUsers, useResetDirectorCenterUserPassword } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ROLE_LABEL: Record<string, string> = { medico: "Médico", administrativo: "Administrativo" };

type ResetResult = { userId: string; email: string; password: string };

// Se monta solo cuando el director despliega "Usuarios", así la lista se pide
// al servidor únicamente cuando hace falta. La contraseña temporal vive solo
// en el estado de este componente: el servidor no la guarda ni la repite.
export function CenterUsers({ centerId }: { centerId: string }) {
  const { toast } = useToast();
  const { data, isLoading, isError } = useGetDirectorCenterUsers(centerId);
  const resetPassword = useResetDirectorCenterUserPassword();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [result, setResult] = useState<ResetResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleReset = (userId: string, email: string) => {
    resetPassword.mutate(
      { id: centerId, userId },
      {
        onSuccess: ({ temporaryPassword }) => {
          setConfirmingId(null);
          setCopied(false);
          setResult({ userId, email, password: temporaryPassword });
        },
        onError: () => {
          setConfirmingId(null);
          toast({ variant: "destructive", title: "Error", description: "No pudimos restablecer la contraseña." });
        },
      },
    );
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.password);
      setCopied(true);
    } catch {
      toast({ variant: "destructive", title: "No se pudo copiar", description: "Selecciona la contraseña y cópiala a mano." });
    }
  };

  const users = data?.users ?? [];

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-[#E8E4DE]">
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando usuarios…
        </div>
      )}
      {isError && <p className="text-sm font-medium text-red-600">No pudimos cargar los usuarios.</p>}
      {!isLoading && !isError && users.length === 0 && (
        <p className="text-sm text-muted-foreground font-medium">Esta clínica todavía no tiene usuarios.</p>
      )}

      {users.map((user) => (
        <div key={user.id} className="flex flex-col gap-3 rounded-2xl bg-[#F5F2EE] p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground truncate">{user.name || "Sin nombre"}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white text-slate-600">
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
                {!user.active && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">Desactivado</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground break-all">{user.email}</p>
            </div>

            {confirmingId === user.id ? (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  className="rounded-full font-semibold"
                  disabled={resetPassword.isPending}
                  onClick={() => handleReset(user.id, user.email)}
                >
                  {resetPassword.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Sí, restablecer
                </Button>
                <Button size="sm" variant="outline" className="rounded-full font-semibold" onClick={() => setConfirmingId(null)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full font-semibold shrink-0 self-start sm:self-auto"
                onClick={() => {
                  setResult(null);
                  setConfirmingId(user.id);
                }}
              >
                <KeyRound className="w-4 h-4 mr-2" /> Restablecer contraseña
              </Button>
            )}
          </div>

          {confirmingId === user.id && (
            <p className="text-xs text-muted-foreground">
              Se creará una contraseña temporal y se cerrará la sesión abierta de este usuario.
            </p>
          )}

          {result?.userId === user.id && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex flex-col gap-2" role="status">
              <p className="text-sm font-semibold text-emerald-800">Contraseña temporal para {result.email}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 break-all rounded-lg bg-white px-3 py-2 text-base font-mono tracking-wide select-all">
                  {result.password}
                </code>
                <Button size="sm" variant="outline" className="rounded-full shrink-0" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Copiada" : "Copiar"}
                </Button>
              </div>
              <p className="text-xs text-emerald-800">
                Cópiala ahora y entrégasela al usuario: no se puede volver a ver.
              </p>
              <Button size="sm" variant="ghost" className="rounded-full self-start" onClick={() => setResult(null)}>
                Ocultar
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
