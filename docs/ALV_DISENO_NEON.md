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

## 3. Decisiones que necesita Elías (no se programan sin respuesta)

**D1. ¿Neon Party Universe reemplaza a Cine Cómic Nocturno o se aplican solo sus partes compatibles?**
- Opción A (recomendada): mantener Cine Cómic Nocturno, que ya está aprobado y en código. Aplicar: barra superior, estados de botón (hover, presionado, foco), microinteracciones, rarezas con color y marco, apertura de sobres con partículas y botón para omitir, transiciones y `prefers-reduced-motion`.
- Opción B: reabrir la dirección visual. Pasa por una nueva propuesta con su página de aprobación, como en la Fase 2. Choca con Maestro §8.7, que pide evitar neón en todo y glassmorphism indiscriminado.
- Recomendación: A. Es lo que ya aprobaste y ya está construido; el resultado se parece más a «videojuego comercial» si se aplican bien los detalles, no con otra paleta.

**D2. ¿Qué fuentes?**
- Las fuentes aprobadas son Bangers (onomatopeyas), Barlow y Barlow Condensed (títulos y botones).
- Propuesta: mantener las aprobadas. Si Elías quiere Outfit y Fredoka, se cambian los tokens de `src/ds`, pero hay que rehacer las pantallas aprobadas.
- Las fuentes vienen de Google Fonts: por eso el archivo de estilos ya dice que las cargue por red. Para que la interfaz no dependa de internet, se agregan los archivos de fuente en `public/fuentes/` y `@font-face` local con respaldo. Es un cambio de recursos, no de dependencias.

**D3. Economía visual.** ¿Confirmas que la app solo muestra XP y que no habrá monedas ni gemas? (Son decisiones de economía, reglas 4 y 5.)

**D4. Nombre visible.** ¿«Amigos Legendarios Verdaderos» (Maestro v1.12) o «Aventuras con Amigos» (maquetas)? Se usa uno solo en toda la app.

**D5. Personajes.** Las instrucciones piden quitar la dependencia de LEGO y crear personajes propios. Eso es un cambio de arquitectura de las piezas 3D y del Maestro §9 y §19.1. **Va en un análisis separado**, no en esta tarea. Mientras tanto no se crean personajes nuevos a partir de las maquetas.

**D6. Acceso sin cuenta (ya decidido: modo invitado).** Ver `docs/DOCUMENTO_MAESTRO.md` §3.2 (v1.32). Antes de probar el diseño hay que implementarlo. Hay un punto abierto: las pruebas con varios celulares en sala usan la base, y un invitado sin cuenta no puede entrar a una sala en la nube sin crear un usuario anónimo en la base. Esa opción necesita decisión y revisión del asesor de seguridad.

## 4. Orden de ejecución

**Paso 0 (antes de diseñar).** Implementar el modo invitado (§3.2 del Maestro, v1.32). Sin esto no hay forma de que Elías vea las pantallas en el sitio publicado sin cuenta.

**Etapa 1. Diagnóstico (sin cambios de código).** Entregar una tabla con:
- archivos de estilos actuales: `src/ds/componentes.css`, `src/ds/extra.css`, `src/pantallas/alv.css` (o el que corresponda), y los tokens generados;
- componentes repetidos y los que se pueden reutilizar (`Boton`, `Chip`, `Etiqueta`, `Panel`, `TarjetaJuego`, `TarjetaJugador`, `Onomatopeya`, `Reloj`, `RuedaSospechosos`);
- inconsistencias visuales por pantalla y por tamaño (375 × 812, 768 × 1024, 1280 × 720, 1920 × 1080);
- limitaciones de la figura 3D en el hub y el lobby (rendimiento en celular).
Entregar prioridades. Parar aquí y esperar a Elías.

**Etapa 2. Base del diseño (solo después de la etapa 1 aprobada).**
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
