import type { LangCode } from "./language";

// Textos del portal del paciente (/paciente) en los nueve idiomas de la aplicación.
export type PortalText = {
  loading: string;
  loginTitle: string;
  googleButton: string;
  emailLabel: string;
  passwordLabel: string;
  enter: string;
  forgot: string;
  forgotSent: string;
  homeTitle: string;
  signedInAs: string;
  noCases: string;
  noResults: string;
  resultsOn: string;
  logout: string;
  googleError: string;
  googleOff: string;
  loginWrong: string;
  tooMany: string;
  genericError: string;
  setupTitle: string;
  newPassword: string;
  repeatPassword: string;
  mismatch: string;
  savePassword: string;
  invalidLink: string;
  requestNew: string;
  privacy: string;
  terms: string;
  language: string;
};

export const PORTAL_TEXT: Record<LangCode, PortalText> = {
  es: {
    loading: "Cargando", loginTitle: "Entrar a mi cuenta", googleButton: "Continuar con Google",
    emailLabel: "Correo electrónico", passwordLabel: "Clave", enter: "Entrar",
    forgot: "Crear o recuperar mi clave",
    forgotSent: "Si el correo tiene una cuenta, te enviamos un enlace para crear o cambiar tu clave.",
    homeTitle: "Mis resultados", signedInAs: "Sesión iniciada como",
    noCases: "Aún no tienes evaluaciones registradas con este correo.",
    noResults: "Todavía no hay resultados. Aparecerán aquí cuando el equipo médico responda.",
    resultsOn: "Resultados", logout: "Cerrar sesión",
    googleError: "No pudimos entrar con Google. Inténtalo de nuevo.",
    googleOff: "El acceso con Google aún no está disponible.",
    loginWrong: "Correo o clave incorrectos.", tooMany: "Demasiados intentos. Espera unos minutos.",
    genericError: "No pudimos completar la acción. Inténtalo de nuevo.",
    setupTitle: "Crea tu clave", newPassword: "Nueva clave (mínimo 8 caracteres)", repeatPassword: "Repite la clave",
    mismatch: "Las claves no coinciden.", savePassword: "Guardar clave",
    invalidLink: "Este enlace ya no es válido.", requestNew: "Pedir un enlace nuevo",
    privacy: "Política de privacidad", terms: "Términos de servicio", language: "Idioma",
  },
  en: {
    loading: "Loading", loginTitle: "Sign in to my account", googleButton: "Continue with Google",
    emailLabel: "Email address", passwordLabel: "Password", enter: "Sign in",
    forgot: "Create or recover my password",
    forgotSent: "If the email has an account, we sent you a link to create or change your password.",
    homeTitle: "My results", signedInAs: "Signed in as",
    noCases: "You have no evaluations registered with this email yet.",
    noResults: "There are no results yet. They will appear here when the medical team replies.",
    resultsOn: "Results", logout: "Sign out",
    googleError: "We could not sign you in with Google. Please try again.",
    googleOff: "Google sign-in is not available yet.",
    loginWrong: "Wrong email or password.", tooMany: "Too many attempts. Please wait a few minutes.",
    genericError: "We could not complete the action. Please try again.",
    setupTitle: "Create your password", newPassword: "New password (at least 8 characters)", repeatPassword: "Repeat the password",
    mismatch: "The passwords do not match.", savePassword: "Save password",
    invalidLink: "This link is no longer valid.", requestNew: "Request a new link",
    privacy: "Privacy policy", terms: "Terms of service", language: "Language",
  },
  pt: {
    loading: "Carregando", loginTitle: "Entrar na minha conta", googleButton: "Continuar com o Google",
    emailLabel: "E-mail", passwordLabel: "Senha", enter: "Entrar",
    forgot: "Criar ou recuperar minha senha",
    forgotSent: "Se o e-mail tiver uma conta, enviamos um link para criar ou alterar a sua senha.",
    homeTitle: "Meus resultados", signedInAs: "Sessão iniciada como",
    noCases: "Você ainda não tem avaliações registradas com este e-mail.",
    noResults: "Ainda não há resultados. Eles aparecerão aqui quando a equipe médica responder.",
    resultsOn: "Resultados", logout: "Sair",
    googleError: "Não foi possível entrar com o Google. Tente novamente.",
    googleOff: "O acesso com o Google ainda não está disponível.",
    loginWrong: "E-mail ou senha incorretos.", tooMany: "Muitas tentativas. Aguarde alguns minutos.",
    genericError: "Não foi possível concluir a ação. Tente novamente.",
    setupTitle: "Crie sua senha", newPassword: "Nova senha (mínimo de 8 caracteres)", repeatPassword: "Repita a senha",
    mismatch: "As senhas não coincidem.", savePassword: "Salvar senha",
    invalidLink: "Este link não é mais válido.", requestNew: "Pedir um novo link",
    privacy: "Política de privacidade", terms: "Termos de serviço", language: "Idioma",
  },
  fr: {
    loading: "Chargement", loginTitle: "Accéder à mon compte", googleButton: "Continuer avec Google",
    emailLabel: "Adresse e-mail", passwordLabel: "Mot de passe", enter: "Se connecter",
    forgot: "Créer ou récupérer mon mot de passe",
    forgotSent: "Si l'adresse correspond à un compte, nous vous avons envoyé un lien pour créer ou modifier votre mot de passe.",
    homeTitle: "Mes résultats", signedInAs: "Connecté en tant que",
    noCases: "Vous n'avez encore aucune évaluation enregistrée avec cette adresse.",
    noResults: "Il n'y a pas encore de résultats. Ils apparaîtront ici lorsque l'équipe médicale aura répondu.",
    resultsOn: "Résultats", logout: "Se déconnecter",
    googleError: "Impossible de vous connecter avec Google. Veuillez réessayer.",
    googleOff: "La connexion avec Google n'est pas encore disponible.",
    loginWrong: "Adresse e-mail ou mot de passe incorrect.", tooMany: "Trop de tentatives. Patientez quelques minutes.",
    genericError: "Impossible de terminer l'action. Veuillez réessayer.",
    setupTitle: "Créez votre mot de passe", newPassword: "Nouveau mot de passe (8 caractères minimum)", repeatPassword: "Répétez le mot de passe",
    mismatch: "Les mots de passe ne correspondent pas.", savePassword: "Enregistrer le mot de passe",
    invalidLink: "Ce lien n'est plus valide.", requestNew: "Demander un nouveau lien",
    privacy: "Politique de confidentialité", terms: "Conditions d'utilisation", language: "Langue",
  },
  de: {
    loading: "Wird geladen", loginTitle: "In mein Konto einloggen", googleButton: "Weiter mit Google",
    emailLabel: "E-Mail-Adresse", passwordLabel: "Passwort", enter: "Einloggen",
    forgot: "Passwort erstellen oder zurücksetzen",
    forgotSent: "Wenn die E-Mail-Adresse ein Konto hat, haben wir Ihnen einen Link zum Erstellen oder Ändern Ihres Passworts gesendet.",
    homeTitle: "Meine Ergebnisse", signedInAs: "Angemeldet als",
    noCases: "Mit dieser E-Mail-Adresse sind noch keine Untersuchungen registriert.",
    noResults: "Es liegen noch keine Ergebnisse vor. Sie erscheinen hier, sobald das medizinische Team geantwortet hat.",
    resultsOn: "Ergebnisse", logout: "Abmelden",
    googleError: "Die Anmeldung mit Google ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
    googleOff: "Die Anmeldung mit Google ist noch nicht verfügbar.",
    loginWrong: "E-Mail oder Passwort falsch.", tooMany: "Zu viele Versuche. Bitte warten Sie einige Minuten.",
    genericError: "Die Aktion konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
    setupTitle: "Passwort erstellen", newPassword: "Neues Passwort (mindestens 8 Zeichen)", repeatPassword: "Passwort wiederholen",
    mismatch: "Die Passwörter stimmen nicht überein.", savePassword: "Passwort speichern",
    invalidLink: "Dieser Link ist nicht mehr gültig.", requestNew: "Neuen Link anfordern",
    privacy: "Datenschutzerklärung", terms: "Nutzungsbedingungen", language: "Sprache",
  },
  it: {
    loading: "Caricamento", loginTitle: "Accedi al mio account", googleButton: "Continua con Google",
    emailLabel: "Indirizzo e-mail", passwordLabel: "Password", enter: "Accedi",
    forgot: "Crea o recupera la mia password",
    forgotSent: "Se l'e-mail ha un account, ti abbiamo inviato un link per creare o cambiare la password.",
    homeTitle: "I miei risultati", signedInAs: "Accesso effettuato come",
    noCases: "Non hai ancora valutazioni registrate con questa e-mail.",
    noResults: "Non ci sono ancora risultati. Compariranno qui quando il team medico risponderà.",
    resultsOn: "Risultati", logout: "Esci",
    googleError: "Non è stato possibile accedere con Google. Riprova.",
    googleOff: "L'accesso con Google non è ancora disponibile.",
    loginWrong: "E-mail o password errate.", tooMany: "Troppi tentativi. Attendi qualche minuto.",
    genericError: "Non è stato possibile completare l'azione. Riprova.",
    setupTitle: "Crea la tua password", newPassword: "Nuova password (almeno 8 caratteri)", repeatPassword: "Ripeti la password",
    mismatch: "Le password non coincidono.", savePassword: "Salva password",
    invalidLink: "Questo link non è più valido.", requestNew: "Richiedi un nuovo link",
    privacy: "Informativa sulla privacy", terms: "Termini di servizio", language: "Lingua",
  },
  tr: {
    loading: "Yükleniyor", loginTitle: "Hesabıma giriş yap", googleButton: "Google ile devam et",
    emailLabel: "E-posta adresi", passwordLabel: "Şifre", enter: "Giriş yap",
    forgot: "Şifremi oluştur veya sıfırla",
    forgotSent: "E-posta adresinin bir hesabı varsa, şifrenizi oluşturmanız veya değiştirmeniz için bir bağlantı gönderdik.",
    homeTitle: "Sonuçlarım", signedInAs: "Şu hesapla giriş yapıldı:",
    noCases: "Bu e-posta ile kayıtlı henüz bir değerlendirmeniz yok.",
    noResults: "Henüz sonuç yok. Tıbbi ekip yanıt verdiğinde burada görünecek.",
    resultsOn: "Sonuçlar", logout: "Çıkış yap",
    googleError: "Google ile giriş yapılamadı. Lütfen tekrar deneyin.",
    googleOff: "Google ile giriş henüz kullanılamıyor.",
    loginWrong: "E-posta veya şifre hatalı.", tooMany: "Çok fazla deneme. Lütfen birkaç dakika bekleyin.",
    genericError: "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
    setupTitle: "Şifrenizi oluşturun", newPassword: "Yeni şifre (en az 8 karakter)", repeatPassword: "Şifreyi tekrarlayın",
    mismatch: "Şifreler eşleşmiyor.", savePassword: "Şifreyi kaydet",
    invalidLink: "Bu bağlantı artık geçerli değil.", requestNew: "Yeni bağlantı iste",
    privacy: "Gizlilik politikası", terms: "Hizmet şartları", language: "Dil",
  },
  ar: {
    loading: "جارٍ التحميل", loginTitle: "الدخول إلى حسابي", googleButton: "المتابعة باستخدام Google",
    emailLabel: "البريد الإلكتروني", passwordLabel: "كلمة المرور", enter: "دخول",
    forgot: "إنشاء كلمة المرور أو استعادتها",
    forgotSent: "إذا كان لهذا البريد حساب، فقد أرسلنا إليك رابطًا لإنشاء كلمة المرور أو تغييرها.",
    homeTitle: "نتائجي", signedInAs: "تم تسجيل الدخول باسم",
    noCases: "لا توجد لديك تقييمات مسجّلة بهذا البريد الإلكتروني بعد.",
    noResults: "لا توجد نتائج بعد. ستظهر هنا عندما يرد الفريق الطبي.",
    resultsOn: "النتائج", logout: "تسجيل الخروج",
    googleError: "تعذّر الدخول باستخدام Google. حاول مرة أخرى.",
    googleOff: "الدخول باستخدام Google غير متاح بعد.",
    loginWrong: "البريد الإلكتروني أو كلمة المرور غير صحيحة.", tooMany: "محاولات كثيرة. انتظر بضع دقائق.",
    genericError: "تعذّر إكمال الإجراء. حاول مرة أخرى.",
    setupTitle: "أنشئ كلمة المرور", newPassword: "كلمة مرور جديدة (8 أحرف على الأقل)", repeatPassword: "أعد كتابة كلمة المرور",
    mismatch: "كلمتا المرور غير متطابقتين.", savePassword: "حفظ كلمة المرور",
    invalidLink: "هذا الرابط لم يعد صالحًا.", requestNew: "اطلب رابطًا جديدًا",
    privacy: "سياسة الخصوصية", terms: "شروط الخدمة", language: "اللغة",
  },
  zh: {
    loading: "加载中", loginTitle: "登录我的账户", googleButton: "使用 Google 继续",
    emailLabel: "电子邮件", passwordLabel: "密码", enter: "登录",
    forgot: "创建或找回我的密码",
    forgotSent: "如果该邮箱已有账户，我们已向您发送创建或修改密码的链接。",
    homeTitle: "我的结果", signedInAs: "当前登录账户：",
    noCases: "您尚未用此邮箱登记任何评估。",
    noResults: "暂无结果。医疗团队回复后将显示在这里。",
    resultsOn: "结果", logout: "退出登录",
    googleError: "无法使用 Google 登录，请重试。",
    googleOff: "Google 登录暂不可用。",
    loginWrong: "邮箱或密码错误。", tooMany: "尝试次数过多，请稍等几分钟。",
    genericError: "无法完成操作，请重试。",
    setupTitle: "创建您的密码", newPassword: "新密码（至少 8 个字符）", repeatPassword: "再次输入密码",
    mismatch: "两次输入的密码不一致。", savePassword: "保存密码",
    invalidLink: "此链接已失效。", requestNew: "获取新链接",
    privacy: "隐私政策", terms: "服务条款", language: "语言",
  },
};
