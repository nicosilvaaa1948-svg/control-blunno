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


## V30.1 · Ajustes finales de detalle (2026.10.09.31)
- Corregido el detalle de Inicio > Ingresos: ahora lista `incomes` más estimados, sin mostrar Caja Diaria. Para Ingresos se eliminó solo la tarjeta `Reales registrados`; el detalle de Personal mantiene sus tres tarjetas.
- Caja Diaria ahora muestra tres KPI: Ingresos, Gastos / Pagos (egresos combinados) y Resto final. Los cuadros y el Control Diario conservan la separación de Gastos y Pagos.
- Corregida la dependencia `sourceIdentity` en el módulo de vistas embebido de `index.html`, que podía impedir abrir Gastos cuando había datos para normalizar categorías.
- Añadida una suite de regresión `v30-final-detail-fixes.test.mjs`. Las pruebas son locales y no acceden a la instancia de Firebase de producción.


## BLUNNO V30.1.1 — Correcciones puntuales de Facturas y Proveedores (2026-10-15)

- La carga rápida de facturas en períodos anteriores usa el día seleccionado (por defecto, día 10) y el control de autorización ya funciona sin requerir un formulario tradicional.
- La edición de facturas resuelve la función del maestro de proveedores a través de la API pública de Store y recupera fecha/período de registros antiguos que carezcan de alguno de esos campos.
- Las facturas nuevas conservan `providerId`; al cambiar el nombre de un proveedor, el nombre anterior se guarda como alias y las facturas históricas se siguen asociando al mismo proveedor.
- Las vistas de Facturas, el resumen diario por proveedor, el historial del proveedor y los PDF muestran el nombre canónico actual cuando pueden resolver la relación.
- Verificación local: pruebas de regresión existentes más pruebas nuevas de fecha/período, edición y cambio de nombre. No se modificó ni desplegó Firestore ni `firebase.rules`; no se realizó una prueba contra la base de datos real.


## BLUNNO V30.1.2 · Adaptación móvil (2026-10-26)

- Se amplió la adaptación responsive para iPhone, Android y tablets, conservando el diseño de escritorio y los flujos existentes.
- Se corrigió el ocultamiento del menú lateral en teléfonos: ahora abre como panel deslizable con fondo de cierre.
- Los selectores de sucursal y responsable siguen accesibles en teléfonos; búsqueda y nuevo movimiento se presentan en controles táctiles.
- Formularios, modales, resúmenes, notificaciones y paneles se ajustan al ancho y al área segura de pantallas con muesca.
- Las planillas y tablas anchas conservan su ancho de datos y se desplazan dentro de su propio contenedor, no sobre toda la página.
- Los cambios son de CSS y metadatos; no se modificaron módulos de negocio, datos ni reglas de Firebase.
- Verificaciones de esta entrega: comprobación de sintaxis JS/HTML y pruebas visuales por viewport pendientes de ejecutar en navegador en este entorno.


## BLUNNO V30.1.3 · Ajustes de usabilidad móvil (2026-10-26)

- Caja Diaria: en pantallas de hasta 820 px se presentan los conceptos por día, con campos táctiles y control diario desplegable. La planilla de escritorio permanece en su contenedor original.
- Personal: tarjetas con jerarquía de nombre, puesto, sucursal, valor hora y acciones, y comprobantes de sueldo legibles en pantallas chicas.
- Proveedores: tarjetas de maestro, búsqueda de proveedor y resumen móvil de importes por día; en escritorio se conserva la matriz mensual.
- Facturas: tarjetas para consultar los datos y acceder a las acciones sin comprimir la tabla de ocho columnas en el teléfono.
- Selector de proveedor: una sola selección por `click`; se quitó la selección duplicada y el reenfoque posterior que podía reabrir la lista. Se mantienen teclado y botón de apertura/cierre.
- Las vistas móviles se activan por media queries; los estilos específicos se limitan a anchos de 820 px o menos (y 380 px o menos para teléfonos compactos).
- Verificación: sintaxis JavaScript y parseo CSS sin errores; prueba estructural móvil incorporada y ejecutada. El ZIP V30.1.2 no traía los archivos de las suites históricas referenciadas por el anterior comando `npm test`; el comando ahora ejecuta la prueba estructural nueva (no sustituye pruebas integrales de lógica). No se probaron dispositivos físicos ni se operó sobre Firebase real. `firebase.js`, `firebase.rules`, `store.js` y `config.js` permanecen sin cambios.


## BLUNNO V30.1.4 · Reparación de cuota de almacenamiento (2026-10-29)

- Causa confirmada en el código: el estado completo se guardaba en una única clave de `localStorage` (`blunno-control-v13-final`), que puede superar la cuota del navegador.
- Se añadió almacenamiento de respaldo completo en IndexedDB. Cuando `localStorage.setItem` falla, el estado se guarda en IndexedDB y se espera la confirmación antes de liberar la clave grande de `localStorage`.
- La inicialización recupera la copia ampliada antes de sincronizar o renderizar; si el marcador indica datos en IndexedDB pero la copia no se puede leer, el sistema detiene el arranque con un error explícito en vez de iniciar una base vacía.
- Las operaciones auditadas esperan la confirmación del guardado del estado, se muestran avisos de cambio de almacenamiento y se mantiene la lógica de negocio y de Firebase. No se cambian `firebase.rules`.
- Verificación de entrega: sintaxis de los módulos y del runtime embebido, más prueba estructural ejecutable con `npm test`. No se modificó ni se probó la base de datos real de Firebase ni se desplegó GitHub Pages desde este entorno.


## BLUNNO V30.1.6 · Persistencia duradera y archivos (2026-10-29)

- IndexedDB se vuelve el almacenamiento principal desde el primer inicio. La clave antigua de estado local se lee solo para migrarla y se elimina únicamente después de confirmar el snapshot en IndexedDB.
- La cola de sincronización se migra a IndexedDB, sin truncado silencioso de 1000 operaciones. El arranque espera la recuperación de estado y cola antes de sincronizar.
- Los documentos nuevos se envían a Firebase Storage cuando está disponible; cada objeto usa un nombre único para no sobrescribir versiones. Ante falta de Storage, se usa el vault local de IndexedDB, nunca Base64 como nueva vía de respaldo.
- Las fichas de documentos remotos (con URL) se sincronizan a Firestore; los archivos con solo copia local siguen siendo locales y se combinan con los resultados remotos. Las filas remotas excluyen `blob`, `dataUrl` y `vaultKey`.
- Se incorpora `storage.rules` como referencia opcional, no desplegada; se documenta que la autenticación anónima no proporciona acceso privado por operador.
- Sincronización remota y almacenamiento local no se probaron contra Firestore/Storage de producción; las reglas activas permanecen sin cambios.


## BLUNNO V30.1.6 — cierre de verificación local (2026-10-29)

- Se actualizó el diagnóstico en Excel / Backup para mostrar modo local, si el navegador confirmó persistencia, cuota estimada y cantidad de operaciones pendientes de sincronización. La cuota es una estimación del origen, no una promesa de espacio disponible.
- Las verificaciones automáticas de esta entrega comprueban sintaxis, persistencia principal IndexedDB, migración segura, cola sin límite fijo de 1000, separación de binarios y versiones de build.
- No se realizó acceso a la base de datos real del usuario ni una prueba de restauración de datos de producción. No se modificaron reglas activas de Firestore ni se publicaron reglas de Cloud Storage. Cloud Storage permanece opcional y requiere estar habilitado y contar con reglas correctas; si no está disponible, los documentos sin URL se conservan localmente en IndexedDB y solo en ese dispositivo.
- Antes de sustituir el sitio, cerrar otras pestañas de BLUNNO, descargar un backup completo y conservar la versión anterior del repositorio. Tras publicar, verificar registros actuales e históricos, crear un registro de prueba, recargar y confirmar su persistencia, y restaurar un backup de prueba.


### Ajustes finales de V30.1.6 (build 2026.10.29.35)
- La restauración ZIP espera confirmación del guardado antes de informar éxito y conserva el estado de Papelera de los documentos incluidos. Si un enlace remoto no responde, el archivo del ZIP se conserva en el vault local como fallback.
- La sincronización en tiempo real conserva la referencia de ese fallback local cuando una ficha de documento remota reemplaza su metadata, evitando que el binario guardado localmente quede inaccesible.
- La eliminación definitiva de fichas de archivos guarda primero el cambio de metadata y después limpia los binarios; se mantienen las auditorías de la purga.
- Última verificación: `npm test` pasó (sintaxis de módulos y scripts integrados y guardrails estáticos). No se pudo realizar una prueba real del navegador ni una escritura/restauración en la instancia de Firebase del usuario en este entorno.
