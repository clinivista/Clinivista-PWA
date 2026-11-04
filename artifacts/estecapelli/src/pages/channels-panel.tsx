import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, MessageCircle, MessageSquare, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language";
import { CHANNELS_TEXT } from "@/lib/channels-i18n";

type Channel = "email" | "whatsapp";
type State = { channels: Channel[]; available: Channel[]; coming: string[]; canEdit: boolean };
const KEY = ["/api/clinic/channels"];
const ICON: Record<Channel, LucideIcon> = { email: Mail, whatsapp: MessageCircle };

// «Canales de comunicación»: con qué canales la clínica entrega resultados. El paciente elige entre los activos (sin opción
// preseleccionada). SMS queda preparado pero no se puede activar todavía.
export function ChannelsPanel() {
  const { lang } = useLanguage();
  const x = CHANNELS_TEXT[lang];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState<Channel[]>([]);
  const [saving, setSaving] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const response = await fetch("/api/clinic/channels", { credentials: "include" });
      if (!response.ok) throw new Error();
      return (await response.json()) as State;
    },
  });
  useEffect(() => { if (data) setChosen(data.channels); }, [data]);

  const label: Record<Channel, [string, string]> = { email: [x.email, x.emailD], whatsapp: [x.wa, x.waD] };
  const toggle = (channel: Channel) => setChosen((current) => (current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]));
  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/clinic/channels", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channels: chosen }) });
      if (!response.ok) throw new Error();
      await queryClient.invalidateQueries({ queryKey: KEY });
      toast({ title: x.saved });
    } catch {
      toast({ variant: "destructive", title: x.err });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (isError || !data) return <p role="alert" className="text-sm text-destructive">{x.loadErr}</p>;
  const changed = [...chosen].sort().join() !== [...data.channels].sort().join();

  return (
    <div className="flex flex-col gap-5 max-w-2xl" data-testid="channels-panel">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{x.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{x.intro}</p>
      </div>
      <div className="flex flex-col gap-3">
        {data.available.map((channel) => {
          const Icon = ICON[channel];
          const on = chosen.includes(channel);
          return (
            <label key={channel} className={`flex items-start gap-3 rounded-2xl border p-4 ${on ? "border-primary bg-primary/5" : "border-[#E8E4DE] bg-white"} ${data.canEdit ? "cursor-pointer" : "opacity-80"}`}>
              <input type="checkbox" className="mt-1 h-5 w-5" checked={on} disabled={!data.canEdit} onChange={() => toggle(channel)} data-testid={`channel-${channel}`} />
              <Icon className="w-5 h-5 mt-0.5 text-primary shrink-0" />
              <span className="flex flex-col"><span className="font-bold">{label[channel][0]}</span><span className="text-sm text-muted-foreground">{label[channel][1]}</span></span>
            </label>
          );
        })}
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-[#E8E4DE] bg-[#F5F2EE] p-4 opacity-70" data-testid="channel-sms">
          <input type="checkbox" className="mt-1 h-5 w-5" disabled checked={false} readOnly aria-label={x.sms} />
          <MessageSquare className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
          <span className="flex flex-col"><span className="font-bold">{x.sms} <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-muted-foreground">{x.soon}</span></span><span className="text-sm text-muted-foreground">{x.smsD}</span></span>
        </div>
      </div>
      {data.canEdit ? (
        <>
          {chosen.length === 0 && <p role="alert" className="text-sm text-destructive" data-testid="channels-none">{x.none}</p>}
          <p className="text-xs text-muted-foreground">{x.warn}</p>
          <Button className="rounded-xl font-bold self-start" disabled={saving || !changed || chosen.length === 0} onClick={save} data-testid="channels-save">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : x.save}
          </Button>
        </>
      ) : <p className="text-sm text-muted-foreground" data-testid="channels-readonly">{x.ro}</p>}
    </div>
  );
}
