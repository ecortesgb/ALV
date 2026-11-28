// TV de Mini-Juegos y del cuarto de Físico: lo que comparten (prototipo, zona aparte).
// Sala, canal con los celulares, reloj (contesta pings), registro de jugadores, carga de personajes y etiquetas.
// Lo que llega pasa por el contrato (`validarDeCelular`) y por la secuencia de cada celular (Codex O3).
// Durante una partida nadie se borra: quien se va queda «desconectado» hasta volver al lobby (Codex O1).
import { abrirCanal, abrirCanalNube, abrirCanalWs, ahora, crearSecuencias, redDeUrl, salaNueva, urlSala, validarDeCelular, SERVIDOR } from "/src/personajes/minijuegos/canal.ts";
import { colorJugador } from "/src/app/colorJugador.ts";
import qrcode from "qrcode-generator";
import { cliente } from "/src/servicios/cliente.ts";
import { crearMandosLocales } from "./mandos-locales.js";
import { fuentePrivada } from "/src/servicios/personajesPrivados.ts";
import { movimientosDeFicha, poderesDeFicha } from "/src/personajes/plano.ts";
import { SETS } from "/src/personajes/sets.ts";
import { sonarPoder } from "/src/app/sonido.ts";

const q = new URLSearchParams(location.search);
/** ?canal=pestanas: modo de prueba sin servidor (BroadcastChannel). Por omisión, WebSocket al servidor de sala (D8). */
export const PESTANAS = q.get("canal") === "pestanas";
/** ?canal=nube: Realtime de Supabase (no necesita la PC). Sin nube configurada, cae a pestañas. */
// Publicado (sin servidor de desarrollo) la nube es la opción por omisión: no hay PC ni servidor 4200.
const CANAL = q.get("canal") || (import.meta.env.DEV ? "" : "nube");
export const NUBE = CANAL === "nube" && !!cliente;
// Modelos del mismo aparato que sirvió la página: en esta PC, localhost; si la TV abre la página desde otro aparato de la
// casa (http://192.168.x.x:4202/…), la PC tiene que correr el servidor de personajes con --red (launch: personajes-privados-red).
export const FUENTE = (q.get("fuente") || `http://${location.hostname}:4193/`).replace(/\/?$/, "/");
export const MAX_JUGADORES = 6;
const SIN_SENAL_MS = 15000;
// Solo para pruebas: ?fallar=hulk,thor hace que esos personajes «no carguen» en la TV (prueba de Codex O7).
const FALLAR = new Set((q.get("fallar") || "").split(",").filter(Boolean));

// ---------- Pausa (Elías, 27 nov: «menú o botón de pausa en las partidas, sobre todo cuando hay tiempo») ----------
// El reloj del juego se detiene mientras dura la pausa; el de los celulares (pings) sigue igual. Los toques llegan con
// la hora de la TV sin pausa, así que cada juego los pasa por aJuego() antes de compararlos con ahoraJuego().
let pausaDesde = null, enPausa = 0;
/** Hora de la TV para el juego: no avanza en pausa. */
export const ahoraJuego = () => (pausaDesde ?? ahora()) - enPausa;
/** Hora de un toque (hora de la TV sin pausa) en el reloj del juego. */
export const aJuego = s => (typeof s === "number" ? s - enPausa : s);
/** A dónde vuelve «Salir»: a la página anterior de ALV si de ahí vino (ALV PARTY, Modos), si no al inicio. */
export function salirAAlv() {
  const raiz = new URL("../../../", location.href);
  let mismo = false;
  try { mismo = !!document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1; } catch { mismo = false; }
  if (mismo) history.back(); else location.assign(new URL("#/inicio", raiz).href);
}

/** Franjas de Física (O4): texto arriba, cabezas + 62 px de etiqueta abajo; pies a 24 px del borde. */
export function crearEncuadreFranjas(escena) {
  const ETIQUETA = 62, v3 = new THREE.Vector3();
  function franja() { return Math.round(innerHeight * 0.13 + Math.min(260, innerHeight * 0.36)); }
  function encuadrar(ancho, alto) {
    const c = escena.camera, H = innerHeight, fondo = H - 24;
    const tanV = Math.tan((c.fov * Math.PI) / 360), tanH = tanV * c.aspect;
    const yPant = y => { v3.set(0, y, 0).project(c); return ((1 - v3.y) / 2) * H; };
    let d = Math.max(12, (ancho / 2) / tanH);
    for (let i = 0; i < 60; i++, d *= 1.04) {
      let lo = -alto * 3, hi = alto * 4, mira = 0;
      for (let k = 0; k < 30; k++) { // dónde mirar para que los pies queden en «fondo»
        mira = (lo + hi) / 2;
        c.position.set(0, alto * 0.6, d); c.lookAt(0, mira, 0); c.updateMatrixWorld(true);
        if (yPant(0) > fondo) hi = mira; else lo = mira;
      }
      if (yPant(alto) - ETIQUETA >= franja()) break;
    }
  }
  return { franja, encuadrar };
}

/** Lanza el poder i de un jugador (clip del GLB de poderes y sus efectos). Sin i: el primero que no sea de volar.
 *  → Promise<duración en s, o 0 si no tiene o no bajó>. Lo usan el cuarto y ¡Desenfunda! (el disparo). */
// Efectos que mueven la figura (vuelo, supervelocidad): aquí la posición la pone el juego cada cuadro, así que van sobre
// un punto a sus pies (hijo de la figura) y solo se ve su estela alrededor.
const MUEVEN = new Set(["volar", "velocidad"]);
/** Lanza un efecto de poder sobre el jugador, con su sonido y el tope de cámara. → { fin() } o null. */
export function lanzarEfecto(j, escena, ef, cambios) {
  const f = j && j.figura;
  if (!f || !self.EfectosALV || !ef) return null;
  let obj = f.obj;
  if (MUEVEN.has(ef.tipo)) { if (!j.pies) { j.pies = new THREE.Object3D(); f.obj.add(j.pies); } obj = j.pies; }
  try {
    return self.EfectosALV.lanzar(escena.scene, { obj, hueso: f.hueso }, cambios ? Object.assign({}, ef, cambios) : ef,
      { escala: f.alto(), sonar: sonarPoder, camara: escena.camera });
  } catch (e) { console.warn("efecto", e); return null; }
}

/** Movimientos de sus sets que salen en la rueda del mando (los de andar no), hasta 24 (6 páginas de 4). */
export function deRueda(j) {
  const f = j && j.figura;
  if (!f || !Array.isArray(f.movs)) return [];
  return f.movs.filter(m => { const i = m.id.indexOf("-"), set = SETS[m.id.slice(0, i)]; return !!set?.movs[m.id.slice(i + 1)]?.rueda; })
    .slice(0, 24).map(m => ({ id: m.id, nombre: m.nombre }));
}

export function lucirPoder(j, escena, i) {
  const f = j && j.figura;
  if (!f || !f.poder || !f.poderes) return Promise.resolve(0);
  const k = i != null ? i : f.poderes.findIndex(p => p.id !== "volar" && p.id !== "levitar");
  if (k < 0 || !f.poderes[k]) return Promise.resolve(0);
  return f.poder(k).then(r => {
    if (!r) return 0;
    if (self.EfectosALV) r.efectos.forEach(ef => lanzarEfecto(j, escena, ef));
    return r.dur;
  });
}

export function crearTV({ juego, escena, alUnirse, alMensaje, alSalir, alDesconectar, alAnfitrion, topeEtiquetas = 118 }) {
  const sala = (q.get("sala") || salaNueva()).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  if (!q.get("sala")) { q.set("sala", sala); history.replaceState(null, "", "?" + q.toString()); }
  // id → { id, nombre, personaje, n, color, figura, estado: "cargando"|"listo"|"error", desconectado, bot, visto }
  const jugadores = new Map();
  let catalogo = new Map();
  // En la nube: los personajes de la entrega privada (service worker + bucket, como el HUB); la TV necesita sesión.
  // La base es la raíz de la app (donde vive sw-privados.js), no esta carpeta.
  const fuente = NUBE && !q.get("fuente")
    ? fuentePrivada({ cliente, base: new URL("../../../", location.href).href }).then(f => {
      if (!f) { const e = document.getElementById("como"); if (e) e.textContent = "Inicia sesión en ALV en esta TV para ver los personajes"; throw new Error("sin fuente privada"); }
      return f;
    })
    : Promise.resolve(FUENTE);
  const listo = fuente.then(f => FigurasMJ.indice(f)).then(m => { catalogo = m; return m; });
  // Sin personajes nadie puede entrar (los celulares se quedan en «Entrando…»): que la TV lo diga en vez de quedarse callada.
  listo.catch(e => {
    const el = document.getElementById("como");
    if (el && !String(e && e.message).includes("sin fuente privada")) el.textContent = "No cargaron los personajes. Revisa la conexión y recarga esta pantalla.";
  });
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
    if (m.tipo === "pausa") { if (j && j.id === anfitrionId()) pausar(d.si); return; }
    if (pausaDesde !== null) return; // en pausa no cuenta ningún toque
    if (j && !j.desconectado && alMensaje) alMensaje(j, m);
  };
  const estadoConexion = document.getElementById("como");
  const canal = PESTANAS || (CANAL === "nube" && !cliente) ? abrirCanal(sala, "tv", alLlegar, redDeUrl(q))
    : NUBE ? abrirCanalNube(cliente, sala, "tv", alLlegar, redDeUrl(q), abierto => {
      if (estadoConexion) estadoConexion.textContent = abierto ? "" : "Sin conexión: reintentando…";
      if (abierto) mostrarDirecciones([location.host], true);
    })
    : abrirCanalWs(urlSala(q, sala, "tv"), alLlegar, redDeUrl(q), (abierto, motivo) => {
      if (!estadoConexion) return;
      if (!abierto) estadoConexion.textContent = motivo === "la sala ya tiene TV" ? "Esta sala ya tiene TV abierta" : "Sin servidor de sala (4200): reintentando…";
    });

  /**
   * Anfitrión: con WebSocket lo asigna el servidor (primer celular conectado). En pestañas no hay quién lo garantice:
   * se toma el primero de la fila (solo pruebas).
   */
  function anfitrionId() {
    if (!PESTANAS && !NUBE) { const j = jugadores.get(anfitrionServidor); return j && !j.desconectado ? j.id : null; }
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
    const url = NUBE ? `${location.origin}${ruta}?canal=nube&sala=${sala}` : `http://${ip}:${location.port || 80}${ruta}?sala=${sala}`;
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
    j.cuenta = typeof d.cuenta === "string" ? d.cuenta : null;
    const placa = j.etiqueta.querySelector(".placa");
    placa.textContent = `${j.color.etiqueta} ${nombre}`;
    placa.style.background = j.color.base; placa.style.color = j.color.texto;
    if (j.personaje !== personaje || j.estado === "error") { // el mismo después de un error = reintento
      j.personaje = personaje; j.estado = "cargando"; difundir();
      const ficha = catalogo.get(personaje).ficha;
      const mio = (j.carga = (j.carga || 0) + 1);
      try {
        if (FALLAR.has(personaje)) throw new Error("carga fallida a propósito (?fallar)");
        const base = catalogo.get(personaje).base;
        const f = await FigurasMJ.crear(ficha, { base, idFigura: id, poderes: ficha.id ? poderesDeFicha(ficha, base, catalogo) : [],
          movs: ficha.id && juego === "cuarto" ? movimientosDeFicha(ficha, catalogo) : [] });
        if (mio !== j.carga || !jugadores.has(id)) { f.quitar(); return; }
        if (j.figura) j.figura.quitar();
        j.figura = f; j.alto = 0; j.estado = "listo";
        escena.scene.add(f.obj);
        if (!j.aro) { j.aro = EscenaMJ.aro(j.color.base, 1); escena.scene.add(j.aro); }
      } catch (e) {
        if (mio !== j.carga) return;
        j.estado = "error"; console.error("No cargó", personaje, e);
        // Para saber por qué (Elías, 28 nov): qué personaje y qué pasó, en el panel de la sala de esta pantalla.
        const como = document.getElementById("como");
        if (como) como.textContent = `No cargó ${personaje}: ${String((e && e.message) || e).slice(0, 90)}`;
        // Sin pedirle al celular que elija (Elías, 28 nov): se intenta con otro personaje, hasta 2 veces.
        j.fallos = (j.fallos || 0) + 1;
        const otros = disponibles().filter(x => x !== personaje && !FALLAR.has(x));
        if (j.fallos <= 2 && otros.length) { setTimeout(() => unir(id, Object.assign({}, d, { personaje: otros[Math.floor(Math.random() * otros.length)] }), bot), 0); return; }
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
  /** Pausa o reanuda (anfitrión desde su celular, o la TV con su botón o Esc/P). En el lobby no hay pausa. */
  function pausar(si) {
    si = !!si && enJuego();
    if (si === (pausaDesde !== null)) return;
    if (si) pausaDesde = ahora(); else { enPausa += ahora() - pausaDesde; pausaDesde = null; }
    escena.pausa = si;
    pintarPausa();
    difundir();
  }
  // Botones de la TV: «Salir» siempre (abajo a la izquierda) y «Pausa» durante la partida; el letrero de pausa encima.
  const barra = document.createElement("div");
  barra.className = "barra-tv";
  barra.innerHTML = `<button type="button" class="b-salir">‹ Salir</button><button type="button" class="b-pausa oculto">⏸ Pausa</button>`;
  document.body.appendChild(barra);
  const velo = document.createElement("div");
  velo.className = "pausa-tv oculto";
  velo.innerHTML = `<div><b>Pausa</b><small>El anfitrión reanuda desde su celular</small>
    <button type="button" class="b-seguir">▶ Reanudar</button><button type="button" class="b-salir2">Salir al menú</button></div>`;
  document.body.appendChild(velo);
  // Salir a media partida pausa primero: desde el letrero se confirma con «Salir al menú».
  barra.querySelector(".b-salir").onclick = () => { if (enJuego()) pausar(true); else salirAAlv(); };
  barra.querySelector(".b-pausa").onclick = () => pausar(true);
  velo.querySelector(".b-seguir").onclick = () => pausar(false);
  velo.querySelector(".b-salir2").onclick = () => salirAAlv();
  addEventListener("keydown", e => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === "Escape" || e.key === "p" || e.key === "P") pausar(pausaDesde === null);
  });
  function enJuego() { return fase !== "lobby" && fase !== "fin"; }
  function pintarPausa() {
    velo.classList.toggle("oculto", pausaDesde === null);
    barra.querySelector(".b-pausa").classList.toggle("oculto", !enJuego() || pausaDesde !== null);
  }

  /** Al volver al lobby: se van los que se desconectaron durante la partida. */
  function limpiarDesconectados() { [...jugadores.values()].filter(j => j.desconectado).forEach(borrar); }

  function difundir() {
    canal.enviar("estado", Object.assign({
      juego, fase, sala, personajes: disponibles(),
      jugadores: [...jugadores.values()].map(j => ({ id: j.id, cuenta: j.cuenta || null, nombre: j.nombre, personaje: j.personaje, n: j.n, color: j.color.base, bot: j.bot, estado: j.estado, desconectado: j.desconectado,
        poderes: j.figura && j.figura.poderes ? j.figura.poderes.map(x => x.nombre).slice(0, 2) : [],
        ...(juego === "cuarto" ? { movs: deRueda(j) } : {}) })),
      anfitrionId: anfitrionId(), pausa: pausaDesde !== null,
    }, extra()));
  }
  setInterval(difundir, 2000);

  // ALV PARTY: con ?jugadores=N la TV empieza sola cuando entraron N y todos cargaron (sin que nadie toque «¡Empezar!»).
  const esperados = Math.min(MAX_JUGADORES, Number(q.get("jugadores")) || 0);
  let autoHecho = false;
  if (esperados > 0) setInterval(() => {
    if (autoHecho || fase !== "lobby") return;
    const listos = [...jugadores.values()].filter(j => !j.desconectado && j.estado === "listo").length;
    if (jugadores.size < esperados || listos < jugadores.size) return;
    const b = document.getElementById("empezar");
    if (b && !b.disabled && !b.classList.contains("oculto")) { autoHecho = true; setTimeout(() => b.click(), 1500); }
  }, 500);

  // Controles de Xbox y teclado de esta computadora (mandos-locales.js): entran como un celular más.
  const locales = juego === "fisico" ? null : crearMandosLocales({
    juego, jugadores, ahora,
    entregar: (id, tipo, d) => alLlegar({ de: id, tipo, d }),
    estado: () => Object.assign({ fase }, extra()),
    alEmpezar: () => { const b = document.getElementById("empezar"); if (b && !b.disabled && !b.classList.contains("oculto")) b.click(); },
  });
  { const caja = document.getElementById("sala"); if (caja && locales) { const a = document.createElement("small"); a.className = "locales"; a.textContent = locales.ayuda; caja.appendChild(a); } }
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
    get fase() { return fase; }, set fase(f) { fase = f; if (!enJuego()) pausar(false); pintarPausa(); difundir(); },
    get pausada() { return pausaDesde !== null; }, pausar,
    set extra(f) { extra = f; },
    catalogo: () => catalogo,
  };
}
