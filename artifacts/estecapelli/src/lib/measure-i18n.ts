import type { LangCode } from "@/lib/language";

type Text = {
  // Herramienta de medición
  toolTitle: string; pickCoin: string; customRef: string; customMm: string; stepCoin: string; stepLesion: string; dragHint: string;
  undo: string; reset: string; save: string; saving: string; remove: string; close: string; saveFailed: string;
  result: (mm: string, cm: string) => string; margin: (pct: number) => string; resultNoteLead: string; needPoints: string;
  // Botones y avisos
  measureButton: string; remeasureButton: string; staffMeasure: string; measuredBadge: (mm: string) => string; measuredBy: (who: string) => string;
  patientBy: string; staffBy: string; optionalNote: string;
  // Etiquetas de monedas
  coinOld: string; coinNew: string; coinTenSides: string;
  // Protocolo para el paciente
  protoTitle: string; protoIntro: string; protoSteps: string[]; protoCoins: string; protoDisclaimer: string;
};

export const MEASURE_TEXT: Record<LangCode, Text> = {
  es: {
    toolTitle: "Medir la lesión", pickCoin: "Moneda que pusiste junto a la lesión", customRef: "Otra referencia (regla o pegatina)", customMm: "Tamaño de la referencia (mm)",
    stepCoin: "Paso 1 de 2: toca dos bordes opuestos de la moneda, pasando por su centro.", stepLesion: "Paso 2 de 2: toca los dos extremos de la lesión, por donde es más larga.", dragHint: "Puedes arrastrar los puntos para ajustarlos; al moverlos verás una lupa.",
    undo: "Deshacer último punto", reset: "Empezar de nuevo", save: "Guardar medida", saving: "Guardando…", remove: "Quitar medida", close: "Cerrar", saveFailed: "No pudimos guardar la medida. Inténtalo de nuevo.",
    result: (mm, cm) => `Mide unos ${mm} mm (${cm} cm)`, margin: (p) => `margen de error estimado ±${p} %`, resultNoteLead: "Es una medida aproximada de referencia; tu equipo médico la revisará.", needPoints: "Marca los dos bordes de la moneda y los dos extremos de la lesión.",
    measureButton: "Medir mi lesión", remeasureButton: "Volver a medir", staffMeasure: "Medir", measuredBadge: (mm) => `Medida: ${mm} mm`, measuredBy: (who) => `Medida por ${who}`, patientBy: "el paciente", staffBy: "el personal", optionalNote: "Es opcional, pero ayuda a tu médico.",
    coinOld: "antigua", coinNew: "nueva", coinTenSides: "10 lados",
    protoTitle: "Cómo medir tu lesión con una moneda", protoIntro: "Para saber cuánto mide, necesitamos una moneda de tamaño conocido al lado de la lesión.",
    protoSteps: [
      "Elige una moneda limpia y sin dobleces. Las de $500 y $100 son las más fáciles de ver.",
      "Apóyala sobre la piel, pegada junto a la lesión, sin taparla ni encimarla.",
      "Sostén el celular paralelo a la piel (de frente, sin inclinarlo) a unos 15–20 cm. Que se vean enteras la lesión y la moneda, con espacio alrededor.",
      "Usa buena luz y evita el flash directo, que genera reflejos. Revisa que la foto salga nítida y se vean bien los bordes de la moneda.",
      "Después de tomarla, te pediremos marcar los bordes de la moneda y los extremos de la lesión para calcular el tamaño.",
    ],
    protoCoins: "Monedas que puedes usar", protoDisclaimer: "La medida es aproximada y no reemplaza la evaluación de tu médico.",
  },
  en: {
    toolTitle: "Measure the lesion", pickCoin: "Coin you placed next to the lesion", customRef: "Other reference (ruler or sticker)", customMm: "Reference size (mm)",
    stepCoin: "Step 1 of 2: tap two opposite edges of the coin, across its center.", stepLesion: "Step 2 of 2: tap the two ends of the lesion, along its longest side.", dragHint: "You can drag the points to adjust them; a magnifier appears as you move them.",
    undo: "Undo last point", reset: "Start over", save: "Save measurement", saving: "Saving…", remove: "Remove measurement", close: "Close", saveFailed: "We could not save the measurement. Please try again.",
    result: (mm, cm) => `About ${mm} mm (${cm} cm)`, margin: (p) => `estimated margin of error ±${p}%`, resultNoteLead: "This is an approximate reference measurement; your medical team will review it.", needPoints: "Mark the two edges of the coin and the two ends of the lesion.",
    measureButton: "Measure my lesion", remeasureButton: "Measure again", staffMeasure: "Measure", measuredBadge: (mm) => `Measured: ${mm} mm`, measuredBy: (who) => `Measured by ${who}`, patientBy: "the patient", staffBy: "staff", optionalNote: "It is optional, but it helps your doctor.",
    coinOld: "old", coinNew: "new", coinTenSides: "10 sides",
    protoTitle: "How to measure your lesion with a coin", protoIntro: "To know its size, we need a coin of a known size next to the lesion.",
    protoSteps: [
      "Pick a clean, unbent coin. The $500 and $100 coins are the easiest to see.",
      "Rest it on the skin right next to the lesion, without covering or overlapping it.",
      "Hold the phone parallel to the skin (straight on, not tilted) about 15–20 cm away. Keep the whole lesion and the coin in view, with space around them.",
      "Use good light and avoid direct flash, which creates glare. Check that the photo is sharp and the coin's edges are clear.",
      "After taking it, we will ask you to mark the coin's edges and the lesion's ends to calculate its size.",
    ],
    protoCoins: "Coins you can use", protoDisclaimer: "The measurement is approximate and does not replace your doctor's assessment.",
  },
  pt: {
    toolTitle: "Medir a lesão", pickCoin: "Moeda que você colocou ao lado da lesão", customRef: "Outra referência (régua ou adesivo)", customMm: "Tamanho da referência (mm)",
    stepCoin: "Passo 1 de 2: toque em duas bordas opostas da moeda, passando pelo centro.", stepLesion: "Passo 2 de 2: toque nas duas extremidades da lesão, no sentido mais longo.", dragHint: "Você pode arrastar os pontos para ajustá-los; ao movê-los aparece uma lupa.",
    undo: "Desfazer último ponto", reset: "Recomeçar", save: "Salvar medida", saving: "Salvando…", remove: "Remover medida", close: "Fechar", saveFailed: "Não foi possível salvar a medida. Tente novamente.",
    result: (mm, cm) => `Mede cerca de ${mm} mm (${cm} cm)`, margin: (p) => `margem de erro estimada ±${p} %`, resultNoteLead: "É uma medida aproximada de referência; sua equipe médica irá revisá-la.", needPoints: "Marque as duas bordas da moeda e as duas extremidades da lesão.",
    measureButton: "Medir minha lesão", remeasureButton: "Medir novamente", staffMeasure: "Medir", measuredBadge: (mm) => `Medida: ${mm} mm`, measuredBy: (who) => `Medida por ${who}`, patientBy: "o paciente", staffBy: "a equipe", optionalNote: "É opcional, mas ajuda seu médico.",
    coinOld: "antiga", coinNew: "nova", coinTenSides: "10 lados",
    protoTitle: "Como medir sua lesão com uma moeda", protoIntro: "Para saber o tamanho, precisamos de uma moeda de tamanho conhecido ao lado da lesão.",
    protoSteps: [
      "Escolha uma moeda limpa e sem dobras. As de $500 e $100 são as mais fáceis de ver.",
      "Apoie-a sobre a pele, junto à lesão, sem cobri-la nem sobrepô-la.",
      "Segure o celular paralelo à pele (de frente, sem inclinar) a uns 15–20 cm. Mantenha a lesão e a moeda inteiras no quadro, com espaço ao redor.",
      "Use boa luz e evite o flash direto, que causa reflexos. Confira se a foto está nítida e se as bordas da moeda aparecem bem.",
      "Depois de tirá-la, pediremos que marque as bordas da moeda e as extremidades da lesão para calcular o tamanho.",
    ],
    protoCoins: "Moedas que você pode usar", protoDisclaimer: "A medida é aproximada e não substitui a avaliação do seu médico.",
  },
  fr: {
    toolTitle: "Mesurer la lésion", pickCoin: "Pièce placée à côté de la lésion", customRef: "Autre référence (règle ou autocollant)", customMm: "Taille de la référence (mm)",
    stepCoin: "Étape 1 sur 2 : touchez deux bords opposés de la pièce, en passant par son centre.", stepLesion: "Étape 2 sur 2 : touchez les deux extrémités de la lésion, dans sa plus grande longueur.", dragHint: "Vous pouvez faire glisser les points pour les ajuster ; une loupe apparaît.",
    undo: "Annuler le dernier point", reset: "Recommencer", save: "Enregistrer la mesure", saving: "Enregistrement…", remove: "Supprimer la mesure", close: "Fermer", saveFailed: "Impossible d'enregistrer la mesure. Réessayez.",
    result: (mm, cm) => `Environ ${mm} mm (${cm} cm)`, margin: (p) => `marge d'erreur estimée ±${p} %`, resultNoteLead: "Mesure approximative de référence ; votre équipe médicale la vérifiera.", needPoints: "Marquez les deux bords de la pièce et les deux extrémités de la lésion.",
    measureButton: "Mesurer ma lésion", remeasureButton: "Mesurer à nouveau", staffMeasure: "Mesurer", measuredBadge: (mm) => `Mesure : ${mm} mm`, measuredBy: (who) => `Mesurée par ${who}`, patientBy: "le patient", staffBy: "l'équipe", optionalNote: "C'est facultatif, mais cela aide votre médecin.",
    coinOld: "ancienne", coinNew: "nouvelle", coinTenSides: "10 côtés",
    protoTitle: "Comment mesurer votre lésion avec une pièce", protoIntro: "Pour connaître sa taille, il faut une pièce de taille connue à côté de la lésion.",
    protoSteps: [
      "Choisissez une pièce propre et non pliée. Celles de $500 et $100 sont les plus faciles à voir.",
      "Posez-la sur la peau, tout près de la lésion, sans la couvrir ni la chevaucher.",
      "Tenez le téléphone parallèle à la peau (de face, sans l'incliner) à environ 15–20 cm. Gardez la lésion et la pièce entières dans le cadre, avec de l'espace autour.",
      "Utilisez une bonne lumière et évitez le flash direct, qui crée des reflets. Vérifiez que la photo est nette et que les bords de la pièce sont bien visibles.",
      "Après la prise, nous vous demanderons de marquer les bords de la pièce et les extrémités de la lésion pour calculer sa taille.",
    ],
    protoCoins: "Pièces utilisables", protoDisclaimer: "La mesure est approximative et ne remplace pas l'évaluation de votre médecin.",
  },
  de: {
    toolTitle: "Läsion messen", pickCoin: "Münze neben der Läsion", customRef: "Andere Referenz (Lineal oder Aufkleber)", customMm: "Größe der Referenz (mm)",
    stepCoin: "Schritt 1 von 2: Tippen Sie auf zwei gegenüberliegende Ränder der Münze, durch die Mitte.", stepLesion: "Schritt 2 von 2: Tippen Sie auf die beiden Enden der Läsion, entlang der längsten Seite.", dragHint: "Sie können die Punkte ziehen, um sie anzupassen; dabei erscheint eine Lupe.",
    undo: "Letzten Punkt rückgängig", reset: "Neu beginnen", save: "Messung speichern", saving: "Wird gespeichert…", remove: "Messung entfernen", close: "Schließen", saveFailed: "Die Messung konnte nicht gespeichert werden. Bitte erneut versuchen.",
    result: (mm, cm) => `Etwa ${mm} mm (${cm} cm)`, margin: (p) => `geschätzte Fehlermarge ±${p} %`, resultNoteLead: "Dies ist ein ungefährer Referenzwert; Ihr Ärzteteam prüft ihn.", needPoints: "Markieren Sie die beiden Ränder der Münze und die beiden Enden der Läsion.",
    measureButton: "Meine Läsion messen", remeasureButton: "Erneut messen", staffMeasure: "Messen", measuredBadge: (mm) => `Gemessen: ${mm} mm`, measuredBy: (who) => `Gemessen von ${who}`, patientBy: "dem Patienten", staffBy: "dem Team", optionalNote: "Optional, hilft aber Ihrem Arzt.",
    coinOld: "alt", coinNew: "neu", coinTenSides: "10 Seiten",
    protoTitle: "So messen Sie Ihre Läsion mit einer Münze", protoIntro: "Um die Größe zu bestimmen, brauchen wir neben der Läsion eine Münze bekannter Größe.",
    protoSteps: [
      "Wählen Sie eine saubere, unverbogene Münze. Die $500- und $100-Münzen sind am besten zu erkennen.",
      "Legen Sie sie direkt neben die Läsion auf die Haut, ohne sie zu bedecken oder zu überlappen.",
      "Halten Sie das Handy parallel zur Haut (von vorn, nicht geneigt) in etwa 15–20 cm Abstand. Läsion und Münze sollen vollständig und mit Abstand im Bild sein.",
      "Sorgen Sie für gutes Licht und vermeiden Sie direktes Blitzlicht (Reflexe). Prüfen Sie, dass das Foto scharf ist und die Münzränder gut sichtbar sind.",
      "Nach der Aufnahme bitten wir Sie, die Münzränder und die Enden der Läsion zu markieren, um die Größe zu berechnen.",
    ],
    protoCoins: "Verwendbare Münzen", protoDisclaimer: "Die Messung ist ungefähr und ersetzt nicht die Beurteilung Ihres Arztes.",
  },
  it: {
    toolTitle: "Misura la lesione", pickCoin: "Moneta posta accanto alla lesione", customRef: "Altro riferimento (righello o adesivo)", customMm: "Dimensione del riferimento (mm)",
    stepCoin: "Passo 1 di 2: tocca due bordi opposti della moneta, passando per il centro.", stepLesion: "Passo 2 di 2: tocca le due estremità della lesione, nel senso più lungo.", dragHint: "Puoi trascinare i punti per regolarli; mentre li sposti compare una lente.",
    undo: "Annulla ultimo punto", reset: "Ricomincia", save: "Salva misura", saving: "Salvataggio…", remove: "Rimuovi misura", close: "Chiudi", saveFailed: "Impossibile salvare la misura. Riprova.",
    result: (mm, cm) => `Circa ${mm} mm (${cm} cm)`, margin: (p) => `margine di errore stimato ±${p} %`, resultNoteLead: "È una misura approssimativa di riferimento; il tuo team medico la verificherà.", needPoints: "Segna i due bordi della moneta e le due estremità della lesione.",
    measureButton: "Misura la mia lesione", remeasureButton: "Misura di nuovo", staffMeasure: "Misura", measuredBadge: (mm) => `Misura: ${mm} mm`, measuredBy: (who) => `Misurata da ${who}`, patientBy: "il paziente", staffBy: "il personale", optionalNote: "È facoltativo, ma aiuta il tuo medico.",
    coinOld: "vecchia", coinNew: "nuova", coinTenSides: "10 lati",
    protoTitle: "Come misurare la lesione con una moneta", protoIntro: "Per conoscerne le dimensioni serve una moneta di misura nota accanto alla lesione.",
    protoSteps: [
      "Scegli una moneta pulita e non piegata. Quelle da $500 e $100 sono le più facili da vedere.",
      "Appoggiala sulla pelle, accanto alla lesione, senza coprirla né sovrapporla.",
      "Tieni il telefono parallelo alla pelle (di fronte, senza inclinarlo) a circa 15–20 cm. Lesione e moneta devono essere intere nell'inquadratura, con spazio intorno.",
      "Usa una buona luce ed evita il flash diretto, che crea riflessi. Controlla che la foto sia nitida e che i bordi della moneta si vedano bene.",
      "Dopo lo scatto ti chiederemo di segnare i bordi della moneta e le estremità della lesione per calcolarne la dimensione.",
    ],
    protoCoins: "Monete utilizzabili", protoDisclaimer: "La misura è approssimativa e non sostituisce la valutazione del tuo medico.",
  },
  tr: {
    toolTitle: "Lezyonu ölç", pickCoin: "Lezyonun yanına koyduğunuz madeni para", customRef: "Başka referans (cetvel veya etiket)", customMm: "Referans boyutu (mm)",
    stepCoin: "Adım 1/2: Paranın karşılıklı iki kenarına dokunun (merkezden geçecek şekilde).", stepLesion: "Adım 2/2: Lezyonun en uzun olduğu yönde iki ucuna dokunun.", dragHint: "Noktaları sürükleyerek ayarlayabilirsiniz; hareket ettirirken bir büyüteç görünür.",
    undo: "Son noktayı geri al", reset: "Baştan başla", save: "Ölçümü kaydet", saving: "Kaydediliyor…", remove: "Ölçümü kaldır", close: "Kapat", saveFailed: "Ölçüm kaydedilemedi. Lütfen tekrar deneyin.",
    result: (mm, cm) => `Yaklaşık ${mm} mm (${cm} cm)`, margin: (p) => `tahmini hata payı ±%${p}`, resultNoteLead: "Bu yaklaşık bir referans ölçümdür; tıbbi ekibiniz inceleyecektir.", needPoints: "Paranın iki kenarını ve lezyonun iki ucunu işaretleyin.",
    measureButton: "Lezyonumu ölç", remeasureButton: "Yeniden ölç", staffMeasure: "Ölç", measuredBadge: (mm) => `Ölçü: ${mm} mm`, measuredBy: (who) => `Ölçen: ${who}`, patientBy: "hasta", staffBy: "ekip", optionalNote: "İsteğe bağlıdır ama doktorunuza yardımcı olur.",
    coinOld: "eski", coinNew: "yeni", coinTenSides: "10 kenarlı",
    protoTitle: "Lezyonunuzu madeni parayla nasıl ölçersiniz", protoIntro: "Boyutu bilmek için lezyonun yanında boyutu bilinen bir madeni para gerekir.",
    protoSteps: [
      "Temiz ve bükülmemiş bir para seçin. $500 ve $100 paralar en kolay görünenlerdir.",
      "Parayı lezyonun hemen yanına, ona dokunmadan ve üstünü örtmeden cilde koyun.",
      "Telefonu cilde paralel (tam karşıdan, eğmeden) yaklaşık 15–20 cm uzakta tutun. Lezyon ve para çerçevede tam görünsün, etrafında boşluk kalsın.",
      "İyi ışık kullanın, yansıma yapan doğrudan flaştan kaçının. Fotoğrafın net olduğundan ve paranın kenarlarının iyi göründüğünden emin olun.",
      "Çektikten sonra boyutu hesaplamak için paranın kenarlarını ve lezyonun uçlarını işaretlemenizi isteyeceğiz.",
    ],
    protoCoins: "Kullanabileceğiniz paralar", protoDisclaimer: "Ölçüm yaklaşıktır ve doktorunuzun değerlendirmesinin yerini tutmaz.",
  },
  ar: {
    toolTitle: "قياس الآفة", pickCoin: "العملة التي وضعتها بجانب الآفة", customRef: "مرجع آخر (مسطرة أو ملصق)", customMm: "حجم المرجع (مم)",
    stepCoin: "الخطوة 1 من 2: المس حافتين متقابلتين للعملة مرورًا بمركزها.", stepLesion: "الخطوة 2 من 2: المس طرفي الآفة على امتداد أطول جهة فيها.", dragHint: "يمكنك سحب النقاط لضبطها؛ تظهر عدسة مكبّرة أثناء التحريك.",
    undo: "تراجع عن آخر نقطة", reset: "البدء من جديد", save: "حفظ القياس", saving: "جارٍ الحفظ…", remove: "إزالة القياس", close: "إغلاق", saveFailed: "تعذّر حفظ القياس. حاول مرة أخرى.",
    result: (mm, cm) => `حوالي ${mm} مم (${cm} سم)`, margin: (p) => `هامش الخطأ التقديري ±${p}٪`, resultNoteLead: "هذا قياس مرجعي تقريبي؛ سيراجعه فريقك الطبي.", needPoints: "حدّد حافتي العملة وطرفي الآفة.",
    measureButton: "قياس الآفة", remeasureButton: "إعادة القياس", staffMeasure: "قياس", measuredBadge: (mm) => `القياس: ${mm} مم`, measuredBy: (who) => `قاسه ${who}`, patientBy: "المريض", staffBy: "الفريق", optionalNote: "اختياري لكنه يساعد طبيبك.",
    coinOld: "قديمة", coinNew: "جديدة", coinTenSides: "10 أضلاع",
    protoTitle: "كيف تقيس الآفة باستخدام عملة", protoIntro: "لمعرفة الحجم نحتاج إلى عملة معلومة الحجم بجانب الآفة.",
    protoSteps: [
      "اختر عملة نظيفة وغير مثنية. عملتا $500 و$100 هما الأسهل ظهورًا.",
      "ضعها على الجلد بجانب الآفة مباشرة دون أن تغطيها أو تتداخل معها.",
      "أمسك الهاتف موازيًا للجلد (من الأمام دون إمالة) على بُعد 15–20 سم تقريبًا. ليظهر كلٌّ من الآفة والعملة كاملًا مع مساحة حولهما.",
      "استخدم إضاءة جيدة وتجنّب الفلاش المباشر لأنه يسبب انعكاسات. تأكد من وضوح الصورة وظهور حواف العملة جيدًا.",
      "بعد التقاط الصورة سنطلب منك تحديد حواف العملة وطرفي الآفة لحساب الحجم.",
    ],
    protoCoins: "العملات التي يمكنك استخدامها", protoDisclaimer: "القياس تقريبي ولا يغني عن تقييم طبيبك.",
  },
  zh: {
    toolTitle: "测量皮损", pickCoin: "放在皮损旁边的硬币", customRef: "其他参照物（尺子或贴纸）", customMm: "参照物尺寸（毫米）",
    stepCoin: "第 1 步，共 2 步：点击硬币相对的两个边缘（经过圆心）。", stepLesion: "第 2 步，共 2 步：点击皮损最长方向的两端。", dragHint: "可以拖动点来微调；拖动时会出现放大镜。",
    undo: "撤销上一个点", reset: "重新开始", save: "保存测量", saving: "正在保存…", remove: "删除测量", close: "关闭", saveFailed: "无法保存测量，请重试。",
    result: (mm, cm) => `约 ${mm} 毫米（${cm} 厘米）`, margin: (p) => `估计误差 ±${p}%`, resultNoteLead: "这是近似的参考测量，医疗团队会复核。", needPoints: "请标出硬币的两个边缘和皮损的两端。",
    measureButton: "测量我的皮损", remeasureButton: "重新测量", staffMeasure: "测量", measuredBadge: (mm) => `测量：${mm} 毫米`, measuredBy: (who) => `测量者：${who}`, patientBy: "患者", staffBy: "工作人员", optionalNote: "可选，但对医生有帮助。",
    coinOld: "旧版", coinNew: "新版", coinTenSides: "十边形",
    protoTitle: "如何用硬币测量皮损", protoIntro: "要知道大小，需要在皮损旁放一枚尺寸已知的硬币。",
    protoSteps: [
      "选一枚干净、未变形的硬币。$500 和 $100 的硬币最容易看清。",
      "把它贴着皮损旁边放在皮肤上，不要遮挡或压住皮损。",
      "手机与皮肤保持平行（正对拍摄，不要倾斜），相距约 15–20 厘米。让皮损和硬币完整入镜，周围留有空间。",
      "光线要好，避免直接闪光灯造成反光。检查照片清晰、硬币边缘清楚。",
      "拍完后，我们会请您标出硬币的边缘和皮损的两端，以计算大小。",
    ],
    protoCoins: "可使用的硬币", protoDisclaimer: "测量结果仅为近似值，不能替代医生的评估。",
  },
};

/** «$500», «$100 (antigua)», «$50 (10 lados)», … en el idioma de la pantalla. */
export function coinLabel(ref: { denomination: string; mm: number; note?: "old" | "new" | "tenSides" }, lang: LangCode): string {
  const text = MEASURE_TEXT[lang];
  const note = ref.note === "old" ? text.coinOld : ref.note === "new" ? text.coinNew : ref.note === "tenSides" ? text.coinTenSides : "";
  const mm = String(ref.mm).replace(".", lang === "en" || lang === "zh" || lang === "tr" ? "." : ",");
  return `${ref.denomination}${note ? ` (${note})` : ""} · ${mm} mm`;
}
