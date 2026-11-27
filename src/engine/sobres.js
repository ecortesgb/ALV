// Sobres de la tienda (Documento Maestro 13.2 y 13.3). Puros: reciben el azar y la lista de lo que todavía no se tiene.
// PROVISIONAL: precios, pesos de rareza y cantidad de cartas son valores de prueba. Están marcados como PENDIENTE en el Maestro.
export const SOBRES = [
    { id: "bronce", nombre: "Sobre bronce", precio: 60, nivel: 1, cartas: 2, pesos: { comun: 70, rara: 25, epica: 4, legendaria: 1 } },
    { id: "plata", nombre: "Sobre plata", precio: 120, nivel: 3, cartas: 3, pesos: { comun: 45, rara: 38, epica: 14, legendaria: 3 } },
    { id: "oro", nombre: "Sobre oro", precio: 240, nivel: 6, cartas: 4, pesos: { comun: 20, rara: 45, epica: 27, legendaria: 8 } },
];
export const RAREZAS = { comun: "Común", rara: "Rara", epica: "Épica", legendaria: "Legendaria" };
/** Rareza provisional de un artículo según su precio. Cuando el catálogo tenga rarezas oficiales, se cambia aquí. */
export function rarezaDe(precio) {
    if (precio <= 80)
        return "comun";
    if (precio <= 160)
        return "rara";
    if (precio <= 280)
        return "epica";
    return "legendaria";
}
/** Saca las cartas del sobre. Sin repetir dentro del mismo sobre. Si una rareza no tiene artículos, usa otra. */
export function abrirSobre(def, azar, disponibles) {
    const elegidos = [];
    const restantes = [...disponibles];
    const orden = ["comun", "rara", "epica", "legendaria"];
    for (let i = 0; i < def.cartas && restantes.length > 0; i++) {
        const total = orden.reduce((t, r) => t + def.pesos[r], 0);
        let tiro = azar.siguiente() * total, pedida = "comun";
        for (const r of orden) {
            tiro -= def.pesos[r];
            if (tiro < 0) {
                pedida = r;
                break;
            }
        }
        // Primero la rareza tirada; si no hay, la más cercana en el orden.
        const idx = orden.indexOf(pedida);
        const candidatos = [...orden.slice(idx), ...orden.slice(0, idx).reverse()];
        let hallado = null;
        for (const r of candidatos) {
            const lista = restantes.filter(a => rarezaDe(a.precio) === r);
            if (lista.length > 0) {
                hallado = { art: azar.elegir(lista), rareza: r };
                break;
            }
        }
        if (!hallado)
            break;
        restantes.splice(restantes.indexOf(hallado.art), 1);
        elegidos.push({ id: hallado.art.id, rareza: hallado.rareza });
    }
    return elegidos;
}
