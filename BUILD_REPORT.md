# BLUNNO V28.0.8 — Firebase

## Integración
- Firebase Web App conectado a `control-blunno`.
- Auth anónima invisible.
- Firestore central.
- Reglas publicables: `request.auth != null`.
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
Las pruebas automáticas se ejecutan en modo local para no modificar la base real. La integración usa el proyecto/configuración proporcionados y queda lista para la prueba de conexión en GitHub Pages después de publicar las reglas y autorizar el dominio.
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
