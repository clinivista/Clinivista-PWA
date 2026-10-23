// Mensajes automáticos del chat de soporte, en los nueve idiomas de la plataforma.
const LANGS = ["es", "en", "pt", "fr", "de", "it", "tr", "ar", "zh"] as const;
type Lang = (typeof LANGS)[number];

export const toSupportLanguage = (value: unknown): Lang =>
  (LANGS as readonly string[]).includes(String(value)) ? (value as Lang) : "es";

const RECEIVED: Record<Lang, string> = {
  es: "Recibimos tu consulta. Será atendida a la mayor brevedad posible.",
  en: "We have received your request. It will be handled as soon as possible.",
  pt: "Recebemos sua consulta. Ela será atendida o mais breve possível.",
  fr: "Nous avons bien reçu votre demande. Elle sera traitée dans les plus brefs délais.",
  de: "Wir haben Ihre Anfrage erhalten. Sie wird so schnell wie möglich bearbeitet.",
  it: "Abbiamo ricevuto la tua richiesta. Sarà gestita il prima possibile.",
  tr: "Talebinizi aldık. En kısa sürede ilgilenilecektir.",
  ar: "استلمنا استفسارك. سيتم الرد عليه في أقرب وقت ممكن.",
  zh: "我们已收到您的咨询，将尽快为您处理。",
};

const RESOLVED: Record<Lang, (name: string) => string> = {
  es: (n) => `${n} marcó tu consulta como resuelta. Cuéntanos cómo fue la atención.`,
  en: (n) => `${n} marked your request as resolved. Please tell us how the support was.`,
  pt: (n) => `${n} marcou sua consulta como resolvida. Conte-nos como foi o atendimento.`,
  fr: (n) => `${n} a marqué votre demande comme résolue. Dites-nous comment s'est passée l'assistance.`,
  de: (n) => `${n} hat Ihre Anfrage als gelöst markiert. Sagen Sie uns bitte, wie der Support war.`,
  it: (n) => `${n} ha segnato la tua richiesta come risolta. Raccontaci com'è stata l'assistenza.`,
  tr: (n) => `${n} talebinizi çözüldü olarak işaretledi. Desteğin nasıl olduğunu bize söyleyin.`,
  ar: (n) => `قام ${n} بوضع استفسارك كمحلول. أخبرنا كيف كانت الخدمة.`,
  zh: (n) => `${n} 已将您的咨询标记为已解决。请告诉我们您对服务的评价。`,
};

export const receivedMessage = (language: unknown) => RECEIVED[toSupportLanguage(language)];
export const resolvedMessage = (language: unknown, name: string) => RESOLVED[toSupportLanguage(language)](name);
