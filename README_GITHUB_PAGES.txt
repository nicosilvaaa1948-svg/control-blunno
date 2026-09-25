BLUNNO CONTROL EMPRESARIAL — PUBLICACIÓN EN GITHUB PAGES

Esta versión usa app.js como entrada estática del navegador.
No usa import() dinámico para iniciar la web, por lo que evita el error:
"Failed to fetch dynamically imported module: .../web.js"

IMPORTANTE
1. Subir TODO el contenido de esta carpeta al repositorio de GitHub Pages.
2. index.html debe quedar en la raíz publicada del repositorio.
3. app.js debe quedar al lado de index.html.
4. config.js, store.js, views.js, firebase.js, web.js y pdf/ se conservan como fuentes de mantenimiento.
5. GitHub Pages no necesita npm para ejecutar la web.
6. Abrir primero la URL publicada y, si se desea comprobar el archivo, abrir directamente:
   https://TU-USUARIO.github.io/TU-REPOSITORIO/app.js
   Debe mostrar JavaScript, no una página 404.

La aplicación queda en Modo local hasta que se configuren las credenciales de Firebase.
