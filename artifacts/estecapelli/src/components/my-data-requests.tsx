import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/language";
import { DATA_RIGHTS_TEXT, MY_REQUESTS_TEXT } from "@/lib/data-rights-i18n";

type Item = { id: string; type: keyof (typeof DATA_RIGHTS_TEXT)["es"]["types"]; status: "pending" | "in_progress" | "resolved" | "rejected"; createdAt: string; dueAt: string; resolutionNote: string };

// «Mis solicitudes»: el paciente ve qué pidió, en qué estado está y hasta cuándo la clínica debe responder.
export function MyDataRequests({ token }: { token: string }) {
  const { lang } = useLanguage();
  const x = MY_REQUESTS_TEXT[lang];
  const types = DATA_RIGHTS_TEXT[lang].types;
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(false);

  const [reload, setReload] = useState(0);
  useEffect(() => {
    const again = () => setReload((n) => n + 1);
    window.addEventListener("clinivista:data-request-sent", again);
    return () => window.removeEventListener("clinivista:data-request-sent", again);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch(`/api/patients/${encodeURIComponent(token)}/data-requests`)
      .then(async (response) => {
        if (!response.ok) throw new Error("load");
        const body = (await response.json()) as { requests: Item[] };
        if (alive) setItems(body.requests);
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [token, reload]);

  const date = (iso: string) => new Date(iso).toLocaleDateString(lang, { dateStyle: "long" });
  const open = (status: Item["status"]) => status === "pending" || status === "in_progress";

  return (
    <div className="rounded-xl bg-[#F5F2EE] p-3 text-xs flex flex-col gap-2" data-testid="my-data-requests">
      <p className="font-bold text-foreground">{x.title}</p>
      {failed && <p role="alert" className="text-destructive">{x.loadError}</p>}
      {!failed && items !== null && items.length === 0 && <p className="text-muted-foreground">{x.empty}</p>}
      {items?.map((item) => {
        const overdue = open(item.status) && new Date(item.dueAt).getTime() < Date.now();
        return (
          <div key={item.id} className="rounded-lg bg-white p-2.5 flex flex-col gap-0.5" data-testid="my-data-request">
            <p className="font-semibold text-foreground">{types[item.type] ?? item.type}</p>
            <p className="text-muted-foreground">{x.statuses[item.status]}{open(item.status) && ` · ${overdue ? x.overdue(date(item.dueAt)) : x.due(date(item.dueAt))}`}</p>
            {item.resolutionNote && <p className="text-muted-foreground"><span className="font-semibold">{x.note}:</span> {item.resolutionNote}</p>}
          </div>
        );
      })}
    </div>
  );
}
