# BLUNNO V31 · Firebase conectado

Proyecto: `distribuidora-blunno`.

## Servicios
- Firebase Authentication: Email/Password
- Cloud Firestore
- Firebase Storage
- Firebase Analytics (no bloqueante)

## Perfiles V31
- `flo1@gmail.com`, `nico1@gmail.com`, `luz1@gmail.com`, `agus1@gmail.com`: acceso General total.
- `horas@gmail.com`: solo Personal y Horas mensuales; alta de empleados y carga/corrección manual de horas. Puede consultar liquidaciones, pero no totalizarlas ni modificarlas/eliminarlas.
- Cualquier otro correo autenticado queda sin acceso. No se requieren custom claims.

## Publicación
1. Crear las 5 cuentas en Firebase Authentication → Email/Password.
2. Publicar `firebase.rules` y `storage.rules` en el proyecto `distribuidora-blunno`.
3. Subir la carpeta web completa a GitHub Pages.
4. Después de cambiar reglas, cerrar sesión y volver a ingresar en BLUNNO.
5. No hace falta ejecutar `npm install firebase` para la versión publicada: `index.html` carga los módulos oficiales Firebase desde `gstatic.com`.
