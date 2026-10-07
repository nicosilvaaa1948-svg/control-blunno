# BLUNNO CONTROL EMPRESARIAL — V28.0.8

BLUNNO mantiene la misma interfaz y navegación de la V28.0.6 y agrega Firestore como base central compartida.

## Firebase
- Proyecto: `control-blunno`.
- Firestore: base `(default)` en `southamerica-east1`.
- Auth anónima invisible: no correo, no contraseña y no login visible.
- Todos los clientes tienen el mismo acceso completo porque BLUNNO es una herramienta interna de 4 personas.
- Sincronización inicial y tiempo real mediante listeners.
- Cola local de reintento si una escritura falla temporalmente.
- Los datos de negocio y auditoría se centralizan.

## PDF / Excel / archivos
PDF, impresión y Excel permanecen locales por computadora. No se utiliza Cloud Storage para binarios. La generación del PDF puede volver a hacerse desde los datos centrales y la acción queda auditada.

## Proveedores y datos iniciales
El maestro de proveedores permanece completo. Los movimientos de negocio pueden comenzar en cero.

## Publicación
Subí estos archivos a la raíz de GitHub Pages. En Firebase Authentication > Settings > Authorized domains debe estar autorizado `nicosilvaa1948-svg.github.io`.

## Antes de publicar
Publicá en Firestore Rules el archivo `firebase.rules` incluido y agregá `nicosilvaa1948-svg.github.io` en Authentication > Settings > Authorized domains.
