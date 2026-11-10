# Bitácora

## 2026-11-10 · F0 y arranque de F1

- Proyecto nuevo con React, TypeScript y Vite. Reemplaza a la Edición Fin de Semana, que deja de existir como producto.
- Motor puro en `src/engine`: partida como máquina de estados con azar con semilla, acciones con id único (una repetida se ignora) y bitácora de eventos.
- 4 mecánicas ya corren: turnos con cartas (Verdad o reto), votación (¿Qué prefieres?), rol secreto (El impostor) y pareja (¿Cuánto conoces a tu pareja?).
- Vistas separadas: la pública (TV y anfitrión) nunca lleva palabras, roles ni respuestas antes de revelar.
- Economía de XP con acumulada, disponible y del evento. Las cartas de poder solo se compran con XP del evento abierto (40, 60 y 80; máximo 3 por partida).
- Contenido migrado: 283 cartas y 8 temas de impostor. Se quitaron 6 cartas que rompían las reglas de seguridad (clavados, aguantar la respiración, obligar a tomar…).
- Escenarios con los nombres nuevos. Activos: ALVerca, FBI: Fogata Bajo Investigación y GPS: Gran Parque Salvaje. Los otros 12 quedan registrados y apagados.
- Las cartas de ALVrasa (asador) quedaron en Campamento y las de ALVelada en Casa; se ven cuando esos escenarios se activen.
- Pruebas: 19 pasan (2, 4 y 8 jugadores, privacidad, progresión, desconexión y filtros de seguridad).
- La app muestra el configurador con los juegos compatibles y corre partidas locales con el motor real.

Siguiente: F2, cuentas y base de datos en Supabase con RLS.

## 2026-11-10 · F2 parte 1: base de datos en "ALV Games"

- Migraciones `001_base.sql` y `002_ayudantes_privados.sql` aplicadas: 10 tablas (perfiles, personajes, tienda, eventos, miembros, partidas, movimientos de XP, inventario, datos privados y acciones), todas con RLS.
- Todo lo que mueve XP o crea eventos pasa por funciones que validan adentro: `crear_evento`, `unirse_evento` (máximo 8), `cerrar_evento`, `comprar_accesorio`, `comprar_carta` y `mis_saldos`.
- Los ayudantes de permisos viven en el esquema `privado`, fuera de la API.
- Asesor de seguridad: quedan 6 avisos, todos de las funciones que la app sí debe llamar (cada una revisa sesión y permisos).
- Prueba con usuarios sin acceso (dentro de una transacción que se deshizo): alguien fuera del evento no ve eventos, partidas, perfiles, datos privados ni XP; un jugador no ve el dato privado de otro, no edita la partida, no se regala XP ni cierra el evento; las cartas cuestan 40 y 60 y la tercera se rechaza sin saldo; al cerrar el evento la XP del evento queda en 0 y ya no compra cartas; sin sesión no se puede leer nada.

Pendiente de F2: dar la XP de cada partida desde el servidor y la pantalla de entrada con correo.
