# ALV: guía de trabajo

Para el modelo que continúe el proyecto. Escrita el 16 de noviembre de 2026. Los otros documentos de continuidad están listados en `docs/ALV_AI_HANDOFF.md`.

## Qué es ALV

Juego de fiesta web para 2 a 8 personas, solo mayores de 18. Se juega con celulares y, si hay, una pantalla (laptop o TV). Repositorio público: https://github.com/ecortesgb/ALV. Página: https://ecortesgb.github.io/ALV/. Base: proyecto Supabase «ALV Games». Es un proyecto personal de Elías, no de Grupo Benber.

## Orden de lectura antes de tocar algo

1. `CLAUDE.md` de la carpeta `C:\GB\proyectos\personales\juegos-fiesta\`. Su sección Estado es la bitácora corta del proyecto.
2. `CLAUDE.md` de este repo (reglas de seguridad, base de datos y producto).
3. `docs/ALV_EXECUTION_STATE.md` para saber qué está hecho y qué no.
4. `docs/DOCUMENTO_MAESTRO.md`: §21.3, §21.4, §22.1, §23.2 y el historial (§26). El resto cuando el tema lo pida.
5. El código de lo que vas a cambiar, y su prueba si existe.

## Reglas que mandan sobre todo lo demás

- El Documento Maestro clasifica cada idea como DECISIÓN, PROPUESTA, PENDIENTE o DESCARTADO. Una propuesta no se programa como si estuviera aprobada. Lo descartado no vuelve.
- No se inicia ni se salta una fase sin aprobación de Elías. Los pasos 2 a 12 de la Fase 6 se hicieron juntos en esta rama como versión de prueba; Elías todavía no los aprueba (ver estado).
- Nada de llaves, contraseñas ni datos personales en el repo. Es público. Las anécdotas de los amigos son datos personales y no van en `src/content`.
- Cambios de base de datos: solo con autorización expresa de Elías cuando quiten permisos o borren datos. No se aplican migraciones por iniciativa propia.
- Cambios al Documento Maestro: incrementales, con entrada nueva en su historial de versiones. Hoy la versión es 1.29 y no recoge todavía lo hecho en los pasos 2 a 11.

## Flujo de una tarea

1. Confirma la rama (`alv2-fase6`) y que el árbol esté limpio con `git status`.
2. Lee el código y la prueba cercana antes de editar.
3. Cambia lo mínimo. Si el cambio toca una decisión del Maestro, pregunta a Elías antes.
4. Corre `npm test`, `npm run typecheck` y `npm run build`. Los tres deben pasar.
5. Si el cambio se ve en pantalla, pruébalo en el navegador en 375 y 1280 px de ancho. Con el respaldo local (sin Supabase) se juega entre pestañas; ver `docs/ALV_QA_PROTOCOL.md`.
6. Actualiza la sección Estado del `CLAUDE.md` de `juegos-fiesta`: una línea por cambio con fecha, cómo se probó y qué falta, y la línea «Para el siguiente hilo». Máximo unas 15 líneas.
7. Commit y publicación solo cuando Elías lo pida.

## Comandos

Desde `C:\GB\proyectos\personales\juegos-fiesta\app`:

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor local de Vite |
| `npm test` | Vitest, 149 pruebas el 16 de noviembre |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Revisa la llave (`tools/revisar-config.mjs`), tipos y arma `dist/` |
| `node tools/copiar-ds.mjs` | Regenera `src/ds/tokens.css`, `componentes.css` e `iconos.ts` desde `alv2\` (fuera del repo) |
| `node tools/copiar-minifig.mjs` | Copia Minifig Studio a `public/minifig/` |

Sin `.env.local` la app corre en modo local, sin servidor. Con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (solo la llave `sb_publishable_...`) habla con Supabase. Hay un ejemplo en `.env.example`.

## Publicación

`.github/workflows/publicar.yml` publica en GitHub Pages cada vez que algo entra a `main`. `ci.yml` corre typecheck, pruebas y build en cada push a `main` y en cada pull request. Publicar equivale a subir a `main`. Con Elías no se habla de ramas ni de pull requests: se le dice «publicado» o «falta tu decisión para publicar».

Hoy la rama `alv2-fase6` no está en `main`. Falta la decisión de Elías.

## Cómo hablarle a Elías

Español de México, simple y directo. Frases cortas. Sin tono de marketing, sin «no es X, es Y», sin tres adjetivos seguidos, sin guiones largos como muleta, sin resumen final. Pocas negritas. Listas solo cuando ayudan. Sin jerga de git.

Cuando necesites una decisión, di cuál es, qué opciones hay y cuál recomiendas. Lo que Elías pidió probar con sus aparatos lo prueba él: no lo des por probado.

## Una sesión por tarea

Cada tarea es una sesión. Si la conversación pasa de unos 200k de contexto, resume con `COMPACTO` y sigue en una sesión nueva.

## Trampas conocidas

- Los tokens del Design System viven en la clase `.D`, no en `:root`. Un componente fuera de `<RaizDS>` (`src/ds/Raiz.tsx`) no recibe los colores.
- `src/ds/tokens.css`, `src/ds/componentes.css` y `src/ds/iconos.ts` se generan. No se editan a mano. Lo propio de ALV va en `src/ds/extra.css` y `src/pantallas/alv.css`.
- Después de cambiar Minifig Studio hay que correr `node tools/copiar-minifig.mjs`.
- `src/roles/frontera.test.ts` falla si lo que dibuja la TV usa las palabras `vistaJugador`, `privado`, `respuestas`, `manos` o `semilla`. Aplica a `src/roles/pantalla/` (salvo `motor.ts`) y a `src/juegos/**/tv.tsx`. También falla si un componente de `src/ds` importa servicios, usa `fetch(` o `dangerouslySetInnerHTML`.
- Las pruebas de CSS necesitan `test.css.include` en `vite.config.ts`.
- Las migraciones 001 a 016 no se editan. Todo cambio de base va en un archivo nuevo de `supabase/migrations/`.
- `README.md` del repo está desactualizado: habla de `#/anfitrion`, `#/jugador` y `#/pantalla`, rutas que ya no existen. Las rutas vigentes están en `src/app/rutas.ts`.
- `docs/CONTEXTO_SIGUIENTE_HILO.md` es del 12 de noviembre y `docs/BITACORA.md` cubre la app 2D. Son historia, no estado.
- Quedan datos del personaje 2D en el repo: `public/piezas/`, `src/content/piezas*.json`, `docs/PIEZAS_DE_EQUIPO.md` y `tools/preparar_pieza.py`. `src/content/personaje.ts` todavía importa los tres JSON. Su limpieza es el paso 10 y depende de la migración 027, que no se aplica sin Elías.
- Riesgo abierto: piezas LDraw y personajes de terceros en repo público (Maestro §19.1). Elías permite marcas de terceros mientras no se publique ni venda, pero el repo y la página ya son públicos.

## Próximos pasos sugeridos

El orden lo decide Elías. Lo que sigue pendiente está en `docs/ALV_EXECUTION_STATE.md`, sección «No hecho», y las decisiones abiertas en `docs/ALV_DECISION_LOG.md`.
