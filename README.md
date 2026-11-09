# BLUNNO CONTROL EMPRESARIAL — V30.1.10 · LIQUIDACIÓN EN VIVO Y AMBIENTACIÓN ESTACIONAL

BLUNNO mantiene la misma interfaz y navegación de la V28.0.6 y agrega Firestore como base central compartida.

## Firebase
- Proyecto: `control-blunno`.
- Firestore: se conserva la instancia ya configurada en Firebase Console; esta versión no cambia la región ni migra la base.
- Auth anónima invisible: no correo, no contraseña y no login visible.
- La interfaz no muestra un login visible; el acceso efectivo lo determinan las reglas activas de Firestore.
- Sincronización inicial y tiempo real mediante listeners.
- Cola local de reintento si una escritura falla temporalmente.
- Los datos de negocio y auditoría se centralizan.

## PDF / Excel / archivos y almacenamiento duradero
- La base local principal y la cola pendiente de sincronización ahora viven en IndexedDB. `localStorage` se utiliza solo para preferencias pequeñas; no se escribe la base completa en una sola clave.
- Los registros financieros y la auditoría continúan sincronizándose con Firestore cuando Firebase está disponible. Los cambios pendientes se conservan en IndexedDB sin un límite fijo de 1000 elementos.
- Los binarios PDF/Excel se suben a Firebase Storage si el bucket y sus reglas están habilitados. Si la carga no está disponible, el binario se conserva en el almacén IndexedDB local y la aplicación sigue funcionando.
- Los PDF/Excel nuevos ya no se convierten a Base64 dentro de la base de datos o la auditoría. Durante el primer inicio tras actualizar, BLUNNO intenta migrar de forma conservadora los Base64 antiguos a su almacén de archivos; si no puede hacerlo, conserva el original y no lo elimina.
- Se solicita almacenamiento persistente al navegador cuando la API lo permite. Esto reduce la posibilidad de expulsión automática, pero no protege frente a borrar los datos del sitio, pérdida del dispositivo o cuota total agotada; seguir descargando backups.

### Activar almacenamiento remoto de documentos (opcional)
1. En Firebase Console, confirmá que Cloud Storage esté habilitado para el proyecto. El proveedor puede requerir el plan Blaze y facturación activa.
2. Revisá `storage.rules` antes de desplegarlo. Esta versión de la app usa autenticación anónima, por lo que `request.auth != null` NO equivale a acceso privado para operadores; no deployes esas reglas para datos sensibles sin configurar autenticación y controles de acceso reales.
3. Si todavía no habilitás Storage o la carga es denegada, el sistema mantiene el respaldo local IndexedDB automáticamente.
4. No reemplaces las reglas actuales de Firestore desde este paquete: no se modifican ni despliegan automáticamente.

## Proveedores y datos iniciales
El maestro de proveedores permanece completo. Los movimientos de negocio pueden comenzar en cero.

## Publicación
Subí estos archivos a la raíz de GitHub Pages. En Firebase Authentication > Settings > Authorized domains debe estar autorizado `nicosilvaa1948-svg.github.io`.

## Seguridad antes de publicar
No publiques ni reemplaces automáticamente las reglas activas de Firebase con `firebase.rules`. Primero compará el archivo con las reglas actuales de Firestore y verificá las restricciones de acceso. Esta actualización del sitio no requiere modificar la base de datos ni sus reglas. Si el dominio todavía no está autorizado, verificá `nicosilvaa1948-svg.github.io` en Authentication > Settings > Authorized domains.


## V28.2.5 · Recuperación de pantallas y funciones solicitadas
- Se toma la estructura del ZIP base `BLUNNO_V28.2.0_CAJA_EDICION_TARDIA_MES_CERRADO_DEFINITIVA` como referencia y se conservan sus archivos originales.
- Se restauran los botones y pantallas originales de Proveedores, el selector personalizado de proveedor en Facturas, las fichas/comprobantes de Personal y la planilla semanal de Horas Mensuales.
- Se mantienen el contexto de período global entre sucursales, el modo de edición tardía para Caja Diaria y la fecha inicial asociada al mes seleccionado.
- Se conservan los valores estimados de Ingresos y Personal para permitir cierres históricos/actuales sin completar cada día de Caja Diaria; se mantienen separados de Caja Diaria y de los valores reales.
- Al modificar un estimado aparece una acción explícita para enviarlo a Papelera con confirmación. La edición y eliminación quedan sujetas a los mecanismos de auditoría existentes.
- La batería local de pruebas no escribe en la instancia real de Firebase. Antes de publicar, generar y conservar una copia de seguridad de Firestore.


## V28.2.5 · Corrección adicional de arranque

Se corrigió la exportación de `vaultClear` entre el módulo de almacenamiento y el controlador principal para evitar que la limpieza inicial local detenga la carga de la aplicación. Se ejecutaron las pruebas automáticas y una verificación local en navegador de Inicio, Proveedores, Facturas, Personal y Horas Mensuales. La comprobación local no realiza operaciones contra Firebase de producción.


## V28.2.5 · Corrección de la eliminación de estimados

Se conectó la función de identificación de sector a través de los módulos para que la confirmación de borrado y los flujos relacionados funcionen desde el controlador principal.


## V30 DEFINITIVA · Correcciones solicitadas

- **Caja Diaria queda separada de Ingresos de Inicio**: los movimientos de caja ya no alimentan los ingresos económicos ni sirven para cubrir el control de ingresos del cierre. Los ingresos reales y estimados de Inicio son los que participan del resultado del negocio; Caja calcula su saldo propio.
- **Dos matrices principales en Caja Diaria**: Ingresos y Gastos / Pagos de caja, manteniendo debajo el Control diario. Dentro del segundo cuadro se distinguen los renglones de Gastos y Pagos y sus subtotales.
- **Baja de conceptos de Caja**: al eliminar un concepto, los importes asociados a ese período, sucursal y tipo quedan en cero; el valor previo y la trazabilidad se conservan en auditoría. Otros períodos, sucursales y tipos no se modifican.
- **Gastos por categoría**: se restablecen las tarjetas seleccionables por categoría, el selector desplegable y los botones PDF por rubro, junto al historial filtrado.
- **Cierre mensual**: Caja Diaria no es un requisito bloqueante. El chequeo de Ingresos revisa los registros reales/estimados del sector Inicio, y el botón **Revisar** navega al sector que requiere atención.
- **Selector de períodos**: los años disponibles comienzan en 2026.

Las pruebas de esta versión se ejecutan localmente. No alteran la base de datos real de Firebase ni despliegan reglas.


## V30.1 · Ajustes finales de detalle
- El detalle emergente de Ingresos en Inicio muestra únicamente movimientos de la colección independiente `incomes` y los valores estimados; nunca lista movimientos de Caja Diaria.
- En ese detalle se muestran dos tarjetas: `Estimados` y `Total considerado`. El recuadro `Reales registrados` sigue conservado en el detalle de Personal.
- Caja Diaria presenta tres KPI: `Ingresos`, `Gastos / Pagos` (suma de ambas salidas) y `Resto final`; las filas de Gastos y Pagos siguen discriminadas en la planilla y el Control Diario.
- Se corrigió el módulo incluido en `index.html` para importar `sourceIdentity`, dependencia necesaria al abrir Gastos con registros cargados y filtrar las categorías.
- Build `2026.10.09.31`; sin cambios en la configuración de Firebase ni en el modelo de datos.

## V30.1.8 · Cambios de esta actualización (2026-11-03)
- Encabezado simplificado: se retiraron la búsqueda global y el botón global de nuevo movimiento; sucursal, responsable y flechas permanecen.
- Facturas: ordenadas por momento de carga, con filtro por proveedor para el período y sucursal elegidos.
- Proveedores: buscador incremental con sugerencias y orden por nombre, mayor facturación o menor facturación.
- Horas: `F` rojo para feriado no trabajado, `8H` amarillo para feriado trabajado y `FRANCO` para conservar descansos históricos.
- Liquidaciones: campo de valor hora domingo y separación de horas normales, dominicales y feriadas; el valor se incorpora al comprobante y a la exportación.
- Móvil y navegación: estilos responsive integrados tanto en `index.html` (versión autocontenida publicada) como en `styles.css`; encabezado, selectores, flechas, paneles, tablas, planillas, formularios y modales se ajustan a pantallas angostas.
- Períodos: cada apertura nueva comienza en el mes calendario actual de Argentina; el período activo se actualiza al cambiar el mes, pero una selección histórica o futura manual se respeta. Los meses anteriores sin cierre formal se identifican como `CIERRE PENDIENTE` y continúan abiertos para trabajar.
- Verificación de esta entrega: `npm test` ejecuta 11 pruebas automatizadas de regresión; también se comprueba la sintaxis de scripts externos e integrados. No sustituye la prueba final en cada dispositivo y navegador conectado a la base real.
- Pruebas locales: `npm test`. La prueba no se conecta a Firebase de producción ni modifica datos o reglas.


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


## V30.1.10 · Cálculo en vivo y ambientación estacional (2026-11-03)
- La liquidación recalcula inmediatamente al cambiar cualquiera de sus campos: horas normales, domingos, feriados, extras, total de horas, adelantos, mercadería y las tres tarifas. El botón de guardar sigue siendo una acción explícita; el cálculo en pantalla no escribe ni guarda automáticamente una liquidación.
- Se incorpora ambientación estacional automática para Argentina: pre-fiestas desde el 3 de noviembre, Navidad desde el 8 de diciembre, Año Nuevo, Reyes hasta el 6 de enero, San Valentín, Carnaval y Pascuas con fechas móviles, Halloween, Día de la Mujer, Malvinas, Día del Trabajador, Día del Padre, Día de las Infancias, Día del Maestro, Día de la Madre, fechas patrias, Día del Amigo, Día de la Tradición y motivos discretos de verano, otoño, invierno y primavera, con equinoccios y solsticios calculados año a año en horario argentino.
- Los motivos animados no interceptan clics ni cambian datos; se recalculan al volver a la pestaña y a las 00:05 de cada día según la hora argentina, respetan la preferencia de movimiento reducido y no requieren conexión ni escritura en Firebase.
- Build 2026.11.03.39. Verificación final: 21 pruebas automáticas aprobadas, incluyendo fechas fijas, fechas móviles, equinoccios/solsticios de 2026 y 2027 y coincidencia entre el Día del Padre y el Día de la Bandera.


## V30.1.11 · Liquidación en vivo y calendario argentino (2026-11-03)
- Todos los campos de horas, montos y tarifas de la liquidación actualizan en el momento el bruto, descuentos, horas totales y neto. Vaciar adelantos o mercadería los deja en cero; no se recupera el valor previo. La liquidación se guarda únicamente al confirmar el botón de totalizar y generar el comprobante.
- Ambientación automática por fecha argentina: pre-fiestas desde el 3 de noviembre; luces y Navidad desde el 8 de diciembre; Año Nuevo y Reyes hasta el 6 de enero; San Valentín; Carnaval y Pascuas móviles; Halloween; Día de la Mujer, Malvinas, Día del Trabajador, Día del Padre, Día de las Infancias, Día del Maestro, Día de la Madre, Día del Estudiante, Semana de Mayo, Día del Amigo y Día de la Tradición.
- Día del Padre, Día de las Infancias y Día de la Madre se calculan como tercer domingo de junio, agosto y octubre. Los equinoccios y solsticios se calculan año a año y se convierten a fecha local argentina, para que verano, otoño, invierno y primavera no queden fijos en un día incorrecto.
- La decoración es liviana, acompaña con pequeños elementos animados sin interceptar clics, se limita en móvil y respeta `prefers-reduced-motion`. Se actualiza al volver a la pestaña y a las 00:05 hora argentina. No persiste preferencias ni escribe datos en Firebase.
- Verificación: 21 pruebas automáticas aprobadas; scripts externos e integrados superan `node --check`; CSS de producción y desarrollo sincronizados; Firebase, reglas y configuración comparados contra la V30.1.9 y sin diferencias.
- Build `2026.11.03.40`.


## V30.1.12 · Navidad completa y ambientación reforzada (2026-11-03)
- La temporada navideña completa comienza el 3 de noviembre, sin etapa previa reducida.
- Banner visual en el flujo normal de la página con Papá Noel, árbol, regalos, luces, copos, mensajes legibles y detalles dorados/verde/rojo.
- Copos de nieve de movimiento lento en una capa decorativa no interactiva; no cubren ni bloquean botones o datos.
- En celular el banner se compacta, el texto conserva contraste y los elementos se reacomodan. Se respeta `prefers-reduced-motion`.
- Del 29 de diciembre al 1 de enero pasa a Fin de Año; del 2 al 6 de enero muestra Reyes. Después desaparece el banner y se restablece la decoración estacional habitual.
- La decoración es puramente visual y no utiliza Firebase ni almacenamiento de la empresa.
- Build `2026.11.03.41`.


## V30.1.13 · Proveedores por sucursal y mejoras móviles (2026-11-03)
- Selector de proveedores reforzado para celular: el botón desplegable abre una única lista propia, cada opción se selecciona directamente, el valor queda en el campo del formulario y el selector no compite con el `datalist` nativo del navegador. La sucursal del formulario se establece antes de cargar las opciones.
- La lista de proveedores para facturar, el selector rápido, el `datalist` y la importación filtran por disponibilidad de la sucursal elegida. Los proveedores desactivados localmente no pueden utilizarse en nuevas facturas de ese local; se mantienen visibles en el maestro y pueden reactivarse desde el mismo perfil.
- La disponibilidad se guarda como `excludedBranches` en el registro del proveedor global, agregando o quitando únicamente la sucursal seleccionada. No modifica otras sucursales ni elimina facturas históricas. Se permite mantener el proveedor actual al editar una factura histórica del mismo local.
- Horas Mensuales usa `inputmode=text` para la celda principal, habilitando F y H en teclados móviles; el campo de horas extras mantiene teclado numérico.
- En celular se oculta el estado técnico «Firebase + nube» del centro/menú lateral. El estado técnico sigue disponible en escritorio.
- Gastos muestra tarjetas táctiles en móvil, filtros por categoría y acciones legibles; la tabla amplia queda para escritorio. La eliminación múltiple deduplica IDs cuando hay vistas desktop y mobile simultáneas.
- Build `2026.11.03.42`. Se ejecutaron pruebas locales de regresión y sintaxis. No se escribieron datos ni reglas en Firebase.


## V30.1.14 · Liquidaciones rápidas y PDF profesional (2026-11-06)
- La liquidación de sueldo guarda primero el movimiento y su auditoría en IndexedDB. El comprobante PDF se archiva en el vault local; la sincronización con Firebase y la promoción a Storage se realizan en segundo plano.
- Se agrupa la cola remota de una operación en una sola escritura y se serializan los envíos de outbox para evitar sincronizaciones simultáneas. Las operaciones nuevas agregadas mientras se envía otro lote permanecen en cola.
- El botón de totalización evita dobles clics, comunica el estado de guardado y diferencia una liquidación confirmada localmente de cualquier tarea secundaria pendiente.
- Se unificaron impresión y descarga de informes/comprobantes en la plantilla PDF institucional, con títulos, concepto/detalle, importes destacados, saltos de página y codificación WinAnsi para español.
- La vista de impresión abre su ventana en el gesto de usuario antes de las operaciones asíncronas; la auditoría de impresión/descarga no bloquea al usuario.
- Build `2026.11.06.43`. Se ejecutaron 41 pruebas automatizadas, análisis sintáctico de scripts y validación de PDF multipágina. No se escribieron datos ni reglas en Firebase.


## V30.1.16 · PDF de todos los sectores y descarga segura (2026-11-06)

- Se corrigió el enrutamiento de los botones PDF/Imprimir de Gastos, Facturas, Proveedores, Inversiones, Historial, Resultados, Comparativas y Caja Diaria.
- Los PDF sectoriales ahora inician la descarga en el mismo clic; el archivado local se ejecuta en segundo plano y muestra una advertencia explícita si no puede completarse.
- Se conectaron también los botones PDF creados dinámicamente dentro del historial de proveedores y del detalle de facturas/liquidaciones.
- La impresión abre su ventana en el gesto original del clic para evitar bloqueos de ventanas emergentes; la auditoría no demora la descarga ni la impresión.
- La plantilla institucional PDF aprobada se mantiene sin cambios. Se reforzó la descarga del Blob, el nombre del archivo y el tiempo de vida de su URL temporal.
- Los datos históricos incompletos de gastos/proveedores se normalizan con textos alternativos para no detener la generación.
- Se verificó el almacenamiento local rápido y el archivado IndexedDB existente; la descarga no depende de que finalice el archivado. Si el archivo no logra archivarse, se informa claramente al usuario.
- Verificación local: 47 pruebas automáticas aprobadas, incluidos los ocho sectores solicitados, historial de proveedor, descarga antes del archivado, impresión, sincronización del runtime y PDF multipágina. Scripts externos e inline pasan `node --check`.
- Los archivos `firebase.js`, `firebase.rules`, `storage.rules` y `config.js` permanecen idénticos a la V30.1.14. No se realizaron escrituras en Firebase real.
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


## BLUNNO V30.1.19 · Corrección definitiva del selector y edición de Facturas (2026-11-06)

- Se recuperó el patrón de eventos local del selector de la versión estable anterior: la flecha abre/cierra, escribir filtra y la selección se confirma desde el contenedor del desplegable.
- Se eliminó el cierre de sugerencias por `blur` con temporizador (140 ms), que podía ocultar la opción antes de que un toque móvil generara el evento `click`. La selección conserva el nombre y el ID interno del proveedor; el foco vuelve al campo sin reabrir la lista.
- Se mantiene el filtro de disponibilidad por sucursal y la excepción para conservar el proveedor original al editar facturas históricas.
- Se restauró el enlace directo por fila para el botón Editar, igual al patrón probado de versiones anteriores. `openModal` sigue recuperando la factura por ID y `saveRecord` actualiza el registro existente en lugar de crear uno nuevo.
- Se agregaron pruebas de interacción que simulan la secuencia móvil de escribir → perder foco → esperar → tocar una sugerencia, apertura/cierre mediante flecha y el enlace del botón Editar.
- Build `2026.11.06.48`.


## BLUNNO V30.1.19 · Corrección prioritaria de Facturas (2026-11-06)
- El selector usa el desplegable propio de BLUNNO, conserva el clic táctil después del blur móvil, muestra todas las opciones disponibles y guarda el ID del proveedor junto con el nombre.
- Se recuperó el enlace directo del botón Editar, con referencia explícita al ID de la factura. La edición actualiza el registro existente y mantiene su fecha original de carga.
- Se permite conservar el proveedor original al editar una factura histórica aunque haya sido deshabilitado para nuevas cargas; no se reactiva ni se altera su disponibilidad.
- La versión publicada y los módulos fuente mantienen exactamente la misma implementación.
- Build `2026.11.06.48`.
