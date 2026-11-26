// TV de «Esquiva la bala» (prototipo de Mini-Juegos, zona aparte). La TV manda: corre las reglas de
// src/personajes/minijuegos/bala.ts con su reloj; los celulares solo dicen «salté a esta hora» (ya en el reloj de la TV).
// Decidió Codex (encargo 2026-11-26-minijuegos-r1): cámara de frente (D4), juicio con el reloj del celular y la TV como
// autoridad (D2). Al empezar se congelan participantes, personajes y lugares; quien se va sigue en la fila (O1).
import { ahora } from "/src/personajes/minijuegos/canal.ts";
import { acotarToque, MAX_INCERTIDUMBRE } from "/src/personajes/minijuegos/reloj.ts";
import { avanzar, crearPartida, empezar, llegada, posBala, ranking, saltar, CONFIG_BALA } from "/src/personajes/minijuegos/bala.ts";
import { crearTV } from "./tv-comun.js";

const q = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const escena = EscenaMJ.crear($("lienzo"), { fov: 32 });
const ALTO_SALTO = 1.5; // unidades: la bala va a ~0.55 del piso y mide 0.34 de radio
const HUECO = 0.9;
const cfg = CONFIG_BALA;
const pista = EscenaMJ.pista(escena.scene, 40);
let partida = null, pid = "", numPartida = 0, cuenta = 0, participantes = [], extremos = [-6, 6];
const balas = new Map(); // id → malla
const saltosVista = new Map(); // jugador → [{s, aire}…] (para dibujar)

const tv = crearTV({
  juego: "bala", escena,
  alUnirse: () => { if (tv.fase === "lobby") acomodar(); botonEmpezar(); },
  alSalir: () => { if (tv.fase === "lobby") acomodar(); botonEmpezar(); },
  alDesconectar: j => tv.pop(j, "Se desconectó", "#c9d2ff"),
  alMensaje: (j, m) => {
    if (m.tipo === "salto") recibirSalto(j, m.d);
    else if (m.tipo === "empezar" && tv.esAnfitrion(j)) iniciar();
    else if (m.tipo === "otra" && tv.fase === "fin" && tv.esAnfitrion(j)) aLobby();
  },
});
tv.extra = () => ({
  pid, ronda: partida ? partida.ronda : 0,
  participantes,
  vivos: partida ? [...partida.vivos] : [...tv.jugadores.keys()],
  ranking: partida && partida.fase === "fin" ? ranking(partida) : null,
  puedeEmpezar: tv.todosListos(),
});

/** Salto de un celular: misma partida, reloj confiable y hora válida (Codex O3/O4); si no, se rechaza y se le avisa. */
function recibirSalto(j, d) {
  const llego = ahora();
  const no = motivo => tv.canal.enviar("eco", { para: j.id, ok: false, motivo });
  if (!partida || tv.fase !== "juego" || d.pid !== pid) return no("otra partida");
  if (d.inc > MAX_INCERTIDUMBRE) return no("reloj");
  const s = acotarToque(d.s, llego);
  if (s === null) return no("hora");
  const salto = saltar(partida, j.id, s);
  if (salto) dibujarSalto(j, salto);
  tv.canal.enviar("eco", { para: j.id, ok: !!salto, motivo: salto ? "" : "en el aire", atraso: Math.round(llego - s) });
}

// ---------- Acomodo y cámara ----------
function fila() { return [...tv.jugadores.values()].sort((a, b) => a.n - b.n); }
function acomodar() {
  const lista = fila();
  const anchos = lista.map(j => (j.figura ? Math.max(1.6, j.figura.ancho()) : 1.8));
  const total = anchos.reduce((a, b) => a + b, 0) + HUECO * Math.max(0, lista.length - 1);
  let x = -total / 2;
  lista.forEach((j, i) => { j.x = x + anchos[i] / 2; x += anchos[i] + HUECO; if (j.figura) { j.figura.obj.position.set(j.x, 0, 0); j.figura.obj.rotation.y = 0; } });
  // Los avisos van justo donde empieza la bala, a cada lado de la fila (Codex O9).
  extremos = lista.length ? [Math.min(...lista.map(j => j.x)) - cfg.margenPista, Math.max(...lista.map(j => j.x)) + cfg.margenPista] : [-6, 6];
  pista.avisos[0].position.x = extremos[0] - 0.6; pista.avisos[1].position.x = extremos[1] + 0.6;
  const alto = Math.max(2.7, ...lista.map(j => (j.figura ? j.figura.alto() : 2.7)));
  camara(extremos[1] - extremos[0] + 2, alto);
}
/** De frente (D4). Cabe a lo ancho la pista con sus avisos y a lo alto el más alto, con espacio arriba para nombres. */
function camara(ancho, alto) {
  const c = escena.camera;
  const tanV = Math.tan((c.fov * Math.PI) / 360), tanH = tanV * c.aspect;
  const d = Math.max(14, (ancho / 2) / tanH, (alto * 1.9) / (2 * tanV));
  c.position.set(0, 4.2, d); c.lookAt(0, alto * 0.62, 0);
}
addEventListener("resize", () => { if (tv.fase === "lobby") acomodar(); else camara(extremos[1] - extremos[0] + 2, 2.7); });

function botonEmpezar() {
  const b = $("empezar");
  const listos = tv.todosListos();
  b.disabled = !listos || tv.fase !== "lobby";
  b.textContent = !tv.jugadores.size ? "¡Empezar!" : !listos ? "Cargando personajes…" : tv.jugadores.size < 2 ? "¡Empezar! (práctica)" : "¡Empezar!";
  $("sub").textContent = tv.jugadores.size ? `${tv.jugadores.size} en la fila · toca SALTA en tu celular cuando te llegue la bala` : "Entra desde tu celular";
  if (tv.fase === "lobby") tv.difundir();
}
setInterval(() => { if (tv.fase === "lobby") botonEmpezar(); }, 1000);
$("empezar").addEventListener("click", () => { if (tv.fase === "fin") aLobby(); else iniciar(); });

// ---------- Partida ----------
function iniciar() {
  if (tv.fase !== "lobby" || !tv.todosListos()) return;
  acomodar();
  const lista = fila();
  participantes = lista.map(j => j.id);
  // Mismo ancho de cuerpo para todos (Codex D3): elegir a Hulk no castiga.
  partida = crearPartida(lista.map(j => ({ id: j.id, x: j.x })), {}, Date.now());
  pid = "p" + (++numPartida) + "-" + Math.floor(Math.random() * 1e6).toString(36);
  saltosVista.clear();
  lista.forEach(j => { j.fuera = false; j.etiqueta.classList.remove("fuera"); if (j.figura) j.figura.anim("nervios"); });
  $("empezar").classList.add("oculto"); $("podio").classList.add("oculto"); $("sala").classList.add("oculto");
  $("marcador").classList.remove("oculto");
  tv.fase = "cuenta";
  cuenta = ahora() + 3000;
}

function aLobby() {
  partida = null; pid = ""; participantes = [];
  balas.forEach(b => escena.scene.remove(b)); balas.clear();
  tv.limpiarDesconectados();
  fila().forEach(j => { j.fuera = false; j.etiqueta.classList.remove("fuera"); if (j.figura) j.figura.anim("reposo"); });
  $("podio").classList.add("oculto"); $("empezar").classList.remove("oculto"); $("sala").classList.remove("oculto");
  $("marcador").classList.add("oculto"); $("centro").classList.add("oculto");
  tv.fase = "lobby"; acomodar(); botonEmpezar();
}

function dibujarSalto(j, salto) {
  const l = saltosVista.get(j.id) || [];
  l.push(salto); if (l.length > 8) l.shift();
  saltosVista.set(j.id, l);
  if (!j.figura) return;
  const dura = (cfg.despegueMs + salto.aire + 220) / 1000;
  // Si el toque llegó tarde por la red, el clip arranca ya avanzado para que el salto quede donde debe.
  j.figura.anim("saltar", { dura, desde: Math.max(0, (ahora() - salto.s) / 1000), mezcla: 0.05, luego: () => j.figura.anim(j.fuera ? "eliminado" : "nervios") });
}

function alturaSalto(id, t) {
  for (const x of saltosVista.get(id) || []) {
    const u = (t - x.s - cfg.despegueMs) / x.aire;
    if (u > 0 && u < 1) return ALTO_SALTO * 4 * u * (1 - u);
  }
  return 0;
}

function eventos(evs) {
  for (const ev of evs) {
    const j = ev.id ? tv.jugadores.get(ev.id) : null;
    if (ev.tipo === "ronda") {
      $("ronda").textContent = ev.ronda;
      ev.balas.forEach(b => { const m = EscenaMJ.bala(); m.scale.x = b.dir; m.visible = false; escena.scene.add(m); balas.set(b.id, m); });
      bots(ev.balas, ev.aire);
      tv.canal.enviar("evento", { tipo: "ronda", pid, ronda: ev.ronda, aire: ev.aire, balas: ev.balas.map(b => ({ dir: b.dir, llegadas: partida.jugadores.map(x => [x.id, llegada(b, x.x)]) })) });
    } else if (ev.tipo === "golpe") {
      if (j) {
        j.fuera = true; j.etiqueta.classList.add("fuera");
        if (j.figura) j.figura.anim("herido", { mezcla: 0.05, luego: () => j.figura.anim("eliminado") });
        tv.pop(j, "¡PUM!", "#e8343a");
      }
      tv.canal.enviar("evento", { tipo: "golpe", pid, id: ev.id });
    } else if (ev.tipo === "salvado") {
      if (j) tv.pop(j, "¡Salvado!", "#8cf09a");
      tv.canal.enviar("evento", { tipo: "salvado", pid, id: ev.id });
    } else if (ev.tipo === "fin") {
      tv.fase = "fin";
      const r = ev.ranking;
      r.forEach(l => { const x = tv.jugadores.get(l.id); if (x && x.figura && l.lugar === 1) x.figura.anim("festejo", { luego: () => x.figura.anim("festejo") }); });
      const p = $("podio"); p.innerHTML = "";
      r.forEach(l => { const x = tv.jugadores.get(l.id); if (!x) return; const d = document.createElement("div"); d.textContent = `${l.lugar}° ${x.nombre}`; d.style.background = x.color.base; d.style.color = x.color.texto; p.appendChild(d); });
      p.classList.remove("oculto");
      const ganadores = r.filter(l => l.lugar === 1).map(l => tv.jugadores.get(l.id)?.nombre).filter(Boolean);
      const c = $("centro"); c.classList.add("chico"); c.textContent = ganadores.length === 1 ? `¡Gana ${ganadores[0]}!` : ev.porTiempo ? "¡Tiempo! Empate" : "¡Empate!"; c.classList.remove("oculto");
      setTimeout(() => { if (tv.fase === "fin") { const b = $("empezar"); b.classList.remove("oculto"); b.disabled = false; b.textContent = "Otra vez"; } }, 2500);
    }
  }
}

// ---------- Jugadores de prueba (?bots=N): saltan con un error al azar, para probar sin celulares ----------
const NOMBRES_BOT = ["Beto", "Caro", "Dani", "Eli", "Fer"];
async function ponerBots() {
  const n = Math.min(5, Number(q.get("bots")) || 0);
  await tv.listo;
  const lista = tv.disponibles();
  for (let i = 0; i < n; i++) await tv.unir("bot" + (i + 1), { nombre: NOMBRES_BOT[i], personaje: lista[(i + 1) % lista.length] }, true);
}
function bots(balasRonda, aire) {
  partida.jugadores.map(x => tv.jugadores.get(x.id)).filter(j => j && j.bot && partida.vivos.has(j.id)).forEach((j, i) => {
    const error = 70 + i * 50 + partida.ronda * 18; // se equivocan más con la velocidad
    const x = partida.jugadores.find(p => p.id === j.id).x;
    balasRonda.forEach(b => {
      const s = llegada(b, x) - cfg.despegueMs - aire / 2 + (Math.random() * 2 - 1) * error * 2;
      setTimeout(() => { if (!partida) return; const ok = saltar(partida, j.id, s); if (ok) dibujarSalto(j, ok); }, Math.max(0, s - ahora()));
    });
  });
}

// ---------- Reglas: con su propio reloj (cada 20 ms), aparte del dibujo ----------
// Así la TV sigue juzgando aunque su pestaña no se vea (el navegador deja de dibujar las pestañas ocultas).
setInterval(() => {
  const t = ahora();
  if (tv.fase === "cuenta") {
    const falta = Math.ceil((cuenta - t) / 1000);
    const c = $("centro"); c.classList.remove("oculto", "chico"); c.textContent = falta > 0 ? String(falta) : "¡YA!";
    if (t >= cuenta) { tv.fase = "juego"; setTimeout(() => c.classList.add("oculto"), 600); eventos(empezar(partida, t)); }
  }
  if (partida && tv.fase === "juego") {
    eventos(avanzar(partida, t));
    $("vivos").textContent = partida.vivos.size;
  }
}, 20);

// ---------- Cuadro por cuadro: solo dibujo ----------
escena.alCuadro(dt => {
  const t = ahora();
  // Balas y avisos.
  if (partida) {
    let avisoIzq = false, avisoDer = false;
    partida.balas.forEach(b => {
      const m = balas.get(b.id); if (!m) return;
      const x = posBala(b, t);
      m.visible = t >= b.t0 && x >= extremos[0] - 1 && x <= extremos[1] + 1;
      m.position.set(x, 0.55, pista.zBala);
      m.userData.estela.material.opacity = 0.35 + Math.random() * 0.3;
      if (t >= b.t0 - cfg.avisoMs && t < b.t0 + 200) { if (b.dir === 1) avisoIzq = true; else avisoDer = true; }
    });
    pista.avisos[0].material.emissive.setHex(avisoIzq && (t % 300 < 170) ? 0xff2a1a : 0x000000);
    pista.avisos[1].material.emissive.setHex(avisoDer && (t % 300 < 170) ? 0xff2a1a : 0x000000);
    balas.forEach((m, id) => { if (!partida.balas.some(b => b.id === id)) { escena.scene.remove(m); balas.delete(id); } });
  }
  tv.jugadores.forEach(j => {
    if (!j.figura) return;
    j.figura.update(dt);
    j.figura.obj.position.y = partida ? alturaSalto(j.id, t) : 0;
  });
  tv.etiquetas();
});

acomodar(); botonEmpezar(); ponerBots();
window.__bala = { tv, get partida() { return partida; }, get pid() { return pid; }, iniciar, aLobby };
