// TV del cuarto de Físico (prototipo, zona aparte). La TV corre src/personajes/minijuegos/cuarto.ts a 60 pasos por
// segundo con lo que mandan los celulares (palanca y botones) y le pone a cada personaje el clip que toca.
// Decidió Codex (encargo 2026-11-26-minijuegos-r1, D6): caja con cámara fija; la plataforma y la cámara que sigue
// quedan fuera de esta entrega (la plataforma sigue en cuarto.ts, con sus pruebas).
import { alargar, colocar, crearCuarto, entrar, mandar, pasoCuarto, salir } from "/src/personajes/minijuegos/cuarto.ts";
import { alCaer, anotarGolpe, avanzarPlataforma, crearPlataforma, radioEn, salioDePartida } from "/src/personajes/minijuegos/plataforma.ts";
import { crearTV, lanzarEfecto, lucirPoder } from "./tv-comun.js";

const q = new URLSearchParams(location.search);
const FORMA = "caja";
const $ = id => document.getElementById(id);
const escena = EscenaMJ.crear($("lienzo"), { fov: 34 });
const cuarto = crearCuarto({ forma: FORMA });
const caja = EscenaMJ.cuarto(escena.scene, FORMA, cuarto.cfg.ancho, cuarto.cfg.fondo, cuarto.cfg.radio);
const CAJA0 = { ...cuarto.cfg };
const visto = new Map(); // jugador → { anim, desde } ya puesto en su figura

const tv = crearTV({
  juego: "cuarto", escena, topeEtiquetas: 84,
  alUnirse: j => {
    if (!cuarto.cuerpos.has(j.id) && !partida) { // a media partida de ¡Al vacío! se espera a que termine
      const escala = j.figura ? j.figura.alto() / 2.7 : 1;
      entrar(cuarto, j.id, escala);
      tv.pop(j, "¡Llegó!", j.color.claro);
      if (j.figura) j.figura.anim("saludo");
    }
    visto.delete(j.id);
    $("sub").textContent = `${tv.jugadores.size} en el cuarto · palanca para moverte · A salta · B golpe · RT y X poderes (los que vuelan despegan) · rueda: gestos · el anfitrión inicia ¡Al vacío!`;
  },
  alSalir: j => { salir(cuarto, j.id); visto.delete(j.id); if (partida) eventos(salioDePartida(partida, j.id, reloj)); },
  alMensaje: (j, m) => {
    if (m.tipo === "empezar" && tv.esAnfitrion(j)) return iniciar(m.d.modalidad);
    if (m.tipo === "otra" && tv.esAnfitrion(j)) return partida && partida.fase === "fin" ? aCuarto() : undefined;
    if (m.tipo === "mando") mandar(cuarto, j.id, { x: m.d.x, z: m.d.z }); // ya validado y en orden (canal.ts)
    else if (m.tipo === "boton") {
      const c = cuarto.cuerpos.get(j.id); if (!c) return;
      const b = String(m.d.b);
      // El botón del poder de volar (RT o X, según el personaje) despega o aterriza en lugar de tocar el poder.
      const vuela = (b === "poder" || b === "poder2") && slotVuelo(j) === (b === "poder" ? 0 : 1);
      mandar(cuarto, j.id, { x: c.mando.x, z: c.mando.z, saltar: b === "saltar", golpe: b === "golpe", festejo: b === "festejo",
        poder: b === "poder" && !vuela, poder2: b === "poder2" && !vuela, volar: vuela });
    } else if (m.tipo === "mov") { // rueda, 2ª página: un movimiento de sus sets (canal.ts revisó la forma; aquí, que lo tenga)
      const c = cuarto.cuerpos.get(j.id); if (!c || !j.figura || !j.figura.tieneMov || !j.figura.tieneMov(m.d.m)) return;
      j.movPedido = m.d.m;
      mandar(cuarto, j.id, { x: c.mando.x, z: c.mando.z, mov: true });
    } else if (m.tipo === "gesto") { // rueda de animaciones del mando (canal.ts ya revisó que sea uno de los 4)
      const c = cuarto.cuerpos.get(j.id); if (!c) return;
      mandar(cuarto, j.id, { x: c.mando.x, z: c.mando.z, gesto: m.d.g });
    }
  },
});

// ---------- Cámara ----------
const c = escena.camera;
function camaraFija() {
  const ancho = cuarto.cfg.ancho + 2;
  const tanH = Math.tan((c.fov * Math.PI) / 360) * c.aspect;
  const d = Math.max(18, (ancho / 2) / tanH * 1.25);
  c.position.set(0, d * 0.7, d * 0.8); c.lookAt(0, 0.6, -0.9); // un poco más arriba: los altos del fondo no llegan al título
}
camaraFija(); addEventListener("resize", camaraFija);
// ---------- Del estado del cuarto al clip de cada figura ----------
function animar(j, cu) {
  const f = j.figura; if (!f) return;
  const antes = visto.get(j.id);
  if (antes && antes.anim === cu.anim && antes.desde === cu.animDesde) return;
  const previo = antes ? antes.anim : "reposo";
  visto.set(j.id, { anim: cu.anim, desde: cu.animDesde });
  const aire = (2 * cuarto.cfg.salto) / cuarto.cfg.gravedad; // segundos en el aire de un salto normal
  switch (cu.anim) {
    case "saltar": f.anim("saltar", { dura: aire + 0.3, mezcla: 0.06 }); break;
    case "caer": if (previo !== "saltar") f.anim("caer"); break; // el clip de salto ya trae la caída
    case "aterrizar": if (j.vieneDeLejos) { f.anim("aterrizar", { vel: 2.4, mezcla: 0.05 }); j.vieneDeLejos = false; } break;
    case "golpe": f.anim("golpe", { mezcla: 0.06 }); break;
    case "herido": f.anim("herido", { mezcla: 0.04 }); break;
    case "ko": f.anim("ko", { mezcla: 0.04 }); break;
    case "festejo": f.anim("festejo"); break;
    case "saludo": f.anim("saludo"); break;
    case "derrota": f.anim("derrota"); break;
    case "especial": f.anim("especial", { mezcla: 0.08 }); break;
    case "poder": lanzarPoder(j, 0); break;
    case "poder2": lanzarPoder(j, 1); break;
    case "volar": despegar(j); break;
    case "mov": {
      const desde = cu.animDesde;
      f.mov(j.movPedido).then(r => {
        const ya = cuarto.cuerpos.get(j.id);
        if (!ya || ya.animDesde !== desde) return;
        if (r) alargar(cuarto, j.id, r.dur * 1000); else f.anim("reposo");
      });
      break;
    }
    case "caminar": f.anim("caminar"); break;
    case "correr": f.anim("correr"); break;
    default: f.anim("reposo");
  }
}

// ---------- Poderes (RT = el primero, X = el segundo): clip del GLB «poderes» y sus efectos (tools/personajes/efectos.js) ----------
// Sin GLB de poderes (personaje sin ellos o aún sin subir): RT hace el movimiento especial de siempre, X nada.
function lanzarPoder(j, i) {
  const f = j.figura, desde = cuarto.cuerpos.get(j.id)?.animDesde;
  if (!f.poder || !(f.poderes && f.poderes[i])) { if (i === 0) f.anim("especial", { mezcla: 0.08 }); return; }
  lucirPoder(j, escena, i).then(dur => {
    const cu = cuarto.cuerpos.get(j.id);
    if (!cu || cu.animDesde !== desde) return; // ya hace otra cosa
    if (!dur) { if (i === 0) f.anim("especial", { mezcla: 0.08 }); return; }
    alargar(cuarto, j.id, dur * 1000);
  });
}

// ---------- Vuelo (Elías, 27 nov: «que Iron Man pueda volar por todos lados controlado») ----------
// Los que traen el poder volar o levitar despegan con ese botón. En el aire se repite su clip de vuelo y sale la estela
// (efecto «volar» sobre un punto a sus pies, para que el efecto no mueva la figura: la altura la pone cuarto.ts).
const VUELO = new Set(["volar", "levitar"]);
const slotVuelo = j => (j.figura && j.figura.poderes ? j.figura.poderes.findIndex(p => VUELO.has(p.id)) : -1);
function despegar(j) {
  const f = j.figura, i = slotVuelo(j), desde = cuarto.cuerpos.get(j.id)?.animDesde;
  f.anim("caer"); // mientras baja el clip (o si no hay): brazos en el aire
  if (i < 0) return;
  j.vueloClip = null;
  // Con el set «vuelo» (Iron Man, Thor...): flota quieto y vuela al moverse (lo cambia estela() cada cuadro).
  if (f.tieneMov && f.tieneMov("vuelo-flotar")) {
    j.efVuelo = (f.poderes[i].efectos || []).find(ef => ef && ef.tipo === "volar") || null; j.estelaT = 0;
    return;
  }
  f.poder(i, { bucle: true }).then(r => {
    const cu = cuarto.cuerpos.get(j.id);
    if (!cu || cu.animDesde !== desde || !cu.vuela) return;
    if (!r) return;
    j.efVuelo = r.efectos.find(ef => ef && ef.tipo === "volar") || null;
    j.estelaT = 0;
  });
}
function estela(j, cu, dt) {
  if (cu.vuela && j.figura.tieneMov && j.figura.tieneMov("vuelo-flotar")) {
    const quiere = Math.hypot(cu.mando.x, cu.mando.z) > 0.08 && j.figura.tieneMov("vuelo-volar") ? "vuelo-volar" : "vuelo-flotar";
    if (quiere !== j.vueloClip) { j.vueloClip = quiere; j.figura.mov(quiere, { bucle: true }); }
  } else j.vueloClip = null;
  if (!cu.vuela || !j.efVuelo || !window.EfectosALV) { if (j.estela && !cu.vuela) { try { j.estela.fin(); } catch (_) { /* ya terminó */ } j.estela = null; } return; }
  j.estelaT = (j.estelaT || 0) - dt;
  if (j.estelaT > 0) return;
  j.estelaT = 2.6; // cada efecto dura 3 s: se encadenan sin hueco
  j.estela = lanzarEfecto(j, escena, j.efVuelo, { a: 0.2, dura: 3, retraso: 0 });
  if (!j.estela) j.efVuelo = null;
}
// Los celulares de quienes vuelan cambian A y B a «Sube» y «Baja». En ¡Al vacío! van también la ronda, quién sigue en pie,
// los puntos y, al final, el podio (con él, el celular del anfitrión de la sala reporta la XP).
tv.extra = () => ({
  vuelan: [...cuarto.cuerpos.values()].filter(c => c.vuela).map(c => c.id),
  modalidad,
  ...(partida ? { pid, ronda: partida.ronda, rondas: partida.cfg.rondas, vivos: [...partida.vivos], puntos: partida.puntos,
    equipo: partida.modalidad === "equipos" ? partida.equipo : null, ranking: ranking } : {}),
});

// ---------- ¡Al vacío! (Elías, 27 nov): sin paredes, plataforma en la azotea; tira a los demás, gana el último en pie ----------
// El anfitrión lo inicia desde su celular (o el botón de la TV). Rondas de plataforma que se encoge; al final, podio con
// puntos y la XP como los otros minijuegos (mj-plataforma, migración 054). Al terminar se vuelve al cuarto de pruebas.
const EQUIPOS = [{ nombre: "Rojo", base: "#ff4d4d" }, { nombre: "Azul", base: "#3d8bff" }];
let partida = null, azotea = null, pid = "", ranking = null, numPartida = 0, reloj = 0;
let modalidad = q.get("modalidad") === "equipos" ? "equipos" : "solos";
const enPie = () => [...tv.jugadores.values()].filter(j => j.figura && !j.desconectado && cuarto.cuerpos.has(j.id));
function letrero(texto, chico = false) {
  const c = $("centro"); if (!c) return;
  c.textContent = texto; c.classList.remove("oculto"); c.classList.toggle("chico", chico);
  clearTimeout(letrero.t); letrero.t = setTimeout(() => c.classList.add("oculto"), chico ? 3200 : 1800);
}
function iniciar(m) {
  if (partida) return;
  if (m === "solos" || m === "equipos") modalidad = m;
  const ids = enPie().map(j => j.id);
  const p = crearPlataforma(ids, modalidad, reloj);
  if (!p) { letrero("Se necesitan 2 o más", true); return; }
  partida = p; ranking = null; numPartida++; pid = `plat-${numPartida}-${Math.random().toString(36).slice(2, 7)}`;
  // Sin paredes: la caja se va y queda la azotea. Nadie vuela; el que cae no vuelve.
  caja.visible = false;
  azotea = EscenaMJ.azotea(escena.scene, p.cfg.radio);
  Object.assign(cuarto.cfg, { forma: "plataforma", radio: p.cfg.radio, reaparecer: false, sinVuelo: true, empuje: 8, golpesKo: 99 });
  ["sala", "empezar", "podio"].forEach(id => $(id)?.classList.add("oculto"));
  $("marcador")?.classList.remove("oculto");
  tv.jugadores.forEach(j => {
    if (!p.ids.includes(j.id) || !j.aro) return;
    if (p.modalidad === "equipos") j.aro.material.color.set(EQUIPOS[p.equipo[j.id]].base);
  });
  tv.fase = "juego";
}
function prepararRonda() {
  colocar(cuarto, partida.ids, Math.min(4.2, partida.cfg.radio - 1.6));
  partida.ids.forEach(id => { const j = tv.jugadores.get(id); if (j && j.figura) j.figura.obj.visible = true; visto.delete(id); });
  azotea.setRadio(partida.cfg.radio); cuarto.cfg.radio = partida.cfg.radio;
}
function aCuarto() {
  partida = null; ranking = null;
  if (azotea) { azotea.quitar(); azotea = null; }
  caja.visible = true;
  Object.assign(cuarto.cfg, CAJA0);
  // Todos de vuelta al cuarto (y los que llegaron a media partida, adentro).
  tv.jugadores.forEach(j => {
    if (j.figura) { j.figura.obj.visible = true; if (j.aro) j.aro.material.color.set(j.color.base); }
    if (!cuarto.cuerpos.has(j.id) && j.figura) entrar(cuarto, j.id, j.figura.alto() / 2.7);
  });
  colocar(cuarto, [...cuarto.cuerpos.keys()], 3);
  ["marcador", "podio", "centro"].forEach(id => $(id)?.classList.add("oculto"));
  ["sala", "empezar"].forEach(id => $(id)?.classList.remove("oculto"));
  tv.fase = "lobby";
}
function marcador() {
  const m = $("marcador"); if (!m || !partida) return;
  const n = partida.vivos.size;
  m.textContent = `Ronda ${partida.ronda} / ${partida.cfg.rondas} · ${n} en pie`;
  partida.ids.forEach(id => {
    const j = tv.jugadores.get(id); if (!j || !j.etiqueta) return;
    let e = j.etiqueta.querySelector(".puntos-ronda");
    if (!e) { e = document.createElement("div"); e.className = "puntos-ronda"; j.etiqueta.prepend(e); }
    const eq = partida.modalidad === "equipos" ? `${EQUIPOS[partida.equipo[id]].nombre} · ` : "";
    e.textContent = `${eq}${partida.puntos[id] || 0} pts`;
  });
}
function eventos(evs) {
  for (const ev of evs) {
    if (ev.tipo === "ronda") { prepararRonda(); letrero(`Ronda ${ev.n}: ¡tíralos!`); }
    else if (ev.tipo === "fuera") {
      const j = tv.jugadores.get(ev.id), por = ev.por && tv.jugadores.get(ev.por);
      if (por) tv.pop(por, "+1 ¡Lo tiraste!", "#8cf09a");
      if (j) letrero(`${j.nombre} cayó${por ? ` (lo tiró ${por.nombre})` : ""}`, true);
    } else if (ev.tipo === "ganaRonda") {
      if (!ev.ids.length) letrero("¡Cayeron todos!", true);
      else if (ev.equipo !== null) letrero(`¡Gana el equipo ${EQUIPOS[ev.equipo].nombre}!`, true);
      else letrero(`¡${tv.jugadores.get(ev.ids[0])?.nombre || "Jugador"} queda en pie!`, true);
      ev.ids.forEach(id => { const j = tv.jugadores.get(id); if (j && j.figura && cuarto.cuerpos.get(id)?.enPiso) j.figura.anim("festejo"); });
    } else if (ev.tipo === "fin") {
      ranking = ev.ranking; tv.fase = "fin";
      const p = $("podio");
      if (p) {
        p.replaceChildren();
        ev.ranking.forEach(l => {
          const j = tv.jugadores.get(l.id); if (!j) return;
          const d = document.createElement("div"); d.textContent = `${l.lugar}° ${j.nombre} · ${l.puntos} pts`;
          d.style.background = j.color.base; d.style.color = j.color.texto; p.appendChild(d);
        });
        p.classList.remove("oculto");
      }
      const g = ev.ranking.filter(l => l.lugar === 1);
      letrero(g.length === 1 ? `¡Gana ${tv.jugadores.get(g[0].id)?.nombre || "Jugador"}!` : "¡Empate!", true);
      const b = $("empezar"); if (b) { b.textContent = "Volver al cuarto"; b.classList.remove("oculto"); }
    }
    marcador();
  }
  tv.difundir();
}
$("empezar")?.addEventListener("click", () => { if (!partida) iniciar(); else if (partida.fase === "fin") { aCuarto(); $("empezar").textContent = "¡Al vacío!"; } });

// ---------- Jugadores de prueba (?bots=N): pasean, a veces corren, saltan o golpean ----------
async function ponerBots() {
  const n = Math.min(5, Number(q.get("bots")) || 0);
  await tv.listo;
  const lista = tv.disponibles();
  for (let i = 0; i < n; i++) await tv.unir("bot" + (i + 1), { nombre: ["Beto", "Caro", "Dani", "Eli", "Fer"][i], personaje: lista[(i + 1) % lista.length] }, true);
}
setInterval(() => {
  tv.jugadores.forEach(j => {
    if (!j.bot) return;
    const r = Math.random(), a = Math.random() * Math.PI * 2;
    const fuerza = r < 0.25 ? 0 : r < 0.75 ? 0.5 : 1;
    mandar(cuarto, j.id, { x: Math.cos(a) * fuerza, z: Math.sin(a) * fuerza, saltar: Math.random() < 0.15, golpe: Math.random() < 0.25 });
  });
}, 900);

// ---------- Simulación: pasos fijos de 1/60 s con su propio reloj, aparte del dibujo ----------
// (sigue corriendo aunque la pestaña de la TV no se vea; si se atrasa mucho, no intenta alcanzar más de 0.25 s)
let resto = 0, antes = performance.now();
setInterval(() => {
  const ya = performance.now();
  resto = Math.min(250, resto + ya - antes); antes = ya;
  while (resto >= 1000 / 60) {
    resto -= 1000 / 60;
    reloj += 1000 / 60;
    if (partida) {
      if (partida.fase === "ronda") { const r = radioEn(partida, reloj); cuarto.cfg.radio = r; azotea?.setRadio(r); }
      const ev = avanzarPlataforma(partida, reloj);
      if (ev.length) eventos(ev);
    }
    for (const ev of pasoCuarto(cuarto, 1000 / 60)) {
      if (ev.tipo === "golpe") { tv.pop(tv.jugadores.get(ev.a), "¡Pum!", "#ff8a1f"); if (partida) anotarGolpe(partida, ev.de, ev.a, reloj); }
      if (ev.tipo === "cae" && partida) eventos(alCaer(partida, ev.id, reloj));
      if (ev.tipo === "poder") { const j = tv.jugadores.get(ev.id), nom = j && j.figura && j.figura.poderes && j.figura.poderes[ev.n === 2 ? 1 : 0]; tv.pop(j, nom ? nom.nombre : "¡Poder!", "#b46cff"); }
      if (ev.tipo === "despega" || ev.tipo === "aterriza") { const j = tv.jugadores.get(ev.id); if (ev.tipo === "despega") tv.pop(j, "¡A volar!", "#7fd8ff"); else if (j) j.vieneDeLejos = true; tv.difundir(); }
      if (ev.tipo === "ko") tv.pop(tv.jugadores.get(ev.id), "¡K.O.!", "#e8343a");
      if (ev.tipo === "cae") { const j = tv.jugadores.get(ev.id); if (j) { j.vieneDeLejos = true; tv.pop(j, "¡Aaah!", "#7cc0ff"); } }
    }
  }
}, 8);

// ---------- Cuadro por cuadro: solo dibujo ----------
escena.alCuadro(dt => {
  tv.jugadores.forEach(j => {
    const cu = cuarto.cuerpos.get(j.id);
    if (!j.figura || !cu) return;
    animar(j, cu);
    j.figura.update(dt);
    j.figura.obj.position.set(cu.x, cu.y, cu.z);
    j.figura.obj.rotation.y = cu.rot;
    estela(j, cu, dt);
    if (j.aro) j.aro.visible = cu.enPiso && !cu.cayendo;
    if (partida && cu.y < -16) j.figura.obj.visible = false; // ya cayó del edificio
  });
  tv.etiquetas();
});

ponerBots();
window.__cuarto = { tv, cuarto };
