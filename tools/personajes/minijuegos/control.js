// Control del celular (prototipo de Mini-Juegos y cuarto de Físico, zona aparte).
// Mide el reloj de la TV (ping/pong) y manda cada toque con su hora ya traducida al reloj de la TV.
import { abrirCanal, ahora as ahoraPc, deLaTv, redDeUrl } from "/src/personajes/minijuegos/canal.ts";
import { estimar, muestra, relojListo, MAX_INCERTIDUMBRE } from "/src/personajes/minijuegos/reloj.ts";

const q = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const FUENTE = (q.get("fuente") || "http://127.0.0.1:4193/").replace(/\/?$/, "/");
const sala = (q.get("sala") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
// Un id nuevo en cada carga: la secuencia de mensajes empieza en 1 y la TV no debe confundirla con la de antes.
const yo = "c" + Math.random().toString(36).slice(2, 9);
// ?desfase=ms: simula que el reloj de este celular está corrido (prueba de Codex O4: otro aparato, otra hora).
const DESFASE = Number(q.get("desfase")) || 0;
const ahora = () => ahoraPc() + DESFASE;
const NOMBRES = { "iron-man": "Iron Man", "black-widow": "Black Widow", wolverine: "Wolverine", hulk: "Hulk", "spider-man": "Spider-Man", "black-panther": "Black Panther", "capitan-america": "Capitán América", thor: "Thor" };
let personajes = Object.keys(NOMBRES), elegido = q.get("personaje") || null, dentro = false, ultimo = null, miJ = null;
const fallidos = new Set(); // personajes que no cargaron en la TV (se ven grises; se pueden reintentar)
const muestras = [];
let reloj = null;

$("sala-txt").textContent = sala ? `Sala ${sala}` : "Sin sala: abre esta página desde la TV";
$("nombre").value = q.get("nombre") || "";

const canal = abrirCanal(sala, yo, m => {
  if (!deLaTv(m)) return; // el celular solo le cree a la TV (Codex O3)
  if (m.tipo === "pong" && m.d.para === yo) {
    const s = muestra(Number(m.d.t0), Number(m.d.t), ahora());
    if (s) { muestras.push(s); if (muestras.length > 40) muestras.shift(); reloj = estimar(muestras); }
  } else if (m.tipo === "estado") estado(m.d);
  else if (m.tipo === "eco" && m.d.para === yo) diag(m.d.ok ? `salto aceptado · llegó ${m.d.atraso} ms después` : `salto rechazado (${m.d.motivo || "?"})`);
  else if (m.tipo === "evento") evento(m.d);
  else if (m.tipo === "secreto" && m.d.para === yo && typeof m.d.palabra === "string") $("secreta").textContent = m.d.palabra.slice(0, 40);
  else if (m.tipo === "lleno" && m.d.para === yo) $("estado").textContent = "La sala está llena o ya empezó";
}, redDeUrl(q));

// Reloj: rápido al principio, luego cada 2 s.
let pings = 0;
(function pingear() { canal.enviar("ping", { t0: ahora() }); pings++; setTimeout(pingear, pings < 12 ? 250 : 2000); })();

function pintarGrid() {
  const g = $("grid");
  g.innerHTML = "";
  personajes.forEach(id => {
    const c = document.createElement("button");
    c.className = "carta" + (id === elegido ? " si" : "") + (fallidos.has(id) ? " fallo" : "");
    c.innerHTML = `<img alt="" src="${FUENTE}catalogo/${id}/${id}-tarjeta.webp"><span>${NOMBRES[id] || id}</span>`;
    c.onclick = () => { elegido = id; pintarGrid(); };
    g.appendChild(c);
  });
}
pintarGrid();
function entrar() {
  if (!sala) return;
  if (!elegido) elegido = personajes[Math.floor(Math.random() * personajes.length)];
  canal.enviar("hola", { nombre: $("nombre").value.trim() || "Jugador", personaje: elegido });
  dentro = true;
  $("unirse").classList.add("oculto");
  if ($("unirse").dataset.reintento) { fallidos.delete(elegido); $("estado").textContent = "Cargando tu personaje en la TV…"; }
}
$("entrar").onclick = entrar;
if (q.get("entrar") === "1") setTimeout(entrar, 300);
// Sigue diciendo «aquí estoy» (si la TV se recarga, vuelve a entrar).
setInterval(() => { if (dentro && miJ === null) canal.enviar("hola", { nombre: $("nombre").value.trim() || "Jugador", personaje: elegido }); }, 1500);
addEventListener("pagehide", () => canal.enviar("adios"));

function estado(d) {
  ultimo = d;
  if (Array.isArray(d.personajes) && d.personajes.length && d.personajes.join() !== personajes.join()) { personajes = d.personajes; if (!dentro) pintarGrid(); }
  const lista = Array.isArray(d.jugadores) ? d.jugadores : [];
  const j = lista.find(x => x.id === yo);
  pid = typeof d.pid === "string" ? d.pid : "";
  miJ = j ? j.n : null;
  if (!dentro) return;
  if (!j) { $("estado").textContent = "Entrando…"; return; }
  document.documentElement.style.setProperty("--yo", j.color);
  $("chip").textContent = `P${j.n + 1} ${j.nombre}`; $("chip").classList.remove("oculto");
  $("titulo").textContent = d.juego === "bala" ? "Esquiva la bala" : "El cuarto";
  const anfitrion = Math.min(...lista.filter(x => !x.bot && !x.desconectado).map(x => x.n)) === j.n;
  // Su personaje no cargó en la TV (Codex O7): se queda el aviso y vuelve el selector para elegir otro o reintentar.
  if (j.estado === "error") return pedirOtro(j.personaje);
  if ($("unirse").dataset.reintento) { delete $("unirse").dataset.reintento; $("unirse").classList.add("oculto"); }
  const vivo = !Array.isArray(d.vivos) || d.vivos.includes(yo);
  if (d.juego === "cuarto") return verMando();
  if (d.juego === "fisico") return verFisico(d, j);
  // Esquiva la bala.
  const enJuego = d.fase === "cuenta" || d.fase === "juego";
  $("salto").classList.toggle("oculto", !enJuego && d.fase !== "fin");
  $("espera").classList.toggle("oculto", enJuego);
  $("salto").classList.toggle("fuera", !vivo);
  $("salto-txt").textContent = vivo ? "Toca cuando llegue la bala" : "Te tumbaron. Mira la TV.";
  $("empezar").classList.toggle("oculto", !(anfitrion && d.fase === "lobby"));
  $("empezar").disabled = !d.puedeEmpezar;
  $("empezar").textContent = d.puedeEmpezar ? "¡Empezar!" : "Cargando personajes…";
  pintarSalto();
  $("otra").classList.toggle("oculto", !(anfitrion && d.fase === "fin"));
  if (d.fase === "lobby") $("espera-txt").textContent = anfitrion ? "Tú empiezas cuando estén todos." : "Ya estás en la fila. Mira la TV.";
  if (d.fase === "fin" && Array.isArray(d.ranking)) {
    const l = d.ranking.find(x => x.id === yo);
    $("estado").textContent = l ? (l.lugar === 1 ? "¡Ganaste!" : `Quedaste en ${l.lugar}° lugar`) : "";
    $("salto").classList.add("oculto"); $("espera").classList.remove("oculto"); $("espera-txt").textContent = "Fin de la partida";
  } else $("estado").textContent = vivo ? "" : "Eliminado";
}
function pedirOtro(fallo) {
  if (fallo) fallidos.add(fallo);
  if (elegido === fallo) elegido = null;
  ["espera", "salto", "mando"].forEach(id => $(id).classList.add("oculto"));
  mandoVisto = false;
  const u = $("unirse");
  if (!u.dataset.reintento) { u.dataset.reintento = "1"; pintarGrid(); }
  u.classList.remove("oculto");
  $("entrar").textContent = "Usar este";
  $("estado").textContent = "Tu personaje no cargó en la TV: elige otro (o el mismo para reintentar)";
}
$("empezar").onclick = () => canal.enviar("empezar");
$("otra").onclick = () => canal.enviar("otra");

function evento(d) {
  if (d.tipo === "golpe" && d.id === yo) { vibrar([80, 40, 120]); $("estado").textContent = "¡PUM! Eliminado"; }
  if (d.tipo === "salvado" && d.id === yo) { vibrar(20); $("estado").textContent = "¡Salvado!"; setTimeout(() => { if ($("estado").textContent === "¡Salvado!") $("estado").textContent = ""; }, 700); }
}
const vibrar = p => { try { navigator.vibrate && navigator.vibrate(p); } catch { /* sin vibración */ } };
const horaTv = () => ahora() + reloj.offset;
let pid = "";
/** Sin reloj confiable no se juega (Codex O4): el botón dice «Sincronizando…» y no manda nada. */
const sincronizado = () => relojListo(reloj) && reloj.incertidumbre <= MAX_INCERTIDUMBRE;
function pintarSalto() {
  const b = $("salto"), ok = sincronizado();
  b.classList.toggle("espera", !ok);
  if (!ok) $("salto-txt").textContent = "Sincronizando con la TV…";
  else if (!b.classList.contains("fuera")) $("salto-txt").textContent = "Toca cuando llegue la bala";
}
setInterval(pintarSalto, 500);

// Botón de salto: se manda al tocar (pointerdown), no al soltar.
$("salto").addEventListener("pointerdown", e => {
  e.preventDefault();
  if ($("salto").classList.contains("fuera") || !sincronizado() || !pid) return;
  canal.enviar("salto", { pid, s: horaTv(), inc: Math.round(reloj.incertidumbre) });
  vibrar(12);
  $("salto").classList.add("toca"); setTimeout(() => $("salto").classList.remove("toca"), 110);
});

// ---------- Mando del cuarto: palanca y botones ----------
// Decidió Codex (D7): palanca fija y celular horizontal por omisión; ?mando=flotante para la otra.
const FIJO = q.get("mando") !== "flotante";
let palanca = { x: 0, z: 0 }, dedo = null, centro = null, mandoVisto = false;
function verMando() {
  if (mandoVisto) return;
  mandoVisto = true;
  ["unirse", "espera", "salto"].forEach(id => $(id).classList.add("oculto"));
  $("mando").classList.remove("oculto");
  recentrar();
}
/** Centro de la palanca fija; se recalcula al girar el celular o cambiar el tamaño (Codex O9). */
function recentrar() {
  if (!mandoVisto || dedo !== null) return;
  const z = $("zona").getBoundingClientRect();
  ponerPalanca(z.width / 2, z.height * 0.62);
  if (!FIJO) $("palanca").style.opacity = "0.35";
  $("girar").classList.toggle("oculto", innerWidth > innerHeight);
}
addEventListener("resize", recentrar);
addEventListener("orientationchange", () => setTimeout(recentrar, 200));
/** Al ocultar la página (otra app, pantalla apagada) se suelta todo (Codex O5). */
function soltarTodo() {
  if (!mandoVisto) return;
  dedo = null; palanca = { x: 0, z: 0 }; $("bolita").style.transform = ""; canal.enviar("mando", palanca);
}
document.addEventListener("visibilitychange", () => { if (document.hidden) soltarTodo(); });
addEventListener("pagehide", soltarTodo);
function ponerPalanca(x, y) { centro = { x, y }; const p = $("palanca"); p.style.left = x + "px"; p.style.top = y + "px"; $("bolita").style.transform = ""; }
const zona = $("zona");
zona.addEventListener("pointerdown", e => {
  if (dedo !== null) return;
  dedo = e.pointerId; zona.setPointerCapture(dedo);
  const r = zona.getBoundingClientRect();
  if (!FIJO) { ponerPalanca(e.clientX - r.left, e.clientY - r.top); $("palanca").style.opacity = "1"; }
  mover(e);
});
zona.addEventListener("pointermove", e => { if (e.pointerId === dedo) mover(e); });
const soltar = e => {
  if (e.pointerId !== dedo) return;
  dedo = null; palanca = { x: 0, z: 0 }; $("bolita").style.transform = ""; mandarPalanca(true);
  if (!FIJO) $("palanca").style.opacity = "0.35";
};
zona.addEventListener("pointerup", soltar); zona.addEventListener("pointercancel", soltar);
function mover(e) {
  const r = zona.getBoundingClientRect(), R = 60;
  let dx = e.clientX - r.left - centro.x, dy = e.clientY - r.top - centro.y;
  const l = Math.hypot(dx, dy);
  if (l > R) { dx *= R / l; dy *= R / l; }
  $("bolita").style.transform = `translate(${dx}px,${dy}px)`;
  palanca = { x: +(dx / R).toFixed(2), z: +(dy / R).toFixed(2) }; // abajo en la pantalla = hacia la cámara (+z)
  mandarPalanca();
}
let ultimoEnvio = 0, ultimaPalanca = "";
function mandarPalanca(ya) {
  const t = performance.now(), firma = palanca.x + "," + palanca.z;
  if (!ya && (t - ultimoEnvio < 50 || firma === ultimaPalanca)) return;
  ultimoEnvio = t; ultimaPalanca = firma;
  canal.enviar("mando", palanca);
}
// Reenvío cada 200 ms: la TV suelta la palanca si pasan 500 ms sin noticias.
setInterval(() => { if (mandoVisto && !document.hidden) { ultimaPalanca = ""; mandarPalanca(true); } }, 200);
document.querySelectorAll(".botones button").forEach(b => b.addEventListener("pointerdown", e => {
  e.preventDefault();
  canal.enviar("boton", { b: b.dataset.b });
  vibrar(10);
  b.classList.add("toca"); setTimeout(() => b.classList.remove("toca"), 110);
}));

// ---------- Sala de Físico ----------
// Todos: gestos para animar a su personaje y el aviso para aceptar (o no) un castigo o reto de contacto.
// El anfitrión (lo dice la TV): la palabra secreta, nueva palabra, revelar, si la TV la muestra, escenario y, por jugador,
// puntos a mano, «la dijo», castigo y reto. Todo se manda como «fx» y la TV revisa que venga del anfitrión.
const fx = (a, extra) => canal.enviar("fx", Object.assign({ a }, extra || {}));
let fisicoVisto = false, ultimoFisico = null;
function verFisico(d, j) {
  ultimoFisico = d;
  if (!fisicoVisto) {
    fisicoVisto = true;
    ["unirse", "espera", "salto", "mando"].forEach(id => $(id).classList.add("oculto"));
    $("fisico").classList.remove("oculto");
    $("titulo").textContent = "Físico";
    document.querySelectorAll("[data-g]").forEach(b => b.addEventListener("pointerdown", e => { e.preventDefault(); canal.enviar("gesto", { g: b.dataset.g }); vibrar(10); }));
    $("b-ronda").onclick = () => fx("ronda", $("cat").value ? { c: $("cat").value } : {});
    $("b-revelar").onclick = () => fx(ultimoFisico && ultimoFisico.ronda && ultimoFisico.ronda.revelada ? "ocultar" : "revelar");
    $("b-ver").onclick = () => fx("ver");
    $("esc").onchange = () => fx("escenario", { c: $("esc").value });
    $("consent-si").onclick = () => { canal.enviar("acepta", { si: true }); $("consent").classList.add("oculto"); };
    $("consent-no").onclick = () => { canal.enviar("acepta", { si: false }); $("consent").classList.add("oculto"); };
  }
  $("titulo").textContent = d.ronda ? "Palabra prohibida" : "Físico";
  $("estado").textContent = "";
  $("mis-pts").textContent = `${(d.puntos && d.puntos[yo]) || 0} pts`;
  const mio = (d.pendientes || []).find(p => p.id === yo);
  $("consent").classList.toggle("oculto", !mio);
  if (mio) $("consent-txt").textContent = mio.texto;
  const soy = d.anfitrion === j.n;
  $("anf").classList.toggle("oculto", !soy);
  if (!soy) return;
  if (!d.ronda) $("secreta").textContent = "Toca «Nueva palabra»";
  llenar($("cat"), [["", "Categoría al azar"], ...(d.categorias || []).map(c => [c.id, c.nombre])]);
  llenar($("esc"), (d.escenarios || []).map(x => [x, "Escenario: " + x]), d.escenario);
  $("b-revelar").textContent = d.ronda && d.ronda.revelada ? "Tapar" : "Revelar";
  $("b-ver").textContent = d.modo === "visible" ? "TV: palabra visible" : "TV: palabra tapada";
  const lista = $("lista"), filas = (d.jugadores || []).filter(x => !x.desconectado);
  if (lista.dataset.firma !== filas.map(x => x.id).join()) {
    lista.dataset.firma = filas.map(x => x.id).join();
    lista.innerHTML = "";
    filas.forEach(x => {
      const f = document.createElement("div"); f.className = "jug"; f.dataset.id = x.id;
      f.innerHTML = `<b></b><button data-n="1">+1</button><button data-n="2">+2</button><button data-n="-1">−1</button>
        <div class="sel"><button data-a="perdio">La dijo</button><select data-a="castigo"></select><select data-a="reto"></select></div>`;
      f.querySelector("b").style.color = x.color;
      f.querySelectorAll("[data-n]").forEach(b => b.onclick = () => fx("puntos", { id: x.id, n2: Number(b.dataset.n) }));
      f.querySelector('[data-a="perdio"]').onclick = () => fx("perdio", { id: x.id });
      for (const t of ["castigo", "reto"]) {
        const s = f.querySelector(`[data-a="${t}"]`);
        llenar(s, [["", t === "castigo" ? "Castigo…" : "Reto…"], ...(d[t === "castigo" ? "castigos" : "retos"] || []).map(c => [c.id, c.texto + (c.contacto ? " (pide su sí)" : "")])]);
        s.onchange = () => { if (s.value) fx(t, { id: x.id, c: s.value }); s.value = ""; };
      }
      lista.appendChild(f);
    });
  }
  filas.forEach(x => { const f = lista.querySelector(`[data-id="${x.id}"] b`); if (f) f.textContent = `${x.nombre} · ${(d.puntos && d.puntos[x.id]) || 0}`; });
}
function llenar(sel, opciones, valor) {
  const firma = JSON.stringify(opciones);
  if (sel.dataset.firma !== firma) {
    sel.dataset.firma = firma; sel.innerHTML = "";
    opciones.forEach(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; sel.appendChild(o); });
  }
  if (valor !== undefined && document.activeElement !== sel) sel.value = valor;
}

function diag(t) {
  $("diag").textContent = (reloj ? `reloj ±${Math.round(reloj.incertidumbre)} ms (viaje ${Math.round(reloj.rtt)} ms, ${reloj.muestras} muestras)${DESFASE ? ` · desfase simulado ${DESFASE} ms` : ""}\n` : "midiendo reloj…\n") + (t || "");
}
setInterval(() => diag(), 2000);
window.__control = { yo, get reloj() { return reloj; }, get ultimo() { return ultimo; } };
