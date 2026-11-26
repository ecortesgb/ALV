// TV de Mini-Juegos y del cuarto de Físico: lo que comparten (prototipo, zona aparte).
// Sala, canal con los celulares, reloj (contesta pings), registro de jugadores, carga de personajes y etiquetas.
// Lo que llega pasa por el contrato (`validarDeCelular`) y por la secuencia de cada celular (Codex O3).
// Durante una partida nadie se borra: quien se va queda «desconectado» hasta volver al lobby (Codex O1).
import { abrirCanal, abrirCanalWs, ahora, crearSecuencias, redDeUrl, salaNueva, urlSala, validarDeCelular, SERVIDOR } from "/src/personajes/minijuegos/canal.ts";
import { colorJugador } from "/src/app/colorJugador.ts";
import qrcode from "qrcode-generator";

const q = new URLSearchParams(location.search);
/** ?canal=pestanas: modo de prueba sin servidor (BroadcastChannel). Por omisión, WebSocket al servidor de sala (D8). */
export const PESTANAS = q.get("canal") === "pestanas";
// Modelos del mismo aparato que sirvió la página: en esta PC, localhost; si la TV abre la página desde otro aparato de la
// casa (http://192.168.x.x:4202/…), la PC tiene que correr el servidor de personajes con --red (launch: personajes-privados-red).
export const FUENTE = (q.get("fuente") || `http://${location.hostname}:4193/`).replace(/\/?$/, "/");
export const MAX_JUGADORES = 6;
const SIN_SENAL_MS = 15000;
// Solo para pruebas: ?fallar=hulk,thor hace que esos personajes «no carguen» en la TV (prueba de Codex O7).
const FALLAR = new Set((q.get("fallar") || "").split(",").filter(Boolean));

export function crearTV({ juego, escena, alUnirse, alMensaje, alSalir, alDesconectar, alAnfitrion, topeEtiquetas = 118 }) {
  const sala = (q.get("sala") || salaNueva()).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  if (!q.get("sala")) { q.set("sala", sala); history.replaceState(null, "", "?" + q.toString()); }
  // id → { id, nombre, personaje, n, color, figura, estado: "cargando"|"listo"|"error", desconectado, bot, visto }
  const jugadores = new Map();
  let catalogo = new Map();
  const listo = FigurasMJ.indice(FUENTE).then(m => { catalogo = m; return m; });
  const capa = document.getElementById("capa");
  const seq = crearSecuencias();
  let fase = "lobby", extra = () => ({}), anfitrionServidor = null;

  const alLlegar = crudo => {
    // Avisos del servidor de sala: quién entró o salió y quién es el anfitrión (lo decide él, no los mensajes).
    if (crudo.de === SERVIDOR) {
      if (crudo.tipo === "bienvenida") mostrarDirecciones(Array.isArray(crudo.d.direcciones) ? crudo.d.direcciones : [], !!crudo.d.red);
      else if (crudo.tipo === "entro" && typeof crudo.d.id === "string") seq.olvidar(crudo.d.id); // celular recargado: su cuenta empieza en 1
      else if (crudo.tipo === "salio" && typeof crudo.d.id === "string") quitar(crudo.d.id);
      else if (crudo.tipo === "anfitrion") { anfitrionServidor = typeof crudo.d.id === "string" ? crudo.d.id : null; avisarAnfitrion(); difundir(); }
      return;
    }
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
  };
  const estadoConexion = document.getElementById("como");
  const canal = PESTANAS ? abrirCanal(sala, "tv", alLlegar, redDeUrl(q))
    : abrirCanalWs(urlSala(q, sala, "tv"), alLlegar, redDeUrl(q), (abierto, motivo) => {
      if (!estadoConexion) return;
      if (!abierto) estadoConexion.textContent = motivo === "la sala ya tiene TV" ? "Esta sala ya tiene TV abierta" : "Sin servidor de sala (4200): reintentando…";
    });

  /**
   * Anfitrión: con WebSocket lo asigna el servidor (primer celular conectado). En pestañas no hay quién lo garantice:
   * se toma el primero de la fila (solo pruebas).
   */
  function anfitrionId() {
    if (!PESTANAS) { const j = jugadores.get(anfitrionServidor); return j && !j.desconectado ? j.id : null; }
    const vivos = [...jugadores.values()].filter(j => !j.bot && !j.desconectado).sort((a, b) => a.n - b.n);
    return vivos.length ? vivos[0].id : null;
  }

  /** Cómo entran los celulares: dirección de la casa + QR (solo si el servidor escucha en la red). */
  function mostrarDirecciones(ips, enRed) {
    const caja = document.getElementById("sala");
    if (!caja || !estadoConexion) return;
    const ruta = location.pathname.replace(/[^/]+$/, "control.html");
    const ip = ips[0];
    if (!enRed || !ip) { estadoConexion.textContent = "Solo esta PC (servidor sin --red)"; return; }
    const url = `http://${ip}:${location.port || 80}${ruta}?sala=${sala}`;
    estadoConexion.textContent = url;
    let qr = caja.querySelector(".qr");
    if (!qr) { qr = document.createElement("div"); qr.className = "qr"; caja.appendChild(qr); }
    const codigo = qrcode(0, "M"); codigo.addData(url); codigo.make();
    qr.innerHTML = codigo.createSvgTag({ cellSize: 3, margin: 2 }); // SVG generado aquí, sin texto de jugadores
  }

  /** Todos los del catálogo que traen su GLB «juego» (desde 2026-11-26 son los 120), por nombre. */
  function disponibles() { return [...catalogo.keys()]; }

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
        const f = await FigurasMJ.crear(ficha, { base: catalogo.get(personaje).base, idFigura: id });
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
    avisarAnfitrion();
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
    avisarAnfitrion();
    difundir();
  }
  /** Avisa al juego quién es el anfitrión ahora (Físico anula la ronda si cambió con la palabra tapada; Codex N1). */
  let anfitrionVisto;
  function avisarAnfitrion() {
    const a = anfitrionId();
    if (a === anfitrionVisto) return;
    anfitrionVisto = a;
    if (alAnfitrion) alAnfitrion(a);
  }
  /** Al volver al lobby: se van los que se desconectaron durante la partida. */
  function limpiarDesconectados() { [...jugadores.values()].filter(j => j.desconectado).forEach(borrar); }

  function difundir() {
    canal.enviar("estado", Object.assign({
      juego, fase, sala, personajes: disponibles(),
      jugadores: [...jugadores.values()].map(j => ({ id: j.id, nombre: j.nombre, personaje: j.personaje, n: j.n, color: j.color.base, bot: j.bot, estado: j.estado, desconectado: j.desconectado })),
      anfitrionId: anfitrionId(),
    }, extra()));
  }
  setInterval(difundir, 2000);
  // Un celular que no da señales en 15 s se va (en pestañas no hay quien avise; con WebSocket avisa el servidor).
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
      j.etiqueta.style.top = Math.max(typeof topeEtiquetas === "function" ? topeEtiquetas() : topeEtiquetas, ((1 - v.y) / 2) * h) + "px";
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
    sala, jugadores, canal, listo, unir, quitar, anfitrionId,
    esAnfitrion: j => !!j && j.id === anfitrionId(), difundir, etiquetas, pop, disponibles, limpiarDesconectados, control: control.href,
    /** Todos cargaron su personaje (para dejar empezar; Codex O7). */
    todosListos: () => jugadores.size > 0 && [...jugadores.values()].every(j => j.estado === "listo" && !j.desconectado),
    get fase() { return fase; }, set fase(f) { fase = f; difundir(); },
    set extra(f) { extra = f; },
    catalogo: () => catalogo,
  };
}
