// Azar con semilla: la misma semilla da siempre el mismo resultado.
// Así una partida se puede reconstruir desde su bitácora si un dispositivo se cae.

export interface Azar {
  /** Número entre 0 (incluido) y 1 (excluido). */
  siguiente(): number;
  entero(maxExclusivo: number): number;
  elegir<T>(lista: readonly T[]): T;
  mezclar<T>(lista: readonly T[]): T[];
}

export function crearAzar(semilla: number): Azar {
  let s = semilla >>> 0;
  const siguiente = () => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const entero = (max: number) => Math.floor(siguiente() * max);
  return {
    siguiente,
    entero,
    elegir<T>(lista: readonly T[]): T {
      if (lista.length === 0) throw new Error("lista vacía");
      return lista[entero(lista.length)] as T;
    },
    mezclar<T>(lista: readonly T[]): T[] {
      const a = [...lista];
      for (let i = a.length - 1; i > 0; i--) {
        const j = entero(i + 1);
        [a[i], a[j]] = [a[j] as T, a[i] as T];
      }
      return a;
    },
  };
}
