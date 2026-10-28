// Textos de la portada de app.clinivista.cl (portal de pacientes y clínicas), en los nueve idiomas.
import type { LangCode } from "./language";

export type PortalHomeText = {
  language: string;
  teamAccess: string;
  eyebrow: string;
  titleLead: string;
  titleAccent: string;
  subtitle: string;
  patientTitle: string;
  patientDesc: string;
  patientCta: string;
  /** Para no mandar pacientes a la clínica equivocada desde la raíz. */
  patientHint: string;
  resultsPrompt: string;
  resultsLink: string;
  teamTitle: string;
  teamDesc: string;
  teamCta: string;
  howTitle: string;
  steps: [[string, string], [string, string], [string, string]];
  disclaimer: string;
  privacy: string;
  terms: string;
  rights: string;
};

export const PORTAL_HOME_TEXT: Record<LangCode, PortalHomeText> = {
  es: {
    language: "Idioma", teamAccess: "Acceso equipo", eyebrow: "Portal de pacientes y clínicas",
    titleLead: "Tu registro clínico,", titleAccent: "paso a paso",
    subtitle: "Completa tu preevaluación y registra tus fotografías siguiendo las indicaciones de tu clínica.",
    patientTitle: "Soy paciente", patientDesc: "Inicia tu preevaluación y completa el registro fotográfico guiado.", patientCta: "Iniciar preevaluación",
    patientHint: "Usa el enlace que te envió tu clínica y sigue sus indicaciones.",
    resultsPrompt: "¿Ya tienes cuenta?", resultsLink: "Ver mis resultados",
    teamTitle: "Soy parte del equipo", teamDesc: "Accede al espacio de trabajo de tu clínica.", teamCta: "Acceder a mi clínica",
    howTitle: "Así funciona",
    steps: [["Completa tus datos", "Responde una breve preevaluación siguiendo las indicaciones de tu clínica."], ["Toma tus fotografías", "Sigue la guía visual para registrar tus fotografías de forma clara."], ["Tu clínica revisa tu registro", "Tu clínica analizará la información y las fotografías que ingresaste."]],
    disclaimer: "La preevaluación no reemplaza una consulta médica ni entrega un diagnóstico automático.",
    privacy: "Privacidad", terms: "Términos", rights: "Todos los derechos reservados.",
  },
  en: {
    language: "Language", teamAccess: "Team access", eyebrow: "Patient and clinic portal",
    titleLead: "Your clinical record,", titleAccent: "step by step",
    subtitle: "Complete your pre-evaluation and take your photos following your clinic's instructions.",
    patientTitle: "I'm a patient", patientDesc: "Start your pre-evaluation and complete the guided photo record.", patientCta: "Start pre-evaluation",
    patientHint: "Use the link your clinic sent you and follow its instructions.",
    resultsPrompt: "Already have an account?", resultsLink: "See my results",
    teamTitle: "I'm part of the team", teamDesc: "Go to your clinic's workspace.", teamCta: "Go to my clinic",
    howTitle: "How it works",
    steps: [["Fill in your details", "Answer a short pre-evaluation following your clinic's instructions."], ["Take your photos", "Follow the visual guide to take clear photos."], ["Your clinic reviews your record", "Your clinic will review the information and photos you submitted."]],
    disclaimer: "The pre-evaluation does not replace a medical consultation and does not give an automatic diagnosis.",
    privacy: "Privacy", terms: "Terms", rights: "All rights reserved.",
  },
  pt: {
    language: "Idioma", teamAccess: "Acesso da equipe", eyebrow: "Portal de pacientes e clínicas",
    titleLead: "Seu registro clínico,", titleAccent: "passo a passo",
    subtitle: "Complete sua pré-avaliação e registre suas fotografias seguindo as orientações da sua clínica.",
    patientTitle: "Sou paciente", patientDesc: "Inicie sua pré-avaliação e complete o registro fotográfico guiado.", patientCta: "Iniciar pré-avaliação",
    patientHint: "Use o link que sua clínica enviou e siga as orientações dela.",
    resultsPrompt: "Já tem conta?", resultsLink: "Ver meus resultados",
    teamTitle: "Faço parte da equipe", teamDesc: "Acesse o espaço de trabalho da sua clínica.", teamCta: "Acessar minha clínica",
    howTitle: "Como funciona",
    steps: [["Preencha seus dados", "Responda a uma breve pré-avaliação seguindo as orientações da sua clínica."], ["Tire suas fotografias", "Siga o guia visual para registrar suas fotografias com clareza."], ["Sua clínica revisa seu registro", "Sua clínica analisará as informações e as fotografias que você enviou."]],
    disclaimer: "A pré-avaliação não substitui uma consulta médica nem fornece um diagnóstico automático.",
    privacy: "Privacidade", terms: "Termos", rights: "Todos os direitos reservados.",
  },
  fr: {
    language: "Langue", teamAccess: "Accès équipe", eyebrow: "Portail des patients et des cliniques",
    titleLead: "Votre dossier clinique,", titleAccent: "étape par étape",
    subtitle: "Complétez votre préévaluation et prenez vos photos en suivant les indications de votre clinique.",
    patientTitle: "Je suis patient", patientDesc: "Commencez votre préévaluation et complétez le dossier photo guidé.", patientCta: "Commencer la préévaluation",
    patientHint: "Utilisez le lien envoyé par votre clinique et suivez ses indications.",
    resultsPrompt: "Vous avez déjà un compte ?", resultsLink: "Voir mes résultats",
    teamTitle: "Je fais partie de l'équipe", teamDesc: "Accédez à l'espace de travail de votre clinique.", teamCta: "Accéder à ma clinique",
    howTitle: "Comment ça marche",
    steps: [["Renseignez vos données", "Répondez à une courte préévaluation selon les indications de votre clinique."], ["Prenez vos photos", "Suivez le guide visuel pour prendre des photos nettes."], ["Votre clinique examine votre dossier", "Votre clinique analysera les informations et les photos que vous avez envoyées."]],
    disclaimer: "La préévaluation ne remplace pas une consultation médicale et ne fournit pas de diagnostic automatique.",
    privacy: "Confidentialité", terms: "Conditions", rights: "Tous droits réservés.",
  },
  de: {
    language: "Sprache", teamAccess: "Teamzugang", eyebrow: "Portal für Patienten und Kliniken",
    titleLead: "Ihre klinische Dokumentation,", titleAccent: "Schritt für Schritt",
    subtitle: "Füllen Sie Ihre Voruntersuchung aus und machen Sie Ihre Fotos nach den Hinweisen Ihrer Klinik.",
    patientTitle: "Ich bin Patient", patientDesc: "Starten Sie Ihre Voruntersuchung und erstellen Sie die geführte Fotodokumentation.", patientCta: "Voruntersuchung starten",
    patientHint: "Nutzen Sie den Link, den Ihnen Ihre Klinik geschickt hat, und folgen Sie ihren Hinweisen.",
    resultsPrompt: "Sie haben schon ein Konto?", resultsLink: "Meine Ergebnisse ansehen",
    teamTitle: "Ich gehöre zum Team", teamDesc: "Zum Arbeitsbereich Ihrer Klinik.", teamCta: "Zu meiner Klinik",
    howTitle: "So funktioniert es",
    steps: [["Daten ausfüllen", "Beantworten Sie eine kurze Voruntersuchung nach den Hinweisen Ihrer Klinik."], ["Fotos machen", "Folgen Sie der visuellen Anleitung für klare Fotos."], ["Ihre Klinik prüft Ihre Angaben", "Ihre Klinik prüft die Angaben und Fotos, die Sie gesendet haben."]],
    disclaimer: "Die Voruntersuchung ersetzt keinen Arztbesuch und liefert keine automatische Diagnose.",
    privacy: "Datenschutz", terms: "Bedingungen", rights: "Alle Rechte vorbehalten.",
  },
  it: {
    language: "Lingua", teamAccess: "Accesso team", eyebrow: "Portale per pazienti e cliniche",
    titleLead: "La tua documentazione clinica,", titleAccent: "passo dopo passo",
    subtitle: "Completa la tua pre-valutazione e scatta le tue foto seguendo le indicazioni della tua clinica.",
    patientTitle: "Sono un paziente", patientDesc: "Inizia la pre-valutazione e completa la documentazione fotografica guidata.", patientCta: "Inizia la pre-valutazione",
    patientHint: "Usa il link che ti ha inviato la tua clinica e segui le sue indicazioni.",
    resultsPrompt: "Hai già un account?", resultsLink: "Vedi i miei risultati",
    teamTitle: "Faccio parte del team", teamDesc: "Accedi allo spazio di lavoro della tua clinica.", teamCta: "Accedi alla mia clinica",
    howTitle: "Come funziona",
    steps: [["Inserisci i tuoi dati", "Rispondi a una breve pre-valutazione seguendo le indicazioni della tua clinica."], ["Scatta le tue foto", "Segui la guida visiva per scattare foto nitide."], ["La tua clinica esamina la documentazione", "La tua clinica analizzerà le informazioni e le foto che hai inviato."]],
    disclaimer: "La pre-valutazione non sostituisce una visita medica e non fornisce una diagnosi automatica.",
    privacy: "Privacy", terms: "Termini", rights: "Tutti i diritti riservati.",
  },
  tr: {
    language: "Dil", teamAccess: "Ekip girişi", eyebrow: "Hasta ve klinik portalı",
    titleLead: "Klinik kaydınız,", titleAccent: "adım adım",
    subtitle: "Kliniğinizin yönergelerini izleyerek ön değerlendirmenizi tamamlayın ve fotoğraflarınızı çekin.",
    patientTitle: "Hastayım", patientDesc: "Ön değerlendirmenizi başlatın ve yönlendirmeli fotoğraf kaydını tamamlayın.", patientCta: "Ön değerlendirmeyi başlat",
    patientHint: "Kliniğinizin gönderdiği bağlantıyı kullanın ve yönergelerini izleyin.",
    resultsPrompt: "Hesabınız var mı?", resultsLink: "Sonuçlarımı gör",
    teamTitle: "Ekibin bir parçasıyım", teamDesc: "Kliniğinizin çalışma alanına girin.", teamCta: "Kliniğime gir",
    howTitle: "Nasıl çalışır",
    steps: [["Bilgilerinizi doldurun", "Kliniğinizin yönergelerine göre kısa bir ön değerlendirmeyi yanıtlayın."], ["Fotoğraflarınızı çekin", "Net fotoğraflar için görsel rehberi izleyin."], ["Kliniğiniz kaydınızı inceler", "Kliniğiniz gönderdiğiniz bilgileri ve fotoğrafları inceleyecektir."]],
    disclaimer: "Ön değerlendirme tıbbi muayenenin yerini tutmaz ve otomatik teşhis koymaz.",
    privacy: "Gizlilik", terms: "Koşullar", rights: "Tüm hakları saklıdır.",
  },
  ar: {
    language: "اللغة", teamAccess: "دخول الفريق", eyebrow: "بوابة المرضى والعيادات",
    titleLead: "سجلك السريري،", titleAccent: "خطوة بخطوة",
    subtitle: "أكمل تقييمك المسبق والتقط صورك وفق تعليمات عيادتك.",
    patientTitle: "أنا مريض", patientDesc: "ابدأ تقييمك المسبق وأكمل التسجيل المصوّر الموجَّه.", patientCta: "ابدأ التقييم المسبق",
    patientHint: "استخدم الرابط الذي أرسلته لك عيادتك واتبع تعليماتها.",
    resultsPrompt: "هل لديك حساب؟", resultsLink: "عرض نتائجي",
    teamTitle: "أنا من فريق العمل", teamDesc: "ادخل إلى مساحة عمل عيادتك.", teamCta: "الدخول إلى عيادتي",
    howTitle: "كيف يعمل",
    steps: [["أدخل بياناتك", "أجب عن تقييم مسبق قصير وفق تعليمات عيادتك."], ["التقط صورك", "اتبع الدليل المرئي لالتقاط صور واضحة."], ["عيادتك تراجع سجلك", "ستراجع عيادتك المعلومات والصور التي أرسلتها."]],
    disclaimer: "لا يغني التقييم المسبق عن الاستشارة الطبية ولا يقدّم تشخيصًا تلقائيًا.",
    privacy: "الخصوصية", terms: "الشروط", rights: "جميع الحقوق محفوظة.",
  },
  zh: {
    language: "语言", teamAccess: "团队登录", eyebrow: "患者与诊所门户",
    titleLead: "您的临床记录，", titleAccent: "一步一步完成",
    subtitle: "按照诊所的指引完成预评估并拍摄照片。",
    patientTitle: "我是患者", patientDesc: "开始预评估，并完成引导式照片记录。", patientCta: "开始预评估",
    patientHint: "请使用诊所发给您的链接，并按照诊所的指引操作。",
    resultsPrompt: "已有账户？", resultsLink: "查看我的结果",
    teamTitle: "我是团队成员", teamDesc: "进入您诊所的工作区。", teamCta: "进入我的诊所",
    howTitle: "使用流程",
    steps: [["填写资料", "按照诊所的指引回答一份简短的预评估。"], ["拍摄照片", "按照图示指引拍摄清晰的照片。"], ["诊所审核您的记录", "您的诊所将审核您提交的信息和照片。"]],
    disclaimer: "预评估不能替代面诊，也不会给出自动诊断。",
    privacy: "隐私", terms: "条款", rights: "版权所有。",
  },
};
