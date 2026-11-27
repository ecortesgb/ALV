// Fecha de nacimiento: funciones puras (sin pantallas) para el campo DD/MM/AAAA de Acceso.
export const hoy = () => new Date();
/** Edad cumplida a partir de AAAA-MM-DD. */
export function edadDe(nacimiento, ref = hoy()) {
    const [a, m, d] = nacimiento.split("-").map(Number);
    let e = ref.getFullYear() - a;
    if (ref.getMonth() + 1 < m || (ref.getMonth() + 1 === m && ref.getDate() < d))
        e--;
    return e;
}
export const diasDelMes = (anio, mes) => new Date(anio || 2000, mes, 0).getDate(); // mes 1–12
export const dos = (n) => String(n).padStart(2, "0");
/** DD/MM/AAAA (o solo sus números) → AAAA-MM-DD si la fecha existe y el año va de 1920 a hoy; si no, "". */
export function fechaDeTexto(texto, ref = hoy()) {
    const n = texto.replace(/\D/g, "");
    if (n.length !== 8)
        return "";
    const d = Number(n.slice(0, 2)), m = Number(n.slice(2, 4)), a = Number(n.slice(4));
    if (a < 1920 || a > ref.getFullYear() || m < 1 || m > 12 || d < 1 || d > diasDelMes(a, m))
        return "";
    return `${a}-${dos(m)}-${dos(d)}`;
}
/** Pone las diagonales mientras se escribe: 0512 → 05/12, 05121990 → 05/12/1990. */
export function formatoFecha(texto) {
    const n = texto.replace(/\D/g, "").slice(0, 8);
    return [n.slice(0, 2), n.slice(2, 4), n.slice(4)].filter(Boolean).join("/");
}
