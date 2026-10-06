# BLUNNO V30 · Firebase conectado

Proyecto: `distribuidora-blunno`.

## Servicios
- Firebase Authentication: Email/Password
- Cloud Firestore
- Firebase Storage
- Firebase Analytics (no bloqueante)

## Publicación
1. Subir el contenido de esta carpeta a tu repositorio/web de GitHub Pages.
2. En Firebase Authentication deben existir los usuarios que usarán la aplicación.
3. El usuario debe tener los claims utilizados por las reglas actuales: `role: admin|general` o `branchId` / `branchIds` para su sucursal.
4. No hace falta ejecutar `npm install firebase` para la versión publicada: `index.html` carga los módulos oficiales Firebase 12.3.0 desde `gstatic.com`. El paquete declara igualmente `firebase` como dependencia para desarrollo local.
5. Si vas a publicar las reglas incluidas, usá Firebase CLI con el proyecto `distribuidora-blunno`; revisá primero que coincidan con las reglas que ya tenés en producción.
