# ALV: mapa de arquitectura

Estado al 16 de noviembre de 2026, rama `alv2-fase6`, commit 1af00c7. Todas las rutas se comprobaron en el repo. La fuente de la arquitectura aprobada es `docs/DOCUMENTO_MAESTRO.md` §21.3, §21.4 y §22.1.

## Tecnología

React 18, TypeScript estricto, Vite 5, Vitest 2, Supabase (`@supabase/supabase-js`), `zod` y `qrcode-generator`. Sin dependencias nuevas por decisión de §22.1. Se publica como sitio estático en GitHub Pages, con `base: "./"` en `vite.config.ts`.

## Capas

| Carpeta | Qué hace |
|---|---|
| `src/engine/` | Motor puro, sin pantallas ni red. `partida.ts` es la máquina de estados (`crearPartida`, `aplicar`, `resultados`). `vistas.ts` arma lo que ve cada aparato. También `filtros.ts`, `azar.ts`, `economia.ts`, `logros.ts`, `sobres.ts`, `types.ts` |
| `src/content/` | Datos: `catalogo.ts` (escenarios, lugares, 14 juegos, cartas de poder), `reglas.ts`, `equipos.ts`, `personaje.ts`, `packs/base.json` (cartas y temas del impostor), `index.ts` |
| `src/ds/` | Design System «Cine Cómic Nocturno»: 13 componentes, `tokens.css`, `componentes.css`, `extra.css`, `iconos.ts`. Todo va dentro de `RaizDS` (`Raiz.tsx`) |
| `src/servicios/` | Todo lo que habla con Supabase: `cliente.ts`, `cuenta.ts`, `admin.ts`, `enlace.ts`, `tiempoReal.ts`, `index.ts` |
| `src/roles/` | `sala.ts` (estado de sala para cualquier aparato) y `pantalla/` (`Pantalla.tsx` y `motor.ts`) |
| `src/juegos/general/` | Cómo se ve cada mecánica: `celular.tsx`, `tv.tsx`, `texto.ts` |
| `src/pantallas/` | Pantallas de la app: `Acceso`, `Hub`, `Catalogo`, `Sala`, `Personalizar`, `Social`, `Ajustes`, `comun.tsx`, `ds.tsx`, `alv.css` |
| `src/app/` | `App.tsx`, `main.tsx`, `rutas.ts`, `sesion.ts`, `figura3d.tsx`, `sonido.ts` |
| `supabase/` | `migrations/`, `pendientes/`, `pruebas/`, `functions/restablecer-clave` |
| `public/minifig/` | Copia de Minifig Studio (figuras 3D). Se actualiza con `tools/copiar-minifig.mjs` |

## Los tres papeles de un aparato

El papel lo da la ruta del aparato, no la cuenta (§21.4).

- Pantalla: `#/tv/CÓDIGO` abre `src/roles/pantalla/Pantalla.tsx`. Muestra QR, rueda de sospechosos y marcador. Solo recibe la vista pública.
- Jugador: `#/sala/CÓDIGO` abre `src/pantallas/Sala.tsx`. Una herramienta a la vez (`src/juegos/general/celular.tsx`). Su secreto se ve mientras mantiene el dedo (`Escaner` de `src/ds`).
- Anfitrión: el mismo `Sala.tsx` con la barra de control (`src/ds/BarraAnfitrion.tsx`) cuando la cuenta es la anfitriona de la sala.

`#/s/CÓDIGO` es el enlace del QR (`enlaceSala` en `enlace.ts`). Es alias de `sala`. `#/mesa`, `#/proyectar`, `#/lobby` y otros alias viejos están en `ALIAS` de `src/app/rutas.ts`. Sin sesión, la entrada pide acceso o registro y después sigue a la sala (`App.tsx`).

## Flujo de una partida

1. El anfitrión abre sala (`enlace.abrir`, función SQL `crear_evento`). El modo se guarda en `eventos.nombre`: «ALV con pantalla» o «ALV sin pantalla».
2. Cada jugador entra con `unirse_evento`. Máximo 8.
3. El anfitrión elige juego, nivel y rondas y llama a `iniciarPartida` (`src/roles/pantalla/motor.ts`). Crea la fila de partida y guarda la acción de arranque (semilla, juego, rondas, configuración) con tipo `control`.
4. El motor corre en un solo aparato: la TV (modo con pantalla) o el celular del anfitrión (modo sin pantalla). `useMotor` lee las acciones en orden, las aplica con `aplicar` y publica.
5. Cada celular manda sus acciones (`contestar`, `carta`, `pista`) con `jugada()`. El anfitrión manda las de control con `control()`.
6. `useMotor` publica con `enlace.publicar` la vista pública y, por jugador, solo lo suyo (`mio`, `miRespuesta`, `miMano`). Un aparato ignora avisos con versión menor a la que ya tiene (`src/roles/sala.ts`).
7. Cuando todos contestaron, a los 2 s (`SUSPENSO_MS`) el motor manda `revelar` solo.
8. Al terminar, `enlace.terminar` llama a `terminar_partida_sala`, que reparte XP en el servidor.

Si el aparato del motor se recarga, `reconstruir` repite arranque más acciones guardadas y queda en el mismo punto. Las acciones repetidas no cuentan dos veces porque cada una trae su id.

## Motor

`src/engine/partida.ts` define `EstadoPartida`, la unión `Accion` y una tabla `MECANICAS` con 11 motores: `turnos-cartas`, `votacion`, `rol-secreto`, `pareja`, `botella`, `ruleta`, `dados`, `conteo`, `confesion`, `senalar`, `competencia`. Los 14 juegos de `src/content/catalogo.ts` se apoyan en ellos.

Acciones: `contestar`, `revelar`, `siguiente`, `terminar`, `dar-carta`, `usar-carta`, `pausar`, `reanudar`, `saltar`, `pista` (máximo 40 caracteres, `MAX_PISTA`), `xp-reto`, `ruleta`, `pasar-control`.

`src/engine/vistas.ts`: `vistaPublica` (lo que ve la TV y todos) y `vistaJugador` (suma `yo`, `mio`, `miRespuesta`, `miMano`). La vista pública incluye `pausada`, `pistas`, `xpReto`, `ruleta`, `control`, `esperados` y `votosDe`. `votosDe` solo existe al revelar una votación.

## Frontera de la TV

Solo `src/roles/pantalla/motor.ts` llama a `aplicar` fuera de `src/engine`. Lo que dibuja la TV no usa `vistaJugador`, `privado`, `respuestas`, `manos` ni `semilla`. Lo vigila `src/roles/frontera.test.ts`.

## Enlace con el servidor

`src/servicios/enlace.ts` es la única puerta de sala y partida. Tiene dos implementaciones con la misma interfaz `Enlace`:

- `nube`: Supabase. Se usa si hay URL y llave publicable.
- `local`: respaldo sin servidor con `localStorage` y `BroadcastChannel` (`alv-demo`). Comparte la sala entre pestañas del mismo navegador. Sirve para probar TV y celulares sin cuentas. Se activa solo si no hay Supabase configurado.

Compatibilidad con las migraciones 017 y 018 sin aplicar: `crearPartida` prueba `crear_partida_sala`; si el servidor no la tiene, inserta directo con semilla 0. `enviar` prueba el tipo `control`; si el servidor lo rechaza, manda tipo `carta` con `datos._tipo`. La semilla real viaja en la acción de arranque, que por las políticas solo lee quien tiene el control.

`src/servicios/tiempoReal.ts` escucha seis tablas: `partidas`, `datos_privados`, `acciones`, `miembros_evento`, `eventos`, `figuras_jugador`. Estados `conectando`, `vivo`, `respaldo`. Si el servidor no confirma en 5 s pasa a respaldo y consulta cada 3 s. En vivo consulta cada 12 s por si se perdió un aviso.

## Sesión

`src/app/sesion.ts` guarda quién entró y su XP, que viene del servidor (`mis_saldos`). Fases: `cargando`, `fuera`, `registro`, `menor`, `dentro`. Sin Supabase, la sesión es una demostración con nombre (`?yo=Ana` en la dirección o escrito en la pestaña). No se guarda XP ni compras en el aparato.

## Base de datos

Migraciones en `supabase/migrations/`: 001 a 016 (base anterior), 017 a 020 y 026. No existen 021 a 025. Estado de aplicación en `docs/ALV_EXECUTION_STATE.md`. Reglas de RLS en `CLAUDE.md` de este repo. La prueba de permisos está en `supabase/pruebas/017-026_prueba.sql`. La migración 027 de limpieza está en `supabase/pendientes/` y no se aplica sin Elías.

Dos puntos del modelo que conviene tener presentes:

- XP, compras, palabra del impostor y roles solo los escriben funciones del servidor.
- Los saldos reales están en `privado.saldos_de`, no en `public.saldos_de`.

## Rutas de la app

Definidas en `src/app/rutas.ts`: `inicio`, `jugar`, `catalogo`, `juego`, `sala`, `tv`, `personalizar`, `editor`, `tienda`, `ranking`, `logros`, `perfil`, `ajustes`, `admin`, `ds`. `tienda` existe como ruta pero la app no tiene pantalla de tienda: el botón del hub está con candado «Abre pronto». `ds` es la página interna del Design System (carga aparte, con `lazy` en `App.tsx`).
