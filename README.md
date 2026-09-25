# BLUNNO CONTROL EMPRESARIAL — WEB

Web interna profesional para Distribuidora Blunno. Esta entrega toma la versión enviada como base y mejora su presentación para navegador, sin convertirla en una aplicación instalable/PWA.

## Qué se mejoró

- Interfaz browser-first con navegación empresarial más clara.
- Menú agrupado por Principal, Operaciones, Personal, Control y Documentación.
- Tipografía y tamaños de lectura mejorados.
- Barra superior con contexto activo, sucursal, período, responsable y búsqueda global.
- Menú responsive para celular/tablet.
- Búsqueda global ampliada a proveedores, empleados, facturas, ingresos, gastos, inversiones, documentos, cierres y auditoría.
- Atajo `Ctrl + K` para búsqueda.
- Zona horaria explícita `America/Argentina/Buenos_Aires`.
- Importes en formato argentino con dos decimales.
- Motor PDF aislado en `pdf/pdf-engine.js`.
- Corrección de la verificación que impedía generar PDFs cuando `jsPDF` no estaba presente.
- Tests automatizados sin dependencias externas.

## Uso web local

Podés servir la carpeta con cualquier servidor HTTP estático. Por ejemplo:

```bash
python3 -m http.server 4173
```

Luego abrir:

`http://localhost:4173/`

No abrir `index.html` directamente con `file://`, porque los módulos ES necesitan contexto HTTP.

## Pruebas

```bash
npm test
```

Las pruebas cubren sintaxis/estructura, importaciones locales, reglas críticas de sucursal/período, Caja independiente del resultado, proveedores, facturas, personal, horas, feriados, cierres versionados y motor PDF A4.

## Firebase

No hay credenciales ficticias. `config.js` mantiene Firebase vacío hasta conectar un proyecto real.

Cuando se configure:

- Firestore: datos estructurados.
- Storage: PDFs, Excel y documentos.
- Authentication: identidad de usuario si se habilita.
- Functions: automatizaciones y tareas de servidor.

## Despliegue

La carpeta está preparada para hosting estático como Netlify o GitHub Pages mediante rutas relativas y `_redirects`.

## Datos iniciales

La base enviada conserva el catálogo maestro existente de proveedores y empleados presentes en la versión recibida, pero no agrega movimientos económicos de demostración.
