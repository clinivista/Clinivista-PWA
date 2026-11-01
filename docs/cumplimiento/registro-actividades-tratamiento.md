# Registro de actividades de tratamiento (borrador)

Responsable del registro: Clinivista, en lo que trata como **encargado** (por cuenta de cada clínica) y como **responsable** (cuentas del personal, facturación, soporte).
Contacto: [CORREO DE PRIVACIDAD A DEFINIR].

| Actividad | Rol | Datos | Titulares | Finalidad | Base | Destinatarios / proveedores | Conservación |
|---|---|---|---|---|---|---|---|
| Evaluación y seguimiento fotográfico | Encargado | Identificación, contacto, RUT/pasaporte, antecedentes, síntomas, fotografías y videos clínicos, diagnósticos | Pacientes | Que la clínica evalúe, diagnostique y haga seguimiento | Consentimiento expreso; fines sanitarios de la clínica | Clínica; Render, Neon, Cloudflare R2, Resend | Lo que defina la clínica y la ley (Ley 20.584); al término del contrato, según contrato |
| Envío de resultados | Encargado | Nombre, correo/teléfono, PDF de resultados | Pacientes | Entregar resultados | Instrucción de la clínica | Resend (correo); enlace con vencimiento de 30 días | Enlace 30 días; PDF mientras exista la ficha |
| Transcripción de documentos (opcional) | Encargado | Imagen de ficha o formulario fotografiado | Pacientes | Convertir a texto | Instrucción de la clínica (activa la función) | Anthropic (EE. UU.) | Clinivista no conserva la imagen enviada al proveedor; el texto queda en la ficha. [CONFIRMAR la retención del proveedor] |
| Cuentas del personal | Responsable | Nombre, correo, teléfono, clave (hash scrypt), rol | Personal de clínicas | Acceso y seguridad | Contrato | — | Mientras exista la cuenta |
| Registro de accesos a fichas | Responsable | Usuario, ficha, acción, fecha | Personal / pacientes | Trazabilidad y seguridad | Interés legítimo / obligación de seguridad | — | [PLAZO A DEFINIR] |
| Solicitudes de los titulares | Encargado | Tipo, mensaje, resolución | Pacientes | Atender derechos | Obligación legal | Clínica | [PLAZO A DEFINIR] |
| Soporte y facturación de clínicas | Responsable | Datos de contacto del personal y del representante legal | Personal | Soporte, cobro, contrato | Contrato | — | Mientras dure la relación y los plazos legales |

> Verificar con el abogado: plazos exactos y si «interés legítimo» es adecuado para el registro de accesos.
