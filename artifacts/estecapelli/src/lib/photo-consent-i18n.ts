import type { LangCode } from "./language";

// Autorización para fotografías clínicas: página pública del paciente y tarjeta de la clínica, en los nueve idiomas.
export type PhotoConsentUi = {
  // Página del paciente
  loading: string; invalid: string; done: (date: string) => string; declined: string; accept: string; decline: string; language: string;
  codeTitle: string; codeSent: (masked: string) => string; codeLabel: string; sendCode: string; resendCode: string; verify: string;
  codeWrong: string; codeExpired: string; tooMany: string; noEmail: string; thanks: string; error: string;
  // Tarjeta de la clínica
  title: string; subtitle: string; none: string; pending: string; granted: string; rejected: string; revoked: string;
  methods: { link: string; document: string; tablet: string };
  verified: { email_code: string; link: string; in_clinic: string; document: string };
  registeredBy: (name: string, date: string) => string;
  actLink: string; actDoc: string; actTablet: string; history: string; revoke: string; revokeNote: string; viewFile: string; weak: string;
  linkTitle: string; chEmail: (email: string) => string; chNoEmail: string; chWhatsapp: string; chCopy: string; create: string;
  copied: string; linkValid: string; emailSent: string; emailFailed: string; openWhatsapp: string; copyLink: string;
  docTitle: string; docLabel: string; docFile: string; docSave: string;
  tabTitle: string; tabSign: string; tabClear: string; tabSave: string; tabNeedSign: string; tabNeedAccept: string;
  close: string; saving: string; failed: string;
  sheetLabel: string; patientLabel: string; dateLabel: string;
};

export const PHOTO_CONSENT_UI: Record<LangCode, PhotoConsentUi> = {
  es: {
    loading: "Cargando…", invalid: "Este enlace no es válido o venció. Pide uno nuevo a la clínica.", done: (d) => `Tu autorización quedó registrada el ${d}. Ya puedes cerrar esta página.`, declined: "Registramos que no autorizas las fotografías. Puedes cerrar esta página.", accept: "Aceptar y autorizar", decline: "No autorizo", language: "Idioma",
    codeTitle: "Confirma que eres tú", codeSent: (m) => `Te enviamos un código de 6 dígitos a ${m}.`, codeLabel: "Código", sendCode: "Enviar código a mi correo", resendCode: "Enviar otro código", verify: "Confirmar y autorizar",
    codeWrong: "El código no es correcto.", codeExpired: "El código venció. Pide uno nuevo.", tooMany: "Demasiados intentos. Pide un código nuevo o contacta a la clínica.", noEmail: "No tenemos tu correo, así que no podemos enviarte un código. Tu aceptación quedará registrada con la fecha, la hora y el dispositivo.", thanks: "Gracias. Tu autorización quedó registrada.", error: "No pudimos registrar tu respuesta. Intenta de nuevo.",
    sheetLabel: "Documento de autorización", patientLabel: "Paciente", dateLabel: "Fecha",
    title: "Autorización para fotografías", subtitle: "Constancia de que el paciente autoriza que la clínica tome y guarde sus fotografías clínicas.", none: "Sin autorización registrada", pending: "Pendiente: esperando al paciente", granted: "Autorizada", rejected: "Rechazada por el paciente", revoked: "Revocada",
    methods: { link: "Enlace", document: "Documento firmado", tablet: "Firma en tableta" },
    verified: { email_code: "Verificada con código al correo", link: "Aceptada desde el enlace, sin código", in_clinic: "Firmada en la clínica", document: "Documento subido por la clínica" },
    registeredBy: (n, d) => `Registrada por ${n} el ${d}`,
    actLink: "Enviar enlace", actDoc: "Registrar documento firmado", actTablet: "Firmar en tableta", history: "Historial", revoke: "Revocar", revokeNote: "Motivo (opcional)", viewFile: "Ver archivo", weak: "Sin código de verificación: la evidencia es más débil.",
    linkTitle: "Enviar enlace de autorización", chEmail: (e) => `Enviar por correo a ${e}`, chNoEmail: "El paciente no tiene correo registrado", chWhatsapp: "Enviar por WhatsApp", chCopy: "Solo copiar el enlace", create: "Crear enlace",
    copied: "Enlace copiado", linkValid: "El enlace vence en 7 días y se puede usar una vez.", emailSent: "Correo enviado.", emailFailed: "No pudimos enviar el correo; copia el enlace y envíaselo.", openWhatsapp: "Abrir WhatsApp", copyLink: "Copiar enlace",
    docTitle: "Registrar documento firmado", docLabel: "Nombre o versión del documento", docFile: "PDF o foto del documento firmado", docSave: "Guardar documento",
    tabTitle: "Firma en tableta", tabSign: "Firma aquí con el dedo", tabClear: "Borrar firma", tabSave: "Registrar firma", tabNeedSign: "Falta la firma del paciente.", tabNeedAccept: "El paciente debe marcar que acepta.",
    close: "Cerrar", saving: "Guardando…", failed: "No pudimos guardarlo. Intenta de nuevo.",
  },
  en: {
    loading: "Loading…", invalid: "This link is not valid or has expired. Ask the clinic for a new one.", done: (d) => `Your authorization was recorded on ${d}. You can close this page.`, declined: "We recorded that you do not authorize the photographs. You can close this page.", accept: "Accept and authorize", decline: "I do not authorize", language: "Language",
    codeTitle: "Confirm it is you", codeSent: (m) => `We sent a 6-digit code to ${m}.`, codeLabel: "Code", sendCode: "Send a code to my email", resendCode: "Send another code", verify: "Confirm and authorize",
    codeWrong: "The code is not correct.", codeExpired: "The code expired. Ask for a new one.", tooMany: "Too many attempts. Ask for a new code or contact the clinic.", noEmail: "We do not have your email, so we cannot send you a code. Your acceptance will be recorded with the date, time and device.", thanks: "Thank you. Your authorization was recorded.", error: "We could not record your answer. Please try again.",
    sheetLabel: "Authorization document", patientLabel: "Patient", dateLabel: "Date",
    title: "Photograph authorization", subtitle: "Record that the patient authorizes the clinic to take and store their clinical photographs.", none: "No authorization recorded", pending: "Pending: waiting for the patient", granted: "Authorized", rejected: "Declined by the patient", revoked: "Revoked",
    methods: { link: "Link", document: "Signed document", tablet: "Tablet signature" },
    verified: { email_code: "Verified with a code sent to their email", link: "Accepted from the link, no code", in_clinic: "Signed at the clinic", document: "Document uploaded by the clinic" },
    registeredBy: (n, d) => `Recorded by ${n} on ${d}`,
    actLink: "Send link", actDoc: "Record signed document", actTablet: "Sign on tablet", history: "History", revoke: "Revoke", revokeNote: "Reason (optional)", viewFile: "View file", weak: "No verification code: the evidence is weaker.",
    linkTitle: "Send authorization link", chEmail: (e) => `Send by email to ${e}`, chNoEmail: "The patient has no email on file", chWhatsapp: "Send by WhatsApp", chCopy: "Only copy the link", create: "Create link",
    copied: "Link copied", linkValid: "The link expires in 7 days and can be used once.", emailSent: "Email sent.", emailFailed: "We could not send the email; copy the link and send it yourself.", openWhatsapp: "Open WhatsApp", copyLink: "Copy link",
    docTitle: "Record signed document", docLabel: "Document name or version", docFile: "PDF or photo of the signed document", docSave: "Save document",
    tabTitle: "Tablet signature", tabSign: "Sign here with your finger", tabClear: "Clear signature", tabSave: "Record signature", tabNeedSign: "The patient's signature is missing.", tabNeedAccept: "The patient must tick that they accept.",
    close: "Close", saving: "Saving…", failed: "We could not save it. Please try again.",
  },
  pt: {
    loading: "Carregando…", invalid: "Este link não é válido ou venceu. Peça um novo à clínica.", done: (d) => `Sua autorização foi registrada em ${d}. Você já pode fechar esta página.`, declined: "Registramos que você não autoriza as fotografias. Você pode fechar esta página.", accept: "Aceitar e autorizar", decline: "Não autorizo", language: "Idioma",
    codeTitle: "Confirme que é você", codeSent: (m) => `Enviamos um código de 6 dígitos para ${m}.`, codeLabel: "Código", sendCode: "Enviar código para meu e-mail", resendCode: "Enviar outro código", verify: "Confirmar e autorizar",
    codeWrong: "O código não está correto.", codeExpired: "O código venceu. Peça um novo.", tooMany: "Muitas tentativas. Peça um novo código ou contate a clínica.", noEmail: "Não temos seu e-mail, então não podemos enviar um código. Sua aceitação será registrada com data, hora e dispositivo.", thanks: "Obrigado. Sua autorização foi registrada.", error: "Não foi possível registrar sua resposta. Tente novamente.",
    sheetLabel: "Documento de autorização", patientLabel: "Paciente", dateLabel: "Data",
    title: "Autorização para fotografias", subtitle: "Registro de que o paciente autoriza a clínica a tirar e guardar suas fotografias clínicas.", none: "Sem autorização registrada", pending: "Pendente: aguardando o paciente", granted: "Autorizada", rejected: "Recusada pelo paciente", revoked: "Revogada",
    methods: { link: "Link", document: "Documento assinado", tablet: "Assinatura em tablet" },
    verified: { email_code: "Verificada com código enviado ao e-mail", link: "Aceita pelo link, sem código", in_clinic: "Assinada na clínica", document: "Documento enviado pela clínica" },
    registeredBy: (n, d) => `Registrada por ${n} em ${d}`,
    actLink: "Enviar link", actDoc: "Registrar documento assinado", actTablet: "Assinar no tablet", history: "Histórico", revoke: "Revogar", revokeNote: "Motivo (opcional)", viewFile: "Ver arquivo", weak: "Sem código de verificação: a evidência é mais fraca.",
    linkTitle: "Enviar link de autorização", chEmail: (e) => `Enviar por e-mail para ${e}`, chNoEmail: "O paciente não tem e-mail cadastrado", chWhatsapp: "Enviar por WhatsApp", chCopy: "Apenas copiar o link", create: "Criar link",
    copied: "Link copiado", linkValid: "O link vence em 7 dias e pode ser usado uma vez.", emailSent: "E-mail enviado.", emailFailed: "Não foi possível enviar o e-mail; copie o link e envie você mesmo.", openWhatsapp: "Abrir WhatsApp", copyLink: "Copiar link",
    docTitle: "Registrar documento assinado", docLabel: "Nome ou versão do documento", docFile: "PDF ou foto do documento assinado", docSave: "Salvar documento",
    tabTitle: "Assinatura em tablet", tabSign: "Assine aqui com o dedo", tabClear: "Apagar assinatura", tabSave: "Registrar assinatura", tabNeedSign: "Falta a assinatura do paciente.", tabNeedAccept: "O paciente deve marcar que aceita.",
    close: "Fechar", saving: "Salvando…", failed: "Não foi possível salvar. Tente novamente.",
  },
  fr: {
    loading: "Chargement…", invalid: "Ce lien n'est pas valide ou a expiré. Demandez-en un nouveau à la clinique.", done: (d) => `Votre autorisation a été enregistrée le ${d}. Vous pouvez fermer cette page.`, declined: "Nous avons enregistré que vous n'autorisez pas les photographies. Vous pouvez fermer cette page.", accept: "Accepter et autoriser", decline: "Je n'autorise pas", language: "Langue",
    codeTitle: "Confirmez que c'est vous", codeSent: (m) => `Nous avons envoyé un code à 6 chiffres à ${m}.`, codeLabel: "Code", sendCode: "Envoyer un code à mon e-mail", resendCode: "Envoyer un autre code", verify: "Confirmer et autoriser",
    codeWrong: "Le code n'est pas correct.", codeExpired: "Le code a expiré. Demandez-en un nouveau.", tooMany: "Trop de tentatives. Demandez un nouveau code ou contactez la clinique.", noEmail: "Nous n'avons pas votre e-mail et ne pouvons donc pas vous envoyer de code. Votre acceptation sera enregistrée avec la date, l'heure et l'appareil.", thanks: "Merci. Votre autorisation a été enregistrée.", error: "Impossible d'enregistrer votre réponse. Veuillez réessayer.",
    sheetLabel: "Document d'autorisation", patientLabel: "Patient", dateLabel: "Date",
    title: "Autorisation pour les photographies", subtitle: "Preuve que le patient autorise la clinique à prendre et conserver ses photographies cliniques.", none: "Aucune autorisation enregistrée", pending: "En attente du patient", granted: "Autorisée", rejected: "Refusée par le patient", revoked: "Révoquée",
    methods: { link: "Lien", document: "Document signé", tablet: "Signature sur tablette" },
    verified: { email_code: "Vérifiée avec un code envoyé par e-mail", link: "Acceptée depuis le lien, sans code", in_clinic: "Signée à la clinique", document: "Document téléversé par la clinique" },
    registeredBy: (n, d) => `Enregistrée par ${n} le ${d}`,
    actLink: "Envoyer un lien", actDoc: "Enregistrer un document signé", actTablet: "Signer sur tablette", history: "Historique", revoke: "Révoquer", revokeNote: "Motif (facultatif)", viewFile: "Voir le fichier", weak: "Sans code de vérification : la preuve est plus faible.",
    linkTitle: "Envoyer le lien d'autorisation", chEmail: (e) => `Envoyer par e-mail à ${e}`, chNoEmail: "Le patient n'a pas d'e-mail enregistré", chWhatsapp: "Envoyer par WhatsApp", chCopy: "Copier seulement le lien", create: "Créer le lien",
    copied: "Lien copié", linkValid: "Le lien expire dans 7 jours et ne sert qu'une fois.", emailSent: "E-mail envoyé.", emailFailed: "Impossible d'envoyer l'e-mail ; copiez le lien et envoyez-le vous-même.", openWhatsapp: "Ouvrir WhatsApp", copyLink: "Copier le lien",
    docTitle: "Enregistrer un document signé", docLabel: "Nom ou version du document", docFile: "PDF ou photo du document signé", docSave: "Enregistrer le document",
    tabTitle: "Signature sur tablette", tabSign: "Signez ici avec le doigt", tabClear: "Effacer la signature", tabSave: "Enregistrer la signature", tabNeedSign: "La signature du patient est manquante.", tabNeedAccept: "Le patient doit cocher qu'il accepte.",
    close: "Fermer", saving: "Enregistrement…", failed: "Impossible d'enregistrer. Veuillez réessayer.",
  },
  de: {
    loading: "Wird geladen…", invalid: "Dieser Link ist ungültig oder abgelaufen. Fragen Sie die Klinik nach einem neuen.", done: (d) => `Ihre Einwilligung wurde am ${d} erfasst. Sie können diese Seite schließen.`, declined: "Wir haben erfasst, dass Sie den Fotos nicht zustimmen. Sie können diese Seite schließen.", accept: "Akzeptieren und zustimmen", decline: "Ich stimme nicht zu", language: "Sprache",
    codeTitle: "Bestätigen Sie, dass Sie es sind", codeSent: (m) => `Wir haben einen 6-stelligen Code an ${m} gesendet.`, codeLabel: "Code", sendCode: "Code an meine E-Mail senden", resendCode: "Weiteren Code senden", verify: "Bestätigen und zustimmen",
    codeWrong: "Der Code ist nicht korrekt.", codeExpired: "Der Code ist abgelaufen. Fordern Sie einen neuen an.", tooMany: "Zu viele Versuche. Fordern Sie einen neuen Code an oder kontaktieren Sie die Klinik.", noEmail: "Wir haben Ihre E-Mail nicht und können keinen Code senden. Ihre Zustimmung wird mit Datum, Uhrzeit und Gerät erfasst.", thanks: "Danke. Ihre Einwilligung wurde erfasst.", error: "Ihre Antwort konnte nicht erfasst werden. Bitte erneut versuchen.",
    sheetLabel: "Einwilligungsdokument", patientLabel: "Patient", dateLabel: "Datum",
    title: "Einwilligung zu Fotos", subtitle: "Nachweis, dass der Patient der Klinik erlaubt, klinische Fotos aufzunehmen und zu speichern.", none: "Keine Einwilligung erfasst", pending: "Offen: wartet auf den Patienten", granted: "Erteilt", rejected: "Vom Patienten abgelehnt", revoked: "Widerrufen",
    methods: { link: "Link", document: "Unterschriebenes Dokument", tablet: "Tablet-Unterschrift" },
    verified: { email_code: "Mit an die E-Mail gesendetem Code bestätigt", link: "Über den Link ohne Code akzeptiert", in_clinic: "In der Klinik unterschrieben", document: "Von der Klinik hochgeladenes Dokument" },
    registeredBy: (n, d) => `Erfasst von ${n} am ${d}`,
    actLink: "Link senden", actDoc: "Unterschriebenes Dokument erfassen", actTablet: "Auf dem Tablet unterschreiben", history: "Verlauf", revoke: "Widerrufen", revokeNote: "Grund (optional)", viewFile: "Datei ansehen", weak: "Ohne Bestätigungscode: der Nachweis ist schwächer.",
    linkTitle: "Einwilligungslink senden", chEmail: (e) => `Per E-Mail an ${e} senden`, chNoEmail: "Der Patient hat keine E-Mail hinterlegt", chWhatsapp: "Per WhatsApp senden", chCopy: "Nur den Link kopieren", create: "Link erstellen",
    copied: "Link kopiert", linkValid: "Der Link läuft in 7 Tagen ab und kann einmal verwendet werden.", emailSent: "E-Mail gesendet.", emailFailed: "Die E-Mail konnte nicht gesendet werden; kopieren Sie den Link und senden Sie ihn selbst.", openWhatsapp: "WhatsApp öffnen", copyLink: "Link kopieren",
    docTitle: "Unterschriebenes Dokument erfassen", docLabel: "Name oder Version des Dokuments", docFile: "PDF oder Foto des unterschriebenen Dokuments", docSave: "Dokument speichern",
    tabTitle: "Tablet-Unterschrift", tabSign: "Hier mit dem Finger unterschreiben", tabClear: "Unterschrift löschen", tabSave: "Unterschrift erfassen", tabNeedSign: "Die Unterschrift des Patienten fehlt.", tabNeedAccept: "Der Patient muss die Zustimmung ankreuzen.",
    close: "Schließen", saving: "Wird gespeichert…", failed: "Speichern nicht möglich. Bitte erneut versuchen.",
  },
  it: {
    loading: "Caricamento…", invalid: "Questo link non è valido o è scaduto. Chiedine uno nuovo alla clinica.", done: (d) => `La tua autorizzazione è stata registrata il ${d}. Puoi chiudere questa pagina.`, declined: "Abbiamo registrato che non autorizzi le fotografie. Puoi chiudere questa pagina.", accept: "Accetta e autorizza", decline: "Non autorizzo", language: "Lingua",
    codeTitle: "Conferma che sei tu", codeSent: (m) => `Abbiamo inviato un codice di 6 cifre a ${m}.`, codeLabel: "Codice", sendCode: "Invia un codice alla mia email", resendCode: "Invia un altro codice", verify: "Conferma e autorizza",
    codeWrong: "Il codice non è corretto.", codeExpired: "Il codice è scaduto. Richiedine uno nuovo.", tooMany: "Troppi tentativi. Richiedi un nuovo codice o contatta la clinica.", noEmail: "Non abbiamo la tua email, quindi non possiamo inviarti un codice. La tua accettazione sarà registrata con data, ora e dispositivo.", thanks: "Grazie. La tua autorizzazione è stata registrata.", error: "Impossibile registrare la tua risposta. Riprova.",
    sheetLabel: "Documento di autorizzazione", patientLabel: "Paziente", dateLabel: "Data",
    title: "Autorizzazione per le fotografie", subtitle: "Prova che il paziente autorizza la clinica a scattare e conservare le sue fotografie cliniche.", none: "Nessuna autorizzazione registrata", pending: "In attesa del paziente", granted: "Autorizzata", rejected: "Rifiutata dal paziente", revoked: "Revocata",
    methods: { link: "Link", document: "Documento firmato", tablet: "Firma su tablet" },
    verified: { email_code: "Verificata con codice inviato all'email", link: "Accettata dal link, senza codice", in_clinic: "Firmata in clinica", document: "Documento caricato dalla clinica" },
    registeredBy: (n, d) => `Registrata da ${n} il ${d}`,
    actLink: "Invia link", actDoc: "Registra documento firmato", actTablet: "Firma su tablet", history: "Cronologia", revoke: "Revoca", revokeNote: "Motivo (facoltativo)", viewFile: "Vedi file", weak: "Senza codice di verifica: la prova è più debole.",
    linkTitle: "Invia il link di autorizzazione", chEmail: (e) => `Invia per email a ${e}`, chNoEmail: "Il paziente non ha un'email registrata", chWhatsapp: "Invia su WhatsApp", chCopy: "Copia solo il link", create: "Crea link",
    copied: "Link copiato", linkValid: "Il link scade tra 7 giorni e si può usare una volta.", emailSent: "Email inviata.", emailFailed: "Impossibile inviare l'email; copia il link e invialo tu.", openWhatsapp: "Apri WhatsApp", copyLink: "Copia link",
    docTitle: "Registra documento firmato", docLabel: "Nome o versione del documento", docFile: "PDF o foto del documento firmato", docSave: "Salva documento",
    tabTitle: "Firma su tablet", tabSign: "Firma qui con il dito", tabClear: "Cancella firma", tabSave: "Registra firma", tabNeedSign: "Manca la firma del paziente.", tabNeedAccept: "Il paziente deve spuntare che accetta.",
    close: "Chiudi", saving: "Salvataggio…", failed: "Impossibile salvare. Riprova.",
  },
  tr: {
    loading: "Yükleniyor…", invalid: "Bu bağlantı geçersiz veya süresi dolmuş. Klinikten yenisini isteyin.", done: (d) => `İzniniz ${d} tarihinde kaydedildi. Bu sayfayı kapatabilirsiniz.`, declined: "Fotoğraflara izin vermediğinizi kaydettik. Bu sayfayı kapatabilirsiniz.", accept: "Kabul et ve izin ver", decline: "İzin vermiyorum", language: "Dil",
    codeTitle: "Siz olduğunuzu doğrulayın", codeSent: (m) => `${m} adresine 6 haneli bir kod gönderdik.`, codeLabel: "Kod", sendCode: "E-postama kod gönder", resendCode: "Başka bir kod gönder", verify: "Doğrula ve izin ver",
    codeWrong: "Kod doğru değil.", codeExpired: "Kodun süresi doldu. Yenisini isteyin.", tooMany: "Çok fazla deneme. Yeni kod isteyin veya kliniğe başvurun.", noEmail: "E-postanız elimizde olmadığı için kod gönderemiyoruz. Onayınız tarih, saat ve cihaz bilgisiyle kaydedilecek.", thanks: "Teşekkürler. İzniniz kaydedildi.", error: "Yanıtınız kaydedilemedi. Lütfen tekrar deneyin.",
    sheetLabel: "İzin belgesi", patientLabel: "Hasta", dateLabel: "Tarih",
    title: "Fotoğraf izni", subtitle: "Hastanın kliniğin klinik fotoğraflarını çekmesine ve saklamasına izin verdiğinin kaydı.", none: "Kayıtlı izin yok", pending: "Bekliyor: hasta yanıtlayacak", granted: "İzin verildi", rejected: "Hasta reddetti", revoked: "Geri çekildi",
    methods: { link: "Bağlantı", document: "İmzalı belge", tablet: "Tablette imza" },
    verified: { email_code: "E-postaya gönderilen kodla doğrulandı", link: "Bağlantıdan kodsuz kabul edildi", in_clinic: "Klinikte imzalandı", document: "Klinik tarafından yüklenen belge" },
    registeredBy: (n, d) => `${n} tarafından ${d} tarihinde kaydedildi`,
    actLink: "Bağlantı gönder", actDoc: "İmzalı belgeyi kaydet", actTablet: "Tablette imzala", history: "Geçmiş", revoke: "Geri çek", revokeNote: "Neden (isteğe bağlı)", viewFile: "Dosyayı gör", weak: "Doğrulama kodu yok: kanıt daha zayıf.",
    linkTitle: "İzin bağlantısı gönder", chEmail: (e) => `${e} adresine e-postayla gönder`, chNoEmail: "Hastanın kayıtlı e-postası yok", chWhatsapp: "WhatsApp ile gönder", chCopy: "Yalnızca bağlantıyı kopyala", create: "Bağlantı oluştur",
    copied: "Bağlantı kopyalandı", linkValid: "Bağlantı 7 gün sonra sona erer ve bir kez kullanılabilir.", emailSent: "E-posta gönderildi.", emailFailed: "E-posta gönderilemedi; bağlantıyı kopyalayıp kendiniz gönderin.", openWhatsapp: "WhatsApp'ı aç", copyLink: "Bağlantıyı kopyala",
    docTitle: "İmzalı belgeyi kaydet", docLabel: "Belge adı veya sürümü", docFile: "İmzalı belgenin PDF'i veya fotoğrafı", docSave: "Belgeyi kaydet",
    tabTitle: "Tablette imza", tabSign: "Parmağınızla buraya imzalayın", tabClear: "İmzayı sil", tabSave: "İmzayı kaydet", tabNeedSign: "Hastanın imzası eksik.", tabNeedAccept: "Hasta kabul ettiğini işaretlemeli.",
    close: "Kapat", saving: "Kaydediliyor…", failed: "Kaydedilemedi. Lütfen tekrar deneyin.",
  },
  ar: {
    loading: "جارٍ التحميل…", invalid: "هذا الرابط غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا من العيادة.", done: (d) => `تم تسجيل إذنك في ${d}. يمكنك إغلاق هذه الصفحة.`, declined: "سجّلنا أنك لا تأذن بالتصوير. يمكنك إغلاق هذه الصفحة.", accept: "قبول والإذن", decline: "لا آذن", language: "اللغة",
    codeTitle: "أكّد أنك أنت", codeSent: (m) => `أرسلنا رمزًا من 6 أرقام إلى ${m}.`, codeLabel: "الرمز", sendCode: "أرسل رمزًا إلى بريدي", resendCode: "أرسل رمزًا آخر", verify: "تأكيد والإذن",
    codeWrong: "الرمز غير صحيح.", codeExpired: "انتهت صلاحية الرمز. اطلب رمزًا جديدًا.", tooMany: "محاولات كثيرة. اطلب رمزًا جديدًا أو تواصل مع العيادة.", noEmail: "ليس لدينا بريدك الإلكتروني فلا يمكننا إرسال رمز. سيُسجَّل قبولك مع التاريخ والوقت والجهاز.", thanks: "شكرًا. تم تسجيل إذنك.", error: "تعذّر تسجيل ردّك. حاول مرة أخرى.",
    sheetLabel: "وثيقة الإذن", patientLabel: "المريض", dateLabel: "التاريخ",
    title: "إذن التصوير", subtitle: "إثبات أن المريض يأذن للعيادة بالتقاط صوره السريرية وحفظها.", none: "لا يوجد إذن مسجَّل", pending: "قيد الانتظار: بانتظار المريض", granted: "مأذون", rejected: "رفضه المريض", revoked: "مسحوب",
    methods: { link: "رابط", document: "مستند موقّع", tablet: "توقيع على الجهاز اللوحي" },
    verified: { email_code: "تم التحقق برمز أُرسل إلى البريد", link: "قُبل من الرابط دون رمز", in_clinic: "وُقّع في العيادة", document: "مستند رفعته العيادة" },
    registeredBy: (n, d) => `سجّله ${n} في ${d}`,
    actLink: "إرسال رابط", actDoc: "تسجيل مستند موقّع", actTablet: "التوقيع على الجهاز اللوحي", history: "السجل", revoke: "سحب", revokeNote: "السبب (اختياري)", viewFile: "عرض الملف", weak: "دون رمز تحقق: الإثبات أضعف.",
    linkTitle: "إرسال رابط الإذن", chEmail: (e) => `إرسال بالبريد إلى ${e}`, chNoEmail: "لا يوجد بريد مسجَّل للمريض", chWhatsapp: "إرسال عبر واتساب", chCopy: "نسخ الرابط فقط", create: "إنشاء الرابط",
    copied: "تم نسخ الرابط", linkValid: "ينتهي الرابط خلال 7 أيام ويُستخدم مرة واحدة.", emailSent: "تم إرسال البريد.", emailFailed: "تعذّر إرسال البريد؛ انسخ الرابط وأرسله بنفسك.", openWhatsapp: "فتح واتساب", copyLink: "نسخ الرابط",
    docTitle: "تسجيل مستند موقّع", docLabel: "اسم المستند أو نسخته", docFile: "ملف PDF أو صورة للمستند الموقّع", docSave: "حفظ المستند",
    tabTitle: "التوقيع على الجهاز اللوحي", tabSign: "وقّع هنا بإصبعك", tabClear: "مسح التوقيع", tabSave: "تسجيل التوقيع", tabNeedSign: "توقيع المريض مفقود.", tabNeedAccept: "يجب أن يضع المريض علامة الموافقة.",
    close: "إغلاق", saving: "جارٍ الحفظ…", failed: "تعذّر الحفظ. حاول مرة أخرى.",
  },
  zh: {
    loading: "加载中…", invalid: "此链接无效或已过期。请向诊所索取新链接。", done: (d) => `您的授权已于 ${d} 记录。您可以关闭此页面。`, declined: "我们已记录您不授权拍摄照片。您可以关闭此页面。", accept: "接受并授权", decline: "我不授权", language: "语言",
    codeTitle: "确认是您本人", codeSent: (m) => `我们已向 ${m} 发送 6 位验证码。`, codeLabel: "验证码", sendCode: "向我的邮箱发送验证码", resendCode: "再发送一个验证码", verify: "确认并授权",
    codeWrong: "验证码不正确。", codeExpired: "验证码已过期，请重新获取。", tooMany: "尝试次数过多。请重新获取验证码或联系诊所。", noEmail: "我们没有您的邮箱，无法发送验证码。您的同意将连同日期、时间和设备一并记录。", thanks: "谢谢。您的授权已记录。", error: "无法记录您的回复，请重试。",
    sheetLabel: "授权文件", patientLabel: "患者", dateLabel: "日期",
    title: "照片授权", subtitle: "记录患者授权诊所拍摄并保存其临床照片。", none: "尚无授权记录", pending: "待处理：等待患者", granted: "已授权", rejected: "患者已拒绝", revoked: "已撤回",
    methods: { link: "链接", document: "已签文件", tablet: "平板签名" },
    verified: { email_code: "已通过发送到邮箱的验证码验证", link: "通过链接接受，未使用验证码", in_clinic: "在诊所签署", document: "诊所上传的文件" },
    registeredBy: (n, d) => `由 ${n} 于 ${d} 记录`,
    actLink: "发送链接", actDoc: "登记已签文件", actTablet: "在平板上签名", history: "历史记录", revoke: "撤回", revokeNote: "原因（可选）", viewFile: "查看文件", weak: "无验证码：证据较弱。",
    linkTitle: "发送授权链接", chEmail: (e) => `通过邮件发送至 ${e}`, chNoEmail: "患者没有登记邮箱", chWhatsapp: "通过 WhatsApp 发送", chCopy: "仅复制链接", create: "创建链接",
    copied: "链接已复制", linkValid: "链接 7 天后失效，且只能使用一次。", emailSent: "邮件已发送。", emailFailed: "邮件发送失败；请复制链接自行发送。", openWhatsapp: "打开 WhatsApp", copyLink: "复制链接",
    docTitle: "登记已签文件", docLabel: "文件名称或版本", docFile: "已签文件的 PDF 或照片", docSave: "保存文件",
    tabTitle: "平板签名", tabSign: "请用手指在此签名", tabClear: "清除签名", tabSave: "登记签名", tabNeedSign: "缺少患者签名。", tabNeedAccept: "患者必须勾选同意。",
    close: "关闭", saving: "保存中…", failed: "无法保存，请重试。",
  },
};
