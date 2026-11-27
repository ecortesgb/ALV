// Transformaciones de personaje (Elías, 27 nov 2026): Bruce Banner ↔ Hulk, Tony Stark → Iron Man → casco arriba → Tony,
// Peter Parker ↔ Spider-Man. Cada personaje con pareja tiene un ciclo de formas; «Transformar» avanza un paso y la forma se
// queda hasta volver a tocar (decisión de Elías). Solo cambia lo que se dibuja: la figura guardada del jugador no cambia.
// Paso 0 es la figura del jugador tal cual (con sus piezas); los demás pasos son la forma del catálogo, con sus momentos y
// extensiones (apodo, movimientos propios). Todo es dato: agregar un ciclo no cambia el motor.
import { ponerPieza, type Piezas } from "./constructorDatos";
import { deCatalogo } from "./figura";
import type { Catalogo } from "./plano";
import type { FiguraV3, Id, Parte } from "./tipos";

export interface Forma {
  /** Personaje del catálogo de esta forma. */
  p: Id;
  /** Cabeza de otro personaje sobre esta forma, sin casco (Iron Man con el casco arriba deja ver a Tony). */
  cabezaDe?: Id;
  /** Al salir de esta forma la transformación es más larga y verde (Bruce Banner se está volviendo Hulk). */
  conEspecial?: boolean;
}

export const CICLOS: readonly (readonly Forma[])[] = [
  [{ p: "bruce-banner", conEspecial: true }, { p: "hulk" }],
  [{ p: "tony-stark" }, { p: "iron-man" }, { p: "iron-man", cabezaDe: "tony-stark" }],
  [{ p: "peter-parker" }, { p: "spider-man" }],
];

/** Ciclo y lugar de la figura (por su personaje del catálogo). La forma con `cabezaDe` no es punto de partida. */
function lugar(v3: FiguraV3): { ciclo: readonly Forma[]; i: number } | null {
  if (v3.origen.tipo !== "catalogo") return null;
  const id = v3.origen.personaje;
  for (const ciclo of CICLOS) {
    const i = ciclo.findIndex(f => f.p === id && !f.cabezaDe);
    if (i >= 0) return { ciclo, i };
  }
  return null;
}

/** Cuántas formas tiene el ciclo de la figura (0 = no se transforma). */
export function cuantasFormas(v3: FiguraV3 | null): number {
  const l = v3 && lugar(v3);
  return l ? l.ciclo.length : 0;
}

/** Forma del ciclo en `paso` (0 = la del jugador). null si no tiene ciclo. */
export function formaEn(v3: FiguraV3, paso: number): Forma | null {
  const l = lugar(v3);
  if (!l) return null;
  const n = l.ciclo.length, k = ((Math.floor(paso) % n) + n) % n;
  return l.ciclo[(l.i + k) % n]!;
}

const CABEZA: readonly Parte[] = ["cara", "cabello"];

/** La figura en el paso `paso` del ciclo. Paso 0, sin ciclo o si falta algo en el catálogo: la misma figura. */
export function figuraEnForma(v3: FiguraV3, paso: number, catalogo: Catalogo, piezas: Piezas): FiguraV3 {
  const l = lugar(v3), forma = formaEn(v3, paso);
  if (!l || !forma || forma === l.ciclo[l.i]) return v3;
  const en = catalogo.get(forma.p);
  if (!en) return v3;
  let f = deCatalogo(en.ficha, v3);
  if (forma.cabezaDe) {
    // Sin casco y con la cara, el pelo y la piel de la cabeza del otro (ponerPieza pone su cabeza con la cara original).
    const sin = piezas.get("sin-sombrero");
    if (!sin) return v3;
    f = ponerPieza(f, sin, piezas);
    for (const parte of CABEZA) {
      const pz = piezas.get(`${forma.cabezaDe}--${parte}`);
      if (pz) f = ponerPieza(f, pz, piezas);
    }
    if (!f.piezas.cara) return v3; // sin cara del otro no se ve nada distinto: mejor no cambiar
  }
  return f;
}

/** ¿Al dejar la forma de `paso` (hacia `paso + 1`) se hace primero la animación especial? */
export const conEspecialAlSalir = (v3: FiguraV3, paso: number) => !!formaEn(v3, paso)?.conEspecial;
