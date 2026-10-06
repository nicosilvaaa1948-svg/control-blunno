# BLUNNO CONTROL EMPRESARIAL — V28 ARRANQUE REAL + AJUSTES FINALES WEB

Web interna de gestión para Distribuidora Blunno. Es un sitio web browser-first preparado para GitHub Pages; no utiliza manifest PWA ni service worker.

## Publicación

El `index.html` está en la raíz. Subí **el contenido de esta carpeta** a la raíz del repositorio de GitHub Pages. No hay que renombrar ni mover archivos.

## Modo de datos

- `Modo local`: datos en `localStorage` + archivos binarios en IndexedDB.
- Firebase se activa solamente cuando se cargan credenciales reales en `config.js`.
- No hay credenciales inventadas.

## Separación de datos

Cada movimiento económico mantiene sucursal y período. `General` es una vista consolidada y no permite editar movimientos de sucursal. Caja diaria se mantiene fuera del Resultado.

## Facturas

Las facturas se relacionan con el maestro de proveedores, son editables y solamente usan el estado `CARGADA`. Se conserva fecha de movimiento y fecha/hora de carga. Las cargas posteriores a un cierre generan una nueva versión controlada del cierre.

## PDFs y Archivos

El motor está centralizado en `pdf/pdf-engine.js`. Los documentos se archivan con ficha documental, versión y origen. En modo local el binario queda en IndexedDB para poder volver a descargarlo después.

## Backup

`Excel / Backup` permite JSON y un ZIP completo con datos + documentos archivados. El ZIP generado por BLUNNO usa almacenamiento sin compresión para permitir restauración en el navegador.

## Excel

La importación primero analiza y muestra filas válidas/errores; recién después de confirmar guarda los registros. Para horas, se reconocen números, `F` y `H`. No se crean empleados nuevos automáticamente.

## Auditoría

Las operaciones importantes registran responsable, fecha, hora, minuto, sector, sucursal, período, acción y antes/después. La auditoría es permanente.

## Pruebas

```bash
npm test
```

La suite valida sintaxis/estructura, importaciones, reglas de separación, responsables, proveedores, facturas, caja, personal, horas, cierres, PDF (incluye los tipos documentales principales) y el arranque de la aplicación mediante un smoke test DOM liviano.

## Firebase

`firebase.rules` deja una base de seguridad con autenticación, auditoría inmutable y protección para no cambiar `branchId`/`periodId` durante una edición. Para restringir acceso por sucursal por usuario se debe configurar la identidad/roles reales del proyecto Firebase; no se inventan permisos.


## V20
Esta versión prioriza Cierre, Horas, Personal e Inversiones. Para GitHub Pages, el `index.html` está en la raíz del proyecto. No mezcles archivos de versiones anteriores.


## V26 · Correcciones solicitadas por operación real
- Caja diaria: navegación semanal 0-based, robusta ante clics repetidos y sin render parcial.
- Facturas: selector de proveedores corregido para usar el maestro real y búsqueda por texto.
- Gastos: edición controlada sin error de período cerrado y PDF directo por categoría.
- Períodos: meses históricos ahora se pueden abrir en solo lectura; la modificación sigue requiriendo lápiz + responsable.
- Cierre: botón siempre funcional y modal pequeño con el motivo exacto de cada bloqueo, especialmente Horas / Liquidaciones.

## V26 · correcciones integrales (2026-10-06)
- Caja diaria: navegación de semanas centralizada, acotada a las semanas reales, con anti-doble-click y refresh diferido para evitar bloqueos.
- Gastos: edición explícita y PDF unitario por categoría, manteniendo el PDF general.
- Facturas: selector/búsqueda de proveedores conectado al maestro real.
- Cierre mensual: errores de horas/liquidaciones en modal pequeño con detalle por empleado y sector.
- Períodos: meses históricos visibles en solo lectura, lápiz de modificación con responsable y meses futuros iniciables por sucursal.
- Contexto por perfil: cada sucursal conserva su último período seleccionado sin mezclar estados.
- Se elimina la referencia conceptual a “Pagos” en el cuadro resumido de Caja, sin quitar el registro operativo de pagos.
