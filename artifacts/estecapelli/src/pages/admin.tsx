import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { format, parseISO } from "date-fns";
import { es as dateFnsEs } from "date-fns/locale";
import {
  Users, LogOut, CheckCircle2, Link as LinkIcon,
  Search, ChevronRight, X, Phone, AlertTriangle, Camera, Mail, CreditCard, Trash2, ChevronDown, Check
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
  usePatchLead, useDeleteLead, useCreateInvitation,
  LeadSummary
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLanguage, LANGS, type LangCode } from "@/lib/language";
import { BrandLogo } from "@/components/brand-logo";

const STATUS_COLORS: Record<string, string> = {
  nuevo: "bg-blue-100 text-blue-700",
  incompleto: "bg-amber-100 text-amber-700",
  listo: "bg-emerald-100 text-emerald-700",
  contactar: "bg-violet-100 text-violet-700",
  agendado: "bg-indigo-100 text-indigo-700",
  cerrado: "bg-gray-100 text-gray-500"
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
  const { t, lang, setLang } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const currentLang = LANGS.find(l => l.code === lang) ?? LANGS[0];

  const STATUS_LABELS: Record<string, string> = {
    nuevo: t.statusNuevo,
    incompleto: t.statusIncompleto,
    listo: t.statusListo,
    contactar: t.statusContactar,
    agendado: t.statusAgendado,
    cerrado: t.statusCerrado,
  };

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteResult, setInviteResult] = useState<{link: string, lead: LeadSummary} | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: authStatus, isLoading: isAuthLoading } = useGetAuthMe();
  const logoutMutation = useAdminLogout();
  const deleteMutation = useDeleteLead();
  const inviteMutation = useCreateInvitation();

  const { data: stats } = useGetLeadStats({ query: { enabled: authStatus?.authenticated, queryKey: getGetLeadStatsQueryKey() }});

  const leadsParams = { search: search || undefined, status: statusFilter === "all" ? undefined : statusFilter };
  const { data: leadsData, isLoading: leadsLoading } = useGetLeads(leadsParams, {
    query: { enabled: authStatus?.authenticated, queryKey: getGetLeadsQueryKey(leadsParams) }
  });

  const selectedLeadSummary = leadsData?.leads.find(l => l.id === selectedLeadId);
  const { data: fullLead } = useGetLeadById(selectedLeadId || "", {
    query: { enabled: !!selectedLeadId, queryKey: getGetLeadByIdQueryKey(selectedLeadId || "") }
  });

  const patchMutation = usePatchLead();
  const inviteForm = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", phone: "" }
  });

  useEffect(() => {
    if (!isAuthLoading && !authStatus?.authenticated) setLocation("/admin/login");
  }, [isAuthLoading, authStatus, setLocation]);

  if (isAuthLoading || !authStatus?.authenticated) return <div className="min-h-[100dvh] bg-[#F5F2EE]" />;

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() }); setLocation("/"); }
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        setSelectedLeadId(null); setDeleteConfirmId(null);
        queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey(leadsParams) });
        queryClient.invalidateQueries({ queryKey: getGetLeadStatsQueryKey() });
        toast({ title: t.deletedTitle, description: t.deletedDesc });
      },
      onError: () => toast({ variant: "destructive", title: "Error", description: t.deleteError })
    });
  };

  const handlePatch = (id: string, updates: any) => {
    patchMutation.mutate({ id, data: updates }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey(leadsParams) });
        queryClient.invalidateQueries({ queryKey: getGetLeadByIdQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetLeadStatsQueryKey() });
        toast({ title: t.adminSaved, description: t.adminSavedDesc });
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
      onError: () => toast({ variant: "destructive", title: t.adminLinkError })
    });
  };

  return (
    <div className="min-h-[100dvh] bg-[#F5F2EE] flex flex-col md:flex-row font-sans selection:bg-primary/20">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-[#0B1F33] text-white flex-shrink-0 flex flex-col md:min-h-[100dvh] shadow-2xl relative z-30 md:rounded-r-[2.5rem]">
        <div className="p-7 flex items-center gap-3 border-b border-white/10">
          <Link href="/">
            <div className="flex items-center cursor-pointer group">
              <BrandLogo
                className="h-12 w-12 rounded-full group-hover:scale-105 transition-transform"
                imageClassName="scale-[1.65] -translate-y-[10%]"
              />
            </div>
          </Link>
        </div>

        <div className="p-6 flex-1">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">{t.adminSection}</p>
          <nav className="space-y-2">
            <Button variant="ghost" className="w-full justify-start text-white bg-white/10 hover:bg-white/20 hover:text-white font-medium rounded-2xl h-12">
              <Users className="w-5 h-5 mr-3" />
              {t.adminPatients}
            </Button>
          </nav>

          {/* Language selector */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Idioma</p>
            <div className="relative">
              <button
                onClick={() => setLangOpen(v => !v)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm font-medium transition-colors"
              >
                <span className="text-base">{currentLang.flag}</span>
                <span className="flex-1 text-left">{currentLang.name}</span>
                <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${langOpen ? "rotate-180" : ""}`} />
              </button>
              {langOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#0f2744] rounded-2xl shadow-xl border border-white/10 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 max-h-56 overflow-y-auto">
                  {LANGS.map(l => (
                    <button key={l.code} onClick={() => { setLang(l.code as LangCode); setLangOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-white/10 text-left transition-colors ${lang === l.code ? "text-primary font-semibold" : "text-white/80"}`}>
                      <span>{l.flag}</span>
                      <span>{l.name}</span>
                      {lang === l.code && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/10">
          <Button variant="ghost" className="w-full justify-start text-white/50 hover:text-white hover:bg-white/5 font-medium rounded-2xl h-12 transition-colors" onClick={handleLogout}>
            <LogOut className="w-5 h-5 mr-3" />
            {t.logout}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative">
        {authStatus.demoPassword && (
          <div className="bg-amber-50 text-amber-800 px-4 py-3 text-sm font-semibold flex items-center gap-2 justify-center shrink-0 border-b border-amber-200">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {t.adminDemoWarning}
          </div>
        )}

        {/* Topbar */}
        <header className="bg-white border-b border-[#E8E4DE] p-6 md:px-10 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 z-20">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{t.adminDashTitle}</h1>
            <p className="text-sm text-muted-foreground font-medium mt-1">{t.adminDashSub}</p>
          </div>
          <Button
            onClick={() => { setIsInviteOpen(true); setInviteResult(null); inviteForm.reset(); }}
            className="gap-2 h-12 px-6 rounded-full font-bold shadow-lg shadow-primary/20 shrink-0"
          >
            <LinkIcon className="w-4 h-4" />
            {t.adminNewLink}
          </Button>
        </header>

        {/* Stats Strip — floating cards on bg */}
        <div className="px-6 md:px-10 py-6 shrink-0 grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#F5F2EE]">
          <div className="bg-white p-5 rounded-[1.5rem] shadow-sm hover:-translate-y-0.5 transition-transform">
            <p className="text-xs text-muted-foreground font-bold mb-2 uppercase tracking-wider">{t.adminTotal}</p>
            <p className="text-3xl font-extrabold text-foreground">{stats?.total || 0}</p>
          </div>
          <div className="bg-white p-5 rounded-[1.5rem] shadow-sm ring-1 ring-blue-100 hover:-translate-y-0.5 transition-transform">
            <p className="text-xs text-blue-500 font-bold mb-2 uppercase tracking-wider">{t.adminNew}</p>
            <p className="text-3xl font-extrabold text-blue-700">{stats?.counts?.nuevo || 0}</p>
          </div>
          <div className="bg-white p-5 rounded-[1.5rem] shadow-sm ring-1 ring-emerald-100 hover:-translate-y-0.5 transition-transform">
            <p className="text-xs text-emerald-500 font-bold mb-2 uppercase tracking-wider">{t.adminReady}</p>
            <p className="text-3xl font-extrabold text-emerald-700">
              {(stats?.counts?.listo || 0) + (stats?.counts?.agendado || 0)}
            </p>
          </div>
          <div className="bg-white p-5 rounded-[1.5rem] shadow-sm ring-1 ring-amber-100 hover:-translate-y-0.5 transition-transform">
            <p className="text-xs text-amber-500 font-bold mb-2 uppercase tracking-wider">{t.adminPending}</p>
            <p className="text-3xl font-extrabold text-amber-700">{stats?.counts?.incompleto || 0}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 md:px-10 pb-4 flex gap-3 bg-[#F5F2EE] shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-5 h-5 absolute left-4 top-3.5 text-muted-foreground" />
            <Input
              placeholder={t.adminSearchPlaceholder}
              className="pl-12 h-12 bg-white border-[#E8E4DE] rounded-2xl text-base shadow-sm focus:border-primary"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px] h-12 bg-white border-[#E8E4DE] rounded-2xl font-medium shadow-sm">
              <SelectValue placeholder={t.adminAllStatuses} />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">{t.adminAllStatuses}</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Patient List */}
        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10 bg-[#F5F2EE]">
          <div className="bg-white rounded-[1.75rem] overflow-hidden shadow-sm">
            {leadsLoading ? (
              <div className="p-16 text-center text-muted-foreground font-medium">{t.adminLoading}</div>
            ) : leadsData?.leads.length === 0 ? (
              <div className="p-20 text-center text-muted-foreground flex flex-col items-center">
                <div className="w-20 h-20 bg-[#F5F2EE] rounded-full flex items-center justify-center mb-6">
                  <Users className="w-10 h-10 text-gray-300" />
                </div>
                <p className="text-lg font-medium">{t.adminEmpty}</p>
                <p className="text-sm">{t.adminEmptySub}</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F5F2EE] text-muted-foreground font-bold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4">{t.adminColPatient}</th>
                    <th className="px-6 py-4">{t.adminColStatus}</th>
                    <th className="px-6 py-4">{t.adminColPhotos}</th>
                    <th className="px-6 py-4">{t.adminColDate}</th>
                    <th className="px-6 py-4 text-right">{t.adminColAction}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F2EE]">
                  {leadsData?.leads.map(lead => (
                    <tr
                      key={lead.id}
                      className={`hover:bg-primary/4 cursor-pointer transition-colors group ${selectedLeadId === lead.id ? 'bg-primary/5' : ''}`}
                      onClick={() => setSelectedLeadId(lead.id)}
                    >
                      <td className="px-6 py-5">
                        <div className="font-bold text-foreground text-base mb-0.5">{lead.name || "—"}</div>
                        <div className="text-muted-foreground font-medium text-sm">{lead.phone}</div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${STATUS_COLORS[lead.status]}`}>
                          {STATUS_LABELS[lead.status]}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className={`flex items-center gap-2 font-bold ${lead.photoCount === 5 ? 'text-primary' : 'text-muted-foreground'}`}>
                          <Camera className="w-4 h-4" />
                          <span>{lead.photoCount}/5</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-muted-foreground font-medium">
                        {format(parseISO(lead.createdAt), "d MMM, yyyy", { locale: dateFnsEs })}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="w-8 h-8 rounded-full bg-[#F5F2EE] flex items-center justify-center ml-auto group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </div>
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
          <>
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40 animate-in fade-in" onClick={() => setSelectedLeadId(null)} />
            <div className="absolute inset-y-0 right-0 w-full md:w-[680px] bg-[#F5F2EE] shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300 md:rounded-l-[2.5rem] overflow-hidden">
              {fullLead ? (
                <>
                  <div className="p-6 md:p-8 flex items-center justify-between bg-white shrink-0">
                    <div>
                      <h2 className="text-2xl font-extrabold text-foreground tracking-tight">{fullLead.name || "Paciente"}</h2>
                      <p className="text-muted-foreground font-medium mt-1">{fullLead.phone}</p>
                    </div>
                    <button onClick={() => setSelectedLeadId(null)} className="w-10 h-10 hover:bg-[#F5F2EE] rounded-full flex items-center justify-center transition-colors">
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="shrink-0 px-6 md:px-8 py-3 bg-white border-t border-[#E8E4DE] flex justify-end">
                    <Button
                      variant="ghost"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2 font-semibold rounded-full h-10"
                      onClick={() => setDeleteConfirmId(fullLead.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                      {t.deleteRecord}
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-5">
                    {/* Status & Actions */}
                    <div className="bg-white p-6 rounded-[1.75rem] shadow-sm space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 block">{t.adminStatusPatient}</label>
                          <Select value={fullLead.status} onValueChange={v => handlePatch(fullLead.id, { status: v })}>
                            <SelectTrigger className="h-12 rounded-2xl text-base font-semibold border-[#E8E4DE]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 block">{t.adminAppDate}</label>
                          <Input
                            type="datetime-local"
                            defaultValue={fullLead.appointmentAt ? fullLead.appointmentAt.slice(0, 16) : ""}
                            onBlur={e => {
                              const val = e.target.value;
                              if (val && val !== (fullLead.appointmentAt?.slice(0, 16) || "")) {
                                handlePatch(fullLead.id, { appointmentAt: new Date(val).toISOString() });
                              }
                            }}
                            className="h-12 rounded-2xl font-medium border-[#E8E4DE] text-base bg-[#F5F2EE]"
                          />
                        </div>
                      </div>

                      <Button
                        className="w-full h-14 gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg shadow-[#25D366]/20 font-bold text-base rounded-full transition-all hover:scale-[1.01]"
                        onClick={() => {
                          const phone = fullLead.phone.replace(/\D/g, '');
                          const msg = encodeURIComponent(t.adminWAMessage.replace("{name}", fullLead.name || ''));
                          window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                        }}
                      >
                        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.885-.653-1.48-1.459-1.653-1.756-.173-.298-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                        {t.adminContactWA}
                      </Button>
                    </div>

                    {/* Photos */}
                    <div className="bg-white p-6 rounded-[1.75rem] shadow-sm">
                      <h3 className="text-lg font-extrabold text-foreground mb-5">{t.adminPhotoReg} ({fullLead.photos?.length || 0}/5)</h3>
                      {fullLead.photos && fullLead.photos.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {fullLead.photos.map(p => {
                            const photoUrl = `/api/leads/${encodeURIComponent(fullLead.id)}/photos/${encodeURIComponent(p.id)}`;
                            return (
                            <div
                              key={p.id}
                              className="rounded-2xl overflow-hidden bg-[#F5F2EE] cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all shadow-sm"
                              onClick={() => setExpandedPhoto(photoUrl)}
                            >
                              <img src={photoUrl} alt={p.label} className="w-full h-40 object-cover" />
                              <div className="p-3 text-xs font-bold text-center text-muted-foreground">{p.label}</div>
                            </div>
                          ); })}
                        </div>
                      ) : (
                        <div className="bg-[#F5F2EE] rounded-2xl p-10 text-center text-muted-foreground flex flex-col items-center">
                          <Camera className="w-10 h-10 mb-4 text-gray-300" />
                          <p className="font-medium">{t.adminNoPhotos}</p>
                        </div>
                      )}
                    </div>

                    {/* Patient history */}
                    <div className="bg-white p-6 md:p-8 rounded-[1.75rem] shadow-sm">
                      <h3 className="text-lg font-extrabold text-foreground mb-5">{t.adminPatientHistory}</h3>
                      <div className="grid grid-cols-2 gap-3 text-base">
                        {selectedLeadSummary?.documentId && (
                          <div className="col-span-2 flex items-start gap-3 bg-[#F5F2EE] rounded-2xl p-4">
                            <CreditCard className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <span className="block text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">{t.adminDocId}</span>
                              <span className="font-semibold break-all">{selectedLeadSummary.documentId}</span>
                            </div>
                          </div>
                        )}
                        {selectedLeadSummary?.email && (
                          <div className="col-span-2 flex items-start gap-3 bg-[#F5F2EE] rounded-2xl p-4">
                            <Mail className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <span className="block text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">{t.adminEmail}</span>
                              <a href={`mailto:${selectedLeadSummary.email}`} className="font-semibold text-primary hover:underline break-all" onClick={e => e.stopPropagation()}>
                                {selectedLeadSummary.email}
                              </a>
                            </div>
                          </div>
                        )}
                        {[
                          { label: t.adminAge, value: fullLead.age },
                          { label: t.adminCity, value: fullLead.city },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-[#F5F2EE] rounded-2xl p-4">
                            <span className="block text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">{label}</span>
                            <span className="font-semibold">{value || "—"}</span>
                          </div>
                        ))}
                        {[
                          { label: t.adminHairLossTime, value: fullLead.hairLossTime },
                          { label: t.adminZone, value: fullLead.pattern },
                          { label: t.adminPrevTreatment, value: fullLead.previousTreatment },
                        ].map(({ label, value }) => (
                          <div key={label} className="col-span-2 bg-[#F5F2EE] rounded-2xl p-4">
                            <span className="block text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">{label}</span>
                            <span className="font-semibold">{value || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Clinical Notes */}
                    <div className="bg-white p-6 md:p-8 rounded-[1.75rem] shadow-sm">
                      <h3 className="text-lg font-extrabold text-foreground mb-5 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                        </div>
                        {t.adminClinicalNotes}
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 block">{t.adminNorwood}</label>
                          <Select value={fullLead.norwood || "No concluyente"} onValueChange={v => handlePatch(fullLead.id, { norwood: v })}>
                            <SelectTrigger className="h-12 bg-[#F5F2EE] rounded-2xl font-semibold border-[#E8E4DE]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {NORWOOD_SCALES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 block">{t.adminNotesLabel}</label>
                          <Textarea
                            defaultValue={fullLead.notes || ""}
                            onBlur={e => {
                              if (e.target.value !== fullLead.notes) handlePatch(fullLead.id, { notes: e.target.value });
                            }}
                            className="min-h-[140px] bg-[#F5F2EE] border-[#E8E4DE] rounded-2xl text-base p-4 focus:ring-primary/20"
                            placeholder={t.adminNotesPlaceholder}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground font-medium">
                  <BrandLogo
                    className="h-12 w-12 mb-4 rounded-full animate-pulse"
                    imageClassName="scale-[1.65] -translate-y-[10%]"
                  />
                  {t.adminLoadingLead}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-8 animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-xl font-extrabold text-foreground text-center mb-3">{t.deleteTitle}</h3>
            <p className="text-muted-foreground text-center text-sm mb-8 leading-relaxed">
              {t.deleteDesc.split(t.deletePermanent).map((part, i, arr) => (
                i < arr.length - 1 ? <span key={i}>{part}<strong>{t.deletePermanent}</strong></span> : <span key={i}>{part}</span>
              ))}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 rounded-full font-semibold border-[#E8E4DE]" onClick={() => setDeleteConfirmId(null)} disabled={deleteMutation.isPending}>
                {t.cancel}
              </Button>
              <Button
                className="flex-1 h-12 rounded-full font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? t.deleting : t.deleteCTA}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Photo Modal */}
      {expandedPhoto && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setExpandedPhoto(null)}>
          <button className="absolute top-6 right-6 text-white p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-6 h-6" />
          </button>
          <img src={expandedPhoto} alt="" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
        </div>
      )}

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-8 border-b border-[#E8E4DE] flex justify-between items-center bg-[#F5F2EE]">
              <h3 className="text-xl font-extrabold text-foreground">{t.adminInviteTitle}</h3>
              <button onClick={() => setIsInviteOpen(false)} className="w-10 h-10 hover:bg-[#E8E4DE] rounded-full flex items-center justify-center transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 md:p-8">
              {!inviteResult ? (
                <Form {...inviteForm}>
                  <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-5">
                    <FormField control={inviteForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-foreground">{t.adminInviteNameLabel}</FormLabel>
                        <FormControl><Input placeholder="Ej. Juan Pérez" className="h-12 rounded-2xl text-base bg-[#F5F2EE] border-[#E8E4DE] focus:bg-white" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={inviteForm.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-foreground">{t.adminInvitePhoneLabel}</FormLabel>
                        <FormControl><Input placeholder="+56 9 1234 5678" className="h-12 rounded-2xl text-base bg-[#F5F2EE] border-[#E8E4DE] focus:bg-white" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full h-14 rounded-full text-base font-bold shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all mt-2" disabled={inviteMutation.isPending}>
                      {inviteMutation.isPending ? t.adminInviteGenerating : t.adminInviteGenCTA}
                    </Button>
                  </form>
                </Form>
              ) : (
                <div className="text-center space-y-6 animate-in fade-in">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto relative">
                    <div className="absolute inset-0 bg-emerald-100 animate-ping rounded-full opacity-20" />
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 relative z-10" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-2xl mb-2 text-foreground">{t.adminInviteCreated}</h4>
                    <p className="text-base text-muted-foreground font-medium">{t.adminInviteCreatedSub}</p>
                  </div>
                  <div className="bg-[#F5F2EE] p-4 rounded-2xl flex items-center gap-3 text-sm break-all">
                    <span className="flex-1 text-left font-medium text-foreground">{inviteResult.link}</span>
                    <Button variant="outline" className="h-10 rounded-full font-bold border-[#E8E4DE] shrink-0 bg-white" onClick={() => {
                      navigator.clipboard.writeText(inviteResult.link);
                      toast({ title: t.copied, description: "Enlace copiado al portapapeles" });
                    }}>{t.copy}</Button>
                  </div>
                  <Button
                    className="w-full h-14 bg-[#25D366] hover:bg-[#128C7E] text-white gap-2 rounded-full font-bold text-base shadow-lg shadow-[#25D366]/20 transition-all hover:scale-[1.01]"
                    onClick={() => {
                      const phone = inviteResult.lead.phone.replace(/\D/g, '');
                      const msg = encodeURIComponent(`Hola ${inviteResult.lead.name || ''}, te enviamos el link seguro para tu preevaluación capilar: ${inviteResult.link}`);
                      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                    }}
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.885-.653-1.48-1.459-1.653-1.756-.173-.298-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                    {t.adminInviteSendWA}
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
