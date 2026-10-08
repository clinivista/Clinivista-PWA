// Textos de los correos y del mensaje de WhatsApp para pacientes, en los nueve idiomas de la aplicación.
export const MAIL_LANGUAGES = ["es", "en", "pt", "fr", "de", "it", "tr", "ar", "zh"] as const;
export type MailLanguage = (typeof MAIL_LANGUAGES)[number];

export function toMailLanguage(value: unknown): MailLanguage {
  return (MAIL_LANGUAGES as readonly string[]).includes(String(value)) ? (value as MailLanguage) : "es";
}

type MailText = {
  hello: (name?: string) => string;
  setupSubject: (clinic: string) => string;
  setupIntro: (clinic: string) => string;
  setupButton: string;
  resetSubject: string;
  resetIntro: string;
  resetButton: string;
  linkNote: (validity: string) => string;
  ignore: string;
  days7: string;
  hour1: string;
  resultsSubject: (clinic: string) => string;
  resultsIntro: (clinic: string) => string;
  resultsButton: string;
  resultsNote: string;
  whatsapp: (name: string, clinic: string, link: string) => string;
};

export const MAIL_TEXT: Record<MailLanguage, MailText> = {
  es: {
    hello: (n) => (n ? `Hola ${n},` : "Hola,"),
    setupSubject: (c) => `Crea tu clave - ${c}`,
    setupIntro: (c) => `Tu evaluación en ${c} quedó registrada. Crea tu clave para entrar a tu cuenta y ver tus resultados cuando estén listos.`,
    setupButton: "Crear mi clave",
    resetSubject: "Recupera tu clave - Clinivista",
    resetIntro: "Recibimos una solicitud para cambiar la clave de tu cuenta.",
    resetButton: "Cambiar mi clave",
    linkNote: (v) => `El enlace sirve una vez y vence en ${v}.`,
    ignore: "Si no fuiste tú, ignora este correo.",
    days7: "7 días", hour1: "1 hora",
    resultsSubject: (c) => `Sus resultados - ${c}`,
    resultsIntro: (c) => `El equipo médico de ${c} ya respondió a su evaluación.`,
    resultsButton: "Descargar mis resultados (PDF)",
    resultsNote: "El enlace estará disponible por 30 días.",
    whatsapp: (n, c, l) => `Hola ${n}, el equipo médico de ${c} ya respondió a su evaluación. Puede descargar sus resultados aquí: ${l}`,
  },
  en: {
    hello: (n) => (n ? `Hello ${n},` : "Hello,"),
    setupSubject: (c) => `Create your password - ${c}`,
    setupIntro: (c) => `Your evaluation at ${c} has been registered. Create your password to sign in to your account and see your results when they are ready.`,
    setupButton: "Create my password",
    resetSubject: "Recover your password - Clinivista",
    resetIntro: "We received a request to change your account password.",
    resetButton: "Change my password",
    linkNote: (v) => `The link works once and expires in ${v}.`,
    ignore: "If it was not you, ignore this email.",
    days7: "7 days", hour1: "1 hour",
    resultsSubject: (c) => `Your results - ${c}`,
    resultsIntro: (c) => `The medical team at ${c} has replied to your evaluation.`,
    resultsButton: "Download my results (PDF)",
    resultsNote: "The link will be available for 30 days.",
    whatsapp: (n, c, l) => `Hello ${n}, the medical team at ${c} has replied to your evaluation. You can download your results here: ${l}`,
  },
  pt: {
    hello: (n) => (n ? `Olá ${n},` : "Olá,"),
    setupSubject: (c) => `Crie sua senha - ${c}`,
    setupIntro: (c) => `Sua avaliação em ${c} foi registrada. Crie sua senha para entrar na sua conta e ver seus resultados quando estiverem prontos.`,
    setupButton: "Criar minha senha",
    resetSubject: "Recupere sua senha - Clinivista",
    resetIntro: "Recebemos uma solicitação para alterar a senha da sua conta.",
    resetButton: "Alterar minha senha",
    linkNote: (v) => `O link funciona uma vez e expira em ${v}.`,
    ignore: "Se não foi você, ignore este e-mail.",
    days7: "7 dias", hour1: "1 hora",
    resultsSubject: (c) => `Seus resultados - ${c}`,
    resultsIntro: (c) => `A equipe médica de ${c} já respondeu à sua avaliação.`,
    resultsButton: "Baixar meus resultados (PDF)",
    resultsNote: "O link ficará disponível por 30 dias.",
    whatsapp: (n, c, l) => `Olá ${n}, a equipe médica de ${c} já respondeu à sua avaliação. Você pode baixar seus resultados aqui: ${l}`,
  },
  fr: {
    hello: (n) => (n ? `Bonjour ${n},` : "Bonjour,"),
    setupSubject: (c) => `Créez votre mot de passe - ${c}`,
    setupIntro: (c) => `Votre évaluation chez ${c} a bien été enregistrée. Créez votre mot de passe pour accéder à votre compte et consulter vos résultats lorsqu'ils seront prêts.`,
    setupButton: "Créer mon mot de passe",
    resetSubject: "Récupérez votre mot de passe - Clinivista",
    resetIntro: "Nous avons reçu une demande de modification du mot de passe de votre compte.",
    resetButton: "Changer mon mot de passe",
    linkNote: (v) => `Le lien ne fonctionne qu'une fois et expire dans ${v}.`,
    ignore: "Si ce n'était pas vous, ignorez cet e-mail.",
    days7: "7 jours", hour1: "1 heure",
    resultsSubject: (c) => `Vos résultats - ${c}`,
    resultsIntro: (c) => `L'équipe médicale de ${c} a répondu à votre évaluation.`,
    resultsButton: "Télécharger mes résultats (PDF)",
    resultsNote: "Le lien sera disponible pendant 30 jours.",
    whatsapp: (n, c, l) => `Bonjour ${n}, l'équipe médicale de ${c} a répondu à votre évaluation. Vous pouvez télécharger vos résultats ici : ${l}`,
  },
  de: {
    hello: (n) => (n ? `Hallo ${n},` : "Hallo,"),
    setupSubject: (c) => `Passwort erstellen - ${c}`,
    setupIntro: (c) => `Ihre Untersuchung bei ${c} wurde registriert. Erstellen Sie Ihr Passwort, um sich in Ihrem Konto anzumelden und Ihre Ergebnisse zu sehen, sobald sie vorliegen.`,
    setupButton: "Mein Passwort erstellen",
    resetSubject: "Passwort zurücksetzen - Clinivista",
    resetIntro: "Wir haben eine Anfrage zum Ändern des Passworts Ihres Kontos erhalten.",
    resetButton: "Mein Passwort ändern",
    linkNote: (v) => `Der Link funktioniert einmal und läuft in ${v} ab.`,
    ignore: "Falls Sie das nicht waren, ignorieren Sie diese E-Mail.",
    days7: "7 Tagen", hour1: "1 Stunde",
    resultsSubject: (c) => `Ihre Ergebnisse - ${c}`,
    resultsIntro: (c) => `Das medizinische Team von ${c} hat auf Ihre Untersuchung geantwortet.`,
    resultsButton: "Meine Ergebnisse herunterladen (PDF)",
    resultsNote: "Der Link ist 30 Tage lang verfügbar.",
    whatsapp: (n, c, l) => `Hallo ${n}, das medizinische Team von ${c} hat auf Ihre Untersuchung geantwortet. Ihre Ergebnisse können Sie hier herunterladen: ${l}`,
  },
  it: {
    hello: (n) => (n ? `Ciao ${n},` : "Ciao,"),
    setupSubject: (c) => `Crea la tua password - ${c}`,
    setupIntro: (c) => `La tua valutazione presso ${c} è stata registrata. Crea la tua password per accedere al tuo account e vedere i risultati quando saranno pronti.`,
    setupButton: "Crea la mia password",
    resetSubject: "Recupera la tua password - Clinivista",
    resetIntro: "Abbiamo ricevuto una richiesta di modifica della password del tuo account.",
    resetButton: "Cambia la mia password",
    linkNote: (v) => `Il link funziona una sola volta e scade tra ${v}.`,
    ignore: "Se non sei stato tu, ignora questa e-mail.",
    days7: "7 giorni", hour1: "1 ora",
    resultsSubject: (c) => `I tuoi risultati - ${c}`,
    resultsIntro: (c) => `Il team medico di ${c} ha risposto alla tua valutazione.`,
    resultsButton: "Scarica i miei risultati (PDF)",
    resultsNote: "Il link sarà disponibile per 30 giorni.",
    whatsapp: (n, c, l) => `Ciao ${n}, il team medico di ${c} ha risposto alla tua valutazione. Puoi scaricare i tuoi risultati qui: ${l}`,
  },
  tr: {
    hello: (n) => (n ? `Merhaba ${n},` : "Merhaba,"),
    setupSubject: (c) => `Şifrenizi oluşturun - ${c}`,
    setupIntro: (c) => `${c} kliniğindeki değerlendirmeniz kaydedildi. Hesabınıza giriş yapmak ve hazır olduğunda sonuçlarınızı görmek için şifrenizi oluşturun.`,
    setupButton: "Şifremi oluştur",
    resetSubject: "Şifrenizi sıfırlayın - Clinivista",
    resetIntro: "Hesabınızın şifresini değiştirmek için bir talep aldık.",
    resetButton: "Şifremi değiştir",
    linkNote: (v) => `Bağlantı bir kez çalışır ve ${v} sonra geçerliliğini yitirir.`,
    ignore: "Bu işlemi siz yapmadıysanız bu e-postayı dikkate almayın.",
    days7: "7 gün", hour1: "1 saat",
    resultsSubject: (c) => `Sonuçlarınız - ${c}`,
    resultsIntro: (c) => `${c} tıbbi ekibi değerlendirmenize yanıt verdi.`,
    resultsButton: "Sonuçlarımı indir (PDF)",
    resultsNote: "Bağlantı 30 gün boyunca kullanılabilir.",
    whatsapp: (n, c, l) => `Merhaba ${n}, ${c} tıbbi ekibi değerlendirmenize yanıt verdi. Sonuçlarınızı buradan indirebilirsiniz: ${l}`,
  },
  ar: {
    hello: (n) => (n ? `مرحبًا ${n}،` : "مرحبًا،"),
    setupSubject: (c) => `أنشئ كلمة المرور - ${c}`,
    setupIntro: (c) => `تم تسجيل تقييمك في ${c}. أنشئ كلمة المرور لتدخل إلى حسابك وتطّلع على نتائجك عندما تكون جاهزة.`,
    setupButton: "إنشاء كلمة المرور",
    resetSubject: "استعادة كلمة المرور - Clinivista",
    resetIntro: "تلقّينا طلبًا لتغيير كلمة مرور حسابك.",
    resetButton: "تغيير كلمة المرور",
    linkNote: (v) => `يعمل الرابط مرة واحدة وتنتهي صلاحيته خلال ${v}.`,
    ignore: "إذا لم تكن أنت، فتجاهل هذه الرسالة.",
    days7: "7 أيام", hour1: "ساعة واحدة",
    resultsSubject: (c) => `نتائجك - ${c}`,
    resultsIntro: (c) => `ردّ الفريق الطبي في ${c} على تقييمك.`,
    resultsButton: "تنزيل نتائجي (PDF)",
    resultsNote: "سيبقى الرابط متاحًا لمدة 30 يومًا.",
    whatsapp: (n, c, l) => `مرحبًا ${n}، ردّ الفريق الطبي في ${c} على تقييمك. يمكنك تنزيل نتائجك من هنا: ${l}`,
  },
  zh: {
    hello: (n) => (n ? `${n}，您好：` : "您好："),
    setupSubject: (c) => `创建您的密码 - ${c}`,
    setupIntro: (c) => `您在 ${c} 的评估已登记。请创建密码以登录账户，并在结果准备好后查看。`,
    setupButton: "创建我的密码",
    resetSubject: "找回您的密码 - Clinivista",
    resetIntro: "我们收到了修改您账户密码的请求。",
    resetButton: "修改我的密码",
    linkNote: (v) => `该链接仅可使用一次，${v}后失效。`,
    ignore: "如果不是您本人操作，请忽略此邮件。",
    days7: "7 天", hour1: "1 小时",
    resultsSubject: (c) => `您的结果 - ${c}`,
    resultsIntro: (c) => `${c} 的医疗团队已回复您的评估。`,
    resultsButton: "下载我的结果（PDF）",
    resultsNote: "该链接 30 天内有效。",
    whatsapp: (n, c, l) => `${n}，您好：${c} 的医疗团队已回复您的评估。您可以在此下载结果：${l}`,
  },
};
