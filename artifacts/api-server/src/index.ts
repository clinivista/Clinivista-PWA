import app from "./app";
import { logger } from "./lib/logger";
import { runDueReports } from "./lib/pending-report";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

// Informe de pacientes pendientes de diagnóstico: cada 60 minutos revisa si a
// alguna clínica le toca recibirlo (según su periodicidad, en hora de Chile).
const REPORT_TICK_MS = 60 * 60_000;
const reportTimer = setInterval(() => {
  runDueReports(process.env["PUBLIC_APP_URL"]).catch((err) => logger.error({ err }, "Report scheduler tick failed"));
}, REPORT_TICK_MS);
reportTimer.unref();
if (!process.env["PUBLIC_APP_URL"]) logger.warn("PUBLIC_APP_URL no está definido: los informes programados no se enviarán.");
