import pinoHttp from "pino-http";
import type { Logger } from "pino";

// The patient token in /api/patients/<token>/... is the bearer credential for
// that patient's data and clinical photos, so it must never reach the logs:
// anyone with log access (Render dashboard, log drains) could reuse it. Only
// the segment right after /patients/ is masked; the rest of the path stays
// readable for debugging. Query strings are dropped entirely (legacy links
// carried the token as ?token=).
const PATIENT_TOKEN_SEGMENT = /(\/patients\/)[^/?#]+/;

export function redactRequestUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  return url.split("?")[0].replace(PATIENT_TOKEN_SEGMENT, "$1[token]");
}

export function createHttpLogger(logger: Logger) {
  return pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: redactRequestUrl(req.url),
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  });
}
