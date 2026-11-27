// Lobby estilo LEGO Party (Elías, 25 nov). La variante A es la OFICIAL desde el 2026-11-25. Las otras quedan
// para comparar con ?lobby=… en la dirección:
//   (sin nada) / ?lobby=a  OFICIAL: cabina por piezas (generar_a.py, generar_plataforma.py en arte-hub/lobby).
//   ?lobby=2               prueba con el fondo «Nueva Version» y pared con figura hundida (generar_v2.py).
//   ?lobby=b               prueba con la cabina amarilla de zoclo plateado (generar_v3.py).
//   ?lobby=clasico         el lobby anterior (cabinas pintadas del 22 nov).
const pedido = typeof location !== "undefined" ? new URLSearchParams(location.search).get("lobby") : null;
export const VARIANTE_LOBBY = pedido === "clasico" ? null : pedido === "2" || pedido === "b" ? pedido : "a";
export const LOBBY_V2 = VARIANTE_LOBBY === "2";
/** Lobby nuevo (letrero, sellos, etiquetas, panel y barra de nombres). */
export const LOBBY_NUEVO = VARIANTE_LOBBY !== null;
/** Carpeta de las cabinas dentro de public/arte. */
export const carpetaLobby = VARIANTE_LOBBY === "2" ? "lobby/v2" : VARIANTE_LOBBY ? `lobby/v3/${VARIANTE_LOBBY}` : "lobby";
/** Clases para el Marco del lobby. */
export const claseLobby = VARIANTE_LOBBY === "2" ? " lbn lb2" : VARIANTE_LOBBY ? ` lbn lb3 lb3${VARIANTE_LOBBY}` : "";
