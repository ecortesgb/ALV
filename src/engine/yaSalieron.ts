// Sin repetir entre noches (idea de Rea-games aprobada por Elías, 27 nov): el aparato del anfitrión recuerda qué cartas
// ya salieron y el motor saca primero las nuevas. Viaja en la configuración como una máscara por mazo para que el
// arranque quepa en la base (acciones ≤ 4000 bytes): bit i encendido = ya salió la carta `<mazo>-<i+1>`.
// Puro: sin navegador. Si ya salieron todas las del filtro, el motor usa el mazo completo como siempre.

/** Mazo → máscara en hexadecimal (la cifra de la derecha guarda las cartas 1 a 4). */
export type YaSalieron = Record<string, string>;

const ID = /^([a-z][a-z-]{0,23})-(\d{1,4})$/;
const MAZO = /^[a-z][a-z-]{0,23}$/;
const HEX = /^[0-9a-f]{1,256}$/;
// 32: los 13 mazos de antes más los 16 de los juegos de risa (27 nov), con lugar para crecer. Todo sigue bajo 4000 bytes.
const MAX_MAZOS = 32;

/** Arma la máscara con los ids de cartas («verdad-012»). Ignora lo que no tiene forma de id de carta. */
export function codificarSalieron(ids: Iterable<string>): YaSalieron | undefined {
  const bits: Record<string, number[]> = {};
  for (const id of ids) {
    const m = ID.exec(id);
    if (!m) continue;
    const n = Number(m[2]);
    if (n < 1 || n > 1024) continue;
    (bits[m[1]!] ??= []).push(n - 1);
  }
  const mazos = Object.keys(bits).sort().slice(0, MAX_MAZOS);
  if (mazos.length === 0) return undefined;
  const out: YaSalieron = {};
  for (const mazo of mazos) {
    const cifras: number[] = [];
    for (const b of bits[mazo]!) { const k = b >> 2; while (cifras.length <= k) cifras.push(0); cifras[k]! |= 1 << (b & 3); }
    out[mazo] = cifras.reverse().map(c => c.toString(16)).join("").replace(/^0+(?=.)/, "");
  }
  return out;
}

/** Revisa lo que llega del configurador (no confiable): solo mazos y máscaras con forma válida. */
export function limpiarSalieron(v: unknown): YaSalieron | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const out: YaSalieron = {};
  for (const [mazo, hex] of Object.entries(v as Record<string, unknown>).slice(0, MAX_MAZOS)) {
    if (MAZO.test(mazo) && typeof hex === "string" && HEX.test(hex)) out[mazo] = hex;
  }
  return Object.keys(out).length ? out : undefined;
}

/** ¿La carta ya salió en otra noche en este aparato? */
export function yaSalio(s: YaSalieron | undefined, id: string): boolean {
  if (!s) return false;
  const m = ID.exec(id);
  const hex = m && s[m[1]!];
  if (!hex) return false;
  const b = Number(m[2]) - 1;
  const k = hex.length - 1 - (b >> 2);
  if (b < 0 || k < 0) return false;
  return ((parseInt(hex[k]!, 16) >> (b & 3)) & 1) === 1;
}
