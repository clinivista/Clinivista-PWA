# Cumplimiento de datos personales (Chile, Ley 21.719)

**Estado: borrador de trabajo para revisión de un abogado chileno. No es asesoría legal ni una certificación.**
Redactado el 1 de noviembre de 2026.

## Fecha de vigencia
La Ley 21.719 rige desde el **1 de diciembre de 2026**. El 28 de octubre de 2026 el Senado aprobó, en primer trámite, un proyecto
(boletín 18.623-07) que la posterga al 15 de octubre de 2027; falta la Cámara y la publicación. **Mientras no se publique, la fecha
vigente es la de diciembre de 2026.** Revisar el estado antes de decidir plazos internos.

## Roles
- **Clínica = responsable** de los datos de sus pacientes.
- **Clinivista = encargado** (contrato de servicio, cláusulas 11 y 12). Trata los datos solo por instrucción de la clínica.
- Para los datos de las propias cuentas del personal y de supra-control, Clinivista actúa como responsable.

## Contenido
| Documento | Para qué |
|---|---|
| `matriz-cumplimiento.md` | Qué exige la ley, qué hace hoy el sistema, qué falta |
| `procedimiento-derechos-titulares.md` | Cómo se atienden accesos, rectificaciones, supresión, etc. (plazo 30 días) |
| `procedimiento-vulneraciones.md` | Qué hacer ante un incidente de seguridad |
| `registro-actividades-tratamiento.md` | Registro de tratamientos de Clinivista y plazos de conservación |
| `subencargados.md` | Proveedores que tratan datos, país y estado del acuerdo |
| `evaluacion-impacto-borrador.md` | Borrador de evaluación de impacto (datos de salud a escala) |
| `guia-clinicas.md` | Qué debe hacer cada clínica y cómo la ayuda Clinivista |

## Sello
El sello «Diseñado para ayudar a cumplir la Ley 21.719» y la página `/cumplimiento` están **apagados por defecto**
(`VITE_COMPLIANCE_PUBLIC`). Se encienden solo cuando (1) el abogado aprobó los textos, (2) los acuerdos con proveedores están firmados
y (3) la sección «Lo que todavía no tenemos» de `compliance-i18n.ts` refleja la realidad. No existe un sello oficial para este servicio:
no se debe presentar como certificación.

## Fuentes
- Texto de la ley: Biblioteca del Congreso Nacional (BCN), Ley 21.719 — arts. 11 (plazos de derechos), 14 ter (deber de información),
  14 sexies (vulneraciones), 15 bis (encargado), 15 ter (evaluación de impacto), 16 y 16 bis (datos sensibles y de salud).
- Estado de la prórroga: Garrigues (30-oct-2026) y Surtika (boletín 18.623-07).
