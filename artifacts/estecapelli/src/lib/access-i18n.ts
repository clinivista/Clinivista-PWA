// Textos del acceso del equipo (/admin/login) y de la entrada por clínica (/c/:slug), en los nueve idiomas.
import type { LangCode } from "./language";

export type AccessText = {
  language: string;
  loading: string;
  loginTitle: string;
  loginSub: string;
  loginCta: string;
  back: string;
  welcomeLead: string;
  welcomeAccent: string;
  welcomeSub: string;
  start: string;
  steps: [string, string, string];
  disclaimer: string;
  platform: string;
  notFoundTitle: string;
  notFoundDesc: string;
  errorTitle: string;
  errorDesc: string;
  retry: string;
  goHome: string;
};

export const ACCESS_TEXT: Record<LangCode, AccessText> = {
  es: {
    language: "Idioma", loading: "Cargando",
    loginTitle: "Accede a tu clínica", loginSub: "Ingresa con tu cuenta del equipo.", loginCta: "Iniciar sesión", back: "Volver al inicio",
    welcomeLead: "Bienvenido a tu", welcomeAccent: "preevaluación", welcomeSub: "Completa tus datos y sigue la guía para registrar tus fotografías.",
    start: "Iniciar preevaluación", steps: ["Tus datos", "Fotografías guiadas", "Revisión por tu clínica"],
    disclaimer: "No reemplaza una consulta médica ni entrega un diagnóstico automático.", platform: "Plataforma Clinivista",
    notFoundTitle: "No encontramos esta clínica", notFoundDesc: "Revisa que la dirección esté bien escrita o pide el enlace correcto a tu clínica.",
    errorTitle: "No pudimos cargar esta clínica", errorDesc: "Revisa tu conexión e inténtalo de nuevo.", retry: "Reintentar", goHome: "Ir a la portada",
  },
  en: {
    language: "Language", loading: "Loading",
    loginTitle: "Sign in to your clinic", loginSub: "Use your team account.", loginCta: "Sign in", back: "Back to home",
    welcomeLead: "Welcome to your", welcomeAccent: "pre-evaluation", welcomeSub: "Fill in your details and follow the guide to take your photos.",
    start: "Start pre-evaluation", steps: ["Your details", "Guided photos", "Review by your clinic"],
    disclaimer: "It does not replace a medical consultation and does not give an automatic diagnosis.", platform: "Clinivista platform",
    notFoundTitle: "We couldn't find this clinic", notFoundDesc: "Check that the address is spelled correctly or ask your clinic for the right link.",
    errorTitle: "We couldn't load this clinic", errorDesc: "Check your connection and try again.", retry: "Try again", goHome: "Go to the home page",
  },
  pt: {
    language: "Idioma", loading: "Carregando",
    loginTitle: "Acesse sua clínica", loginSub: "Entre com sua conta da equipe.", loginCta: "Entrar", back: "Voltar ao início",
    welcomeLead: "Bem-vindo à sua", welcomeAccent: "pré-avaliação", welcomeSub: "Preencha seus dados e siga o guia para registrar suas fotografias.",
    start: "Iniciar pré-avaliação", steps: ["Seus dados", "Fotografias guiadas", "Revisão pela sua clínica"],
    disclaimer: "Não substitui uma consulta médica nem fornece um diagnóstico automático.", platform: "Plataforma Clinivista",
    notFoundTitle: "Não encontramos esta clínica", notFoundDesc: "Verifique se o endereço está correto ou peça o link certo à sua clínica.",
    errorTitle: "Não foi possível carregar esta clínica", errorDesc: "Verifique sua conexão e tente novamente.", retry: "Tentar novamente", goHome: "Ir para a página inicial",
  },
  fr: {
    language: "Langue", loading: "Chargement",
    loginTitle: "Accédez à votre clinique", loginSub: "Connectez-vous avec votre compte d'équipe.", loginCta: "Se connecter", back: "Retour à l'accueil",
    welcomeLead: "Bienvenue dans votre", welcomeAccent: "préévaluation", welcomeSub: "Renseignez vos données et suivez le guide pour prendre vos photos.",
    start: "Commencer la préévaluation", steps: ["Vos données", "Photos guidées", "Examen par votre clinique"],
    disclaimer: "Ne remplace pas une consultation médicale et ne fournit pas de diagnostic automatique.", platform: "Plateforme Clinivista",
    notFoundTitle: "Nous ne trouvons pas cette clinique", notFoundDesc: "Vérifiez l'adresse ou demandez le bon lien à votre clinique.",
    errorTitle: "Impossible de charger cette clinique", errorDesc: "Vérifiez votre connexion et réessayez.", retry: "Réessayer", goHome: "Aller à l'accueil",
  },
  de: {
    language: "Sprache", loading: "Wird geladen",
    loginTitle: "Bei Ihrer Klinik anmelden", loginSub: "Melden Sie sich mit Ihrem Teamkonto an.", loginCta: "Anmelden", back: "Zurück zur Startseite",
    welcomeLead: "Willkommen zu Ihrer", welcomeAccent: "Voruntersuchung", welcomeSub: "Füllen Sie Ihre Daten aus und folgen Sie der Anleitung für Ihre Fotos.",
    start: "Voruntersuchung starten", steps: ["Ihre Daten", "Geführte Fotos", "Prüfung durch Ihre Klinik"],
    disclaimer: "Ersetzt keinen Arztbesuch und liefert keine automatische Diagnose.", platform: "Clinivista-Plattform",
    notFoundTitle: "Diese Klinik wurde nicht gefunden", notFoundDesc: "Prüfen Sie die Adresse oder fragen Sie Ihre Klinik nach dem richtigen Link.",
    errorTitle: "Diese Klinik konnte nicht geladen werden", errorDesc: "Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.", retry: "Erneut versuchen", goHome: "Zur Startseite",
  },
  it: {
    language: "Lingua", loading: "Caricamento",
    loginTitle: "Accedi alla tua clinica", loginSub: "Entra con il tuo account del team.", loginCta: "Accedi", back: "Torna all'inizio",
    welcomeLead: "Benvenuto nella tua", welcomeAccent: "pre-valutazione", welcomeSub: "Inserisci i tuoi dati e segui la guida per scattare le tue foto.",
    start: "Inizia la pre-valutazione", steps: ["I tuoi dati", "Foto guidate", "Revisione della tua clinica"],
    disclaimer: "Non sostituisce una visita medica e non fornisce una diagnosi automatica.", platform: "Piattaforma Clinivista",
    notFoundTitle: "Non troviamo questa clinica", notFoundDesc: "Controlla che l'indirizzo sia corretto o chiedi il link giusto alla tua clinica.",
    errorTitle: "Impossibile caricare questa clinica", errorDesc: "Controlla la connessione e riprova.", retry: "Riprova", goHome: "Vai alla home",
  },
  tr: {
    language: "Dil", loading: "Yükleniyor",
    loginTitle: "Kliniğinize giriş yapın", loginSub: "Ekip hesabınızla giriş yapın.", loginCta: "Giriş yap", back: "Ana sayfaya dön",
    welcomeLead: "Ön değerlendirmenize", welcomeAccent: "hoş geldiniz", welcomeSub: "Bilgilerinizi doldurun ve fotoğraflarınızı çekmek için rehberi izleyin.",
    start: "Ön değerlendirmeyi başlat", steps: ["Bilgileriniz", "Yönlendirmeli fotoğraflar", "Kliniğinizin incelemesi"],
    disclaimer: "Tıbbi muayenenin yerini tutmaz ve otomatik teşhis koymaz.", platform: "Clinivista platformu",
    notFoundTitle: "Bu kliniği bulamadık", notFoundDesc: "Adresin doğru yazıldığını kontrol edin veya kliniğinizden doğru bağlantıyı isteyin.",
    errorTitle: "Bu klinik yüklenemedi", errorDesc: "Bağlantınızı kontrol edip tekrar deneyin.", retry: "Tekrar dene", goHome: "Ana sayfaya git",
  },
  ar: {
    language: "اللغة", loading: "جارٍ التحميل",
    loginTitle: "ادخل إلى عيادتك", loginSub: "سجّل الدخول بحساب فريق العمل.", loginCta: "تسجيل الدخول", back: "العودة إلى البداية",
    welcomeLead: "مرحبًا بك في", welcomeAccent: "تقييمك المسبق", welcomeSub: "أكمل بياناتك واتبع الدليل لالتقاط صورك.",
    start: "ابدأ التقييم المسبق", steps: ["بياناتك", "صور موجَّهة", "مراجعة عيادتك"],
    disclaimer: "لا يغني عن الاستشارة الطبية ولا يقدّم تشخيصًا تلقائيًا.", platform: "منصة كلينفيستا",
    notFoundTitle: "لم نعثر على هذه العيادة", notFoundDesc: "تأكد من كتابة العنوان بشكل صحيح أو اطلب الرابط الصحيح من عيادتك.",
    errorTitle: "تعذّر تحميل هذه العيادة", errorDesc: "تحقق من اتصالك وحاول مرة أخرى.", retry: "إعادة المحاولة", goHome: "الذهاب إلى الصفحة الرئيسية",
  },
  zh: {
    language: "语言", loading: "加载中",
    loginTitle: "登录您的诊所", loginSub: "使用团队账户登录。", loginCta: "登录", back: "返回首页",
    welcomeLead: "欢迎进行", welcomeAccent: "预评估", welcomeSub: "填写资料，并按照指引拍摄照片。",
    start: "开始预评估", steps: ["您的资料", "引导式拍照", "诊所审核"],
    disclaimer: "不能替代面诊，也不会给出自动诊断。", platform: "Clinivista 平台",
    notFoundTitle: "找不到这家诊所", notFoundDesc: "请检查地址是否正确，或向诊所索取正确的链接。",
    errorTitle: "无法加载这家诊所", errorDesc: "请检查网络连接后重试。", retry: "重试", goHome: "前往首页",
  },
};
