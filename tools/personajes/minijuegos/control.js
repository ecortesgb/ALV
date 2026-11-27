// Control del celular (prototipo de Mini-Juegos y cuarto de Físico, zona aparte).
// Mide el reloj de la TV (ping/pong) y manda cada toque con su hora ya traducida al reloj de la TV.
import { abrirCanal, abrirCanalNube, abrirCanalWs, idDeLlave, ahora as ahoraPc, deLaTv, redDeUrl, urlSala, SERVIDOR } from "/src/personajes/minijuegos/canal.ts";
import { cliente } from "/src/servicios/cliente.ts";
import { miCuenta, reportarXp, resultadosXp, salaDondeMando } from "/src/personajes/minijuegos/xpSala.ts";
import { estimar, muestra, relojListo, MAX_INCERTIDUMBRE } from "/src/personajes/minijuegos/reloj.ts";

const q = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
// Las fotos de las tarjetas: del servidor privado en la misma máquina que sirvió la página (en la casa, la PC).
const FUENTE = (q.get("fuente") || `http://${location.hostname}:4193/`).replace(/\/?$/, "/");
const PESTANAS = q.get("canal") === "pestanas";
const CANAL = q.get("canal") || (import.meta.env.DEV ? "" : "nube");
const sala = (q.get("sala") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
// Quién soy: con WebSocket lo dice el servidor al conectar, a partir de una llave secreta que solo guarda este
// navegador (al recargar conserva su lugar y sus puntos; nadie más la conoce). En pestañas, un id local nuevo.
let yo = PESTANAS ? "c" + Math.random().toString(36).slice(2, 9) : "";
const llave = (() => {
  const k = "alv-mj-llave-" + sala + "-" + (q.get("nombre") || ""); // con el nombre: en la mesa los iframes comparten el almacenamiento
  const nueva = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
  try { let v = sessionStorage.getItem(k); if (!v) { v = nueva(); sessionStorage.setItem(k, v); } return v; } catch { return nueva(); }
})();
// ?desfase=ms: simula que el reloj de este celular está corrido (prueba de Codex O4: otro aparato, otra hora).
const DESFASE = Number(q.get("desfase")) || 0;
const ahora = () => ahoraPc() + DESFASE;
// Nombres de las tarjetas: del índice del servidor de personajes. Qué personajes se pueden elegir lo dice la TV.
const NOMBRES = {};
// XP desde la sala de ALV (049): cada celular manda su cuenta en «hola»; el del anfitrión de la sala reporta el podio.
let cuenta = null;
let cuentaLista = !NUBE_XP();
const listaCuenta = NUBE_XP() ? miCuenta(cliente).then(c => { cuenta = c; cuentaLista = true; return c; }) : Promise.resolve(null);
function NUBE_XP() { return !!cliente && (q.get("canal") || (import.meta.env.DEV ? "" : "nube")) === "nube"; }
const reportadas = new Set();
async function darXp(d) {
  const clave = `alv-mj-xp-${d.sala}-${d.pid}`;
  if (!d.pid || reportadas.has(clave)) return;
  reportadas.add(clave);
  try { if (sessionStorage.getItem(clave)) return; } catch { /* sin almacenamiento */ }
  await listaCuenta;
  if (!cuenta) return; // sin sesión de ALV: sin XP
  // Solo reporta el celular del anfitrión de la sala de ALV (puede no ser el primero de la fila).
  const evento = await salaDondeMando(cliente, cuenta);
  if (!evento) return; // no soy anfitrión de una sala abierta de ALV: sin XP
  const r = resultadosXp(d.ranking, d.jugadores);
  if (!r) return;
  if (await reportarXp(cliente, evento, d.juego, r)) {
    try { sessionStorage.setItem(clave, "1"); } catch { /* sin almacenamiento */ }
    diag("XP guardada en la sala");
  }
}
/** Sin índice (en la nube): «iron-man» → «Iron Man». */
const legible = id => String(id).split(/[-_]+/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ").slice(0, 30);
let personajes = [], elegido = q.get("personaje") || null, dentro = false, ultimo = null, miJ = null;
// En la nube el celular no lee el índice privado: los nombres y la lista los manda la TV.
(CANAL === "nube" && !q.get("fuente") ? Promise.resolve(null) : fetch(FUENTE + "indice.json")).then(r => (r && r.ok ? r.json() : null)).then(j => {
  const lista = ((j && j.personajes) || []).filter(p => p && p.ficha && !p.prueba && p.ficha.juego);
  lista.forEach(p => { NOMBRES[p.id] = String(p.ficha.nombre || p.id).slice(0, 30); });
  if (!personajes.length) personajes = lista.map(p => p.id).sort((a, b) => NOMBRES[a].localeCompare(NOMBRES[b], "es"));
  irAElegido(); pintarGrid();
}).catch(() => { /* sin índice: quedan los ids que mande la TV */ });
const fallidos = new Set(); // personajes que no cargaron en la TV (se ven grises; se pueden reintentar)
const muestras = [];
let reloj = null;

$("sala-txt").textContent = sala ? `Sala ${sala}` : "Sin sala: abre esta página desde la TV";
$("nombre").value = q.get("nombre") || "";

const oyentes = []; // solo para las pruebas automáticas (__control.oir)
const alLlegar = m => {
  if (m.de === SERVIDOR) { if (m.tipo === "bienvenida" && typeof m.d.yo === "string") yo = m.d.yo; return; }
  if (!deLaTv(m)) return; // el celular solo le cree a la TV (Codex O3)
  oyentes.forEach(f => { try { f(m); } catch { /* prueba */ } });
  if (m.tipo === "pong" && m.d.para === yo) {
    const s = muestra(Number(m.d.t0), Number(m.d.t), ahora());
    if (s) { muestras.push(s); if (muestras.length > 40) muestras.shift(); reloj = estimar(muestras); }
  } else if (m.tipo === "estado") estado(m.d);
  else if (m.tipo === "eco" && m.d.para === yo) diag(m.d.ok ? `toque aceptado · llegó ${m.d.atraso} ms después` : `toque rechazado (${m.d.motivo || "?"})`);
  else if (m.tipo === "evento") evento(m.d);
  else if (m.tipo === "secreto" && m.d.para === yo && typeof m.d.palabra === "string") $("secreta").textContent = m.d.palabra.slice(0, 40);
  else if (m.tipo === "lleno" && m.d.para === yo) $("estado").textContent = "La sala está llena o ya empezó";
};
const NUBE = CANAL === "nube" && !!cliente;
if (NUBE) yo = idDeLlave(llave);
const canal = PESTANAS ? abrirCanal(sala, yo, alLlegar, redDeUrl(q))
  : NUBE ? abrirCanalNube(cliente, sala, yo, alLlegar, redDeUrl(q), abierto => {
    if (!abierto) $("estado").textContent = "Sin conexión: reintentando…";
    else if (/conexión|reintentando/.test($("estado").textContent)) $("estado").textContent = "";
  })
  : abrirCanalWs(urlSala(q, sala, "cel", llave), alLlegar, redDeUrl(q), (abierto, motivo) => {
    if (!abierto) $("estado").textContent = motivo === "abriste otra vez" ? "Abriste este control en otra pestaña" : "Sin conexión con la PC: reintentando…";
    else if (/conexión|reintentando/.test($("estado").textContent)) $("estado").textContent = "";
  });

// Reloj: rápido al principio, luego cada 2 s.
let pings = 0;
(function pingear() { canal.enviar("ping", { t0: ahora() }); pings++; setTimeout(pingear, pings < 12 ? 250 : 2000); })();

// Cuadrícula por páginas (no hay scroll): caben las filas que entren en la pantalla; se pasa con ‹ › o deslizando.
let pagina = 0, porPagina = 9;
const filtrados = () => {
  const t = $("buscar").value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (!t) return personajes;
  return personajes.filter(id => (NOMBRES[id] || id).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(t));
};
function medir() {
  const g = $("grid"), ancho = g.clientWidth, alto = g.clientHeight, hueco = 8;
  if (!ancho || !alto) return;
  const altoCarta = ((ancho - 2 * hueco) / 3) * 5 / 4;
  porPagina = 3 * Math.max(1, Math.floor((alto + hueco) / (altoCarta + hueco)));
}
function irAElegido() { const i = filtrados().indexOf(elegido); if (i >= 0) pagina = Math.floor(i / porPagina); }
function pintarGrid() {
  medir();
  const g = $("grid"), lista = filtrados(), paginas = Math.max(1, Math.ceil(lista.length / porPagina));
  pagina = Math.min(Math.max(0, pagina), paginas - 1);
  g.innerHTML = "";
  lista.slice(pagina * porPagina, (pagina + 1) * porPagina).forEach(id => {
    const c = document.createElement("button");
    c.className = "carta" + (id === elegido ? " si" : "") + (fallidos.has(id) ? " fallo" : "");
    const img = document.createElement("img");
    img.alt = ""; if (!(CANAL === "nube" && !q.get("fuente"))) img.src = `${FUENTE}catalogo/${id}/${id}-tarjeta.webp`;
    img.onerror = () => { img.style.visibility = "hidden"; }; // sin foto, queda el nombre
    const nombre = document.createElement("span");
    nombre.textContent = NOMBRES[id] || legible(id);
    c.append(img, nombre);
    c.onclick = () => { if (deslizo) return; elegido = id; pintarGrid(); };
    g.appendChild(c);
  });
  if (!lista.length) g.innerHTML = '<div class="suave" style="grid-column:1/-1;text-align:center;padding:20px 0">Nadie con ese nombre</div>';
  $("pag").textContent = `${pagina + 1}/${paginas}`;
  $("ant").disabled = pagina === 0; $("sig").disabled = pagina >= paginas - 1;
}
$("ant").onclick = () => { pagina--; pintarGrid(); };
$("sig").onclick = () => { pagina++; pintarGrid(); };
$("buscar").oninput = () => { pagina = 0; pintarGrid(); };
let x0 = null, deslizo = false;
$("grid").addEventListener("pointerdown", e => { x0 = e.clientX; deslizo = false; });
$("grid").addEventListener("pointerup", e => {
  if (x0 === null) return;
  const dx = e.clientX - x0; x0 = null;
  if (Math.abs(dx) < 40) return;
  deslizo = true; setTimeout(() => { deslizo = false; }, 0); // que el toque no elija la tarjeta de abajo
  pagina += dx < 0 ? 1 : -1; pintarGrid();
});
addEventListener("resize", () => { if (!dentro) { irAElegido(); pintarGrid(); } });
pintarGrid();
function entrar() {
  if (!sala) return;
  if (!elegido) elegido = personajes[Math.floor(Math.random() * personajes.length)];
  if (!PESTANAS && !yo) { setTimeout(entrar, 300); return; } // todavía no llega la bienvenida del servidor
  if (!cuentaLista) { setTimeout(entrar, 200); return; } // primero saber mi cuenta de ALV (XP desde la sala)
  canal.enviar("hola", { nombre: $("nombre").value.trim() || "Jugador", personaje: elegido, ...(cuenta ? { cuenta } : {}) });
  dentro = true;
  $("unirse").classList.add("oculto");
  if ($("unirse").dataset.reintento) { fallidos.delete(elegido); $("estado").textContent = "Cargando tu personaje en la TV…"; }
}
$("entrar").onclick = entrar;
if (q.get("entrar") === "1") setTimeout(entrar, 300);
// Sigue diciendo «aquí estoy» (si la TV se recarga, vuelve a entrar).
setInterval(() => { if (dentro && miJ === null) canal.enviar("hola", { nombre: $("nombre").value.trim() || "Jugador", personaje: elegido, ...(cuenta ? { cuenta } : {}) }); }, 1500);
addEventListener("pagehide", () => canal.enviar("adios"));

function estado(d) {
  ultimo = d;
  if (Array.isArray(d.personajes) && d.personajes.length && d.personajes.join() !== personajes.join()) {
    personajes = d.personajes.filter(id => typeof id === "string").slice(0, 300);
    if (!dentro) { irAElegido(); pintarGrid(); }
  }
  const lista = Array.isArray(d.jugadores) ? d.jugadores : [];
  const j = lista.find(x => x.id === yo);
  pid = typeof d.pid === "string" ? d.pid : "";
  miJ = j ? j.n : null;
  if (!dentro) return;
  if (!j) { $("estado").textContent = "Entrando…"; return; }
  document.documentElement.style.setProperty("--yo", j.color);
  $("chip").textContent = `P${j.n + 1} ${j.nombre}`; $("chip").classList.remove("oculto");
  $("titulo").textContent = d.juego === "paracaidas" ? "Paracaídas" : d.juego === "alto" ? "Alto total" : d.juego === "martillazo" ? "Martillazo" : d.juego === "desenfunda" ? "¡Desenfunda!" : d.juego === "bala" ? "Esquiva la bala" : "El cuarto";
  document.title = $("titulo").textContent + " · control";
  const letra = d.juego === "martillazo" ? "B" : d.juego === "desenfunda" ? "RT" : "A";
  if ($("salto-letra").textContent !== letra) { $("salto-letra").textContent = letra; $("salto-letra").className = "letra " + letra.toLowerCase(); }
  $("salto-accion").textContent = d.juego === "paracaidas" ? "¡ABRE!" : d.juego === "alto" ? "¡CORRE!" : d.juego === "martillazo" ? "¡GOLPEA!" : d.juego === "desenfunda" ? "¡DISPARA!" : "SALTA";
  $("salto").classList.toggle("duelo", d.juego === "paracaidas" || d.juego === "alto" || d.juego === "desenfunda" || d.juego === "martillazo");
  // El anfitrión lo asigna el servidor de sala y la TV lo repite en el estado.
  const anfitrion = d.anfitrionId === yo;
  // Su personaje no cargó en la TV (Codex O7): se queda el aviso y vuelve el selector para elegir otro o reintentar.
  if (j.estado === "error") return pedirOtro(j.personaje);
  if ($("unirse").dataset.reintento) { delete $("unirse").dataset.reintento; $("unirse").classList.add("oculto"); }
  const vivo = !Array.isArray(d.vivos) || d.vivos.includes(yo);
  if (d.juego === "cuarto") {
    // Nombre de sus poderes en RT y X (la TV los manda); sin segundo poder no sale X.
    const pod = Array.isArray(j.poderes) ? j.poderes.filter(x => typeof x === "string").map(x => x.slice(0, 22)) : [];
    $("rt-txt").textContent = pod[0] || "Poder";
    $("x-txt").textContent = pod[1] || "";
    $("boton-x").classList.toggle("oculto", !pod[1]);
    return verMando();
  }
  if (d.juego === "fisico") return verFisico(d, j);
  // Esquiva la bala, Desenfunda y Martillazo comparten botón y reloj. Solo la TV juzga.
  const enJuego = d.fase === "cuenta" || d.fase === "juego";
  $("salto").classList.toggle("oculto", !enJuego && d.fase !== "fin");
  $("espera").classList.toggle("oculto", enJuego);
  const duelo = d.juego === "desenfunda";
  const martillo = d.juego === "martillazo";
  const paracaidas = d.juego === "paracaidas";
  const adelantado = duelo && (d.adelantados || []).includes(yo);
  const tocado = (duelo || martillo || paracaidas) && (d.tocados || []).includes(yo);
  $("salto").classList.toggle("fuera", d.juego === "alto" ? false : duelo || martillo || paracaidas ? adelantado || tocado || !d.activa || paracaidas && (d.estrellados || []).includes(yo) : !vivo);
  $("salto-txt").textContent = paracaidas ? textoParacaidas() : martillo ? textoMartillazo() : duelo ? textoDisparo() : vivo ? "Toca cuando llegue la bala" : "Te tumbaron. Mira la TV.";
  $("empezar").classList.toggle("oculto", !(anfitrion && d.fase === "lobby"));
  $("empezar").disabled = !d.puedeEmpezar;
  $("empezar").textContent = d.puedeEmpezar ? "¡Empezar!" : "Cargando personajes…";
  pintarSalto();
  $("otra").classList.toggle("oculto", !(anfitrion && d.fase === "fin"));
  if (d.fase === "lobby") $("espera-txt").textContent = anfitrion ? "Tú empiezas cuando estén todos." : "Ya estás en la fila. Mira la TV.";
  if (d.fase === "fin" && Array.isArray(d.ranking)) void darXp(d);
  if (d.fase === "fin" && Array.isArray(d.ranking)) {
    const l = d.ranking.find(x => x.id === yo);
    $("estado").textContent = l ? (l.lugar === 1 ? "¡Ganaste!" : `Quedaste en ${l.lugar}° lugar`) : "";
    $("salto").classList.add("oculto"); $("espera").classList.remove("oculto"); $("espera-txt").textContent = "Fin de la partida";
  } else $("estado").textContent = d.juego === "alto" ? textoAlto() : duelo ? (adelantado ? "Fuera de esta ronda. Vuelves en la siguiente." : "") : vivo ? "" : "Eliminado";
  if (d.juego === "alto" && d.fase !== "juego") soltarCarrera();
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
  if (ultimo?.juego === "paracaidas") {
    if (d.pid !== pid) return;
    if (d.id === yo && d.tipo === "estrella") { vibrar([80, 40, 120]); $("salto-txt").textContent = "¡Te estrellaste!"; }
    if (d.id === yo && d.tipo === "aterriza") vibrar(20);
    return;
  }
  if (ultimo?.juego === "alto") {
    if (d.pid !== pid) return;
    if (d.tipo === "atrapado" && d.id === yo) {
      vibrar([80, 40, 120]); $("estado").textContent = "¡Te atraparon! Suelta y vuelve a correr";
    }
    return;
  }
  if (ultimo?.juego === "martillazo") {
    if (d.pid !== pid) return;
    if (d.tipo === "puntaje" && d.id === yo) vibrar(d.perfecto ? [20, 30, 20] : 20);
    return;
  }
  if (ultimo?.juego === "desenfunda") {
    if (d.pid !== pid) return;
    if (d.tipo === "adelantado" && d.id === yo) { vibrar([80, 40, 120]); $("estado").textContent = "¡Adelantado! Vuelves en la siguiente ronda."; }
    if (d.tipo === "gana" && d.ids.includes(yo)) { vibrar(60); $("estado").textContent = "¡Ganaste la ronda!"; }
    return;
  }
  if (d.tipo === "golpe" && d.id === yo) { vibrar([80, 40, 120]); $("estado").textContent = "¡PUM! Eliminado"; }
  if (d.tipo === "salvado" && d.id === yo) { vibrar(20); $("estado").textContent = "¡Salvado!"; setTimeout(() => { if ($("estado").textContent === "¡Salvado!") $("estado").textContent = ""; }, 700); }
}
const vibrar = p => { try { navigator.vibrate && navigator.vibrate(p); } catch { /* sin vibración */ } };
const horaTv = () => ahora() + reloj.offset;
let pid = "";
let disparoEnviado = "";
let carrera = null;
function textoAlto() {
  if ((ultimo?.atrapados || []).includes(yo)) return "¡Te atraparon! Suelta y vuelve a correr";
  return ultimo?.fase === "cuenta" ? "Prepárate. Mira la TV" : "Mantén para correr. Suelta en ROJO";
}
function mandarCarrera(a) {
  if (carrera && reloj) canal.enviar("corre", { pid: carrera.pid, a, s: horaTv(), inc: Math.round(reloj.incertidumbre) });
}
function soltarCarrera(e) {
  if (!carrera || e?.pointerId !== undefined && e.pointerId !== carrera.dedo) return;
  mandarCarrera("suelta"); carrera = null; $("salto").classList.remove("toca");
}
setInterval(() => { if (carrera) mandarCarrera("latido"); }, 250);
for (const tipo of ["pointerup", "pointercancel", "pointerleave", "lostpointercapture"]) $("salto").addEventListener(tipo, soltarCarrera);
addEventListener("pointerup", soltarCarrera);
addEventListener("blur", () => soltarCarrera());
addEventListener("pagehide", () => soltarCarrera());
document.addEventListener("visibilitychange", () => { if (document.hidden) soltarCarrera(); });
function textoMartillazo() {
  if ((ultimo?.tocados || []).includes(yo) || disparoEnviado === pid && pid) return "Ya golpeaste. Mira la TV.";
  if (!ultimo?.activa) return "Espera el siguiente intento";
  return "Mira la barra en la TV. Golpea en el centro";
}
function textoParacaidas() {
  if ((ultimo?.estrellados || []).includes(yo)) return "¡Te estrellaste!";
  if ((ultimo?.tocados || []).includes(yo) || disparoEnviado === pid && pid) return "Ya abriste. Mira la TV";
  if (!ultimo?.activa) return "Espera la siguiente ronda";
  return "Abre lo más tarde que puedas";
}
function textoDisparo() {
  if ((ultimo?.adelantados || []).includes(yo)) return "¡Adelantado! Vuelves en la siguiente ronda";
  if ((ultimo?.tocados || []).includes(yo) || disparoEnviado === pid && pid) return "Ya disparaste. Mira la TV.";
  if (!ultimo?.activa) return "Espera la siguiente ronda";
  return "Mira la TV. Toca solo al ver ¡YA!";
}
/** Sin reloj confiable no se juega (Codex O4): el botón dice «Sincronizando…» y no manda nada. */
const sincronizado = () => relojListo(reloj) && reloj.incertidumbre <= MAX_INCERTIDUMBRE;
function pintarSalto() {
  const b = $("salto"), ok = sincronizado();
  b.classList.toggle("espera", !ok);
  if (!ok) $("salto-txt").textContent = "Sincronizando con la TV…";
  else if (ultimo?.juego === "alto") $("salto-txt").textContent = textoAlto();
  else if (ultimo?.juego === "martillazo") $("salto-txt").textContent = textoMartillazo();
  else if (ultimo?.juego === "paracaidas") $("salto-txt").textContent = textoParacaidas();
  else if (ultimo?.juego === "desenfunda") $("salto-txt").textContent = textoDisparo();
  else if (!b.classList.contains("fuera")) $("salto-txt").textContent = "Toca cuando llegue la bala";
}
setInterval(pintarSalto, 500);

// Botón de salto: se manda al tocar (pointerdown), no al soltar.
$("salto").addEventListener("pointerdown", e => {
  e.preventDefault();
  if (ultimo?.juego === "alto") {
    if (carrera || ultimo.fase !== "juego" || !sincronizado() || !pid) return;
    carrera = { pid, dedo: e.pointerId }; mandarCarrera("aprieta");
    $("salto").classList.add("toca"); vibrar(12); return;
  }
  if ($("salto").classList.contains("fuera") || !sincronizado() || !pid) return;
  if (ultimo?.juego === "desenfunda" || ultimo?.juego === "martillazo" || ultimo?.juego === "paracaidas") {
    if (!ultimo.activa || disparoEnviado === pid) return;
    disparoEnviado = pid;
    $("salto-txt").textContent = ultimo.juego === "paracaidas" ? "Ya abriste. Mira la TV" : ultimo.juego === "martillazo" ? "Ya golpeaste. Mira la TV." : "Ya disparaste. Mira la TV.";
  }
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

// ---------- Rueda de animaciones del mando (Elías, 27 nov) ----------
// Al centro y siempre visible. Mismos gajos, colores e íconos que la rueda del HUB: izquierda Saludar, arriba Ganar,
// derecha Especial, abajo Perder. Cada gajo manda «gesto» y la TV del cuarto pone la animación.
(function armarRueda() {
  const NS = "http://www.w3.org/2000/svg", ICONOS = "../../../arte/ui/gestos/";
  const R0 = 34, R1 = 96, HUECO = 3;
  const GESTOS = [
    { g: "saludo", txt: "Saludar", c1: "#9be04a", img: "gesto-saludar.webp", a: 180 },
    { g: "festejo", txt: "Ganar", c1: "#ffd84a", img: "gesto-victoria.webp", a: 270 },
    { g: "especial", txt: "Especial", c1: "#ff9a3a", img: "gesto-especial.webp", a: 0 },
    { g: "derrota", txt: "Perder", c1: "#4f86e8", img: "gesto-derrota.webp", a: 90 },
  ];
  const el = (tag, at) => { const n = document.createElementNS(NS, tag); for (const k in at) n.setAttribute(k, at[k]); return n; };
  const p = (a, r) => { const t = (a * Math.PI) / 180; return `${(r * Math.cos(t)).toFixed(2)} ${(r * Math.sin(t)).toFixed(2)}`; };
  const gajo = (a0, a1) => `M ${p(a0, R1)} A ${R1} ${R1} 0 0 1 ${p(a1, R1)} L ${p(a1, R0)} A ${R0} ${R0} 0 0 0 ${p(a0, R0)} Z`;
  const svg = el("svg", { viewBox: "-100 -100 200 200" });
  const logo = el("image", { href: ICONOS + "centro-logo-alv.webp", x: -40, y: -29, width: 80, height: 59, class: "logo" });
  const nombre = el("text", { y: 6, class: "nombre" });
  let quitar = 0;
  for (const x of GESTOS) {
    const t = (x.a * Math.PI) / 180, cx = 66 * Math.cos(t), cy = 66 * Math.sin(t);
    const g = el("g", { class: "gajo", role: "menuitem", "aria-label": x.txt,
      style: `--c1:${x.c1};--dx:${(Math.cos(t) * 6).toFixed(1)}px;--dy:${(Math.sin(t) * 6).toFixed(1)}px` });
    g.append(el("path", { d: gajo(x.a - 45 + HUECO / 2, x.a + 45 - HUECO / 2), class: "forma" }),
      el("image", { href: ICONOS + x.img, x: cx - 29, y: cy - 29, width: 58, height: 58 }));
    g.addEventListener("pointerdown", e => {
      e.preventDefault();
      canal.enviar("gesto", { g: x.g });
      vibrar(10);
      svg.querySelectorAll(".gajo.on").forEach(o => o.classList.remove("on"));
      g.classList.add("on");
      nombre.textContent = x.txt; logo.style.display = "none";
      clearTimeout(quitar);
      quitar = setTimeout(() => { g.classList.remove("on"); nombre.textContent = ""; logo.style.display = ""; }, 700);
    });
    svg.append(g);
  }
  svg.append(el("circle", { r: R0 - 3, class: "centro" }), logo, nombre);
  $("rueda").append(svg);
})();

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
  const soy = d.anfitrionId === yo;
  $("anf").classList.toggle("oculto", !soy);
  if (!soy) return;
  if (!d.ronda) $("secreta").textContent = "Toca «Nueva palabra»";
  llenar($("cat"), [["", "Categoría al azar"], ...(d.categorias || []).map(c => [c.id, c.nombre])]);
  llenar($("esc"), (d.escenarios || []).map(x => [x, "Escenario: " + x]), d.escenario);
  // Un solo control (Codex O3): «Mostrar en la TV» / «Tapar»; después de «La dijo» queda a la vista hasta la siguiente.
  const b = $("b-revelar");
  b.textContent = d.ronda && d.ronda.revelada ? "Tapar en la TV" : "Mostrar en la TV";
  b.disabled = !d.ronda || !!d.ronda.perdio;
  // El anfitrión arbitra y no compite (F2): no aparece en la lista de puntos.
  const lista = $("lista"), filas = (d.jugadores || []).filter(x => !x.desconectado && x.id !== yo);
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
window.__control = { oir: f => oyentes.push(f), get yo() { return yo; }, get reloj() { return reloj; }, get ultimo() { return ultimo; } };
