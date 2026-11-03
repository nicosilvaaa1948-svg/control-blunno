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
