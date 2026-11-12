# ALV · Contexto para continuar en otro hilo

Fecha de corte: 12 de noviembre de 2026, 3:46 PM (hora de México).

## Dónde estamos
- Repo `ecortesgb/ALV`, app React + TypeScript + Vite, publicada en https://ecortesgb.github.io/ALV/ desde `main`.
- Último estado de `main`: PR #13 fusionado («Cuenta: XP de partidas al servidor»). Antes: #8 Lobby, #9 Logros, #10 Sobres, #11 Neo-Arcade tanda 3, #12 Cuenta.
- Documento Maestro en `docs/DOCUMENTO_MAESTRO.md`, versión 1.10. Bitácora en `docs/BITACORA.md`.
- Tests: `npx tsc --noEmit`, `npm test` (34 pasan), `npm run build`.
- Rama de trabajo: `claude/project-thread-hbozb2`. Después de cada fusión: `git fetch origin main && git checkout -B claude/project-thread-hbozb2 origin/main`.

## Qué ya funciona
- Navegación: Inicio, Lobby, Tienda, Ranking, Perfil.
- Lobby: personajes animables (saludar, bailar, chocar, empujar, listo), configuración de juego, escenario y condiciones, pantalla de carga antes de jugar.
- Ranking: Sesión, Histórico, Parejas, Historial. Indicador de lugar sobre cada personaje.
- Logros en Perfil: GOAT de la competencia y La dupla perfecta (sesión); MVP y El sobreviviente (históricos). Lógica en `src/engine/logros.ts`.
- Tienda de sobres: bronce, plata y oro, pagados con XP disponible, cartas reveladas una por una. Lógica en `src/engine/sobres.ts`. PRECIOS Y RAREZAS PROVISIONALES: pendientes de aprobación de Elías.
- Neo-Arcade tanda 3 (parte): ruleta con fricción y clic por segmento; deslizar la carta (derecha = Cumplió, izquierda = Paso, arriba = mano).
- Vista ancha para laptop o proyector y pantalla completa.
- Cuenta en Perfil: crear o entrar con nickname y contraseña, sin correo. Solo aparece si el build tiene las variables de Supabase. Al entrar se trae el personaje guardado y cada cambio se guarda.
- La XP de cada partida se suma a la cuenta (función `registrar_xp_partida` en Supabase, probada). Las cuentas nuevas empiezan en cero XP; la XP del celular no se importa (decisión de Elías).

## Supabase (proyecto «ALV Games», ref okybpifysusmnctmcaru)
- Esquema existente con RLS: perfiles, personajes, eventos, miembros_evento, partidas, movimientos_xp, inventario, datos_privados, acciones, articulos_tienda.
- Funciones: crear_evento, unirse_evento, cerrar_evento, comprar_accesorio, comprar_sobre, comprar_carta, mis_saldos, registrar_partida y registrar_xp_extra (registrar_xp_partida quedó deshabilitada). Todas validan la sesión dentro.
- Registro de usuarios: activado. Confirmar correo: desactivado. Usuarios nuevos: se crea su perfil y su personaje solos (disparador `crear_perfil`).
- Nickname único: se guarda como correo interno `nickname@jugadores.alv.invalid`.
- Cuenta de prueba creada: `prueba_claude_1@jugadores.alv.invalid`. DEBE BORRARLA ELÍAS: Authentication → Users → Delete user.

## Pendiente de Elías
1. En GitHub, Settings → Secrets and variables → Actions → Variables: `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (solo la publicable, nunca la secreta). Sin esto, el sitio no muestra la cuenta.
2. En Supabase Auth, encender la protección de contraseñas filtradas (alerta del asesor de seguridad).
3. Borrar la cuenta de prueba `prueba_claude_1`.
4. Aprobar precios, pesos de rareza y rareza por precio de los sobres (PENDIENTE en Maestro 13.2).

## Pendiente de la app, en orden propuesto
1. ~~Compras e inventario en la cuenta~~ Hecho el 13 de noviembre (migraciones 004 y 005).
2. ~~Validar en el servidor los resultados de partida~~ Hecho el 13 de noviembre (migración 006): el servidor calcula la XP con los hechos de la partida. Falta que los hechos los vea el servidor directamente (sala compartida).
3. Unirse al lobby desde el celular con enlace o QR, usando el código de evento de `unirse_evento`.
4. Herramientas por mecánica en cada celular (votar, escribir, dibujar, elegir, dado, carta). La pantalla principal muestra escenario, turno y personajes.
5. Neo-Arcade tanda 3, resto: botella interactiva, destello de cartas de poder, inclinación 3D de la carta, confeti de la ruleta.
6. Logros pendientes: más fachero, castigado, sospechoso, afortunado, alma de la fiesta (requieren datos que no guardamos aún).
7. Ranking de Equipos cuando exista el modo por equipos.

## Decisiones de Elías que hay que respetar
- Flujo tipo «Clubes Pro / The Grounds»: lobby → configurar → iniciar → carga → partida.
- Laptop proyectada; cada persona entra desde su celular con su cuenta para personalizar, comprar, ver ranking e interactuar.
- Registro: nickname y contraseña, sin correo. Todo lo conseguido se guarda al volver a entrar.
- Sobres oro, plata y bronce en tienda aparte. Compra con XP disponible.
- Castigo: mitad de XP en el próximo juego. XP disponible nunca negativa.
- Fusionar y publicar sin preguntar cuando CI esté en verde.
- Respuestas en español, cortas, primero la respuesta, una recomendación cuando haya opciones.

## Reglas de seguridad (CLAUDE.md, obligatorio)
- Ninguna clave en el código ni en comentarios. Al navegador solo la llave publicable (`sb_publishable_...`). Nunca la secret key ni `service_role`.
- RLS en todas las tablas. Funciones `SECURITY DEFINER` validan permisos dentro.
- XP, compras y datos privados los escriben solo funciones del servidor.
- Antes de publicar un cambio de esquema: asesor de seguridad y prueba con un usuario sin acceso.
- React escapa el texto. Nunca `dangerouslySetInnerHTML` con texto de jugadores.
- Errores al usuario: mensaje genérico.

## Cómo seguir en otro hilo
Abrir un hilo nuevo con este archivo y pedir: «Continúa con el punto 1 de Pendiente de la app». Antes de empezar, leer `docs/DOCUMENTO_MAESTRO.md` (v1.10) y `CLAUDE.md`.
