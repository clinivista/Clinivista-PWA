import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { format, parseISO } from "date-fns";
import { es as dateFnsEs } from "date-fns/locale";
import {
  Users, UserCog, Layers, LogOut,
  Search, ChevronRight, X, Phone, Camera, Mail, CreditCard, Trash2, ChevronDown, Check, Menu, Copy,
  ClipboardList, LifeBuoy, UserPlus, Building2, Home,
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
  useGetMyClinic, getGetMyClinicQueryKey,
  useGetLeadById, getGetLeadByIdQueryKey,
  usePatchLead, useDeleteLead, useGetClinicProtocol, getGetClinicProtocolQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DirectionProvider } from "@radix-ui/react-direction";
import { useLanguage, LANGS, type LangCode } from "@/lib/language";
import { BrandLogo } from "@/components/brand-logo";
import { buildPublicPatientLink, copyToClipboard } from "@/lib/clipboard";
import { DirectorPanel } from "./director-panel";
import { ClinicUsersPanel } from "./clinic-users-panel";
import { DOCS_TRANSCRIBED } from "@/lib/transcription-i18n";
import { PhasesPanel } from "./phases-panel";
import { plasticSummaryRows } from "@/lib/specialty-i18n";
import { dermSummaryRows } from "@/lib/derm-i18n";
import { STATUS_TREATED } from "@/lib/staff-flow-i18n";
import { ReportPanel } from "./report-panel";
import { HelpPanel } from "./help-panel";
import { HELP_TEXT } from "@/lib/help-i18n";
import { LeadPhases } from "@/components/lead-phases";
import { AddPatientDialog } from "@/components/add-patient-dialog";
import { ConsultationsStrip } from "@/components/consultations-strip";
import { CONSULT_TEXT } from "@/lib/consult-types-i18n";
import { ClinicChooser, selectClinic } from "@/components/clinic-chooser";
import { CLINIC_ACCESS_TEXT } from "@/lib/clinic-access-i18n";
import { STAFF_FLOW_TEXT } from "@/lib/staff-flow-i18n";
import { LeadEvolution } from "@/components/lead-evolution";
import { NAV_TEXT } from "@/lib/phases-i18n";
import { ClinicHome } from "@/components/clinic-home";
import { HOME_TEXT } from "@/lib/home-i18n";

const STATUS_COLORS: Record<string, string> = {
  nuevo: "bg-blue-100 text-blue-700",
  incompleto: "bg-amber-100 text-amber-700",
  listo: "bg-emerald-100 text-emerald-700",
  contactar: "bg-violet-100 text-violet-700",
  agendado: "bg-indigo-100 text-indigo-700",
  contactado: "bg-sky-100 text-sky-700",
  operado: "bg-teal-100 text-teal-700",
  completado: "bg-green-200 text-green-800",
  alta: "bg-cyan-100 text-cyan-800",
  cerrado: "bg-gray-100 text-gray-600"
};

// Botón de la barra lateral (azul marino): estado activo con indicador turquesa.
const navItemClass = (active: boolean) =>
  `relative w-full justify-start gap-3 rounded-xl h-12 [&_svg]:size-5 px-4 font-medium text-[15px] transition-colors hover:text-white ${active
    ? "bg-[hsl(var(--cd-nav-active))] text-white hover:bg-[hsl(var(--cd-nav-active))] before:absolute before:start-0 before:top-2.5 before:bottom-2.5 before:w-1 before:rounded-e-full before:bg-[hsl(var(--cd-teal-bright))]"
    : "bg-transparent text-white/75 hover:bg-white/10"}`;

const cardClass = "bg-card rounded-2xl border border-[hsl(var(--card-border))] shadow-[var(--cd-shadow)]";
const fieldTileClass = "bg-muted/70 rounded-xl p-4";
const fieldLabelClass = "block text-[11px] text-muted-foreground font-semibold uppercase tracking-wider";

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, lang, setLang } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [view, setView] = useState<"home" | "patients" | "users" | "phases" | "report" | "help">("home");
  const currentLang = LANGS.find(l => l.code === lang) ?? LANGS[0];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [addPatientOpen, setAddPatientOpen] = useState(false);

  const { data: authStatus, isLoading: isAuthLoading } = useGetAuthMe();
  const logoutMutation = useAdminLogout();
  const deleteMutation = useDeleteLead();

  const { data: myClinic } = useGetMyClinic({ query: { enabled: authStatus?.authenticated, queryKey: getGetMyClinicQueryKey(), staleTime: 5 * 60_000 }});

  const STATUS_LABELS: Record<string, string> = {
    nuevo: t.statusNuevo,
    incompleto: t.statusIncompleto,
    listo: t.statusListo,
    contactar: t.statusContactar,
    agendado: t.statusAgendado,
    contactado: t.statusContactado,
    operado: myClinic?.specialty === "dermatologia" ? STATUS_TREATED[lang] : t.statusOperado,
    completado: t.statusCompletado,
    cerrado: t.statusCerrado,
    alta: t.statusAlta,
  };
  const { data: stats } = useGetLeadStats({ query: { enabled: authStatus?.authenticated, queryKey: getGetLeadStatsQueryKey() }});

  // Cuántas fotografías pide la pre-evaluación de esta clínica (por defecto 5) y si
  // quien mira es su representante legal (ve la pantalla "Fases").
  const isClinicStaff = authStatus?.authenticated === true && (authStatus.user?.role === "medico" || authStatus.user?.role === "administrativo");
  const { data: supportUnread } = useQuery({
    queryKey: ["support-unread"],
    queryFn: async () => (await (await fetch("/api/support/unread", { credentials: "same-origin" })).json()) as { unread?: number },
    refetchInterval: 20000, retry: false, enabled: isClinicStaff,
  });
  const helpUnread = supportUnread?.unread ?? 0;
  const { data: protocol } = useGetClinicProtocol(undefined, { query: { enabled: isClinicStaff, queryKey: getGetClinicProtocolQueryKey(), staleTime: 60_000 } });
  const photoTotal = protocol?.phases[0]?.views.length ?? 5;
  const canEditPhases = protocol?.canEdit === true;

  const leadsParams = { search: search || undefined, status: statusFilter === "all" ? undefined : statusFilter };
  const { data: leadsData, isLoading: leadsLoading } = useGetLeads(leadsParams, {
    query: { enabled: authStatus?.authenticated, queryKey: getGetLeadsQueryKey(leadsParams) }
  });

  const consultText = CONSULT_TEXT[lang];
  const consultLabel = (lead: { consultTypeName?: string; consultCount?: number }) =>
    `${lead.consultTypeName}${(lead.consultCount ?? 1) > 1 ? ` · ${consultText.consultCount(lead.consultCount ?? 1)}` : ""}`;
  const selectedLeadSummary = leadsData?.leads.find(l => l.id === selectedLeadId);
  const { data: fullLead } = useGetLeadById(selectedLeadId || "", {
    query: { enabled: !!selectedLeadId, queryKey: getGetLeadByIdQueryKey(selectedLeadId || "") }
  });

  const patchMutation = usePatchLead();

  useEffect(() => {
    if (isAuthLoading || authStatus?.authenticated) return;
    // A direct link to a patient (/admin?lead=…) survives the sign-in.
    const lead = new URLSearchParams(window.location.search).get("lead");
    setLocation(lead ? `/admin/login?next=${encodeURIComponent(`/admin?lead=${lead}`)}` : "/admin/login");
  }, [isAuthLoading, authStatus, setLocation]);

  // Al entrar a una clínica (o cambiar de clínica) se llega a Inicio.
  useEffect(() => {
    if (authStatus?.user?.centerId) setView("home");
  }, [authStatus?.user?.centerId]);

  // Open the patient named by /admin?lead=… (the link in the pending-diagnosis report).
  useEffect(() => {
    if (!authStatus?.authenticated) return;
    const lead = new URLSearchParams(window.location.search).get("lead");
    if (!lead) return;
    setView("patients");
    setSelectedLeadId(lead);
    window.history.replaceState(null, "", window.location.pathname);
  }, [authStatus?.authenticated]);

  useEffect(() => {
    if (!linkCopied) return;
    const timer = window.setTimeout(() => setLinkCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [linkCopied]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileNavOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  // Diálogos, menús y avisos de Radix se montan en un portal dentro de <body>: mientras
  // se ve el dashboard de clínica, <body> lleva también la clase de sus tokens.
  const showsClinicDashboard = authStatus?.authenticated === true && !authStatus.user?.needsClinicChoice
    && authStatus.user?.role !== "director" && authStatus.user?.role !== "supra_admin";
  // En árabe, todo el panel (y sus portales) va de derecha a izquierda.
  const dir = lang === "ar" ? "rtl" : "ltr";
  useEffect(() => {
    if (!showsClinicDashboard) return;
    document.body.classList.add("clinic-dashboard");
    document.body.dir = dir;
    return () => { document.body.classList.remove("clinic-dashboard"); document.body.removeAttribute("dir"); };
  }, [showsClinicDashboard, dir]);

  if (isAuthLoading || !authStatus?.authenticated) return <div className="clinic-dashboard min-h-[100dvh] bg-background" />;

  // Con acceso a varias clínicas se elige una al entrar; solo aparecen las suyas.
  if (authStatus.user?.needsClinicChoice) {
    return (
      <ClinicChooser
        clinics={authStatus.user.clinics ?? []}
        director={authStatus.user.role === "director"}
        onChosen={() => { queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== getGetAuthMeQueryKey()[0] }); queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() }); }}
      />
    );
  }

  if (authStatus.user?.role === "director" || authStatus.user?.role === "supra_admin") {
    return (
      <DirectorPanel
        canManageUsers={authStatus.user.role === "director"}
        onLogout={() => {
          logoutMutation.mutate(undefined, {
            onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() }); setLocation("/"); }
          });
        }}
      />
    );
  }

  // Administrativos y representante legal (aunque sea médico) gestionan los usuarios de la clínica.
  const canManageUsers = authStatus.user?.canManageUsers === true;

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

  const handleCopyGenericLink = async () => {
    if (await copyToClipboard(buildPublicPatientLink(myClinic?.slug))) {
      setLinkCopied(true);
      toast({ title: t.adminInviteLinkCopied, description: t.adminInviteLinkCopiedDesc });
    } else {
      toast({ variant: "destructive", title: "Error", description: t.adminInviteCopyError });
    }
  };

  return (
    // DirectionProvider: los menús y diálogos de Radix (en portal) siguen la misma dirección.
    <DirectionProvider dir={dir}>
    <div dir={dir} className="clinic-dashboard h-[100dvh] bg-background text-foreground flex flex-col md:flex-row font-sans selection:bg-primary/20">
      {/* Mobile top bar */}
      <div className="cd-nav md:hidden bg-[hsl(var(--cd-nav))] text-white px-4 py-2.5 flex items-center justify-between shrink-0 z-30 shadow-md">
        <Link href="/">
          <div className="flex items-center cursor-pointer">
            <BrandLogo className="h-10 w-10 rounded-lg" />
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label={t.adminMenuOpen}
          aria-expanded={mobileNavOpen}
          className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 bg-[hsl(var(--cd-nav)/0.6)] backdrop-blur-sm z-40" onClick={() => setMobileNavOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`cd-nav fixed inset-y-0 start-0 w-72 max-w-[85vw] z-50 transition-transform duration-300 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"} md:static md:translate-x-0 md:rtl:translate-x-0 md:max-w-none md:w-64 lg:w-72 md:z-30 bg-[hsl(var(--cd-nav))] bg-gradient-to-b from-[hsl(var(--cd-nav))] to-[hsl(210_62%_9%)] text-white flex-shrink-0 flex flex-col md:min-h-[100dvh] shadow-2xl md:shadow-none md:border-e md:border-white/5 overflow-y-auto`}>
        <div className="px-6 py-5 flex items-center justify-between gap-3 border-b border-white/10">
          <Link href="/">
            <div className="flex items-center cursor-pointer group">
              <BrandLogo
                className="h-12 w-12 rounded-xl ring-1 ring-white/15 group-hover:scale-105 transition-transform"
              />
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label={t.adminMenuClose}
            className="md:hidden w-11 h-11 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/75 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-6 flex-1">
          <p className="px-4 text-[11px] font-semibold text-white/60 uppercase tracking-[0.14em] mb-3">{t.adminSection}</p>
          <nav className="space-y-1">
            <Button
              variant="ghost"
              onClick={() => { setView("home"); setMobileNavOpen(false); }}
              aria-current={view === "home" ? "page" : undefined}
              className={navItemClass(view === "home")}
              data-testid="nav-home"
            >
              <Home className="w-5 h-5" />
              {HOME_TEXT[lang].nav}
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setView("patients"); setMobileNavOpen(false); }}
              aria-current={view === "patients" ? "page" : undefined}
              className={navItemClass(view === "patients")}
            >
              <Users className="w-5 h-5" />
              {t.adminPatients}
            </Button>
            {canManageUsers && (
              <Button
                variant="ghost"
                onClick={() => { setView("users"); setMobileNavOpen(false); }}
                aria-current={view === "users" ? "page" : undefined}
                className={navItemClass(view === "users")}
              >
                <UserCog className="w-5 h-5" />
                {t.adminUsers}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => { setView("report"); setMobileNavOpen(false); }}
              aria-current={view === "report" ? "page" : undefined}
              className={navItemClass(view === "report")}
            >
              <ClipboardList className="w-5 h-5" />
              {NAV_TEXT[lang].report}
            </Button>
            {canEditPhases && (
              <Button
                variant="ghost"
                onClick={() => { setView("phases"); setMobileNavOpen(false); }}
                aria-current={view === "phases" ? "page" : undefined}
                className={navItemClass(view === "phases")}
              >
                <Layers className="w-5 h-5" />
                {t.adminPhases}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => { setView("help"); setMobileNavOpen(false); }}
              aria-current={view === "help" ? "page" : undefined}
              className={navItemClass(view === "help")}
              data-testid="nav-help"
            >
              <LifeBuoy className="w-5 h-5" />
              {HELP_TEXT[lang].nav}
              {helpUnread > 0 && <span className="ms-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white" data-testid="help-unread">{helpUnread}</span>}
            </Button>
          </nav>

          {/* Language selector */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="px-4 text-[11px] font-semibold text-white/60 uppercase tracking-[0.14em] mb-3">{NAV_TEXT[lang].language}</p>
            <div className="relative">
              <button
                onClick={() => setLangOpen(v => !v)}
                aria-expanded={langOpen}
                className="w-full min-h-11 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-colors"
              >
                <span className="text-base">{currentLang.flag}</span>
                <span className="flex-1 text-start">{currentLang.name}</span>
                <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${langOpen ? "rotate-180" : ""}`} />
              </button>
              {langOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-[hsl(210_58%_17%)] rounded-xl shadow-xl border border-white/10 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 max-h-56 overflow-y-auto">
                  {LANGS.map(l => (
                    <button key={l.code} onClick={() => { setLang(l.code as LangCode); setLangOpen(false); }}
                      className={`w-full min-h-11 flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-white/10 text-start transition-colors ${lang === l.code ? "text-[hsl(var(--cd-teal-bright))] font-semibold" : "text-white/80"}`}>
                      <span>{l.flag}</span>
                      <span>{l.name}</span>
                      {lang === l.code && <Check className="w-3.5 h-3.5 ms-auto text-[hsl(var(--cd-teal-bright))]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-5 border-t border-white/10">
          {(authStatus.user?.clinics?.length ?? 0) > 1 && (
            <div className="mb-3">
              <p className="px-4 text-[11px] font-semibold text-white/60 uppercase tracking-[0.14em] mb-1">{CLINIC_ACCESS_TEXT[lang].currentClinic}</p>
              <p className="px-4 text-sm font-semibold text-white break-words mb-2">{authStatus.user?.clinics?.find((c) => c.id === authStatus.user?.centerId)?.name ?? ""}</p>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-white hover:bg-white/15 hover:text-white font-medium rounded-xl h-11 bg-white/[0.06] [&_svg]:size-5"
                data-testid="switch-clinic"
                onClick={async () => {
                  if (await selectClinic(null)) { queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== getGetAuthMeQueryKey()[0] }); queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() }); }
                  else toast({ variant: "destructive", title: CLINIC_ACCESS_TEXT[lang].failed });
                }}
              >
                <Building2 className="w-5 h-5" />
                {CLINIC_ACCESS_TEXT[lang].switchClinic}
              </Button>
            </div>
          )}
          <Button variant="ghost" className="w-full justify-start gap-3 px-4 text-white/70 hover:text-white hover:bg-white/10 font-medium rounded-xl h-12 transition-colors [&_svg]:size-5" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
            {t.logout}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 md:h-[100dvh] overflow-hidden relative">
        {authStatus.user?.viewingAsDirector && (
          <div className="cd-nav bg-[hsl(var(--cd-nav-active))] text-white px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-3 shrink-0 z-30 border-b border-white/10" data-testid="director-banner">
            <span className="text-sm font-semibold min-w-0 break-words">{CLINIC_ACCESS_TEXT[lang].directorBanner(authStatus.user.viewingClinic?.name ?? "")} · {authStatus.user.viewingProfile === "representante_legal" ? CLINIC_ACCESS_TEXT[lang].roleLegal : authStatus.user.role === "administrativo" ? CLINIC_ACCESS_TEXT[lang].roleAdministrativo : CLINIC_ACCESS_TEXT[lang].roleMedico}</span>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full ms-auto min-h-11 md:min-h-9 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
              onClick={async () => {
                await fetch("/api/auth/leave-clinic", { method: "POST", credentials: "include" });
                queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== getGetAuthMeQueryKey()[0] });
                queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() });
              }}
            >
              {CLINIC_ACCESS_TEXT[lang].backToSupra}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full min-h-11 md:min-h-9 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
              onClick={async () => {
                await selectClinic(null);
                queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== getGetAuthMeQueryKey()[0] });
                queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() });
              }}
            >
              {CLINIC_ACCESS_TEXT[lang].switchClinic}
            </Button>
          </div>
        )}
        <AddPatientDialog open={addPatientOpen} onOpenChange={setAddPatientOpen} onCreated={(id) => { setStatusFilter("all"); setSearch(""); setView("patients"); setSelectedLeadId(id); }} />
        {view === "home" ? (
          <ClinicHome
            userName={authStatus.user?.name ?? ""}
            canManageUsers={canManageUsers}
            canEditPhases={canEditPhases}
            onNewPatient={() => setAddPatientOpen(true)}
            onOpenPatients={() => setView("patients")}
            onOpenReport={() => setView("report")}
            onOpenPhases={() => setView("phases")}
            onOpenUsers={() => setView("users")}
            onOpenLead={(id) => { setView("patients"); setSelectedLeadId(id); }}
          />
        ) : view === "help" ? <HelpPanel initialTab={helpUnread > 0 ? "support" : "manual"} specialty={myClinic?.specialty} /> : view === "report" ? <ReportPanel onOpenLead={(id) => { setView("patients"); setSelectedLeadId(id); }} /> : view === "users" && canManageUsers ? <ClinicUsersPanel /> : view === "phases" && canEditPhases ? <PhasesPanel /> : (
          <>
        {/* Mobile: whole content scrolls; desktop: only the patient list scrolls */}
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto md:overflow-hidden">
        {/* Topbar */}
        <header className="bg-card border-b border-border px-4 py-5 sm:px-6 md:px-10 md:py-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 z-20">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{t.adminDashTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t.adminDashSub}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <Button
              onClick={() => setAddPatientOpen(true)}
              className="gap-2 h-11 px-5 rounded-xl font-semibold shadow-sm shadow-primary/25 hover:bg-primary/90 w-full md:w-auto"
              data-testid="add-patient"
            >
              <UserPlus className="w-4 h-4" />
              {STAFF_FLOW_TEXT[lang].addPatient}
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyGenericLink}
              className={`gap-2 h-11 px-5 rounded-xl font-semibold bg-card transition-colors w-full md:w-auto ${linkCopied ? "border-[hsl(var(--cd-teal))] text-[hsl(var(--cd-teal))] bg-secondary" : "text-foreground hover:bg-muted"}`}
            >
              {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {linkCopied ? t.adminInviteLinkCopied : t.adminInviteCopyLink}
            </Button>
          </div>
        </header>

        {/* Indicadores: los de estado filtran la lista */}
        <div className="px-4 sm:px-6 md:px-10 pt-5 pb-4 md:pt-6 shrink-0 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {([
            { filter: "all", label: t.adminTotal, count: stats?.total || 0, dot: "bg-primary", text: "text-foreground" },
            { filter: "incompleto", label: t.statusIncompleto, count: stats?.counts?.incompleto || 0, dot: "bg-amber-500", text: "text-amber-700" },
            { filter: "listo", label: t.statusListo, count: stats?.counts?.listo || 0, dot: "bg-emerald-500", text: "text-emerald-700" },
            { filter: "contactar", label: t.statusContactar, count: stats?.counts?.contactar || 0, dot: "bg-violet-500", text: "text-violet-700" },
            { filter: "operado", label: myClinic?.specialty === "dermatologia" ? STATUS_TREATED[lang] : t.statusOperado, count: stats?.counts?.operado || 0, dot: "bg-teal-500", text: "text-teal-700" },
          ]).map((card) => {
            const active = statusFilter === card.filter;
            return (
              <button
                key={card.filter}
                type="button"
                aria-pressed={active}
                onClick={() => setStatusFilter(card.filter)}
                className={`group relative text-start p-4 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-md ${active
                  ? "bg-card border-primary ring-1 ring-primary shadow-[var(--cd-shadow)]"
                  : "bg-card border-[hsl(var(--card-border))] shadow-[var(--cd-shadow)] hover:border-primary/40"}`}
              >
                <p className="flex items-start gap-2 min-h-[2.2rem] text-[11px] leading-[1.1rem] font-semibold mb-2 uppercase tracking-wider text-muted-foreground">
                  <span className={`mt-[5px] h-2 w-2 rounded-full shrink-0 ${card.dot}`} aria-hidden="true" />
                  <span className="line-clamp-2">{card.label}</span>
                </p>
                <p className={`text-2xl sm:text-[28px] leading-none font-bold tabular-nums ${card.text}`}>{card.count}</p>
              </button>
            );
          })}
          <div className={`text-start p-4 ${cardClass} bg-gradient-to-br from-card to-secondary/60`} data-testid="stat-transcribed">
            <p className="flex items-start gap-2 min-h-[2.2rem] text-[11px] leading-[1.1rem] font-semibold mb-2 uppercase tracking-wider text-muted-foreground">
              <span className="mt-[5px] h-2 w-2 rounded-full shrink-0 bg-[hsl(var(--cd-teal))]" aria-hidden="true" />
              <span className="line-clamp-2">{DOCS_TRANSCRIBED[lang]}</span>
            </p>
            <p className="text-2xl sm:text-[28px] leading-none font-bold tabular-nums text-[hsl(var(--cd-teal))]">{(stats as { transcribedDocuments?: number } | undefined)?.transcribedDocuments ?? 0}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 sm:px-6 md:px-10 pb-4 flex flex-wrap gap-3 shrink-0">
          <div className="relative flex-1 basis-60 sm:max-w-sm">
            <Search className="w-[18px] h-[18px] absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t.adminSearchPlaceholder}
              className="ps-11 h-11 bg-card border-input rounded-xl text-base shadow-sm focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-primary"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[220px] h-11 bg-card border-input rounded-xl font-medium shadow-sm">
              <SelectValue placeholder={t.adminAllStatuses} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">{t.adminAllStatuses}</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Patient List */}
        <div className="md:flex-1 md:min-h-0 md:overflow-y-auto px-4 sm:px-6 md:px-10 pb-10">
          <div className={`${cardClass} overflow-hidden`}>
            {leadsLoading ? (
              <div className="p-16 text-center text-muted-foreground font-medium" role="status">{t.adminLoading}</div>
            ) : leadsData?.leads.length === 0 ? (
              <div className="px-6 py-16 sm:p-20 text-center text-muted-foreground flex flex-col items-center">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-5 ring-1 ring-border">
                  <Users className="w-8 h-8 text-primary/60" />
                </div>
                <p className="text-lg font-semibold text-foreground">{t.adminEmpty}</p>
                <p className="text-sm mt-1">{t.adminEmptySub}</p>
              </div>
            ) : (
              <>
              {/* Mobile: cards */}
              <ul className="md:hidden divide-y divide-border">
                {leadsData?.leads.map(lead => (
                  <li key={lead.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={`w-full text-start p-4 flex items-center gap-3 hover:bg-muted/60 transition-colors ${selectedLeadId === lead.id ? 'bg-accent shadow-[inset_3px_0_0_hsl(var(--primary))] rtl:shadow-[inset_-3px_0_0_hsl(var(--primary))]' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground text-base truncate">{lead.name || "—"}</div>
                            <div className="text-muted-foreground text-sm truncate tabular-nums"><bdi dir="ltr">{lead.phone}</bdi></div>
                            {lead.consultTypeName && <div className="text-xs font-semibold text-[hsl(var(--cd-teal))] truncate mt-0.5" data-testid="lead-consult">{consultLabel(lead)}</div>}
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ring-1 ring-inset ring-black/5 ${STATUS_COLORS[lead.status]}`}>
                            {STATUS_LABELS[lead.status]}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <span className={`flex items-center gap-1.5 font-semibold tabular-nums ${lead.photoCount >= photoTotal ? 'text-primary' : 'text-muted-foreground'}`}>
                            <Camera className="w-4 h-4" />
                            {lead.photoCount}/{photoTotal}
                          </span>
                          <span className="text-muted-foreground">
                            <bdi dir="ltr">{format(parseISO(lead.createdAt), "d MMM, yyyy", { locale: dateFnsEs })}</bdi>
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 rtl:rotate-180" />
                    </button>
                  </li>
                ))}
              </ul>

              {/* Desktop: table */}
              <table className="hidden md:table w-full text-sm text-start">
                <thead className="bg-muted/60 text-muted-foreground font-semibold uppercase tracking-wider text-[11px] border-b border-border">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">{t.adminColPatient}</th>
                    <th className="px-6 py-3.5 font-semibold">{t.adminColStatus}</th>
                    <th className="px-6 py-3.5 font-semibold">{t.adminColPhotos}</th>
                    <th className="px-6 py-3.5 font-semibold">{t.adminColDate}</th>
                    <th className="px-6 py-3.5 font-semibold text-end">{t.adminColAction}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leadsData?.leads.map(lead => (
                    <tr
                      key={lead.id}
                      tabIndex={0}
                      className={`hover:bg-muted/50 cursor-pointer transition-colors group focus-visible:-outline-offset-2 ${selectedLeadId === lead.id ? 'bg-accent shadow-[inset_3px_0_0_hsl(var(--primary))] rtl:shadow-[inset_-3px_0_0_hsl(var(--primary))]' : ''}`}
                      onClick={() => setSelectedLeadId(lead.id)}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedLeadId(lead.id); } }}
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground text-[15px] mb-0.5">{lead.name || "—"}</div>
                        <div className="text-muted-foreground text-sm tabular-nums"><bdi dir="ltr">{lead.phone}</bdi></div>
                        {lead.consultTypeName && <div className="text-xs font-semibold text-[hsl(var(--cd-teal))] mt-0.5" data-testid="lead-consult">{consultLabel(lead)}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ring-black/5 ${STATUS_COLORS[lead.status]}`}>
                          {STATUS_LABELS[lead.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center gap-2 font-semibold tabular-nums ${lead.photoCount >= photoTotal ? 'text-primary' : 'text-muted-foreground'}`}>
                          <Camera className="w-4 h-4" />
                          <span>{lead.photoCount}/{photoTotal}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground tabular-nums">
                        <bdi dir="ltr">{format(parseISO(lead.createdAt), "d MMM, yyyy", { locale: dateFnsEs })}</bdi>
                      </td>
                      <td className="px-6 py-4 text-end">
                        <div className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center ms-auto text-muted-foreground group-hover:border-primary/40 group-hover:bg-accent group-hover:text-primary transition-colors">
                          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            )}
          </div>
        </div>

        </div>

        {/* Details Drawer */}
        {selectedLeadId && (
          <>
            <div className="absolute inset-0 bg-[hsl(var(--cd-nav)/0.35)] backdrop-blur-[2px] z-40 animate-in fade-in" onClick={() => setSelectedLeadId(null)} />
            <div className="absolute inset-y-0 end-0 w-full md:w-[680px] bg-background shadow-2xl flex flex-col z-50 animate-in slide-in-from-end duration-300 md:border-s md:border-border overflow-hidden">
              {fullLead ? (
                <>
                  <div className="px-5 py-5 md:px-8 md:py-6 flex items-center justify-between gap-4 bg-card border-b border-border shrink-0">
                    <div className="min-w-0">
                      <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight break-words">{fullLead.name || "Paciente"}</h2>
                      <p className="text-muted-foreground mt-1 tabular-nums"><bdi dir="ltr">{fullLead.phone}</bdi></p>
                    </div>
                    <button onClick={() => setSelectedLeadId(null)} aria-label={t.close} className="w-11 h-11 shrink-0 border border-border hover:bg-muted rounded-xl flex items-center justify-center transition-colors">
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>

                  <ConsultationsStrip leadId={fullLead.id} onOpen={(id) => setSelectedLeadId(id)} />

                  <div className="shrink-0 px-5 md:px-8 py-2 bg-card border-b border-border flex justify-end">
                    <Button
                      variant="ghost"
                      className="text-red-700 hover:text-red-800 hover:bg-red-50 gap-2 font-semibold rounded-xl h-11"
                      onClick={() => setDeleteConfirmId(fullLead.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                      {t.deleteRecord}
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-4 md:space-y-5">
                    {/* Status & Actions */}
                    <div className={`${cardClass} p-5 md:p-6 space-y-5`}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={`${fieldLabelClass} mb-2`}>{t.adminStatusPatient}</label>
                          <Select value={fullLead.status} onValueChange={v => handlePatch(fullLead.id, { status: v })}>
                            <SelectTrigger className="h-11 rounded-xl text-base font-semibold border-input bg-card">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k} disabled={k === "alta"}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className={`${fieldLabelClass} mb-2`}>{t.adminAppDate}</label>
                          <Input
                            type="datetime-local"
                            defaultValue={fullLead.appointmentAt ? fullLead.appointmentAt.slice(0, 16) : ""}
                            onBlur={e => {
                              const val = e.target.value;
                              if (val && val !== (fullLead.appointmentAt?.slice(0, 16) || "")) {
                                handlePatch(fullLead.id, { appointmentAt: new Date(val).toISOString() });
                              }
                            }}
                            className="h-11 rounded-xl font-medium border-input text-base bg-card"
                          />
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground -mt-2">{t.adminStatusAuto}</p>
                      {["contactar", "contactado", "agendado"].includes(fullLead.status) && (
                        <div className="rounded-xl bg-accent border border-primary/15 p-4 space-y-3">
                          <p className="text-sm font-medium text-foreground">{t.adminContactHint}</p>
                          {fullLead.status === "contactar" && (
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-xl font-semibold h-11 bg-card"
                              onClick={() => handlePatch(fullLead.id, { status: "contactado" })}
                            >
                              {t.adminContactNoAppt}
                            </Button>
                          )}
                        </div>
                      )}

                      <Button
                        className="w-full h-12 gap-2 bg-[#0E7A55] hover:bg-[#0B6145] text-white shadow-sm font-semibold text-base rounded-xl transition-colors"
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
                    <div className={`${cardClass} p-5 md:p-6`}>
                      <h3 className="text-base md:text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-primary" />
                        {t.adminPhotoReg}
                        <span className="ms-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">{fullLead.photos?.length || 0}/{photoTotal}</span>
                      </h3>
                      {fullLead.photos && fullLead.photos.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {fullLead.photos.map(p => {
                            const photoUrl = `/api/leads/${encodeURIComponent(fullLead.id)}/photos/${encodeURIComponent(p.id)}`;
                            return (
                            <div
                              key={p.id}
                              role="button"
                              tabIndex={0}
                              aria-label={p.label}
                              className="group flex flex-col rounded-xl overflow-hidden bg-card border border-border cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                              onClick={() => setExpandedPhoto(photoUrl)}
                              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedPhoto(photoUrl); } }}
                            >
                              <div className="aspect-[4/3] overflow-hidden bg-[hsl(var(--cd-nav)/0.06)]">
                                <img src={photoUrl} alt={p.label} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                              </div>
                              <div className="px-3 py-2.5 text-xs font-semibold text-center text-foreground border-t border-border"><bdi>{p.label}</bdi></div>
                              {p.note && (
                                <p className="px-3 pb-3 text-xs text-foreground whitespace-pre-wrap break-words" title={t.adminPhotoNote}>
                                  <span className="font-semibold text-muted-foreground">{t.adminPhotoNote}: </span><bdi>{p.note}</bdi>
                                </p>
                              )}
                            </div>
                          ); })}
                        </div>
                      ) : (
                        <div className="bg-muted/70 border border-dashed border-border rounded-xl p-10 text-center text-muted-foreground flex flex-col items-center">
                          <Camera className="w-9 h-9 mb-3 text-muted-foreground/60" />
                          <p className="font-medium">{t.adminNoPhotos}</p>
                        </div>
                      )}
                    </div>

                    <LeadPhases
                      leadId={fullLead.id}
                      onExpand={setExpandedPhoto}
                      diagnosisLead={{
                        norwood: fullLead.norwood,
                        notes: fullLead.notes,
                        showNorwood: myClinic?.specialty === undefined || myClinic.specialty === "capilar",
                        onPatch: (data) => handlePatch(fullLead.id, data),
                      }}
                      process={{
                        status: fullLead.status,
                        isDoctor: authStatus.user?.role === "medico",
                        dischargedByName: (fullLead as { dischargedByName?: string | null }).dischargedByName,
                        dischargedAt: (fullLead as { dischargedAt?: string | null }).dischargedAt,
                        dischargeNote: (fullLead as { dischargeNote?: string | null }).dischargeNote,
                      }}
                    />

                    <LeadEvolution leadId={fullLead.id} onExpand={setExpandedPhoto} />

                    {/* Patient history */}
                    <div className={`${cardClass} p-5 md:p-6`}>
                      <h3 className="text-base md:text-lg font-bold text-foreground mb-4">{t.adminPatientHistory}</h3>
                      <div className="grid grid-cols-2 gap-3 text-[15px]">
                        {selectedLeadSummary?.documentId && (
                          <div className={`col-span-2 flex items-start gap-3 ${fieldTileClass}`}>
                            <CreditCard className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <span className={`${fieldLabelClass} mb-1`}>{t.adminDocId}</span>
                              <span className="font-semibold break-all">{selectedLeadSummary.documentId}</span>
                            </div>
                          </div>
                        )}
                        {selectedLeadSummary?.email && (
                          <div className={`col-span-2 flex items-start gap-3 ${fieldTileClass}`}>
                            <Mail className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <span className={`${fieldLabelClass} mb-1`}>{t.adminEmail}</span>
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
                          <div key={label} className={fieldTileClass}>
                            <span className={`${fieldLabelClass} mb-1`}>{label}</span>
                            <span className="font-semibold">{value || "—"}</span>
                          </div>
                        ))}
                        {(myClinic?.specialty === "dermatologia" ? dermSummaryRows(fullLead.clinicalData) : myClinic?.specialty === "plastica" ? plasticSummaryRows(fullLead.clinicalData) : [
                          { label: t.adminHairLossTime, value: fullLead.hairLossTime },
                          { label: t.adminZone, value: fullLead.pattern },
                          { label: t.adminPrevTreatment, value: fullLead.previousTreatment },
                        ]).map(({ label, value }) => (
                          <div key={label} className={`col-span-2 ${fieldTileClass}`}>
                            <span className={`${fieldLabelClass} mb-1`}>{label}</span>
                            <span className="font-semibold">{value || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground font-medium" role="status">
                  <BrandLogo
                    className="h-14 w-14 mb-4 rounded-xl animate-pulse"
                  />
                  {t.adminLoadingLead}
                </div>
              )}
            </div>
          </>
        )}
          </>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-[hsl(var(--cd-nav)/0.55)] backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-sm shadow-2xl p-7 animate-in zoom-in-95 duration-300" role="alertdialog" aria-modal="true" aria-labelledby="delete-lead-title">
            <div className="w-14 h-14 bg-red-50 ring-1 ring-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 id="delete-lead-title" className="text-xl font-bold text-foreground text-center mb-3">{t.deleteTitle}</h3>
            <p className="text-muted-foreground text-center text-sm mb-7 leading-relaxed">
              {t.deleteDesc.split(t.deletePermanent).map((part, i, arr) => (
                i < arr.length - 1 ? <span key={i}>{part}<strong className="text-foreground">{t.deletePermanent}</strong></span> : <span key={i}>{part}</span>
              ))}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-11 rounded-xl font-semibold border-border" onClick={() => setDeleteConfirmId(null)} disabled={deleteMutation.isPending}>
                {t.cancel}
              </Button>
              <Button
                className="flex-1 h-11 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm"
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
        <div className="fixed inset-0 bg-[hsl(210_65%_6%/0.95)] z-[100] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setExpandedPhoto(null)}>
          <button aria-label={t.close} className="cd-nav absolute top-5 end-5 text-white w-12 h-12 flex items-center justify-center bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
            <X className="w-6 h-6" />
          </button>
          <img src={expandedPhoto} alt="" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
    </DirectionProvider>
  );
}
