# Matriz de cumplimiento — Ley 21.719

Estados: **Hecho** (verificado en código/tests), **Parcial**, **Pendiente**, **Clínica** (le corresponde a cada clínica).

| # | Exigencia | Estado | Qué hay hoy / qué falta |
|---|---|---|---|
| 1 | Deber de información (art. 14 ter): política pública con finalidades, plazos, derechos, transferencias | Hecho | Política actualizada en 9 idiomas (`legal-i18n.ts` + `privacy-update-i18n.ts`), versión `2026-11`. Falta que la revise el abogado |
| 2 | Consentimiento expreso para datos sensibles y prueba de él | Hecho | Se guarda fecha y versión de la política (`consent_at`, `consent_policy_version`). Fichas creadas por el personal solo registran constancia (`consent_recorded_*`) |
| 3 | Derechos del titular: acceso, rectificación, supresión, oposición, portabilidad, bloqueo y retiro del consentimiento (art. 11: 30 días corridos + 30; bloqueo temporal 2 días hábiles) | Parcial | Botón «Mis datos y derechos» en el portal del paciente (por cada caso), en la pantalla final de la evaluación y en la evaluación bloqueada; el paciente ve el estado y la fecha límite de sus solicitudes (`GET /patients/:token/data-requests`); panel «Solicitudes de datos» de la clínica con vencimiento; aviso por correo a la administración de la clínica a 7 días del vencimiento y al vencer; exportación JSON. **Falta**: que la clínica registre en el panel solicitudes recibidas por correo, teléfono o en persona; correo al paciente cuando se resuelve; bloqueo temporal automático y plazo de 2 días hábiles (hoy es manual y sin aviso); retiro del consentimiento sin efecto automático; prórroga manual; reclamo directo a Clinivista |
| 4 | Seguridad (principio) | Parcial | Aislamiento por clínica, claves con scrypt, fotos privadas, TLS, cabeceras de seguridad, límite de intentos, registro de accesos. **Falta**: 2FA del personal, sesiones persistentes (hoy en memoria), respaldos y restauración documentados, pruebas de penetración |
| 5 | Notificación de vulneraciones (art. 14 sexies): a la Agencia «por los medios más expeditos y sin dilaciones indebidas»; a los titulares si hay datos sensibles | Parcial | Procedimiento escrito (`procedimiento-vulneraciones.md`). **Falta**: designar responsable y probar el simulacro |
| 6 | Contrato con el encargado (art. 15 bis): duración, finalidad, instrucciones; subcontratación con autorización escrita | Parcial | Contrato cl. 11–12 existe como borrador. **Falta**: cláusula de subencargados autorizados y asistencia en derechos/brechas (ver `subencargados.md`) — requiere abogado |
| 7 | Transferencia internacional | Parcial | Declarada en la política. **Falta**: verificar región real de cada proveedor y firmar acuerdos (ver `subencargados.md`) |
| 8 | Evaluación de impacto (art. 15 ter) para tratamiento de alto riesgo | Parcial | Borrador (`evaluacion-impacto-borrador.md`) |
| 9 | Registro de actividades de tratamiento | Hecho (borrador) | `registro-actividades-tratamiento.md` |
| 10 | Conservación de la ficha clínica (Ley 20.584) | Clínica / Parcial | La clínica decide. **Pendiente**: definir con el abogado cuánto debe conservar Clinivista tras el término del contrato y si debe impedir el borrado definitivo de fichas |
| 11 | Delegado de protección de datos / modelo de prevención | Pendiente | Opcional según tamaño; el abogado decide. Certificación solo la otorga la Agencia |
| 12 | Capacitación del personal que trata datos sensibles | Pendiente | Plan en `guia-clinicas.md` |
| 13 | Datos de menores | Pendiente | Los términos exigen mayoría de edad. Revisar con el abogado el caso de pacientes menores atendidos por sus representantes |
