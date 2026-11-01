# Evaluación de impacto en protección de datos (borrador)

Motivo: tratamiento de datos de salud e imágenes clínicas a escala por cuenta de varias clínicas, con proveedores en el extranjero y una función opcional de IA.

1. **Descripción:** plataforma SaaS; los pacientes envían datos y fotos; las clínicas evalúan y responden.
2. **Necesidad y proporcionalidad:** se piden solo los datos necesarios para la evaluación; el RUT/pasaporte identifica; las fotos son parte del acto clínico. **Revisar** si todos los campos del formulario son imprescindibles.
3. **Riesgos para los titulares:** acceso no autorizado a imágenes clínicas (alto impacto: reputación, discriminación); filtración por enlaces compartidos; error de clínica a clínica; uso por proveedores en el extranjero; reidentificación por rostros.
4. **Medidas existentes:** aislamiento por clínica; roles; almacenamiento privado; enlaces con vencimiento; registro de accesos; límite de intentos; cifrado en tránsito.
5. **Medidas pendientes:** 2FA del personal; sesiones persistentes y revocables; cifrado de respaldos y prueba de restauración; DPAs con proveedores; pruebas de penetración; política de retención automática; capacitación.
6. **Riesgo residual:** [EVALUAR TRAS LAS MEDIDAS PENDIENTES].
7. **Decisión y responsable:** [FIRMA DE LA DIRECCIÓN] · fecha: [FECHA]. Revisar cada año o ante cambios.
