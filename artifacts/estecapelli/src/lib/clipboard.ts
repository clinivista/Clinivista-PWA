/**
 * Patient invitation link, built from the origin the admin panel is served
 * from. Admin and patient pages share that origin, so this stays correct
 * behind the dev proxy, on a LAN address and in production, unlike the
 * server's Host-header-based `link`.
 */
export function buildPatientLink(token: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${base}/patient?token=${encodeURIComponent(token)}`;
}

/**
 * Permanent, token-less self-registration link. /patient without a token
 * creates the patient's own evaluation on submit, so one link works for
 * every patient and never expires.
 */
export function buildPublicPatientLink(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${base}/patient`;
}

/**
 * Copy text to the clipboard. The async Clipboard API only exists in secure
 * contexts (HTTPS or localhost), so plain-HTTP LAN access falls back to a
 * hidden textarea + execCommand("copy"). Resolves to whether the copy worked.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or document not focused: try the legacy path.
    }
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  const previousFocus = document.activeElement as HTMLElement | null;
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length); // iOS Safari ignores select()
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  document.body.removeChild(textarea);
  previousFocus?.focus?.();
  return copied;
}
