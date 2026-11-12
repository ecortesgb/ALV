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

## 2026-11-10 · Pasos 1 y 2: diseño visual, personaje y tienda

- Sistema visual del diseño: fondo espacial, un neón por sección, Bungee para siglas, cartas con borde degradado y animación al repartir, botones de tres gestos (Paso, Carta, Cumplió), podio animado. Respeta «reducir movimiento».
- Navegación de 5 pestañas: Inicio, Juegos, Grupo, Historial y Perfil.
- Inicio con ¡Sorpréndeme! (ruleta que gira y elige un juego compatible) y las 8 secciones.
- Personaje de bloques del Centro de Mando: editor de 6 pasos más Tienda, botón Al azar. Cada jugador del grupo tiene el suyo.
- Tienda con precios en XP disponible y nivel mínimo; accesorios en la mano, coronas, collar, medallas y capa se ven en el personaje.
- Cartas de poder en el motor: se gana 1 cada 3 retos, se compran con XP del evento (40, 60, 80), máximo 3 en la mano. Escudo y Pasa turno saltan el reto sin castigo; Cambio saca otra carta.
- Juegos con secretos (Impostor, ¿Cuánto conoces?, ¿Qué prefieres?) se juegan pasando el celular: cada quien ve solo lo suyo.
- Al terminar, la XP se suma a cada jugador y queda en el historial.
- Por ahora todo se guarda en el dispositivo; con las cuentas (paso 4) pasa al servidor.
- Pruebas: 23 del motor pasan; prueba en navegador de inicio, perfil, tienda, juegos, verdad o reto completo, impostor completo y podio sin errores.

## 2026-11-12 · Neo-Arcade, tanda 1: uso

- Las confirmaciones (salir de la partida, contenido adulto, cerrar evento) ya no usan el cuadro del navegador: son modales con el diseño de la app. Escape o tocar fuera cancela.
- El impostor: la palabra solo se ve mientras se mantiene presionado. Al soltar se tapa, y tapada no está en la página. También funciona con Espacio o Enter. No se puede pasar al siguiente sin haberla visto.
- Fila de avatares arriba de la partida: el del turno brilla y, en rondas secretas, se marca quién ya contestó.
- Sonidos hechos por código (clic, cumplió, paso, carta, poder, error, tiempo, revelar y fanfarria del podio) con botón flotante para silenciar. El silencio se recuerda en el dispositivo.
- Pruebas: 23 del motor pasan; prueba en navegador de los tres modales, la cortina con dedo y teclado, verdad o reto completo y podio, sin errores ni cuadros nativos.

Falta de esta tanda: en ¿Cuánto conoces a tu pareja? la respuesta se ve mientras se escribe.

## 2026-11-12 · Piezas del personaje con nombres genéricos

- La carpeta `public/lego` ahora es `public/piezas` y los 310 archivos tienen nombres genéricos (`piel-01`, `cabello-01`, `acc-taza`…). Las imágenes son las mismas.
- Los personajes y accesorios ya guardados en un dispositivo se pasan solos a los nombres nuevos al abrir la app.
- Se quitó `manifest.json` de la carpeta pública: era una copia sin uso de `src/content/piezas.json`.
- Documento Maestro v1.4: catálogo clásico de 14 juegos y catálogo abierto a más juegos.

## 2026-11-12 · XP extra del administrador

- En Grupo, cada jugador tiene un botón «+XP»: el administrador elige 10, 25, 50 o 100 y escribe el motivo (obligatorio, hasta 60 letras).
- Cuenta como XP ganada en el evento: sube la acumulada, la disponible y la del evento. Queda en el Historial con su motivo.
- Límite por entrega: de 1 a 200. Todavía no hay tope por sesión; está pendiente en el Documento Maestro (12.3.1).
- Por ahora vive en el dispositivo, como el resto. Con las cuentas pasa a una función del servidor que revise que quien la da es el administrador.
- Pruebas: 25 del motor pasan; prueba en navegador de dar XP y verla en el historial.
