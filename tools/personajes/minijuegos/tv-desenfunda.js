// La TV decide el plan, recibe horas del reloj compartido y juzga. El celular solo manda un toque.
import { acotarToque, MAX_INCERTIDUMBRE } from "/src/personajes/minijuegos/reloj.ts";
import { avanzar, crearPartida, empezar, ranking, tocar } from "/src/personajes/minijuegos/desenfunda.ts";
import { crearEncuadreFranjas, crearTV, lucirPoder, ahoraJuego as ahora, aJuego } from "./tv-comun.js";

const q = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const escena = EscenaMJ.crear($("lienzo"), { fov: 32 });
const { franja, encuadrar } = crearEncuadreFranjas(escena);
EscenaMJ.pista(escena.scene, 40);
let partida = null, pid = "", numPartida = 0, cuenta = 0, participantes = [];
let anchoFila = 14, altoFila = 2.7;
const tv = crearTV({
  juego: "desenfunda", escena, topeEtiquetas: () => franja() + 62,
  alUnirse: () => { if (tv.fase === "lobby") acomodar(); botonEmpezar(); },
  alSalir: () => { if (tv.fase === "lobby") acomodar(); botonEmpezar(); },
  alDesconectar: j => tv.pop(j, "Se desconectó", "#c9d2ff"),
  alMensaje: (j, m) => {
    // El contrato existente permite «salto»: aquí representa el toque de DISPARA.
    if (m.tipo === "salto") recibirToque(j, m.d);
    else if (m.tipo === "empezar" && tv.esAnfitrion(j)) iniciar();
    else if (m.tipo === "otra" && tv.fase === "fin" && tv.esAnfitrion(j)) aLobby();
  },
});
tv.extra = () => ({
  pid, ronda: partida?.ronda || 0, participantes,
  activa: partida?.fase === "ronda",
  tocados: partida ? [...partida.toques.keys()] : [],
  adelantados: partida ? [...partida.adelantados] : [],
  puntos: partida ? Object.fromEntries(partida.puntos) : {},
  ranking: partida?.fase === "fin" ? ranking(partida) : null,
  puedeEmpezar: tv.todosListos(),
}); // No difundir el estado de reglas completo: contiene la hora futura del YA.

function recibirToque(j, d) {
  const llego = ahora();
  if (partida && tv.fase === "juego") eventos(avanzar(partida, llego));
  const no = motivo => tv.canal.enviar("eco", { para: j.id, ok: false, motivo });
  if (!partida || tv.fase !== "juego" || partida.fase !== "ronda" || d.pid !== pid) return no("otra ronda");
  if (!Number.isFinite(d.inc) || d.inc > MAX_INCERTIDUMBRE) return no("reloj");
  const s = acotarToque(aJuego(d.s), llego);
  if (s === null) return no("hora");
  const repetido = partida.toques.has(j.id);
  eventos(tocar(partida, j.id, s, llego));
  const ok = !repetido && partida.toques.has(j.id);
  tv.canal.enviar("eco", { para: j.id, ok, motivo: ok ? "" : "toque ignorado", atraso: Math.round(llego - s) });
  tv.difundir();
}
function fila() { return [...tv.jugadores.values()].sort((a, b) => a.n - b.n); }
function puntos() {
  fila().forEach(j => {
    let m = j.etiqueta.querySelector(".puntos-ronda");
    if (!m) { m = document.createElement("div"); m.className = "puntos-ronda"; j.etiqueta.prepend(m); }
    const n = partida?.puntos.get(j.id) || 0;
    m.textContent = `${n} ${n === 1 ? "ronda" : "rondas"}`;
  });
}
function acomodar() {
  const lista = fila();
  const anchos = lista.map(j => j.figura ? Math.max(1.6, j.figura.ancho()) : 1.8);
  const total = anchos.reduce((a, b) => a + b, 0) + 0.9 * Math.max(0, lista.length - 1);
  let x = -total / 2;
  lista.forEach((j, i) => {
    j.x = x + anchos[i] / 2; x += anchos[i] + 0.9;
    if (j.figura) { j.figura.obj.position.set(j.x, 0, 0); j.figura.obj.rotation.y = 0; }
  });
  anchoFila = Math.max(10, total + 3);
  altoFila = Math.max(2.7, ...lista.map(j => j.figura ? j.figura.alto() : 2.7));
  camara(); puntos();
}
function camara() {
  encuadrar(anchoFila, altoFila);
  document.documentElement.style.setProperty("--franja-tv", franja() + "px");
}
addEventListener("resize", camara);
function botonEmpezar() {
  if (tv.fase !== "lobby") return;
  const listos = tv.todosListos(), b = $("empezar");
  b.disabled = !listos;
  b.textContent = !tv.jugadores.size ? "¡Empezar!" : !listos ? "Cargando personajes…" : tv.jugadores.size < 2 ? "¡Empezar! (práctica)" : "¡Empezar!";
  $("sub").textContent = tv.jugadores.size ? "Quietos. Toca DISPARA solo al ver ¡YA! · 5 rondas" : "Entra desde tu celular";
  tv.difundir();
}
$("empezar").onclick = () => { if (tv.fase === "fin") aLobby(); else iniciar(); };
setInterval(botonEmpezar, 1000);
function letrero(texto, chico = false, ya = false) {
  const c = $("centro"); c.textContent = texto;
  c.classList.remove("oculto"); c.classList.toggle("chico", chico); c.classList.toggle("ya", ya);
}
function iniciar() {
  if (tv.fase !== "lobby" || !tv.todosListos()) return;
  acomodar(); numPartida++;
  participantes = fila().map(j => j.id);
  partida = crearPartida(fila(), {}, Date.now()); pid = "";
  fila().forEach(j => { j.fuera = false; j.etiqueta.classList.remove("fuera"); j.figura?.anim("nervios"); });
  puntos();
  ["empezar", "podio", "sala"].forEach(id => $(id).classList.add("oculto"));
  $("marcador").classList.remove("oculto"); $("ronda").textContent = "1";
  cuenta = ahora() + 3000; tv.fase = "cuenta";
}
function aLobby() {
  partida = null; pid = ""; participantes = [];
  tv.limpiarDesconectados();
  fila().forEach(j => { j.fuera = false; j.etiqueta.classList.remove("fuera"); j.figura?.anim("reposo"); });
  ["podio", "marcador", "centro"].forEach(id => $(id).classList.add("oculto"));
  ["empezar", "sala"].forEach(id => $(id).classList.remove("oculto"));
  tv.fase = "lobby"; acomodar(); botonEmpezar();
}
function eventos(evs) {
  for (const ev of evs) {
    if (ev.tipo === "ronda") {
      // Un token nuevo por ronda, dentro de los 20 caracteres admitidos por canal.ts.
      pid = `${numPartida}-${ev.ronda}-${Math.random().toString(36).slice(2, 8)}`;
      $("ronda").textContent = ev.ronda;
      fila().forEach(j => { j.fuera = false; j.etiqueta.classList.toggle("fuera", j.desconectado); j.figura?.anim("nervios"); });
      letrero("Quietos…", true);
    } else if (ev.tipo === "amago") letrero(ev.texto);
    else if (ev.tipo === "ya") { letrero("¡YA!", false, true); bots(); }
    else if (ev.tipo === "adelantado") {
      const j = tv.jugadores.get(ev.id);
      if (j) {
        j.fuera = true; j.etiqueta.classList.add("fuera");
        j.figura?.anim("herido", { mezcla: 0.05, luego: () => j.figura.anim("reposo") });
        tv.pop(j, "¡Adelantado!", "#e8343a");
      }
    } else if (ev.tipo === "gana") {
      ev.ids.forEach(id => {
        const j = tv.jugadores.get(id);
        // El disparo es su poder principal (rayos de Cíclope, palma de Iron Man); sin poderes, su especial o un golpe.
        if (j?.figura) lucirPoder(j, escena).then(d => { if (!d) j.figura.anim(j.figura.tiene("especial") ? "especial" : "golpe", { mezcla: 0.05 }); });
        tv.pop(j, `+1 · ${Math.round(ev.reaccionMs)} ms`, "#8cf09a");
      });
      const nombres = ev.ids.map(id => tv.jugadores.get(id)?.nombre || "Jugador");
      letrero(nombres.length === 1 ? `¡${nombres[0]}!` : "¡Ronda compartida!", true);
      puntos();
    } else if (ev.tipo === "sinGanador") letrero("Nadie disparó a tiempo", true);
    else if (ev.tipo === "fin") {
      tv.fase = "fin";
      $("marcador").classList.add("oculto");
      const p = $("podio"); p.replaceChildren();
      ev.ranking.forEach(l => {
        const j = tv.jugadores.get(l.id); if (!j) return;
        const d = document.createElement("div"); d.textContent = `${l.lugar}° ${j.nombre} · ${l.rondas}`;
        d.style.background = j.color.base; d.style.color = j.color.texto; p.appendChild(d);
      });
      p.classList.remove("oculto");
      const ganadores = ev.ranking.filter(l => l.lugar === 1);
      letrero(ganadores.length === 1 ? `¡Gana ${tv.jugadores.get(ganadores[0].id)?.nombre || "Jugador"}!` : "¡Empate!", true);
      const b = $("empezar"); b.classList.remove("oculto"); b.disabled = false; b.textContent = "Otra vez";
    }
    tv.canal.enviar("evento", { ...ev, pid });
  }
  if (evs.length) tv.difundir();
}
// Bots: reaccionan cuando se emite el YA; no reciben el plan futuro.
async function ponerBots() {
  const n = Math.max(0, Math.min(5, Number(q.get("bots")) || 0));
  await tv.listo; const lista = tv.disponibles();
  for (let i = 0; i < n; i++) await tv.unir(`bot${i + 1}`, { nombre: ["Beto", "Caro", "Dani", "Eli", "Fer"][i], personaje: lista[(i + 1) % lista.length] }, true);
}
function bots() {
  const token = pid;
  fila().filter(j => j.bot).forEach(j => setTimeout(() => {
    if (partida && tv.fase === "juego" && pid === token) recibirToque(j, { pid: token, s: ahora(), inc: 0 });
  }, 180 + Math.random() * 500));
}
setInterval(() => {
  const t = ahora();
  if (tv.fase === "cuenta") {
    const falta = Math.ceil((cuenta - t) / 1000);
    letrero(falta > 0 ? String(falta) : "Quietos…");
    if (t >= cuenta) { tv.fase = "juego"; eventos(empezar(partida, t)); }
  }
  if (partida && tv.fase === "juego") eventos(avanzar(partida, t));
}, 20);
escena.alCuadro(dt => {
  tv.jugadores.forEach(j => j.figura?.update(dt));
  tv.etiquetas();
});
acomodar(); botonEmpezar(); ponerBots();
window.__desenfunda = { tv, get partida() { return partida; }, get pid() { return pid; }, iniciar, aLobby };
