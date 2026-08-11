import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Users, Calendar, LogOut, CheckCircle2, Link as LinkIcon, 
  Search, ChevronRight, X, Phone, Activity, AlertTriangle, Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  useGetAuthMe, getGetAuthMeQueryKey, 
  useAdminLogout,
  useGetLeadStats, getGetLeadStatsQueryKey,
  useGetLeads, getGetLeadsQueryKey,
  useGetLeadById, getGetLeadByIdQueryKey,
  usePatchLead, useCreateInvitation,
  LeadSummary
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const STATUS_LABELS: Record<string, string> = {
  nuevo: "Nuevo",
  incompleto: "Incompleto",
  listo: "Listo para revisión",
  contactar: "Contactar",
  agendado: "Agendado",
  cerrado: "Cerrado"
};

const STATUS_COLORS: Record<string, string> = {
  nuevo: "bg-blue-100 text-blue-700 border-blue-200",
  incompleto: "bg-gray-100 text-gray-600 border-gray-200",
  listo: "bg-amber-100 text-amber-700 border-amber-200",
  contactar: "bg-purple-100 text-purple-700 border-purple-200",
  agendado: "bg-primary/10 text-primary border-primary/20",
  cerrado: "bg-green-100 text-green-700 border-green-200"
};

const NORWOOD_SCALES = ["I", "II", "IIA", "III", "III-V", "IIIA", "IV", "IVA", "V", "VA", "VI", "VII", "No concluyente"];

const inviteSchema = z.object({
  name: z.string().optional(),
  phone: z.string().min(8, "Ingresa un teléfono válido")
});

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteResult, setInviteResult] = useState<{link: string, lead: LeadSummary} | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  const { data: authStatus, isLoading: isAuthLoading } = useGetAuthMe();
  const logoutMutation = useAdminLogout();
  const inviteMutation = useCreateInvitation();

  const { data: stats } = useGetLeadStats({ query: { enabled: authStatus?.authenticated, queryKey: getGetLeadStatsQueryKey() }});
  
  const leadsParams = {
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter
  };
  const { data: leadsData, isLoading: leadsLoading } = useGetLeads(leadsParams, {
    query: {
      enabled: authStatus?.authenticated,
      queryKey: getGetLeadsQueryKey(leadsParams)
    }
  });

  const { data: fullLead } = useGetLeadById(selectedLeadId || "", {
    query: {
      enabled: !!selectedLeadId,
      queryKey: getGetLeadByIdQueryKey(selectedLeadId || "")
    }
  });

  const patchMutation = usePatchLead();

  const inviteForm = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", phone: "" }
  });

  useEffect(() => {
    if (!isAuthLoading && !authStatus?.authenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthLoading, authStatus, setLocation]);

  if (isAuthLoading || !authStatus?.authenticated) return <div className="min-h-screen bg-gray-50" />;

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() });
        setLocation("/admin/login");
      }
    });
  };

  const handlePatch = (id: string, updates: any) => {
    patchMutation.mutate({ id, data: updates }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey(leadsParams) });
        queryClient.invalidateQueries({ queryKey: getGetLeadByIdQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetLeadStatsQueryKey() });
        toast({ title: "Guardado", description: "Cambios registrados correctamente." });
      }
    });
  };

  const onInviteSubmit = (data: z.infer<typeof inviteSchema>) => {
    inviteMutation.mutate({ data }, {
      onSuccess: (res) => {
        setInviteResult(res);
        queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey(leadsParams) });
        queryClient.invalidateQueries({ queryKey: getGetLeadStatsQueryKey() });
      },
      onError: () => toast({ variant: "destructive", title: "Error al crear enlace" })
    });
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar shell */}
      <aside className="w-full md:w-64 bg-foreground text-white flex-shrink-0 flex flex-col md:min-h-screen">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <Activity className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg">Estecapelli</span>
        </div>
        <div className="p-4 flex-1">
          <nav className="space-y-1">
            <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-white/10 bg-white/10">
              <Users className="w-4 h-4 mr-3" />
              Pacientes
            </Button>
            {/* Add more nav if needed */}
          </nav>
        </div>
        <div className="p-4 border-t border-white/10">
          <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/10" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-3" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative">
        {authStatus.demoPassword && (
          <div className="bg-amber-100 text-amber-800 px-4 py-2 text-sm flex items-center gap-2 justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
            Estás usando la contraseña de demostración. Configura ADMIN_PASSWORD en los secretos para asegurar el panel.
          </div>
        )}

        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 p-4 shrink-0 flex justify-between items-center">
          <h1 className="text-xl font-bold text-foreground">Gestión de Pacientes</h1>
          <Button onClick={() => { setIsInviteOpen(true); setInviteResult(null); inviteForm.reset(); }} className="gap-2">
            <LinkIcon className="w-4 h-4" />
            Nuevo Enlace
          </Button>
        </header>

        {/* Stats Strip */}
        <div className="bg-white border-b border-gray-200 p-4 shrink-0 flex gap-4 overflow-x-auto">
          <div className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-xl min-w-[140px]">
            <p className="text-xs text-muted-foreground font-medium mb-1">Total</p>
            <p className="text-2xl font-bold text-foreground">{stats?.total || 0}</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 px-4 py-3 rounded-xl min-w-[140px]">
            <p className="text-xs text-blue-700 font-medium mb-1">Nuevos</p>
            <p className="text-2xl font-bold text-blue-900">{stats?.counts?.nuevo || 0}</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 px-4 py-3 rounded-xl min-w-[140px]">
            <p className="text-xs text-amber-700 font-medium mb-1">Listos/Agenda</p>
            <p className="text-2xl font-bold text-amber-900">
              {(stats?.counts?.listo || 0) + (stats?.counts?.agendado || 0)}
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-xl min-w-[140px]">
            <p className="text-xs text-gray-500 font-medium mb-1">Por completar</p>
            <p className="text-2xl font-bold text-gray-700">{stats?.counts?.incompleto || 0}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 flex gap-4 bg-gray-50 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre o teléfono..." 
              className="pl-9 bg-white"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {leadsLoading ? (
              <div className="p-8 text-center text-muted-foreground">Cargando pacientes...</div>
            ) : leadsData?.leads.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <Users className="w-12 h-12 mb-4 text-gray-300" />
                <p>No se encontraron pacientes.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-100 text-muted-foreground font-medium">
                  <tr>
                    <th className="px-6 py-3">Paciente</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3">Fotos</th>
                    <th className="px-6 py-3">Fecha</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leadsData?.leads.map(lead => (
                    <tr 
                      key={lead.id} 
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedLeadId === lead.id ? 'bg-primary/5' : ''}`}
                      onClick={() => setSelectedLeadId(lead.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{lead.name || "Sin nombre"}</div>
                        <div className="text-muted-foreground mt-0.5">{lead.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[lead.status]}`}>
                          {STATUS_LABELS[lead.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Camera className="w-4 h-4" />
                          <span>{lead.photoCount}/5</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(parseISO(lead.createdAt), "d MMM, yyyy", { locale: es })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight className="w-4 h-4 text-gray-400 inline-block" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Details Drawer */}
        {selectedLeadId && (
          <div className="absolute inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-2xl border-l border-gray-200 flex flex-col z-20 animate-in slide-in-from-right duration-300">
            {fullLead ? (
              <>
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{fullLead.name || "Paciente"}</h2>
                    <p className="text-muted-foreground">{fullLead.phone}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedLeadId(null)}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Status controls */}
                  <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Estado</label>
                      <Select 
                        value={fullLead.status} 
                        onValueChange={v => handlePatch(fullLead.id, { status: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Norwood Scale</label>
                      <Select 
                        value={fullLead.norwood || "No concluyente"} 
                        onValueChange={v => handlePatch(fullLead.id, { norwood: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {NORWOOD_SCALES.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Actions & Appointment */}
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-3">
                      <Button 
                        className="flex-1 gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white" 
                        onClick={() => {
                          const phone = fullLead.phone.replace(/\D/g,'');
                          const msg = encodeURIComponent(`Hola ${fullLead.name || ''}, revisamos tu preevaluación. Te contactamos para coordinar el siguiente paso.`);
                          window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                        }}
                      >
                        <Phone className="w-4 h-4" />
                        Contactar por WhatsApp
                      </Button>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Fecha de Cita</label>
                      <Input 
                        type="datetime-local" 
                        defaultValue={fullLead.appointmentAt ? fullLead.appointmentAt.slice(0, 16) : ""}
                        onBlur={e => {
                          const val = e.target.value;
                          if (val && val !== (fullLead.appointmentAt?.slice(0, 16) || "")) {
                            handlePatch(fullLead.id, { appointmentAt: new Date(val).toISOString() });
                          }
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Photos */}
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-4">Registro Fotográfico ({fullLead.photos?.length || 0}/5)</h3>
                    {fullLead.photos && fullLead.photos.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {fullLead.photos.map(p => (
                          <div 
                            key={p.key} 
                            className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50 cursor-pointer hover:border-primary transition-colors"
                            onClick={() => setExpandedPhoto(p.dataUrl)}
                          >
                            <img src={p.dataUrl} alt={p.label} className="w-full h-32 object-cover" />
                            <div className="p-2 text-xs font-medium text-center border-t border-gray-200 bg-white">
                              {p.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-8 text-center text-muted-foreground">
                        El paciente aún no ha subido fotografías.
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-foreground">Datos Clínicos</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-6 text-sm">
                      <div>
                        <span className="block text-muted-foreground mb-1">Edad</span>
                        <span className="font-medium">{fullLead.age || "-"}</span>
                      </div>
                      <div>
                        <span className="block text-muted-foreground mb-1">Ciudad</span>
                        <span className="font-medium">{fullLead.city || "-"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-muted-foreground mb-1">Tiempo de pérdida</span>
                        <span className="font-medium">{fullLead.hairLossTime || "-"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-3">Notas Internas</h3>
                    <Textarea 
                      defaultValue={fullLead.notes || ""}
                      onBlur={e => {
                        if (e.target.value !== fullLead.notes) {
                          handlePatch(fullLead.id, { notes: e.target.value });
                        }
                      }}
                      className="min-h-[120px] bg-yellow-50/30"
                      placeholder="Agrega anotaciones clínicas o de seguimiento aquí..."
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">Cargando detalle...</div>
            )}
          </div>
        )}
      </main>

      {/* Expanded Photo Modal */}
      {expandedPhoto && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setExpandedPhoto(null)}>
          <button className="absolute top-4 right-4 text-white p-2 bg-black/50 rounded-full hover:bg-black/70">
            <X className="w-6 h-6" />
          </button>
          <img src={expandedPhoto} alt="Ampliación" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold">Nuevo enlace de paciente</h3>
              <button onClick={() => setIsInviteOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {!inviteResult ? (
                <Form {...inviteForm}>
                  <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
                    <FormField control={inviteForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre (opcional)</FormLabel>
                        <FormControl><Input placeholder="Ej. Juan Pérez" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={inviteForm.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono móvil *</FormLabel>
                        <FormControl><Input placeholder="+56 9 1234 5678" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full mt-2" disabled={inviteMutation.isPending}>
                      {inviteMutation.isPending ? "Generando..." : "Generar Enlace"}
                    </Button>
                  </form>
                </Form>
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">¡Enlace creado!</h4>
                    <p className="text-sm text-muted-foreground">Cópialo o envíalo por WhatsApp</p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center gap-2 text-sm break-all">
                    <span className="flex-1 text-left">{inviteResult.link}</span>
                    <Button variant="ghost" size="sm" onClick={() => {
                      navigator.clipboard.writeText(inviteResult.link);
                      toast({ title: "Copiado", description: "Enlace copiado al portapapeles" });
                    }}>Copiar</Button>
                  </div>

                  <Button 
                    className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white gap-2"
                    onClick={() => {
                      const phone = inviteResult.lead.phone.replace(/\D/g,'');
                      const msg = encodeURIComponent(`Hola ${inviteResult.lead.name || ''}, te enviamos el link para tu preevaluación capilar: ${inviteResult.link}`);
                      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                    }}
                  >
                    <Phone className="w-4 h-4" />
                    Enviar por WhatsApp
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}