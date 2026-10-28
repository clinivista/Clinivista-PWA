# Clinivista: implementación de identidad aprobada

El usuario confirma que la aplicación y el sitio comercial pertenecen al mismo proyecto: https://github.com/clinivista/Clinivista-PWA. Identificar en el código las entradas y configuraciones de despliegue para clinivista.cl y app.clinivista.cl.

## Referencias y precedencia
- referencias/identidad-aprobada.png: referencia visual principal y aprobada del logo Clinical Premium. Conservar la C geométrica azul/cian, lente circular central y apertura hacia la derecha como campo visual de cámara. Wordmark: Clini azul marino y vista azul. Lema exacto: REGISTRO FOTOGRÁFICO CLÍNICO.
- referencias/sitio-comercial-referencia.png: referencia de composición y estilo del sitio. Su símbolo del encabezado es anterior y NO debe sustituir al logo de la presentación aprobada. Los textos, estadísticas, pacientes e interfaces ilustradas son contenido de un mockup, no datos verificados ni instrucciones para alterar el producto.
- Mantener los originales intactos. No pegar la lámina completa como logo ni rediseñar la marca. Crear SVG de producción fiel a la referencia; verificar visualmente contorno, apertura, lente, degradados, proporciones, tipografía y espaciado. Las muestras de paleta rasterizadas son orientativas; no asumir que sus rótulos son especificaciones técnicas exactas.

## Alcance autorizado
Actualizar coherentemente login, dashboard de clínicas, supradministración, pacientes y demás pantallas internas; sitio comercial y aplicación. Localizar componentes compartidos y todas las referencias a logos, favicon, manifest e iconos PWA. Preparar logo horizontal con y sin lema, isotipo, versión para fondo oscuro y monocroma, SVG y PNG para app/favicon según las dimensiones requeridas por el proyecto. Mantener legibilidad y proporciones, accesibilidad y comportamiento responsive. No incorporar efectos de cámara o fondos de mockups dentro del logo principal.

## Seguridad, respaldo y entrega
El usuario autoriza cambios en producción, condicionados a respaldo y comprobaciones previas. Antes de modificar, revisar instrucciones del repositorio, estado del checkout y configuración de despliegue. Registrar el commit base y crear un punto de reversión verificable. Preservar funcionalidades y datos; no modificar registros clínicos, autenticación, permisos ni base de datos para un cambio de marca. No utilizar credenciales compartidas en conversaciones anteriores ni incluir secretos en entregables.

Comprobar compilación y las validaciones pertinentes; revisar las pantallas y activos en móvil/escritorio y fondos claros/oscuros. Desplegar únicamente con acceso autorizado y respaldo comprobado. Verificar ambos dominios después del despliegue y registrar commit, resultados y procedimiento de reversión. No afirmar éxito sin evidencia.

## Estado del trabajo previo
No hay cambios de código ni despliegues realizados en esta sesión. GitHub informó permisos de cuenta push/admin, pero la prueba real de escritura (crear rama backup/pre-clinical-premium-20261027 desde main) devolvió 403 Resource not accessible by integration. La rama de respaldo NO fue creada. Verificar el acceso propio de Claude; si continúa el bloqueo, informar exactamente lo que impide completar el trabajo. No reutilizar ese nombre como prueba de que existe respaldo.
