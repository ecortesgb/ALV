# ALV: protocolo de calidad

Una pantalla o función se da por buena cuando pasa lo automático, se vio en el navegador y, si toca la base, se probó con un usuario que no debería tener acceso. Nunca se anota como aprobada una prueba que no se corrió.

## 1. Automáticas

```
npm test
npm run build
```

Aprueba: todas las pruebas pasan y el build termina. Rechaza: cualquier falla. Qué cubren hoy (149):

| Archivo | Qué revisa |
|---|---|
| `src/engine/motor.test.ts`, `red.test.ts` | Los 14 juegos completos, repetición con semilla, el secreto en cada momento |
| `src/roles/pantalla/motor.test.ts` | Arranque + acciones, solo el control controla, lo publicado no lleva secretos |
| `src/roles/frontera.test.ts` | La TV no usa `vistaJugador`, `privado`, `respuestas`, `manos` ni `semilla`; el Design System no habla con la base |
| `src/app/rutas.test.ts` | Rutas y códigos mal escritos |
| `src/servicios/servicios.test.ts` | Sin servidor nada toca la red |
| `src/ds/ds.test.ts` | Los 13 componentes y los estilos aprobados |

## 2. Navegador, sin servidor

`npx vite` sin `.env.local` abre el modo de prueba local. Cada pestaña es un aparato: `?yo=Ana#/jugar`. La misma `?yo=` en dos pestañas es la misma cuenta (anfitrión en la TV y en su celular).

Revisar en cada pantalla: consola sin errores, sin desbordes (medir con JS: ningún elemento con `right` mayor al ancho), botones de 40 px o más, texto legible. Tamaños: 375, 768, 1280 y 1920. El navegador de vista previa recorta las capturas en tamaño celular, por eso se mide.

## 3. Base de datos y permisos

Toda migración se prueba con usuarios simulados dentro de un bloque que termina en excepción, para que nada quede guardado. Modelo: `supabase/pruebas/017-026_prueba.sql`. Papeles mínimos: quien tiene el control, un miembro, una cuenta de fuera, un menor y `anon`. Aprueba: cada operación permitida funciona y cada prohibida devuelve error. Después se corre el asesor de seguridad de Supabase. No se crean cuentas reales de prueba.

Resultado del 16 nov 2026: sin fallas. Detalle en la cabecera de ese archivo.

## 4. Animaciones

Solo `transform` y `opacity`; entre 150 y 320 ms con salida suave; un ciclo decorativo por pantalla; con movimiento reducido queda un fundido corto. Rechaza: `transition: all`, entradas desde `scale(0)`, animar ancho o alto.

## 5. Seguridad

Antes de cada commit: buscar `sb_secret`, `service_role` y `eyJ` en `src`, `supabase` y `tools`. El build se detiene si la llave no es la publicable (`tools/revisar-config.mjs`).

## 6. Pruebas manuales de Elías

Con laptop, TV y dos celulares. Todas están **pendientes de Elías**. A = celular del anfitrión, B = segundo celular.

| # | Prueba | Aparato y papel | Pasos | Resultado esperado | Se ve como fallo |
|---|---|---|---|---|---|
| 1 | Crear sala | Laptop, anfitrión | Entrar, Jugar, «Proyectar en esta pantalla» | Aparece QR y código de 6 | Mensaje «No se pudo abrir» |
| 2 | Entrar con QR | A | Escanear el QR con la cámara | Entra directo a la sala; sin sesión pide entrar y luego sigue a la sala | Cae en el inicio |
| 3 | Dos celulares | A y B | B escanea o escribe el código | La TV muestra las dos figuras en segundos | Tarda más de 5 s o no aparece |
| 4 | Elegir juego | A | Tocar un juego, nivel y rondas | Candado con razón si faltan jugadores | Deja iniciar sin jugadores |
| 5 | El impostor | Todos (3 o más) | Iniciar | TV: rueda de sospechosos | TV en blanco |
| 6 | Papel privado | A y B | Mantener el dedo en el escáner | Cada quien ve lo suyo; el anfitrión ve su palabra | La palabra sale en la TV |
| 7 | Votación | A y B | Votar | «La TV ya lo recibió»; la TV marca quién contestó, no a quién | Se ve el voto antes de revelar |
| 8 | Resolución | TV | Esperar 2 s | Se revela sola, con quién votó a quién | No revela |
| 9 | Turnos | Todos | Verdad o reto | Solo quien está en turno tiene botones | Dos pueden contestar |
| 10 | Temporizador | Todos | Lista relámpago | Reloj en TV y celular | No hay reloj |
| 11 | Figuras | TV | Mirar la sala | Cada figura es la de su dueño | Figuras al azar con cápsula guardada |
| 12 | Personalización | A | Personalizar, editar, Listo | La figura queda guardada | Se pierde al volver |
| 13 | Cápsulas | A en sala | Tocar otra cápsula | La TV cambia el traje en segundos | No cambia |
| 14 | Tienda | — | — | No aplica todavía: no construido | — |
| 15 | Sobres | — | — | No aplica todavía: no construido | — |
| 16 | Inventarios | — | — | No aplica todavía: no construido | — |
| 17 | Perfil | A | Perfil | Nivel, XP y últimos movimientos | XP en 0 tras una partida de 5 rondas o más |
| 18 | Ranking | A | Ranking | Salen A y B | Sale gente desconocida |
| 19 | Logros | A | Logros | «Primera partida» ganado tras una partida | Todo en cero |
| 20 | Administración | Laptop, Elías | Ajustes, Administración | Lista de cuentas; B no ve el botón | B entra a `#/admin` y ve cuentas |
| 21 | Menor de edad (negativa) | Celular sin cuenta | Crear cuenta con fecha de menor | Rechazo antes de crear la cuenta | Entra al hub o a una sala |
| 22 | Desconexión | B | Modo avión 15 s y volver | «Reconectando…» y vuelve al mismo momento | Queda pegado |
| 23 | Persistencia | A | Cerrar el navegador y volver | Sigue con sesión, XP y cápsulas | Pide entrar de nuevo o pierde figuras |
