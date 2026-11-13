# Piezas de equipo (personajes de cada casa)

Rostros, cabellos, trajes, lentes, marcas y objetos en la mano de los personajes de cada equipo o casa (Harry Potter, Iron Man, Capitán América…). Solo los ve en el editor quien es de ese equipo, y se desbloquean por nivel.

El repo y la página son públicos. Las piezas con marcas de terceros se aceptan mientras la app sea de uso privado (sin vender ni publicar en tiendas).

## Cómo agregar una pieza

1. Genera la imagen en la herramienta de LEGO y expórtala como **PNG con fondo transparente**. Lo ideal: de frente, sin sombra, una sola pieza por imagen.
2. Corre:

   ```
   python tools/preparar_pieza.py <imagen.png> <tipo> <id>
   ```

   - `tipo`: `rostro`, `facial` (lentes, barba, marcas como el rayo), `cabello` (también cascos y sombreros), `torso` (traje, armadura), `piernas` o `mano` (varita, escudo).
   - `id`: minúsculas y guiones, con el equipo al inicio. Ej.: `gryffindor-rostro-harry`, `avengers-torso-ironman`, `avengers-mano-escudo`.

   Si la imagen ya mide 400×520 (el lienzo de las piezas) se usa tal cual. Si no, se recorta y se acomoda sola en la zona de ese tipo. Guarda `public/piezas/<id>.webp` y la miniatura `<id>_m.webp`.
3. Pega la línea que imprime en `src/content/piezas-equipo.json` y ajusta los campos:

   ```json
   { "id": "gryffindor-facial-rayo", "nombre": "Lentes y rayo", "paso": "facial", "equipo": "gryffindor", "nivel": 3, "personaje": "Harry Potter" }
   ```

   - `equipo`: el `id` del equipo en `src/content/equipos.ts`.
   - `nivel`: desde qué nivel se puede usar. Con 5 o más la tarjeta sale épica; con 8 o más, legendaria.
   - `personaje`: opcional, se muestra en la tarjeta.
4. Revisa en el editor (Casillero → Armar) que quede bien puesta. Si se ve corrida, edítala a 400×520 sobre una pieza existente como guía y vuelve a correr el paso 2.

## Dónde aparecen

- Rostro, facial, cabello, torso y piernas: en el editor, en su paso, con una estrella dorada. Con candado y el nivel si aún no llega.
- Mano: en Casillero → Equipo, arriba de las recompensas de equipo, con «Ponérmelo».
- El personaje al azar nunca usa piezas de equipo.

## Zonas del lienzo (400×520)

| Tipo | Zona (izq, arriba, der, abajo) |
|---|---|
| rostro | 173, 156, 228, 201 |
| facial | 156, 152, 244, 205 |
| cabello | 133, 87, 265, 194 |
| torso | 92, 208, 308, 341 |
| piernas | 126, 341, 274, 489 |
| mano | 261, 304, 318, 379 |

La pieza se centra a lo ancho y se pega abajo de su zona. Necesita Pillow (`pip install pillow`).
