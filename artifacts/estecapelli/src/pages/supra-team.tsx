import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import {
  getGetDirectorTeamQueryKey,
  useCreateDirectorTeamMember,
  useGetDirectorTeam,
  usePatchDirectorTeamMember,
  useResetDirectorTeamMemberPassword,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UserRow } from "./user-row";

// Solo para directores. Los directores aparecen en la lista pero sin acciones
// (nadie puede bloquear ni resetear a un director desde aquí); los
// administrativos de supra-control sí se pueden crear, bloquear y resetear.
export function SupraTeam() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-[1.75rem] shadow-sm border border-[#E8E4DE] p-6 mb-4 flex flex-col gap-4">
      <button
        type="button"
        className="flex items-center justify-between gap-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          <span className="block text-lg font-bold text-foreground">Equipo de supra-control</span>
          <span className="block text-sm text-muted-foreground">
            Directores y administrativos del panel: crear, bloquear y restablecer contraseñas.
          </span>
        </span>
        <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <SupraTeamBody />}
    </div>
  );
}

// Se monta solo al desplegar, así el equipo se pide al servidor únicamente cuando hace falta.
function SupraTeamBody() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useGetDirectorTeam();
  const patchMember = usePatchDirectorTeamMember();
  const resetPassword = useResetDirectorTeamMemberPassword();
  const createMember = useCreateDirectorTeamMember();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", password: "" });

  const refresh = () => queryClient.invalidateQueries({ queryKey: getGetDirectorTeamQueryKey() });

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    createMember.mutate(
      { data: { email: draft.email.trim(), name: draft.name.trim() || undefined, password: draft.password } },
      {
        onSuccess: async (created) => {
          await refresh();
          setDraft({ name: "", email: "", password: "" });
          setAdding(false);
          toast({ title: "Administrativo creado", description: `${created.email} ya puede entrar al panel.` });
        },
        onError: (error) => {
          const detail = (error as { data?: { error?: string } | null }).data?.error;
          toast({ variant: "destructive", title: "No pudimos crear la cuenta", description: detail ?? "Inténtalo de nuevo." });
        },
      },
    );
  };

  const users = data?.users ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 border-t border-[#E8E4DE]">
        <p className="text-sm text-muted-foreground">
          Los administrativos operan el panel (clínicas, pagos, suspensiones, exportación) pero no gestionan usuarios.
        </p>
        {!adding && (
          <Button className="rounded-full h-10 font-semibold self-start sm:self-auto shrink-0" onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4 mr-2" /> Agregar administrativo
          </Button>
        )}
      </div>

      {adding && (
        <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-2xl bg-[#F5F2EE] p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input
              placeholder="Nombre"
              aria-label="Nombre"
              className="h-10 rounded-full bg-white"
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              type="email"
              required
              autoComplete="off"
              placeholder="Correo"
              aria-label="Correo"
              className="h-10 rounded-full bg-white"
              value={draft.email}
              onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
            />
            <Input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Contraseña (mín. 8)"
              aria-label="Contraseña"
              className="h-10 rounded-full bg-white"
              value={draft.password}
              onChange={(event) => setDraft((prev) => ({ ...prev, password: event.target.value }))}
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-full h-10 font-semibold" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="rounded-full h-10 font-semibold" disabled={createMember.isPending}>
              {createMember.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Crear administrativo
            </Button>
          </div>
        </form>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando equipo…
        </div>
      )}
      {isError && <p className="text-sm font-medium text-red-600">No pudimos cargar el equipo.</p>}

      {users.map((member) => (
        <UserRow
          key={member.id}
          user={member}
          manageable={member.role === "supra_admin"}
          setActive={async (active) => {
            await patchMember.mutateAsync({ userId: member.id, data: { active } });
            await refresh();
          }}
          resetPassword={async () => (await resetPassword.mutateAsync({ userId: member.id })).temporaryPassword}
        />
      ))}
    </div>
  );
}
