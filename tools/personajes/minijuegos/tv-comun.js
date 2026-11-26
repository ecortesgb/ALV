// TV de Mini-Juegos y del cuarto de Físico: lo que comparten (prototipo, zona aparte).
// Sala, canal con los celulares, reloj (contesta pings), registro de jugadores, carga de personajes y etiquetas.
// Lo que llega pasa por el contrato (`validarDeCelular`) y por la secuencia de cada celular (Codex O3).
// Durante una partida nadie se borra: quien se va queda «desconectado» hasta volver al lobby (Codex O1).
import { abrirCanal, ahora, crearSecuencias, redDeUrl, salaNueva, validarDeCelular } from "/src/personajes/minijuegos/canal.ts";
import { colorJugador } from "/src/app/colorJugador.ts";

const q = new URLSearchParams(location.search);
export const FUENTE = (q.get("fuente") || "http://127.0.0.1:4193/").replace(/\/?$/, "/");
export const COMPLETOS = (q.get("completos") || "http://127.0.0.1:4197/completos/").replace(/\/?$/, "/");
/** Los del prototipo: tienen caminar, correr, saltar, golpe, golpe recibido y caída en su GLB completo (2026-11-26). */
export const PERSONAJES = ["iron-man", "black-widow", "wolverine", "hulk", "capitan-america", "spider-man", "black-panther", "thor"];
export const MAX_JUGADORES = 6;
const SIN_SENAL_MS = 15000;
// Solo para pruebas: ?fallar=hulk,thor hace que esos personajes «no carguen» en la TV (prueba de Codex O7).
const FALLAR = new Set((q.get("fallar") || "").split(",").filter(Boolean));

export function crearTV({ juego, escena, alUnirse, alMensaje, alSalir, alDesconectar, topeEtiquetas = 118 }) {
  const sala = (q.get("sala") || salaNueva()).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  if (!q.get("sala")) { q.set("sala", sala); history.replaceState(null, "", "?" + q.toString()); }
  // id → { id, nombre, personaje, n, color, figura, estado: "cargando"|"listo"|"error", desconectado, bot, visto }
  const jugadores = new Map();
  let catalogo = new Map();
  const listo = FigurasMJ.indice(FUENTE).then(m => { catalogo = m; return m; });
  const capa = document.getElementById("capa");
  const seq = crearSecuencias();
  let fase = "lobby", extra = () => ({});

  const canal = abrirCanal(sala, "tv", crudo => {
    const d = validarDeCelular(crudo);
    if (!d) return;
    // Pings y holas no se ordenan (pueden cruzarse con los demás); lo de juego sí, por tipo.
    if (!["ping", "hola"].includes(crudo.tipo) && !seq.nueva(crudo.de + "|" + crudo.tipo, d.n)) return;
    const m = { de: crudo.de, tipo: crudo.tipo, d };
    const j = jugadores.get(m.de);
    if (j) { j.visto = Date.now(); if (j.desconectado && m.tipo !== "adios") reconectar(j); }
    if (m.tipo === "ping") { canal.enviar("pong", { para: m.de, t0: d.t0, t: ahora() }); return; }
    if (m.tipo === "hola") return unir(m.de, d);
    if (m.tipo === "adios") return quitar(m.de);
    if (j && !j.desconectado && alMensaje) alMensaje(j, m);
  }, redDeUrl(q));

  function disponibles() { return PERSONAJES.filter(id => catalogo.has(id)); }

  async function unir(id, d, bot = false) {
    await listo;
    const ya = jugadores.get(id);
    // En partida: solo los que ya estaban (y sin cambiar de personaje).
    if (fase !== "lobby" && !(bot && !ya)) { if (!ya) canal.enviar("lleno", { para: id }); return; }
    const personaje = catalogo.has(d.personaje) ? d.personaje : disponibles()[jugadores.size % Math.max(1, disponibles().length)];
    const nombre = String(d.nombre || "Jugador").replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 16) || "Jugador";
    let j = ya;
    if (!j) {
      if (jugadores.size >= MAX_JUGADORES) { canal.enviar("lleno", { para: id }); return; }
      const n = [...Array(MAX_JUGADORES).keys()].find(k => ![...jugadores.values()].some(o => o.n === k));
      j = { id, nombre, personaje: null, n, color: colorJugador(n), figura: null, estado: "cargando", desconectado: false, bot, visto: Date.now() };
      jugadores.set(id, j);
      j.etiqueta = document.createElement("div");
      j.etiqueta.className = "etiqueta";
      j.etiqueta.innerHTML = `<div class="placa"></div>`;
      capa.appendChild(j.etiqueta);
    }
    j.nombre = nombre;
    const placa = j.etiqueta.querySelector(".placa");
    placa.textContent = `${j.color.etiqueta} ${nombre}`;
    placa.style.background = j.color.base; placa.style.color = j.color.texto;
    if (j.personaje !== personaje || j.estado === "error") { // el mismo después de un error = reintento
      j.personaje = personaje; j.estado = "cargando"; difundir();
      const ficha = catalogo.get(personaje).ficha;
      const mio = (j.carga = (j.carga || 0) + 1);
      try {
        if (FALLAR.has(personaje)) throw new Error("carga fallida a propósito (?fallar)");
        const f = await FigurasMJ.crear(ficha, { base: catalogo.get(personaje).base, completos: COMPLETOS, idFigura: id });
        if (mio !== j.carga || !jugadores.has(id)) { f.quitar(); return; }
        if (j.figura) j.figura.quitar();
        j.figura = f; j.alto = 0; j.estado = "listo";
        escena.scene.add(f.obj);
        if (!j.aro) { j.aro = EscenaMJ.aro(j.color.base, 1); escena.scene.add(j.aro); }
      } catch (e) {
        if (mio !== j.carga) return;
        j.estado = "error"; console.error("No cargó", personaje, e);
      }
    }
    if (alUnirse) alUnirse(j);
    difundir();
  }

  /** Se fue (adiós o sin señal). En el lobby se borra; en partida queda desconectado y sigue en la fila. */
  function quitar(id) {
    const j = jugadores.get(id);
    if (!j) return;
    if (fase !== "lobby") {
      if (!j.desconectado) { j.desconectado = true; j.etiqueta.classList.add("fuera"); if (alDesconectar) alDesconectar(j); difundir(); }
      return;
    }
    borrar(j);
  }
  function reconectar(j) { j.desconectado = false; j.etiqueta.classList.remove("fuera"); difundir(); }
  function borrar(j) {
    if (j.figura) j.figura.quitar();
    if (j.aro) escena.scene.remove(j.aro);
    j.etiqueta.remove();
    jugadores.delete(j.id);
    seq.olvidar(j.id);
    if (alSalir) alSalir(j);
    difundir();
  }
  /** Al volver al lobby: se van los que se desconectaron durante la partida. */
  function limpiarDesconectados() { [...jugadores.values()].filter(j => j.desconectado).forEach(borrar); }

  function difundir() {
    canal.enviar("estado", Object.assign({
      juego, fase, sala, personajes: disponibles(),
      jugadores: [...jugadores.values()].map(j => ({ id: j.id, nombre: j.nombre, personaje: j.personaje, n: j.n, color: j.color.base, bot: j.bot, estado: j.estado, desconectado: j.desconectado })),
    }, extra()));
  }
  setInterval(difundir, 2000);
  // Un celular que no da señales en 15 s se va (cerró la pestaña sin despedirse o se quedó sin red).
  setInterval(() => { const t = Date.now(); jugadores.forEach(j => { if (!j.bot && !j.desconectado && t - j.visto > SIN_SENAL_MS) quitar(j.id); }); }, 3000);

  const v = new THREE.Vector3();
  function etiquetas() {
    const w = innerWidth, h = innerHeight;
    jugadores.forEach(j => {
      if (!j.figura) { j.etiqueta.style.display = "none"; return; }
      const o = j.figura.obj;
      v.set(o.position.x, o.position.y + (j.alto || (j.alto = j.figura.alto())) + 0.35, o.position.z).project(escena.camera);
      j.etiqueta.style.display = v.z < 1 ? "" : "none";
      j.etiqueta.style.left = ((v.x + 1) / 2) * w + "px";
      // Nunca encima del título (Codex O9): la etiqueta baja hasta debajo de la franja de arriba.
      j.etiqueta.style.top = Math.max(topeEtiquetas, ((1 - v.y) / 2) * h) + "px";
      if (j.aro) { j.aro.position.x = o.position.x; j.aro.position.z = o.position.z; j.aro.scale.setScalar(Math.max(0.9, (j.figura.ancho() || 1) * 0.75)); }
    });
  }

  /** Letrero que salta sobre un jugador («¡PUM!», «¡Salvado!»). */
  function pop(j, texto, color) {
    if (!j || !j.figura) return;
    const o = j.figura.obj;
    v.set(o.position.x, o.position.y + (j.alto || 2.6) * 0.75, o.position.z).project(escena.camera);
    const p = document.createElement("div");
    p.className = "pop"; p.textContent = texto; p.style.color = color || "#ffcf2e";
    p.style.left = ((v.x + 1) / 2) * innerWidth + "px"; p.style.top = Math.max(150, ((1 - v.y) / 2) * innerHeight) + "px";
    capa.appendChild(p); setTimeout(() => p.remove(), 950);
  }

  // Enlace del control y aviso de la red simulada.
  const control = new URL("control.html", location.href);
  control.search = new URLSearchParams({ sala, ...(q.get("lat") ? { lat: q.get("lat") } : {}), ...(q.get("jit") ? { jit: q.get("jit") } : {}) }).toString();
  const a = document.getElementById("abrir"); if (a) a.href = control.href;
  const c = document.getElementById("codigo"); if (c) c.textContent = sala;
  const red = document.getElementById("red");
  if (red && (q.get("lat") || q.get("jit"))) red.textContent = `red simulada: ${q.get("lat") || 0} ms ± ${q.get("jit") || 0}`;

  return {
    sala, jugadores, canal, listo, unir, quitar, difundir, etiquetas, pop, disponibles, limpiarDesconectados, control: control.href,
    /** Todos cargaron su personaje (para dejar empezar; Codex O7). */
    todosListos: () => jugadores.size > 0 && [...jugadores.values()].every(j => j.estado === "listo" && !j.desconectado),
    get fase() { return fase; }, set fase(f) { fase = f; difundir(); },
    set extra(f) { extra = f; },
    catalogo: () => catalogo,
  };
}
