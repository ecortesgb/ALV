// Convierte el contenido de la Edición Fin de Semana (content.js) al formato de paquetes de la plataforma.
// Se corrió una vez para migrar; se deja para saber de dónde salió cada carta.
// Uso: node tools/convertir-contenido.mjs <ruta a content.js viejo>
import fs from "node:fs";
import vm from "node:vm";

const origen = process.argv[2];
if (!origen) { console.error("Falta la ruta a content.js"); process.exit(1); }
const ctx = {};
vm.runInNewContext(fs.readFileSync(origen, "utf8") + "\n;this.C=C;", ctx);
const C = ctx.C;

// Cartas que rompen las reglas de seguridad de la plataforma: no se migran.
const FUERA = [
  "Haz tu mejor clavado",            // saltar en alberca
  "Aguanta la respiración",          // aguantar la respiración
  "Métete a la alberca con la ropa", // alberca con ropa y posible alcohol
  "Métete a la alberca en menos",    // castigo con prisa en la orilla
  "Prepara un trago inventado",      // obliga a otro a tomar
  "Cada quien hace un clavado",      // clavados en alberca
];
const fuera = t => FUERA.some(f => t.startsWith(f));

// Escenarios viejos → nuevos. ALVrasa (asador) pasa a Campamento y ALVelada (noche en sala) a Casa; se activan después.
const ESC = { g: null, parque: "parque", alv: "alverca", lum: "fogata", asa: "campamento", vel: "casa" };
const cartas = [];
let omitidas = [];
function agrega(mazo, i, esc, nivel, texto, bandera, extra = {}) {
  if (fuera(texto)) { omitidas.push(texto); return; }
  cartas.push({
    id: `${mazo}-${String(i + 1).padStart(3, "0")}`,
    mazo,
    escenario: ESC[esc] ?? null,
    intensidad: nivel,
    dificultad: 1,
    texto,
    adulto: bandera === "h",
    drunk: bandera === "d",
    esfuerzo: bandera === "s" ? "alto" : "ninguno",
    pidePareja: texto.includes("{pareja}") || bandera === "h",
    minJugadores: texto.includes("{alguien}") ? 3 : 2,
    ...extra,
  });
}

C.verdad.forEach(([e, n, t, b], i) => agrega("verdad", i, e, n, t, b));
C.reto.forEach(([e, n, t, b], i) => agrega("reto", i, e, n, t, b));
C.yn.forEach(([e, n, t, b], i) => agrega("yo-nunca", i, e, n, "Yo nunca " + t, b, { minJugadores: 3 }));
C.qm.forEach(([e, n, t, b], i) => agrega("mas-probable", i, e, n, "¿Quién es más probable que " + t + "?", b, { minJugadores: 3 }));
C.qp.forEach(([e, n, a, bOpt, b], i) => agrega("que-prefieres", i, e, n, a, b, { opcionB: bOpt }));
C.pareja.forEach(([e, n, t, b], i) => agrega("conoces", i, e, n, t, b, { pidePareja: true }));
C.palabra.forEach(([e, w, prohibidas], i) => agrega("palabra", i, e, 1, w, undefined, { prohibidas }));
C.castigo.forEach(([e, t, b], i) => agrega("castigo", i, e, 2, t, b));
C.compe.forEach(([e, n, d, formato, b], i) => {
  if (fuera(d)) { omitidas.push(n); return; }
  agrega("competencia", i, e, 1, n, b, { descripcion: d, formato });
});
C.lista.forEach((t, i) => agrega("lista", i, "g", 1, t));

// Retos nuevos adaptados a cada escenario (definición de la plataforma, Entregable 6).
const NUEVOS = [
  ["parque", 1, "Encuentra en 2 minutos algo que represente a {pareja}. Siempre a la vista del grupo."],
  ["parque", 1, "Foto grupal imitando una portada de disco."],
  ["parque", 2, "Sigue las pistas que esconda {alguien} en menos de 5 minutos, sin salir del área marcada."],
  ["lum", 2, "Dale un bombón asado a {pareja} en la boca. Déjalo enfriar 10 segundos antes."],
  ["lum", 1, "Canta una canción con la voz más dramática que tengas."],
  ["alv", 1, "Dale de beber agua a {pareja} sin usar las manos."],
  ["alv", 1, "Haz la mímica de un animal marino dentro del agua hasta que adivinen."],
  ["alv", 2, "Cuéntale un secreto al oído a {pareja} mientras flotan."],
  ["vel", 2, "Baile lento de 30 segundos con {pareja}."],
  ["vel", 1, "Haz un brindis improvisado para {alguien}."],
  ["asa", 1, "Prepárale a {pareja} el taco perfecto y descríbelo como chef famoso."],
];
NUEVOS.forEach(([e, n, t], i) => agrega("reto-escenario", i, e, n, t));
const IVA = ["Impuesto a las Verdades Ajenas: cuenta una verdad de {alguien}, solo si te da permiso."];
IVA.forEach((t, i) => agrega("castigo-iva", i, "g", 2, t));

const impostor = Object.entries(C.imp).map(([id, tema]) => ({
  id, nombre: tema.n, adulto: !!tema.hot, escenario: ESC[id] ?? null, palabras: tema.w,
}));

// "Pulmón de acero" y "Pelea de gallos" se marcan como esfuerzo alto: el filtro de alberca las saca.
const paquete = { id: "base", version: 1, nombre: "ALV base", cartas, impostor };
fs.writeFileSync(new URL("../src/content/packs/base.json", import.meta.url), JSON.stringify(paquete, null, 1) + "\n");
console.log(`cartas: ${cartas.length} · temas de impostor: ${impostor.length} · omitidas por seguridad: ${omitidas.length}`);
omitidas.forEach(t => console.log("  - " + t));
