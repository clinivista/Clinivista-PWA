import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/language";
import { DATA_RIGHTS_TEXT } from "@/lib/data-rights-i18n";

const TYPES = ["access", "rectification", "erasure", "opposition", "portability", "blocking"] as const;

// «Mis datos y derechos»: el paciente pide acceso, rectificación, eliminación, oposición, portabilidad o bloqueo.
// La clínica ve la solicitud en su panel y tiene 30 días corridos para responder.
export function DataRightsDialog({ token }: { token: string }) {
  const { lang } = useLanguage();
  const x = DATA_RIGHTS_TEXT[lang];
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof TYPES)[number]>("access");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "toomany">("idle");
  const [due, setDue] = useState("");

  const send = async () => {
    setState("sending");
    try {
      const response = await fetch(`/api/patients/${encodeURIComponent(token)}/data-requests`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, message }),
      });
      if (response.status === 429) { setState("toomany"); return; }
      const body = (await response.json().catch(() => null)) as { dueAt?: string } | null;
      if (!response.ok || !body?.dueAt) { setState("error"); return; }
      setDue(new Date(body.dueAt).toLocaleDateString(lang, { dateStyle: "long" }));
      setState("sent");
    } catch {
      setState("error");
    }
  };

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) { setState("idle"); setMessage(""); setType("access"); }
  };

  return (
    <>
      <Button type="button" variant="ghost" className="w-full h-11 rounded-full text-sm text-muted-foreground" onClick={() => setOpen(true)} data-testid="data-rights-open">
        <ShieldCheck className="w-4 h-4 me-2" />{x.button}
      </Button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="rounded-3xl max-w-md" dir={lang === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{x.title}</DialogTitle>
            <DialogDescription>{state === "sent" ? x.sentDesc : x.intro}</DialogDescription>
          </DialogHeader>
          {state === "sent" ? (
            <div className="flex flex-col gap-4">
              <p className="font-semibold" data-testid="data-rights-sent">{x.sentTitle(due)}</p>
              <Button type="button" onClick={() => close(false)} className="rounded-full">{x.cancel}</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-semibold mb-1">{x.type}</legend>
                {TYPES.map((item) => (
                  <label key={item} className="flex items-start gap-2 text-sm cursor-pointer">
                    <input type="radio" name="data-right" value={item} checked={type === item} onChange={() => setType(item)} className="mt-1" />
                    <span>{x.types[item]}</span>
                  </label>
                ))}
              </fieldset>
              <label className="text-sm font-semibold" htmlFor="data-right-message">{x.message}</label>
              <Textarea id="data-right-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder={x.messagePlaceholder} maxLength={1000} />
              {state === "error" && <p role="alert" className="text-sm text-destructive">{x.error}</p>}
              {state === "toomany" && <p role="alert" className="text-sm text-destructive">{x.tooMany}</p>}
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => close(false)} className="rounded-full">{x.cancel}</Button>
                <Button type="button" onClick={send} disabled={state === "sending"} className="rounded-full" data-testid="data-rights-send">{state === "sending" ? x.sending : x.send}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
