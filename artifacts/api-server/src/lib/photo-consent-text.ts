import { toMailLanguage, type MailLanguage } from "./mail-i18n";

/**
 * Autorización para las fotografías clínicas que toma la clínica. BORRADOR sujeto a la revisión del abogado:
 * cambiar el texto exige cambiar la versión, porque cada aceptación guarda la versión y una copia del texto.
 */
export const PHOTO_CONSENT_VERSION = "foto-2026-11-borrador-1";

export type PhotoConsentText = {
  title: string;
  intro: (clinic: string) => string;
  points: string[];
  checkbox: string;
  mail: {
    subject: (clinic: string) => string;
    intro: (clinic: string) => string;
    button: string;
    note: string;
    codeSubject: (clinic: string) => string;
    codeIntro: (code: string) => string;
    codeNote: string;
    whatsapp: (name: string, clinic: string, link: string) => string;
    hello: (name?: string) => string;
  };
};

export const PHOTO_CONSENT_TEXT: Record<MailLanguage, PhotoConsentText> = {
  es: {
    title: "Autorización para fotografías clínicas",
    intro: (c) => `${c} tomará fotografías tuyas para tu atención. Léelas con calma y acepta solo si estás de acuerdo.`,
    points: [
      "Para qué: las fotografías se usan solo para evaluar tu caso, hacer el diagnóstico y seguir tu evolución clínica.",
      "Quién las ve: el equipo médico y administrativo autorizado de la clínica. Clinivista las guarda como proveedor técnico de la clínica y no las usa para otros fines.",
      "Qué no incluye: esta autorización no permite usar tus fotos en publicidad, redes sociales, clases ni publicaciones. Eso requeriría otra autorización aparte, que puedes negar sin afectar tu atención.",
      "Conservación: las fotografías pasan a formar parte de tu ficha clínica y se conservan durante el plazo que exige la ley.",
      "Tus derechos: puedes pedir acceso, rectificación u otros derechos sobre tus datos, y retirar esta autorización para fotografías futuras en cualquier momento avisando a la clínica. Las que ya forman parte de tu ficha clínica se conservan mientras la ley lo exija.",
      "Esta autorización no reemplaza el consentimiento informado de ningún procedimiento médico, que se te explicará aparte.",
    ],
    checkbox: "He leído esta autorización y acepto que la clínica tome y guarde fotografías mías para mi atención clínica.",
    mail: {
      hello: (n) => (n ? `Hola ${n},` : "Hola,"),
      subject: (c) => `Autorización de fotografías - ${c}`,
      intro: (c) => `${c} necesita tu autorización para tomar fotografías durante tu atención. Léela y acéptala desde tu teléfono.`,
      button: "Leer y autorizar",
      note: "El enlace vence en 7 días. Si no esperabas este correo, ignóralo.",
      codeSubject: (c) => `Tu código de verificación - ${c}`,
      codeIntro: (code) => `Tu código para confirmar la autorización es ${code}.`,
      codeNote: "Vence en 10 minutos. Si no fuiste tú, ignora este correo.",
      whatsapp: (n, c, l) => `Hola ${n}, ${c} te envía la autorización para las fotografías de tu atención. Léela y acéptala aquí: ${l}`,
    },
  },
  en: {
    title: "Authorization for clinical photographs",
    intro: (c) => `${c} will take photographs of you for your care. Read this carefully and accept only if you agree.`,
    points: [
      "Purpose: the photographs are used only to evaluate your case, make the diagnosis and follow your clinical progress.",
      "Who sees them: the clinic's authorized medical and administrative team. Clinivista stores them as the clinic's technical provider and does not use them for any other purpose.",
      "What it does not include: this authorization does not allow your photos to be used in advertising, social media, classes or publications. That would need a separate authorization, which you may refuse without affecting your care.",
      "Retention: the photographs become part of your clinical record and are kept for the period required by law.",
      "Your rights: you may request access, rectification or other rights over your data, and withdraw this authorization for future photographs at any time by telling the clinic. Photographs already part of your clinical record are kept for as long as the law requires.",
      "This authorization does not replace the informed consent for any medical procedure, which will be explained to you separately.",
    ],
    checkbox: "I have read this authorization and I agree that the clinic takes and stores photographs of me for my clinical care.",
    mail: {
      hello: (n) => (n ? `Hello ${n},` : "Hello,"),
      subject: (c) => `Photograph authorization - ${c}`,
      intro: (c) => `${c} needs your authorization to take photographs during your care. Read it and accept it from your phone.`,
      button: "Read and authorize",
      note: "The link expires in 7 days. If you were not expecting this email, ignore it.",
      codeSubject: (c) => `Your verification code - ${c}`,
      codeIntro: (code) => `Your code to confirm the authorization is ${code}.`,
      codeNote: "It expires in 10 minutes. If it was not you, ignore this email.",
      whatsapp: (n, c, l) => `Hello ${n}, ${c} is sending you the authorization for the photographs of your care. Read and accept it here: ${l}`,
    },
  },
  pt: {
    title: "Autorização para fotografias clínicas",
    intro: (c) => `${c} tirará fotografias suas para o seu atendimento. Leia com calma e aceite somente se concordar.`,
    points: [
      "Para quê: as fotografias são usadas apenas para avaliar seu caso, fazer o diagnóstico e acompanhar sua evolução clínica.",
      "Quem vê: a equipe médica e administrativa autorizada da clínica. A Clinivista as guarda como fornecedora técnica da clínica e não as usa para outros fins.",
      "O que não inclui: esta autorização não permite usar suas fotos em publicidade, redes sociais, aulas nem publicações. Isso exigiria outra autorização, que você pode recusar sem afetar seu atendimento.",
      "Conservação: as fotografias passam a fazer parte da sua ficha clínica e são conservadas pelo prazo exigido por lei.",
      "Seus direitos: você pode pedir acesso, retificação ou outros direitos sobre seus dados e retirar esta autorização para fotografias futuras a qualquer momento, avisando a clínica. As que já fazem parte da ficha clínica são conservadas enquanto a lei exigir.",
      "Esta autorização não substitui o consentimento informado de nenhum procedimento médico, que será explicado separadamente.",
    ],
    checkbox: "Li esta autorização e aceito que a clínica tire e guarde fotografias minhas para o meu atendimento clínico.",
    mail: {
      hello: (n) => (n ? `Olá ${n},` : "Olá,"),
      subject: (c) => `Autorização de fotografias - ${c}`,
      intro: (c) => `${c} precisa da sua autorização para tirar fotografias durante o seu atendimento. Leia e aceite pelo celular.`,
      button: "Ler e autorizar",
      note: "O link vence em 7 dias. Se você não esperava este e-mail, ignore-o.",
      codeSubject: (c) => `Seu código de verificação - ${c}`,
      codeIntro: (code) => `Seu código para confirmar a autorização é ${code}.`,
      codeNote: "Vence em 10 minutos. Se não foi você, ignore este e-mail.",
      whatsapp: (n, c, l) => `Olá ${n}, a ${c} envia a autorização para as fotografias do seu atendimento. Leia e aceite aqui: ${l}`,
    },
  },
  fr: {
    title: "Autorisation pour les photographies cliniques",
    intro: (c) => `${c} prendra des photographies de vous pour votre prise en charge. Lisez attentivement et n'acceptez que si vous êtes d'accord.`,
    points: [
      "Finalité : les photographies servent uniquement à évaluer votre cas, établir le diagnostic et suivre votre évolution clinique.",
      "Qui les voit : l'équipe médicale et administrative autorisée de la clinique. Clinivista les conserve en tant que prestataire technique de la clinique et ne les utilise à aucune autre fin.",
      "Ce qui n'est pas inclus : cette autorisation ne permet pas d'utiliser vos photos dans la publicité, les réseaux sociaux, des cours ou des publications. Cela exigerait une autorisation distincte, que vous pouvez refuser sans conséquence sur votre prise en charge.",
      "Conservation : les photographies font partie de votre dossier clinique et sont conservées pendant la durée exigée par la loi.",
      "Vos droits : vous pouvez demander l'accès, la rectification ou d'autres droits sur vos données, et retirer cette autorisation pour les photographies futures à tout moment en prévenant la clinique. Celles qui font déjà partie du dossier clinique sont conservées tant que la loi l'exige.",
      "Cette autorisation ne remplace pas le consentement éclairé pour un acte médical, qui vous sera expliqué séparément.",
    ],
    checkbox: "J'ai lu cette autorisation et j'accepte que la clinique prenne et conserve des photographies de moi pour ma prise en charge clinique.",
    mail: {
      hello: (n) => (n ? `Bonjour ${n},` : "Bonjour,"),
      subject: (c) => `Autorisation de photographies - ${c}`,
      intro: (c) => `${c} a besoin de votre autorisation pour prendre des photographies pendant votre prise en charge. Lisez-la et acceptez-la depuis votre téléphone.`,
      button: "Lire et autoriser",
      note: "Le lien expire dans 7 jours. Si vous n'attendiez pas cet e-mail, ignorez-le.",
      codeSubject: (c) => `Votre code de vérification - ${c}`,
      codeIntro: (code) => `Votre code pour confirmer l'autorisation est ${code}.`,
      codeNote: "Il expire dans 10 minutes. Si ce n'était pas vous, ignorez cet e-mail.",
      whatsapp: (n, c, l) => `Bonjour ${n}, ${c} vous envoie l'autorisation pour les photographies de votre prise en charge. Lisez-la et acceptez-la ici : ${l}`,
    },
  },
  de: {
    title: "Einwilligung zu klinischen Fotos",
    intro: (c) => `${c} wird für Ihre Behandlung Fotos von Ihnen aufnehmen. Lesen Sie in Ruhe und stimmen Sie nur zu, wenn Sie einverstanden sind.`,
    points: [
      "Zweck: Die Fotos dienen ausschließlich der Beurteilung Ihres Falls, der Diagnose und der Verfolgung Ihres klinischen Verlaufs.",
      "Wer sie sieht: das autorisierte medizinische und administrative Team der Klinik. Clinivista speichert sie als technischer Dienstleister der Klinik und nutzt sie nicht für andere Zwecke.",
      "Was nicht enthalten ist: Diese Einwilligung erlaubt keine Verwendung Ihrer Fotos in Werbung, sozialen Netzwerken, Lehre oder Veröffentlichungen. Dafür wäre eine gesonderte Einwilligung nötig, die Sie ohne Nachteil für Ihre Behandlung verweigern können.",
      "Aufbewahrung: Die Fotos werden Teil Ihrer Patientenakte und für die gesetzlich vorgeschriebene Dauer aufbewahrt.",
      "Ihre Rechte: Sie können Auskunft, Berichtigung oder weitere Rechte zu Ihren Daten verlangen und diese Einwilligung für künftige Fotos jederzeit widerrufen, indem Sie die Klinik informieren. Fotos, die bereits Teil der Patientenakte sind, werden aufbewahrt, solange das Gesetz es verlangt.",
      "Diese Einwilligung ersetzt nicht die Aufklärung und Einwilligung zu einem medizinischen Eingriff, die Ihnen gesondert erläutert wird.",
    ],
    checkbox: "Ich habe diese Einwilligung gelesen und bin einverstanden, dass die Klinik Fotos von mir für meine Behandlung aufnimmt und speichert.",
    mail: {
      hello: (n) => (n ? `Guten Tag ${n},` : "Guten Tag,"),
      subject: (c) => `Einwilligung zu Fotos - ${c}`,
      intro: (c) => `${c} benötigt Ihre Einwilligung, um während Ihrer Behandlung Fotos aufzunehmen. Lesen und bestätigen Sie sie auf Ihrem Telefon.`,
      button: "Lesen und zustimmen",
      note: "Der Link läuft in 7 Tagen ab. Wenn Sie diese E-Mail nicht erwartet haben, ignorieren Sie sie.",
      codeSubject: (c) => `Ihr Bestätigungscode - ${c}`,
      codeIntro: (code) => `Ihr Code zur Bestätigung der Einwilligung lautet ${code}.`,
      codeNote: "Er läuft in 10 Minuten ab. Wenn Sie es nicht waren, ignorieren Sie diese E-Mail.",
      whatsapp: (n, c, l) => `Guten Tag ${n}, ${c} sendet Ihnen die Einwilligung zu den Fotos Ihrer Behandlung. Hier lesen und zustimmen: ${l}`,
    },
  },
  it: {
    title: "Autorizzazione per le fotografie cliniche",
    intro: (c) => `${c} scatterà fotografie di te per la tua assistenza. Leggi con calma e accetta solo se sei d'accordo.`,
    points: [
      "Finalità: le fotografie servono solo a valutare il tuo caso, formulare la diagnosi e seguire la tua evoluzione clinica.",
      "Chi le vede: l'équipe medica e amministrativa autorizzata della clinica. Clinivista le conserva come fornitore tecnico della clinica e non le usa per altri scopi.",
      "Cosa non include: questa autorizzazione non consente di usare le tue foto in pubblicità, social network, lezioni o pubblicazioni. Servirebbe un'autorizzazione separata, che puoi rifiutare senza conseguenze sulla tua assistenza.",
      "Conservazione: le fotografie entrano a far parte della tua cartella clinica e sono conservate per il periodo previsto dalla legge.",
      "I tuoi diritti: puoi chiedere accesso, rettifica o altri diritti sui tuoi dati e ritirare questa autorizzazione per le fotografie future in qualsiasi momento avvisando la clinica. Quelle già parte della cartella clinica sono conservate finché la legge lo richiede.",
      "Questa autorizzazione non sostituisce il consenso informato per alcuna procedura medica, che ti sarà spiegato a parte.",
    ],
    checkbox: "Ho letto questa autorizzazione e accetto che la clinica scatti e conservi fotografie di me per la mia assistenza clinica.",
    mail: {
      hello: (n) => (n ? `Ciao ${n},` : "Ciao,"),
      subject: (c) => `Autorizzazione per le fotografie - ${c}`,
      intro: (c) => `${c} ha bisogno della tua autorizzazione per scattare fotografie durante la tua assistenza. Leggila e accettala dal telefono.`,
      button: "Leggi e autorizza",
      note: "Il link scade tra 7 giorni. Se non aspettavi questa email, ignorala.",
      codeSubject: (c) => `Il tuo codice di verifica - ${c}`,
      codeIntro: (code) => `Il tuo codice per confermare l'autorizzazione è ${code}.`,
      codeNote: "Scade tra 10 minuti. Se non sei stato tu, ignora questa email.",
      whatsapp: (n, c, l) => `Ciao ${n}, ${c} ti invia l'autorizzazione per le fotografie della tua assistenza. Leggila e accettala qui: ${l}`,
    },
  },
  tr: {
    title: "Klinik fotoğraf izni",
    intro: (c) => `${c}, bakımınız için sizin fotoğraflarınızı çekecek. Dikkatle okuyun ve yalnızca kabul ediyorsanız onaylayın.`,
    points: [
      "Amaç: fotoğraflar yalnızca durumunuzu değerlendirmek, tanı koymak ve klinik seyrinizi izlemek için kullanılır.",
      "Kimler görür: kliniğin yetkili tıbbi ve idari ekibi. Clinivista bunları kliniğin teknik sağlayıcısı olarak saklar ve başka amaçla kullanmaz.",
      "Neleri kapsamaz: bu izin fotoğraflarınızın reklamda, sosyal medyada, derslerde veya yayınlarda kullanılmasına izin vermez. Bunun için ayrı bir izin gerekir; bakımınızı etkilemeden reddedebilirsiniz.",
      "Saklama: fotoğraflar klinik dosyanızın parçası olur ve yasanın gerektirdiği süre boyunca saklanır.",
      "Haklarınız: verilerinize erişim, düzeltme veya diğer haklarınızı talep edebilir, kliniği bilgilendirerek bu izni gelecekteki fotoğraflar için istediğiniz zaman geri çekebilirsiniz. Klinik dosyanın parçası olmuş fotoğraflar yasa gerektirdiği sürece saklanır.",
      "Bu izin, herhangi bir tıbbi işlem için bilgilendirilmiş onamın yerini tutmaz; o ayrıca açıklanacaktır.",
    ],
    checkbox: "Bu izni okudum ve kliniğin klinik bakımım için fotoğraflarımı çekmesini ve saklamasını kabul ediyorum.",
    mail: {
      hello: (n) => (n ? `Merhaba ${n},` : "Merhaba,"),
      subject: (c) => `Fotoğraf izni - ${c}`,
      intro: (c) => `${c}, bakımınız sırasında fotoğraf çekmek için iznine ihtiyaç duyuyor. Telefonunuzdan okuyup onaylayın.`,
      button: "Oku ve onayla",
      note: "Bağlantı 7 gün içinde sona erer. Bu e-postayı beklemiyorsanız dikkate almayın.",
      codeSubject: (c) => `Doğrulama kodunuz - ${c}`,
      codeIntro: (code) => `İzni onaylamak için kodunuz ${code}.`,
      codeNote: "10 dakika içinde sona erer. Siz değilseniz bu e-postayı dikkate almayın.",
      whatsapp: (n, c, l) => `Merhaba ${n}, ${c} bakımınızdaki fotoğraflar için izin formunu gönderiyor. Buradan okuyup onaylayın: ${l}`,
    },
  },
  ar: {
    title: "إذن بالتصوير السريري",
    intro: (c) => `ستلتقط ${c} صورًا لك من أجل رعايتك. اقرأ بتمعّن ووافق فقط إذا كنت موافقًا.`,
    points: [
      "الغرض: تُستخدم الصور فقط لتقييم حالتك وإجراء التشخيص ومتابعة تطورك السريري.",
      "من يراها: الفريق الطبي والإداري المصرّح له في العيادة. تحفظها Clinivista بصفتها مزوّدًا تقنيًا للعيادة ولا تستخدمها لأي غرض آخر.",
      "ما لا يشمله: لا يسمح هذا الإذن باستخدام صورك في الإعلان أو وسائل التواصل أو الدروس أو المنشورات. يتطلب ذلك إذنًا منفصلًا يمكنك رفضه دون التأثير على رعايتك.",
      "الحفظ: تصبح الصور جزءًا من ملفك السريري وتُحفظ للمدة التي يقتضيها القانون.",
      "حقوقك: يمكنك طلب الاطلاع أو التصحيح أو غيرها من الحقوق على بياناتك، وسحب هذا الإذن للصور المستقبلية في أي وقت بإبلاغ العيادة. وتُحفظ الصور التي أصبحت جزءًا من الملف السريري ما دام القانون يقتضي ذلك.",
      "لا يحلّ هذا الإذن محل الموافقة المستنيرة على أي إجراء طبي، وسيُشرح لك على حدة.",
    ],
    checkbox: "قرأت هذا الإذن وأوافق على أن تلتقط العيادة صورًا لي وتحفظها لأغراض رعايتي السريرية.",
    mail: {
      hello: (n) => (n ? `مرحبًا ${n}،` : "مرحبًا،"),
      subject: (c) => `إذن التصوير - ${c}`,
      intro: (c) => `تحتاج ${c} إلى إذنك لالتقاط صور أثناء رعايتك. اقرأه ووافق عليه من هاتفك.`,
      button: "اقرأ ووافق",
      note: "ينتهي الرابط خلال 7 أيام. إذا لم تكن تتوقع هذه الرسالة فتجاهلها.",
      codeSubject: (c) => `رمز التحقق الخاص بك - ${c}`,
      codeIntro: (code) => `رمزك لتأكيد الإذن هو ${code}.`,
      codeNote: "ينتهي خلال 10 دقائق. إذا لم تكن أنت فتجاهل هذه الرسالة.",
      whatsapp: (n, c, l) => `مرحبًا ${n}، ترسل لك ${c} إذن التصوير الخاص برعايتك. اقرأه ووافق عليه هنا: ${l}`,
    },
  },
  zh: {
    title: "临床照片授权",
    intro: (c) => `${c} 将为您的诊疗拍摄您的照片。请仔细阅读，仅在同意时接受。`,
    points: [
      "用途：照片仅用于评估您的病情、作出诊断和跟踪您的临床进展。",
      "谁能查看：诊所获授权的医疗和行政团队。Clinivista 作为诊所的技术服务提供方保存照片，不会用于其他目的。",
      "不包括：本授权不允许将您的照片用于广告、社交媒体、教学或出版物。这需要另行授权，您可以拒绝，且不影响您的诊疗。",
      "保存：照片将成为您临床档案的一部分，并按法律要求的期限保存。",
      "您的权利：您可以申请查阅、更正或行使其他数据权利，并可随时通知诊所撤回本授权（对今后的照片生效）。已成为临床档案一部分的照片，在法律要求的期限内仍须保存。",
      "本授权不能替代任何医疗操作的知情同意，该同意将另行向您说明。",
    ],
    checkbox: "我已阅读本授权，同意诊所为我的临床诊疗拍摄并保存我的照片。",
    mail: {
      hello: (n) => (n ? `${n}，您好，` : "您好，"),
      subject: (c) => `照片授权 - ${c}`,
      intro: (c) => `${c} 需要您的授权，以便在诊疗期间拍摄照片。请在手机上阅读并确认。`,
      button: "阅读并授权",
      note: "链接 7 天后失效。如果您并未期待此邮件，请忽略。",
      codeSubject: (c) => `您的验证码 - ${c}`,
      codeIntro: (code) => `确认授权的验证码是 ${code}。`,
      codeNote: "10 分钟后失效。如果不是您本人操作，请忽略此邮件。",
      whatsapp: (n, c, l) => `${n}，您好，${c} 向您发送诊疗照片授权书。请在此阅读并确认：${l}`,
    },
  },
};

export const photoConsentText = (language: unknown) => PHOTO_CONSENT_TEXT[toMailLanguage(language)];

/** Copia exacta del texto aceptado, para guardarla junto con la aceptación. */
export function snapshotOf(language: unknown, clinicName: string): string {
  const text = photoConsentText(language);
  return [text.title, text.intro(clinicName), ...text.points, text.checkbox].join("\n");
}
