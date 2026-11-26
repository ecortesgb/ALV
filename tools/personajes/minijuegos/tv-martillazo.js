// La TV conserva las fases de las barras y calcula el puntaje; el celular solo manda la hora del toque.
import { ahora } from "/src/personajes/minijuegos/canal.ts";
import { acotarToque, MAX_INCERTIDUMBRE } from "/src/personajes/minijuegos/reloj.ts";
import { avanzar, crearPartida, empezar, posicion, ranking, tocar } from "/src/personajes/minijuegos/martillazo.ts";
import { crearTV } from "./tv-comun.js";

const q = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const escena = EscenaMJ.crear($("lienzo"), { fov: 32 });
EscenaMJ.pista(escena.scene, 40);
let partida = null, pid = "", numPartida = 0, cuenta = 0, participantes = [];
let anchoFila = 14, altoFila = 2.7;
const puestos = new Map();
const tv = crearTV({
  juego: "martillazo", escena,
  alUnirse: () => { if (tv.fase === "lobby") acomodar(); botonEmpezar(); },
  alSalir: () => { if (tv.fase === "lobby") acomodar(); botonEmpezar(); },
  alDesconectar: j => tv.pop(j, "Se desconectó", "#c9d2ff"),
  alMensaje: (j, m) => {
    if (m.tipo === "salto") recibirToque(j, m.d);
    else if (m.tipo === "empezar" && tv.esAnfitrion(j)) iniciar();
    else if (m.tipo === "otra" && tv.fase === "fin" && tv.esAnfitrion(j)) aLobby();
  },
});
tv.extra = () => ({
  pid, intento: partida?.intento || 0, participantes,
  activa: partida?.fase === "intento" && partida.juicio === null,
  tocados: partida ? [...partida.toques.keys()] : [],
  puntos: partida ? Object.fromEntries(partida.puntos) : {},
  ranking: partida?.fase === "fin" ? ranking(partida) : null,
  puedeEmpezar: tv.todosListos(),
}); // Las fases y las posiciones de las barras nunca se envían al celular.

function recibirToque(j, d) {
  const llego = ahora();
  if (partida && tv.fase === "juego") eventos(avanzar(partida, llego));
  const no = motivo => tv.canal.enviar("eco", { para: j.id, ok: false, motivo });
  if (!partida || tv.fase !== "juego" || partida.fase !== "intento" || d.pid !== pid) return no("otro intento");
  if (!Number.isFinite(d.inc) || d.inc < 0 || d.inc > MAX_INCERTIDUMBRE) return no("reloj");
  const s = acotarToque(d.s, llego);
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
    m.textContent = `Mejor: ${partida?.puntos.get(j.id) || 0}`;
  });
}
function acomodar() {
  const lista = fila();
  const anchos = lista.map(j => j.figura ? Math.max(1.6, j.figura.ancho()) : 1.8);
  const total = anchos.reduce((a, b) => a + b, 0) + 1.3 * Math.max(0, lista.length - 1);
  let x = -total / 2;
  lista.forEach((j, i) => {
    j.x = x + anchos[i] / 2; x += anchos[i] + 1.3;
    if (j.figura) { j.figura.obj.position.set(j.x, 0, 0); j.figura.obj.rotation.y = 0; }
  });
  anchoFila = Math.max(10, total + 4);
  altoFila = Math.max(2.7, ...lista.map(j => j.figura ? j.figura.alto() : 2.7));
  camara(); puntos();
}
function camara() {
  const c = escena.camera, tanV = Math.tan(c.fov * Math.PI / 360);
  const d = Math.max(14, anchoFila / (2 * tanV * c.aspect), altoFila * 2 / (2 * tanV));
  c.position.set(0, 4.2, d); c.lookAt(0, altoFila * 0.62, 0);
}
addEventListener("resize", camara);
function botonEmpezar() {
  if (tv.fase !== "lobby") return;
  const listos = tv.todosListos(), b = $("empezar");
  b.disabled = !listos;
  b.textContent = !tv.jugadores.size ? "¡Empezar!" : !listos ? "Cargando personajes…" : tv.jugadores.size < 2 ? "¡Empezar! (práctica)" : "¡Empezar!";
  $("sub").textContent = tv.jugadores.size ? "Golpea en el centro · zona perfecta 47–53 · cuenta tu mejor de 3" : "Entra desde tu celular";
  tv.difundir();
}
$("empezar").onclick = () => { if (tv.fase === "fin") aLobby(); else iniciar(); };
setInterval(botonEmpezar, 1000);
function letrero(texto, chico = false) {
  const c = $("centro"); c.textContent = texto;
  c.classList.remove("oculto"); c.classList.toggle("chico", chico);
}
function animar(j, preferida) {
  if (!j?.figura) return;
  const f = j.figura;
  const clip = [preferida, "golpe", "festejo", "derrota", "reposo"].find(n => f.tiene(n));
  if (clip) f.anim(clip, { mezcla: 0.05 });
}
function iniciar() {
  if (tv.fase !== "lobby" || !tv.todosListos()) return;
  acomodar(); numPartida++;
  participantes = fila().map(j => j.id);
  partida = crearPartida(fila(), {}, Date.now()); pid = "";
  fila().forEach(j => { j.etiqueta.classList.remove("fuera"); j.figura?.anim("reposo"); });
  puntos();
  ["empezar", "podio", "sala"].forEach(id => $(id).classList.add("oculto"));
  $("marcador").classList.remove("oculto"); $("intento").textContent = "1";
  cuenta = ahora() + 3000; tv.fase = "cuenta";
}
function aLobby() {
  limpiarPuestos(); partida = null; pid = ""; participantes = [];
  tv.limpiarDesconectados();
  fila().forEach(j => { j.etiqueta.classList.remove("fuera"); j.figura?.anim("reposo"); });
  ["podio", "marcador", "centro"].forEach(id => $(id).classList.add("oculto"));
  ["empezar", "sala"].forEach(id => $(id).classList.remove("oculto"));
  tv.fase = "lobby"; acomodar(); botonEmpezar();
}
function eventos(evs) {
  for (const ev of evs) {
    if (ev.tipo === "intento") {
      pid = `${numPartida}-${ev.intento}-${Math.random().toString(36).slice(2, 8)}`;
      $("intento").textContent = ev.intento;
      $("centro").classList.add("oculto");
      limpiarPuestos();
      fila().forEach(j => { crearPuesto(j); j.figura?.anim("reposo"); });
      bots();
    } else if (ev.tipo === "toque") animar(tv.jugadores.get(ev.id), "golpe");
    else if (ev.tipo === "puntaje") {
      const j = tv.jugadores.get(ev.id), p = puestos.get(ev.id);
      if (p) { p.resultado = ev.resultado; p.t = ahora(); }
      tv.pop(j, `${ev.puntos}${ev.perfecto ? " · ¡PERFECTO!" : ""}`, ev.perfecto ? "#8cf09a" : "#ffcf2e");
      puntos();
    } else if (ev.tipo === "sinToque") {
      tv.pop(tv.jugadores.get(ev.id), "Sin toque · 0", "#c9d2ff");
    } else if (ev.tipo === "fin") {
      tv.fase = "fin";
      const p = $("podio"); p.replaceChildren();
      ev.ranking.forEach(l => {
        const j = tv.jugadores.get(l.id); if (!j) return;
        const d = document.createElement("div"); d.textContent = `${l.lugar}° ${j.nombre} · ${l.puntos}`;
        d.style.background = j.color.base; d.style.color = j.color.texto; p.appendChild(d);
        animar(j, l.lugar === 1 ? "festejo" : "derrota");
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

// Bloques y martillos de formas simples. Cada intento estrena bloque; se reutilizan las geometrías.
const material = color => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).convertSRGBToLinear(), roughness: 0.65 });
const piedra = material("#d6a764"), metal = material("#abb8d1"), madera = material("#714729");
const trozo = new THREE.BoxGeometry(0.57, 0.38, 0.7);
const mango = new THREE.BoxGeometry(0.08, 0.65, 0.08), cabeza = new THREE.BoxGeometry(0.5, 0.25, 0.25);
const grieta = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0.1, 0.8, 0.36), new THREE.Vector3(-0.12, 0.58, 0.36),
  new THREE.Vector3(0.12, 0.4, 0.36), new THREE.Vector3(-0.08, 0.02, 0.36),
]);
const tintaGrieta = new THREE.LineBasicMaterial({ color: "#322431" });
function limpiarPuestos() {
  puestos.forEach(p => { p.barra.remove(); escena.scene.remove(p.bloque, p.martillo); });
  puestos.clear();
}
function crearPuesto(j) {
  const barra = document.createElement("div"); barra.className = "medidor";
  barra.setAttribute("aria-label", `Barra de ${j.nombre}: centro 50, zona perfecta 47 a 53`);
  for (const [clase, texto] of [["zona", ""], ["medio", ""], ["aguja", ""], ["tope", "100"], ["base", "0"]]) {
    const d = document.createElement("span"); d.className = clase; d.textContent = texto; barra.appendChild(d);
  }
  $("capa").appendChild(barra);
  const bloque = new THREE.Group(), piezas = [];
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
    const m = new THREE.Mesh(trozo, piedra); m.position.set((x - 0.5) * 0.58, 0.21 + y * 0.39, 0);
    m.castShadow = true; m.receiveShadow = true; bloque.add(m); piezas.push(m);
  }
  const crack = new THREE.Line(grieta, tintaGrieta); crack.visible = false; bloque.add(crack);
  bloque.position.set(j.x, 0, 1.2);
  const martillo = new THREE.Group();
  const palo = new THREE.Mesh(mango, madera); palo.position.y = -0.32;
  const mazo = new THREE.Mesh(cabeza, metal); mazo.position.y = -0.67;
  martillo.add(palo, mazo); martillo.position.set(j.x + 0.25, 1.5, 1.2); martillo.rotation.z = -1.1;
  escena.scene.add(bloque, martillo);
  puestos.set(j.id, { barra, aguja: barra.querySelector(".aguja"), bloque, piezas, crack, martillo, resultado: null, t: 0 });
}
const v = new THREE.Vector3();
function dibujarPuestos(t) {
  puestos.forEach((p, id) => {
    const j = tv.jugadores.get(id); if (!j?.figura) return;
    const fin = partida.inicioIntento + partida.cfg.sinToqueMs;
    const hora = partida.toques.get(id) ?? Math.min(t, fin);
    p.aguja.style.bottom = posicion(partida, id, hora) + "%";
    p.barra.classList.toggle("listo", partida.toques.has(id) || t >= fin || partida.fase !== "intento");
    v.set(j.x + j.figura.ancho() / 2 + 0.45, j.figura.alto() * 0.55, 0).project(escena.camera);
    p.barra.style.left = ((v.x + 1) / 2) * innerWidth + "px";
    p.barra.style.top = ((1 - v.y) / 2) * innerHeight + "px";
    if (!p.resultado) return;
    const s = Math.max(0, (t - p.t) / 1000);
    const golpe = Math.min(1, s / 0.15);
    const rebote = p.resultado === "rebota" ? Math.min(1, Math.max(0, s - 0.15) / 0.22) : 0;
    p.martillo.rotation.z = -1.1 * (1 - golpe) - 1.35 * Math.sin(rebote * Math.PI / 2);
    p.crack.visible = p.resultado === "agrieta" && s >= 0.15;
    if (p.resultado === "rompe") {
      const vuelo = Math.min(1, Math.max(0, s - 0.15) / 0.5);
      p.piezas.forEach((m, i) => {
        m.position.x = (i % 2 - 0.5) * (0.58 + vuelo * 1.1);
        m.position.y = 0.21 + Math.floor(i / 2) * 0.39 + Math.sin(vuelo * Math.PI) * 0.6 - vuelo * 0.3;
        m.rotation.z = (i % 2 ? 1 : -1) * vuelo;
      });
    }
  });
}
async function ponerBots() {
  const n = Math.max(0, Math.min(5, Number(q.get("bots")) || 0));
  await tv.listo; const lista = tv.disponibles();
  for (let i = 0; i < n; i++) await tv.unir(`bot${i + 1}`, { nombre: ["Beto", "Caro", "Dani", "Eli", "Fer"][i], personaje: lista[(i + 1) % lista.length] }, true);
}
function bots() {
  const token = pid;
  fila().filter(j => j.bot).forEach(j => setTimeout(() => {
    if (partida && tv.fase === "juego" && pid === token) recibirToque(j, { pid: token, s: ahora(), inc: 0 });
  }, 400 + Math.random() * 2200));
}
setInterval(() => {
  const t = ahora();
  if (tv.fase === "cuenta") {
    const falta = Math.ceil((cuenta - t) / 1000);
    letrero(falta > 0 ? String(falta) : "¡GOLPEA!");
    if (t >= cuenta) { tv.fase = "juego"; eventos(empezar(partida, t)); }
  }
  if (partida && tv.fase === "juego") {
    const fase = partida.fase, juicio = partida.juicio;
    eventos(avanzar(partida, t));
    if (partida.fase === "pausa" && fase === "intento") letrero("¡Siguiente bloque!", true);
    if (juicio === null && partida.juicio !== null) tv.difundir();
  }
}, 20);
escena.alCuadro(dt => {
  tv.jugadores.forEach(j => j.figura?.update(dt));
  tv.etiquetas(); dibujarPuestos(ahora());
});
acomodar(); botonEmpezar(); ponerBots();
window.__martillazo = { tv, get partida() { return partida; }, get pid() { return pid; }, iniciar, aLobby };
