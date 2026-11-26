// Movimiento de interfaz del HUB, el lobby y la TV (pedido de Elías, 2026-11-26: «animaciones más dinámicas en todas
// las pantallas»). Las reglas viven en pantallas/movimiento.css; lo decidió Codex en el encargo
// herramientas-locales/encargos-codex/2026-11-26-movimiento-pantallas-r1.md.
// Aquí solo va la compresión al presionar: empieza con el dedo abajo y la acción no espera a que termine.
import { movimientoReducido } from "./preferencias";
import "../pantallas/movimiento.css";

/** Botones que se comprimen al presionarlos. */
export const SE_APRIETAN = ".az-losa, .az-reto, .lb-listo, .lb-continuar, .lb-mini, .lb-redondo, .lb-agregar, .lb-flecha, .lb-mini-fig, .pasa-btn, .pl-listo, .mg-b";

let instalado = false;

/** Escucha los toques una sola vez para toda la app. */
export function instalarMovimiento() {
  if (instalado || typeof document === "undefined") return;
  instalado = true;
  document.addEventListener("pointerdown", e => {
    if (e.button !== 0 || movimientoReducido()) return;
    const b = (e.target as Element | null)?.closest?.(SE_APRIETAN);
    if (b instanceof HTMLElement && !(b as HTMLButtonElement).disabled) apretar(b);
  }, { passive: true, capture: true });
}

const compresiones = new WeakMap<HTMLElement, Animation>();

/**
 * Compresión de un botón (1 → .96 → 1 en 160 ms); si se vuelve a tocar, empieza de nuevo (no se acumulan).
 * Va por la API de animaciones y no por una clase: así no reinicia la entrada CSS que el botón ya tenga.
 */
export function apretar(el: HTMLElement) {
  if (typeof el.animate !== "function") return;
  compresiones.get(el)?.cancel();
  compresiones.set(el, el.animate([{ scale: "1" }, { scale: ".96", offset: .45 }, { scale: "1" }], { duration: 160, easing: "cubic-bezier(.2, .8, .2, 1)" }));
}
