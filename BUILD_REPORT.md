# BLUNNO CONTROL EMPRESARIAL · V30 PERSONAL Y PAPELERA

## Estado
Auditoría y correcciones realizadas sobre la aplicación existente, preservando el runtime publicado y las funciones que ya funcionaban correctamente.

## Tramo 1 · Núcleo de períodos, persistencia y operaciones
- Períodos anteriores a octubre de 2026 quedan CERRADOS.
- Los meses cerrados muestran lápiz de modificación con confirmación y responsable obligatorio.
- Octubre de 2026 en adelante queda ABIERTO o DISPONIBLE PARA INICIAR según calendario y sucursal.
- El inicio de períodos futuros queda registrado por sucursal y no altera otros períodos.
- La selección y edición de período conserva datos independientes por período y sucursal.
- La navegación de semanas de Caja funciona hacia adelante y hacia atrás, conserva la semana por período/sucursal, bloquea dobles clics y actualiza sin recargar la página.
- Horas mensuales usa la misma protección de navegación semanal y evita bloqueos por clicks consecutivos.
- Gastos tienen alta, edición, guardado, eliminación y PDF general/individual por categoría.
- Proveedores tienen maestro inicial completo, selección, búsqueda incremental y validación de proveedor existente; se eliminó la llamada fuera de alcance que dejaba el selector en error.
- Se corrigió el refresco de un mismo sector después de cambios de datos, evitando información visual desactualizada en Personal y otros sectores.

## Tramo 2 · Personal, cierre, PDFs y auditoría
- Liquidaciones de sueldo quedan persistidas, editables y eliminables.
- La vista Personal se actualiza después de modificaciones/eliminaciones de liquidaciones.
- Los saldos negativos derivados se eliminan/actualizan junto con la liquidación que los originó.
- Cierre mensual valida bloqueos concretos y muestra un cuadro pequeño con sector, detalle y responsable de la corrección; en horas identifica a los empleados sin carga.
- El historial mantiene período y sucursal como contexto.
- Los cuadros conceptuales de Caja muestran Ingresos, Gastos y Resto final; el control operativo interno conserva la fila de pagos para no romper el cálculo existente.
- Motor PDF revisado para A4, paginación y generación de documentos; se verificó también render visual de una salida real.
- El selector de períodos ahora amplía automáticamente el horizonte visible hacia años futuros, sin quedar limitado permanentemente a 2030.
- Cada perfil conserva su último período seleccionado en una clave independiente; cambiar de sucursal/perfil no arrastra el período de otro.

## Tramo 3 · Regresión y estabilidad
Se ejecutó `npm test` completo después de los cambios finales.

### Pruebas PASS
- STATIC TESTS
- CORE TESTS
- PDF TEST
- PDF SUITE (13 documentos A4)
- APP SMOKE TESTS (arranque, 16 vistas, CRUD, sucursales, períodos, caja, horas, liquidaciones, PDFs, cierre y backup)
- V20 REGRESSION TESTS
- V22 REGRESSION TESTS
- V23 REGRESSION TESTS
- V24 REGRESSION TESTS
- V25 REGRESSION TESTS
- V26 USER FIXES TESTS
- V28 FINAL USER FIXES
- FIREBASE CONNECTED TESTS
- V30 PERSONAL/PAPELERA TESTS
- FINAL QA TESTS (navegación, botones dentro de formularios, wiring de acciones, cálculos críticos, PDF/impresión/backup)

El runtime embebido de `index.html` coincide con `blunno-control.js` según las pruebas estáticas.

## Limitación de validación visual
El entorno de ejecución utilizado para esta auditoría bloquea el acceso de navegador a páginas locales/`file://`, por lo que no fue posible ejecutar una navegación click-by-click dentro de Chrome contra la aplicación local. No se presenta esa parte como una prueba que haya pasado. Como compensación se ejecutaron smoke tests, regresiones, comprobaciones de persistencia y generación/rasterización real de PDF sobre el código ejecutable.

## Resultado del paquete
Versión: **V30 PERSONAL Y PAPELERA · 2026.10.06.30**


## V28 · ARRANQUE REAL + AJUSTES FINALES
- PDF individual de gastos: la categoría seleccionada se normaliza y también puede recuperarse desde el selector/contexto actual; Luz y cualquier otra categoría generan su PDF sin falso aviso de selección.
- Proveedores: maestro global visible en todos los perfiles; las facturas siguen separadas por período y sucursal, con General como vista consolidada.
- Personal / Inversiones en el detalle del Inicio: los registros muestran Modificar y Borrar; los demás sectores continúan siendo de consulta desde ese cuadro.
- Facturas: selector de proveedor con flecha operativa, catálogo completo (sin límite de 100), búsqueda por coincidencia parcial y actualización inmediata del catálogo al agregar proveedores.
- Runtime publicado: `index.html` y `blunno-control.js` quedan sincronizados.
- Pruebas finales: regresiones V20–V30, núcleo, PDFs y smoke integral en PASS.


## Tramo 4 · Correcciones finales solicitadas
- Facturas: el detalle ahora muestra Modificar y Borrar, y Modificar abre el editor de facturas correcto.
- Inicio: Personal e Inversiones mantienen Abrir, Modificar y Borrar; el borrado cierra el detalle y actualiza la vista.
- Arranque real: al abrir V28 sobre una instalación local con datos previos, una migración única elimina movimientos, empleados de prueba, liquidaciones, cierres, archivos, importaciones y auditoría anteriores; conserva el catálogo maestro de proveedores y la estructura de períodos.
- Se limpian también los estados de semana/categoría/período guardados en local para comenzar desde Octubre 2026 sin arrastrar contexto de prueba.
- Runtime publicado y fuente quedan sincronizados.


## V30 · Personal y Papelera (2026-10-06)
- Se incorporó el `firebaseConfig` del proyecto `distribuidora-blunno` al runtime que realmente ejecuta la aplicación.
- Se conectaron Authentication Email/Password, Firestore y Storage.
- Se incorporó Analytics de forma no bloqueante.
- El arranque espera una sesión autenticada antes de sincronizar datos en la nube.
- `index.html` y `blunno-control.js` quedan sincronizados.
- Se agregó prueba específica para configuración, Authentication, Analytics y reglas de proveedores.


## V30 · Personal y Papelera
- Alta de empleado con nombre, sucursal, puesto y valor hora obligatorios.
- Personal en Inicio muestra exclusivamente liquidaciones existentes; eliminar una liquidación no elimina las horas.
- Papelera reforzada como navegación principal con botón real y tipo button.
- Firebase se conserva sin cambios en credenciales/adaptadores.
- Pruebas nuevas para validación de empleados y desaparición de la liquidación sin borrar horas.
- La prueba integral también verifica que eliminar una liquidación quite su saldo negativo derivado, conserve las horas mensuales y deje el salario liquidado en cero.
