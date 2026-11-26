// Alto total: la TV conserva el historial y juzga; el celular solo comunica su pulsación.
import { ahora } from "/src/personajes/minijuegos/canal.ts";
import { acotarToque, MAX_INCERTIDUMBRE } from "/src/personajes/minijuegos/reloj.ts";
import { avanzar, crearPartida, empezar, posicion, ranking, recibir } from "/src/personajes/minijuegos/altoTotal.ts";
import { crearTV } from "./tv-comun.js";

const q = new URLSearchParams(location.search), $ = id => document.getElementById(id);
const escena = EscenaMJ.crear($("lienzo"), { fov: 3 });
const INICIO = -13, META = 13;
let partida = null, pid = "", cuenta = 0, participantes = [], vigilante = null, cargaVigilante = 0;
let fondoPista = 10, pista = null;
const anchoCarril = 2.2;
const bots = new Map();
const tv = crearTV({
  juego: "alto", escena,
  alUnirse: () => { if (tv.fase === "lobby") { acomodar(); ponerVigilante(); } botonEmpezar(); },
  alSalir: () => { if (tv.fase === "lobby") { acomodar(); ponerVigilante(); } botonEmpezar(); },
  alDesconectar: j => tv.pop(j, "Se desconectó", "#c9d2ff"), // nunca es una infracción
  alMensaje: (j, m) => {
    if (m.tipo === "corre") entrada(j, m.d);
    else if (m.tipo === "empezar" && tv.esAnfitrion(j)) iniciar();
    else if (m.tipo === "otra" && tv.fase === "fin" && tv.esAnfitrion(j)) aLobby();
  },
});
// FigurasMJ resuelve reposo desde animaciones.mapa; conservar la prioridad de ficha.juego.clips también ahí.
tv.listo.then(catalogo => catalogo.forEach(({ ficha }) => {
  if (ficha.juego?.clips?.reposo) ficha.animaciones = {
    ...ficha.animaciones, mapa: { ...ficha.animaciones?.mapa, reposo: ficha.juego.clips.reposo },
  };
}));
function fila() { return [...tv.jugadores.values()].sort((a, b) => a.n - b.n); }
function bloqueado(j, t) {
  if (!partida || !j.koHasta) return false;
  if (t < j.koHasta) return true;
  return j.exigeSoltar && !j.entradas.some(x => x.a === "suelta");
}
tv.extra = () => ({
  pid, participantes, color: partida?.color || null, puedeEmpezar: listos(),
  atrapados: partida ? partida.jugadores.filter(j => bloqueado(j, ahora())).map(j => j.id) : [],
  ranking: partida?.fase === "fin" ? ranking(partida) : null,
}); // No difundir tramos: su fin futuro es privado y no hay aviso previo de rojo.
function listos() { return tv.todosListos() && !!vigilante; }
function entrada(j, d) {
  if (!partida || tv.fase !== "juego" || d.pid !== pid || d.inc > MAX_INCERTIDUMBRE) return;
  const llegada = ahora(), s = acotarToque(d.s, llegada);
  if (s === null) return;
  // recibir incorpora el mensaje antes de avanzar: no cerrar su ventana antes de leer la suelta.
  eventos(recibir(partida, j.id, { a: d.a, s }, llegada));
}
function animar(figura, nombre) {
  if (!figura) return;
  const respaldo = [nombre, "reposo", "correr", "ko", "festejo", "derrota"].find(n => figura.tiene(n));
  if (respaldo && figura.actual() !== respaldo) figura.anim(respaldo, { mezcla: 0.08 });
}
async function ponerVigilante() {
  const token = ++cargaVigilante;
  const ocupados = new Set(fila().map(j => j.personaje));
  const id = tv.disponibles().find(id => !ocupados.has(id));
  if (vigilante?.ficha.id === id) return;
  if (vigilante) { vigilante.quitar(); vigilante = null; }
  if (!id) return;
  try {
    const dato = tv.catalogo().get(id), f = await FigurasMJ.crear(dato.ficha, { base: dato.base, idFigura: "vigilante-alto" });
    if (token !== cargaVigilante) { f.quitar(); return; }
    vigilante = f;
    // El vigilante conserva una talla legible aunque el catálogo entregue una minifig.
    f.obj.scale.multiplyScalar(5 / f.alto());
    escena.scene.add(f.obj); orientar(); camara(); botonEmpezar();
  } catch (e) { console.error("No cargó el vigilante", e); $("sub").textContent = "No cargó el vigilante. Reintenta entrando al lobby."; }
}
function orientar() {
  if (!vigilante) return;
  // Frente local +z: verde mira a la derecha; rojo hacia los corredores a la izquierda.
  vigilante.obj.position.set(META + 2, 0, 0);
  vigilante.obj.rotation.y = partida?.color === "rojo" ? -Math.PI / 2 : Math.PI / 2;
  animar(vigilante, "reposo");
}
function caja(x, y, z, ancho, alto, fondo, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, fondo), new THREE.MeshStandardMaterial({ color: new THREE.Color(color).convertSRGBToLinear(), roughness: 0.8 }));
  m.position.set(x, y, z); m.receiveShadow = true; return m;
}
function dibujarPista() {
  if (pista) {
    escena.scene.remove(pista);
    pista.traverse(o => { o.geometry?.dispose(); if (o.material) o.material.dispose(); });
  }
  pista = new THREE.Group(); const n = Math.max(1, fila().length);
  pista.add(caja(1, -0.22, 0, 32, 0.4, fondoPista + 2, "#343a66"));
  for (let i = 0; i < n; i++) {
    const z = (i - (n - 1) / 2) * anchoCarril;
    pista.add(caja(0, 0, z, 29, 0.04, anchoCarril - 0.25, i % 2 ? "#394b79" : "#445c86"));
    pista.add(caja(INICIO, 0.04, z, 0.18, 0.04, anchoCarril - 0.25, "#ffffff"));
    for (let k = 0; k < 6; k++) pista.add(caja(META + (k % 2) * 0.28, 0.05, z + (k - 2.5) * (anchoCarril - 0.25) / 6,
      0.28, 0.06, (anchoCarril - 0.25) / 6, k % 2 ? "#ffffff" : "#0a1030"));
  }
  escena.scene.add(pista);
}
function acomodar() {
  // Z negativo está al fondo: los altos nunca quedan delante de una minifig.
  const lista = fila().sort((a, b) => (b.figura?.alto() || 2.7) - (a.figura?.alto() || 2.7) || a.n - b.n);
  fondoPista = Math.max(anchoCarril, lista.length * anchoCarril);
  lista.forEach((j, i) => {
    j.z = (i - (lista.length - 1) / 2) * anchoCarril;
    if (j.figura) { j.figura.obj.position.set(INICIO, 0, j.z); j.figura.obj.rotation.y = Math.PI / 2; }
    j.etiqueta.classList.add("placa-carril");
    j.etiqueta.querySelector(".placa").textContent = `P${j.n + 1} ${j.nombre}`;
    if (!j.etiqueta.querySelector(".distancia")) {
      const d = document.createElement("div"); d.className = "distancia"; j.etiqueta.appendChild(d);
    }
    j.ultimoAvance = 0;
  });
  dibujarPista(); orientar(); camara();
}
const v3 = new THREE.Vector3();
function franja() { return Math.round(Math.min(200, innerHeight * 0.28)); }
function camara() {
  const c = escena.camera, W = innerWidth, H = innerHeight, angulo = 35 * Math.PI / 180;
  const puntos = [], cajaFigura = new THREE.Box3();
  const esquina = (x, y, z) => puntos.push(new THREE.Vector3(x, y, z));
  // Medir cada talla en ambos extremos de su recorrido, incluyendo su volumen.
  fila().forEach(j => {
    const o = j.figura?.obj;
    if (!o) return;
    o.updateMatrixWorld(true); cajaFigura.setFromObject(o);
    for (const x of [INICIO, META]) for (const dx of [cajaFigura.min.x - o.position.x, cajaFigura.max.x - o.position.x])
      for (const y of [Math.min(0, cajaFigura.min.y), cajaFigura.max.y + 0.25])
        for (const z of [cajaFigura.min.z, cajaFigura.max.z]) esquina(x + dx, y, z);
  });
  for (const x of [INICIO - 0.5, META + 0.5]) for (const z of [-fondoPista / 2, fondoPista / 2]) esquina(x, 0, z);
  if (vigilante) {
    vigilante.obj.updateMatrixWorld(true); cajaFigura.setFromObject(vigilante.obj);
    // Incluir ambos giros sin cambiar el encuadre al ponerse en rojo.
    const rx = Math.max(Math.abs(cajaFigura.min.x - META - 2), Math.abs(cajaFigura.max.x - META - 2));
    const rz = Math.max(Math.abs(cajaFigura.min.z), Math.abs(cajaFigura.max.z));
    for (const x of [META + 2 - rx, META + 2 + rx]) for (const y of [0, cajaFigura.max.y + 0.25])
      for (const z of [-rz, rz]) esquina(x, y, z);
  }
  const izquierda = anchoPlaca() + 16, derecha = W - 12, arriba = franja() + 12, abajo = H - 32;
  function medir(d) {
    c.clearViewOffset();
    c.position.set(0, Math.sin(angulo) * d, Math.cos(angulo) * d);
    c.lookAt(0, 0, 0); c.updateMatrixWorld(true);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    puntos.forEach(p => {
      v3.copy(p).project(c);
      const x = (v3.x + 1) * W / 2, y = (1 - v3.y) * H / 2;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    });
    return { x0, x1, y0, y1 };
  }
  // FOV estrecho: vista lateral casi paralela, sin encoger los carriles del fondo.
  // Búsqueda binaria de la menor distancia que cabe en el espacio de juego.
  let cerca = 20, lejos = 2000;
  for (let i = 0; i < 36; i++) {
    const d = (cerca + lejos) / 2, b = medir(d);
    if (b.x1 - b.x0 <= derecha - izquierda && b.y1 - b.y0 <= abajo - arriba) lejos = d; else cerca = d;
  }
  const b = medir(lejos);
  c.setViewOffset(W, H, (b.x0 + b.x1 - izquierda - derecha) / 2, (b.y0 + b.y1 - arriba - abajo) / 2, W, H);
  c.far = Math.max(300, lejos + fondoPista + 120); c.updateProjectionMatrix();
  escena.scene.fog.near = lejos + fondoPista; escena.scene.fog.far = lejos + fondoPista + 120;
  placas();
}
function anchoPlaca() { return Math.max(88, Math.min(126, innerWidth * 0.08)); }
function placas() {
  fila().forEach(j => {
    if (!j.figura) { j.etiqueta.style.display = "none"; return; }
    // El pie del carril es fijo: las placas no siguen la cabeza ni el avance.
    v3.set(INICIO, 0, j.z).project(escena.camera);
    j.etiqueta.style.display = "";
    j.etiqueta.style.left = "8px";
    j.etiqueta.style.top = (1 - v3.y) * innerHeight / 2 + "px";
    j.etiqueta.style.width = anchoPlaca() + "px";
    if (j.aro) {
      j.aro.position.x = j.figura.obj.position.x; j.aro.position.z = j.z;
      j.aro.scale.setScalar(Math.min(1, (j.figura.ancho() || 1) * 0.75));
    }
  });
}
addEventListener("resize", camara);
function botonEmpezar() {
  if (tv.fase !== "lobby") return;
  $("empezar").disabled = !listos();
  $("empezar").textContent = tv.jugadores.size && !listos() ? "Cargando personajes…" : "¡Empezar!";
  tv.difundir();
}
function letrero(texto) { $("centro").textContent = texto; }
$("empezar").onclick = () => tv.fase === "fin" ? aLobby() : iniciar();
function iniciar() {
  if (tv.fase !== "lobby" || !listos()) return;
  acomodar(); participantes = fila().map(j => j.id);
  partida = crearPartida(fila()); pid = Math.random().toString(36).slice(2, 12);
  bots.clear(); fila().filter(j => j.bot).forEach(j => bots.set(j.id, { apretado: false, proximo: Infinity, latido: 0 }));
  ["empezar", "sala", "podio"].forEach(id => $(id).classList.add("oculto"));
  $("marcador").classList.remove("oculto"); $("luz").className = "luz";
  cuenta = ahora() + 3000; tv.fase = "cuenta";
}
function aLobby() {
  partida = null; pid = ""; participantes = []; bots.clear(); tv.fase = "lobby";
  tv.limpiarDesconectados();
  ["podio", "marcador"].forEach(id => $(id).classList.add("oculto"));
  ["sala", "empezar"].forEach(id => $(id).classList.remove("oculto"));
  fila().forEach(j => { j.etiqueta.classList.remove("ko"); animar(j.figura, "reposo"); });
  $("luz").className = "luz"; letrero("Entra desde tu celular");
  $("sub").textContent = "Mantén ¡CORRE! en VERDE. Suelta en ROJO.";
  acomodar(); ponerVigilante(); botonEmpezar();
}
function eventos(evs) {
  for (const ev of evs) {
    if (ev.tipo === "luz") {
      $("luz").className = `luz ${ev.color}`;
      $("centro").style.color = ev.color === "verde" ? "#8cf09a" : "#ff4854";
      letrero(ev.color.toUpperCase()); orientar();
      bots.forEach(b => { b.proximo = ahora() + (ev.color === "verde" ? 180 + Math.random() * 400 : Math.random() < 0.25 ? 480 : 100 + Math.random() * 180); });
    } else if (ev.tipo === "atrapado") {
      const j = tv.jugadores.get(ev.id); if (j) { animar(j.figura, "ko"); j.etiqueta.classList.add("ko"); }
      const b = bots.get(ev.id); if (b) b.proximo = partida.jugadores.find(x => x.id === ev.id).koHasta + 80;
    } else if (ev.tipo === "fin") {
      tv.fase = "fin"; const p = $("podio"); p.replaceChildren();
      ev.ranking.forEach(l => {
        const j = tv.jugadores.get(l.id); if (!j) return;
        const d = document.createElement("div"); d.textContent = `${l.lugar}° ${j.nombre} · ${l.distancia.toFixed(2)} s`;
        d.style.background = j.color.base; d.style.color = j.color.texto; p.appendChild(d);
        animar(j.figura, l.lugar === 1 ? "festejo" : "derrota");
      });
      p.classList.remove("oculto"); const ganadores = ev.ranking.filter(l => l.lugar === 1);
      letrero(ganadores.length === 1 ? `¡Gana ${tv.jugadores.get(ganadores[0].id)?.nombre || "Jugador"}!` : "¡Empate!");
      $("sub").textContent = ev.porTiempo ? "Tiempo agotado · clasificación por distancia" : "¡Meta confirmada!";
      const b = $("empezar"); b.classList.remove("oculto"); b.disabled = false; b.textContent = "Otra vez";
    }
    tv.canal.enviar("evento", { ...ev, pid });
  }
  if (evs.length) tv.difundir();
}
function moverBots(t) {
  for (const [id, b] of bots) {
    if (tv.fase !== "juego") break;
    const j = tv.jugadores.get(id), regla = partida.jugadores.find(x => x.id === id);
    if (t >= b.proximo) {
      b.proximo = Infinity;
      if (bloqueado(regla, t)) {
        b.apretado = false; entrada(j, { a: "suelta", s: t, pid, inc: 0 });
        b.proximo = t + 180;
      } else {
        const a = partida.color === "verde" ? "aprieta" : "suelta";
        b.apretado = a === "aprieta"; entrada(j, { a, s: t, pid, inc: 0 }); b.latido = t;
      }
    }
    if (b.apretado && t - b.latido >= 250) { b.latido = t; entrada(j, { a: "latido", s: t, pid, inc: 0 }); }
  }
}
setInterval(() => {
  const t = ahora();
  if (tv.fase === "cuenta") {
    letrero(String(Math.max(1, Math.ceil((cuenta - t) / 1000))));
    if (t >= cuenta) { tv.fase = "juego"; eventos(empezar(partida, t)); }
  }
  if (partida && tv.fase === "juego") {
    eventos(avanzar(partida, t)); moverBots(t);
    $("tiempo").textContent = String(Math.max(0, Math.ceil((partida.inicio + 60000 - t) / 1000)));
  }
}, 20);
setInterval(() => { if (tv.fase === "juego") tv.difundir(); else if (tv.fase === "lobby") botonEmpezar(); }, 250);
escena.alCuadro(dt => {
  const t = ahora();
  fila().forEach(j => {
    if (!j.figura) return;
    if (partida) {
      const regla = partida.jugadores.find(x => x.id === j.id), p = posicion(partida, j.id, t);
      j.figura.obj.position.x = INICIO + (META - INICIO) * p / 7;
      const ko = t < regla.koHasta;
      j.etiqueta.classList.toggle("ko", ko);
      j.etiqueta.querySelector(".distancia").textContent = ko ? "¡KO! · Al inicio" : bloqueado(regla, t) ? "Suelta y vuelve a correr" : `${p.toFixed(2)} / 7 s`;
      if (tv.fase !== "fin") animar(j.figura, ko ? "ko" : p > j.ultimoAvance ? "correr" : "reposo");
      j.ultimoAvance = p;
    } else j.etiqueta.querySelector(".distancia").textContent = "0.00 / 7 s";
    j.figura.update(dt);
  });
  vigilante?.update(dt); placas();
});
(async () => {
  await tv.listo; const lista = tv.disponibles(), n = Math.max(0, Math.min(6, Number(q.get("bots")) || 0));
  for (let i = 0; i < n; i++) await tv.unir(`bot${i + 1}`, { nombre: ["Beto", "Caro", "Dani", "Eli", "Fer", "Gus"][i], personaje: lista[i % lista.length] }, true);
  await ponerVigilante();
})();
acomodar(); botonEmpezar();
window.__altoTotal = { tv, get partida() { return partida; }, get pid() { return pid; }, iniciar, aLobby };
