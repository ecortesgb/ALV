/* ============ Momentos: lo que hace la figura en el juego ============ */
// Cada momento es una pose animada (solo los 7 giros reales de una minifigura + mover/girar el cuerpo entero)
// más la intensidad del efecto de su poder (fx, de 0 a 1). Sin Three.js ni DOM: lo usan el taller y los juegos.
//
// pose(nombre, t) devuelve { cabeza, brazoObj, brazoLib, manoObj, manoLib, piernaIzq, piernaDer,  (radianes)
//                            y, z, rotX, rotY,                                                   (cuerpo entero)
//                            fx, opacidad? }
// brazoObj = brazo del objeto (izquierdo de la figura), brazoLib = el otro. Negativo = hacia adelante/arriba
// (-PI/2 al frente, -2.95 recto arriba). Piernas: negativo = hacia adelante, límite ±PI/2.
(function (raiz, fabrica) {
  const M = fabrica();
  if (typeof module !== "undefined" && module.exports) module.exports = M; else raiz.Momentos = M;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const s = Math.sin, c = Math.cos, PI = Math.PI, ARR = -2.95, FRENTE = -PI / 2;
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const k01 = (t, a, b) => cl((t - a) / (b - a), 0, 1);                 // avance 0→1 entre a y b
  const suave = x => x * x * (3 - 2 * x);
  const salto = (t, a, b, h) => { const k = k01(t, a, b); return k > 0 && k < 1 ? 4 * k * (1 - k) * h : 0; };
  const respira = t => ({ cabeza: s(t * 0.7) * 0.3, brazoObj: s(t * 1.4) * 0.05, brazoLib: -s(t * 1.4) * 0.05, y: Math.abs(s(t * 1.4)) * 0.006 });
  const pulso = (t, a, d) => { const k = k01(t, a, a + d); return k > 0 && k < 1 ? s(k * PI) : 0; };

  // tipo: espera (en bucle) | victoria | derrota | punto (una vez, dur en segundos)
  const DEF = {
    /* ---------- espera ---------- */
    "respirar":        { tipo: "espera", nombre: "Respirar", pose: t => Object.assign(respira(t), { fx: 0.4 }) },
    "columpio":        { tipo: "espera", nombre: "Columpiarse", pose: t => ({ brazoLib: ARR + s(t * 2) * 0.1, manoLib: 0.4, brazoObj: -0.3, rotX: s(t * 2) * 0.18, y: 0.12 + c(t * 4) * 0.04, piernaIzq: s(t * 2) * 0.35, piernaDer: s(t * 2 + 0.6) * 0.35, cabeza: s(t) * 0.3, fx: 0.6 }) },
    "chispas-manos":   { tipo: "espera", nombre: "Chispas en las manos", pose: t => ({ brazoObj: -0.7, brazoLib: -0.7, manoObj: s(t * 9) * 0.5, manoLib: -s(t * 9) * 0.5, cabeza: s(t * 0.8) * 0.25, y: 0.004, fx: 0.5 + 0.5 * Math.abs(s(t * 7)) }) },
    "flotar-runas":    { tipo: "espera", nombre: "Flotar con runas", pose: t => ({ y: 0.25 + s(t * 1.5) * 0.05, brazoObj: -1.3, brazoLib: -1.3, manoObj: s(t * 2) * 0.4, manoLib: -s(t * 2) * 0.4, piernaIzq: -0.25, piernaDer: -0.15, rotY: s(t * 0.6) * 0.3, fx: 1 }) },
    "flama-manos":     { tipo: "espera", nombre: "Flamas en las manos", pose: t => ({ brazoObj: -1.0, brazoLib: -1.0, manoObj: PI / 2, manoLib: -PI / 2, cabeza: s(t * 0.9) * 0.2, y: Math.abs(s(t * 1.4)) * 0.006, fx: 0.7 + 0.3 * s(t * 5) }) },
    "copos":           { tipo: "espera", nombre: "Copos de nieve", pose: t => ({ brazoObj: -0.5 + s(t * 1.5) * 0.15, brazoLib: -0.5 - s(t * 1.5) * 0.15, cabeza: s(t * 0.5) * 0.4, rotY: s(t * 0.4) * 0.2, fx: 0.6 }) },
    "trote":           { tipo: "espera", nombre: "Trotar en su lugar", pose: t => { const w = s(t * 8); return { piernaIzq: w * 0.5, piernaDer: -w * 0.5, brazoObj: -w * 0.6, brazoLib: w * 0.6, y: Math.abs(c(t * 8)) * 0.05, fx: 0.5 }; } },
    "flotar":          { tipo: "espera", nombre: "Flotar", pose: t => ({ y: 0.3 + s(t * 1.6) * 0.06, brazoObj: -0.25, brazoLib: -0.25, piernaIzq: -0.12, piernaDer: 0.06, cabeza: s(t * 0.6) * 0.3, fx: 1 }) },
    "ojos-brillan":    { tipo: "espera", nombre: "Ojos que brillan", pose: t => ({ cabeza: s(t * 0.8) * 0.5, brazoObj: 0.05, brazoLib: 0.05, fx: s(t * 2.5) > 0.6 ? 1 : 0.15 }) },
    "flexionar":       { tipo: "espera", nombre: "Presumir fuerza", pose: t => ({ brazoObj: -2.3, brazoLib: -2.3, manoObj: s(t * 3) * 0.6, manoLib: -s(t * 3) * 0.6, y: Math.abs(s(t * 3)) * 0.02, cabeza: s(t * 1.5) * 0.3, fx: 0.4 }) },
    "burbuja":         { tipo: "espera", nombre: "Burbuja protectora", pose: t => ({ brazoObj: -0.9, brazoLib: -0.9, manoObj: 0.6, manoLib: -0.6, cabeza: s(t * 0.7) * 0.3, fx: 0.7 + 0.3 * s(t * 2) }) },
    "parpadeo":        { tipo: "espera", nombre: "Parpadear", pose: t => Object.assign(respira(t), { fx: 1, opacidad: 0.35 + 0.3 * (s(t * 2) * 0.5 + 0.5) }) },

    /* ---------- victoria ---------- */
    "salto-puno":      { tipo: "victoria", dur: 2.4, nombre: "Salto con puño", pose: t => ({ y: salto(t, 0.2, 0.9, 0.5), brazoLib: ARR * suave(k01(t, 0, 0.3)), brazoObj: -0.4, piernaIzq: -0.4 * pulso(t, 0.2, 0.7), piernaDer: -0.4 * pulso(t, 0.2, 0.7), cabeza: 0, fx: 0.4 + 0.6 * pulso(t, 0.3, 1.2) }) },
    "telarana-arriba": { tipo: "victoria", dur: 2.4, nombre: "Telaraña al cielo", pose: t => ({ brazoLib: ARR, manoLib: s(t * 10) * 0.4 * (1 - k01(t, 1, 1.6)), brazoObj: -0.5, y: salto(t, 0.6, 1.3, 0.45), rotY: s(t * 2) * 0.2, fx: k01(t, 0, 0.4) }) },
    "rayo-al-cielo":   { tipo: "victoria", dur: 2.6, nombre: "Rayo al cielo", pose: t => ({ brazoObj: ARR * suave(k01(t, 0, 0.5)), brazoLib: -0.3, cabeza: 0, rotX: -0.08, y: 0.04 * pulso(t, 0.5, 1.5), fx: t < 0.5 ? 0.2 : 0.6 + 0.4 * Math.abs(s(t * 23)) }) },
    "circulo-magico":  { tipo: "victoria", dur: 2.8, nombre: "Círculo mágico", pose: t => ({ brazoObj: -1.5, brazoLib: -1.5, manoObj: s(t * 4) * 0.6, manoLib: -s(t * 4) * 0.6, rotY: suave(k01(t, 0, 2.2)) * 2 * PI, y: 0.18 * pulso(t, 0, 2.8), fx: 1 }) },
    "explosion-fuego": { tipo: "victoria", dur: 2.4, nombre: "Explosión de fuego", pose: t => { const sube = suave(k01(t, 0.6, 0.8)); return { brazoObj: -0.2 + (ARR + 0.2) * sube, brazoLib: -0.2 + (ARR + 0.2) * sube, y: salto(t, 0.7, 1.3, 0.35), rotX: 0.15 * (1 - sube), fx: t < 0.6 ? 0.3 : 1 - 0.4 * k01(t, 1.2, 2.4) }; } },
    "tormenta-hielo":  { tipo: "victoria", dur: 2.6, nombre: "Tormenta de hielo", pose: t => ({ brazoObj: -2.6, brazoLib: -2.6, rotY: suave(k01(t, 0, 1.8)) * 4 * PI, y: 0.1 * pulso(t, 0, 1.8), fx: 1 }) },
    "vuelta-rapida":   { tipo: "victoria", dur: 2.2, nombre: "Vuelta rápida", pose: t => { const g = k01(t, 0, 1); return { rotY: suave(g) * 6 * PI, brazoObj: g < 1 ? 0.4 : ARR, brazoLib: g < 1 ? 0.4 : -0.3, piernaIzq: g < 1 ? s(t * 30) * 0.5 : 0, piernaDer: g < 1 ? -s(t * 30) * 0.5 : 0, fx: 1 - 0.6 * k01(t, 1, 2) }; } },
    "despegue":        { tipo: "victoria", dur: 3.0, nombre: "Despegar", pose: t => ({ y: 0.85 * suave(k01(t, 0.3, 1.6)) * (1 - suave(k01(t, 2.2, 3))), brazoLib: ARR, brazoObj: 0.2, piernaIzq: 0.1, piernaDer: 0.25, rotX: -0.1, fx: 1 }) },
    "rayos-al-cielo":  { tipo: "victoria", dur: 2.4, nombre: "Rayos al cielo", pose: t => ({ rotX: -0.16 * suave(k01(t, 0, 0.5)), brazoObj: 0.2, brazoLib: 0.2, cabeza: 0, fx: t < 0.5 ? 0.2 : 1 }) },
    "golpe-suelo":     { tipo: "victoria", dur: 2.4, nombre: "Golpe al suelo", pose: t => { const arriba = t < 0.8; return { y: salto(t, 0.1, 0.8, 0.55), brazoLib: arriba ? ARR : -0.4, brazoObj: arriba ? ARR : -0.4, rotX: arriba ? 0 : 0.3 * (1 - k01(t, 1.4, 2.2)), piernaIzq: arriba ? 0 : -0.5 * (1 - k01(t, 1.4, 2.2)), fx: pulso(t, 0.8, 0.9) }; } },
    "onda-escudo":     { tipo: "victoria", dur: 2.4, nombre: "Onda de escudo", pose: t => ({ brazoObj: FRENTE * suave(k01(t, 0, 0.4)), brazoLib: FRENTE * suave(k01(t, 0, 0.4)), manoObj: 0.8, manoLib: -0.8, y: 0.05 * pulso(t, 0.4, 1), fx: 0.4 + 0.6 * Math.abs(s(t * 6)) }) },
    "aparecer":        { tipo: "victoria", dur: 2.4, nombre: "Aparecer", pose: t => ({ brazoObj: ARR * suave(k01(t, 0.9, 1.3)), brazoLib: -0.3, opacidad: 0.08 + 0.92 * k01(t, 0, 1), fx: 1 }) },

    /* ---------- derrota ---------- */
    "cabeza-baja":     { tipo: "derrota", dur: 2.6, nombre: "Cabeza baja", pose: t => ({ rotX: 0.22 * suave(k01(t, 0, 0.6)), brazoObj: 0.15, brazoLib: 0.15, cabeza: s(t * 2.2) * 0.3 * k01(t, 0.6, 1), fx: 0.1 }) },
    "pisoton":         { tipo: "derrota", dur: 2.4, nombre: "Pisotón", pose: t => { const p = Math.max(0, s(t * 7)); return { piernaDer: -0.6 * p * (1 - k01(t, 1.6, 2)), brazoObj: 0.3, brazoLib: 0.3, rotX: 0.1, y: 0.02 * p, cabeza: s(t * 7) * 0.15, fx: 0.15 }; } },
    "brazos-caidos":   { tipo: "derrota", dur: 2.4, nombre: "Brazos caídos", pose: t => ({ brazoObj: 0.25, brazoLib: 0.25, rotX: 0.18 * suave(k01(t, 0, 0.8)), y: -0.02 * k01(t, 0, 0.8), cabeza: -0.2, fx: 0.4 * (1 - k01(t, 0, 1.5)) }) },
    "humo":            { tipo: "derrota", dur: 2.4, nombre: "Echando humo", pose: t => ({ rotX: 0.2, brazoObj: 0.1, brazoLib: 0.1, cabeza: s(t * 1.2) * 0.4, fx: 0.25 }) },
    "congelado":       { tipo: "derrota", dur: 2.4, nombre: "Congelado", pose: t => ({ brazoObj: -0.35, brazoLib: -0.35, piernaIzq: 0.1, piernaDer: -0.1, rotY: s(t * 40) * 0.015 * (1 - k01(t, 0.8, 2.4)), fx: 0.9 }) },
    "mareo":           { tipo: "derrota", dur: 2.6, nombre: "Mareo", pose: t => ({ rotY: s(t * 3) * 0.6, rotX: s(t * 5) * 0.1, cabeza: s(t * 4) * 0.6, brazoObj: -0.4 + s(t * 3) * 0.3, brazoLib: -0.4 - s(t * 3) * 0.3, fx: 0.3 }) },
    "aterrizaje-forzoso": { tipo: "derrota", dur: 2.6, nombre: "Aterrizaje forzoso", pose: t => ({ y: 0.9 * (1 - suave(k01(t, 0, 0.6))), rotX: 0.5 * suave(k01(t, 0.6, 0.9)), brazoObj: (ARR + 0.3) * (1 - k01(t, 0.6, 0.9)) - 0.3, brazoLib: (ARR + 0.3) * (1 - k01(t, 0.6, 0.9)) - 0.3, piernaIzq: -0.4 * k01(t, 0.6, 0.9), fx: 1 - k01(t, 0.6, 1.2) }) },
    "burbuja-rota":    { tipo: "derrota", dur: 2.4, nombre: "Burbuja rota", pose: t => ({ brazoObj: 0.2, brazoLib: 0.2, rotX: 0.15 * k01(t, 0.5, 1), cabeza: s(t * 2) * 0.3, fx: t < 0.5 ? 1 : Math.abs(s(t * 20)) * (1 - k01(t, 0.5, 1.4)) }) },
    "desvanecer":      { tipo: "derrota", dur: 2.4, nombre: "Desvanecerse", pose: t => ({ rotX: 0.15, brazoObj: 0.15, brazoLib: 0.15, opacidad: 1 - 0.9 * k01(t, 0.3, 1.6), fx: 1 }) },

    /* ---------- al anotar ---------- */
    "puno-arriba":     { tipo: "punto", dur: 1.6, nombre: "Puño arriba", pose: t => ({ brazoLib: ARR * suave(k01(t, 0, 0.25)), brazoObj: -0.2, y: salto(t, 0.1, 0.5, 0.15), fx: pulso(t, 0.1, 1) }) },
    "lanzar-telarana": { tipo: "punto", dur: 1.6, nombre: "Lanzar telaraña", pose: t => ({ brazoLib: FRENTE * suave(k01(t, 0.15, 0.35)), manoLib: s(t * 12) * 0.3 * (1 - k01(t, 0.6, 1)), brazoObj: -0.3, rotY: -0.25 * suave(k01(t, 0, 0.3)), fx: k01(t, 0.3, 0.4) * (1 - k01(t, 1, 1.6)) }) },
    "rayo-corto":      { tipo: "punto", dur: 1.6, nombre: "Rayo corto", pose: t => ({ brazoObj: FRENTE * suave(k01(t, 0, 0.25)), brazoLib: -0.3, rotY: 0.2, fx: t < 0.25 ? 0.2 : 0.6 + 0.4 * Math.abs(s(t * 25)) * (1 - k01(t, 0.9, 1.6)) }) },
    "destello":        { tipo: "punto", dur: 1.6, nombre: "Destello", pose: t => ({ brazoObj: -2.4 * suave(k01(t, 0, 0.3)), brazoLib: -2.4 * suave(k01(t, 0, 0.3)), y: salto(t, 0.2, 0.7, 0.12), fx: pulso(t, 0.25, 1.2) }) },
    "bola-fuego":      { tipo: "punto", dur: 1.6, nombre: "Bola de fuego", pose: t => { const atras = k01(t, 0, 0.35), lanza = suave(k01(t, 0.35, 0.5)); return { brazoLib: 0.8 * atras * (1 - lanza) + FRENTE * lanza, brazoObj: -0.4, rotY: 0.3 * atras * (1 - lanza) - 0.2 * lanza, fx: 0.3 + 0.7 * pulso(t, 0.4, 1) }; } },
    "rafaga-hielo":    { tipo: "punto", dur: 1.6, nombre: "Ráfaga de hielo", pose: t => ({ brazoObj: FRENTE * suave(k01(t, 0, 0.3)), brazoLib: FRENTE * suave(k01(t, 0, 0.3)), manoObj: 0.6, manoLib: -0.6, rotX: -0.05, fx: pulso(t, 0.2, 1.3) }) },
    "estela":          { tipo: "punto", dur: 1.6, nombre: "Estela veloz", pose: t => ({ rotY: suave(k01(t, 0, 0.7)) * 4 * PI, z: 0.3 * pulso(t, 0, 0.7), piernaIzq: s(t * 30) * 0.5 * (1 - k01(t, 0.6, 0.8)), piernaDer: -s(t * 30) * 0.5 * (1 - k01(t, 0.6, 0.8)), brazoLib: ARR * k01(t, 0.7, 0.9), fx: 1 - k01(t, 0.8, 1.6) }) },
    "giro-aire":       { tipo: "punto", dur: 1.6, nombre: "Giro en el aire", pose: t => ({ y: 0.25 + salto(t, 0, 0.9, 0.5), rotY: suave(k01(t, 0, 0.9)) * 2 * PI, brazoObj: -2.6, brazoLib: -2.6, piernaIzq: -0.3, piernaDer: -0.3, fx: 1 }) },
    "teletransporte":  { tipo: "punto", dur: 1.6, nombre: "Teletransporte", pose: t => ({ opacidad: t < 0.5 ? 1 - 0.95 * k01(t, 0, 0.3) : 0.05 + 0.95 * k01(t, 0.5, 0.8), rotY: t < 0.5 ? 0 : PI * 0.15, brazoLib: ARR * k01(t, 0.8, 1), fx: 1 }) },
    "rayo-ojos":       { tipo: "punto", dur: 1.6, nombre: "Rayo de los ojos", pose: t => ({ rotX: -0.08, cabeza: 0, brazoObj: 0.1, brazoLib: 0.1, fx: t < 0.2 ? 0 : 1 - k01(t, 1, 1.6) }) },
  };

  // De dónde sale el efecto de cada momento y qué forma tiene. El renderer lo dibuja encima del efecto
  // general del poder (que baja de intensidad). Sin entrada = solo el efecto general.
  //   origen: manoLib (mano libre) | manoObj (la del objeto) | ambas | ojos | cabeza | cuerpo | pies
  //   forma:  rayo (línea recta) | chorro (partículas que salen) | estallido (se abren en esfera)
  //           aura (giran alrededor) | anillo (onda en el piso) | estela (quedan atrás) | proyectil (bola que viaja)
  //   dir:    arriba | frente | abajo     color: opcional, si no, el del poder
  const EFX = {
    "chispas-manos": { origen: "ambas", forma: "aura" }, "flama-manos": { origen: "ambas", forma: "chorro", dir: "arriba" },
    "flotar-runas": { origen: "cuerpo", forma: "aura", radio: 0.55 }, "copos": { origen: "cuerpo", forma: "aura", radio: 0.6 },
    "columpio": { origen: "manoLib", forma: "rayo", dir: "arriba" }, "ojos-brillan": { origen: "ojos", forma: "aura", radio: 0.08 },
    "trote": { origen: "pies", forma: "estela" }, "flotar": { origen: "pies", forma: "chorro", dir: "abajo" },
    "salto-puno": { origen: "manoLib", forma: "estallido", color: "#ffd21a" }, "telarana-arriba": { origen: "manoLib", forma: "rayo", dir: "arriba" },
    "rayo-al-cielo": { origen: "manoObj", forma: "rayo", dir: "arriba" }, "circulo-magico": { origen: "pies", forma: "aura", radio: 0.7 },
    "explosion-fuego": { origen: "cuerpo", forma: "estallido" }, "tormenta-hielo": { origen: "cuerpo", forma: "aura", radio: 0.75 },
    "vuelta-rapida": { origen: "cuerpo", forma: "estela" }, "despegue": { origen: "pies", forma: "chorro", dir: "abajo" },
    "rayos-al-cielo": { origen: "ojos", forma: "rayo", dir: "arriba" }, "golpe-suelo": { origen: "pies", forma: "anillo" },
    "onda-escudo": { origen: "ambas", forma: "estallido" }, "aparecer": { origen: "cuerpo", forma: "estallido" },
    "pisoton": { origen: "pies", forma: "anillo", color: "#c9b28a" }, "humo": { origen: "cabeza", forma: "chorro", dir: "arriba", color: "#8a8f99" },
    "congelado": { origen: "cuerpo", forma: "aura", radio: 0.45 }, "mareo": { origen: "cabeza", forma: "aura", radio: 0.3, color: "#ffe14d" },
    "aterrizaje-forzoso": { origen: "pies", forma: "anillo", color: "#c9b28a" }, "burbuja-rota": { origen: "cuerpo", forma: "estallido" },
    "puno-arriba": { origen: "manoLib", forma: "estallido", color: "#ffd21a" }, "lanzar-telarana": { origen: "manoLib", forma: "rayo", dir: "frente" },
    "rayo-corto": { origen: "manoObj", forma: "rayo", dir: "frente" }, "destello": { origen: "ambas", forma: "estallido" },
    "bola-fuego": { origen: "manoLib", forma: "proyectil", dir: "frente" }, "rafaga-hielo": { origen: "ambas", forma: "chorro", dir: "frente" },
    "estela": { origen: "cuerpo", forma: "estela" }, "giro-aire": { origen: "pies", forma: "estela" },
    "rayo-ojos": { origen: "ojos", forma: "rayo", dir: "frente" }, "teletransporte": { origen: "cuerpo", forma: "estallido" },
  };
  const efecto = nombre => (EFX[nombre] ? Object.assign({ dir: "frente", radio: 0.25 }, EFX[nombre]) : null);

  const CERO = { cabeza: 0, brazoObj: 0, brazoLib: 0, manoObj: 0, manoLib: 0, piernaIzq: 0, piernaDer: 0, y: 0, z: 0, rotX: 0, rotY: 0, fx: 0 };
  // t en segundos desde que empezó el momento. Los de una vez se quedan en su último cuadro.
  function pose(nombre, t) {
    const d = DEF[nombre] || DEF.respirar;
    const tt = d.dur ? cl(t, 0, d.dur) : Math.max(0, t);
    const r = Object.assign({}, CERO, d.pose(tt));
    r.piernaIzq = cl(r.piernaIzq, -PI / 2, PI / 2); r.piernaDer = cl(r.piernaDer, -PI / 2, PI / 2);
    r.fx = cl(r.fx, 0, 1); if (r.opacidad != null) r.opacidad = cl(r.opacidad, 0, 1);
    return r;
  }
  const info = nombre => { const d = DEF[nombre]; return d ? { id: nombre, nombre: d.nombre, tipo: d.tipo, dur: d.dur || null, bucle: !d.dur } : null; };
  const lista = tipo => Object.keys(DEF).filter(k => !tipo || DEF[k].tipo === tipo).map(info);
  return { pose, info, lista, efecto, existe: n => !!DEF[n] };
});
