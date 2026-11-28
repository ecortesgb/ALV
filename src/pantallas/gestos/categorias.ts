// Orden del círculo de animaciones (Elías, 27 nov 2026: «muy amontonadas y desorganizadas»). Se ordena por intención y no
// por de dónde sale el clip: un círculo principal con las mismas categorías para todos y, al tocar una, sus movimientos
// directo (2 niveles). Lo propio del personaje va primero. Solo datos: el dibujo y los íconos están en RuedaGestos.tsx.
import type { SetRueda } from "../../personajes/integracion";

export type Categoria = "poderes" | "especial" | "pelea" | "habilidad" | "fiesta" | "gestos";
/** Tipo de ícono de un movimiento (RuedaGestos.tsx IconoTipo). */
export type TipoIcono = "rayo" | "fuego" | "vuelo" | "escudo" | "disparo" | "espada" | "magia" | "baile" | "burla" | "reaccion"
  | "golpe" | "patada" | "tecno" | "mente" | "fuerza" | "acrobacia" | "garras" | "festejo" | "poder" | "saludar" | "victoria"
  | "derrota" | "mas";
export interface Opcion { cual: string; txt: string; tipo: TipoIcono }

export const NOMBRE_CATEGORIA: Record<Categoria, string> = {
  poderes: "Poderes", especial: "Especial", pelea: "Pelea", habilidad: "Habilidad", fiesta: "Fiesta", gestos: "Gestos",
};
/** En el círculo principal, en este orden: con 6, Especial queda arriba (los ángulos salen de RuedaGestos.angulos). */
const ORDEN: Categoria[] = ["poderes", "especial", "pelea", "habilidad", "fiesta", "gestos"];

/** A qué categoría va cada set (sets.ts). Los de poder van detrás de los poderes propios. */
const CATEGORIA_SET: Record<string, Categoria> = {
  vuelo: "poderes", tecno: "poderes", mente: "poderes", magia: "poderes", fuerza: "poderes",
  pelea: "pelea", garras: "pelea",
  espada: "habilidad", pistola: "habilidad", dospistolas: "habilidad", rifle: "habilidad", arco: "habilidad", acrobacia: "habilidad",
  base: "fiesta", gestos: "fiesta",
  reacciones: "gestos",
};
const ICONO_SET: Record<string, TipoIcono> = {
  vuelo: "vuelo", tecno: "tecno", mente: "mente", magia: "magia", fuerza: "fuerza", pelea: "golpe", garras: "garras",
  espada: "espada", pistola: "disparo", dospistolas: "disparo", rifle: "disparo", arco: "disparo", acrobacia: "acrobacia",
  base: "baile", gestos: "festejo", reacciones: "reaccion",
};
/** Ícono de un poder según el tipo de su efecto (poderes.ts). */
const ICONO_EFECTO: Record<string, TipoIcono> = {
  rayo: "rayo", hielo: "rayo", electrico: "rayo", fuego: "fuego", volar: "vuelo", escudo: "escudo", campo: "escudo",
  hechizo: "magia", golpe: "fuerza", onda: "fuerza", disparo: "disparo", velocidad: "vuelo", estirar: "acrobacia",
  telarana: "acrobacia", encoger: "poder", invisible: "poder", hormigas: "poder",
};

/** Ícono de un movimiento de un set: los de pelea y la base tienen su variante (patada, burla). */
function iconoMov(set: string, id: string): TipoIcono {
  if (id === "pelea-golpe2") return "patada";
  if (set === "base" && /burla/.test(id)) return "burla";
  return ICONO_SET[set] ?? "poder";
}

export interface RuedaArmada {
  /** Categorías del círculo principal, ya sin las vacías. */
  principal: Categoria[];
  opciones: Record<Categoria, Opcion[]>;
}

/** Arma el círculo de un personaje: sus poderes ({id, nombre, tipo de efecto}) y sus sets de movimientos. */
export function armarRueda(poderes: { id: string; nombre: string; tipo?: string }[], sets: SetRueda[]): RuedaArmada {
  const op: Record<Categoria, Opcion[]> = { poderes: [], especial: [], pelea: [], habilidad: [], fiesta: [], gestos: [] };
  for (const p of poderes) op.poderes.push({ cual: "poder:" + p.id, txt: p.nombre, tipo: ICONO_EFECTO[p.tipo ?? ""] ?? "poder" });
  op.gestos.push({ cual: "saludar", txt: "Saludar", tipo: "saludar" }, { cual: "victoria", txt: "Ganar", tipo: "victoria" },
    { cual: "derrota", txt: "Perder", tipo: "derrota" });
  // Los sets propios del personaje llegan antes que los de todos (setsDe): así lo suyo sale primero en cada categoría.
  for (const s of sets) {
    const c = CATEGORIA_SET[s.set];
    if (!c) continue;
    for (const m of s.movs) if (!op[c].some(o => o.txt === m.nombre)) op[c].push({ cual: "mov:" + m.id, txt: m.nombre, tipo: iconoMov(s.set, m.id) });
  }
  const principal = ORDEN.filter(c => c === "especial" || op[c].length > 0);
  return { principal, opciones: op };
}

/** Una página de una categoría: hasta 8; si hay más, 7 y «Más» (que pasa a la siguiente y al final vuelve a la primera). */
export function pagina(lista: Opcion[], n: number): Opcion[] {
  if (lista.length <= 8) return lista;
  const paginas = Math.ceil(lista.length / 7), i = ((n % paginas) + paginas) % paginas;
  return [...lista.slice(i * 7, i * 7 + 7), { cual: "mas", txt: "Más", tipo: "mas" }];
}
