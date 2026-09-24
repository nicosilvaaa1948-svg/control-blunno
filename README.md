# BLUNNO CONTROL EMPRESARIAL — paquete completo

Sistema web de control para Distribuidora Blunno.

## Incluye
- Perfil/sucursal: Mendiolaza, Bodereau, Derqui, Unquillo y General.
- Caja diaria.
- Proveedores con maestro precargado y autocompletado.
- Facturas independientes: dos facturas con el mismo monto NO se consideran duplicadas.
- Gastos por categoría.
- Gastos de inversión con cuenta independiente por perfil/sucursal y vista General.
- Personal por sucursal.
- Horas mensuales + importación/sincronización desde Excel.
- Adelantos, vales y mercadería en registros de horas.
- Resultados económicos y comparativas.
- Recordatorios y tareas con cartel visible y X que cierra sin borrar.
- Agente BLUNNO por texto y dictado del navegador.
- El agente prepara acciones y SIEMPRE pide confirmación antes de modificar datos.
- Cierre mensual manual, con versión, responsable, fecha/hora y resumen imprimible.
- Movimientos tardíos para facturas recibidas después del cierre.
- Historial/auditoría con responsable, fecha/hora y antes/después.
- Papelera lógica mediante baja recuperable.
- Archivos/documentos registrados por período, sucursal y sector.
- Backup JSON completo.

## Cómo cargar
1. Subí todos los archivos de esta carpeta al mismo hosting/repo.
2. Abrí `index.html` desde el sitio publicado.
3. Los datos funcionan localmente de inmediato.
4. Para sincronización central entre computadoras/celulares, completá las credenciales de Firebase en `config.js` y publicá nuevamente.

## Excel
El sector **Excel / Backup** permite seleccionar un XLSX/XLS/CSV y sincronizar hojas. Las horas sincronizadas quedan marcadas con su archivo de origen y auditadas.

## Importante sobre almacenamiento central
El paquete viene operativo en modo local porque no se inventaron credenciales de Firebase. Para que todos los equipos vean exactamente la misma base y para conservar archivos en la nube, hay que conectar el proyecto Firebase real en `config.js` y configurar Firestore/Storage.
