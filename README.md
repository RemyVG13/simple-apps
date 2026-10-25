# Apps simples

Este directorio es una colección de aplicaciones pequeñas para el día a día. Cada una vive en su propia carpeta `apps/<nombre>/`: es un sitio estático, se abre sola y se puede instalar en el celular.

El sitio completo se publica gratis con GitHub Pages.

## Apps

- [Inglés](apps/ingles/): se ve una imagen, un botón reproduce la palabra en inglés y otro pasa a la siguiente.

## Agregar una app

1. Crea `apps/<nombre>/` con su propio `index.html`, manifiesto y service worker.
2. Añade un enlace en el `index.html` de la raíz.
3. Haz push a `main`. El workflow publica el sitio.

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub y sube esta carpeta a la rama `main`.
2. En el repositorio abre Settings, Pages, Build and deployment, y elige Source: GitHub Actions.
3. Cada push a `main` publica el sitio. Inglés queda en `https://USUARIO.github.io/NOMBRE-REPO/apps/ingles/`.

También puedes lanzar el workflow a mano desde la pestaña Actions.

GitHub Pages sirve `sw.js` como JavaScript, que es lo que el navegador pide para instalar la app. En este Windows, `py -3 -m http.server` a veces lo entrega como texto plano y entonces el service worker no se instala; la pantalla y los botones sí funcionan.

## Agregar una tarjeta a Inglés

El nombre del archivo, sin `.jpg`, es la palabra que se escucha. `apple.jpg` dice “apple” y guarda `audio/apple.mp3`.

1. Copia la imagen en `apps/ingles/images/`.
2. Genera la lista y el audio:

```bash
py -3 -m pip install edge-tts
py -3 apps/ingles/scripts/generate_audio.py
```

El script usa la voz neural `en-US-JennyNeural`, un poco más lenta, y guarda el mp3 en `apps/ingles/audio/`. `apple` produce `audio/apple.mp3`. `ice cream` produce `audio/ice-cream.mp3`. Si ese archivo ya existe, lo deja igual.

3. Haz commit y push. Al recargar aparece la tarjeta nueva. La imagen y el mp3 quedan guardados en el teléfono después de abrirlos una vez con conexión.

Si reemplazas una imagen o un audio y conservas el mismo nombre de archivo, un celular que ya la haya guardado puede seguir mostrando la versión anterior. Usa un nombre de archivo nuevo.
