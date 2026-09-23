# BLUNNO CONTROL EMPRESARIAL — versión definitiva de desarrollo

## Qué incluye

- Dashboard de Distribuidora Blunno.
- Caja diaria.
- Proveedores permanentes.
- Facturas por período.
- Personal con baja lógica y recuperación.
- Horas únicamente para Bodereau.
- Resultados y comparación mensual.
- Historial de altas, ediciones, bajas, recuperaciones y cierres.
- Importador inicial de Excel con lectura de hojas, columnas y vista previa.
- Backup JSON.
- Diseño responsive inspirado en la identidad visual de Blunno.
- Firebase opcional: si la configuración está vacía, trabaja en modo local; al completar `config.js`, utiliza Firebase/Firestore.

## Estructura

Todos los archivos están en la raíz para que GitHub Pages sea fácil de subir:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `firebase.js`
- `store.js`
- `views.js`
- `firebase.rules`
- `logo.jpeg`
- `distri.jpeg`

## Conectar Firebase

1. Crear el proyecto nuevo de Blunno en Firebase.
2. Registrar una aplicación Web.
3. Copiar el objeto `firebaseConfig`.
4. Pegar sus valores en `config.js`.
5. Activar Authentication > Email/Password.
6. Crear tu usuario administrador.
7. Crear Firestore.
8. Publicar las reglas de `firebase.rules` desde Firebase.
9. Volver a subir `config.js` a GitHub.
10. Recargar la web con Ctrl+F5.

## Importación de Excel

La web primero lee el archivo y muestra hojas, columnas y filas. No pisa datos automáticamente. La importación definitiva debe hacerse con un mapeo específico de tus Excel reales para evitar errores de fechas, importes, sucursales y duplicados.

## Regla de datos

Un importe repetido NO es un duplicado. El control de duplicados debe utilizar identificadores de documento, por ejemplo proveedor + número de factura + período, cuando esos campos estén disponibles.

## Meses

Los períodos son `YYYY-MM`. Al cerrar un mes, sus movimientos quedan históricos. El siguiente mes comienza separado. Proveedores, empleados y sucursales son maestros permanentes.
