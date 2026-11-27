// Premios por nivel (Maestro 6A.11 C1; Elías, 27 nov 2026, v1.67): cada nivel desde el 2 regala un personaje al azar
// que todavía no tienes. 7 de cada 10 salen del grupo que más usas (X-Men, Avengers, DC…). Lo decide el servidor
// (`reclamar_premios_nivel`, migración 052); aquí solo está lo que se muestra.

/** Primer nivel con premio. */
export const PRIMER_NIVEL_PREMIO = 2;

/** El siguiente premio después del nivel `nivel` (para mostrarlo con candado en la barra). */
export function siguientePremio(nivel: number): { nivel: number } {
  return { nivel: Math.max(PRIMER_NIVEL_PREMIO, nivel + 1) };
}
