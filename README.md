# BLUNNO CONTROL EMPRESARIAL — MASTER

Esta versión reorganiza el sistema alrededor de un período mensual activo (`YYYY-MM`). Cada mes conserva su propio estado; cambiar de mes recupera sus datos sin mezclar períodos.

## Módulos
- Caja diaria: una planilla por mes, navegación por semanas, ingresos arriba, gastos abajo y totales automáticos.
- Proveedores: alta únicamente con nombre; las cargas/facturas se registran por sucursal, fecha, monto y número opcional. Importes iguales nunca se consideran duplicados.
- Gastos de local: categorías alineadas con el Excel mostrado.
- Horas Bodereau: planilla mensual estilo Excel, calendario automático, semanas, feriados, adelantos y mercadería.
- Liquidaciones: valor hora normal y feriado al totalizar, responsable obligatorio, resumen y deuda negativa trasladable al mes siguiente.
- Comparativas: dos meses con porcentajes y evolución de seis meses con gráficos.
- Historial: auditoría con responsable, fecha/hora y antes/después.
- Papelera: baja lógica, restauración y vencimiento a 30 días. En Firebase se guarda `trashExpiresAt` para configurar TTL.
- Excel: importación XLSX y actualización por clave de origen para no duplicar por importe.

## Importante sobre Firebase y la papelera de 30 días
El cliente marca cada baja con `trashExpiresAt`. Para eliminación automática real incluso sin abrir la web, en Firebase Console hay que activar Firestore TTL sobre el campo `trashExpiresAt` para las colecciones que usan papelera. La limpieza local también se ejecuta al abrir/sincronizar.

## Firebase
Completar `config.js` con la configuración del proyecto, activar Authentication > Email/Password y Firestore, y publicar `firebase.rules`.

## Excel
Un navegador no puede vigilar silenciosamente un XLSX local de Windows. Para sincronización automática sin volver a seleccionar el archivo hace falta Drive/OneDrive o un agente local. La importación manual sí está implementada.
