import type { LangCode } from "@/lib/language";

type Text = {
  // Tablet / computer
  button: string; title: string; scan: string; orLink: string; copyLink: string; copied: string;
  progress: (taken: number, total: number) => string; expires: (minutes: number) => string;
  newLink: string; close: string; creating: string; failed: string;
  // Phone
  phoneTitle: (phase: string) => string; take: string; retake: string; taken: string; optional: string;
  saving: string; saveFailed: string; finish: string; doneTitle: string; doneText: string;
  goneTitle: string; goneText: string; loading: string; progressPhone: (taken: number, total: number) => string;
};

export const CAPTURE_TEXT: Record<LangCode, Text> = {
  es: {
    button: "Continuar en el celular", title: "Continuar en el celular", scan: "Escanea este código con la cámara del celular para tomar las fotos de esta fase. Al terminar, vuelve a esta pantalla.",
    orLink: "O abre este enlace en el celular:", copyLink: "Copiar enlace", copied: "Enlace copiado",
    progress: (n, t) => `${n} de ${t} fotos tomadas`, expires: (m) => `El enlace vence en ${m} min.`, newLink: "Generar enlace nuevo", close: "Cerrar y desactivar el enlace", creating: "Preparando el enlace…", failed: "No pudimos preparar el enlace.",
    phoneTitle: (p) => `Fotos: ${p}`, take: "Tomar foto", retake: "Repetir", taken: "Tomada", optional: " (opcional)",
    saving: "Guardando…", saveFailed: "No pudimos guardar la foto. Inténtalo de nuevo.", finish: "Terminar y volver", doneTitle: "Listo", doneText: "Las fotos ya están en la ficha. Vuelve a la tablet o al computador para continuar.",
    goneTitle: "Enlace no disponible", goneText: "Este enlace ya no está activo. Pide uno nuevo desde la tablet o el computador.", loading: "Cargando…", progressPhone: (n, t) => `${n} de ${t} fotos`,
  },
  en: {
    button: "Continue on phone", title: "Continue on your phone", scan: "Scan this code with your phone's camera to take this phase's photos. When you finish, come back to this screen.",
    orLink: "Or open this link on your phone:", copyLink: "Copy link", copied: "Link copied",
    progress: (n, t) => `${n} of ${t} photos taken`, expires: (m) => `The link expires in ${m} min.`, newLink: "Create a new link", close: "Close and turn off the link", creating: "Preparing the link…", failed: "We could not prepare the link.",
    phoneTitle: (p) => `Photos: ${p}`, take: "Take photo", retake: "Retake", taken: "Taken", optional: " (optional)",
    saving: "Saving…", saveFailed: "We could not save the photo. Please try again.", finish: "Finish and go back", doneTitle: "Done", doneText: "The photos are already in the record. Go back to the tablet or computer to continue.",
    goneTitle: "Link unavailable", goneText: "This link is no longer active. Ask for a new one from the tablet or computer.", loading: "Loading…", progressPhone: (n, t) => `${n} of ${t} photos`,
  },
  pt: {
    button: "Continuar no celular", title: "Continuar no celular", scan: "Escaneie este código com a câmera do celular para tirar as fotos desta fase. Ao terminar, volte a esta tela.",
    orLink: "Ou abra este link no celular:", copyLink: "Copiar link", copied: "Link copiado",
    progress: (n, t) => `${n} de ${t} fotos tiradas`, expires: (m) => `O link expira em ${m} min.`, newLink: "Gerar novo link", close: "Fechar e desativar o link", creating: "Preparando o link…", failed: "Não foi possível preparar o link.",
    phoneTitle: (p) => `Fotos: ${p}`, take: "Tirar foto", retake: "Repetir", taken: "Tirada", optional: " (opcional)",
    saving: "Salvando…", saveFailed: "Não foi possível salvar a foto. Tente novamente.", finish: "Concluir e voltar", doneTitle: "Pronto", doneText: "As fotos já estão na ficha. Volte ao tablet ou ao computador para continuar.",
    goneTitle: "Link indisponível", goneText: "Este link não está mais ativo. Peça um novo no tablet ou no computador.", loading: "Carregando…", progressPhone: (n, t) => `${n} de ${t} fotos`,
  },
  fr: {
    button: "Continuer sur le téléphone", title: "Continuer sur le téléphone", scan: "Scannez ce code avec l'appareil photo du téléphone pour prendre les photos de cette phase. Une fois terminé, revenez à cet écran.",
    orLink: "Ou ouvrez ce lien sur le téléphone :", copyLink: "Copier le lien", copied: "Lien copié",
    progress: (n, t) => `${n} sur ${t} photos prises`, expires: (m) => `Le lien expire dans ${m} min.`, newLink: "Créer un nouveau lien", close: "Fermer et désactiver le lien", creating: "Préparation du lien…", failed: "Impossible de préparer le lien.",
    phoneTitle: (p) => `Photos : ${p}`, take: "Prendre la photo", retake: "Reprendre", taken: "Prise", optional: " (facultatif)",
    saving: "Enregistrement…", saveFailed: "Impossible d'enregistrer la photo. Réessayez.", finish: "Terminer et revenir", doneTitle: "Terminé", doneText: "Les photos sont déjà dans le dossier. Revenez à la tablette ou à l'ordinateur pour continuer.",
    goneTitle: "Lien indisponible", goneText: "Ce lien n'est plus actif. Demandez-en un nouveau depuis la tablette ou l'ordinateur.", loading: "Chargement…", progressPhone: (n, t) => `${n} sur ${t} photos`,
  },
  de: {
    button: "Am Handy fortfahren", title: "Am Handy fortfahren", scan: "Scannen Sie diesen Code mit der Handykamera, um die Fotos dieser Phase aufzunehmen. Danach kehren Sie zu diesem Bildschirm zurück.",
    orLink: "Oder öffnen Sie diesen Link am Handy:", copyLink: "Link kopieren", copied: "Link kopiert",
    progress: (n, t) => `${n} von ${t} Fotos aufgenommen`, expires: (m) => `Der Link läuft in ${m} Min. ab.`, newLink: "Neuen Link erstellen", close: "Schließen und Link deaktivieren", creating: "Link wird vorbereitet…", failed: "Der Link konnte nicht vorbereitet werden.",
    phoneTitle: (p) => `Fotos: ${p}`, take: "Foto aufnehmen", retake: "Wiederholen", taken: "Aufgenommen", optional: " (optional)",
    saving: "Wird gespeichert…", saveFailed: "Das Foto konnte nicht gespeichert werden. Bitte erneut versuchen.", finish: "Fertig und zurück", doneTitle: "Fertig", doneText: "Die Fotos sind bereits in der Akte. Kehren Sie zum Tablet oder Computer zurück.",
    goneTitle: "Link nicht verfügbar", goneText: "Dieser Link ist nicht mehr aktiv. Fordern Sie am Tablet oder Computer einen neuen an.", loading: "Wird geladen…", progressPhone: (n, t) => `${n} von ${t} Fotos`,
  },
  it: {
    button: "Continua sul cellulare", title: "Continua sul cellulare", scan: "Inquadra questo codice con la fotocamera del cellulare per scattare le foto di questa fase. Al termine, torna a questa schermata.",
    orLink: "Oppure apri questo link sul cellulare:", copyLink: "Copia link", copied: "Link copiato",
    progress: (n, t) => `${n} di ${t} foto scattate`, expires: (m) => `Il link scade tra ${m} min.`, newLink: "Crea un nuovo link", close: "Chiudi e disattiva il link", creating: "Preparazione del link…", failed: "Impossibile preparare il link.",
    phoneTitle: (p) => `Foto: ${p}`, take: "Scatta foto", retake: "Ripeti", taken: "Scattata", optional: " (facoltativa)",
    saving: "Salvataggio…", saveFailed: "Impossibile salvare la foto. Riprova.", finish: "Termina e torna indietro", doneTitle: "Fatto", doneText: "Le foto sono già nella scheda. Torna al tablet o al computer per continuare.",
    goneTitle: "Link non disponibile", goneText: "Questo link non è più attivo. Chiedine uno nuovo dal tablet o dal computer.", loading: "Caricamento…", progressPhone: (n, t) => `${n} di ${t} foto`,
  },
  tr: {
    button: "Telefonda devam et", title: "Telefonda devam et", scan: "Bu aşamanın fotoğraflarını çekmek için bu kodu telefonunuzun kamerasıyla tarayın. Bitince bu ekrana dönün.",
    orLink: "Ya da bu bağlantıyı telefonda açın:", copyLink: "Bağlantıyı kopyala", copied: "Bağlantı kopyalandı",
    progress: (n, t) => `${t} fotoğraftan ${n} tanesi çekildi`, expires: (m) => `Bağlantı ${m} dk içinde sona erer.`, newLink: "Yeni bağlantı oluştur", close: "Kapat ve bağlantıyı devre dışı bırak", creating: "Bağlantı hazırlanıyor…", failed: "Bağlantı hazırlanamadı.",
    phoneTitle: (p) => `Fotoğraflar: ${p}`, take: "Fotoğraf çek", retake: "Tekrarla", taken: "Çekildi", optional: " (isteğe bağlı)",
    saving: "Kaydediliyor…", saveFailed: "Fotoğraf kaydedilemedi. Lütfen tekrar deneyin.", finish: "Bitir ve geri dön", doneTitle: "Tamam", doneText: "Fotoğraflar dosyada. Devam etmek için tablete veya bilgisayara dönün.",
    goneTitle: "Bağlantı kullanılamıyor", goneText: "Bu bağlantı artık etkin değil. Tabletten veya bilgisayardan yenisini isteyin.", loading: "Yükleniyor…", progressPhone: (n, t) => `${t} fotoğraftan ${n}`,
  },
  ar: {
    button: "المتابعة على الهاتف", title: "المتابعة على الهاتف", scan: "امسح هذا الرمز بكاميرا الهاتف لالتقاط صور هذه المرحلة. عند الانتهاء، عد إلى هذه الشاشة.",
    orLink: "أو افتح هذا الرابط على الهاتف:", copyLink: "نسخ الرابط", copied: "تم نسخ الرابط",
    progress: (n, t) => `تم التقاط ${n} من ${t} صور`, expires: (m) => `ينتهي الرابط خلال ${m} دقيقة.`, newLink: "إنشاء رابط جديد", close: "إغلاق وتعطيل الرابط", creating: "جارٍ تجهيز الرابط…", failed: "تعذّر تجهيز الرابط.",
    phoneTitle: (p) => `الصور: ${p}`, take: "التقاط صورة", retake: "إعادة", taken: "تم الالتقاط", optional: " (اختياري)",
    saving: "جارٍ الحفظ…", saveFailed: "تعذّر حفظ الصورة. حاول مرة أخرى.", finish: "إنهاء والعودة", doneTitle: "تم", doneText: "الصور موجودة الآن في الملف. عد إلى الجهاز اللوحي أو الحاسوب للمتابعة.",
    goneTitle: "الرابط غير متاح", goneText: "لم يعد هذا الرابط فعّالًا. اطلب رابطًا جديدًا من الجهاز اللوحي أو الحاسوب.", loading: "جارٍ التحميل…", progressPhone: (n, t) => `${n} من ${t} صور`,
  },
  zh: {
    button: "在手机上继续", title: "在手机上继续", scan: "用手机相机扫描此二维码，拍摄本阶段的照片。完成后请回到此屏幕。",
    orLink: "或在手机上打开此链接：", copyLink: "复制链接", copied: "链接已复制",
    progress: (n, t) => `已拍摄 ${n}/${t} 张照片`, expires: (m) => `链接将在 ${m} 分钟后失效。`, newLink: "生成新链接", close: "关闭并停用链接", creating: "正在准备链接…", failed: "无法准备链接。",
    phoneTitle: (p) => `照片：${p}`, take: "拍照", retake: "重拍", taken: "已拍", optional: "（可选）",
    saving: "正在保存…", saveFailed: "无法保存照片，请重试。", finish: "完成并返回", doneTitle: "完成", doneText: "照片已存入病历。请回到平板或电脑继续。",
    goneTitle: "链接不可用", goneText: "此链接已失效。请在平板或电脑上重新获取。", loading: "加载中…", progressPhone: (n, t) => `${n}/${t} 张照片`,
  },
};
