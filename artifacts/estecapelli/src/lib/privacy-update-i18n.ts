import type { LangCode } from "./language";
import type { LegalSection } from "./legal-i18n";

// Actualización de la política de privacidad por la Ley 21.719 (datos personales). Cada idioma aporta las secciones que se
// añaden o reemplazan en la política base de legal-i18n.ts. Si cambias algo aquí, sube PRIVACY_POLICY_VERSION en el servidor
// (artifacts/api-server/src/lib/legal-version.ts) y la fecha UPDATED de pages/legal.tsx.
export type PrivacyUpdate = {
  basis: LegalSection;       // se inserta después de «Para qué los usamos»
  transfer: string;          // párrafo que se añade a «Con quién se comparten»
  retention: LegalSection;   // reemplaza «Cuánto tiempo los conservamos»
  rights: LegalSection;      // reemplaza «Tus derechos»
  breach: LegalSection;      // se inserta antes de «Cambios en esta política»
};

export const PRIVACY_UPDATE: Record<LangCode, PrivacyUpdate> = {
  es: {
    basis: { h: "Base legal del tratamiento", p: ["Tratamos tus datos de salud con tu consentimiento expreso, que das al enviar tu evaluación, y para los fines sanitarios de la atención que te entrega la clínica. Puedes retirar tu consentimiento en cualquier momento, sin efecto retroactivo, como se explica en «Tus derechos»."] },
    transfer: "Algunos de estos proveedores están fuera de Chile (por ejemplo, en Estados Unidos), así que tus datos pueden tratarse en otros países. Si la clínica activa la transcripción de documentos fotografiados, la imagen del documento se envía al proveedor de inteligencia artificial Anthropic solo para convertirla en texto.",
    retention: { h: "Cuánto tiempo los conservamos", p: ["La clínica conserva tu ficha clínica durante el plazo que fija la ley; una solicitud de eliminación no alcanza a los datos que la ley obliga a conservar. Cuando una clínica deja de usar Clinivista, puede exportar sus datos y después eliminamos los que ya no deba conservar, según lo acordado en el contrato con ella."] },
    rights: { h: "Tus derechos y cómo ejercerlos", ul: [
      "Acceso: saber qué datos tuyos tratamos y recibir una copia.",
      "Rectificación: corregir datos inexactos o incompletos.",
      "Supresión: pedir que eliminemos tus datos, salvo los que la ley obliga a conservar.",
      "Oposición: oponerte a ciertos usos de tus datos.",
      "Portabilidad: recibir tus datos en un formato estructurado y de uso común.",
      "Bloqueo temporal: pedir que se suspenda el tratamiento mientras se resuelve una solicitud."],
      after: ["Puedes ejercerlos desde la pantalla final de tu evaluación, con el botón «Mis datos y derechos», o escribiendo a {email}. Los gestionamos con la clínica, que es la responsable de tus datos clínicos. Respondemos dentro de 30 días corridos, prorrogables una vez por otros 30 en casos justificados. Si no estás de acuerdo con la respuesta, puedes reclamar ante la Agencia de Protección de Datos Personales de Chile. Aplicamos la Ley N.º 19.628 y, desde su entrada en vigencia, la Ley N.º 21.719."] },
    breach: { h: "Si ocurre un incidente de seguridad", p: ["Si una vulneración de seguridad afecta tus datos, la clínica y Clinivista actuamos de inmediato para contenerla, informamos a la Agencia de Protección de Datos Personales como exige la ley y, cuando se trata de datos sensibles como los de salud, avisamos a las personas afectadas."] },
  },
  en: {
    basis: { h: "Legal basis for processing", p: ["We process your health data with your express consent, which you give when you submit your evaluation, and for the health-care purposes of the care the clinic provides you. You can withdraw your consent at any time, without retroactive effect, as explained in “Your rights”."] },
    transfer: "Some of these providers are outside Chile (for example, in the United States), so your data may be processed in other countries. If the clinic turns on transcription of photographed documents, the image of the document is sent to the artificial-intelligence provider Anthropic only to turn it into text.",
    retention: { h: "How long we keep it", p: ["The clinic keeps your clinical record for the period set by law; a deletion request does not reach data that the law requires to be kept. When a clinic stops using Clinivista, it can export its data and we then delete what it no longer has to keep, as agreed in the contract with it."] },
    rights: { h: "Your rights and how to exercise them", ul: [
      "Access: know what data about you we process and receive a copy.",
      "Rectification: correct inaccurate or incomplete data.",
      "Erasure: ask us to delete your data, except what the law requires to be kept.",
      "Objection: object to certain uses of your data.",
      "Portability: receive your data in a structured, commonly used format.",
      "Temporary blocking: ask for processing to be suspended while a request is resolved."],
      after: ["You can exercise them from the final screen of your evaluation, with the “My data and rights” button, or by writing to {email}. We handle them with the clinic, which is responsible for your clinical data. We reply within 30 calendar days, extendable once by another 30 in justified cases. If you disagree with the reply, you can complain to the Chilean Personal Data Protection Agency. We apply Law No. 19.628 and, once it is in force, Law No. 21.719."] },
    breach: { h: "If a security incident occurs", p: ["If a security breach affects your data, the clinic and Clinivista act immediately to contain it, we inform the Personal Data Protection Agency as the law requires and, when sensitive data such as health data is involved, we notify the people affected."] },
  },
  pt: {
    basis: { h: "Base legal do tratamento", p: ["Tratamos seus dados de saúde com o seu consentimento expresso, que você dá ao enviar sua avaliação, e para as finalidades de saúde do atendimento que a clínica lhe presta. Você pode retirar o consentimento a qualquer momento, sem efeito retroativo, como explicado em «Seus direitos»."] },
    transfer: "Alguns desses fornecedores estão fora do Chile (por exemplo, nos Estados Unidos), portanto seus dados podem ser tratados em outros países. Se a clínica ativar a transcrição de documentos fotografados, a imagem do documento é enviada ao fornecedor de inteligência artificial Anthropic apenas para convertê-la em texto.",
    retention: { h: "Por quanto tempo os conservamos", p: ["A clínica conserva a sua ficha clínica pelo prazo que a lei estabelece; um pedido de eliminação não alcança os dados que a lei obriga a conservar. Quando uma clínica deixa de usar a Clinivista, pode exportar seus dados e depois eliminamos os que ela já não precise conservar, conforme combinado no contrato com ela."] },
    rights: { h: "Seus direitos e como exercê-los", ul: [
      "Acesso: saber quais dados seus tratamos e receber uma cópia.",
      "Retificação: corrigir dados inexatos ou incompletos.",
      "Eliminação: pedir que eliminemos seus dados, exceto os que a lei obriga a conservar.",
      "Oposição: opor-se a certos usos dos seus dados.",
      "Portabilidade: receber seus dados em formato estruturado e de uso comum.",
      "Bloqueio temporário: pedir que o tratamento seja suspenso enquanto um pedido é resolvido."],
      after: ["Você pode exercê-los pela tela final da sua avaliação, no botão «Meus dados e direitos», ou escrevendo para {email}. Tratamos os pedidos junto com a clínica, que é a responsável pelos seus dados clínicos. Respondemos em até 30 dias corridos, prorrogáveis uma vez por mais 30 em casos justificados. Se não concordar com a resposta, você pode reclamar à Agência de Proteção de Dados Pessoais do Chile. Aplicamos a Lei n.º 19.628 e, a partir da sua entrada em vigor, a Lei n.º 21.719."] },
    breach: { h: "Se ocorrer um incidente de segurança", p: ["Se uma violação de segurança afetar seus dados, a clínica e a Clinivista agimos imediatamente para contê-la, informamos a Agência de Proteção de Dados Pessoais como a lei exige e, quando se tratar de dados sensíveis como os de saúde, avisamos as pessoas afetadas."] },
  },
  fr: {
    basis: { h: "Base juridique du traitement", p: ["Nous traitons vos données de santé avec votre consentement exprès, que vous donnez en envoyant votre évaluation, et pour les finalités sanitaires de la prise en charge que la clinique vous assure. Vous pouvez retirer votre consentement à tout moment, sans effet rétroactif, comme expliqué dans « Vos droits »."] },
    transfer: "Certains de ces prestataires sont situés hors du Chili (par exemple aux États-Unis) ; vos données peuvent donc être traitées dans d'autres pays. Si la clinique active la transcription de documents photographiés, l'image du document est envoyée au prestataire d'intelligence artificielle Anthropic uniquement pour la convertir en texte.",
    retention: { h: "Combien de temps nous les conservons", p: ["La clinique conserve votre dossier clinique pendant la durée fixée par la loi ; une demande de suppression ne vise pas les données que la loi oblige à conserver. Lorsqu'une clinique cesse d'utiliser Clinivista, elle peut exporter ses données, puis nous supprimons celles qu'elle n'a plus à conserver, selon le contrat conclu avec elle."] },
    rights: { h: "Vos droits et comment les exercer", ul: [
      "Accès : savoir quelles données vous concernant nous traitons et en recevoir une copie.",
      "Rectification : corriger des données inexactes ou incomplètes.",
      "Suppression : demander que nous supprimions vos données, sauf celles que la loi oblige à conserver.",
      "Opposition : vous opposer à certains usages de vos données.",
      "Portabilité : recevoir vos données dans un format structuré et couramment utilisé.",
      "Blocage temporaire : demander la suspension du traitement pendant l'examen d'une demande."],
      after: ["Vous pouvez les exercer depuis l'écran final de votre évaluation, avec le bouton « Mes données et droits », ou en écrivant à {email}. Nous les traitons avec la clinique, responsable de vos données cliniques. Nous répondons sous 30 jours calendaires, prorogeables une fois de 30 jours dans les cas justifiés. Si vous n'êtes pas d'accord avec la réponse, vous pouvez déposer une réclamation auprès de l'Agence chilienne de protection des données personnelles. Nous appliquons la loi n° 19.628 et, dès son entrée en vigueur, la loi n° 21.719."] },
    breach: { h: "En cas d'incident de sécurité", p: ["Si une violation de sécurité touche vos données, la clinique et Clinivista agissent immédiatement pour la contenir, nous informons l'Agence de protection des données personnelles comme l'exige la loi et, lorsqu'il s'agit de données sensibles comme les données de santé, nous avertissons les personnes concernées."] },
  },
  de: {
    basis: { h: "Rechtsgrundlage der Verarbeitung", p: ["Wir verarbeiten Ihre Gesundheitsdaten mit Ihrer ausdrücklichen Einwilligung, die Sie beim Absenden Ihrer Auswertung erteilen, und für die gesundheitlichen Zwecke der Behandlung, die die Klinik Ihnen bietet. Sie können Ihre Einwilligung jederzeit ohne Rückwirkung widerrufen, wie unter „Ihre Rechte“ erläutert."] },
    transfer: "Einige dieser Anbieter befinden sich außerhalb Chiles (zum Beispiel in den USA), sodass Ihre Daten in anderen Ländern verarbeitet werden können. Aktiviert die Klinik die Transkription fotografierter Dokumente, wird das Bild des Dokuments nur zur Umwandlung in Text an den KI-Anbieter Anthropic gesendet.",
    retention: { h: "Wie lange wir sie aufbewahren", p: ["Die Klinik bewahrt Ihre Patientenakte für die gesetzlich vorgeschriebene Dauer auf; ein Löschantrag erfasst keine Daten, die gesetzlich aufbewahrt werden müssen. Wenn eine Klinik Clinivista nicht mehr nutzt, kann sie ihre Daten exportieren; anschließend löschen wir, was sie nicht mehr aufbewahren muss, gemäß dem Vertrag mit ihr."] },
    rights: { h: "Ihre Rechte und ihre Ausübung", ul: [
      "Auskunft: erfahren, welche Daten über Sie wir verarbeiten, und eine Kopie erhalten.",
      "Berichtigung: unrichtige oder unvollständige Daten korrigieren lassen.",
      "Löschung: verlangen, dass wir Ihre Daten löschen, außer solchen, die gesetzlich aufbewahrt werden müssen.",
      "Widerspruch: bestimmten Verwendungen Ihrer Daten widersprechen.",
      "Übertragbarkeit: Ihre Daten in einem strukturierten, gängigen Format erhalten.",
      "Vorübergehende Sperrung: verlangen, dass die Verarbeitung ausgesetzt wird, bis ein Antrag entschieden ist."],
      after: ["Sie können diese Rechte über den Abschlussbildschirm Ihrer Auswertung mit der Schaltfläche „Meine Daten und Rechte“ oder per E-Mail an {email} ausüben. Wir bearbeiten die Anträge gemeinsam mit der Klinik, die für Ihre klinischen Daten verantwortlich ist. Wir antworten innerhalb von 30 Kalendertagen; in begründeten Fällen ist eine einmalige Verlängerung um weitere 30 Tage möglich. Sind Sie mit der Antwort nicht einverstanden, können Sie sich bei der chilenischen Datenschutzbehörde (Agencia de Protección de Datos Personales) beschweren. Wir wenden das Gesetz Nr. 19.628 und, ab seinem Inkrafttreten, das Gesetz Nr. 21.719 an."] },
    breach: { h: "Bei einem Sicherheitsvorfall", p: ["Wenn eine Sicherheitsverletzung Ihre Daten betrifft, handeln die Klinik und Clinivista sofort, um sie einzudämmen, informieren die Datenschutzbehörde, wie es das Gesetz verlangt, und benachrichtigen die betroffenen Personen, wenn es sich um sensible Daten wie Gesundheitsdaten handelt."] },
  },
  it: {
    basis: { h: "Base giuridica del trattamento", p: ["Trattiamo i tuoi dati sulla salute con il tuo consenso espresso, che dai inviando la tua valutazione, e per le finalità sanitarie dell'assistenza che la clinica ti fornisce. Puoi revocare il consenso in qualsiasi momento, senza effetto retroattivo, come spiegato in «I tuoi diritti»."] },
    transfer: "Alcuni di questi fornitori si trovano fuori dal Cile (ad esempio negli Stati Uniti), quindi i tuoi dati possono essere trattati in altri paesi. Se la clinica attiva la trascrizione dei documenti fotografati, l'immagine del documento viene inviata al fornitore di intelligenza artificiale Anthropic solo per convertirla in testo.",
    retention: { h: "Per quanto tempo li conserviamo", p: ["La clinica conserva la tua cartella clinica per il periodo stabilito dalla legge; una richiesta di cancellazione non riguarda i dati che la legge obbliga a conservare. Quando una clinica smette di usare Clinivista, può esportare i suoi dati e poi cancelliamo quelli che non deve più conservare, secondo quanto concordato nel contratto con essa."] },
    rights: { h: "I tuoi diritti e come esercitarli", ul: [
      "Accesso: sapere quali tuoi dati trattiamo e riceverne una copia.",
      "Rettifica: correggere dati inesatti o incompleti.",
      "Cancellazione: chiedere che cancelliamo i tuoi dati, tranne quelli che la legge obbliga a conservare.",
      "Opposizione: opporti a determinati usi dei tuoi dati.",
      "Portabilità: ricevere i tuoi dati in un formato strutturato e di uso comune.",
      "Blocco temporaneo: chiedere la sospensione del trattamento mentre una richiesta viene risolta."],
      after: ["Puoi esercitarli dalla schermata finale della tua valutazione, con il pulsante «I miei dati e diritti», o scrivendo a {email}. Li gestiamo con la clinica, responsabile dei tuoi dati clinici. Rispondiamo entro 30 giorni di calendario, prorogabili una sola volta di altri 30 in casi giustificati. Se non sei d'accordo con la risposta, puoi presentare reclamo all'Agenzia cilena per la protezione dei dati personali. Applichiamo la legge n. 19.628 e, dalla sua entrata in vigore, la legge n. 21.719."] },
    breach: { h: "Se si verifica un incidente di sicurezza", p: ["Se una violazione di sicurezza riguarda i tuoi dati, la clinica e Clinivista agiamo subito per contenerla, informiamo l'Agenzia per la protezione dei dati personali come richiede la legge e, quando si tratta di dati sensibili come quelli sulla salute, avvisiamo le persone interessate."] },
  },
  tr: {
    basis: { h: "İşlemenin hukuki dayanağı", p: ["Sağlık verilerinizi, değerlendirmenizi gönderirken verdiğiniz açık rızanıza ve kliniğin size sunduğu bakımın sağlık amaçlarına dayanarak işleriz. Rızanızı istediğiniz zaman, geriye dönük etki doğurmadan geri alabilirsiniz; bunu «Haklarınız» bölümünde açıkladık."] },
    transfer: "Bu hizmet sağlayıcıların bir kısmı Şili dışındadır (örneğin ABD'de); bu nedenle verileriniz başka ülkelerde işlenebilir. Klinik, fotoğrafı çekilen belgelerin metne dönüştürülmesini etkinleştirirse, belgenin görüntüsü yalnızca metne çevrilmek üzere yapay zekâ sağlayıcısı Anthropic'e gönderilir.",
    retention: { h: "Ne kadar süre saklarız", p: ["Klinik, klinik dosyanızı kanunun öngördüğü süre boyunca saklar; silme talebi, kanunun saklanmasını zorunlu kıldığı verileri kapsamaz. Bir klinik Clinivista'yı kullanmayı bıraktığında verilerini dışa aktarabilir; ardından, onunla yapılan sözleşmede kararlaştırıldığı üzere, artık saklaması gerekmeyen verileri sileriz."] },
    rights: { h: "Haklarınız ve nasıl kullanılacağı", ul: [
      "Erişim: hakkınızda hangi verileri işlediğimizi öğrenmek ve bir kopya almak.",
      "Düzeltme: hatalı veya eksik verileri düzelttirmek.",
      "Silme: kanunun saklanmasını zorunlu kıldıkları dışındaki verilerinizin silinmesini istemek.",
      "İtiraz: verilerinizin belirli kullanımlarına itiraz etmek.",
      "Taşınabilirlik: verilerinizi yapılandırılmış ve yaygın kullanılan bir biçimde almak.",
      "Geçici engelleme: bir talep sonuçlanana kadar işlemenin durdurulmasını istemek."],
      after: ["Bu hakları değerlendirmenizin son ekranındaki «Verilerim ve haklarım» düğmesinden veya {email} adresine yazarak kullanabilirsiniz. Talepleri, klinik verilerinizden sorumlu olan klinikle birlikte ele alırız. 30 takvim günü içinde yanıt veririz; haklı durumlarda bu süre bir kez 30 gün daha uzatılabilir. Yanıta katılmıyorsanız Şili Kişisel Verilerin Korunması Ajansı'na şikâyette bulunabilirsiniz. 19.628 sayılı Kanunu ve yürürlüğe girdiği andan itibaren 21.719 sayılı Kanunu uygularız."] },
    breach: { h: "Bir güvenlik olayı yaşanırsa", p: ["Bir güvenlik ihlali verilerinizi etkilerse, klinik ve Clinivista olarak ihlali sınırlamak için hemen harekete geçer, kanunun gerektirdiği şekilde Kişisel Verileri Koruma Ajansı'nı bilgilendirir ve sağlık verileri gibi hassas veriler söz konusuysa etkilenen kişilere haber veririz."] },
  },
  ar: {
    basis: { h: "الأساس القانوني للمعالجة", p: ["نعالج بياناتك الصحية بموافقتك الصريحة التي تمنحها عند إرسال تقييمك، ولأغراض الرعاية الصحية التي تقدمها لك العيادة. يمكنك سحب موافقتك في أي وقت دون أثر رجعي، كما هو موضح في «حقوقك»."] },
    transfer: "بعض هؤلاء المزودين خارج تشيلي (مثل الولايات المتحدة)، لذا قد تُعالَج بياناتك في بلدان أخرى. وإذا فعّلت العيادة نسخ المستندات المصوّرة، تُرسل صورة المستند إلى مزوّد الذكاء الاصطناعي Anthropic فقط لتحويلها إلى نص.",
    retention: { h: "مدة الاحتفاظ بها", p: ["تحتفظ العيادة بملفك السريري للمدة التي يحددها القانون؛ ولا يشمل طلب الحذف البيانات التي يُلزم القانون بالاحتفاظ بها. وعندما تتوقف العيادة عن استخدام Clinivista يمكنها تصدير بياناتها، ثم نحذف ما لم يعد عليها الاحتفاظ به وفق ما اتُّفق عليه في العقد معها."] },
    rights: { h: "حقوقك وكيفية ممارستها", ul: [
      "الاطلاع: معرفة البيانات التي نعالجها عنك والحصول على نسخة منها.",
      "التصحيح: تصحيح البيانات غير الدقيقة أو الناقصة.",
      "الحذف: طلب حذف بياناتك، باستثناء ما يُلزم القانون بالاحتفاظ به.",
      "الاعتراض: الاعتراض على استخدامات معينة لبياناتك.",
      "قابلية النقل: الحصول على بياناتك بصيغة منظمة وشائعة الاستخدام.",
      "الحجب المؤقت: طلب إيقاف المعالجة إلى أن يُبَتّ في الطلب."],
      after: ["يمكنك ممارستها من الشاشة الأخيرة لتقييمك عبر زر «بياناتي وحقوقي» أو بالكتابة إلى {email}. نعالج الطلبات مع العيادة، وهي المسؤولة عن بياناتك السريرية. نرد خلال 30 يومًا تقويميًا، قابلة للتمديد مرة واحدة بـ 30 يومًا أخرى في الحالات المبررة. وإذا لم توافق على الرد، يمكنك تقديم شكوى إلى وكالة حماية البيانات الشخصية في تشيلي. نطبّق القانون رقم 19.628، ومنذ بدء نفاذه القانون رقم 21.719."] },
    breach: { h: "في حال وقوع حادث أمني", p: ["إذا أثّر خرق أمني على بياناتك، تتصرف العيادة وClinivista فورًا لاحتوائه، ونُبلغ وكالة حماية البيانات الشخصية كما يشترط القانون، وعندما يتعلق الأمر ببيانات حساسة مثل البيانات الصحية نُخطر الأشخاص المتضررين."] },
  },
  zh: {
    basis: { h: "处理的法律依据", p: ["我们基于您在提交评估时给予的明确同意，并为诊所向您提供诊疗服务的医疗目的，处理您的健康数据。您可以随时撤回同意，撤回不具有溯及力，详见“您的权利”。"] },
    transfer: "其中部分服务商位于智利境外（例如美国），因此您的数据可能在其他国家处理。如果诊所启用拍照文件转录功能，文件图像仅会发送给人工智能服务商 Anthropic，用于转换为文字。",
    retention: { h: "保存多长时间", p: ["诊所按法律规定的期限保存您的病历；删除请求不适用于法律要求必须保存的数据。当诊所不再使用 Clinivista 时，可以导出其数据，之后我们会按与其签订的合同约定删除其无需继续保存的数据。"] },
    rights: { h: "您的权利及行使方式", ul: [
      "访问：了解我们处理了您的哪些数据并获得副本。",
      "更正：更正不准确或不完整的数据。",
      "删除：要求我们删除您的数据，法律要求必须保存的数据除外。",
      "反对：反对对您数据的某些使用。",
      "可携带：以结构化、常用的格式获取您的数据。",
      "临时封存：在请求处理期间要求暂停处理。"],
      after: ["您可以通过评估完成页面上的“我的数据与权利”按钮，或写信至 {email} 行使这些权利。我们与负责您临床数据的诊所共同处理。我们会在 30 个日历日内答复；在有正当理由时可延长一次，再延 30 天。如果您不同意答复，可以向智利个人数据保护局投诉。我们适用第 19.628 号法律，并自第 21.719 号法律生效之日起适用该法。"] },
    breach: { h: "如果发生安全事件", p: ["如果安全漏洞影响到您的数据，诊所和 Clinivista 会立即采取措施加以控制，按法律要求通知个人数据保护局，并在涉及健康数据等敏感数据时通知受影响的人。"] },
  },
};
