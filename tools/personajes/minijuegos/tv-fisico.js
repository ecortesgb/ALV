// TV de la sala de Físico (prototipo, zona aparte). La TV guarda el estado (src/personajes/minijuegos/fisico.ts);
// el anfitrión (P1, el primero que entró) manda las acciones desde su celular; cada jugador anima a su personaje y
// contesta si acepta un castigo o reto de contacto. Los puntos viven en la TV (memoria y localStorage): guardarlos en la
// nube necesita la migración 038 y solo se conecta cuando Elías la autorice (ver `alCambiarPuntos`).
import { agregarJugador, asignar, crearFisico, darPuntos, nuevaRonda, perdio, responder, revelar, tabla, CASTIGOS, CATEGORIAS, RETOS } from "/src/personajes/minijuegos/fisico.ts";
import { azarCon } from "/src/personajes/minijuegos/bala.ts";
import { crearTV } from "./tv-comun.js";

const q = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const ESCENARIOS = ["ciudad", "alberca", "fogata", "parque"];
let escenario = ESCENARIOS.includes(q.get("escenario")) ? q.get("escenario") : "ciudad";
let modo = q.get("palabra") === "oculta" ? "oculta" : "visible";
const escena = EscenaMJ.crear($("lienzo"), { fov: 30, transparente: true });
EscenaMJ.pisoSombra(escena.scene, 60);
const azar = azarCon(Date.now() & 0xffffffff);
const HUECO = 0.9;
let fx = null;

const tv = crearTV({
  juego: "fisico", escena,
  alUnirse: j => {
    if (!fx) fx = crearFisico([], cargarPuntos());
    agregarJugador(fx, j.id);
    if (!j.etiqueta.querySelector(".pts")) { const p = document.createElement("div"); p.className = "pts"; j.etiqueta.appendChild(p); }
    acomodar(); pintar();
    if (j.figura) j.figura.anim("saludo");
  },
  alSalir: () => { acomodar(); pintar(); },
  alMensaje: (j, m) => {
    if (m.tipo === "gesto") { if (j.figura) j.figura.anim(m.d.g); return; }
    if (m.tipo === "acepta") return contestar(j, m.d.si);
    if (m.tipo === "fx") { if (j.n !== anfitrion()) return; accion(j, m.d); }
  },
});
const anfitrion = () => Math.min(...[...tv.jugadores.values()].filter(j => !j.bot && !j.desconectado).map(j => j.n), 99);
const nombre = id => tv.jugadores.get(id)?.nombre || "?";

// Lo que ven los celulares. La palabra solo va si está revelada o si se juega «visible»; al anfitrión le llega aparte.
tv.extra = () => {
  const r = fx && fx.ronda;
  return {
    modo, escenario, anfitrion: anfitrion(),
    ronda: r ? { n: r.n, categoria: r.categoria.nombre, palabra: r.revelada || modo === "visible" ? r.palabra : null, revelada: r.revelada, perdio: r.perdio } : null,
    puntos: fx ? Object.fromEntries(fx.puntos) : {},
    pendientes: fx ? [...fx.pendientes.values()].map(p => ({ id: p.id, tipo: p.tipo, texto: p.castigo.texto })) : [],
    castigos: CASTIGOS.map(c => ({ id: c.id, texto: c.texto, contacto: c.contacto })),
    retos: RETOS.map(c => ({ id: c.id, texto: c.texto, contacto: c.contacto })),
    categorias: CATEGORIAS.map(c => ({ id: c.id, nombre: c.nombre })),
    escenarios: ESCENARIOS,
  };
};
/** La palabra al anfitrión aunque esté tapada: él juzga quién la dijo. (Con WebSocket irá solo a su celular.) */
function secretoAlAnfitrion() {
  const h = [...tv.jugadores.values()].find(j => j.n === anfitrion());
  if (h && fx && fx.ronda) tv.canal.enviar("secreto", { para: h.id, palabra: fx.ronda.palabra });
}
setInterval(secretoAlAnfitrion, 2000);

// ---------- Acciones del anfitrión ----------
function accion(h, d) {
  if (!fx) return;
  const j = d.id ? tv.jugadores.get(d.id) : null;
  switch (d.a) {
    case "ronda": nuevaRonda(fx, azar, CATEGORIAS.some(c => c.id === d.c) ? d.c : undefined); tv.jugadores.forEach(x => x.figura && x.figura.anim("nervios")); avisar(`Ronda ${fx.ronda.n}: ${fx.ronda.categoria.nombre}`, "Digan una palabra de la categoría por turnos; quien diga la prohibida, pierde"); break;
    case "revelar": revelar(fx); break;
    case "ocultar": if (fx.ronda && !fx.ronda.perdio) fx.ronda.revelada = false; break;
    case "ver": modo = modo === "visible" ? "oculta" : "visible"; break;
    case "perdio": if (j && perdio(fx, j.id)) { j.figura && j.figura.anim("derrota"); tv.pop(j, "¡La dijo!", "#e8343a"); avisar(`¡${j.nombre} dijo «${fx.ronda.palabra}»!`, "Pierde la ronda"); } break;
    case "puntos": if (j && typeof d.n2 === "number") { const t = darPuntos(fx, j.id, d.n2); if (t !== null) { if (d.n2 > 0 && j.figura) j.figura.anim("festejo"); tv.pop(j, (d.n2 > 0 ? "+" : "") + d.n2, d.n2 > 0 ? "#8cf09a" : "#ff8a1f"); alCambiarPuntos(); } } break;
    case "castigo": case "reto": if (j && d.c) {
      const r = asignar(fx, j.id, d.a, d.c);
      const c = (d.a === "castigo" ? CASTIGOS : RETOS).find(x => x.id === d.c);
      if (r === "pendiente") avisar(`${j.nombre}: ${c.texto}`, "Es de contacto: espera a que acepte en su celular");
      else if (r === "aplicado") { avisar(`${j.nombre}: ${c.texto}`, d.a === "castigo" ? "Castigo" : "Reto"); j.figura && j.figura.anim(d.a === "castigo" ? "nervios" : "especial"); }
    } break;
    case "escenario": if (ESCENARIOS.includes(d.c)) { escenario = d.c; ponerEscenario(); } break;
  }
  pintar(); tv.difundir(); secretoAlAnfitrion();
}

function contestar(j, si) {
  if (!fx) return;
  const r = responder(fx, j.id, si, azar);
  if (!r) return;
  if (r.estado === "aplicado") { avisar(`${j.nombre} aceptó: ${r.castigo.texto}`, "¡A cumplir!"); j.figura && j.figura.anim("festejo"); }
  else avisar(`${j.nombre} no aceptó «${r.castigo.texto}»`, `Le toca otro sin contacto: ${r.alternativa.texto}`);
  pintar(); tv.difundir();
}

// ---------- Puntos: memoria + localStorage (aquí se conectaría la 038) ----------
const LLAVE = "alv-fisico-puntos-" + tv.sala;
function cargarPuntos() { try { return JSON.parse(localStorage.getItem(LLAVE) || "{}"); } catch { return {}; } }
/**
 * Punto de conexión con la nube: cuando Elías autorice la migración 038 (Plan de Modos D5), aquí se mandarían los puntos
 * de la sala al servidor (una función del servidor que valide al anfitrión, nunca escritura directa desde el navegador).
 * Por ahora solo se guardan en este navegador.
 */
function alCambiarPuntos() {
  try { localStorage.setItem(LLAVE, JSON.stringify(Object.fromEntries(fx.puntos))); } catch { /* sin almacenamiento */ }
}

// ---------- Dibujo ----------
function ponerEscenario() { document.body.className = "esc-" + escenario; }
ponerEscenario();
function fila() { return [...tv.jugadores.values()].sort((a, b) => a.n - b.n); }
function acomodar() {
  const lista = fila();
  const anchos = lista.map(j => (j.figura ? Math.max(1.6, j.figura.ancho()) : 1.8));
  const total = anchos.reduce((a, b) => a + b, 0) + HUECO * Math.max(0, lista.length - 1);
  let x = -total / 2;
  lista.forEach((j, i) => { j.x = x + anchos[i] / 2; x += anchos[i] + HUECO; if (j.figura) { j.figura.obj.position.set(j.x, 0, 0); j.figura.obj.rotation.y = 0; } });
  const alto = Math.max(2.7, ...lista.map(j => (j.figura ? j.figura.alto() : 2.7)));
  // Los personajes abajo: arriba queda libre para la categoría y la palabra.
  const c = escena.camera, tanV = Math.tan((c.fov * Math.PI) / 360), tanH = tanV * c.aspect;
  const d = Math.max(13, (Math.max(10, total + 4) / 2) / tanH, (alto * 2.3) / (2 * tanV));
  c.position.set(0, alto * 0.75, d); c.lookAt(0, alto * 0.95, 0);
}
addEventListener("resize", acomodar);

function pintar() {
  const r = fx && fx.ronda, cont = $("juego");
  $("titulo").textContent = r ? "Palabra prohibida" : "Físico";
  if (!r) cont.innerHTML = `<div class="cat">Esperando al anfitrión…</div>`;
  else {
    const ver = r.revelada || modo === "visible";
    const perdedor = r.perdio ? tv.jugadores.get(r.perdio) : null;
    cont.innerHTML = `<div class="cat"></div>${ver ? `<div class="palabra"></div>` : `<div class="tapada">Palabra secreta</div>`}${perdedor ? `<div class="perdio"></div>` : ""}`;
    cont.querySelector(".cat").textContent = r.categoria.nombre; // textContent: nada de HTML con texto de jugadores
    if (ver) cont.querySelector(".palabra").textContent = r.palabra;
    if (perdedor) { const p = cont.querySelector(".perdio"); p.textContent = `La dijo ${perdedor.nombre}`; p.style.background = perdedor.color.base; p.style.color = perdedor.color.texto; }
  }
  if (fx) tabla(fx).forEach(f => { const j = tv.jugadores.get(f.id); const p = j && j.etiqueta.querySelector(".pts"); if (p) p.textContent = `${f.puntos} pts`; });
}
function avisar(texto, sub) {
  const a = $("aviso"), d = document.createElement("div");
  d.textContent = texto;
  if (sub) { const s = document.createElement("small"); s.textContent = sub; d.appendChild(s); }
  a.appendChild(d); while (a.children.length > 2) a.firstChild.remove();
  setTimeout(() => d.remove(), 6000);
}

escena.alCuadro(dt => { tv.jugadores.forEach(j => j.figura && j.figura.update(dt)); tv.etiquetas(); });

// ---------- Jugadores de prueba (?bots=N): solo se paran en la fila y saludan ----------
(async () => {
  const n = Math.min(5, Number(q.get("bots")) || 0);
  await tv.listo;
  const lista = tv.disponibles();
  for (let i = 0; i < n; i++) await tv.unir("bot" + (i + 1), { nombre: ["Beto", "Caro", "Dani", "Eli", "Fer"][i], personaje: lista[(i + 1) % lista.length] }, true);
})();
pintar();
window.__fisico = { tv, get fx() { return fx; }, accion: (d, h) => accion(h || { n: 0 }, d), get modo() { return modo; } };
