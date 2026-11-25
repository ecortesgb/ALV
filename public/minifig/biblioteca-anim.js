/* ============ Biblioteca de animaciones de ALV (ALV_PLAN_ANIMATION_LIBRARY.md, etapa 1) ============ */
// Carga las animaciones de la Animation Library (tablas de 7 articulaciones, el mismo formato que nucleo/momentos.js)
// y las registra en GestosALV como «lib:<id>» (p. ej. lib:gesture_wave). El motor las toca como cualquier otra.
//
// De dónde: el parámetro `biblioteca` de escena.html (lo pone ALV solo si existe VITE_ANIM_BIBLIOTECA_URL).
// Las tablas NO están en el repositorio ni en la página publicada: derivan de un juego y son privadas.
// Sin parámetro, sin red o con algo mal formado no registra nada y todo sigue igual.
//
// Independiente del personaje: aquí no hay piezas, nombres de figura ni perfiles. Solo ids lógicos y movimiento.
(function () {
  "use strict";
  const G = window.GestosALV, M = window.Momentos;
  const estado = { listo: false, registradas: [], error: null };
  window.BibliotecaALV = estado;
  if (!G || !G.registrar || !M) return;
  const param = new URLSearchParams(location.search).get("biblioteca");
  if (!param) return;
  let base;
  try { base = new URL(param.endsWith("/") ? param : param + "/", location.href); } catch (e) { return; }
  if (base.protocol !== "http:" && base.protocol !== "https:") return;

  const CLAVES = ["cabeza", "brazoObj", "brazoLib", "manoObj", "manoLib", "piernaIzq", "piernaDer", "y", "z", "rotX", "rotY"];
  // Las tablas miden la altura (y, z) en unidades de la figura D del laboratorio. Medido el 2026-11-25 en la Azotea con
  // la figura de partida: hombro a 1.591 sobre el piso (D: 1.701) y cadera a 0.713 (D: 0.756). Misma proporción (0.94):
  // se escala para que el brinco sea igual de alto respecto a la figura.
  const HOMBRO_D = 1.701, HOMBRO_ALV = 1.591, ESCALA = HOMBRO_ALV / HOMBRO_D;
  // Solo las compatibles (A). Las B entran cuando se calibren (segunda fase).
  const ACEPTAR = new Set(["A"]);
  // Categoría de la biblioteca → tipo de momentos.js (decide cómo lo trata el motor).
  const TIPO = { reposo: "espera", celebracion: "victoria", derrota: "derrota", humor: "punto", reaccion: "punto", movimiento: "punto" };
  const MAX_CUADROS = 2000, ID = /^[a-z0-9_]{1,60}$/;

  // Revisa una tabla: todas las claves, arreglos de números finitos del mismo largo. Si algo no cuadra, se descarta.
  function validar(t) {
    if (!t || typeof t !== "object" || !t.articulaciones) return null;
    const fps = Number(t.fps), n = Number(t.cuadros);
    if (!(fps > 0 && fps <= 120) || !(Number.isInteger(n) && n >= 2 && n <= MAX_CUADROS)) return null;
    const a = {};
    for (const k of CLAVES) {
      const v = t.articulaciones[k];
      if (!Array.isArray(v) || v.length !== n || !v.every(x => typeof x === "number" && Number.isFinite(x) && Math.abs(x) < 1000)) return null;
      a[k] = Float32Array.from(k === "y" || k === "z" ? v.map(x => x * ESCALA) : v);
    }
    return { fps, n, a };
  }
  // Interpola la tabla en el segundo t (el envoltorio de GestosALV ya da la vuelta en bucle o se queda al final).
  function muestra(tb, t) {
    const f = Math.max(0, Math.min(tb.n - 1, t * tb.fps)), i = Math.floor(f), j = Math.min(i + 1, tb.n - 1), k = f - i, r = {};
    for (const c of CLAVES) { const v = tb.a[c]; r[c] = v[i] + (v[j] - v[i]) * k; }
    r.fx = 0;
    return r;
  }

  const leer = ruta => fetch(new URL(ruta, base).href, { credentials: "omit" }).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
  leer("animation-library-v1.json").then(async bib => {
    const anims = bib && bib.animaciones && typeof bib.animaciones === "object" ? bib.animaciones : {};
    const ids = Object.keys(anims).filter(id => ID.test(id) && anims[id] && ACEPTAR.has(anims[id].compatibilidad) && typeof anims[id].tabla === "string");
    await Promise.all(ids.map(async id => {
      const a = anims[id];
      try {
        const tb = validar(await leer(a.tabla)); if (!tb) return;
        const dur = (tb.n - 1) / tb.fps;
        const ok = G.registrar("lib:" + id, { tipo: TIPO[a.categoria] || "punto", dur, bucle: !!a.loop, nombre: String(a.nombre || id), pose: t => muestra(tb, t) });
        if (ok) estado.registradas.push("lib:" + id);
      } catch (e) { /* una tabla mala no detiene a las demás */ }
    }));
    estado.listo = true;
  }).catch(e => { estado.error = String(e && e.message || e); estado.listo = true; });
})();
