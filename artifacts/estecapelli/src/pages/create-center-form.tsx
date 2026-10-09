import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetDirectorCentersQueryKey, useCreateDirectorCenter } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { useToast } from "@/hooks/use-toast";

type AccountDraft = { email: string; name: string; password: string };
const EMPTY_ACCOUNT: AccountDraft = { email: "", name: "", password: "" };

const ACCOUNT_ROLES = [
  { role: "medico", title: "Cuenta de médico" },
  { role: "administrativo", title: "Cuenta administrativa" },
] as const;

// Un formulario por cuenta es opcional: si el correo queda vacío, esa cuenta
// simplemente no se crea (se puede crear una clínica sin cuentas y sumarlas
// después por el script create-user).
export function CreateCenterForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createCenter = useCreateDirectorCenter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [specialty, setSpecialty] = useState<"capilar" | "plastica">("capilar");
  const [withSamplePatients, setWithSamplePatients] = useState(false);
  const [accounts, setAccounts] = useState<Record<string, AccountDraft>>({
    medico: { ...EMPTY_ACCOUNT },
    administrativo: { ...EMPTY_ACCOUNT },
  });

  const updateAccount = (role: string, field: keyof AccountDraft, value: string) =>
    setAccounts((prev) => ({ ...prev, [role]: { ...prev[role], [field]: value } }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const users = ACCOUNT_ROLES.flatMap(({ role }) => {
      const account = accounts[role];
      return account.email.trim()
        ? [{ role, email: account.email.trim(), name: account.name.trim() || undefined, password: account.password }]
        : [];
    });
    createCenter.mutate(
      { data: { name: name.trim(), slug: slug.trim() || undefined, users, withSamplePatients, specialty } },
      {
        onSuccess: (created) => {
          queryClient.invalidateQueries({ queryKey: getGetDirectorCentersQueryKey() });
          toast({
            title: "Clínica creada",
            description: `${created.name} ya aparece en la lista${users.length ? ` con ${users.length} cuenta(s)` : ""}.`,
          });
          onClose();
        },
        onError: (error) => {
          // El cliente lanza un ApiError cuyo `data` trae el mensaje del servidor.
          const detail = (error as { data?: { error?: string } | null }).data?.error;
          toast({ variant: "destructive", title: "No pudimos crear la clínica", description: detail ?? "Inténtalo de nuevo." });
        },
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-[1.75rem] shadow-sm border border-[#E8E4DE] p-6 mb-4 flex flex-col gap-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">Crear clínica</h2>
        <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={onClose} aria-label="Cerrar formulario">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-center-name" className="text-sm font-semibold text-muted-foreground">Nombre de la clínica</label>
          <Input
            id="new-center-name"
            required
            minLength={3}
            maxLength={80}
            placeholder="Clínica Demo Capilar"
            className="h-10 rounded-full"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-center-slug" className="text-sm font-semibold text-muted-foreground">
            Identificador (opcional)
          </label>
          <Input
            id="new-center-slug"
            placeholder="se genera desde el nombre"
            autoCapitalize="none"
            className="h-10 rounded-full"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-center-specialty" className="text-sm font-semibold text-muted-foreground">Especialidad</label>
        <select
          id="new-center-specialty"
          className="h-10 rounded-full bg-[#F5F2EE] px-4 text-sm font-semibold"
          value={specialty}
          onChange={(event) => setSpecialty(event.target.value as "capilar" | "plastica")}
        >
          <option value="capilar">Capilar</option>
          <option value="plastica">Cirugía plástica</option>
        </select>
        <p className="text-xs text-muted-foreground">Define el formulario del paciente, las fotos y las fases iniciales. No se puede cambiar después.</p>
      </div>

      {ACCOUNT_ROLES.map(({ role, title }) => (
        <fieldset key={role} className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-foreground mb-1">{title} (opcional)</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input
              type="email"
              autoComplete="off"
              placeholder="Correo"
              aria-label={`${title}: correo`}
              className="h-10 rounded-full"
              value={accounts[role].email}
              onChange={(event) => updateAccount(role, "email", event.target.value)}
            />
            <Input
              placeholder="Nombre"
              aria-label={`${title}: nombre`}
              className="h-10 rounded-full"
              value={accounts[role].name}
              onChange={(event) => updateAccount(role, "name", event.target.value)}
            />
            <PasswordInput
              autoComplete="new-password"
              placeholder="Contraseña (mín. 8)"
              aria-label={`${title}: contraseña`}
              required={Boolean(accounts[role].email.trim())}
              minLength={8}
              className="h-10 rounded-full"
              value={accounts[role].password}
              onChange={(event) => updateAccount(role, "password", event.target.value)}
            />
          </div>
        </fieldset>
      ))}

      <div className="flex items-start gap-3">
        <Checkbox
          id="new-center-sample"
          className="mt-0.5"
          checked={withSamplePatients}
          onCheckedChange={(checked) => setWithSamplePatients(checked === true)}
        />
        <label htmlFor="new-center-sample" className="text-sm text-foreground">
          <span className="font-semibold">Cargar pacientes de ejemplo</span>
          <span className="block text-muted-foreground">
            4 pacientes ficticios en distintas etapas, sin fotos. Ideal para demostraciones.
          </span>
        </label>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button type="button" variant="outline" className="rounded-full h-10 font-semibold" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="rounded-full h-10 font-semibold" disabled={createCenter.isPending || name.trim().length < 3}>
          {createCenter.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          Crear clínica
        </Button>
      </div>
    </form>
  );
}
