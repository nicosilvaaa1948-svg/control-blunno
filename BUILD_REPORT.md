# BLUNNO V28.2.5 — Recuperación de pantallas y cierre histórico

## Integración
- Firebase Web App conectado a `control-blunno`.
- Auth anónima invisible.
- Firestore central.
- `firebase.rules` se conserva exactamente del ZIP base; esta actualización no cambia reglas ni las despliega. Revisar las reglas activas en Firebase por separado antes de cualquier cambio.
- Sin login visible ni claims/roles.
- Tiempo real con `onSnapshot`.
- Cola de operaciones pendientes para reintento.
- `_blunno_meta/app` para detectar inicialización.
- `settings` y `files` permanecen locales.
- PDF/Excel no usan Cloud Storage.

## Integridad de V28.0.6
Se conserva la interfaz, proveedores, períodos, Personal, liquidaciones, cierres, Papelera y navegación existentes.

## Validaciones
`npm test` incluye regresiones V28 críticas y prueba específica de Firebase.

## Nota de verificación
Las pruebas automáticas se ejecutan en modo local para no modificar la base real. La configuración del proyecto se conserva. La conexión real en GitHub Pages debe comprobarse después de publicar el código; esta preparación no despliega reglas ni ejecuta operaciones contra Firestore de producción.
## Ajuste final · eliminación individual
- Gastos, Inversiones y Facturas: el botón individual **Eliminar** ahora abre confirmación explícita, ejecuta la misma baja lógica de `Store.remove()` y muestra una confirmación final de que el registro fue enviado a Papelera.
- Se conservan los flujos existentes de edición, selección masiva, Papelera, Firebase/Firestore y auditoría.
- Se agregó regresión automática para comprobar la baja individual de esos tres sectores.
## Ajuste crítico · eliminación de conceptos de Caja diaria
- El botón individual **Eliminar** de Caja diaria quedó conectado directamente después de cada render de la planilla.
- La baja identifica el concepto por **sucursal + período + tipo + nombre** y acepta también el ID visible del registro cuando existe.
- Conceptos provenientes de configuraciones anteriores también pueden darse de baja sin crear duplicados.
- La eliminación es no destructiva: deja `active:false` en Firestore y conserva intactos los movimientos históricos de `cash`.
- La sincronización en tiempo real conserva el tombstone local frente a snapshots antiguos, evitando que el concepto reaparezca después de eliminarlo.
- `config.js`, `firebase.js` y `firebase.rules` no fueron modificados.


## V28.2.5 — Restauración selectiva a partir del ZIP base
- Se usó el ZIP base compartido por el usuario como referencia del contenido del proyecto. No se suprimieron los archivos originales de publicación, recursos visuales, instrucciones o configuración.
- En el runtime integrado `index.html` se recuperaron los componentes originales de Proveedores (incluida disponibilidad por local), Facturas (selector desplegable de proveedor), Personal (fichas y gestión de comprobantes) y Horas Mensuales (navegación semanal y controles originales), además de Historial filtrado por período/sucursal e Importar/Backup completo.
- Se conserva `defaultMovementDate(period)` con día 10 para períodos históricos y fecha actual para el mes en curso, y el contexto global del período entre sucursales. La carga rápida de Facturas conserva el picker original y limita la fecha al mes seleccionado.
- Se conservan la edición tardía de Caja Diaria, los cierres con valores estimados separados de los movimientos de caja, las operaciones de edición/eliminación/auditoría y el manejo de cierres históricos.
- El formulario de estimaciones ahora ofrece `Eliminar valor estimado` cuando se edita un registro existente; usa la confirmación de eliminación y Papelera que ya existen.
- Pruebas automatizadas: ocho suites (`startup/exports`, regresiones críticas, Personal/Liquidaciones, restablecimiento de proveedores, integración Firebase local, Caja Diaria/recordatorios, valores estimados/cierre histórico y restauración de UI). Las ocho pasaron.
- Verificación adicional: `node --check` en los módulos externos y sintaxis de los dos bloques JavaScript del `index.html`; todas pasaron. La URL real de GitHub Pages no se pudo probar desde aquí. En un navegador local aislado, con el acceso de red bloqueado y almacenamiento simulado, se verificaron inicio, navegación entre pantallas, selector de proveedor, fechas históricas, edición/eliminación de estimados, y eliminación de facturas/inversiones/proveedores. Esto no sustituye una prueba en el sitio publicado ni verifica Firebase de producción.
- No se ejecutó ninguna operación contra Firestore real ni se cambiaron las reglas activas. El archivo `firebase.rules` se conserva dentro del paquete porque formaba parte del ZIP base; no debe desplegarse automáticamente.


## V28.2.5 — Último control de arranque

- Se corrigió la visibilidad/exportación de `vaultClear` desde el módulo de almacenamiento hacia el controlador principal. Esto evita que el arranque falle cuando se activa la limpieza inicial del almacén local de adjuntos.
- La corrección se replicó en el entry point HTML integrado y en los archivos fuente del proyecto (`store.js` y `blunno-control.js`).
- Se añadieron pruebas de regresión de la exportación y uso de `vaultClear`.
- Se ejecutó una prueba de navegador local con acceso a red bloqueado: la pantalla principal se renderizó, el indicador de arranque quedó activo, no apareció el panel rojo y se pudo navegar por Proveedores, Facturas, Personal y Horas Mensuales sin errores JavaScript. Facturas mostró el selector personalizado y, para el período actual de la prueba (octubre de 2026), la fecha inicial 09/10/2026 con límite mínimo 01/10/2026.
- Esta prueba no se conectó a la base real de Firebase y no valida operaciones de producción; solo verifica el inicio y el renderizado local.


## V28.2.5 — Eliminación interactiva y dependencias cruzadas

- La prueba interactiva del flujo de estimaciones detectó que `sectorForCollection` se utilizaba desde el controlador principal sin exportarse desde el módulo de almacenamiento. Se exportó e importó correctamente en el entry point integrado y en los archivos fuente.
- Esta corrección cubre la apertura de la confirmación de borrado, el rótulo de sector y el circuito hacia Papelera.
- Se repite el flujo real de navegador de creación, modificación y eliminación del estimado en almacenamiento local simulado, sin Firebase de producción.


# BLUNNO V30 DEFINITIVA — registro de cambios y validación

## Cambios implementados
1. Separación de Caja Diaria frente a Ingresos de Inicio y frente al resultado económico. Los ingresos económicos reales provienen de `incomes`; las estimaciones de ingresos se agregan aparte. `cash` únicamente alimenta los cálculos propios de Caja (disponible, pagos y saldo), y nunca completa el requisito de Ingresos para cerrar el período.
2. Caja Diaria muestra exactamente dos matrices principales (Ingresos y Gastos / Pagos de caja), más la sección inferior Control Diario. Gastos y pagos mantienen tipos, filas de edición y subtotales separados dentro de la segunda matriz.
3. La eliminación de un concepto pone en cero los importes que coinciden por período, sucursal, tipo y nombre normalizado. Se registran monto anterior, responsable, hora y operación auditada; no se modifica otro período, sucursal o tipo. La confirmación explica este comportamiento antes de proceder.
4. Se restauró el flujo original de Gastos por categoría: tarjetas seleccionables, selector desplegable, tabla que responde al filtro y PDF por categoría.
5. Caja Diaria se retiró de la lista de bloqueos del Cierre mensual. Los faltantes llevan a un botón `Revisar` con navegación al sector pertinente (Ingresos a Inicio, Personal a Personal/Horas, etc.).
6. El selector de períodos comienza en 2026 y la fecha inicial de movimientos continúa ligada al período seleccionado.

## Verificaciones ejecutadas
- `npm test`: nueve suites de regresión; se requiere que todas terminen con PASS antes del empaquetado.
- `node --check store.js`, `node --check views.js` y `node --check blunno-control.js`.
- Validación de sintaxis de los scripts incrustados en `index.html`.
- Regresiones para demostrar que la baja del concepto de Caja afecta solo al mismo período/sucursal/tipo y deja intactos otros importes.
- Regresiones que distinguen movimientos en `cash` de ingresos en `incomes`, impiden que Caja cubra el cierre de Ingresos y comprueban la ausencia de la obligación Caja diaria en el checklist de cierre.
- Integridad del ZIP final y comprobación de que conserva los archivos base de instrucciones, recursos y configuración.

## Alcance y precauciones
El trabajo y las pruebas se realizaron sobre una copia local aislada; no se escribieron ni borraron registros en Firestore de producción y no se modificaron las reglas activas. Antes de desplegar en GitHub Pages, hacer copia de seguridad de Firestore y del repositorio. La prueba local no sustituye una verificación final del sitio publicado contra el Firebase real. `firebase.rules` se conserva como parte del paquete original pero no debe desplegarse automáticamente.
