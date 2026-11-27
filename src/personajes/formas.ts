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
  /** Cabeza de otro personaje sobre esta forma, sin casco. */
  cabezaDe?: Id;
  /** Careta levantada (Elías, 27 nov: Iron Man no se quita el casco, solo sube la careta). Misma figura; la escena gira
   *  esas mallas hacia arriba sobre la bisagra. */
  careta?: Careta;
  /** Al salir de esta forma la transformación es más larga y verde (Bruce Banner se está volviendo Hulk). */
  conEspecial?: boolean;
  /** Forma de paso que no es punto de partida (Mística disfrazada de Gwen o Pepper: quien elige a Gwen no se transforma). */
  disfraz?: boolean;
}

/** Mallas de la careta (por nombre, dentro del hueso del casco), bisagra en coordenadas de ese hueso y ángulo en grados. */
export interface Careta { mallas: string[]; bisagra: [number, number, number]; angulo: number }

/** Careta de Iron Man (LMSH, casco «HEARTBREAKER»): la placa dorada, su capa interior, la barbilla y el brillo de los ojos.
 *  Debajo ya viene la cara de Tony. Revisado a la vista pieza por pieza (27 nov). */
const CARETA_IRON_MAN: Careta = {
  mallas: ["TT_HEARTBREAKERHELMET_200006", "TT_HEARTBREAKERHELMET_200007", "TT_HEARTBREAKERHELMET_200008", "TT_HEARTBREAKERHELMET_200009"],
  bisagra: [0, 0.01, -0.01], angulo: -135,
};

// Con qué animación sale y llega cada forma lo trae su ficha (set «transformar», clips del juego); si no trae, temblor y humo.
export const CICLOS: readonly (readonly Forma[])[] = [
  [{ p: "bruce-banner", conEspecial: true }, { p: "hulk" }],
  [{ p: "tony-stark" }, { p: "iron-man" }, { p: "iron-man", careta: CARETA_IRON_MAN }],
  [{ p: "peter-parker" }, { p: "spider-man" }],
  // Segunda tanda (27 nov 5:32 AM): salir del Hulkbuster, Venom, el traje negro, Mística disfrazada y Stan Lee como en el juego.
  [{ p: "hulkbuster" }, { p: "iron-man" }],
  [{ p: "venom" }, { p: "venom-grande" }],
  [{ p: "spider-man-negro" }, { p: "peter-parker" }],
  [{ p: "mistica" }, { p: "gwen-stacy", disfraz: true }, { p: "pepper-potts", disfraz: true }],
  [{ p: "stan-lee", conEspecial: true }, { p: "hulk" }],
];

/** Transformación que eligió el jugador en el personalizador (Elías, 27 nov: «cualquiera que la elija se pueda
 *  transformar… en prácticamente cualquier personaje»). Manda sobre los ciclos fijos. */
export const transformacionDe = (v3: FiguraV3): Id | null => {
  const t = v3.extensiones.alv?.transformacion;
  return typeof t === "string" && /^[a-z0-9][a-z0-9-]{0,63}$/.test(t) && !(v3.origen.tipo === "catalogo" && v3.origen.personaje === t) ? t : null;
};

/** Ciclo y lugar de la figura (por su personaje del catálogo). La forma con `cabezaDe` no es punto de partida. */
function lugar(v3: FiguraV3): { ciclo: readonly Forma[]; i: number } | null {
  const elegida = transformacionDe(v3);
  if (elegida) return { ciclo: [{ p: v3.origen.tipo === "catalogo" ? v3.origen.personaje : "" }, { p: elegida }], i: 0 };
  if (v3.origen.tipo !== "catalogo") return null;
  const id = v3.origen.personaje;
  for (const ciclo of CICLOS) {
    const i = ciclo.findIndex(f => f.p === id && !f.cabezaDe && !f.careta && !f.disfraz);
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

/** Careta levantada en ese paso (null = cerrada o no tiene). */
export const caretaEn = (v3: FiguraV3, paso: number): Careta | null => formaEn(v3, paso)?.careta ?? null;

/** La figura en el paso `paso` del ciclo. Paso 0, sin ciclo o si falta algo en el catálogo: la misma figura. */
export function figuraEnForma(v3: FiguraV3, paso: number, catalogo: Catalogo, piezas: Piezas): FiguraV3 {
  const l = lugar(v3), forma = formaEn(v3, paso);
  if (!l || !forma || forma.p === l.ciclo[l.i]!.p && !forma.cabezaDe) return v3; // la suya (con careta o no): sus piezas se quedan
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
