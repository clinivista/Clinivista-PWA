// Textos de las pantallas de sistema (página no encontrada y error inesperado), en los nueve idiomas.
// El ErrorBoundary vive fuera del proveedor de idioma: lee el idioma guardado directamente.
import type { LangCode } from "./language";

export type SystemText = { errorTitle: string; errorDesc: string; retry: string; notFoundTitle: string; notFoundDesc: string; goHome: string };

export const SYSTEM_TEXT: Record<LangCode, SystemText> = {
  es: { errorTitle: "Algo salió mal", errorDesc: "Esta parte de la aplicación tuvo un error. El resto sigue funcionando.", retry: "Intentar de nuevo", notFoundTitle: "Página no encontrada", notFoundDesc: "La dirección que abriste no existe o cambió.", goHome: "Ir al inicio" },
  en: { errorTitle: "Something went wrong", errorDesc: "This part of the app hit an error. The rest of the app is still running.", retry: "Try again", notFoundTitle: "Page not found", notFoundDesc: "The address you opened doesn't exist or has changed.", goHome: "Go to the home page" },
  pt: { errorTitle: "Algo deu errado", errorDesc: "Esta parte do aplicativo teve um erro. O resto continua funcionando.", retry: "Tentar novamente", notFoundTitle: "Página não encontrada", notFoundDesc: "O endereço que você abriu não existe ou mudou.", goHome: "Ir para o início" },
  fr: { errorTitle: "Une erreur est survenue", errorDesc: "Cette partie de l’application a rencontré une erreur. Le reste fonctionne toujours.", retry: "Réessayer", notFoundTitle: "Page introuvable", notFoundDesc: "L’adresse ouverte n’existe pas ou a changé.", goHome: "Aller à l’accueil" },
  de: { errorTitle: "Etwas ist schiefgelaufen", errorDesc: "In diesem Teil der App ist ein Fehler aufgetreten. Der Rest läuft weiter.", retry: "Erneut versuchen", notFoundTitle: "Seite nicht gefunden", notFoundDesc: "Die geöffnete Adresse existiert nicht oder hat sich geändert.", goHome: "Zur Startseite" },
  it: { errorTitle: "Qualcosa è andato storto", errorDesc: "Questa parte dell’app ha avuto un errore. Il resto continua a funzionare.", retry: "Riprova", notFoundTitle: "Pagina non trovata", notFoundDesc: "L’indirizzo aperto non esiste o è cambiato.", goHome: "Vai alla home" },
  tr: { errorTitle: "Bir şeyler ters gitti", errorDesc: "Uygulamanın bu bölümünde bir hata oluştu. Geri kalanı çalışmaya devam ediyor.", retry: "Tekrar dene", notFoundTitle: "Sayfa bulunamadı", notFoundDesc: "Açtığınız adres mevcut değil veya değişti.", goHome: "Ana sayfaya git" },
  ar: { errorTitle: "حدث خطأ ما", errorDesc: "واجه هذا الجزء من التطبيق خطأً. بقية التطبيق ما زالت تعمل.", retry: "إعادة المحاولة", notFoundTitle: "الصفحة غير موجودة", notFoundDesc: "العنوان الذي فتحته غير موجود أو تغيّر.", goHome: "العودة إلى الصفحة الرئيسية" },
  zh: { errorTitle: "出错了", errorDesc: "应用的这一部分出现错误，其余部分仍在运行。", retry: "重试", notFoundTitle: "未找到页面", notFoundDesc: "你打开的地址不存在或已更改。", goHome: "返回首页" },
};

/** Idioma guardado por la persona (o español); sirve fuera del proveedor de idioma. */
export function storedSystemText(): { text: SystemText; rtl: boolean } {
  let code: LangCode = "es";
  try {
    const stored = localStorage.getItem("clinivista_lang") as LangCode | null;
    if (stored && stored in SYSTEM_TEXT) code = stored;
  } catch { /* sin almacenamiento: español */ }
  return { text: SYSTEM_TEXT[code], rtl: code === "ar" };
}
