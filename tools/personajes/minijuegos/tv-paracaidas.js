// La TV conserva T y juzga. El celular solo manda «abrí a esta hora» en el reloj de la TV.
import { ahora } from "/src/personajes/minijuegos/canal.ts";
import { acotarToque, MAX_INCERTIDUMBRE } from "/src/personajes/minijuegos/reloj.ts";
import { abrir, avanzar, altura, crearPartida, empezar, ranking } from "/src/personajes/minijuegos/paracaidas.ts";
import { crearEncuadreFranjas, crearTV } from "./tv-comun.js";

const q = new URLSearchParams(location.search), $ = id => document.getElementById(id);
const escena = EscenaMJ.crear($("lienzo"), { fov: 32, cielo: 0x293b65 });
const { franja } = crearEncuadreFranjas(escena);
escena.scene.fog = null; escena.camera.far = 5000; escena.camera.updateProjectionMatrix();
const piso = EscenaMJ.pista(escena.scene, 60);
// Metros lógicos → escena. La escala es común a todos, nunca depende del tamaño del personaje.
const METRO = 0.25, DESCENSO = 0.7, ETIQUETA = 62;
let partida = null, pid = "", numPartida = 0, cuenta = 0, participantes = [], bajada = null;
const puestos = new Map();
const tv = crearTV({
  juego: "paracaidas", escena, topeEtiquetas: () => franja() + ETIQUETA,
  alUnirse: () => { if (tv.fase === "lobby") acomodar(); botonEmpezar(); },
  alSalir: () => { if (tv.fase === "lobby") acomodar(); botonEmpezar(); },
  alMensaje: (j, m) => {
    if (m.tipo === "salto") recibirToque(j, m.d);
    else if (m.tipo === "empezar" && tv.esAnfitrion(j)) iniciar();
    else if (m.tipo === "otra" && tv.fase === "fin" && tv.esAnfitrion(j)) aLobby();
  },
});
tv.extra = () => ({
  pid, ronda: partida?.ronda || 0, participantes,
  activa: partida?.fase === "ronda",
  tocados: partida ? [...partida.aperturas.keys()] : [],
  estrellados: partida ? [...partida.resultados].filter(([, h]) => h === null).map(([id]) => id) : [],
  puntos: partida ? Object.fromEntries(partida.puntos) : {},
  ranking: partida?.fase === "fin" ? ranking(partida) : null,
  puedeEmpezar: tv.todosListos(),
}); // No envía T, inicio, impacto, alturas ni el plan de los bots.
function recibirToque(j, d) {
  const llegada = ahora(), no = motivo => tv.canal.enviar("eco", { para: j.id, ok: false, motivo });
  if (partida && tv.fase === "juego") eventos(avanzar(partida, llegada));
  if (!partida || tv.fase !== "juego" || partida.fase !== "ronda" || d.pid !== pid) return no("otra ronda");
  if (!Number.isFinite(d.inc) || d.inc < 0 || d.inc > MAX_INCERTIDUMBRE) return no("reloj");
  const s = acotarToque(d.s, llegada);
  if (s === null) return no("hora");
  const repetido = partida.aperturas.has(j.id);
  eventos(abrir(partida, j.id, s, llegada));
  const ok = !repetido && partida.aperturas.has(j.id);
  tv.canal.enviar("eco", { para: j.id, ok, motivo: ok ? "" : "toque ignorado", atraso: Math.round(llegada - s) });
  tv.difundir();
}
function fila() { return [...tv.jugadores.values()].sort((a, b) => a.n - b.n); }
function animar(j, nombre) {
  const f = j?.figura;
  const clip = f && [nombre, "reposo", "caer", "aterrizar", "ko", "festejo", "derrota", "caminar", "saludo", "golpe"].find(n => f.tiene(n));
  if (clip) f.anim(clip, { mezcla: 0.08 });
}
const material = color => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).convertSRGBToLinear(), roughness: 0.65, side: THREE.DoubleSide });
function limpiarPuestos() {
  puestos.forEach(p => {
    escena.scene.remove(p.paracaidas);
    p.paracaidas.traverse(o => { o.geometry?.dispose(); });
    p.material.dispose(); p.cuerda.dispose(); p.etiqueta.remove();
  });
  puestos.clear();
}
function acomodar() {
  limpiarPuestos();
  const lista = fila(), anchos = lista.map(j => Math.max(3.2, (j.figura?.ancho() || 1.8) * 1.6));
  const total = anchos.reduce((a, b) => a + b + 1, 0);
  let x = -total / 2;
  lista.forEach((j, i) => {
    j.x = x + anchos[i] / 2; x += anchos[i] + 1;
    if (j.figura) { j.figura.obj.position.set(j.x, 0, 0); j.figura.obj.rotation.y = 0; }
    j.aro && (j.aro.visible = true);
    crearPuesto(j, anchos[i] / 2);
  });
  dibujar(ahora());
}
function crearPuesto(j, radio) {
  const alto = j.figura?.alto() || 2.7, paracaidas = new THREE.Group();
  const mat = material(j.color.base), cuerda = new THREE.LineBasicMaterial({ color: "#f4efde" });
  // Domo hemisférico y cuatro cuerdas. Se infla desde el arnés durante los mismos 400 ms lógicos.
  const domo = new THREE.Mesh(new THREE.SphereGeometry(radio, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat);
  const base = alto + 1.1; domo.scale.y = 0.65; domo.position.y = base; paracaidas.add(domo);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, alto * 0.7, 0), new THREE.Vector3(Math.cos(a) * radio, base, Math.sin(a) * radio),
    ]);
    paracaidas.add(new THREE.Line(g, cuerda));
  }
  paracaidas.visible = false; escena.scene.add(paracaidas);
  const etiqueta = document.createElement("div"); etiqueta.className = "altura-individual";
  j.etiqueta.prepend(etiqueta);
  puestos.set(j.id, { paracaidas, domo, material: mat, cuerda, etiqueta, radio, alto,
    techo: base + radio * 0.65, y: 0, enPiso: false, resultado: null, botEn: null });
}

/** Cámara frontal: ajusta también profundidad de los domos y 62 px de etiquetas. Exportada para simular O2. */
export function encuadrarGrupo(camera, limites, anchoPx, altoPx, franjaPx) {
  const tanV = Math.tan(camera.fov * Math.PI / 360), tanH = tanV * anchoPx / altoPx;
  const arriba = franjaPx + ETIQUETA + 12, abajo = altoPx - 24;
  const h = Math.max(24, abajo - arriba), w = Math.max(24, anchoPx - 48);
  const profundidad = limites.profundidad + 0.5;
  const k = altoPx / (2 * tanV), a = arriba - altoPx / 2, b = abajo - altoPx / 2;
  const distancia = profundidad + Math.max(12,
    (limites.maxX - limites.minX) / (2 * tanH) * anchoPx / w,
    ((limites.maxY - limites.minY) * k + (Math.abs(a) + Math.abs(b)) * profundidad) / h - profundidad);
  // La parte trasera del domo también importa: toda la escena está bajo el centro óptico.
  const y = (limites.maxY + (a * distancia + Math.abs(a) * profundidad) / k +
    limites.minY + (b * distancia - Math.abs(b) * profundidad) / k) / 2;
  const x = (limites.minX + limites.maxX) / 2;
  camera.aspect = anchoPx / altoPx; camera.position.set(x, y, distancia);
  camera.lookAt(x, y, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  return { distancia, arriba, abajo };
}
const v = new THREE.Vector3();
function dibujar(t) {
  const lista = fila();
  const cayendo = partida && tv.fase !== "lobby" && tv.fase !== "cuenta";
  const hComun = cayendo ? altura(partida, t) * METRO : 0;
  piso.g.visible = !cayendo || hComun <= 30 * METRO;
  const limites = { minX: -6, maxX: 6, minY: Infinity, maxY: -Infinity, profundidad: 0 };
  lista.forEach(j => {
    const p = puestos.get(j.id); if (!p || !j.figura) return;
    const a = partida?.aperturas.get(j.id);
    let y = hComun;
    if (cayendo && a && a.fin <= partida.impacto + partida.cfg.margenMs && t >= a.fin) {
      y = Math.max(0, a.altura * METRO - Math.max(0, t - a.fin) / 1000 * DESCENSO);
    }
    // Al cerrar el juicio, la pausa trae al piso a los que abrieron alto, antes de la próxima caída.
    if (bajada && p.resultado !== null) y = (bajada.alturas.get(j.id) || 0) * (1 - Math.min(1, (t - bajada.t) / 900));
    if (!cayendo) y = 0;
    p.y = y; j.figura.obj.position.set(j.x, y, 0);
    if (j.aro) j.aro.visible = y === 0;
    if (cayendo && y <= 0 && !p.enPiso && t >= partida.impacto && p.resultado === "aterriza") {
      p.enPiso = true; animar(j, "aterrizar");
    }
    const abierto = cayendo && a && p.resultado !== "estrella";
    p.paracaidas.visible = !!abierto && !p.enPiso;
    const progreso = abierto ? Math.max(0.02, Math.min(1, (t - a.s) / partida.cfg.aperturaMs)) : 0;
    p.paracaidas.position.set(j.x, y, 0); p.paracaidas.scale.set(progreso, 1, progreso);
    p.domo.scale.y = 0.65 * progreso;
    const techo = p.paracaidas.visible ? p.techo : p.alto;
    limites.minX = Math.min(limites.minX, j.x - p.radio);
    limites.maxX = Math.max(limites.maxX, j.x + p.radio);
    limites.minY = Math.min(limites.minY, y);
    limites.maxY = Math.max(limites.maxY, y + techo + 0.35);
    limites.profundidad = Math.max(limites.profundidad, p.radio);
  });
  if (!Number.isFinite(limites.minY)) { limites.minY = 0; limites.maxY = 5.5; }
  if (cayendo && piso.g.visible) limites.minY = 0;
  encuadrarGrupo(escena.camera, limites, innerWidth, innerHeight, franja());
  // Al separarse en vertical, ensancha la fila para conservar también las seis placas legibles.
  const escala = innerHeight / (2 * escena.camera.position.z * Math.tan(escena.camera.fov * Math.PI / 360));
  const paso = Math.max(1, ...lista.map(j => (puestos.get(j.id)?.radio || 1.6) * 2 + 1),
    (Math.min(180, innerWidth * 0.14) + 12) / escala);
  lista.forEach((j, i) => {
    j.x = (i - (lista.length - 1) / 2) * paso;
    const p = puestos.get(j.id);
    if (!p || !j.figura) return;
    j.figura.obj.position.x = j.x; p.paracaidas.position.x = j.x;
    if (j.aro) { j.aro.position.x = j.x; j.aro.position.z = 0; }
  });
  limites.minX = Math.min(-6, ...lista.map(j => j.x - (puestos.get(j.id)?.radio || 1.6)));
  limites.maxX = Math.max(6, ...lista.map(j => j.x + (puestos.get(j.id)?.radio || 1.6)));
  piso.g.scale.x = Math.max(1, (limites.maxX - limites.minX + 12) / 74);
  encuadrarGrupo(escena.camera, limites, innerWidth, innerHeight, franja());
  document.documentElement.style.setProperty("--franja-tv", franja() + "px");
  lista.forEach(j => {
    const p = puestos.get(j.id); if (!p || !j.figura) return;
    // Etiqueta sobre el domo, sin invadirlo. Su caja completa se reserva en el encuadre.
    const techo = p.paracaidas.visible ? p.techo : p.alto;
    v.set(j.x, p.y + techo + 0.35, 0).project(escena.camera);
    j.etiqueta.style.display = "";
    j.etiqueta.style.left = ((v.x + 1) / 2) * innerWidth + "px";
    j.etiqueta.style.top = ((1 - v.y) / 2) * innerHeight + "px";
  });
  $("altimetro").textContent = cayendo ? `${altura(partida, t).toFixed(1)} m` : "— m";
}
function botonEmpezar() {
  if (tv.fase !== "lobby") return;
  const listos = tv.todosListos(), b = $("empezar"); b.disabled = !listos;
  b.textContent = !tv.jugadores.size || listos ? "¡Empezar!" : "Cargando personajes…";
  $("sub").textContent = tv.jugadores.size ? "Abre lo más tarde que puedas · abrir tarda 400 ms · 3 rondas" : "Entra desde tu celular";
  tv.difundir();
}
function letrero(texto) { $("centro").textContent = texto; $("centro").classList.remove("oculto"); }
function iniciar() {
  if (tv.fase !== "lobby" || !tv.todosListos()) return;
  acomodar(); numPartida++; bajada = null;
  participantes = fila().map(j => j.id); partida = crearPartida(fila()); pid = "";
  ["empezar", "podio", "sala"].forEach(id => $(id).classList.add("oculto"));
  $("marcador").classList.remove("oculto"); $("ronda").textContent = "1";
  cuenta = ahora() + 3000; tv.fase = "cuenta";
}
function aLobby() {
  partida = null; pid = ""; participantes = []; bajada = null;
  tv.limpiarDesconectados();
  fila().forEach(j => { j.etiqueta.classList.remove("fuera"); animar(j, "reposo"); });
  ["podio", "marcador", "centro"].forEach(id => $(id).classList.add("oculto"));
  ["empezar", "sala"].forEach(id => $(id).classList.remove("oculto"));
  tv.fase = "lobby"; acomodar(); botonEmpezar();
}
function tabla(filas, final = false) {
  const podio = $("podio"); podio.replaceChildren();
  filas.forEach(l => {
    const j = tv.jugadores.get(l.id); if (!j) return;
    const d = document.createElement("div");
    d.textContent = `${l.lugar}° ${j.nombre} · ${l.puntos} pts${final ? "" : l.altura === null ? " · KO" : ` · ${l.altura.toFixed(1)} m`}`;
    d.style.background = j.color.base; d.style.color = j.color.texto; podio.appendChild(d);
  });
  podio.classList.remove("oculto");
}
function eventos(evs) {
  for (const ev of evs) {
    if (ev.tipo === "ronda") {
      pid = `${numPartida}-${ev.ronda}-${Math.random().toString(36).slice(2, 8)}`; bajada = null;
      $("ronda").textContent = ev.ronda;
      ["centro", "podio"].forEach(id => $(id).classList.add("oculto"));
      acomodar();
      fila().forEach(j => { j.etiqueta.classList.remove("fuera"); animar(j, "caer"); });
      bots();
    } else if (ev.tipo === "abre") {
      const p = puestos.get(ev.id), a = partida.aperturas.get(ev.id);
      if (p) p.etiqueta.textContent = `${a.altura.toFixed(1)} m`;
      animar(tv.jugadores.get(ev.id), "reposo");
    } else if (ev.tipo === "aterriza" || ev.tipo === "estrella") {
      const j = tv.jugadores.get(ev.id), p = puestos.get(ev.id);
      if (p) { p.resultado = ev.tipo; if (ev.tipo === "estrella") p.etiqueta.textContent = "¡Te estrellaste!"; }
      if (ev.tipo === "estrella") { j?.etiqueta.classList.add("fuera"); animar(j, "ko"); }
    } else if (ev.tipo === "puntos") {
      bajada = { t: ahora(), alturas: new Map([...puestos].map(([id, p]) => [id, p.y])) };
      tabla(ev.tabla); letrero(ev.ronda < 3 ? "¡Siguiente caída!" : "Resultados");
    } else if (ev.tipo === "fin") {
      tv.fase = "fin"; tabla(ev.ranking, true);
      const ganadores = ev.ranking.filter(l => l.lugar === 1);
      letrero(ganadores.length === 1 ? `¡Gana ${tv.jugadores.get(ganadores[0].id)?.nombre || "Jugador"}!` : "¡Empate!");
      // Primero llegan al piso, luego celebran: no pisa el clip de aterrizaje.
      const token = pid;
      setTimeout(() => { if (pid === token && tv.fase === "fin") ev.ranking.forEach(l => animar(tv.jugadores.get(l.id), l.lugar === 1 ? "festejo" : "derrota")); }, 1400);
      const b = $("empezar"); b.classList.remove("oculto"); b.disabled = false; b.textContent = "Otra vez";
    }
    tv.canal.enviar("evento", { ...ev, pid });
  }
  if (evs.length) tv.difundir();
}
async function ponerBots() {
  const n = Math.max(0, Math.min(5, Number(q.get("bots")) || 0));
  await tv.listo; const lista = tv.disponibles();
  for (let i = 0; i < n; i++) await tv.unir(`bot${i + 1}`, { nombre: ["Beto", "Caro", "Dani", "Eli", "Fer"][i], personaje: lista[(i + 1) % lista.length] }, true);
}
function bots() {
  fila().filter(j => j.bot).forEach(j => {
    const p = puestos.get(j.id), u = Math.random();
    // Algunos no abren; otros completan la apertura después del impacto.
    p.botEn = u < 0.18 ? null : partida.impacto - partida.cfg.aperturaMs - (u < 0.4 ? -120 : 100 + Math.random() * 1600);
  });
}
$("empezar").onclick = () => { if (tv.fase === "fin") aLobby(); else iniciar(); };
setInterval(botonEmpezar, 1000);
setInterval(() => {
  const t = ahora();
  if (tv.fase === "cuenta") {
    letrero(String(Math.max(1, Math.ceil((cuenta - t) / 1000))));
    if (t >= cuenta) { tv.fase = "juego"; eventos(empezar(partida, t)); }
  }
  if (partida && tv.fase === "juego") {
    fila().filter(j => j.bot).forEach(j => {
      const p = puestos.get(j.id);
      if (p?.botEn !== null && p?.botEn <= t && partida.fase === "ronda") {
        const s = p.botEn; p.botEn = null; eventos(abrir(partida, j.id, s, t));
      }
    });
    eventos(avanzar(partida, t));
  }
}, 20);
escena.alCuadro(dt => { tv.jugadores.forEach(j => j.figura?.update(dt)); dibujar(ahora()); });
acomodar(); botonEmpezar(); ponerBots();
window.__paracaidas = { tv, escena, franja, puestos, encuadrarGrupo, get partida() { return partida; }, get pid() { return pid; }, iniciar, aLobby };
