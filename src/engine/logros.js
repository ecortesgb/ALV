// Logros del grupo. Son puros: reciben datos ya calculados y dicen quién los tiene.
// Ámbito «sesion»: sale de la XP de la sesión y se reinicia con el evento.
// Ámbito «historico»: sale de las partidas terminadas y no se borra.
// No se premian shots ni consumo (Documento Maestro, 14.2).
export const LOGROS = [
    { clave: "goat", nombre: "El GOAT de la competencia", ambito: "sesion", descripcion: "Primero en la XP de la sesión, con al menos 1 XP." },
    { clave: "dupla", nombre: "La dupla perfecta", ambito: "sesion", descripcion: "La pareja con más XP de la sesión, con al menos 1 XP." },
    { clave: "mvp", nombre: "MVP", ambito: "historico", descripcion: "Mejor puntaje en una sola partida terminada." },
    { clave: "sobreviviente", nombre: "El sobreviviente", ambito: "historico", descripcion: "Terminó 10 partidas." },
];
const PARTIDAS_SOBREVIVIENTE = 10;
/** Devuelve todos los logros con «ganado» para un jugador. */
export function logrosDe(id, jugadores, historial) {
    const yo = jugadores.find(j => j.id === id);
    const ganados = new Set();
    if (yo) {
        const max = Math.max(0, ...jugadores.map(j => j.delEvento));
        if (yo.delEvento > 0 && yo.delEvento === max)
            ganados.add("goat");
        if (yo.pareja) {
            const par = jugadores.find(j => j.id === yo.pareja);
            const sumaPareja = (yo.delEvento) + (par?.delEvento ?? 0);
            const mejorPareja = Math.max(0, ...jugadores
                .filter(j => j.pareja)
                .map(j => j.delEvento + (jugadores.find(x => x.id === j.pareja)?.delEvento ?? 0)));
            if (par && sumaPareja > 0 && sumaPareja === mejorPareja)
                ganados.add("dupla");
        }
    }
    const partidas = historial.filter(p => !p.extra);
    const coincide = (r) => (yo?.id && r.id ? r.id === yo.id : r.nombre === yo?.nombre);
    let mejorPuntaje = 0;
    for (const p of partidas)
        for (const r of p.resultados)
            mejorPuntaje = Math.max(mejorPuntaje, r.puntos);
    if (yo && mejorPuntaje > 0 && partidas.some(p => p.resultados.some(r => coincide(r) && r.puntos === mejorPuntaje)))
        ganados.add("mvp");
    const jugadas = partidas.filter(p => p.resultados.some(coincide)).length;
    if (jugadas >= PARTIDAS_SOBREVIVIENTE)
        ganados.add("sobreviviente");
    return LOGROS.map(l => ({ ...l, ganado: ganados.has(l.clave) }));
}
