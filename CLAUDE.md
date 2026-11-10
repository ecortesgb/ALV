# Instrucciones para Claude en ALV

## Seguridad (obligatorio)
- Ninguna clave, token o contraseña va en el código, ni en comentarios, ni "temporalmente". Las credenciales viven en variables de entorno o en secretos del repositorio.
- Al navegador solo llega la llave publicable de Supabase (`sb_publishable_...`). La secret key o `service_role` jamás. `tools/revisar-config.mjs` detiene el build si la llave no es la publicable.
- Para documentar, usar `.env.example` con los nombres de los campos y sin valores reales.
- Antes de cualquier commit, revisar que no se suba nada con secretos. Si aparece una clave en el código o en el historial, avisar de inmediato: esa clave se da por quemada y hay que regenerarla.

## Base de datos (Supabase "ALV Games")
- RLS activo en TODAS las tablas. Partir de "nadie puede nada" y abrir permisos concretos.
- Políticas separadas para leer, crear, editar y borrar.
- Funciones `SECURITY DEFINER` expuestas por RPC: validar permisos dentro de la función.
- XP, compras y datos privados (respuestas, palabra del impostor, roles) solo los escriben funciones del servidor.
- Antes de publicar un cambio de esquema, correr el asesor de seguridad y probar con un usuario que NO debería tener acceso.

## Entradas
- Lo que llega del navegador no es confiable: validar tipos, largo y valores permitidos en la base, no solo en el formulario.
- Nunca concatenar texto del usuario en SQL.
- React escapa el texto por defecto: nunca usar `dangerouslySetInnerHTML` con texto de jugadores.
- Errores hacia el usuario: mensaje genérico. El detalle va al log.

## Producto
- Un solo motor (`src/engine`), puro y sin pantallas. Anfitrión, Jugador y Pantalla solo leen sus vistas (`src/engine/vistas.ts`).
- La Pantalla (TV) solo recibe la vista pública.
- Contenido separado de la lógica (`src/content`). Toda carta lleva etiquetas de escenario, intensidad, esfuerzo, adulto y Drunk.
- Seguridad física: los filtros por lugar no se saltan. Tomar nunca da XP. Pasar no tiene castigo.
- Definición completa del producto: documento "ALV — Definición integral de la plataforma".
