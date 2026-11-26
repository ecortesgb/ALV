/* ============ Mini-Juegos y cuarto de Físico: personajes con TODAS sus animaciones (prototipo, zona aparte) ============ */
// Usa MotorPersonajes (tools/personajes/motor-personajes.js) SIN cambiarlo: el motor baja y clona el GLB y aquí se
// manejan los clips de locomoción y combate, que el motor no conoce (solo sabe las 6 lógicas).
// Desde 2026-11-26 producción entrega un GLB «juego» por personaje (catalogo\<id>\<id>-juego.glb, ~3 MB, servido por 4193)
// con su mapa de clips en ficha.juego.clips: se usa ese. Si un personaje no trae «juego», se cae al GLB completo
// (personajes-privado\completos, servidor 4197) y a los nombres de CANDIDATOS.
//   const f = await FigurasMJ.crear(ficha, { base, completos })  →  { obj, anim(nombre, op), tiene(nombre), update(dt), quitar() }
// Nombres que entiende anim(): reposo, caminar, correr, saltar, caer, aterrizar, golpe, herido, ko, eliminado, festejo,
// derrota, nervios, saludo. Si el personaje no tiene el clip, usa el más parecido; si no hay ninguno, se queda en reposo.
(function (raiz) {
  "use strict";
  const T = raiz.THREE, M = raiz.MotorPersonajes;
  if (!T || !M) { raiz.FigurasMJ = null; return; }
  const ESCALA = 6.75; // la de src/personajes/familias.ts (todas las familias del juego)

  const CANDIDATOS = {
    caminar: ["Walk", "WALK", "WALK_FRONT", "SWORD_WALK", "PISTOL_WALK", "HAMMER_WALK"],
    correr: ["Run", "RUN", "SPRINT", "RUN3", "SWORD_RUN", "HAMMER_RUN"],
    saltar: ["JUMPANDLAND", "JUMP_ANDLAND", "JUMP2ANDLAND2", "Jump", "JUMP", "Jump2", "JUMP2", "HAMMER_JUMPLAND"],
    caer: ["Fall", "FALL"],
    aterrizar: ["FallLand", "FALLLAND", "LAND", "LAND2", "LANDING", "HAMMER_FALLANDLAND"],
    golpe: ["FIGHTCOMBO", "FIGHT_COMBO", "HULK_FIGHTCOMBO", "Combo", "COMBO", "SWORDCOMBO", "HAMMER_COMBO", "FIGHT1_RETURN"],
    herido: ["Takehit1", "TAKEHIT1", "TAKEHIT", "HOVER_TAKEHIT"],
    ko: ["KNOCKEDDOWN"],
    eliminado: ["KNOCKEDDOWN", "STUN_DIE2", "STUN_DIE"],
    nervios: ["SCARED_IDLE", "PHOBIA_IDLE"],
    festejo: ["CELEBRATION3", "CHEER", "FIGHT_SUCCESS_HUBFIGHT"],
    saludo: ["WAVE"],
    derrota: ["Shrug", "SHRUG", "KNOCKEDDOWN"],
    especial: [],
  };
  const EN_BUCLE = { reposo: true, caminar: true, correr: true, caer: true, nervios: true };
  // Se quedan tirados: el clip corre hasta donde la cadera queda más baja y ahí se congela (KNOCKEDDOWN se vuelve a
  // levantar al final, y STUN_DIE2 termina de pie si se le quita el desplazamiento).
  const SE_QUEDA = { eliminado: true };

  /** Quita el desplazamiento en el piso (x, z) del hueso raíz: el juego mueve al personaje, no el clip. */
  const limpios = new Map(); // glb|clip → AnimationClip
  function limpio(glb, clip, raizNombre) {
    const k = glb + "|" + clip.name;
    if (limpios.has(k)) return limpios.get(k);
    const c = clip.clone();
    c.tracks.forEach(t => {
      if (t.name !== raizNombre + ".position") return;
      for (let i = 0; i < t.values.length; i += 3) { t.values[i] = 0; t.values[i + 2] = 0; }
    });
    limpios.set(k, c);
    return c;
  }

  async function indice(fuente) {
    const r = await fetch(new URL("indice.json", fuente).href);
    if (!r.ok) throw new Error("índice " + r.status);
    const j = await r.json();
    const mapa = new Map();
    (j.personajes || []).forEach(p => { if (p && p.ficha && !p.prueba) mapa.set(p.id, { ficha: p.ficha, base: new URL(p.ruta, fuente).href }); });
    return mapa;
  }

  async function crear(ficha, op) {
    const o = op || {};
    const juego = ficha.juego && typeof ficha.juego.glb === "string" && o.base ? ficha.juego : null;
    const glb = juego ? new URL(juego.glb, o.base).href : new URL(ficha.id + "-completo.glb", o.completos).href;
    const deFicha = (juego && juego.clips) || {};
    const plano = {
      id: (o.idFigura || ficha.id), familia: ficha.familia, rig: "esqueleto", glb, escala: ESCALA,
      huesos: Object.assign({}, ficha.huesos), clips: Object.assign({}, ficha.animaciones && ficha.animaciones.mapa),
      vida: [], sentado: null, carga: Object.assign({ metal: [] }, ficha.carga), piezas: [],
    };
    const p = await M.crear(plano);
    const g = await M.bajar(glb, plano.carga);
    const raizNombre = (ficha.huesos && ficha.huesos.raiz) || "Character";
    const porNombre = new Map(g.animations.map(c => [c.name.toUpperCase(), c]));
    const mapa = (ficha.animaciones && ficha.animaciones.mapa) || {};
    const elegido = {};
    const buscar = lista => { for (const n of lista) { if (n && porNombre.has(String(n).toUpperCase())) return porNombre.get(String(n).toUpperCase()); } return null; };
    elegido.reposo = buscar([mapa.reposo, "Idle", "IDLE", "Hammer_Idle", "IDLE2", "idle2", "IDLE1"]);
    Object.keys(CANDIDATOS).forEach(k => {
      if (deFicha[k] && porNombre.has(String(deFicha[k]).toUpperCase())) { elegido[k] = porNombre.get(String(deFicha[k]).toUpperCase()); return; }
      const extra = k === "festejo" ? [mapa.victoria] : k === "saludo" ? [mapa.saludo] : k === "especial" ? [mapa.especial, mapa.victoria] : k === "derrota" ? [mapa.derrota === "KNOCKEDDOWN" ? null : mapa.derrota] : [];
      elegido[k] = buscar(extra.concat(CANDIDATOS[k]));
    });
    // El motor ya dejó su reposo sonando: lo paramos y desde aquí manda este controlador (mismo mezclador).
    p.mixer.stopAllAction();
    const acciones = new Map();
    const accionDe = clip => {
      if (!acciones.has(clip.name)) acciones.set(clip.name, p.mixer.clipAction(limpio(glb, clip, raizNombre)));
      return acciones.get(clip.name);
    };
    let actual = null, nombreActual = null, alTerminar = null, pararEn = 0;
    const caderaNombre = (ficha.huesos && ficha.huesos.cadera) || "Hips";
    /** Segundo del clip en que la cadera está más baja (en su primer 80 %): ahí queda «tirado». */
    function masBajo(clip) {
      const t = clip.tracks.find(x => x.name === caderaNombre + ".position");
      if (!t) return clip.duration * 0.4;
      let mejor = 0, y = Infinity;
      for (let i = 0; i < t.times.length; i++) {
        if (t.times[i] > clip.duration * 0.8) break;
        if (t.values[i * 3 + 1] < y) { y = t.values[i * 3 + 1]; mejor = t.times[i]; }
      }
      return mejor;
    }
    p.mixer.addEventListener("finished", e => {
      if (e.action !== actual) return;
      const f = alTerminar; alTerminar = null;
      if (SE_QUEDA[nombreActual]) return;
      if (f) f(); else anim("reposo");
    });

    /**
     * Toca una animación. op: { mezcla (s), vel, desde (s ya transcurridos: para alcanzar un salto que llegó tarde por la
     * red), dura (s: estira o encoge el clip para que dure eso), luego (función al terminar) }.
     */
    function anim(nombre, op2) {
      const q = op2 || {};
      const clip = elegido[nombre] || (nombre === "eliminado" ? elegido.ko : null) || elegido.reposo;
      if (!clip) return false;
      const bucle = !!EN_BUCLE[nombre];
      const a = accionDe(clip);
      if (a === actual && bucle && nombreActual === nombre) return true;
      const vel = q.dura ? clip.duration / q.dura : (q.vel || 1);
      a.reset(); a.enabled = true;
      a.setEffectiveTimeScale(vel); a.setEffectiveWeight(1);
      a.setLoop(bucle ? T.LoopRepeat : T.LoopOnce, Infinity);
      a.clampWhenFinished = !bucle;
      if (q.desde) a.time = Math.min(clip.duration * 0.95, q.desde * vel);
      a.play();
      const mezcla = q.mezcla == null ? 0.18 : q.mezcla;
      if (actual && actual !== a) { if (mezcla > 0) actual.crossFadeTo(a, mezcla, false); else actual.stop(); }
      actual = a; nombreActual = nombre; alTerminar = q.luego || null;
      pararEn = SE_QUEDA[nombre] ? masBajo(clip) : 0;
      return true;
    }
    anim("reposo", { mezcla: 0 });
    p.mixer.update(0);

    return {
      obj: p.obj, ficha, anim,
      tiene: nombre => !!elegido[nombre],
      clipDe: nombre => (elegido[nombre] ? elegido[nombre].name : null),
      duracion: nombre => (elegido[nombre] ? elegido[nombre].duration : 0),
      actual: () => nombreActual,
      fuente: juego ? "juego" : "completo",
      update: dt => { p.mixer.update(dt); if (pararEn && actual && actual.time >= pararEn) { actual.time = pararEn; actual.paused = true; } },
      alto: p.alto, ancho: p.ancho,
      quitar: () => p.quitar(),
    };
  }

  raiz.FigurasMJ = { crear, indice, CANDIDATOS };
})(typeof self !== "undefined" ? self : this);
