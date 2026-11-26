# Motor del sistema de personajes nuevo (zona aparte)

Fase 2 (2026-11-25): cargador de GLB con esqueleto y controlador de animación, probados en una página aparte. La app
todavía no usa nada de aquí; la conexión a `tools/minifig/escena.js` (HUB, lobby, TV, nave, fotos) es un paso aparte.

| Archivo | Qué hace |
|---|---|
| `logicas.js` | Traduce momentos, gestos y vida de siempre (`espera`, `punto`, `saludar`, `lib:gesture_wave`…) a las 6 lógicas: reposo, entrada, saludo, victoria, derrota, especial. Lo prueba `src/personajes/nucleo.test.ts` |
| `motor-personajes.js` | `MotorPersonajes.crear(plano)`: baja el GLB una vez por URL, lo clona por figura (`SkeletonUtils`), corrige colores y material según `plano.carga`, escala, pone los pies en el piso y anima con `AnimationMixer`. `tocar(cual)` mezcla 0.35 s; lo que no es reposo se toca una vez y vuelve solo a reposo |
| `escena.html` + `escena-personajes.js` | Escena de prueba que recibe planos por mensaje (como `escena.html` de minifig) y acomoda las figuras por su ancho |
| `prueba.html` | Página de prueba: lee `/indice.json` del servidor privado, valida cada ficha con `src/personajes/ficha.ts`, arma el plano con `plano.ts` y lo manda a la escena; botones de las 6 lógicas y de los mensajes de siempre; medición |

| `galeria.html` | «Mi personaje» → galería (`src/personajes/Galeria.tsx`) o constructor básico (`Constructor.tsx`) con los personajes del servidor privado. `?vista=galeria|crear` entra directo; `?yo=<jugador>` cambia la colección y los favoritos de prueba |

`motor-personajes.js` también arma figuras por piezas: con `plano.piezas` esconde las mallas del base en esas ranuras
(`extras.slot`) y pega las de otro GLB a los huesos del base por nombre; los tintes reemplazan el color (piezas lisas).

La escena acepta `?fondo=no` (transparente, solo sombra en el piso) y se gira arrastrando o con `{tipo:"girar", cuanto}`.

Cómo probar (Three.js r128 desde CDN, como el resto de ALV):
1. Servidor privado `personajes-privados` (4193) en `.claude/launch.json` de juegos-fiesta: sirve
   `personajes-privado\` y arma el índice con `catalogo\` (producción) y `pruebas-motor\` (fichas de prueba).
2. Servidor `personajes-motor` (4194): Vite de `app` sin nube.
3. Abrir `http://localhost:4194/tools/personajes/prueba.html` o `…/galeria.html` (con `?fuente=<url>` para otro servidor).

Nada privado vive aquí: los GLB llegan del servidor privado. No se importa nada de Minifig Studio ni de `tools/minifig/`.
