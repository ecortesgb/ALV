/* ================= minifig-core · modelo de figura por capas =================
 * Sin 3D y sin DOM: corre en el navegador (window.MinifigCore) y en Node (require).
 * Lo usan el personalizador, el taller y el runtime de cada juego.
 *
 * Una figura (versión 2) tiene cinco capas. Al resolverla se aplican en orden y cada
 * capa solo pisa lo que define:
 *   1. identidad   piel, cabeza estampada, rostro, detalles, cabello, estilo
 *   2. ropa        torso completo (mangas, guantes) y piernas
 *   3. traje       personaje de la biblioteca puesto encima; no borra 1 ni 2
 *   4. manual      ajustes pieza por pieza (solo modo avanzado)
 *   5. accesorios  cabeza (casco/gorro), cara (máscara), espalda, mano der/izq · momentos
 * resolver() devuelve las piezas en el formato de la biblioteca (personajes.json → piezas),
 * que es lo que ya dibuja el taller.
 *
 * "bib" es la biblioteca: {piezas, estampados, personajes} o el objeto BIB del taller (con porId).
 */
(function (raiz, fabrica) {
  const M = fabrica();
  if (typeof module !== "undefined" && module.exports) module.exports = M; else raiz.MinifigCore = M;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const VERSION = 2;
  const clon = o => (o == null ? o : JSON.parse(JSON.stringify(o)));

  // Tonos de piel (colores LEGO reales). Los nombres siguen los de ALV.
  const TONOS = [
    { id: "amarillo", nombre: "Amarillo clásico", hex: "#f2cd37" },
    { id: "marfil", nombre: "Marfil", hex: "#f6d7b3" },
    { id: "durazno", nombre: "Durazno", hex: "#d09168" },
    { id: "arena", nombre: "Arena", hex: "#cca373" },
    { id: "canela", nombre: "Canela", hex: "#aa7d55" },
    { id: "cafe-medio", nombre: "Café medio", hex: "#755945" },
    { id: "cafe-rojizo", nombre: "Café rojizo", hex: "#582a12" },
    { id: "cafe-oscuro", nombre: "Café oscuro", hex: "#352100" },
  ];
  const COLORES_PELO = ["#1b2a34", "#352100", "#582a12", "#7a4b25", "#d1561d", "#e4cd9e", "#a0a5a9", "#f4f4f4"];
  const PALETA = ["#f4f4f4", "#a0a5a9", "#6c6e68", "#1b2a34", "#f2cd37", "#c91a09", "#720e0f", "#fe8a18", "#4b9f4a", "#237841",
    "#184632", "#5a93db", "#0055bf", "#0a3463", "#923978", "#81007b", "#e3b341", "#6b4a2b", "#958a73", "#e4cd9e"];

  // Momentos: lo que hace la figura en el juego. Un paquete llena los cuatro.
  const MOMENTOS = ["espera", "victoria", "derrota", "punto"];
  const MOMENTOS_BASE = { espera: "respirar", victoria: "salto-puno", derrota: "cabeza-baja", punto: "puno-arriba" };
  const PAQUETES = {
    arana:     { nombre: "Arácnido",       poderes: ["telarana"],     espera: "columpio",        victoria: "telarana-arriba", derrota: "cabeza-baja",  punto: "lanzar-telarana" },
    trueno:    { nombre: "Trueno",         poderes: ["electricidad"], espera: "chispas-manos",   victoria: "rayo-al-cielo",   derrota: "pisoton",      punto: "rayo-corto" },
    magia:     { nombre: "Magia",          poderes: ["magia"],        espera: "flotar-runas",    victoria: "circulo-magico",  derrota: "brazos-caidos", punto: "destello" },
    fuego:     { nombre: "Fuego",          poderes: ["fuego"],        espera: "flama-manos",     victoria: "explosion-fuego", derrota: "humo",         punto: "bola-fuego" },
    hielo:     { nombre: "Hielo",          poderes: ["hielo"],        espera: "copos",           victoria: "tormenta-hielo",  derrota: "congelado",    punto: "rafaga-hielo" },
    velocidad: { nombre: "Velocidad",      poderes: ["velocidad"],    espera: "trote",           victoria: "vuelta-rapida",   derrota: "mareo",        punto: "estela" },
    vuelo:     { nombre: "Vuelo",          poderes: ["vuelo"],        espera: "flotar",          victoria: "despegue",        derrota: "aterrizaje-forzoso", punto: "giro-aire" },
    laser:     { nombre: "Rayos oculares", poderes: ["laser"],        espera: "ojos-brillan",    victoria: "rayos-al-cielo",  derrota: "cabeza-baja",  punto: "rayo-ojos" },
    fuerza:    { nombre: "Súper fuerza",   poderes: ["fuerza"],       espera: "flexionar",       victoria: "golpe-suelo",     derrota: "pisoton",      punto: "puno-arriba" },
    escudo:    { nombre: "Campo de fuerza", poderes: ["escudo"],      espera: "burbuja",         victoria: "onda-escudo",     derrota: "burbuja-rota", punto: "destello" },
    sigilo:    { nombre: "Sigilo",         poderes: ["invisibilidad"], espera: "parpadeo",       victoria: "aparecer",        derrota: "desvanecer",   punto: "teletransporte" },
  };
  const PODER_A_PAQUETE = { telarana: "arana", electricidad: "trueno", magia: "magia", telequinesis: "magia", fuego: "fuego", hielo: "hielo",
    velocidad: "velocidad", vuelo: "vuelo", laser: "laser", fuerza: "fuerza", escudo: "escudo", invisibilidad: "sigilo" };

  // Ajustes manuales que "pertenecen" a cada conjunto del modo básico
  const GRUPOS = { torso: ["torso", "brazo_der", "brazo_izq", "mano_der", "mano_izq"], piernas: ["cadera", "pierna_der", "pierna_izq", "piernas"] };
  // Espacio de accesorio según la etiqueta "ocupa" de la pieza
  const ESPACIO_DE = { sobre_cabeza: "cabeza", cara: "cara", espalda: "espalda", mano: "mano_der" };
  const ESPACIOS = ["cabeza", "cara", "espalda", "mano_der", "mano_izq"];

  /* ---------- biblioteca ---------- */
  const _cache = new WeakMap();
  function indice(bib) {
    if (!bib) throw new Error("minifig-core: falta la biblioteca");
    if (_cache.has(bib)) return _cache.get(bib);
    const porId = {};
    (bib.piezas || []).concat(bib.estampados || []).forEach(p => { porId[p.id] = p; });
    if (bib.porId) Object.assign(porId, bib.porId);
    const ix = { porId, personajes: bib.personajes || [], pz: id => (id && porId[id]) || null };
    _cache.set(bib, ix);
    return ix;
  }
  const esMascara = (ix, id) => { const e = ix.pz(id); return !!(e && e.ocupa === "cara"); };
  const esCasco = (ix, id) => { const p = ix.pz(id); return !!(p && p.categoria === "casco"); };
  const esCortas = (ix, id) => { const p = ix.pz(id); return !!(p && (p.tipo === "cortas" || p.clave === "cortas")); };

  /* ---------- figura nueva ---------- */
  function nueva(o) {
    const f = {
      version: VERSION, nombre: "Mi figura",
      identidad: { piel: TONOS[0].hex, cabeza: null, rostro: "FACE_001", detalles: [], cabello: { id: "HAIR_001", color: "#582a12" }, estilo: "neutro" },
      ropa: {
        torso: { id: null, color: "#c91a09", estampado: null, colores: ["#ffffff", "#1b2a34", "#6b4a2b"], texto: "", imagen: null },
        mangas: null, brazos: null, guantes: null,
        cadera: { id: null, color: "#0055bf", cinturon: null },
        piernas: { tipo: "normal", id: null, color: "#0055bf", botas: null },
      },
      traje: { id: null, encima: true, usar: { pelo: false, rostro: false }, quitar: [] },
      manual: {},
      accesorios: { cabeza: null, cara: null, espalda: null, mano_der: null, mano_izq: null },
      momentos: Object.assign({ paquete: null }, MOMENTOS_BASE),
      extensiones: {},
    };
    return mezclar(f, o || {});
  }
  // mezcla profunda solo para objetos simples (los arreglos se reemplazan)
  function mezclar(a, b) {
    for (const k of Object.keys(b)) {
      const v = b[k];
      if (v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) mezclar(a[k], v);
      else a[k] = clon(v);
    }
    return a;
  }

  /* ---------- traje: lo que aporta un personaje puesto encima ---------- */
  function trajeDe(personaje, bib) {
    const ix = indice(bib), S = personaje.piezas || {};
    const cab = S.cabeza || {}, mascara = S.cara && esMascara(ix, S.cara.id) ? S.cara.id : null;
    const piel = cab.color;
    const casco = S.cabello && esCasco(ix, S.cabello.id) ? clon(S.cabello) : null;
    return {
      id: personaje.id, nombre: personaje.nombre,
      torso: clon(S.torso), brazos: clon(S.brazos), manos: clon(S.manos), cadera: clon(S.cadera), piernas: clon(S.piernas),
      // brazos/manos del color de la cabeza = piel descubierta: siguen la piel del jugador
      brazosPiel: !mascara && !!S.brazos && S.brazos.color === piel,
      manosPiel: !mascara && !!S.manos && S.manos.color === piel,
      mascara, cabezaMascara: mascara ? { id: cab.id, color: piel } : null,
      casco, pelo: casco ? null : clon(S.cabello),
      rostro: mascara ? null : (S.cara ? S.cara.id : null), detalles: mascara ? [] : (S.detalles || []).slice(),
      cabezaPiel: mascara ? null : piel,
      espalda: S.capa ? clon(S.capa) : clon(S.cuello), cuelloExtra: S.capa && S.cuello ? clon(S.cuello) : null,
      objeto: clon(S.objeto),
      poderes: ((personaje.extensiones || {}).alv || {}).poderes || [],
    };
  }

  /* ---------- resolver: capas → piezas para dibujar ---------- */
  function resolver(figura, bib) {
    const ix = indice(bib), f = migrar(figura, bib);
    const I = f.identidad, R = f.ropa, A = f.accesorios || {}, Mn = f.manual || {}, T0 = f.traje || {};
    const ocultos = new Set(), avisos = [], fuente = {};
    const piel = I.piel || TONOS[0].hex;

    const S = {
      cabeza: { id: I.cabeza || "HEAD_001", color: piel },
      cara: I.rostro ? { id: I.rostro } : null,
      detalles: (I.detalles || []).slice(),
      cabello: I.cabello ? clon(I.cabello) : null,
      cuello: null,
      torso: { id: R.torso.id || "TORSO_001", color: R.torso.color, estampado: R.torso.estampado || null,
        colores: (R.torso.colores || []).slice(), texto: R.torso.texto || "", imagen: R.torso.imagen || null },
      brazos: null, manos: null, cadera: null, piernas: null, capa: null, objeto: null,
    };
    const mangas = R.mangas || (ix.pz(R.torso.estampado) || {}).mangas || "larga";
    S.brazos = { derecho: "ARM_001", izquierdo: "ARM_002", color: R.brazos || (mangas === "larga" ? R.torso.color : piel) };
    S.manos = { id: "HAND_001", color: R.guantes || piel };
    if (R.piernas.tipo === "cortas") {
      const id = R.piernas.id || "LEGS_002";
      S.cadera = { id, color: R.piernas.color };
      S.piernas = { id, color: R.piernas.color, botas: R.piernas.botas || null };
    } else {
      S.cadera = { id: R.cadera.id || "HIPS_001", color: R.cadera.color, cinturon: clon(R.cadera.cinturon) };
      S.piernas = { id: R.piernas.id || "LEGS_001", color: R.piernas.color, botas: R.piernas.botas || null };
    }
    fuente.cuerpo = "ropa"; fuente.cabeza = "identidad";

    // 3. traje encima
    let base = { espalda: null, cuelloExtra: null, mano_der: null }, poderesTraje = [];
    if (T0.id && T0.encima !== false) {
      const p = ix.personajes.find(x => x.id === T0.id);
      if (!p) avisos.push(`No existe el traje ${T0.id}`);
      else {
        const T = trajeDe(p, bib), quitar = T0.quitar || [], usar = T0.usar || {};
        S.torso = clon(T.torso);
        S.brazos = clon(T.brazos); if (T.brazosPiel) S.brazos.color = piel;
        S.manos = clon(T.manos); if (T.manosPiel) S.manos.color = piel;
        S.cadera = clon(T.cadera); S.piernas = clon(T.piernas);
        fuente.cuerpo = "traje";
        if (T.mascara && !quitar.includes("mascara")) {
          if (S.cara && S.cara.id !== T.mascara) ocultos.add("rostro");
          if (S.detalles.length) ocultos.add("detalles");
          S.cara = { id: T.mascara }; S.detalles = []; S.cabeza = clon(T.cabezaMascara); fuente.cabeza = "traje";
          // máscara de personaje calvo = capucha completa (Capitán América, Spider-Man): tapa el pelo
          if (!T.pelo && !T.casco && !usar.pelo && S.cabello) { ocultos.add("cabello"); S.cabello = null; }
        } else if (usar.rostro && T.rostro) {
          S.cara = { id: T.rostro }; S.detalles = T.detalles.slice(); fuente.cabeza = "traje";
        }
        if (T.casco && !quitar.includes("casco")) {
          if (S.cabello) ocultos.add("cabello");
          S.cabello = clon(T.casco);
        } else if (usar.pelo && T.pelo) S.cabello = clon(T.pelo);
        if (T.espalda && !quitar.includes("espalda")) base.espalda = T.espalda;
        if (T.cuelloExtra && !quitar.includes("espalda")) base.cuelloExtra = T.cuelloExtra;
        if (T.objeto && !quitar.includes("objeto")) base.mano_der = T.objeto;
        poderesTraje = T.poderes;
      }
    }

    // 4. ajustes manuales (modo avanzado)
    if (Mn.torso) Object.assign(S.torso, clon(Mn.torso));
    if (Mn.brazo_der) { if (Mn.brazo_der.id) S.brazos.derecho = Mn.brazo_der.id; if (Mn.brazo_der.color) S.brazos.color = Mn.brazo_der.color; }
    if (Mn.brazo_izq) { if (Mn.brazo_izq.id) S.brazos.izquierdo = Mn.brazo_izq.id; if (Mn.brazo_izq.color) S.brazos.color_izq = Mn.brazo_izq.color; }
    if (Mn.mano_der && Mn.mano_der.color) S.manos.color = Mn.mano_der.color;
    if (Mn.mano_izq && Mn.mano_izq.color) S.manos.color_izq = Mn.mano_izq.color;
    if (Mn.cadera) Object.assign(S.cadera, clon(Mn.cadera));
    if (Mn.piernas) Object.assign(S.piernas, clon(Mn.piernas));
    if (Mn.pierna_der && Mn.pierna_der.color) S.piernas.color = Mn.pierna_der.color;
    if (Mn.pierna_izq && Mn.pierna_izq.color) S.piernas.color_izq = Mn.pierna_izq.color;
    if (Mn.cabeza) Object.assign(S.cabeza, clon(Mn.cabeza));
    if (Object.keys(Mn).length) fuente.manual = Object.keys(Mn);
    // si izquierdo = derecho no hace falta el campo extra
    ["brazos", "manos", "piernas"].forEach(k => { if (S[k] && S[k].color_izq === S[k].color) delete S[k].color_izq; });

    // 5. accesorios del jugador (pisan los del traje)
    if (A.cabeza) {
      if (S.cabello && !esCasco(ix, S.cabello.id)) ocultos.add("cabello");
      S.cabello = clon(A.cabeza); fuente.sobre_cabeza = "accesorio";
    }
    if (A.cara) {
      if (S.cara && S.cara.id !== A.cara.id) ocultos.add("rostro");
      if (S.detalles.length) ocultos.add("detalles");
      S.cara = { id: A.cara.id }; S.detalles = [];
      if (A.cara.color) S.cabeza.color = A.cara.color;
      if (A.cara.tapaPelo && S.cabello && !esCasco(ix, S.cabello.id)) { ocultos.add("cabello"); S.cabello = null; }
    }
    const espalda = A.espalda || base.espalda;
    if (espalda) {
      const p = ix.pz(espalda.id);
      if (p && p.categoria === "capa") S.capa = clon(espalda); else S.cuello = clon(espalda);
    }
    if (!A.espalda && base.cuelloExtra && S.capa) S.cuello = clon(base.cuelloExtra);
    if (Mn._cuelloExtra && S.capa && !S.cuello) S.cuello = clon(Mn._cuelloExtra);
    const obj = A.mano_der || base.mano_der;
    if (obj) S.objeto = clon(obj);
    if (A.mano_izq) S.objeto_izq = clon(A.mano_izq);

    // detalles que ocupan el mismo lugar (dos lentes, dos barbas)
    const vistos = {};
    S.detalles = S.detalles.filter(id => {
      const oc = (ix.pz(id) || {}).ocupa; if (!oc) return true;
      if (vistos[oc]) { avisos.push(`${id} se solapa con ${vistos[oc]}`); return false; }
      vistos[oc] = id; return true;
    });

    const paquete = f.momentos && PAQUETES[f.momentos.paquete];
    const poderes = paquete ? paquete.poderes.slice() : (f.momentos && f.momentos.paquete === null && T0.id ? poderesTraje.slice() : []);
    const momentos = {}; MOMENTOS.forEach(m => { momentos[m] = (f.momentos && f.momentos[m]) || (paquete && paquete[m]) || MOMENTOS_BASE[m]; });
    return { piezas: S, ocultos: Array.from(ocultos), avisos, fuente, poderes, momentos };
  }

  /* ---------- desde las piezas de un personaje (copia exacta, sin traje) ---------- */
  function desdePiezas(S, bib, extra) {
    const ix = indice(bib), cab = S.cabeza || { color: TONOS[0].hex };
    const mascara = S.cara && esMascara(ix, S.cara.id);
    const piel = mascara ? TONOS[0].hex : cab.color;
    const f = nueva();
    f.identidad = {
      piel, cabeza: cab.id && cab.id !== "HEAD_001" ? cab.id : null,
      rostro: mascara ? "FACE_001" : (S.cara ? S.cara.id : null), detalles: (S.detalles || []).slice(),
      cabello: S.cabello && !esCasco(ix, S.cabello.id) ? clon(S.cabello) : null, estilo: "neutro",
    };
    if (mascara) {
      f.accesorios.cara = { id: S.cara.id, color: cab.color };
      if (cab.id && cab.id !== "HEAD_001") f.manual.cabeza = { id: cab.id };
      f.identidad.cabeza = null;
    }
    if (S.cabello && esCasco(ix, S.cabello.id)) f.accesorios.cabeza = clon(S.cabello);
    const t = S.torso || {};
    f.ropa.torso = { id: t.id && t.id !== "TORSO_001" ? t.id : null, color: t.color, estampado: t.estampado || null,
      colores: (t.colores || []).slice(), texto: t.texto || "", imagen: t.imagen || null };
    const mangas = (ix.pz(t.estampado) || {}).mangas || "larga";
    const brazoAuto = mangas === "larga" ? t.color : piel;
    f.ropa.mangas = null;
    f.ropa.brazos = S.brazos && S.brazos.color !== brazoAuto ? S.brazos.color : null;
    f.ropa.guantes = S.manos && S.manos.color !== piel ? S.manos.color : null;
    if (S.brazos && S.brazos.derecho && S.brazos.derecho !== "ARM_001") f.manual.brazo_der = { id: S.brazos.derecho };
    if (S.brazos && S.brazos.izquierdo && S.brazos.izquierdo !== "ARM_002") f.manual.brazo_izq = { id: S.brazos.izquierdo };
    if (S.piernas && esCortas(ix, S.piernas.id)) {
      f.ropa.piernas = { tipo: "cortas", id: S.piernas.id !== "LEGS_002" ? S.piernas.id : null, color: S.piernas.color, botas: S.piernas.botas || null };
    } else {
      const c = S.cadera || {}, p = S.piernas || {};
      f.ropa.cadera = { id: c.id && c.id !== "HIPS_001" ? c.id : null, color: c.color || "#6c6e68", cinturon: clon(c.cinturon) || null };
      f.ropa.piernas = { tipo: "normal", id: p.id && p.id !== "LEGS_001" ? p.id : null, color: p.color || "#6c6e68", botas: p.botas || null };
    }
    if (S.capa) f.accesorios.espalda = clon(S.capa);
    else if (S.cuello) f.accesorios.espalda = clon(S.cuello);
    if (S.capa && S.cuello) f.manual._cuelloExtra = clon(S.cuello); // raro: capa y pieza de cuello juntas
    if (S.objeto) f.accesorios.mano_der = clon(S.objeto);
    if (S.objeto_izq) f.accesorios.mano_izq = clon(S.objeto_izq);
    if (extra) mezclar(f, extra);
    return f;
  }

  /* ---------- personaje predeterminado: su traje + su identidad sugerida ---------- */
  function desdePersonaje(personaje, bib, opc) {
    const modo = (opc && opc.modo) || "personaje";
    const alv = ((personaje.extensiones || {}).alv) || {};
    const paquete = (alv.poderes || []).map(p => PODER_A_PAQUETE[p]).find(Boolean) || null;
    if (modo === "copia") {
      const f = desdePiezas(personaje.piezas, bib, { nombre: personaje.nombre, extensiones: clon(personaje.extensiones || {}) });
      f.momentos = Object.assign({ paquete }, paquete ? pick(PAQUETES[paquete], MOMENTOS) : MOMENTOS_BASE);
      return f;
    }
    // identidad = la del personaje (sin máscara ni casco: esos vienen en el traje)
    const base = desdePiezas(personaje.piezas, bib);
    const f = nueva({ nombre: personaje.nombre, extensiones: clon(personaje.extensiones || {}) });
    f.identidad = base.identidad;
    f.traje = { id: personaje.id, encima: true, usar: { pelo: false, rostro: false }, quitar: [] };
    f.momentos = Object.assign({ paquete }, paquete ? pick(PAQUETES[paquete], MOMENTOS) : MOMENTOS_BASE);
    return f;
  }
  const pick = (o, ks) => { const r = {}; ks.forEach(k => { r[k] = o[k]; }); return r; };

  /* ---------- migración de formatos viejos ---------- */
  function migrar(obj, bib, mapas) {
    if (!obj) return nueva();
    if (obj.version === VERSION) return mezclar(nueva(), obj);
    if (obj.piezas && obj.piezas.torso) return desdePersonaje(obj, bib, { modo: "copia" });           // personaje de la biblioteca
    if (obj.torso && obj.torso.id && obj.cabeza) return desdePiezas(obj, bib);                         // piezas sueltas
    // ALV v1: claves planas (algunas figuras vienen incompletas, sin piel ni rostro)
    if (["piel", "rostro", "torso", "piernas", "cabello", "facial", "puesto"].some(k => k in obj)) return desdeALV1(obj, mapas && mapas.alv);
    throw new Error("minifig-core: formato de figura desconocido");
  }

  // Avatar 2D de ALV (piel-02, rostro-05, cabello-28, torso-09, piernas-03, facial-07, equipo, puesto)
  function desdeALV1(v, mapa) {
    if (!mapa) throw new Error("minifig-core: falta la tabla de migración de ALV (biblioteca/migraciones/alv-v1.json)");
    const f = nueva({ nombre: v.nombre || "Mi figura" }), pend = [];
    f.identidad.piel = mapa.piel[v.piel] || TONOS[0].hex;
    const r = mapa.rostro[v.rostro];
    if (r) { f.identidad.rostro = r.rostro; f.identidad.detalles = r.detalles.slice(); }
    const fac = v.facial && mapa.facial[v.facial];
    if (fac && !f.identidad.detalles.includes(fac)) f.identidad.detalles.push(fac);
    const c = v.cabello && mapa.cabello[v.cabello];
    f.identidad.cabello = null;
    if (c) {
      if (c.cabello) f.identidad.cabello = clon(c.cabello);
      if (c.cabeza) f.accesorios.cabeza = clon(c.cabeza);
      if (c.pendiente) pend.push(c.pendiente);
    }
    const t = v.torso && mapa.torso[v.torso];
    if (t) {
      f.ropa.torso = { id: null, color: t.color, estampado: t.estampado || null, colores: (t.colores || ["#ffffff", "#1b2a34", "#6b4a2b"]).slice(), texto: t.texto || "", imagen: null };
      if (t.brazos) f.ropa.brazos = t.brazos;
      if (t.pendiente) pend.push(t.pendiente);
    }
    const pc = v.piernas && mapa.piernas[v.piernas];
    if (pc) { f.ropa.piernas.color = pc; f.ropa.cadera.color = pc; }
    const acc = v.accesorio && mapa.accesorio[v.accesorio];
    if (acc) f.accesorios.mano_der = { id: acc };
    f.extensiones.alv = { equipo: v.equipo || null, puesto: v.puesto || {}, legado: clon(v) };
    if (pend.length) f.extensiones.alv.pendientes = pend;
    return f;
  }

  /* ---------- ediciones con reglas (básico y avanzado) ---------- */
  function editadoEnAvanzado(f, grupo) {
    const Mn = f.manual || {};
    return (GRUPOS[grupo] || []).some(k => Mn[k] && Object.keys(Mn[k]).length);
  }
  // Lo que el modo básico muestra en cada paso: el valor o "personalizado"
  function vistaBasica(f) {
    return {
      torso: editadoEnAvanzado(f, "torso") ? "personalizado" : (f.ropa.torso.estampado || "liso"),
      piernas: editadoEnAvanzado(f, "piernas") ? "personalizado" : f.ropa.piernas.tipo,
      traje: f.traje && f.traje.id ? f.traje.id : null,
    };
  }
  // Básico cambia el conjunto completo. Si hay ajustes avanzados, pregunta primero.
  // decision: "reemplazar" (borra los ajustes del grupo) | "conservar" (solo cambia la base)
  function cambiarConjunto(f, grupo, valores, decision) {
    if (!GRUPOS[grupo]) throw new Error("grupo desconocido: " + grupo);
    if (editadoEnAvanzado(f, grupo) && !decision) {
      return { figura: f, pregunta: {
        grupo, texto: grupo === "torso" ? "Tienes brazos o manos personalizados." : "Tienes cadera o piernas personalizadas.",
        opciones: [{ id: "reemplazar", texto: "Reemplazar todo" }, { id: "conservar", texto: "Conservar mis ajustes" }] } };
    }
    const g = clon(f);
    if (decision === "reemplazar") GRUPOS[grupo].forEach(k => { delete g.manual[k]; });
    if (grupo === "torso") {
      if (valores.torso) mezclar(g.ropa.torso, valores.torso);
      ["mangas", "brazos", "guantes"].forEach(k => { if (k in valores) g.ropa[k] = clon(valores[k]); });
    } else {
      if (valores.piernas) mezclar(g.ropa.piernas, valores.piernas);
      if (valores.cadera) mezclar(g.ropa.cadera, valores.cadera);
    }
    return { figura: g };
  }
  // Ajuste de una pieza suelta (solo avanzado)
  function ajustar(f, clave, valores) {
    const g = clon(f);
    if (valores == null) delete g.manual[clave]; else g.manual[clave] = Object.assign(g.manual[clave] || {}, clon(valores));
    return { figura: g };
  }

  function ponerTraje(f, id, opc) {
    const g = clon(f);
    g.traje = Object.assign({ id, encima: true, usar: { pelo: false, rostro: false }, quitar: [] }, clon(opc || {}), { id });
    return { figura: g };
  }
  // Poner un traje desde el modo básico: si el traje trae máscara o casco, se quitan los del jugador
  // para que se vea el traje (quedan en "avisos"). Identidad y ropa no se tocan.
  function vestirTraje(f, id, bib) {
    const ix = indice(bib), p = ix.personajes.find(x => x.id === id);
    if (!p) return { figura: f, error: "Ese traje no existe", avisos: [] };
    const g = ponerTraje(f, id).figura, T = trajeDe(p, bib), avisos = [];
    const nom = x => ((ix.pz(x.id) || {}).nombre || x.id).toLowerCase();
    if ((T.mascara || T.casco) && g.accesorios.cabeza) { avisos.push(`Quitamos ${nom(g.accesorios.cabeza)} para que se vea el traje`); g.accesorios.cabeza = null; }
    if (T.mascara && g.accesorios.cara) { avisos.push(`Quitamos ${nom(g.accesorios.cara)} para que se vea el traje`); g.accesorios.cara = null; }
    return { figura: g, avisos };
  }
  // "Quitar traje / volver a mi identidad": no toca identidad ni ropa
  function quitarTraje(f) { const g = clon(f); g.traje = { id: null, encima: true, usar: { pelo: false, rostro: false }, quitar: [] }; return { figura: g }; }
  // El traje puesto pasa a ser ropa propia (para editarlo en básico). La identidad del jugador no cambia;
  // la máscara y el casco del traje quedan como accesorios, y los accesorios propios se respetan.
  function soltarTraje(f, bib) {
    if (!f.traje || !f.traje.id) return { figura: clon(f) };
    const sinExtras = Object.assign(clon(f), { manual: {}, accesorios: { cabeza: null, cara: null, espalda: null, mano_der: null, mano_izq: null } });
    const R = resolver(sinExtras, bib), d = desdePiezas(R.piezas, bib), g = clon(f), piel = f.identidad.piel;
    g.ropa = d.ropa;
    if (g.ropa.brazos === piel) { g.ropa.brazos = null; g.ropa.mangas = "sin"; }   // brazos descubiertos siguen a la piel
    if (g.ropa.guantes === piel) g.ropa.guantes = null;
    delete d.manual._cuelloExtra;
    g.manual = Object.assign({}, d.manual, f.manual);
    if (R.ocultos.includes("cabello") && d.accesorios.cara && !d.accesorios.cabeza) d.accesorios.cara.tapaPelo = true; // capucha completa
    ESPACIOS.forEach(e => { if (!g.accesorios[e] && d.accesorios[e]) g.accesorios[e] = d.accesorios[e]; });
    g.traje = { id: null, encima: true, usar: { pelo: false, rostro: false }, quitar: [] };
    return { figura: g };
  }

  // ¿Esta pieza se puede poner en este espacio? Devuelve también qué quita o tapa.
  function compatibilidad(f, espacio, pieza, bib, modo) {
    const ix = indice(bib), p = ix.pz(pieza && pieza.id);
    if (!p) return { ok: false, motivo: "La pieza no existe" };
    const oc = p.ocupa, espacioPieza = oc === "mano" ? (espacio === "mano_izq" ? "mano_izq" : "mano_der") : ESPACIO_DE[oc];
    const r = { ok: true, quita: [], tapa: [], avisos: [] };
    if (espacioPieza !== espacio) {
      if (modo !== "avanzado") return { ok: false, motivo: "Esta pieza no va en este lugar" };
      r.avisos.push("Puede solaparse");
    }
    const actual = (f.accesorios || {})[espacio];
    if (actual && actual.id !== pieza.id) {
      const nom = (ix.pz(actual.id) || {}).nombre || actual.id;
      r.quita.push(actual.id); r.avisos.push(`Quitamos ${nom.toLowerCase()} para poner ${p.nombre.toLowerCase()}`);
    }
    (p.oculta || []).forEach(o => {
      if (o === "cabello" && f.identidad.cabello) { r.tapa.push("cabello"); r.avisos.push("El pelo queda guardado debajo"); }
      if (o === "rostro" && f.identidad.rostro) { r.tapa.push("rostro"); r.avisos.push("Tu rostro queda guardado debajo"); }
    });
    return r;
  }
  function ponerAccesorio(f, espacio, pieza, bib, modo) {
    if (!ESPACIOS.includes(espacio)) throw new Error("espacio desconocido: " + espacio);
    const g = clon(f);
    if (!pieza) { g.accesorios[espacio] = null; return { figura: g, avisos: [] }; }
    const c = compatibilidad(f, espacio, pieza, bib, modo);
    if (!c.ok) return { figura: f, error: c.motivo, avisos: [] };
    g.accesorios[espacio] = clon(pieza);
    return { figura: g, avisos: c.avisos };
  }
  // Detalle facial (lentes, barba, pecas): en básico reemplaza al que ocupa el mismo lugar
  function ponerDetalle(f, id, bib, modo) {
    const ix = indice(bib), g = clon(f), oc = (ix.pz(id) || {}).ocupa, avisos = [];
    const lista = g.identidad.detalles || [];
    if (lista.includes(id)) { g.identidad.detalles = lista.filter(x => x !== id); return { figura: g, avisos }; }
    const choca = oc ? lista.filter(x => (ix.pz(x) || {}).ocupa === oc) : [];
    if (choca.length && modo !== "avanzado") g.identidad.detalles = lista.filter(x => !choca.includes(x));
    else if (choca.length) avisos.push("Puede solaparse");
    g.identidad.detalles = (g.identidad.detalles || []).concat(id);
    return { figura: g, avisos };
  }

  /* ---------- listas para la interfaz ---------- */
  // Ordena por estilo sin esconder nada: primero el elegido, luego neutro, luego el resto
  function ordenarPorEstilo(lista, estilo, bib) {
    if (!estilo || estilo === "neutro" || estilo === "todo") return lista.slice();
    const ix = indice(bib);
    const rango = x => { const e = (ix.pz(typeof x === "string" ? x : x.id) || {}).estilo || "neutro"; return e === estilo ? 0 : e === "neutro" ? 1 : 2; };
    return lista.map((x, i) => [x, i]).sort((a, b) => rango(a[0]) - rango(b[0]) || a[1] - b[1]).map(a => a[0]);
  }
  // Piezas que se pueden ofrecer en un espacio. "verTodo" (solo avanzado) incluye las demás con aviso.
  function opcionesPara(espacio, bib, modo, verTodo) {
    const ix = indice(bib), todas = Object.values(ix.porId).filter(p => p.ocupa);
    return todas.map(p => {
      const esp = p.ocupa === "mano" ? ["mano_der", "mano_izq"] : [ESPACIO_DE[p.ocupa]];
      return { id: p.id, nombre: p.nombre, encaja: esp.includes(espacio) };
    }).filter(o => o.encaja || (modo === "avanzado" && verTodo)).map(o => Object.assign(o, o.encaja ? {} : { aviso: "Puede solaparse" }));
  }

  /* ---------- aleatorio coherente ---------- */
  function azar(semilla) { let a = (semilla >>> 0) || 1; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function aleatorio(bib, opc) {
    const o = opc || {}, rnd = azar(o.semilla == null ? Date.now() : o.semilla), ix = indice(bib);
    const de = arr => arr[Math.floor(rnd() * arr.length)];
    const estilo = o.estilo && o.estilo !== "todo" ? o.estilo : null;
    const conEstilo = arr => { if (!estilo) return arr; const m = arr.filter(p => (p.estilo || "neutro") === estilo || (p.estilo || "neutro") === "neutro"); return m.length && rnd() < 0.85 ? m : arr; };
    const todo = Object.values(ix.porId);
    const cat = c => todo.filter(p => p.categoria === c);
    const caras = conEstilo(cat("cara").filter(p => p.ocupa !== "cara"));
    const pelos = conEstilo(cat("cabello"));
    const torsos = cat("estampado-torso");
    const f = nueva({ nombre: "Figura sorpresa" });
    f.identidad.estilo = o.estilo || "neutro";
    f.identidad.piel = de(TONOS).hex;
    f.identidad.rostro = de(caras).id;
    f.identidad.detalles = rnd() < 0.3 ? [de(conEstilo(cat("detalle"))).id] : [];
    f.identidad.cabello = { id: de(pelos).id, color: de(COLORES_PELO) };
    const c1 = de(PALETA);
    f.ropa.torso = { id: null, color: c1, estampado: rnd() < 0.7 ? de(torsos).id : null, colores: [de(PALETA), de(PALETA), "#6b4a2b"], texto: "", imagen: null };
    const cp = de(PALETA);
    f.ropa.piernas = { tipo: rnd() < 0.08 ? "cortas" : "normal", id: null, color: cp, botas: rnd() < 0.3 ? de(PALETA) : null };
    f.ropa.cadera = { id: null, color: cp, cinturon: null };
    if (rnd() < 0.25) f.accesorios.cabeza = { id: de(cat("casco")).id, color: de(PALETA) };
    if (rnd() < 0.25) { const e = de(cat("capa").concat(cat("cuello"))); f.accesorios.espalda = { id: e.id, color: de(PALETA) }; }
    if (rnd() < 0.35) { const ob = de(cat("objeto")); f.accesorios.mano_der = { id: ob.id, color: ob.color_defecto || de(PALETA) }; }
    if (rnd() < 0.5) { const k = de(Object.keys(PAQUETES)); f.momentos = Object.assign({ paquete: k }, pick(PAQUETES[k], MOMENTOS)); }
    return f;
  }

  return { VERSION, TONOS, COLORES_PELO, PALETA, MOMENTOS, PAQUETES, GRUPOS, ESPACIOS,
    nueva, resolver, trajeDe, desdePiezas, desdePersonaje, migrar, desdeALV1,
    editadoEnAvanzado, vistaBasica, cambiarConjunto, ajustar, ponerTraje, vestirTraje, quitarTraje, soltarTraje,
    compatibilidad, ponerAccesorio, ponerDetalle, ordenarPorEstilo, opcionesPara, aleatorio };
});
