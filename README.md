# BLUNNO CONTROL EMPRESARIAL — COMPLETO

## Incluye
- Dashboard general por período.
- Caja diaria con ingresos, egresos, esperado, diferencia y saldo siguiente.
- Proveedores permanentes.
- Facturas y pagos: importes repetidos NO son duplicados.
- Personal y valor hora individual.
- Horas exclusivamente de Bodereau.
- Importación/sincronización de Excel de planificación con horas por fecha, feriado, mercadería y adelantos/vales.
- Liquidación estimada por horas y valor hora.
- Cálculo visible de deuda cuando descuentos/vales/mercadería superan el sueldo generado.
- Comparativa mensual.
- Auditoría con antes/después, responsable, sector, fecha y hora.
- Baja lógica y recuperación.
- Backup JSON e impresión.
- Firebase opcional; sin configuración funciona en modo local.

## Excel
La planificación real analizada usa hojas por empleado y bloques de 7 días, con columnas para días, HORAS SEMANALES, ADELANTOS DINERO, MERCADERIA y FERIADO. El importador reconoce esos bloques.

La web puede sincronizar cambios mediante una nueva selección del Excel. El navegador no puede vigilar silenciosamente un archivo local de Windows cuando el archivo cambia sin intervención del usuario. Para sincronización 100% automática habrá que conectar el archivo a Google Drive/OneDrive o instalar un pequeño agente de escritorio.

## Firebase
1. Completá `config.js` con el objeto de Firebase.
2. Activá Authentication > Email/Password.
3. Creá Firestore.
4. Publicá `firebase.rules`.
5. Subí todos los archivos a GitHub Pages, Netlify o tu hosting.

## Regla de responsable
Toda alta, edición, baja, recuperación, cierre e importación requiere nombre de responsable. El sistema guarda ese nombre en auditoría.

## Meses
Cada período usa `YYYY-MM`. Los cierres quedan congelados y el siguiente período se crea separado. Maestros como proveedores y empleados permanecen entre períodos.
