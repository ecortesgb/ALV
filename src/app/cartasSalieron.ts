// Sin repetir entre noches (Elías, 27 nov): este aparato recuerda qué cartas ya salieron en sus partidas.
// Solo vive en el navegador (sin base): si se borra o no hay almacenamiento, todas cuentan como nuevas.
import { CONTENIDO } from "../content";
import { codificarSalieron, type YaSalieron } from "../engine/yaSalieron";

const CLAVE = "alv-cartas-salieron";
const CONOCIDAS = new Set(CONTENIDO.cartas.map(c => c.id));

function leer(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && CONOCIDAS.has(x)) : [];
  } catch { return []; }
}
function guardar(ids: string[]) { try { localStorage.setItem(CLAVE, JSON.stringify(ids)); } catch { /* sin almacenamiento: no se recuerda */ } }

let ultima = "";
/** Anota una carta que salió en la mesa. Ignora lo que no es carta del contenido (dados, palabras sorteadas…). */
export function anotarCarta(id: string | undefined) {
  if (!id || id === ultima || !CONOCIDAS.has(id)) return;
  ultima = id;
  const ids = leer();
  if (!ids.includes(id)) guardar([...ids, id]);
}

/** Cartas de estos mazos que ya salieron en este aparato. */
export function salieronDe(mazos: string[]): string[] {
  return leer().filter(id => mazos.some(m => id.startsWith(`${m}-`) && /^\d+$/.test(id.slice(m.length + 1))));
}

/** Lo que va al configurador: la máscara de todo lo que ya salió (o nada si no ha salido ninguna). */
export function mascaraSalieron(): YaSalieron | undefined { return codificarSalieron(leer()); }

/** «Empezar el mazo de cero»: olvida las cartas de estos mazos. */
export function olvidarMazos(mazos: string[]) {
  const quitar = new Set(salieronDe(mazos));
  guardar(leer().filter(id => !quitar.has(id)));
  ultima = "";
}
