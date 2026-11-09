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

## BLUNNO V30.1.8 · Facturas, Proveedores y Horas Mensuales (2026-11-03)

- **Encabezado:** se quitaron únicamente las acciones globales «Buscar en Blunno» y «Nuevo movimiento». Se mantienen los selectores de sucursal y responsable, junto con las flechas de navegación; en pantallas angostas se distribuyen en cuatro columnas para que sigan visibles.
- **Facturas:** el listado del período/sucursal se ordena por fecha y hora de carga (más reciente primero), sin mezclar ese orden con la fecha del movimiento. Se agregó un filtro de proveedor que limita la lista a las facturas del mes y sucursal seleccionados; los totales y cantidades visibles respetan el filtro.
- **Proveedores:** búsqueda incremental por nombre con sugerencias mientras se escribe, selección de sugerencia, limpieza rápida y orden alfabético / mayor facturación / menor facturación. Los importes de orden corresponden al mes y sucursal activos.
- **Horas Mensuales:** `F` significa feriado no trabajado y destaca toda la celda en rojo; horas trabajadas en feriado se escriben como `8H` (o la cantidad correspondiente seguida de `H`) y destacan la celda en amarillo. Los antiguos registros `F` que estaban identificados como franco se conservan como `FRANCO` para no reinterpretarlos como feriados.
- **Liquidaciones:** se separan las horas normales, las horas de domingo y las horas de feriado. Se agrega un valor hora específico para domingos, visible y editable al totalizar; el importe queda guardado en la liquidación, comprobante PDF y exportación Excel. Un domingo que también sea feriado se cuenta como feriado para evitar duplicar horas. Las liquidaciones anteriores conservan su cálculo histórico y no se recalculan automáticamente.
- **Firebase:** no se modificaron `firebase.js`, `firebase.rules`, `storage.rules` ni `config.js`. No se realizó ninguna escritura en la instancia real de Firebase.
- **Verificación local:** `npm test` ejecuta seis pruebas de regresión y las seis finalizaron correctamente; también se comprobó la sintaxis de los scripts externos e inline. No equivale a una prueba en navegador conectado a Firebase de producción.
- Build `2026.11.03.37`.


## BLUNNO V30.1.8 · Móvil y períodos (2026-11-03)

- Base de trabajo: V30.1.7.
- El arranque toma el mes calendario vigente de Argentina en vez de reutilizar un mes antiguo guardado en el navegador.
- Se detecta el cambio de mes con foco, reanudación de pestaña y comprobación periódica; el cambio automático ocurre mientras el usuario sigue el período actual o uno futuro. Al elegir manualmente un mes anterior, se conserva ese contexto histórico.
- Un mes anterior al mes calendario actual, dentro del rango operativo y sin cierre formal, se etiqueta `CIERRE PENDIENTE`. El estado es informativo y no convierte el período en cerrado ni bloquea su selección.
- Los períodos con cierre formal siguen figurando `CERRADO`; el mes actual sigue `ABIERTO`; los futuros no iniciados siguen `DISPONIBLE PARA INICIAR`.
- El selector, el estado lateral y Cierre mensual muestran la etiqueta coherente por sucursal, incluso en la vista General.
- Se añadieron reglas de presentación móvil para controles superiores, navegación, selectores, paneles, tablas desplazables, formularios, modales, planillas y controles del cierre.
- No se modificaron Firebase, las reglas, los datos de la empresa ni la configuración de conexión.
- Verificación final: `npm test` pasó con 11 pruebas; sintaxis de módulos y scripts inline correcta. `firebase.js`, `firebase.rules`, `storage.rules` y `config.js` se compararon con la base V30.1.7 y permanecen idénticos.
- Build `2026.11.03.37`.


## BLUNNO V30.1.9 · Caja Diaria y selector de períodos (2026-11-03)

- Caja Diaria: el botón de edición tardía ahora funciona como interruptor. Al activarlo continúa solicitando la confirmación con responsable; al volver a pulsarlo, desactiva inmediatamente la autorización temporal de esa sucursal y período, vuelve a bloquear la planilla y registra `CASH_LATE_EDIT_DISABLED` en auditoría.
- El apagado usa el responsable seleccionado. Si no se puede registrar la auditoría, se restaura el permiso temporal para no dejar una discrepancia entre el estado de la interfaz y el registro auditado.
- La autorización general de corrección de otros módulos no se revoca al apagar el interruptor específico de Caja Diaria.
- El botón muestra explícitamente `ACTIVAR EDICIÓN TARDÍA` o `DESACTIVAR EDICIÓN TARDÍA`, con estado accesible `aria-pressed`.
- Selector de períodos: ventana ampliada hasta 1080 px en escritorio y adaptada al alto/ancho del móvil. Los años se agrupan en paneles desplegables; el año actual y el año del período seleccionado aparecen abiertos. Los meses tienen tarjetas más grandes, estado separado del nombre y del indicador ACTIVO, y lápiz con espacio fijo para los meses cerrados.
- Se mantienen los identificadores de selección de período, el flujo de confirmación de meses futuros y la protección/autorización de los meses cerrados.
- Firebase, sus reglas, la configuración y los registros existentes no se modifican.
- Verificación local: pruebas de regresión, sintaxis de módulos y scripts integrados; no equivale a una prueba de operación en Firebase de producción.
- Build `2026.11.03.38`.


## BLUNNO V30.1.10 · Liquidación en vivo y calendario estacional (2026-11-03)
- Se conectaron todos los campos de la liquidación al recálculo inmediato mediante eventos `input` y `change`. El neto, bruto, descuentos y total de horas visibles se actualizan sin volver a presionar Totalizar. La persistencia sigue ocurriendo solo al confirmar la generación del comprobante.
- Se agregó ambientación estacional por fecha argentina, incluyendo prefiestas (03/11–07/12), Navidad (08/12–28/12), Fin de Año (29/12–01/01), Reyes (02/01–06/01), San Valentín, Halloween (25/10–01/11), Carnaval y Pascuas calculados en relación con Pascua; Día de la Mujer, Malvinas, Día del Trabajador, Día del Padre, Día de las Infancias, Día del Maestro, Día de la Madre, Semana de Mayo, fechas patrias, Día del Amigo, Día de la Tradición y las estaciones astronómicas del hemisferio sur, cuyas fechas se calculan para cada año en hora argentina.
- La animación es una capa `pointer-events:none`, no utiliza Firebase ni persistencia, se actualiza al volver a la pestaña y a las 00:05 de cada día según la hora argentina, y se oculta con `prefers-reduced-motion`. Se sincronizaron `index.html` (entrada autocontenida) y los archivos fuente.
- Build 2026.11.03.39. Verificación final: 21 pruebas automáticas aprobadas, incluyendo fechas fijas, fechas móviles, equinoccios/solsticios de 2026 y 2027 y coincidencia entre el Día del Padre y el Día de la Bandera. Verificación final: 21 pruebas automáticas aprobadas (se ampliará el calendario en pruebas para esta entrega).


## BLUNNO V30.1.11 · Liquidación en vivo y calendario argentino (2026-11-03)
- **Liquidación en vivo:** los diez campos editables (horas normales, domingo, feriado, extras, total, adelantos, mercadería y tres tarifas) disparan el mismo cálculo con eventos `input` y `change`. El bruto, descuentos y neto se refrescan al instante. Si un campo de importe se vacía, su valor pasa a cero. La previsualización no escribe datos; el guardado y la generación del comprobante siguen siendo explícitos.
- **Calendario estacional argentino:** desde el 3 de noviembre se muestran detalles de pre-fiestas; del 8 al 28 de diciembre Navidad; del 29 de diciembre al 1 de enero Fin de Año; del 2 al 6 de enero Reyes; y luego la ambientación vuelve al verano. Se agregan San Valentín, Carnaval, Pascuas, Halloween, Día de la Mujer, Malvinas, Día del Trabajador, Día del Padre, Día de las Infancias, Día del Maestro, Día del Estudiante, Día de la Madre, Semana de Mayo, fechas patrias, Día del Amigo y Día de la Tradición.
- Las fechas variables de Padre, Infancias y Madre se calculan como tercer domingo del mes. El cálculo astronómico anual de equinoccios y solsticios convierte cada instante a fecha de Argentina, de modo que el comienzo de cada estación puede variar entre años. Si coinciden celebraciones (por ejemplo, Día del Padre y Día de la Bandera), se muestra un tema combinado.
- Las animaciones son pocas, suaves, no bloquean interacción, se reducen en móviles y se desactivan con `prefers-reduced-motion`. El tema se recalcula al volver a la aplicación y a las 00:05 de cada día según hora argentina. No utiliza Firebase ni persistencia.
- **Verificación:** 21/21 pruebas automatizadas; sintaxis correcta de módulos externos y scripts integrados; hojas CSS de producción/desarrollo sincronizadas; `firebase.js`, `firebase.rules`, `storage.rules` y `config.js` idénticos a la base V30.1.9. No se hicieron escrituras en Firebase.
- Build `2026.11.03.40`.


## BLUNNO V30.1.12 · Navidad completa y ambientación reforzada (2026-11-03)
- Se activa el tema navideño completo a partir del 3 de noviembre, con banner visible desde el ingreso.
- Banner en flujo normal: Papá Noel, árbol, regalos, copos, luces decorativas, mensajes de temporada y escena festiva.
- Nieve animada lenta, no interactiva y reducida en celular; el banner no se superpone a controles ni áreas de trabajo.
- Responsive para escritorio, tablet y móvil; respeta movimiento reducido del dispositivo.
- Navidad: 3 de noviembre–28 de diciembre; Fin de Año: 29 de diciembre–1 de enero; Reyes: 2–6 de enero. A partir del 7 de enero se oculta la ambientación de fiestas.
- La decoración no escribe en Firebase ni altera registros, reglas o cierres.
- Build `2026.11.03.41`.


## BLUNNO V30.1.13 · Proveedores por sucursal y mejoras móviles (2026-11-03)
- Selector de proveedores mobile: la flecha usa el desplegable personalizado; la elección se aplica directamente al input, actualiza su estado y dispara `change`. Se evita asignar `datalist` nativo al campo que ya usa el selector personalizado. El local del formulario se establece antes de inicializar el selector.
- Proveedores por sucursal: `excludedBranches` permite habilitar/deshabilitar la disponibilidad de forma aislada por sucursal. Selector normal, carga rápida, `datalist` e importador omiten los proveedores no disponibles. La validación impide nuevas facturas con proveedores desactivados en ese local, pero permite editar facturas históricas conservando el mismo proveedor y sucursal. La acción de disponibilidad registra auditoría y sincroniza solo los campos de disponibilidad del proveedor; no toca facturas existentes.
- Horas Mensuales: la entrada de horas admite texto en mobile (`inputmode=text`) para escribir F y H; horas extras conservan teclado decimal.
- En la vista móvil se oculta el indicador técnico Firebase/nube en las áreas centrales y en el estado del lateral, sin ocultar datos de trabajo en escritorio.
- Gastos: vista mobile-first con tarjetas, fecha/importe destacados, categoría, concepto, sucursal, responsable y acciones táctiles. Desktop mantiene su tabla; los filtros por categoría permanecen sincronizados. Las bajas masivas deduplican identificadores para que las vistas de escritorio y móvil no procesen dos veces el mismo registro.
- Firebase, reglas, configuración, colecciones y datos de la empresa: sin modificaciones intencionales.
- Build `2026.11.03.42`.


## BLUNNO V30.1.14 · Liquidaciones rápidas y PDF profesional (2026-11-06)

- Base funcional: V30.1.13. Se conservaron las correcciones móviles, proveedores por sucursal, calendarios festivos y demás módulos previos.
- **Liquidación:** el movimiento y su auditoría se confirman en un snapshot local de IndexedDB; el PDF se guarda en IndexedDB Vault. La cola remota se escribe agrupada y la sincronización con Firebase/Storage se ejecuta sin bloquear el botón de totalización.
- **Resiliencia:** un error posterior al guardado de la liquidación no invita a repetir la operación ni duplica el comprobante; las tareas de saldo negativo y archivo se informan por separado. Se añadió exclusión mutua del envío de la outbox y se conservan operaciones añadidas durante una sincronización en curso.
- **PDF:** una plantilla institucional central se utiliza para resúmenes y documentos sectoriales. Incluye encabezado corporativo, título/subtítulo, columnas concepto/detalle, alternancia de filas, resultados destacados, observaciones, páginas numeradas y soporte WinAnsi para caracteres españoles.
- **Impresión/descarga:** las auditorías no se esperan en la acción de usuario; las ventanas de impresión se preparan sincrónicamente para reducir bloqueos de pop-up.
- **Validación:** 41 pruebas automatizadas aprobadas; sintaxis de módulos externos e inline correcta; PDF de muestra multipágina con acentos validado. Las reglas, configuración y datos de Firebase no fueron modificados.
- Build `2026.11.06.43`.


## BLUNNO V30.1.16 · PDF de todos los sectores y descarga segura (2026-11-06)

- **Botones cubiertos:** Gastos, Facturas, Proveedores (resumen y detalle/historial individual), Inversiones (PDF e impresión), Historial, Resultados, Comparativas y Caja Diaria.
- **Enrutamiento:** normalización de alias de sectores (`corporativas`/`comparativas` → `compare`, etc.) y control único para PDF/Imprimir.
- **Descarga:** `downloadBlob` adjunta temporalmente el enlace al documento, dispara el click dentro de la acción del usuario, sanea el nombre y revoca el object URL con un margen de seguridad.
- **Archivado:** la descarga se ejecuta antes del guardado local ampliado; el registro del PDF y la sincronización continúan en segundo plano. Un error de archivado no cancela el archivo ya descargado y se comunica explícitamente.
- **Impresión:** la ventana se abre antes de operaciones asíncronas para evitar que el navegador la bloquee; la auditoría queda en segundo plano.
- **Controles dinámicos:** se enlazaron los botones PDF que se insertan luego de abrir el historial de un proveedor o los detalles de una factura/liquidación.
- **Datos antiguos:** categorías o nombres de proveedor ausentes no interrumpen la creación de informes.
- **Diseño PDF:** se conserva sin cambios la plantilla profesional aprobada en V30.1.14.
- **Pruebas:** 47/47 pruebas automáticas aprobadas; se comprobaron rutas de los ocho sectores, aliases, descarga inmediata, archivado posterior, impresión, enlaces dinámicos y sincronización entre `index.html` y `blunno-control.js`. Scripts externos e inline superan `node --check`; el ZIP se valida tras generarse.
- **Firebase y almacenamiento:** `firebase.js`, `firebase.rules`, `storage.rules` y `config.js` se compararon con la base V30.1.14 y permanecen idénticos. No se realizaron escrituras en Firebase real.
- Build `2026.11.06.45`.


## BLUNNO V30.1.16 · Orden de carga para Gastos e Inversiones (2026-11-06)

- `Store.list()` aplica un orden central y estable para `expenses` e `investments`: fecha/hora de creación o carga descendente (último registro arriba). No utiliza la fecha del movimiento para ordenar.
- Los registros antiguos sin marca de creación mantienen su orden original, que corresponde al orden de inserción conservado por BLUNNO. La función ordena una copia y no muta el estado persistido.
- Las pantallas de Gastos e Inversiones, los PDF generales, el PDF por categoría de Gastos, los historiales de impresión y la exportación Excel reciben el mismo orden. Se muestran las fechas de carga además de la fecha del movimiento para dar contexto.
- Se añadió el renderizador `renderInvestments` que faltaba en `views.js`, alineado con el runtime integrado de `index.html`.
- No se agregaron dependencias ni nuevas colecciones; el orden se resuelve en una sola función de almacenamiento, sin reescribir datos.
- No se modificaron `firebase.js`, reglas de Firebase, Storage ni configuración; no se realizaron escrituras en Firebase real.
- Build `2026.11.06.45`.


## BLUNNO V30.1.17 · Selector y edición de Facturas (2026-11-06)

- El selector de proveedores de la carga rápida y del formulario de Facturas vuelve a mostrar la lista completa al tocar la flecha y filtra por nombre o alias mientras se escribe.
- La selección conserva el ID interno del proveedor, no solamente el texto visible; se valida contra el maestro y la sucursal activa antes de guardar.
- El selector usa una sola lista personalizada (sin `datalist` nativo superpuesto), delegación de eventos estable, cierre al tocar fuera y controles táctiles de 44 px.
- El formulario de edición mantiene el proveedor original y su ID, incluso cuando el proveedor ya no está habilitado para nuevas facturas en esa sucursal; esto permite corregir facturas históricas sin reactivar al proveedor para nuevas cargas.
- El botón Editar de Facturas usa delegación estable por `data-edit` y `data-id`, y recupera el registro exacto desde Store. El formulario conserva el ID de edición en su propio estado y actualiza ese registro existente en vez de crear una factura nueva.
- Se conserva la fecha/hora original de carga al editar la factura.
- Runtime integrado en `index.html` y módulos fuente sincronizados.
- Verificación local: 60 pruebas automáticas aprobadas; sintaxis de módulos externos e inline correcta.
- `firebase.js`, `firebase.rules`, `storage.rules` y `config.js` comparados contra V30.1.16: idénticos. No se realizaron escrituras en Firebase real.
- Build `2026.11.06.46`.


## BLUNNO V30.1.19 · Reparación del selector y edición de Facturas (2026-11-06)

- Base: V30.1.17.
- Causa del fallo móvil del proveedor: el listener `blur` ocultaba la lista a los 140 ms; en celulares el evento `click` táctil podía llegar después de ese temporizador. Se quitó el cierre por `blur` y se recuperó la confirmación local desde el contenedor, con restauración controlada del foco.
- El selector conserva ID y nombre canónico, filtrado incremental, flecha de lista completa, restricción por sucursal y soporte de proveedor histórico al editar.
- El botón Editar volvió al enlace directo por fila utilizado por la versión estable anterior. El formulario conserva `dataset.editingId`, precarga el registro existente y actualiza ese ID al guardar.
- Verificación: pruebas estáticas y de interacción con DOM simulado; comprobaron el intervalo de blur táctil, elección de proveedor, ID interno, apertura de edición y llamada a actualización de la factura existente.
- Los archivos `firebase.js`, `firebase.rules`, `storage.rules` y `config.js` se mantuvieron sin cambios respecto de la V30.1.17. No se realizaron escrituras en Firebase real.
- Build `2026.11.06.48`.


## BLUNNO V30.1.19 · Reparación del selector móvil y edición de Facturas (2026-11-06)
- Se comparó el funcionamiento con el selector estable de V30.1.13 y se recuperó la confirmación local en el contenedor, sin cierre por `blur` antes del click táctil.
- El desplegable ya no limita el listado a 100 opciones; filtra por nombre y alias mientras se escribe.
- La selección conserva el ID real del proveedor en un campo oculto, tanto en carga rápida como en el formulario normal.
- El botón Editar volvió al enlace directo por fila y conserva el ID dentro del formulario. Guardar una edición llama a `Store.update`, no a `Store.add`, y mantiene `loadDate`.
- Para facturas existentes se puede mantener el proveedor original si fue deshabilitado posteriormente; no se habilita para nuevas cargas.
- No se modificaron Firebase, reglas, configuración ni datos reales.
- Pruebas locales automatizadas y simulación de secuencia táctil: suite completa. No equivale a una prueba sobre móvil físico/producción.
- Build `2026.11.06.48`.
