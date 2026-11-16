# ALV: plan de diseño visual (Neon Party) para Fable

Fecha: 16 nov 2026. Entrada: el documento de transformación visual que Elías entregó hoy (3 partes) y las 4 maquetas de referencia (inicio, modos de juego, lobby, tienda).

Este archivo convierte esas instrucciones en un plan que cabe en la app real. No cambia el Maestro por sí solo: lo que sea decisión de producto está marcado y se pregunta a Elías antes de tocarlo.

## 1. Lo que ya está decidido y no se cambia por esto

- **Dirección aprobada:** «Cine Cómic Nocturno» (Maestro v1.15 §8.7, Design System aprobado en v1.16). Ya vive en `src/ds/`. La propuesta «Neon Party Universe» es nueva y **no está aprobada**.
- **Fuentes aprobadas:** Bangers, Barlow y Barlow Condensed (`src/ds/componentes.css`). Las instrucciones piden Outfit, Fredoka e Inter. Ver decisión D2.
- **Personajes:** figura 3D de Minifig Studio aprobada (§9.3). Ver decisión D5.
- **Flujos, sala, QR, motor, puntuación, XP, inventario, economía, base, RLS y migraciones:** no se tocan (reglas 1 a 9 de la instrucción, y `app\CLAUDE.md`).
- **Contenido:** las maquetas y las instrucciones no son especificación de contenido. Nada de lo que aparece en ellas (monedas, gemas, nombres de personajes, eventos) existe en la app.

## 2. Qué dicen las maquetas y qué no se toma

| Lo que se ve | Estado en la app | Qué hacer |
|---|---|---|
| Barra superior con avatar, nivel, XP, monedas y gemas | Hay XP (acumulada, disponible, de sesión). No hay monedas ni gemas | Tomar el diseño de la barra con XP. **No** inventar monedas ni gemas (regla 4) |
| Botón Tienda con «2,200,110» y «COMPRAR - 200» | La tienda cobra en XP | Mismo diseño de precio, con XP y los precios reales de §13.1 |
| «Luna de Octubre · Termina en 3 días» | No existe ningún evento de ese tipo | **No mostrarlo**. Un evento solo se muestra si está en el catálogo |
| Tarjetas de juego con arte, jugadores y categoría | Hay catálogo real (`src/juegos`) con jugadores y lugares | Usar solo datos reales. Sin arte nuevo de personajes |
| Lobby con placas de nombre, corona del anfitrión, QR y botón «¡LISTO!» | Existe en la app | Aplicar el estilo; sin cambiar salas ni sincronía |
| Sobre épico con cartas «Helmet», «Legendary», «Star-Loic», «Ikaris» | Sobres de la tienda 3D todavía no construidos (024, 025) | No copiar. **Los nombres de las maquetas parecen personajes de terceros; no se usan** (Maestro §19.1) |
| Nombre «Aventuras con Amigos» | Maestro v1.12: nombre principal «Amigos Legendarios Verdaderos» | Pregunta D4 |

## 3. Decisiones de Elías (resueltas el 16 de noviembre, Maestro v1.33)

- **D1. Dirección:** se mantiene Cine Cómic Nocturno. Se aplican las partes de Neon Party que sirven (barra superior, estados de botón, rarezas, apertura de sobres con omisión, movimiento reducido).
- **D2. Fuentes:** Bangers y Barlow. No Outfit ni Fredoka.
- **D3. Economía visual:** vuelven las **monedas** como moneda de tienda. Las **gemas son la XP**. Pendiente: cómo se ganan y se gastan las monedas y sus precios (Maestro §13.1). Hasta entonces, la tienda cobra en XP.
- **D4. Nombre:** «Amigos Legendarios Verdaderos».
- **D5. Personajes:** se mantiene LEGO para la prueba. Riesgo de propiedad intelectual en el repo público (Maestro §19.1), a revisar antes de difundir fuera del grupo.
- **D6. Invitados:** pueden entrar a salas en la nube y en local, solo para pruebas. Elías borra todo al terminar. Antes de activar el acceso anónimo, revisión del asesor de seguridad.

Pendientes que quedan: monedas (ganar, gastar, precios) y el evento de la barra («Luna de Octubre» sigue fuera; no hay evento real).

## 4. Orden de ejecución

**Paso 0 (antes de diseñar).** Implementar el modo invitado (§3.2 del Maestro, v1.32 y v1.33): puede entrar a salas en la nube, solo para pruebas.

**Etapa 1. Diagnóstico (sin cambios de código).** Entregar una tabla con:
- archivos de estilos actuales: `src/ds/componentes.css`, `src/ds/extra.css`, `src/pantallas/alv.css` (o el que corresponda), y los tokens generados;
- componentes repetidos y los que se pueden reutilizar (`Boton`, `Chip`, `Etiqueta`, `Panel`, `TarjetaJuego`, `TarjetaJugador`, `Onomatopeya`, `Reloj`, `RuedaSospechosos`);
- inconsistencias visuales por pantalla y por tamaño (375 × 812, 768 × 1024, 1280 × 720, 1920 × 1080);
- limitaciones de la figura 3D en el hub y el lobby (rendimiento en celular).
Entregar prioridades. Parar aquí y esperar a Elías.

**Etapa 2. Base del diseño (solo después de la etapa 1 aprobada). Ya están resueltas D1 a D6.**
- **Trampa:** `src/ds/tokens.css`, `componentes.css` e `iconos.ts` se generan con `node tools/copiar-ds.mjs`. No se editan a mano.
- Para la capa nueva, crear un archivo escrito a mano, por ejemplo `src/ds/theme-game.css`, que **importe** los tokens generados y solo agregue lo que falta (estados de selección, deshabilitado, éxito, error, advertencia, información, marcos de rareza). Los tokens viven dentro de `.D`, no en `:root`; el archivo nuevo sigue esa regla.
- Colores de las instrucciones: los valores que no existan en la paleta aprobada se agregan como tokens con comentario de origen. Ningún color fuera de tokens.
- Rarezas: común `#94A3B8`, especial (tono a definir con Elías), épico `#A855F7`, legendario `#F59E0B`. Cada una con color, marco, iluminación y animación propia. Las rarezas se muestran igual en la tienda, en la apertura y en la colección.
- Botones: primary, secondary, tertiary, danger, success, icon y disabled. La inclinación solo en el botón principal (JUGAR) y en la tienda; no en todos.
- Tarjetas: superficie translúcida solo en las tarjetas importantes. No todas las tarjetas son de cristal.
- Animaciones reutilizables: flotación, pulso de elemento activo, entrada, presión. Un ciclo decorativo por pantalla. Todas se apagan con `prefers-reduced-motion`.

**Etapa 3. Primeros módulos (HUB y selector de juegos).** Son la prueba del lenguaje visual.
- HUB: el avatar es el protagonista, JUGAR pesa aproximadamente 40 % más que las demás acciones, jerarquía JUGAR → PERSONALIZAR → TIENDA → COLECCIÓN/RANKING/PERFIL según la navegación existente.
- Selector de juegos: tarjetas ilustradas con arte del catálogo real, nombre, categoría, jugadores (de `minJugadores` a `maxJugadores`), duración solo si el juego la tiene, etiqueta de intensidad **solo cuando exista** (Temperatura y Voltaje no están construidos todavía), y estado de disponibilidad. Hover, selección y transiciones.
- Entregables: capturas antes y después en los cuatro tamaños, validación de navegación, pruebas de regresión (`npm test`, `npm run build`).
- No avanzar si hay defectos importantes en estos dos módulos.

**Etapa 4. Resto (solo con la etapa 3 aprobada).** En este orden: lobby, tienda, apertura de sobres, personalizador, pantallas de juego, perfil y colección, resultados y recompensas.
- Tienda: cosméticos, accesorios, sobres y comodines se distinguen claramente. Los precios y probabilidades no cambian.
- Apertura de sobres: la intensidad de la animación sigue la rareza; se puede omitir siempre; no altera el sistema real de recompensas.
- Personalizador: el modelo de datos y el modo Simple/Avanzado no cambian (Maestro §10, D3).
- Pantallas de juego: la TV, el celular del anfitrión y el del jugador no comparten distribución (instrucción 6).

## 5. Reglas que no se rompen

- Nada de datos de relleno. Si una pantalla no tiene datos reales, muestra el estado vacío real.
- Ninguna función se quita para que una pantalla luzca completa.
- No se tocan migraciones, RLS, economía, salas ni QR.
- Sin dependencias nuevas. Las fuentes locales no cuentan como dependencia, pero se listan en el reporte.
- Antes de publicar: `npm test`, `npm run build`, capturas reales en 375 × 812, 768 × 1024, 1280 × 720 y 1920 × 1080, y revisión de desbordes con JS (el navegador de vista previa recorta las capturas).
- Lo que no se pudo comprobar se declara como **no verificado**.
- Publicar = subir a `main`. Elías prueba antes de dar por bueno cada etapa.

## 6. Qué entregar al final de cada etapa

1. Resumen de cambios.
2. Archivos modificados y componentes creados.
3. Capturas antes y después.
4. Resultados de pruebas y build.
5. Problemas detectados.
6. Funcionalidades no verificadas.
7. Recomendación para la siguiente etapa.
