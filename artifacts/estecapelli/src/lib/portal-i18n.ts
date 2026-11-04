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
  firstTimeHint: string;
  recoverTitle: string;
  recoverIntro: string;
  recoverSend: string;
  recoverSentTitle: string;
  recoverSentBody: string;
  recoverLatest: string;
  recoverResend: string;
  recoverWait: string;
  recoverThrottled: string;
  recoverNoMail: string;
  recoverBack: string;
  invalidLinkLong: string;
  passwordCreated: string;
  accountWhy: string;
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
    firstTimeHint: "¿Primera vez? Al terminar tu evaluación te enviamos un correo para crear tu clave. Si no lo encuentras, pide otro aquí.", recoverTitle: "Crear o recuperar mi clave", recoverIntro: "Escribe el correo con el que hiciste tu evaluación. Te enviaremos un enlace para crear tu clave (si es tu primera vez) o para cambiarla.", recoverSend: "Enviarme el enlace", recoverSentTitle: "Revisa tu correo", recoverSentBody: "Si {email} tiene una cuenta, te enviamos un enlace. Puede tardar unos minutos. Revisa también la carpeta de correo no deseado (spam).", recoverLatest: "Usa siempre el último correo que recibas: cada correo nuevo deja sin efecto al anterior.", recoverResend: "Enviar otro correo", recoverWait: "Podrás pedir otro en {s} segundos.", recoverThrottled: "Ya pediste varios enlaces seguidos y por eso no enviamos otro. Usa el último correo que recibiste o espera unos 15 minutos para pedir uno nuevo.", recoverNoMail: "¿Sigue sin llegar? Revisa que el correo esté bien escrito o avisa a tu clínica.", recoverBack: "Volver a entrar", invalidLinkLong: "Este enlace ya no sirve: venció, ya se usó o pediste un correo más nuevo. Pide uno nuevo y usa el último que recibas.", passwordCreated: "Tu clave quedó creada. Desde aquí ves el seguimiento de tus resultados y ejerces tus derechos sobre tus datos.", accountWhy: "Tu cuenta te permite ver el seguimiento de tus resultados y ejercer tus derechos sobre tus datos personales (acceso, rectificación, eliminación y otros).",
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
    firstTimeHint: "First time? When you finish your evaluation we email you a link to create your password. If you cannot find it, ask for another one here.", recoverTitle: "Create or recover my password", recoverIntro: "Type the email you used for your evaluation. We will send you a link to create your password (if it is your first time) or to change it.", recoverSend: "Send me the link", recoverSentTitle: "Check your email", recoverSentBody: "If {email} has an account, we sent you a link. It can take a few minutes. Also check your spam folder.", recoverLatest: "Always use the latest email you receive: each new email cancels the previous one.", recoverResend: "Send another email", recoverWait: "You can ask for another in {s} seconds.", recoverThrottled: "You already asked for several links in a row, so we did not send another. Use the last email you received or wait about 15 minutes to ask for a new one.", recoverNoMail: "Still nothing? Check that the email is spelled correctly or tell your clinic.", recoverBack: "Back to sign in", invalidLinkLong: "This link no longer works: it expired, was already used, or you asked for a newer email. Ask for a new one and use the latest you receive.", passwordCreated: "Your password is set. From here you can follow your results and exercise your rights over your data.", accountWhy: "Your account lets you follow your results and exercise your rights over your personal data (access, correction, deletion and others).",
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
    firstTimeHint: "Primeira vez? Ao terminar sua avaliação enviamos um e-mail para criar sua senha. Se não o encontrar, peça outro aqui.", recoverTitle: "Criar ou recuperar minha senha", recoverIntro: "Digite o e-mail que você usou na avaliação. Enviaremos um link para criar sua senha (se for a primeira vez) ou para alterá-la.", recoverSend: "Enviar o link", recoverSentTitle: "Verifique seu e-mail", recoverSentBody: "Se {email} tiver uma conta, enviamos um link. Pode levar alguns minutos. Verifique também a pasta de spam.", recoverLatest: "Use sempre o último e-mail que receber: cada novo e-mail cancela o anterior.", recoverResend: "Enviar outro e-mail", recoverWait: "Você poderá pedir outro em {s} segundos.", recoverThrottled: "Você já pediu vários links seguidos e por isso não enviamos outro. Use o último e-mail recebido ou aguarde cerca de 15 minutos para pedir um novo.", recoverNoMail: "Ainda não chegou? Confira se o e-mail está escrito corretamente ou avise sua clínica.", recoverBack: "Voltar para entrar", invalidLinkLong: "Este link não funciona mais: venceu, já foi usado ou você pediu um e-mail mais novo. Peça um novo e use o último que receber.", passwordCreated: "Sua senha foi criada. Aqui você acompanha seus resultados e exerce seus direitos sobre seus dados.", accountWhy: "Sua conta permite acompanhar seus resultados e exercer seus direitos sobre seus dados pessoais (acesso, retificação, eliminação e outros).",
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
    firstTimeHint: "Première fois ? À la fin de votre évaluation, nous vous envoyons un e-mail pour créer votre mot de passe. Si vous ne le trouvez pas, demandez-en un autre ici.", recoverTitle: "Créer ou récupérer mon mot de passe", recoverIntro: "Saisissez l'e-mail utilisé pour votre évaluation. Nous vous enverrons un lien pour créer votre mot de passe (première fois) ou le modifier.", recoverSend: "M'envoyer le lien", recoverSentTitle: "Vérifiez votre e-mail", recoverSentBody: "Si {email} a un compte, nous vous avons envoyé un lien. Cela peut prendre quelques minutes. Vérifiez aussi vos courriers indésirables.", recoverLatest: "Utilisez toujours le dernier e-mail reçu : chaque nouvel e-mail annule le précédent.", recoverResend: "Envoyer un autre e-mail", recoverWait: "Vous pourrez en demander un autre dans {s} secondes.", recoverThrottled: "Vous avez déjà demandé plusieurs liens d'affilée, nous n'en avons donc pas envoyé d'autre. Utilisez le dernier e-mail reçu ou attendez environ 15 minutes.", recoverNoMail: "Toujours rien ? Vérifiez l'orthographe de l'e-mail ou prévenez votre clinique.", recoverBack: "Retour à la connexion", invalidLinkLong: "Ce lien ne fonctionne plus : il a expiré, a déjà été utilisé ou vous avez demandé un e-mail plus récent. Demandez-en un nouveau et utilisez le dernier reçu.", passwordCreated: "Votre mot de passe est créé. Vous pouvez suivre vos résultats et exercer vos droits sur vos données.", accountWhy: "Votre compte vous permet de suivre vos résultats et d'exercer vos droits sur vos données personnelles (accès, rectification, suppression et autres).",
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
    firstTimeHint: "Zum ersten Mal hier? Nach Ihrer Auswertung senden wir Ihnen eine E-Mail zum Erstellen Ihres Passworts. Finden Sie sie nicht, fordern Sie hier eine neue an.", recoverTitle: "Passwort erstellen oder zurücksetzen", recoverIntro: "Geben Sie die E-Mail-Adresse ein, die Sie für Ihre Auswertung verwendet haben. Wir senden Ihnen einen Link zum Erstellen (beim ersten Mal) oder Ändern Ihres Passworts.", recoverSend: "Link senden", recoverSentTitle: "Prüfen Sie Ihre E-Mails", recoverSentBody: "Wenn {email} ein Konto hat, haben wir Ihnen einen Link gesendet. Das kann einige Minuten dauern. Prüfen Sie auch den Spam-Ordner.", recoverLatest: "Verwenden Sie immer die neueste E-Mail: Jede neue E-Mail macht die vorherige ungültig.", recoverResend: "Weitere E-Mail senden", recoverWait: "Sie können in {s} Sekunden eine weitere anfordern.", recoverThrottled: "Sie haben bereits mehrere Links hintereinander angefordert, daher senden wir keinen weiteren. Nutzen Sie die zuletzt erhaltene E-Mail oder warten Sie etwa 15 Minuten.", recoverNoMail: "Immer noch nichts? Prüfen Sie die Schreibweise der E-Mail-Adresse oder informieren Sie Ihre Klinik.", recoverBack: "Zurück zur Anmeldung", invalidLinkLong: "Dieser Link funktioniert nicht mehr: abgelaufen, bereits benutzt oder es gibt eine neuere E-Mail. Fordern Sie einen neuen an und nutzen Sie den neuesten.", passwordCreated: "Ihr Passwort ist erstellt. Hier können Sie Ihre Ergebnisse verfolgen und Ihre Rechte an Ihren Daten ausüben.", accountWhy: "Mit Ihrem Konto können Sie Ihre Ergebnisse verfolgen und Ihre Rechte an Ihren personenbezogenen Daten ausüben (Auskunft, Berichtigung, Löschung u. a.).",
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
    firstTimeHint: "Prima volta? Al termine della valutazione ti inviamo un'e-mail per creare la password. Se non la trovi, richiedine un'altra qui.", recoverTitle: "Crea o recupera la mia password", recoverIntro: "Scrivi l'e-mail usata per la valutazione. Ti invieremo un link per creare la password (se è la prima volta) o per cambiarla.", recoverSend: "Inviami il link", recoverSentTitle: "Controlla la tua e-mail", recoverSentBody: "Se {email} ha un account, ti abbiamo inviato un link. Può richiedere qualche minuto. Controlla anche la cartella spam.", recoverLatest: "Usa sempre l'ultima e-mail ricevuta: ogni nuova e-mail annulla la precedente.", recoverResend: "Invia un'altra e-mail", recoverWait: "Potrai richiederne un'altra tra {s} secondi.", recoverThrottled: "Hai già richiesto più link di seguito, quindi non ne abbiamo inviato un altro. Usa l'ultima e-mail ricevuta o attendi circa 15 minuti.", recoverNoMail: "Ancora niente? Controlla che l'e-mail sia scritta bene o avvisa la tua clinica.", recoverBack: "Torna all'accesso", invalidLinkLong: "Questo link non funziona più: è scaduto, è già stato usato o hai richiesto un'e-mail più recente. Richiedine uno nuovo e usa l'ultimo ricevuto.", passwordCreated: "La tua password è stata creata. Da qui segui i tuoi risultati ed eserciti i tuoi diritti sui tuoi dati.", accountWhy: "Il tuo account ti permette di seguire i risultati ed esercitare i tuoi diritti sui dati personali (accesso, rettifica, cancellazione e altri).",
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
    firstTimeHint: "İlk kez mi? Değerlendirmeniz bittiğinde şifrenizi oluşturmanız için size bir e-posta gönderiyoruz. Bulamazsanız buradan yenisini isteyin.", recoverTitle: "Şifremi oluştur veya sıfırla", recoverIntro: "Değerlendirmede kullandığınız e-postayı yazın. Şifrenizi oluşturmanız (ilk kez ise) veya değiştirmeniz için bir bağlantı göndereceğiz.", recoverSend: "Bağlantıyı gönder", recoverSentTitle: "E-postanızı kontrol edin", recoverSentBody: "{email} adresinin bir hesabı varsa size bir bağlantı gönderdik. Birkaç dakika sürebilir. Spam klasörüne de bakın.", recoverLatest: "Her zaman aldığınız son e-postayı kullanın: her yeni e-posta öncekini geçersiz kılar.", recoverResend: "Başka bir e-posta gönder", recoverWait: "{s} saniye sonra yenisini isteyebilirsiniz.", recoverThrottled: "Art arda birkaç bağlantı istediniz, bu yüzden yenisini göndermedik. Aldığınız son e-postayı kullanın veya yaklaşık 15 dakika bekleyin.", recoverNoMail: "Hâlâ gelmedi mi? E-postanın doğru yazıldığını kontrol edin veya kliniğinize haber verin.", recoverBack: "Girişe dön", invalidLinkLong: "Bu bağlantı artık çalışmıyor: süresi doldu, kullanıldı veya daha yeni bir e-posta istediniz. Yenisini isteyin ve aldığınız sonuncuyu kullanın.", passwordCreated: "Şifreniz oluşturuldu. Buradan sonuçlarınızı takip edebilir ve verileriniz üzerindeki haklarınızı kullanabilirsiniz.", accountWhy: "Hesabınız sonuçlarınızı takip etmenizi ve kişisel verileriniz üzerindeki haklarınızı (erişim, düzeltme, silme vb.) kullanmanızı sağlar.",
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
    firstTimeHint: "أول مرة؟ عند انتهاء تقييمك نرسل لك رسالة بريد لإنشاء كلمة المرور. إذا لم تجدها، اطلب رسالة أخرى هنا.", recoverTitle: "إنشاء كلمة المرور أو استعادتها", recoverIntro: "اكتب البريد الإلكتروني الذي استخدمته في تقييمك. سنرسل لك رابطًا لإنشاء كلمة المرور (إذا كانت أول مرة) أو لتغييرها.", recoverSend: "أرسل لي الرابط", recoverSentTitle: "تحقق من بريدك", recoverSentBody: "إذا كان لدى {email} حساب، أرسلنا لك رابطًا. قد يستغرق ذلك بضع دقائق. تحقق أيضًا من مجلد الرسائل غير المرغوب فيها.", recoverLatest: "استخدم دائمًا آخر رسالة تصلك: كل رسالة جديدة تُبطل السابقة.", recoverResend: "إرسال رسالة أخرى", recoverWait: "يمكنك طلب رسالة أخرى بعد {s} ثانية.", recoverThrottled: "طلبت عدة روابط متتالية، لذلك لم نرسل رابطًا آخر. استخدم آخر رسالة وصلتك أو انتظر نحو 15 دقيقة.", recoverNoMail: "ما زالت لم تصل؟ تأكد من كتابة البريد بشكل صحيح أو أبلغ عيادتك.", recoverBack: "العودة إلى تسجيل الدخول", invalidLinkLong: "هذا الرابط لم يعد صالحًا: انتهت صلاحيته أو استُخدم من قبل أو طلبت رسالة أحدث. اطلب رابطًا جديدًا واستخدم آخر رابط يصلك.", passwordCreated: "تم إنشاء كلمة المرور. من هنا يمكنك متابعة نتائجك وممارسة حقوقك على بياناتك.", accountWhy: "يتيح لك حسابك متابعة نتائجك وممارسة حقوقك على بياناتك الشخصية (الاطلاع والتصحيح والحذف وغيرها).",
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
    firstTimeHint: "第一次使用？完成评估后，我们会给您发送一封邮件来创建密码。如果找不到，请在此重新申请。", recoverTitle: "创建或找回密码", recoverIntro: "请输入您做评估时使用的邮箱。我们会发送链接，用于创建密码（首次）或修改密码。", recoverSend: "发送链接给我", recoverSentTitle: "请查看您的邮箱", recoverSentBody: "如果 {email} 已有账户，我们已发送链接。可能需要几分钟，也请检查垃圾邮件文件夹。", recoverLatest: "请始终使用收到的最新一封邮件：每封新邮件都会使之前的失效。", recoverResend: "再发一封邮件", recoverWait: "{s} 秒后可再次申请。", recoverThrottled: "您已连续申请了多个链接，因此我们没有再发送。请使用最近收到的邮件，或等待约 15 分钟再申请。", recoverNoMail: "还是没收到？请检查邮箱拼写是否正确，或告知您的诊所。", recoverBack: "返回登录", invalidLinkLong: "此链接已失效：已过期、已使用，或您申请了更新的邮件。请重新申请并使用最新收到的链接。", passwordCreated: "密码已创建。您可以在这里跟踪结果并行使对个人数据的权利。", accountWhy: "您的账户可用于跟踪结果，并行使对个人数据的权利（查阅、更正、删除等）。",
  },
};
