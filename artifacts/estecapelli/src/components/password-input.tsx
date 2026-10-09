import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLanguage, type LangCode } from "@/lib/language";
import { cn } from "@/lib/utils";

const LABEL: Record<LangCode, { show: string; hide: string }> = {
  es: { show: "Mostrar contraseña", hide: "Ocultar contraseña" },
  en: { show: "Show password", hide: "Hide password" },
  pt: { show: "Mostrar senha", hide: "Ocultar senha" },
  fr: { show: "Afficher le mot de passe", hide: "Masquer le mot de passe" },
  de: { show: "Passwort anzeigen", hide: "Passwort verbergen" },
  it: { show: "Mostra password", hide: "Nascondi password" },
  tr: { show: "Şifreyi göster", hide: "Şifreyi gizle" },
  ar: { show: "إظهار كلمة المرور", hide: "إخفاء كلمة المرور" },
  zh: { show: "显示密码", hide: "隐藏密码" },
};

/** Campo de contraseña con un ojo para verla u ocultarla. */
export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<React.ComponentProps<"input">, "type">>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const { lang } = useLanguage();
    const text = LABEL[lang] ?? LABEL.es;
    return (
      <div className="relative w-full">
        <Input ref={ref} {...props} type={visible ? "text" : "password"} className={cn("pe-12", className)} />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? text.hide : text.show}
          aria-pressed={visible}
          title={visible ? text.hide : text.show}
          className="absolute inset-y-0 end-0 flex w-12 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
