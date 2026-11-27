// TV del cuarto de Físico (prototipo, zona aparte). La TV corre src/personajes/minijuegos/cuarto.ts a 60 pasos por
// segundo con lo que mandan los celulares (palanca y botones) y le pone a cada personaje el clip que toca.
// Decidió Codex (encargo 2026-11-26-minijuegos-r1, D6): caja con cámara fija; la plataforma y la cámara que sigue
// quedan fuera de esta entrega (la plataforma sigue en cuarto.ts, con sus pruebas).
import { alargar, crearCuarto, entrar, mandar, pasoCuarto, salir } from "/src/personajes/minijuegos/cuarto.ts";
import { crearTV } from "./tv-comun.js";

const q = new URLSearchParams(location.search);
const FORMA = "caja";
const $ = id => document.getElementById(id);
const escena = EscenaMJ.crear($("lienzo"), { fov: 34 });
const cuarto = crearCuarto({ forma: FORMA });
EscenaMJ.cuarto(escena.scene, FORMA, cuarto.cfg.ancho, cuarto.cfg.fondo, cuarto.cfg.radio);
const visto = new Map(); // jugador → { anim, desde } ya puesto en su figura

const tv = crearTV({
  juego: "cuarto", escena, topeEtiquetas: 84,
  alUnirse: j => {
    if (!cuarto.cuerpos.has(j.id)) {
      const escala = j.figura ? j.figura.alto() / 2.7 : 1;
      entrar(cuarto, j.id, escala);
      tv.pop(j, "¡Llegó!", j.color.claro);
      if (j.figura) j.figura.anim("saludo");
    }
    visto.delete(j.id);
    $("sub").textContent = `${tv.jugadores.size} en el cuarto · palanca para moverte · A salta · B golpe · RT y X poderes · rueda: gestos`;
  },
  alSalir: j => { salir(cuarto, j.id); visto.delete(j.id); },
  alMensaje: (j, m) => {
    if (m.tipo === "mando") mandar(cuarto, j.id, { x: m.d.x, z: m.d.z }); // ya validado y en orden (canal.ts)
    else if (m.tipo === "boton") {
      const c = cuarto.cuerpos.get(j.id); if (!c) return;
      const b = String(m.d.b);
      mandar(cuarto, j.id, { x: c.mando.x, z: c.mando.z, saltar: b === "saltar", golpe: b === "golpe", festejo: b === "festejo", poder: b === "poder", poder2: b === "poder2" });
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
  f.poder(i).then(r => {
    const cu = cuarto.cuerpos.get(j.id);
    if (!cu || cu.animDesde !== desde) return; // ya hace otra cosa
    if (!r) { if (i === 0) f.anim("especial", { mezcla: 0.08 }); return; }
    alargar(cuarto, j.id, r.dur * 1000);
    if (window.EfectosALV) r.efectos.forEach(ef => { try { EfectosALV.lanzar(escena.scene, { obj: f.obj, hueso: f.hueso }, ef); } catch (e) { console.warn("efecto", e); } });
  });
}

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
    for (const ev of pasoCuarto(cuarto, 1000 / 60)) {
      if (ev.tipo === "golpe") tv.pop(tv.jugadores.get(ev.a), "¡Pum!", "#ff8a1f");
      if (ev.tipo === "poder") { const j = tv.jugadores.get(ev.id), nom = j && j.figura && j.figura.poderes && j.figura.poderes[ev.n === 2 ? 1 : 0]; tv.pop(j, nom ? nom.nombre : "¡Poder!", "#b46cff"); }
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
    if (j.aro) j.aro.visible = cu.enPiso && !cu.cayendo;
  });
  tv.etiquetas();
});

ponerBots();
window.__cuarto = { tv, cuarto };
