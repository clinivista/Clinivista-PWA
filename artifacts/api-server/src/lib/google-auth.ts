import { logger } from "./logger";

export type GoogleProfile = { email: string; name: string };

export function googleConfig(): { clientId: string; clientSecret: string } | undefined {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

export function googleAuthUrl(redirectUri: string, state: string): string | null {
  const config = googleConfig();
  if (!config) return null;
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * Trades the one-time code for the patient's verified Google profile. The ID
 * token comes straight from Google over TLS in exchange for our client secret,
 * so reading its claims (audience, issuer, expiry, verified email) is enough.
 */
export async function googleProfileFromCode(code: string, redirectUri: string): Promise<GoogleProfile | null> {
  const config = googleConfig();
  if (!config) return null;
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      logger.warn({ status: response.status }, "Google rejected the sign-in code");
      return null;
    }
    const { id_token: idToken } = (await response.json()) as { id_token?: string };
    const payload = JSON.parse(Buffer.from(String(idToken).split(".")[1] ?? "", "base64url").toString("utf8")) as {
      iss?: string; aud?: string; exp?: number; email?: string; email_verified?: boolean | string; name?: string;
    };
    const verified = payload.email_verified === true || payload.email_verified === "true";
    if (
      !["accounts.google.com", "https://accounts.google.com"].includes(String(payload.iss)) ||
      payload.aud !== config.clientId ||
      typeof payload.exp !== "number" || payload.exp * 1000 < Date.now() ||
      !payload.email || !verified
    ) return null;
    return { email: payload.email, name: (payload.name ?? "").slice(0, 100) };
  } catch (error) {
    logger.warn({ err: error }, "Google sign-in failed");
    return null;
  }
}
