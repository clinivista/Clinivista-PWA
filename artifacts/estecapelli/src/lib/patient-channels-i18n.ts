import type { LangCode } from "./language";

// «¿Cómo quieres recibir tus resultados?»: ninguna opción viene marcada; las opciones dependen de los canales de la clínica.
export type PatientChannelText = { pick: string; whatsappHint: string };

export const PATIENT_CHANNEL_TEXT: Record<LangCode, PatientChannelText> = {
  es: { pick: "Elige una opción para continuar.", whatsappHint: "Te enviaremos el aviso por WhatsApp al teléfono que indicaste." },
  en: { pick: "Choose an option to continue.", whatsappHint: "We will notify you by WhatsApp at the phone number you gave." },
  pt: { pick: "Escolha uma opção para continuar.", whatsappHint: "Avisaremos por WhatsApp no telefone que você informou." },
  fr: { pick: "Choisissez une option pour continuer.", whatsappHint: "Nous vous préviendrons par WhatsApp au numéro indiqué." },
  de: { pick: "Wählen Sie eine Option, um fortzufahren.", whatsappHint: "Wir benachrichtigen Sie per WhatsApp unter der angegebenen Nummer." },
  it: { pick: "Scegli un'opzione per continuare.", whatsappHint: "Ti avviseremo su WhatsApp al numero che hai indicato." },
  tr: { pick: "Devam etmek için bir seçenek belirleyin.", whatsappHint: "Belirttiğiniz telefona WhatsApp ile haber vereceğiz." },
  ar: { pick: "اختر خيارًا للمتابعة.", whatsappHint: "سنبلغك عبر واتساب على الرقم الذي أدخلته." },
  zh: { pick: "请选择一个选项以继续。", whatsappHint: "我们会通过 WhatsApp 向您提供的手机号发送通知。" },
};
