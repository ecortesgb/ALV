export function destinoGuardado(espacios: { figura: unknown | null; antes: boolean }[], activa: number | null, elegido: number | null): number {
  if (elegido !== null && Number.isInteger(elegido) && elegido >= 0 && elegido < espacios.length) {
    const espacio = espacios[elegido]!;
    if (!espacio.figura && !espacio.antes) return elegido;
  }
  const vacio = espacios.findIndex(e => !e.figura && !e.antes);
  return activa ?? (vacio >= 0 ? vacio : 0);
}
