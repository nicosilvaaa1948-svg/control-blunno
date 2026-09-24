# BLUNNO CONTROL EMPRESARIAL — EDICIÓN PROFESIONAL

Sistema web para Distribuidora Blunno con control por período, sucursal/perfil, responsables, auditoría, papelera, cierres versionados, proveedores, facturas, gastos, inversiones, personal, horas, resultados, comparativas, recordatorios, Agente BLUNNO, archivos y Excel.

## Qué queda incorporado
- Perfiles Mendiolaza, Bodereau, Derqui, Unquillo y General.
- General es vista consolidada; los registros siguen guardando su sucursal.
- Responsable obligatorio en altas, ediciones, bajas, restauraciones, cierres, importaciones y liquidaciones.
- Auditoría antes/después con fecha y hora/minuto.
- Papelera con recuperación y auditoría.
- Proveedores permanentes y autocomplete mediante datalist.
- Facturas independientes: repetir importe nunca se considera duplicado.
- Fecha del movimiento separada de fecha de carga para facturas tardías.
- Gastos del local por categorías tomadas de la estructura de las planillas reales.
- Gastos de inversión separados de gastos operativos.
- Personal por sucursal.
- Planilla mensual de horas con ingreso directo por celda, Enter y fechas reales.
- Adelantos, mercadería, feriados y liquidación por empleado.
- Resultado mensual y comparativas con porcentajes.
- Recordatorios internos, prioridades y registro de completado.
- Agente BLUNNO con voz del navegador cuando está disponible; consulta y prepara acciones, pero exige confirmación antes de modificar.
- Cierre manual, checklist, versiones y PDF.
- Archivos indexados por período/sucursal/sector; Firebase Storage permite conservar físicamente los documentos en nube.
- Importación de planificación Excel por hoja/empleado y clave de origen para evitar duplicados.
- Backup JSON y exportación Excel.

## Firebase
Completá `config.js` con las credenciales del proyecto. Activá Authentication (Email/Password), Firestore y Storage. Publicá las reglas correspondientes.

Sin Firebase, el sistema funciona en modo local en el navegador. Esto sirve para pruebas, pero no reemplaza la nube: para que los datos y archivos sobrevivan a la pérdida de la PC, hay que configurar Firebase.

## Excel
El navegador no puede observar silenciosamente un archivo local de Windows después de que se modifica. Esta versión permite volver a seleccionar el Excel y sincronizar por una clave de origen. Para sincronización automática permanente, el archivo debe vivir en Drive/OneDrive con una integración de archivos o un pequeño agente de escritorio.

## Publicación
Se puede subir como sitio estático a Netlify, GitHub Pages o un hosting equivalente. No requiere build.
