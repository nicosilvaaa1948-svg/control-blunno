# BLUNNO CONTROL EMPRESARIAL — V17 ESTABLE WEB

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
