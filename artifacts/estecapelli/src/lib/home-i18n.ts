// Textos de la pantalla de Inicio del dashboard de clínica (y de su barra superior
// y tarjetas del menú lateral), en los nueve idiomas.
import type { LangCode } from "./language";

export type HomeText = {
  nav: string;
  brandTagline: string;
  welcome: (name: string) => string;
  welcomeNoName: string;
  subtitle: string;
  quickTitle: string;
  newPatientDesc: string;
  patientsTitle: string;
  patientsDesc: string;
  reportDesc: string;
  phasesDesc: string;
  copyAccess: string;
  copyAccessDesc: string;
  statsTitle: string;
  totalPatients: string;
  photos: string;
  thisMonth: string;
  professionals: string;
  /** Lectura completa del chip de variación, p. ej. «+12 % respecto al mes anterior». */
  change: (pct: string) => string;
  noData: string;
  chartTitle: string;
  chartPatients: string;
  chartPhotos: string;
  lastMonths: (n: number) => string;
  chartRange: string;
  chartEmpty: string;
  chartMonth: string;
  activityTitle: string;
  seeAllActivity: string;
  activityEmpty: string;
  evPhotos: (n: number) => string;
  evPatient: string;
  evMeasured: string;
  evDischarged: string;
  recentTitle: string;
  seeAll: string;
  emptyTitle: string;
  emptyDesc: string;
  error: string;
  retry: string;
  searchLabel: string;
  notifications: (n: number) => string;
  userMenu: string;
  myClinic: string;
  helpTitle: string;
  helpDesc: string;
  specialty: Record<"capilar" | "plastica" | "dermatologia", string>;
};

export const HOME_TEXT: Record<LangCode, HomeText> = {
  es: {
    nav: "Inicio", brandTagline: "Registro fotográfico clínico",
    welcome: (n) => `Bienvenido, ${n}`, welcomeNoName: "Bienvenido",
    subtitle: "Gestiona tus pacientes y registros fotográficos clínicos en un solo lugar.",
    quickTitle: "Accesos rápidos", newPatientDesc: "Crear ficha clínica",
    patientsTitle: "Ver pacientes", patientsDesc: "Lista y fichas",
    reportDesc: "Etapas pendientes", phasesDesc: "Protocolo fotográfico", copyAccess: "Copiar acceso", copyAccessDesc: "Enlace para tus pacientes",
    statsTitle: "Indicadores", totalPatients: "Pacientes totales", photos: "Fotografías registradas", thisMonth: "Registros este mes", professionals: "Profesionales activos",
    change: (p) => `${p} respecto al mes anterior`, noData: "Aún sin datos",
    chartTitle: "Actividad fotográfica", chartPatients: "Nuevos pacientes", chartPhotos: "Fotografías",
    lastMonths: (n) => `Últimos ${n} meses`, chartRange: "Período del gráfico", chartEmpty: "Aún sin datos en este período", chartMonth: "Mes",
    activityTitle: "Actividad reciente", seeAllActivity: "Ver todas", activityEmpty: "Aún sin actividad. Aquí verás las fotos, pacientes nuevos y mediciones.",
    evPhotos: (n) => (n === 1 ? "Fotografía registrada" : `${n} fotografías registradas`), evPatient: "Paciente nuevo", evMeasured: "Medición guardada", evDischarged: "Alta médica",
    recentTitle: "Pacientes recientes", seeAll: "Ver todos",
    emptyTitle: "Aún no hay pacientes", emptyDesc: "Agrega el primero o comparte el enlace de la clínica desde Pacientes.",
    error: "No pudimos cargar los datos de la clínica.", retry: "Reintentar",
    searchLabel: "Buscar pacientes", notifications: (n) => (n === 0 ? "Avisos de soporte: ninguno sin leer" : `Avisos de soporte: ${n} sin leer`), userMenu: "Menú de la cuenta",
    myClinic: "Mi clínica", helpTitle: "¿Necesitas ayuda?", helpDesc: "Ver manuales y soporte",
    specialty: { capilar: "Capilar", plastica: "Cirugía plástica", dermatologia: "Dermatología" },
  },
  en: {
    nav: "Home", brandTagline: "Clinical photo records",
    welcome: (n) => `Welcome, ${n}`, welcomeNoName: "Welcome",
    subtitle: "Manage your patients and clinical photo records in one place.",
    quickTitle: "Quick actions", newPatientDesc: "Create a clinical record",
    patientsTitle: "View patients", patientsDesc: "List and records",
    reportDesc: "Pending stages", phasesDesc: "Photo protocol", copyAccess: "Copy access", copyAccessDesc: "Link for your patients",
    statsTitle: "Key figures", totalPatients: "Total patients", photos: "Photos recorded", thisMonth: "Registered this month", professionals: "Active professionals",
    change: (p) => `${p} compared with last month`, noData: "No data yet",
    chartTitle: "Photo activity", chartPatients: "New patients", chartPhotos: "Photos",
    lastMonths: (n) => `Last ${n} months`, chartRange: "Chart period", chartEmpty: "No data in this period yet", chartMonth: "Month",
    activityTitle: "Recent activity", seeAllActivity: "See all", activityEmpty: "No activity yet. Photos, new patients and measurements will show here.",
    evPhotos: (n) => (n === 1 ? "Photo recorded" : `${n} photos recorded`), evPatient: "New patient", evMeasured: "Measurement saved", evDischarged: "Medical discharge",
    recentTitle: "Recent patients", seeAll: "See all",
    emptyTitle: "No patients yet", emptyDesc: "Add the first one, or share the clinic link from Patients.",
    error: "We could not load the clinic's data.", retry: "Try again",
    searchLabel: "Search patients", notifications: (n) => (n === 0 ? "Support notices: none unread" : `Support notices: ${n} unread`), userMenu: "Account menu",
    myClinic: "My clinic", helpTitle: "Need help?", helpDesc: "See manuals and support",
    specialty: { capilar: "Hair", plastica: "Plastic surgery", dermatologia: "Dermatology" },
  },
  pt: {
    nav: "Início", brandTagline: "Registro fotográfico clínico",
    welcome: (n) => `Bem-vindo, ${n}`, welcomeNoName: "Bem-vindo",
    subtitle: "Gerencie seus pacientes e registros fotográficos clínicos em um só lugar.",
    quickTitle: "Acessos rápidos", newPatientDesc: "Criar ficha clínica",
    patientsTitle: "Ver pacientes", patientsDesc: "Lista e fichas",
    reportDesc: "Etapas pendentes", phasesDesc: "Protocolo fotográfico", copyAccess: "Copiar acesso", copyAccessDesc: "Link para seus pacientes",
    statsTitle: "Indicadores", totalPatients: "Pacientes no total", photos: "Fotografias registradas", thisMonth: "Cadastros este mês", professionals: "Profissionais ativos",
    change: (p) => `${p} em relação ao mês anterior`, noData: "Ainda sem dados",
    chartTitle: "Atividade fotográfica", chartPatients: "Novos pacientes", chartPhotos: "Fotografias",
    lastMonths: (n) => `Últimos ${n} meses`, chartRange: "Período do gráfico", chartEmpty: "Ainda sem dados neste período", chartMonth: "Mês",
    activityTitle: "Atividade recente", seeAllActivity: "Ver todas", activityEmpty: "Ainda sem atividade. Aqui aparecerão fotos, novos pacientes e medições.",
    evPhotos: (n) => (n === 1 ? "Fotografia registrada" : `${n} fotografias registradas`), evPatient: "Novo paciente", evMeasured: "Medição salva", evDischarged: "Alta médica",
    recentTitle: "Pacientes recentes", seeAll: "Ver todos",
    emptyTitle: "Ainda não há pacientes", emptyDesc: "Adicione o primeiro ou compartilhe o link da clínica em Pacientes.",
    error: "Não foi possível carregar os dados da clínica.", retry: "Tentar novamente",
    searchLabel: "Buscar pacientes", notifications: (n) => (n === 0 ? "Avisos de suporte: nenhum não lido" : `Avisos de suporte: ${n} não lidos`), userMenu: "Menu da conta",
    myClinic: "Minha clínica", helpTitle: "Precisa de ajuda?", helpDesc: "Ver manuais e suporte",
    specialty: { capilar: "Capilar", plastica: "Cirurgia plástica", dermatologia: "Dermatologia" },
  },
  fr: {
    nav: "Accueil", brandTagline: "Dossier photo clinique",
    welcome: (n) => `Bienvenue, ${n}`, welcomeNoName: "Bienvenue",
    subtitle: "Gérez vos patients et vos dossiers photo cliniques au même endroit.",
    quickTitle: "Accès rapides", newPatientDesc: "Créer un dossier clinique",
    patientsTitle: "Voir les patients", patientsDesc: "Liste et dossiers",
    reportDesc: "Étapes en attente", phasesDesc: "Protocole photo", copyAccess: "Copier l’accès", copyAccessDesc: "Lien pour vos patients",
    statsTitle: "Indicateurs", totalPatients: "Patients au total", photos: "Photos enregistrées", thisMonth: "Inscriptions ce mois-ci", professionals: "Professionnels actifs",
    change: (p) => `${p} par rapport au mois précédent`, noData: "Pas encore de données",
    chartTitle: "Activité photo", chartPatients: "Nouveaux patients", chartPhotos: "Photos",
    lastMonths: (n) => `${n} derniers mois`, chartRange: "Période du graphique", chartEmpty: "Pas encore de données sur cette période", chartMonth: "Mois",
    activityTitle: "Activité récente", seeAllActivity: "Tout voir", activityEmpty: "Pas encore d'activité. Les photos, nouveaux patients et mesures apparaîtront ici.",
    evPhotos: (n) => (n === 1 ? "Photo enregistrée" : `${n} photos enregistrées`), evPatient: "Nouveau patient", evMeasured: "Mesure enregistrée", evDischarged: "Sortie médicale",
    recentTitle: "Patients récents", seeAll: "Tout voir",
    emptyTitle: "Aucun patient pour l'instant", emptyDesc: "Ajoutez le premier ou partagez le lien de la clinique depuis Patients.",
    error: "Impossible de charger les données de la clinique.", retry: "Réessayer",
    searchLabel: "Rechercher des patients", notifications: (n) => (n === 0 ? "Avis du support : aucun non lu" : `Avis du support : ${n} non lus`), userMenu: "Menu du compte",
    myClinic: "Ma clinique", helpTitle: "Besoin d'aide ?", helpDesc: "Voir les manuels et le support",
    specialty: { capilar: "Capillaire", plastica: "Chirurgie plastique", dermatologia: "Dermatologie" },
  },
  de: {
    nav: "Start", brandTagline: "Klinische Fotodokumentation",
    welcome: (n) => `Willkommen, ${n}`, welcomeNoName: "Willkommen",
    subtitle: "Verwalten Sie Ihre Patienten und klinischen Fotodokumentationen an einem Ort.",
    quickTitle: "Schnellzugriff", newPatientDesc: "Patientenakte anlegen",
    patientsTitle: "Patienten ansehen", patientsDesc: "Liste und Akten",
    reportDesc: "Offene Schritte", phasesDesc: "Fotoprotokoll", copyAccess: "Zugang kopieren", copyAccessDesc: "Link für Ihre Patienten",
    statsTitle: "Kennzahlen", totalPatients: "Patienten gesamt", photos: "Erfasste Fotos", thisMonth: "Neu in diesem Monat", professionals: "Aktive Fachkräfte",
    change: (p) => `${p} gegenüber dem Vormonat`, noData: "Noch keine Daten",
    chartTitle: "Fotoaktivität", chartPatients: "Neue Patienten", chartPhotos: "Fotos",
    lastMonths: (n) => `Letzte ${n} Monate`, chartRange: "Zeitraum des Diagramms", chartEmpty: "Noch keine Daten in diesem Zeitraum", chartMonth: "Monat",
    activityTitle: "Letzte Aktivität", seeAllActivity: "Alle anzeigen", activityEmpty: "Noch keine Aktivität. Hier erscheinen Fotos, neue Patienten und Messungen.",
    evPhotos: (n) => (n === 1 ? "Foto erfasst" : `${n} Fotos erfasst`), evPatient: "Neuer Patient", evMeasured: "Messung gespeichert", evDischarged: "Ärztliche Entlassung",
    recentTitle: "Neueste Patienten", seeAll: "Alle anzeigen",
    emptyTitle: "Noch keine Patienten", emptyDesc: "Erfassen Sie den ersten oder teilen Sie den Kliniklink unter Patienten.",
    error: "Die Daten der Klinik konnten nicht geladen werden.", retry: "Erneut versuchen",
    searchLabel: "Patienten suchen", notifications: (n) => (n === 0 ? "Support-Hinweise: keine ungelesen" : `Support-Hinweise: ${n} ungelesen`), userMenu: "Kontomenü",
    myClinic: "Meine Klinik", helpTitle: "Brauchen Sie Hilfe?", helpDesc: "Handbücher und Support ansehen",
    specialty: { capilar: "Haare", plastica: "Plastische Chirurgie", dermatologia: "Dermatologie" },
  },
  it: {
    nav: "Home", brandTagline: "Registro fotografico clinico",
    welcome: (n) => `Benvenuto, ${n}`, welcomeNoName: "Benvenuto",
    subtitle: "Gestisci i tuoi pazienti e i registri fotografici clinici in un unico posto.",
    quickTitle: "Accessi rapidi", newPatientDesc: "Crea una scheda clinica",
    patientsTitle: "Vedi pazienti", patientsDesc: "Elenco e schede",
    reportDesc: "Fasi in sospeso", phasesDesc: "Protocollo fotografico", copyAccess: "Copia accesso", copyAccessDesc: "Link per i tuoi pazienti",
    statsTitle: "Indicatori", totalPatients: "Pazienti totali", photos: "Fotografie registrate", thisMonth: "Registrati questo mese", professionals: "Professionisti attivi",
    change: (p) => `${p} rispetto al mese precedente`, noData: "Ancora nessun dato",
    chartTitle: "Attività fotografica", chartPatients: "Nuovi pazienti", chartPhotos: "Fotografie",
    lastMonths: (n) => `Ultimi ${n} mesi`, chartRange: "Periodo del grafico", chartEmpty: "Ancora nessun dato in questo periodo", chartMonth: "Mese",
    activityTitle: "Attività recente", seeAllActivity: "Vedi tutte", activityEmpty: "Ancora nessuna attività. Qui vedrai foto, nuovi pazienti e misurazioni.",
    evPhotos: (n) => (n === 1 ? "Fotografia registrata" : `${n} fotografie registrate`), evPatient: "Nuovo paziente", evMeasured: "Misurazione salvata", evDischarged: "Dimissione medica",
    recentTitle: "Pazienti recenti", seeAll: "Vedi tutti",
    emptyTitle: "Ancora nessun paziente", emptyDesc: "Aggiungi il primo o condividi il link della clinica da Pazienti.",
    error: "Non è stato possibile caricare i dati della clinica.", retry: "Riprova",
    searchLabel: "Cerca pazienti", notifications: (n) => (n === 0 ? "Avvisi del supporto: nessuno da leggere" : `Avvisi del supporto: ${n} da leggere`), userMenu: "Menu dell'account",
    myClinic: "La mia clinica", helpTitle: "Serve aiuto?", helpDesc: "Vedi manuali e supporto",
    specialty: { capilar: "Tricologia", plastica: "Chirurgia plastica", dermatologia: "Dermatologia" },
  },
  tr: {
    nav: "Ana sayfa", brandTagline: "Klinik fotoğraf kaydı",
    welcome: (n) => `Hoş geldiniz, ${n}`, welcomeNoName: "Hoş geldiniz",
    subtitle: "Hastalarınızı ve klinik fotoğraf kayıtlarınızı tek bir yerden yönetin.",
    quickTitle: "Hızlı erişim", newPatientDesc: "Klinik dosya oluştur",
    patientsTitle: "Hastaları gör", patientsDesc: "Liste ve dosyalar",
    reportDesc: "Bekleyen aşamalar", phasesDesc: "Fotoğraf protokolü", copyAccess: "Erişimi kopyala", copyAccessDesc: "Hastalarınız için bağlantı",
    statsTitle: "Göstergeler", totalPatients: "Toplam hasta", photos: "Kayıtlı fotoğraflar", thisMonth: "Bu ayki kayıtlar", professionals: "Aktif uzmanlar",
    change: (p) => `geçen aya göre ${p}`, noData: "Henüz veri yok",
    chartTitle: "Fotoğraf etkinliği", chartPatients: "Yeni hastalar", chartPhotos: "Fotoğraflar",
    lastMonths: (n) => `Son ${n} ay`, chartRange: "Grafik dönemi", chartEmpty: "Bu dönemde henüz veri yok", chartMonth: "Ay",
    activityTitle: "Son etkinlikler", seeAllActivity: "Tümünü gör", activityEmpty: "Henüz etkinlik yok. Fotoğraflar, yeni hastalar ve ölçümler burada görünecek.",
    evPhotos: (n) => (n === 1 ? "Fotoğraf kaydedildi" : `${n} fotoğraf kaydedildi`), evPatient: "Yeni hasta", evMeasured: "Ölçüm kaydedildi", evDischarged: "Tıbbi taburcu",
    recentTitle: "Son hastalar", seeAll: "Tümünü gör",
    emptyTitle: "Henüz hasta yok", emptyDesc: "İlk hastayı ekleyin veya Hastalar bölümünden klinik bağlantısını paylaşın.",
    error: "Klinik verileri yüklenemedi.", retry: "Tekrar dene",
    searchLabel: "Hasta ara", notifications: (n) => (n === 0 ? "Destek bildirimleri: okunmamış yok" : `Destek bildirimleri: ${n} okunmamış`), userMenu: "Hesap menüsü",
    myClinic: "Kliniğim", helpTitle: "Yardım mı lazım?", helpDesc: "Kılavuzları ve desteği görün",
    specialty: { capilar: "Saç", plastica: "Plastik cerrahi", dermatologia: "Dermatoloji" },
  },
  ar: {
    nav: "الرئيسية", brandTagline: "السجل الفوتوغرافي السريري",
    welcome: (n) => `مرحبًا بك، ${n}`, welcomeNoName: "مرحبًا بك",
    subtitle: "أدِر مرضاك وسجلاتك الفوتوغرافية السريرية في مكان واحد.",
    quickTitle: "وصول سريع", newPatientDesc: "إنشاء ملف سريري",
    patientsTitle: "عرض المرضى", patientsDesc: "القائمة والملفات",
    reportDesc: "المراحل المعلّقة", phasesDesc: "بروتوكول التصوير", copyAccess: "نسخ رابط الدخول", copyAccessDesc: "رابط لمرضاك",
    statsTitle: "المؤشرات", totalPatients: "إجمالي المرضى", photos: "الصور المسجّلة", thisMonth: "التسجيلات هذا الشهر", professionals: "المهنيون النشطون",
    change: (p) => `${p} مقارنةً بالشهر السابق`, noData: "لا توجد بيانات بعد",
    chartTitle: "النشاط الفوتوغرافي", chartPatients: "مرضى جدد", chartPhotos: "الصور",
    lastMonths: (n) => `آخر ${n} أشهر`, chartRange: "فترة الرسم البياني", chartEmpty: "لا توجد بيانات في هذه الفترة بعد", chartMonth: "الشهر",
    activityTitle: "النشاط الأخير", seeAllActivity: "عرض الكل", activityEmpty: "لا يوجد نشاط بعد. ستظهر هنا الصور والمرضى الجدد والقياسات.",
    evPhotos: (n) => (n === 1 ? "تم تسجيل صورة" : `تم تسجيل ${n} صور`), evPatient: "مريض جديد", evMeasured: "تم حفظ القياس", evDischarged: "خروج طبي",
    recentTitle: "أحدث المرضى", seeAll: "عرض الكل",
    emptyTitle: "لا يوجد مرضى بعد", emptyDesc: "أضف أول مريض أو شارك رابط العيادة من قسم المرضى.",
    error: "تعذّر تحميل بيانات العيادة.", retry: "إعادة المحاولة",
    searchLabel: "البحث عن مرضى", notifications: (n) => (n === 0 ? "إشعارات الدعم: لا توجد رسائل غير مقروءة" : `إشعارات الدعم: ${n} غير مقروءة`), userMenu: "قائمة الحساب",
    myClinic: "عيادتي", helpTitle: "هل تحتاج إلى مساعدة؟", helpDesc: "عرض الأدلة والدعم",
    specialty: { capilar: "الشعر", plastica: "الجراحة التجميلية", dermatologia: "الأمراض الجلدية" },
  },
  zh: {
    nav: "首页", brandTagline: "临床照片记录",
    welcome: (n) => `欢迎，${n}`, welcomeNoName: "欢迎",
    subtitle: "在一个地方管理您的患者和临床照片记录。",
    quickTitle: "快捷入口", newPatientDesc: "创建临床档案",
    patientsTitle: "查看患者", patientsDesc: "列表和档案",
    reportDesc: "待处理阶段", phasesDesc: "拍照流程", copyAccess: "复制访问链接", copyAccessDesc: "发给患者的链接",
    statsTitle: "指标", totalPatients: "患者总数", photos: "已登记照片", thisMonth: "本月登记", professionals: "在职专业人员",
    change: (p) => `较上月 ${p}`, noData: "暂无数据",
    chartTitle: "照片活动", chartPatients: "新患者", chartPhotos: "照片",
    lastMonths: (n) => `最近 ${n} 个月`, chartRange: "图表时间范围", chartEmpty: "此期间暂无数据", chartMonth: "月份",
    activityTitle: "最近动态", seeAllActivity: "查看全部", activityEmpty: "暂无动态。照片、新患者和测量将显示在这里。",
    evPhotos: (n) => (n === 1 ? "已登记照片" : `已登记 ${n} 张照片`), evPatient: "新患者", evMeasured: "已保存测量", evDischarged: "医疗出院",
    recentTitle: "最近的患者", seeAll: "查看全部",
    emptyTitle: "还没有患者", emptyDesc: "添加第一位患者，或在“患者”中分享诊所链接。",
    error: "无法加载诊所数据。", retry: "重试",
    searchLabel: "搜索患者", notifications: (n) => (n === 0 ? "支持通知：没有未读" : `支持通知：${n} 条未读`), userMenu: "账户菜单",
    myClinic: "我的诊所", helpTitle: "需要帮助？", helpDesc: "查看手册和支持",
    specialty: { capilar: "毛发", plastica: "整形外科", dermatologia: "皮肤科" },
  },
};

/** «hace 3 días», «3 days ago»… en el idioma elegido. */
export function timeAgo(iso: string, lang: LangCode, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  for (const [unit, size] of units) if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  return rtf.format(Math.min(0, Math.round(seconds / 60)), "minute");
}

/**
 * Variación porcentual entre dos períodos, o null si no se puede calcular
 * (período anterior en cero o sin datos): en ese caso no se muestra el chip.
 */
export function percentChange(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Total acumulado al cierre de cada mes, a partir del total actual y lo nuevo de cada mes. */
export function cumulative(total: number, monthly: number[]): number[] {
  let after = 0;
  const out = new Array<number>(monthly.length);
  for (let i = monthly.length - 1; i >= 0; i -= 1) {
    out[i] = total - after;
    after += monthly[i]!;
  }
  return out;
}
