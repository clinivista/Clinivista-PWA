# Procedimiento: incidentes y vulneraciones de seguridad

Art. 14 sexies: informar a la Agencia «por los medios más expeditos posibles y sin dilaciones indebidas»; si hay datos sensibles
(salud, imágenes clínicas), **notificar a cada titular afectado**. Documentar siempre el incidente.

## Roles
- **Encargado de incidentes:** [NOMBRE A DESIGNAR] · suplente: [NOMBRE A DESIGNAR]. Contacto 24/7: [TELÉFONO].
- **Avisar a la clínica afectada** (responsable) apenas se confirme: objetivo **menos de 48 horas**, idealmente el mismo día.

## Pasos
1. **Detectar y registrar:** hora, quién lo detectó, qué se vio. Abrir un registro de incidente (plantilla abajo).
2. **Contener:** revocar sesiones (reiniciar el servidor invalida todas, porque las sesiones están en memoria), rotar claves/API (Render, Neon, R2, Resend, Anthropic), bloquear usuarios afectados.
3. **Evaluar:** qué datos, de qué clínicas y pacientes, durante cuánto tiempo, si había datos sensibles, riesgo para las personas.
4. **Notificar:** (a) a cada clínica afectada, con la lista de pacientes y qué datos; (b) la clínica, como responsable, informa a la Agencia y a los titulares (Clinivista la ayuda a redactar); (c) si Clinivista actúa como responsable (cuentas del personal), informa a la Agencia directamente.
5. **Corregir y aprender:** causa raíz, arreglo, prueba, cambios al proceso.
6. **Cerrar:** informe final y archivo por [PLAZO A DEFINIR POR EL ABOGADO].

## Plantilla de registro
Fecha/hora detección · Fecha/hora inicio estimado · Descripción · Datos y clínicas afectadas · N.º de personas · ¿Datos sensibles? · Medidas de contención · Notificaciones enviadas (a quién, cuándo) · Causa · Acciones correctivas · Responsable · Cierre.

## Simulacro
Hacer un simulacro al menos una vez al año y tras cambios importantes de infraestructura.
