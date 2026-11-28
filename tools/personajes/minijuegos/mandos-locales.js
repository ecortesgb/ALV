// Mandos en la misma computadora (Elías, 28 nov 2026): controles de Xbox conectados y el teclado.
// Cada control (o lado del teclado) es un jugador más. Manda exactamente lo mismo que un celular (control.js) y entra
// por la misma puerta (`alLlegar` de tv-comun.js), así que la TV lo valida y lo juzga igual: nunca decide nada aparte.
// Con el reloj de la TV no hace falta sincronizar: la hora de cada toque es `ahora()`.
//
// Control de Xbox: A, B, X, Y, RT, stick izquierdo y cruceta. Start = «¡Empezar!» / «Otra vez». A para entrar.
// Teclado, jugador 1: WASD, Espacio (A), F (B), E (RT), Q (X). Jugador 2: flechas, L (A), K (B), O (RT), I (X).
// Enter = «¡Empezar!». El primero en entrar es el anfitrión, como el primer celular.

/** Teclas de cada lado del teclado (KeyboardEvent.code). */
const TECLADOS = [
  { id: "pc-tecla1", nombre: "Teclado 1", arriba: "KeyW", abajo: "KeyS", izq: "KeyA", der: "KeyD", a: "Space", b: "KeyF", rt: "KeyE", x: "KeyQ" },
  { id: "pc-tecla2", nombre: "Teclado 2", arriba: "ArrowUp", abajo: "ArrowDown", izq: "ArrowLeft", der: "ArrowRight", a: "KeyL", b: "KeyK", rt: "KeyO", x: "KeyI" },
];
/** Botones del mando estándar (Gamepad API, mapping "standard"). */
const PAD = { a: 0, b: 1, x: 2, y: 3, rt: 7, start: 9, arriba: 12, abajo: 13, izq: 14, der: 15 };
/** Juegos de un solo botón: cualquiera de A, B, RT o X cuenta (en el celular es el único botón grande). */
const UN_BOTON = new Set(["bala", "desenfunda", "martillazo", "paracaidas"]);
/** Botones del cuarto y de ALVacío, como el mando del celular (control.html data-b). */
const BOTON_CUARTO = { a: "saltar", b: "golpe", rt: "poder", x: "poder2", y: "festejo" };

/**
 * @param {{ juego: string, entregar: (id: string, tipo: string, d: object) => void, estado: () => object,
 *   jugadores: Map<string, any>, ahora: () => number, alEmpezar: () => void }} o
 */
export function crearMandosLocales(o) {
  const n = new Map(); // id → último número de secuencia
  const mandar = (id, tipo, d = {}) => { const k = (n.get(id) || 0) + 1; n.set(id, k); o.entregar(id, tipo, Object.assign({}, d, { n: k })); };
  const dentro = id => o.jugadores.has(id);
  // Estado de cada mando: botones apretados (para detectar el toque), palanca y carrera de Alto total.
  const vivos = new Map(); // id → { antes: Set, palanca: "x,z", corre: pid|null }
  const de = id => { if (!vivos.has(id)) vivos.set(id, { antes: new Set(), palanca: "0,0", corre: null, ultimaPalanca: 0 }); return vivos.get(id); };

  function entrar(id, nombre, personaje = "") {
    if (dentro(id)) return;
    mandar(id, "hola", { nombre, personaje });
  }

  /** Un botón se acaba de apretar. */
  function toque(id, nombre, boton) {
    if (!dentro(id)) { if (boton === "a") entrar(id, nombre); return; }
    const e = o.estado();
    if (boton === "start") { o.alEmpezar(); return; }
    if (!["a", "b", "rt", "x", "y"].includes(boton)) return;
    if (UN_BOTON.has(o.juego)) {
      if (boton === "y" || !e.pid || e.fase !== "juego" && e.fase !== "cuenta") return;
      // Desenfunda, Martillazo y Paracaídas: un solo toque por intento, como el celular.
      if (o.juego !== "bala") { const s = de(id); if (!e.activa || s.tocado === e.pid) return; s.tocado = e.pid; }
      mandar(id, "salto", { pid: e.pid, s: o.ahora(), inc: 0 });
      return;
    }
    if (o.juego === "cuarto" || o.juego === "plataforma") { const b = BOTON_CUARTO[boton]; if (b) mandar(id, "boton", { b }); }
  }

  /** Cada cuadro: palanca (cuarto) y carrera (Alto total, se mantiene apretado). */
  function sostener(id, apretados, x, z) {
    if (!dentro(id)) return;
    const s = de(id), e = o.estado();
    if (o.juego === "alto") {
      const corre = apretados.has("a") || apretados.has("b") || apretados.has("rt") || apretados.has("x");
      if (corre && !s.corre && e.fase === "juego" && e.pid) { s.corre = e.pid; mandar(id, "corre", { pid: s.corre, a: "aprieta", s: o.ahora(), inc: 0 }); s.latido = o.ahora(); }
      else if (!corre && s.corre) { mandar(id, "corre", { pid: s.corre, a: "suelta", s: o.ahora(), inc: 0 }); s.corre = null; }
      else if (s.corre && o.ahora() - s.latido > 250) { mandar(id, "corre", { pid: s.corre, a: "latido", s: o.ahora(), inc: 0 }); s.latido = o.ahora(); }
      return;
    }
    if (o.juego === "cuarto" || o.juego === "plataforma") {
      const firma = x.toFixed(2) + "," + z.toFixed(2), t = performance.now();
      // Como el celular: al cambiar (máx. cada 50 ms) y cada 200 ms aunque no cambie (la TV suelta a los 500 ms).
      if ((firma !== s.palanca && t - s.ultimaPalanca > 50) || t - s.ultimaPalanca > 200) {
        s.palanca = firma; s.ultimaPalanca = t;
        mandar(id, "mando", { x: +x.toFixed(2), z: +z.toFixed(2) });
      }
    }
  }

  // ---------- Teclado ----------
  const teclas = new Set();
  addEventListener("keydown", ev => {
    if (ev.target && /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
    if (ev.repeat) return;
    teclas.add(ev.code);
    if (ev.code === "Enter") { o.alEmpezar(); return; }
    for (const t of TECLADOS) {
      const b = ["a", "b", "rt", "x"].find(k => t[k] === ev.code);
      if (b) { ev.preventDefault(); toque(t.id, t.nombre, b); }
      if ([t.arriba, t.abajo, t.izq, t.der].includes(ev.code)) ev.preventDefault();
    }
  });
  addEventListener("keyup", ev => teclas.delete(ev.code));
  addEventListener("blur", () => teclas.clear());

  // ---------- Controles (Gamepad API) ----------
  const padAntes = new Map(); // índice → Set de botones apretados
  function cuadro() {
    // Teclado: palanca con las 4 direcciones y botones sostenidos.
    for (const t of TECLADOS) {
      const ap = new Set(["a", "b", "rt", "x"].filter(k => teclas.has(t[k])));
      const x = (teclas.has(t.der) ? 1 : 0) - (teclas.has(t.izq) ? 1 : 0), z = (teclas.has(t.abajo) ? 1 : 0) - (teclas.has(t.arriba) ? 1 : 0);
      const l = Math.hypot(x, z) || 1;
      sostener(t.id, ap, x / l, z / l);
    }
    const pads = navigator.getGamepads ? [...navigator.getGamepads()] : [];
    pads.forEach((p, i) => {
      if (!p || !p.connected) return;
      const id = "pc-control" + (i + 1), nombre = "Control " + (i + 1);
      const ap = new Set(Object.keys(PAD).filter(k => p.buttons[PAD[k]] && (p.buttons[PAD[k]].pressed || p.buttons[PAD[k]].value > 0.5)));
      const antes = padAntes.get(i) || new Set();
      for (const b of ap) if (!antes.has(b)) toque(id, nombre, b);
      padAntes.set(i, ap);
      // Stick izquierdo con zona muerta; si no, la cruceta.
      let x = p.axes[0] || 0, z = p.axes[1] || 0;
      if (Math.hypot(x, z) < 0.2) { x = (ap.has("der") ? 1 : 0) - (ap.has("izq") ? 1 : 0); z = (ap.has("abajo") ? 1 : 0) - (ap.has("arriba") ? 1 : 0); }
      const l = Math.hypot(x, z);
      if (l > 1) { x /= l; z /= l; }
      sostener(id, ap, x, z);
    });
    // Los de esta computadora siempre «dan señal» (no se van por falta de pings como un celular).
    o.jugadores.forEach(j => { if (j.id.startsWith("pc-")) j.visto = Date.now(); });
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);

  // ---------- Botones en la pantalla (ALV PARTY sin Pantalla: este aparato muestra el juego y también es mando) ----------
  // ?tactil=1 (lo pone el anfitrión): entra solo con su nombre y personaje, y lleva sus botones encima del juego.
  const q = new URLSearchParams(location.search);
  if (q.get("tactil") === "1") {
    const id = "pc-tactil", nombre = (q.get("nombre") || "Yo").replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 16) || "Yo";
    const personaje = /^[a-z0-9-]{1,40}$/.test(q.get("personaje") || "") ? q.get("personaje") : "";
    const pide = setInterval(() => { if (dentro(id)) clearInterval(pide); else entrar(id, nombre, personaje); }, 1500);
    entrar(id, nombre, personaje);
    const ap = new Set(); let px = 0, pz = 0;
    const capa = document.createElement("div");
    capa.className = "tactil";
    const palanca = o.juego === "cuarto";
    capa.innerHTML = (palanca ? '<div class="t-zona"><div class="t-palanca"><i></i></div></div>' : "")
      + '<div class="t-botones">' + (palanca ? '<button type="button" data-b="b">B</button>' : "") + '<button type="button" data-b="a" class="t-a">A</button></div>';
    document.body.appendChild(capa);
    const est = document.createElement("style");
    est.textContent = `.tactil{position:fixed;inset:auto 0 0 0;height:42vh;z-index:30;pointer-events:none;display:flex;justify-content:space-between;align-items:flex-end;padding:0 18px 22px}
.tactil button{pointer-events:auto;touch-action:none;width:84px;height:84px;border-radius:50%;border:4px solid #000;background:#3cb043;color:#fff;font:400 34px "Lilita One",sans-serif;box-shadow:0 5px 0 #000;margin-left:14px;opacity:.9}
.tactil button[data-b=b]{background:#e8412c;width:70px;height:70px;font-size:28px}
.tactil .t-a{width:104px;height:104px;font-size:42px}
.tactil button.on{transform:translateY(4px);box-shadow:0 1px 0 #000}
.tactil .t-zona{pointer-events:auto;touch-action:none;width:44vw;height:100%;position:relative}
.tactil .t-palanca{position:absolute;left:50%;top:60%;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;background:rgba(255,255,255,.12);border:3px solid rgba(255,255,255,.35)}
.tactil .t-palanca i{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:#fff;opacity:.85}
.tactil .t-botones{margin-left:auto;display:flex;align-items:flex-end}`;
    document.head.appendChild(est);
    capa.querySelectorAll("button").forEach(b => {
      b.addEventListener("pointerdown", e => { e.preventDefault(); b.setPointerCapture(e.pointerId); ap.add(b.dataset.b); b.classList.add("on"); toque(id, nombre, b.dataset.b); });
      const suelta = () => { ap.delete(b.dataset.b); b.classList.remove("on"); };
      b.addEventListener("pointerup", suelta); b.addEventListener("pointercancel", suelta); b.addEventListener("lostpointercapture", suelta);
    });
    if (palanca) {
      const zona = capa.querySelector(".t-zona"), base = capa.querySelector(".t-palanca"), bola = base.querySelector("i");
      let dedo = null;
      const mover = e => {
        const r = base.getBoundingClientRect(), R = 60;
        let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
        bola.style.transform = `translate(${dx}px,${dy}px)`; px = dx / R; pz = dy / R;
      };
      zona.addEventListener("pointerdown", e => { dedo = e.pointerId; zona.setPointerCapture(dedo); mover(e); });
      zona.addEventListener("pointermove", e => { if (e.pointerId === dedo) mover(e); });
      const soltar = e => { if (e.pointerId !== dedo) return; dedo = null; px = 0; pz = 0; bola.style.transform = ""; };
      zona.addEventListener("pointerup", soltar); zona.addEventListener("pointercancel", soltar);
    }
    (function tactil() { sostener(id, ap, px, pz); requestAnimationFrame(tactil); })();
  }

  /** Texto de ayuda para el panel de la sala. */
  return {
    ayuda: "En esta computadora: conecta un control de Xbox y presiona A, o usa el teclado (Espacio o L para entrar). Enter empieza.",
  };
}
