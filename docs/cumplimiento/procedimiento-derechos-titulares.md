# Procedimiento: solicitudes de los titulares (derechos ARCO+)

Plazo legal (art. 11): **30 días corridos** desde el ingreso, prorrogable **una sola vez por hasta 30 días corridos** en casos justificados.
Bloqueo temporal: responder dentro de **2 días hábiles**.

## Entrada
1. Paciente: botón «Mis datos y derechos» en su portal (`/paciente`, uno por cada caso), al final de su evaluación o en la evaluación bloqueada → crea la solicitud (`data_requests`, vence a los 30 días). Tipos: acceso, retiro del consentimiento, rectificación, eliminación, oposición, portabilidad y bloqueo temporal. En el portal el paciente ve «Mis solicitudes» con el estado, la fecha límite y la respuesta de la clínica.
2. Correo a contacto de Clinivista, o aviso en persona o por teléfono en la clínica: **hoy el panel no permite registrar solicitudes a mano** (solo las crea el paciente). Mientras no exista esa función, la clínica debe llevar un registro propio con la fecha de recepción (el plazo corre desde ese día) o pedir al paciente que use el botón «Mis datos y derechos». Está en la lista de mejoras pendientes.

## Avisos de vencimiento
Cada hora el servidor revisa las solicitudes abiertas (Recibida o En curso). A los 7 días o menos del vencimiento, y otra vez cuando vence, envía un correo a las personas con rol administrativo activas de esa clínica, sin datos del paciente. Cada aviso se envía una sola vez por solicitud. No reemplaza la revisión semanal. No existe aviso para el bloqueo temporal de 2 días hábiles.

## Quién responde
La **clínica** (responsable). Clinivista le da las herramientas: panel «Solicitudes de datos», exportación JSON, registro de accesos.

## Pasos
1. Verificar identidad del solicitante (mismo correo/teléfono/RUT de la ficha). No entregar datos a terceros.
2. Marcar «En curso».
3. Por tipo:
   - **Acceso / portabilidad:** descargar «Datos (JSON)» y enviarlo por un canal seguro a la persona.
   - **Rectificación:** corregir en la ficha y anotarlo.
   - **Supresión:** eliminar la ficha (botón de borrado de paciente) **salvo** lo que la ley obligue a conservar (ficha clínica, Ley 20.584). Si debe conservarse, rechazar con explicación y ofrecer bloqueo.
   - **Oposición:** evaluar el uso (p. ej. marketing) y dejarlo de hacer.
   - **Bloqueo temporal:** suspender todo uso de la ficha salvo conservarla; responder en 2 días hábiles.
4. Escribir la respuesta/nota y marcar «Resuelta» o «Rechazada». Queda registrado quién y cuándo.
5. Si se necesita más plazo: avisar al titular antes de los 30 días y anotarlo (prórroga única).

## Control
Revisar semanalmente solicitudes «Vencida». Conservar las solicitudes resueltas como prueba.

## Modificar la evaluación sin pasar por una solicitud

Además del derecho de rectificación, el paciente puede cambiar su propia evaluación **mientras la clínica no haya empezado a revisarla**:

- **Abierta** (estado Nuevo, Incompleto o Listo, sin diagnóstico ni borrador de diagnóstico): el paciente corrige sus datos y reemplaza fotos desde su cuenta («Modificar mi evaluación»). Cada cambio queda registrado con el valor anterior y el nuevo; las fotos reemplazadas no se borran. La clínica ve la etiqueta «Novedades» y el recuadro «Novedades del paciente».
- **En revisión** (cualquier estado posterior o con diagnóstico): se cierra la edición. El paciente solo puede enviar **información adicional** (mensaje y hasta 4 fotos) que no reemplaza nada; la clínica la incorpora a la ficha o la descarta, y el paciente ve el estado. Corregir un dato de la ficha pasa a ser una solicitud de **Rectificación** (plazo de 30 días corridos).
- La información adicional y el historial de cambios se eliminan junto con la ficha y se incluyen en la exportación de datos del paciente.

**Pregunta para el abogado:** cómo se concilia la edición del paciente con la obligación de conservar la ficha clínica (Ley 20.584) una vez que la clínica la incorporó, y si el historial de cambios debe conservarse el mismo plazo que la ficha.


## Autorización para fotografías tomadas por la clínica

La ficha del paciente tiene una tarjeta «Autorización para fotografías» con tres vías: enlace por correo (con código de 6 dígitos), enlace por WhatsApp o copiado (sin código, evidencia más débil), documento firmado subido, y firma en tableta en la clínica. Se guarda fecha y hora, versión y copia del texto, método, quién la solicitó o registró, IP y navegador (en los enlaces). El enlace vence a los 7 días; el código, a los 10 minutos con 5 intentos. La clínica puede revocarla; lo ya incorporado a la ficha clínica se conserva mientras la ley lo exija. Se incluye en la exportación de datos y se elimina con el paciente. No bloquea la toma de fotografías. El texto (`foto-2026-11-borrador-1`) es un borrador sujeto a revisión del abogado. ClaveÚnica no está implementada: es una consulta en el paquete legal (secciones 6.8 y 6.9).
