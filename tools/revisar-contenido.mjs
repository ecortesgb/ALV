// Cuenta las cartas por eje, nivel y mazo (Temperatura + Voltaje, Maestro v1.52).
// Uso: node tools/revisar-contenido.mjs
import fs from "node:fs";

const base = JSON.parse(fs.readFileSync(new URL("../src/content/packs/base.json", import.meta.url), "utf8"));
// Copia de EJE_DE_MAZO de src/content/catalogo.ts (una prueba revisa que sean iguales).
const EJE = {
  verdad: "temperatura", "yo-nunca": "temperatura", "mas-probable": "temperatura", "que-prefieres": "temperatura", conoces: "temperatura",
  reto: "voltaje", "reto-escenario": "voltaje",
};
const NOMBRE = { temperatura: ["Frío", "Caliente", "Extremo"], voltaje: ["Bajo voltaje", "Alto voltaje", "Sobrecarga"] };

for (const eje of ["temperatura", "voltaje"]) {
  console.log(`\n${eje === "temperatura" ? "TEMPERATURA (preguntas)" : "VOLTAJE (retos)"}`);
  console.log("mazo".padEnd(16) + NOMBRE[eje].map(n => n.padStart(14)).join("") + "   generales · pareja · Drunk · contacto · nuevas");
  for (const mazo of Object.keys(EJE).filter(m => EJE[m] === eje)) {
    const cs = base.cartas.filter(c => c.mazo === mazo);
    const por = [1, 2, 3].map(n => cs.filter(c => c.nivel === n));
    const gen = por.map(p => p.filter(c => c.escenario === null).length).join("/");
    const cuenta = f => cs.filter(f).length;
    console.log(mazo.padEnd(16) + por.map(p => String(p.length).padStart(14)).join("") +
      `   ${gen} · ${cuenta(c => c.pidePareja)} · ${cuenta(c => c.drunk)} · ${cuenta(c => c.contacto)} · ${cuenta(c => c.soloEjes)}`);
  }
}
const sinEje = base.cartas.filter(c => !EJE[c.mazo]);
console.log(`\nSin eje (castigos, palabras, listas, competencia): ${sinEje.length}. Total: ${base.cartas.length}.`);
