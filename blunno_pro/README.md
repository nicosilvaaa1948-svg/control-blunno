# BLUNNO CONTROL EMPRESARIAL — PRO FINAL

Sistema de control interno para Distribuidora Blunno.

## Esta versión consolida
- Sucursales Mendiolaza, Bodereau, Derqui, Unquillo y vista General.
- Caja diaria en planilla mensual con saldo inicial, ingresos, gastos, resto y saldo que pasa al día siguiente.
- Carga rápida de facturas tipo cuadro y maestro permanente de proveedores.
- Gastos por categoría e inversiones separadas.
- Personal por sucursal y planilla mensual de horas tipo Excel.
- Adelantos, vales, mercadería, feriados y liquidaciones.
- Resultados, comparativas y PDFs.
- Recordatorios y Agente BLUNNO con confirmación obligatoria para modificar datos.
- Auditoría antes/después.
- Cierre mensual manual con control previo, versión, PDF, archivo y actualización por movimientos tardíos.
- Papelera con selección múltiple, restauración, eliminación definitiva y purga a los 30 días.
- Archivos generados organizados por período, sucursal y sector.
- Excel / backup.
- Navegación con flecha de regreso y modales cerrables.

## Acceso
No se incorporó un módulo de Administración ni un usuario/contraseña inventados, porque el sistema solicitado trabaja con responsables operativos: Agus, Nico, Luz y Flor.

## Firebase
El proyecto puede funcionar localmente sin credenciales. Para nube, autenticación y Storage hay que completar `config.js` con las credenciales reales del proyecto Firebase.

## Papelera en nube
`functions/index.js` contiene la tarea programada `purgeBlunnoTrash`, que elimina definitivamente registros con más de 30 días y también archivos de Storage cuando corresponde. Debe desplegarse en Firebase Functions para que la purga ocurra aun cuando nadie tenga la web abierta.

## Verificación
Todos los archivos JavaScript incluidos en esta entrega pasan `node --check`.
