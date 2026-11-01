# Subencargados y transferencias internacionales

La ley exige autorización escrita del responsable (la clínica) para subcontratar el tratamiento (art. 15 bis) e informar las transferencias a terceros países
(art. 14 ter). **Las regiones de abajo deben confirmarse en los paneles de cada proveedor: no están verificadas.**

| Proveedor | Para qué | Datos | País / región | Acuerdo de tratamiento (DPA) | Estado |
|---|---|---|---|---|---|
| Render | Alojamiento de la aplicación | Todos (en tránsito y memoria) | [CONFIRMAR región] | [REVISAR / FIRMAR DPA] | Pendiente |
| Neon | Base de datos PostgreSQL | Todos los datos de texto de las fichas | [CONFIRMAR región] | [REVISAR / FIRMAR DPA] | Pendiente |
| Cloudflare R2 | Almacenamiento privado de fotos y videos | Imágenes clínicas | [CONFIRMAR jurisdicción del bucket] | [REVISAR / FIRMAR DPA] | Pendiente |
| Resend | Correos transaccionales | Correo, nombre, contenido del correo, enlace a resultados | [CONFIRMAR] | [REVISAR / FIRMAR DPA] | Pendiente |
| Google (inicio de sesión) | Acceso con Google | Nombre y correo verificado | — | Condiciones de Google | Pendiente |
| Anthropic | Transcripción de documentos (solo si la clínica la activa) | Imagen del documento | EE. UU. [CONFIRMAR] | [REVISAR términos de la API, retención y uso de datos] | Pendiente |

## Qué hacer
1. Para cada proveedor: obtener el DPA, la región y la política de retención; guardarlos en esta carpeta.
2. Pedir al abogado la cláusula del contrato con las clínicas que las autorice a esta lista y obligue a avisar cambios.
3. Mantener la política de privacidad coherente con esta tabla.
