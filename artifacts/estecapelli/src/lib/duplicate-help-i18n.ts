// Shown under the "ya existe una evaluación" alert so the patient knows what
// happened and how to continue (the evaluation is already sent: the way back
// is the patient account, not a second evaluation).
export interface DuplicateHelpText {
  title: string;
  step1: string;
  step2: string;
  step3: string;
  button: string;
}

export const DUPLICATE_HELP_TEXT: Record<string, DuplicateHelpText> = {
  es: {
    title: "Tu evaluación ya fue enviada. Para continuar:",
    step1: "Revisa tu correo (también spam): te enviamos «Crea tu clave».",
    step2: "Entra a tu cuenta con tu correo y tu clave para ver tus resultados.",
    step3: "Si no tienes la clave o el enlace venció, pulsa «Crear o recuperar mi clave» dentro de tu cuenta.",
    button: "Entrar a mi cuenta",
  },
  en: {
    title: "Your evaluation was already sent. To continue:",
    step1: "Check your email (and spam): we sent you “Create your password”.",
    step2: "Sign in to your account with your email and password to see your results.",
    step3: "If you have no password or the link expired, tap “Create or recover my password” inside your account.",
    button: "Go to my account",
  },
  pt: {
    title: "Sua avaliação já foi enviada. Para continuar:",
    step1: "Confira seu e-mail (e o spam): enviamos «Crie sua senha».",
    step2: "Entre na sua conta com seu e-mail e senha para ver seus resultados.",
    step3: "Se não tem a senha ou o link expirou, toque em «Criar ou recuperar minha senha» na sua conta.",
    button: "Entrar na minha conta",
  },
  fr: {
    title: "Votre évaluation a déjà été envoyée. Pour continuer :",
    step1: "Vérifiez votre e-mail (et les spams) : nous vous avons envoyé « Créez votre mot de passe ».",
    step2: "Connectez-vous à votre compte avec votre e-mail et votre mot de passe pour voir vos résultats.",
    step3: "Si vous n'avez pas de mot de passe ou si le lien a expiré, touchez « Créer ou récupérer mon mot de passe » dans votre compte.",
    button: "Accéder à mon compte",
  },
  de: {
    title: "Ihre Auswertung wurde bereits gesendet. So geht es weiter:",
    step1: "Prüfen Sie Ihre E-Mails (auch Spam): Wir haben Ihnen „Passwort erstellen“ geschickt.",
    step2: "Melden Sie sich mit E-Mail und Passwort in Ihrem Konto an, um Ihre Ergebnisse zu sehen.",
    step3: "Ohne Passwort oder bei abgelaufenem Link tippen Sie in Ihrem Konto auf „Passwort erstellen oder zurücksetzen“.",
    button: "Zu meinem Konto",
  },
  it: {
    title: "La tua valutazione è già stata inviata. Per continuare:",
    step1: "Controlla la tua email (anche lo spam): ti abbiamo inviato «Crea la tua password».",
    step2: "Accedi al tuo account con email e password per vedere i risultati.",
    step3: "Se non hai la password o il link è scaduto, tocca «Crea o recupera la mia password» nel tuo account.",
    button: "Vai al mio account",
  },
  tr: {
    title: "Değerlendirmeniz zaten gönderildi. Devam etmek için:",
    step1: "E-postanızı (ve spam klasörünü) kontrol edin: size «Şifrenizi oluşturun» e-postası gönderdik.",
    step2: "Sonuçlarınızı görmek için e-posta ve şifrenizle hesabınıza girin.",
    step3: "Şifreniz yoksa veya bağlantının süresi dolduysa hesabınızda «Şifremi oluştur veya sıfırla» düğmesine dokunun.",
    button: "Hesabıma git",
  },
  ar: {
    title: "تم إرسال تقييمك بالفعل. للمتابعة:",
    step1: "تحقق من بريدك الإلكتروني (والبريد غير المرغوب): أرسلنا لك رسالة «أنشئ كلمة المرور».",
    step2: "سجّل الدخول إلى حسابك بالبريد وكلمة المرور لرؤية نتائجك.",
    step3: "إذا لم تكن لديك كلمة مرور أو انتهت صلاحية الرابط، اضغط «إنشاء كلمة المرور أو استعادتها» داخل حسابك.",
    button: "الذهاب إلى حسابي",
  },
  zh: {
    title: "您的评估已提交。继续方式：",
    step1: "请查看邮箱（包括垃圾邮件）：我们已发送“创建您的密码”邮件。",
    step2: "使用邮箱和密码登录账户，查看您的结果。",
    step3: "如果没有密码或链接已过期，请在账户中点击“创建或找回我的密码”。",
    button: "进入我的账户",
  },
};
