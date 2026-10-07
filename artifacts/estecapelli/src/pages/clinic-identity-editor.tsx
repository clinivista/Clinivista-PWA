import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import {
  getGetDirectorCentersQueryKey,
  useUpdateDirectorCenterIdentity,
  type DirectorCenterSummary,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ClinicBadge } from "@/components/clinic-badge";

const MAX_SIDE = 256;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

// Reduce el logo en el navegador antes de subirlo (máx. 256 px, PNG). El
// servidor lo vuelve a validar y recodificar igual, pero así el envío es
// liviano aunque el archivo original sea una foto grande.
async function resizeLogo(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas unavailable");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/png");
}

export function ClinicIdentityEditor({ center, onClose }: { center: DirectorCenterSummary; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const update = useUpdateDirectorCenterIdentity();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(center.name);
  // undefined = dejar el logo actual, null = quitarlo, string = reemplazarlo.
  const [logo, setLogo] = useState<string | null | undefined>(undefined);
  const shownLogo = logo === undefined ? center.logoDataUrl : logo;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ variant: "destructive", title: "Formato no válido", description: "Sube una imagen PNG, JPG o WebP." });
      return;
    }
    try {
      setLogo(await resizeLogo(file));
    } catch {
      toast({ variant: "destructive", title: "No pudimos leer esa imagen", description: "Prueba con otro archivo." });
    }
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    update.mutate(
      { id: center.id, data: { name: name.trim(), ...(logo !== undefined ? { logoDataUrl: logo } : {}) } },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: getGetDirectorCentersQueryKey() });
          toast({ title: "Identidad actualizada", description: "Los pacientes ya verán este nombre y logo." });
          onClose();
        },
        onError: (error) => {
          const detail = (error as { data?: { error?: string } | null }).data?.error;
          toast({ variant: "destructive", title: "No pudimos guardar", description: detail ?? "Inténtalo de nuevo." });
        },
      },
    );
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4 pt-4 border-t border-[#E8E4DE]">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`identity-name-${center.id}`} className="text-sm font-semibold text-muted-foreground">
          Nombre que ven los pacientes
        </label>
        <Input
          id={`identity-name-${center.id}`}
          required
          minLength={3}
          maxLength={80}
          className="h-10 rounded-full"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-muted-foreground">Logo</span>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="rounded-2xl bg-[#F5F2EE] p-3 min-w-0">
            <ClinicBadge name={name.trim() || center.name} logoDataUrl={shownLogo} />
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={(event) => {
                void handleFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <Button type="button" variant="outline" size="sm" className="rounded-full font-semibold" onClick={() => fileInput.current?.click()}>
              <ImagePlus className="w-4 h-4 mr-2" /> {shownLogo ? "Cambiar logo" : "Subir logo"}
            </Button>
            {shownLogo && (
              <Button type="button" variant="ghost" size="sm" className="rounded-full font-semibold" onClick={() => setLogo(null)}>
                <Trash2 className="w-4 h-4 mr-2" /> Quitar logo
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">PNG, JPG o WebP. Se ajusta solo a 256 px; funciona mejor un logo cuadrado.</p>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button type="button" variant="outline" className="rounded-full h-10 font-semibold" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="rounded-full h-10 font-semibold" disabled={update.isPending || name.trim().length < 3}>
          {update.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Guardar identidad
        </Button>
      </div>
    </form>
  );
}
