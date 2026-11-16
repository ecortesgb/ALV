# ALV: reglas de código

Estas reglas salen del `CLAUDE.md` del repo, del Documento Maestro y de cómo está escrito el código hoy. Si algo choca con el Maestro, manda el Maestro y se pregunta a Elías.

## Seguridad

- Ninguna clave, token o contraseña en el código, en comentarios ni «temporalmente». Las credenciales viven en variables de entorno o en secretos del repositorio.
- Al navegador solo llega la llave publicable de Supabase (`sb_publishable_...`). La secret key y `service_role` nunca. `tools/revisar-config.mjs` detiene el build si la llave no es la publicable o si la URL no parece de Supabase.
- `.env.example` documenta los nombres de los campos sin valores reales.
- Antes de un commit, revisa que no suba secretos. Si aparece una clave en el código o en el historial, avisa a Elías de inmediato: se da por quemada y hay que regenerarla.
- El repo es público. Nada de datos personales de los amigos de Elías (anécdotas, edades, géneros) en `src/content` ni en pruebas.

## Entradas

- Lo que llega del navegador no es confiable. Valida tipo, largo y valores permitidos en la base, no solo en el formulario.
- Nunca concatenes texto del usuario en SQL.
- React escapa el texto. No uses `dangerouslySetInnerHTML` con texto de jugadores. La prueba de `src/roles/frontera.test.ts` lo vigila en `src/ds`.
- Errores hacia el usuario: mensaje genérico (`GENERICO` en `src/servicios/cliente.ts`). El detalle va a `console.error`.
- Los códigos de sala se validan con `/^[A-Z0-9]{6}$/` (`rutas.ts` y `enlace.ts`).

## Base de datos

- RLS activo en todas las tablas. Se parte de «nadie puede nada» y se abren permisos concretos.
- Políticas separadas para leer, crear, editar y borrar.
- Las funciones `SECURITY DEFINER` expuestas por RPC validan el permiso dentro (ver `privado.es_anfitrion` y `privado.exigir_mayor` en las migraciones 020 y 026). Usan `set search_path to ''`.
- Las migraciones 001 a 016 no se editan. Un cambio nuevo es un archivo nuevo con el siguiente número y comentario de cabecera que diga qué cambia y por qué.
- Antes de aplicar un cambio de esquema: asesor de seguridad y prueba con un usuario que no debería tener acceso. La prueba de referencia es `supabase/pruebas/017-026_prueba.sql`. Termina siempre con una excepción para que no quede nada guardado.
- Cambios que quitan permisos o borran datos en producción: autorización expresa de Elías.

## Frontera entre papeles

- Un solo motor (`src/engine`), puro y sin pantallas. No importa React ni servicios.
- Solo `src/roles/pantalla/motor.ts` llama a `aplicar` fuera del motor.
- Lo que dibuja la TV solo lee la vista pública. No uses `vistaJugador`, `privado`, `respuestas`, `manos` ni `semilla` en `src/roles/pantalla/` (salvo `motor.ts`) ni en `src/juegos/**/tv.tsx`. Si necesitas un dato nuevo en la TV, agrégalo a `vistaPublica` en `src/engine/vistas.ts` solo si es seguro mostrarlo a todos, y agrega su prueba.
- Los componentes de `src/ds` reciben datos y avisan con callbacks. No importan servicios.
- Las pantallas hablan con el servidor solo por `src/servicios`. No crean su propio cliente de Supabase.

## Contenido

- El contenido va separado de la lógica (`src/content`). Toda carta lleva etiquetas de escenario, nivel (1 a 5 en el Maestro; el código de hoy usa `Intensidad` de 1 a 4), categoría, esfuerzo y si es de trago.
- Seguridad física: los filtros por lugar (`src/engine/filtros.ts`) no se saltan. Pasar solo con comodín; sin comodín se cumple el reto o se responde. Las cartas de trago nunca exigen alcohol. Tomar nunca da XP. Ningún reto de contacto sale sin el consentimiento de las personas involucradas.
- Las reglas de los juegos que muestra la ficha salen de `src/content/reglas.ts`, tal como las puntúa el motor.

## TypeScript

- `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals` y `noUnusedParameters` están activos en `tsconfig.json`. El código debe pasar `npm run typecheck` sin supresiones nuevas.
- Tipos explícitos en lo que cruza capas (`SalaV`, `Miembro`, `PartidaPub`, `FilaAccion` en `enlace.ts`). Sin `any`. Lo que llega de la red como `unknown` se revisa antes de usarse (ver `aAccion` en `motor.ts`).
- Funciones del servidor que pueden fallar devuelven `null`, `false` o un texto de error, y registran el detalle con `log`. No lanzan hacia la pantalla.
- Comentarios en español, cortos, que expliquen el porqué. No repitas lo que dice el nombre.

## React

- Componentes en español sin acentos en el nombre del archivo cuando ya existe esa convención (`Pantalla.tsx`, `Catalogo.tsx`). Hooks con prefijo `use` (`useSala`, `useMotor`, `useSesion`).
- Estado compartido fuera de React con `useSyncExternalStore` (`src/app/sesion.ts`). No metas contexto nuevo si eso alcanza.
- Los efectos que consultan el servidor se cancelan con una bandera `vivo` al desmontar, como en `Hub.tsx`.
- Avisos y confirmaciones: `aviso()` y `confirmar()` de `src/pantallas/comun.tsx`. No uses `alert` ni `confirm` del navegador.
- Las rutas nuevas se cargan aparte con `lazy` si traen estilos que no deben llegar a toda la app. No importes `src/ds` desde algo que ya carga en la entrada sin revisar el efecto en los estilos.

## Estilos

- Los tokens del Design System viven en `.D`, no en `:root`. Los componentes van dentro de `RaizDS`.
- No edites `src/ds/tokens.css`, `src/ds/componentes.css` ni `src/ds/iconos.ts`. Se regeneran con `node tools/copiar-ds.mjs`.
- Estilos propios de ALV en `src/ds/extra.css` y `src/pantallas/alv.css`, con clases `a-...`.
- Un selector `svg` amplio agranda iconos dentro de placas: usa `> svg`. Las columnas con scroll necesitan `> *{flex-shrink:0}`.
- Un solo brillo en bucle por pantalla. Respeta movimiento reducido. Las animaciones son CSS, sin librerías.
- Diseño para 375, 768, 1280 y 1920 px de ancho. Sin desbordes horizontales.

## Dependencias

Sin dependencias nuevas (decisión de §22.1). Se evaluaron Sonner (avisos) y Motion (animación) y se descartaron por esa decisión. Si una tarea parece pedir una librería, pregunta a Elías.

## Pruebas

- Toda regla del motor tiene prueba en `src/engine/*.test.ts`. Un cambio de regla cambia su prueba en el mismo paso.
- Una acción nueva necesita prueba de repetición con semilla y acciones (`src/roles/pantalla/motor.test.ts`, `src/engine/red.test.ts`).
- Lo privado nuevo necesita prueba de que no sale en la vista pública (`src/engine/motor.test.ts`).
- Las pruebas de CSS requieren `test.css.include` en `vite.config.ts`.
- Una migración nueva trae su prueba SQL con usuarios simulados que debieron fallar.

## Nombres y texto visible

- Texto de pantalla en español de México, tuteo, frases cortas. Sin signos de exclamación de relleno ni tono de anuncio.
- Los nombres de juegos y siglas salen de `src/content/catalogo.ts`. No los repitas escritos a mano en pantallas.
- Etiquetas de contenido vigentes: tranquila, adulta, Drunk (D1, Maestro §3.2). No uses la etiqueta «familiar».
