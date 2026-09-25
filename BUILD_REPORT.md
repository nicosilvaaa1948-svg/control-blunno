# BLUNNO CONTROL EMPRESARIAL — V17 FINAL WEB

## Validación ejecutada

- JavaScript: todos los archivos `.js` pasan `node --check`.
- Referencias HTML e imports locales: comprobados.
- `index.html` contiene el runtime de producción embebido y no depende de carga dinámica de `web.js` o `app.js`.
- Arranque sin dependencias JS externas obligatorias.
- PWA: no se usa manifest ni service worker.
- Suite de núcleo: separación por sucursal/período, General consolidado, Caja separada del resultado, responsables, proveedores, facturas, personal, horas, cierres y auditoría.
- Suite de PDF: 13 tipos documentales generados como PDF A4 real, con contenido.
- Smoke de aplicación: 18 vistas, CRUD, papelera, archivos, descargas repetidas, horas F/H/8H, liquidación, Excel, cierre, versión posterior, backup y agente.

## Resultado

`npm test` debe finalizar con PASS en todas las suites.

La validación automatizada del entorno incluye VM DOM y pruebas de núcleo/PDF; el navegador Chromium del entorno no permitió completar una sesión headless estable por una restricción externa del contenedor.
