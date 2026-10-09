# BLUNNO CONTROL EMPRESARIAL — V30 DEFINITIVA

BLUNNO mantiene la misma interfaz y navegación de la V28.0.6 y agrega Firestore como base central compartida.

## Firebase
- Proyecto: `control-blunno`.
- Firestore: se conserva la instancia ya configurada en Firebase Console; esta versión no cambia la región ni migra la base.
- Auth anónima invisible: no correo, no contraseña y no login visible.
- La interfaz no muestra un login visible; el acceso efectivo lo determinan las reglas activas de Firestore.
- Sincronización inicial y tiempo real mediante listeners.
- Cola local de reintento si una escritura falla temporalmente.
- Los datos de negocio y auditoría se centralizan.

## PDF / Excel / archivos
PDF, impresión y Excel permanecen locales por computadora. No se utiliza Cloud Storage para binarios. La generación del PDF puede volver a hacerse desde los datos centrales y la acción queda auditada.

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
