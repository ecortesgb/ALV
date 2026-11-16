# ALV: diagnóstico de diseño (etapa 1)

Fecha: 16 nov 2026. Corresponde a la etapa 1 de `ALV_DISENO_NEON.md`. Solo diagnóstico: no se cambió código de diseño. Medido en la app real con una cuenta de invitado, en 375 × 812, 768 × 1024, 1280 × 720 y 1920 × 1080. Los desbordes y tamaños se midieron con JS porque el navegador de vista previa recorta las capturas.

**Lo que frena la sensación de videojuego, en una frase:** la estructura y los componentes ya son los aprobados, pero casi ninguna pantalla tiene arte propio, la sala y el catálogo se leen como formularios apilados y la letra no sigue una escala.

## 1. Archivos de estilos

| Archivo | Peso | Origen | Se edita |
|---|---|---|---|
| `src/ds/tokens.css` | 2.5 KB | Generado por `tools/copiar-ds.mjs` | No |
| `src/ds/componentes.css` | 23.5 KB | Generado | No |
| `src/ds/extra.css` | 2.5 KB | A mano: estados que la fuente no traía | Sí |
| `src/pantallas/alv.css` | 23.3 KB | A mano: composición de todas las pantallas | Sí |

Problemas:
- `alv.css` ya pesa lo mismo que el Design System y mezcla tres cosas: reglas generales, cada pantalla y la TV. Conviene partirlo en la etapa 2 (`theme-game.css` para estados y rarezas, y un archivo por zona).
- `alv.css` corrige al Design System en 14 reglas (`.D.alv .d-btn…`, tamaños de `.dsp`, relleno de `.d-pnl`). Son parches sobre archivos generados; deberían volverse variantes declaradas.
- Hay 4 colores escritos fuera de tokens en `alv.css` (el editor y la etiqueta «Prueba», que viven fuera de la clase `.D`) y 29 estilos en línea en los componentes de pantalla.
- Los tokens de letra están en píxeles fijos (`--cuerpo-chico` 13 px, `--chip` 11 px). En 1920 el resto crece y estos no: quedan textos de 11 y 13 px en una pantalla que se ve de lejos.
- `public/piezas` (1.5 MB del personaje 2D) ya no se usa y sigue publicándose.

## 2. Componentes

| Componente | Usos | Estado |
|---|---|---|
| `Boton` | 49 | Se usa para todo: acción principal, secundaria, peligro y navegación. Falta jerarquía: no hay secundario ni terciario, por eso hay 20 enlaces subrayados (`a-plano`) |
| `Panel` | 26 | Toda caja es el mismo panel azul. No hay panel destacado ni translúcido |
| `Chip` | 25 | Sirve de dato, de filtro y de interruptor. Tres papeles con una sola apariencia |
| `Etiqueta` | 13 | Bien |
| `Onomatopeya` | 7 | Solo «ALV», «¡SHHH!», «PAUSA» y dos de resultado. Poco para ser el sello del estilo |
| `TarjetaJuego` | 5 | Sin ilustración: solo rayos de color. Es la falta más visible |
| `Reloj`, `Cartel`, `TarjetaJugador` | 5, 4, 4 | Bien |
| `Escaner`, `RuedaSospechosos`, `BarraAnfitrion`, `Pestanas` | 3, 2, 2, 2 | Bien |

Repetidos fuera del Design System, candidatos a componente: fila de lista (`a-gente`, `a-tabla`, `a-marcador`, `a-tv-marcador` son la misma fila cuatro veces), botón cuadrado (`a-atras` hace de regreso y de más/menos), tarjeta de persona (`a-persona` y `a-capsula`), diálogo (confirmación y XP por reto) y estado vacío.

Faltan y los pide el plan: marcos de rareza, botón secundario y terciario, estados de éxito, error, advertencia e información, contador de XP animado, confeti, apertura de sobre.

## 3. Mediciones por pantalla

«Alto» es cuántas pantallas mide el contenido. «Tamaños» son los tamaños de letra distintos que conviven. La meta es 3 principales por pantalla y nada menor a 12 px.

| Pantalla | 375: alto · fuera · tamaños · menor a 12 px | 768 | 1280 | 1920 |
|---|---|---|---|---|
| Hub | 1.0 · 0 · 7 · 1 | 1.0 · 0 · 7 · 1 | 1.0 · 0 · 8 · 2 | 1.0 · 0 · 8 · 0 |
| Jugar | 1.2 · 0 · 4 · 0 | 1.0 · 0 · 4 · 0 | 1.0 · 0 · 4 · 0 | 1.0 · 0 · 4 · 0 |
| Catálogo | 1.8 · 0 · 5 · 28 | 1.4 · 0 · 5 · 28 | 2.0 · 0 · 5 · 28 | 1.7 · 0 · 5 · 0 |
| Ficha de juego | 1.0 · 0 · 4 · 0 | igual | igual | 1.0 · 0 · 5 · 0 |
| Personalizar | 1.2 · 0 · 5 · 3 | 1.0 · 0 · 5 · 3 | igual | 1.0 · 0 · 7 · 3 |
| Ranking | 1.0 · 0 · 4 · 2 | igual | igual | 1.0 · 0 · 5 · 2 |
| Logros | 1.0 · 0 · 2 · 0 | igual | igual | 1.0 · 0 · 3 · 0 |
| Perfil | 1.0 · 0 · 7 · 4 | igual | igual | 1.0 · 0 · 10 · 3 |
| Ajustes | 1.0 · 0 · 3 · 0 | igual | igual | 1.0 · 0 · 4 · 0 |
| Sala (anfitrión, con resultados) | **3.5 · 42 · 11 · 43** | 2.8 · 0 · 11 · 43 | 3.1 · 0 · 11 · 43 | 2.4 · 0 · 14 · 10 |

Ningún botón mide menos de 40 px. El único desborde real está en la sala a 375 px.

## 4. Inconsistencias por pantalla

| Pantalla | Qué se ve mal | Tamaños afectados |
|---|---|---|
| Carga y acceso | Solo logo y formulario. No hay personajes ni escena: la primera impresión es de formulario | Todos |
| Hub | Con una sola figura la cámara acerca tanto que la recorta por arriba y por abajo. La palabra «ALV» compite con la tarjeta del jugador. La etiqueta de XP para gastar no dice de qué moneda es | 1280, 1920 |
| Hub | El menú son 5 botones iguales salvo Jugar; Ranking y Logros pesan lo mismo que Personalizar. En celular quedan en cuadrícula de 2 y Jugar no domina tanto como en la maqueta | 375, 768 |
| Jugar | Dos paneles de texto con botones. No se distingue de Ajustes | Todos |
| Catálogo | Las tarjetas no tienen ilustración. Los datos (jugadores, minutos) miden 10 px. En pantalla ancha las filas ocupan media pantalla y la otra mitad queda vacía | Todos; el hueco en 1280 y 1920 |
| Ficha de juego | Un panel con texto. No hay arte ni botón que lleve a jugar ese juego en concreto | Todos |
| Sala (espera) | El anfitrión tiene que deslizar 3 pantallas: resultados, gente, cápsulas, catálogo completo, nivel, rondas y hasta abajo «Iniciar». En 375 se desbordan 42 elementos de las tiras del catálogo dentro del panel | 375 crítico; todos |
| Sala (espera) | Las figuras 3D quedan en una caja de 220 px y la lista de nombres repite lo que ya se ve. No hay placas de nombre, corona del anfitrión ni QR en el celular | Todos |
| Partida en celular | Funciona, pero cada mecánica es el mismo panel con botones. No hay identidad por juego (color de su fila, ilustración, onomatopeya al contestar) | Todos |
| Resultados | El podio son tres cajas. No hay celebración, ni conteo de XP ganada, ni figuras festejando | Todos |
| TV | Es la mejor resuelta (rueda de sospechosos, QR, marcador). Faltan escenas propias para las otras 10 mecánicas: hoy es una tarjeta de texto. Los controles de respaldo quedan sobre el título | 1280, 1920 |
| Personalizar | La vitrina funciona. El editor abre Minifig Studio con su propia apariencia, distinta al resto | Todos |
| Ranking, logros, perfil | Listas correctas pero planas. El perfil llega a 10 tamaños de letra en 1920 | Todos |
| Ajustes y administración | Aceptables: son pantallas de trámite | — |

Generales:
- **Escala de letra:** el sistema define escala 1.25, pero conviven hasta 14 tamaños porque los componentes generados usan `em` y los tokens usan píxeles. Hay que fijar una sola escala.
- **Movimiento:** casi todo aparece sin transición entre pantallas. Solo entran con animación los paneles de resultado. No hay respuesta al sumar puntos ni al recibir un voto.
- **Sonido:** existe `src/app/sonido.ts` y solo suena en clics y al terminar.
- **Tablet (768):** usa la composición de celular estirada. No tiene composición propia.

## 5. La figura 3D

| Dato | Medición |
|---|---|
| Cómo se dibuja | Un `iframe` por escena (`public/minifig/escena.html`), con mensajes. Las fotos chicas salen de un iframe oculto y se guardan (12 fotos) |
| Tiempo hasta verse en el hub (laptop, ya en caché) | 0.2 s |
| Peso de `public/minifig` | 1.8 MB |
| Escenas a la vez | 1 por pantalla (hub, personalizar, sala). En la TV, 1 escena o fotos |

Limitaciones:
- No se midió en un celular real ni con la red lenta: **no verificado**. Es la medición que falta antes de decidir cuánto 3D lleva el celular.
- El encuadre es automático: con una figura la acerca de más (hub) y con muchas las corta en pantallas angostas (sala a 375).
- La app no controla poses salvo cuatro momentos (punto, victoria, derrota, espera). No hay pose de festejo en el podio ni reacción al votar.
- Cada foto nueva pasa por el iframe oculto; una sala de 8 con figuras nuevas genera 8 fotos seguidas.
- El fondo del iframe es transparente, pero la luz y la sombra son propias: la figura no recibe la luz de la escena (reflector, luna).

## 6. Prioridades

1. **Sala del anfitrión.** Es la pantalla más usada y la peor medida. Separar «quién está» de «qué jugamos», dejar «Iniciar» siempre a la vista y quitar el desborde a 375.
2. **Arte de las tarjetas de juego.** Sin ilustración, catálogo, ficha y sala se ven a medias. Hay que decidir de dónde sale el arte (pregunta abajo).
3. **Escala de letra única** y nada menor a 12 px. Arregla de golpe hub, perfil, catálogo y TV.
4. **Jerarquía de botones y paneles** (principal, secundario, terciario, panel destacado). Es la base de la etapa 2.
5. **Encuadre de la figura** en hub y sala, y prueba de rendimiento en un celular real.
6. **Momentos de recompensa:** revelar, sumar puntos, podio y XP ganada, con movimiento y sonido.
7. **Identidad por juego** en celular y escenas de TV para las mecánicas que hoy son solo texto.
8. **Entrada (carga y acceso)** con escena y personajes.
9. Partir `alv.css`, quitar `public/piezas` y los colores fuera de tokens.

## 7. Preguntas para Elías antes de la etapa 2

1. **Arte de los juegos:** ¿se arma con las figuras 3D en pose (fotos sacadas del editor, sin costo y coherentes) o prefieres ilustraciones hechas aparte? Recomiendo las fotos 3D: ya existen y mantienen un solo estilo.
2. **Tono «especial» de rareza:** el plan deja ese color por definir. Recomiendo el azul del sistema (`--azul`), entre el gris de común y el morado de épico.
3. **Tablet:** ¿la tratas como celular grande o como pantalla ancha? Recomiendo pantalla ancha desde 768 en horizontal y celular en vertical.
