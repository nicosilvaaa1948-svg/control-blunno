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
