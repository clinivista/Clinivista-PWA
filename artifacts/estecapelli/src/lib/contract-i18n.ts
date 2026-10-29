// Textos del aviso y del cuadro de aceptación del contrato de servicio, en los nueve idiomas.
// El texto jurídico del contrato va en español (es el documento firmado); aquí solo está la interfaz.
// Marcadores {version}, {name}, {date}: se rellenan con fillContract().
import type { LangCode } from "./language";

export type ContractText = {
  pending: string;
  review: string;
  title: string;
  version: string;
  spanishOnly: string;
  agree: string;
  accept: string;
  accepting: string;
  close: string;
  onlyAdmin: string;
  acceptedBy: string;
  error: string;
  changed: string;
};

export const CONTRACT_TEXT: Record<LangCode, ContractText> = {
  es: {
    pending: "Tu clínica tiene un contrato de servicio pendiente de aceptación.",
    review: "Revisar contrato",
    title: "Contrato de servicio",
    version: "Versión {version}",
    spanishOnly: "El texto del contrato es el documento oficial y está redactado en español.",
    agree: "He leído el contrato y lo acepto en nombre de la clínica.",
    accept: "Aceptar contrato",
    accepting: "Guardando…",
    close: "Cerrar",
    onlyAdmin: "Solo el administrativo o el representante legal de la clínica puede aceptarlo.",
    acceptedBy: "Aceptado por {name} el {date}.",
    error: "No se pudo registrar la aceptación. Inténtalo de nuevo.",
    changed: "El contrato cambió mientras lo leías. Ciérralo y ábrelo de nuevo.",
  },
  en: {
    pending: "Your clinic has a service agreement waiting to be accepted.",
    review: "Review agreement",
    title: "Service agreement",
    version: "Version {version}",
    spanishOnly: "The agreement text is the official document and is written in Spanish.",
    agree: "I have read the agreement and accept it on behalf of the clinic.",
    accept: "Accept agreement",
    accepting: "Saving…",
    close: "Close",
    onlyAdmin: "Only the clinic's administrator or legal representative can accept it.",
    acceptedBy: "Accepted by {name} on {date}.",
    error: "The acceptance could not be recorded. Please try again.",
    changed: "The agreement changed while you were reading it. Close it and open it again.",
  },
  pt: {
    pending: "Sua clínica tem um contrato de serviço aguardando aceite.",
    review: "Revisar contrato",
    title: "Contrato de serviço",
    version: "Versão {version}",
    spanishOnly: "O texto do contrato é o documento oficial e está redigido em espanhol.",
    agree: "Li o contrato e o aceito em nome da clínica.",
    accept: "Aceitar contrato",
    accepting: "Salvando…",
    close: "Fechar",
    onlyAdmin: "Somente o administrativo ou o representante legal da clínica pode aceitá-lo.",
    acceptedBy: "Aceito por {name} em {date}.",
    error: "Não foi possível registrar o aceite. Tente novamente.",
    changed: "O contrato mudou enquanto você o lia. Feche-o e abra-o novamente.",
  },
  fr: {
    pending: "Votre clinique a un contrat de service en attente d'acceptation.",
    review: "Consulter le contrat",
    title: "Contrat de service",
    version: "Version {version}",
    spanishOnly: "Le texte du contrat est le document officiel et il est rédigé en espagnol.",
    agree: "J'ai lu le contrat et je l'accepte au nom de la clinique.",
    accept: "Accepter le contrat",
    accepting: "Enregistrement…",
    close: "Fermer",
    onlyAdmin: "Seul l'administratif ou le représentant légal de la clinique peut l'accepter.",
    acceptedBy: "Accepté par {name} le {date}.",
    error: "L'acceptation n'a pas pu être enregistrée. Réessayez.",
    changed: "Le contrat a changé pendant votre lecture. Fermez-le et rouvrez-le.",
  },
  de: {
    pending: "Für Ihre Klinik liegt ein Dienstleistungsvertrag zur Annahme bereit.",
    review: "Vertrag ansehen",
    title: "Dienstleistungsvertrag",
    version: "Version {version}",
    spanishOnly: "Der Vertragstext ist das offizielle Dokument und auf Spanisch verfasst.",
    agree: "Ich habe den Vertrag gelesen und nehme ihn im Namen der Klinik an.",
    accept: "Vertrag annehmen",
    accepting: "Wird gespeichert…",
    close: "Schließen",
    onlyAdmin: "Nur die Verwaltung oder der gesetzliche Vertreter der Klinik kann ihn annehmen.",
    acceptedBy: "Angenommen von {name} am {date}.",
    error: "Die Annahme konnte nicht gespeichert werden. Bitte erneut versuchen.",
    changed: "Der Vertrag hat sich beim Lesen geändert. Schließen und erneut öffnen.",
  },
  it: {
    pending: "La tua clinica ha un contratto di servizio in attesa di accettazione.",
    review: "Rivedi il contratto",
    title: "Contratto di servizio",
    version: "Versione {version}",
    spanishOnly: "Il testo del contratto è il documento ufficiale ed è redatto in spagnolo.",
    agree: "Ho letto il contratto e lo accetto a nome della clinica.",
    accept: "Accetta il contratto",
    accepting: "Salvataggio…",
    close: "Chiudi",
    onlyAdmin: "Solo l'amministrativo o il rappresentante legale della clinica può accettarlo.",
    acceptedBy: "Accettato da {name} il {date}.",
    error: "Non è stato possibile registrare l'accettazione. Riprova.",
    changed: "Il contratto è cambiato mentre lo leggevi. Chiudilo e riaprilo.",
  },
  tr: {
    pending: "Kliniğinizin kabul bekleyen bir hizmet sözleşmesi var.",
    review: "Sözleşmeyi incele",
    title: "Hizmet sözleşmesi",
    version: "Sürüm {version}",
    spanishOnly: "Sözleşme metni resmi belgedir ve İspanyolca yazılmıştır.",
    agree: "Sözleşmeyi okudum ve klinik adına kabul ediyorum.",
    accept: "Sözleşmeyi kabul et",
    accepting: "Kaydediliyor…",
    close: "Kapat",
    onlyAdmin: "Yalnızca kliniğin idari görevlisi veya yasal temsilcisi kabul edebilir.",
    acceptedBy: "{date} tarihinde {name} tarafından kabul edildi.",
    error: "Kabul kaydedilemedi. Lütfen tekrar deneyin.",
    changed: "Siz okurken sözleşme değişti. Kapatıp yeniden açın.",
  },
  ar: {
    pending: "لدى عيادتك عقد خدمة بانتظار الموافقة.",
    review: "مراجعة العقد",
    title: "عقد الخدمة",
    version: "الإصدار {version}",
    spanishOnly: "نص العقد هو الوثيقة الرسمية وهو مكتوب باللغة الإسبانية.",
    agree: "قرأت العقد وأوافق عليه نيابةً عن العيادة.",
    accept: "قبول العقد",
    accepting: "جارٍ الحفظ…",
    close: "إغلاق",
    onlyAdmin: "يمكن للموظف الإداري أو الممثل القانوني للعيادة فقط قبوله.",
    acceptedBy: "قبله {name} بتاريخ {date}.",
    error: "تعذّر تسجيل الموافقة. حاول مرة أخرى.",
    changed: "تغيّر العقد أثناء قراءتك. أغلقه وافتحه من جديد.",
  },
  zh: {
    pending: "您的诊所有一份服务合同等待接受。",
    review: "查看合同",
    title: "服务合同",
    version: "版本 {version}",
    spanishOnly: "合同文本为正式文件，以西班牙语书写。",
    agree: "我已阅读合同，并代表诊所接受。",
    accept: "接受合同",
    accepting: "正在保存…",
    close: "关闭",
    onlyAdmin: "只有诊所的行政人员或法定代表人可以接受。",
    acceptedBy: "{name} 于 {date} 接受。",
    error: "无法记录接受。请重试。",
    changed: "您阅读时合同已更改。请关闭后重新打开。",
  },
};

export function fillContract(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? values[key]! : match));
}
