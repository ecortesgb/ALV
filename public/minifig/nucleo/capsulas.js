/* ============ Cápsulas: hasta N figuras guardadas por jugador ============ */
// Solo guarda figuras por capas (minifig-core, versión 2). Nunca el modelo plano del Taller.
// No usa el DOM: el almacén es cualquier objeto con getItem/setItem (localStorage, o un Map en Node).
(function (raiz, fabrica) {
  const M = fabrica();
  if (typeof module !== "undefined" && module.exports) module.exports = M; else raiz.Capsulas = M;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const clon = o => JSON.parse(JSON.stringify(o));

  function crear(almacen, opc) {
    const o = opc || {}, clave = o.clave || "minifig-capsulas-v1", n = o.n || 3;
    let E = leer();

    function vacio() { return { version: 1, activa: null, slots: Array(n).fill(null) }; }
    function valida(f) { return !!f && typeof f === "object" && f.version === 2 && f.identidad && f.ropa; }
    function leer() {
      try {
        const s = JSON.parse((almacen && almacen.getItem(clave)) || "null");
        if (!s || !Array.isArray(s.slots)) return vacio();
        const e = vacio();
        for (let i = 0; i < n; i++) { const x = s.slots[i]; e.slots[i] = x && valida(x.figura) ? x : null; }
        e.activa = Number.isInteger(s.activa) && e.slots[s.activa] ? s.activa : primera(e);
        return e;
      } catch (err) { return vacio(); }
    }
    function primera(e) { const i = e.slots.findIndex(Boolean); return i < 0 ? null : i; }
    function escribir() { try { almacen && almacen.setItem(clave, JSON.stringify(E)); } catch (err) { /* sin espacio o bloqueado: sigue en memoria */ } }
    function rango(i) { if (!Number.isInteger(i) || i < 0 || i >= n) throw new Error("Cápsula fuera de rango: " + i); }

    return {
      n,
      estado: () => clon(E),
      slot: i => (rango(i), E.slots[i] ? clon(E.slots[i]) : null),
      activa: () => E.activa,
      vacias: () => E.slots.every(s => !s),
      primeraVacia: () => E.slots.findIndex(s => !s),
      guardar(i, figura, nombre) {
        rango(i);
        if (!valida(figura)) throw new Error("Solo se guardan figuras versión 2 (minifig-core)");
        E.slots[i] = { nombre: (nombre || figura.nombre || "Mi figura").slice(0, 40), figura: clon(figura), actualizado: new Date().toISOString() };
        if (E.activa == null) E.activa = i;
        escribir(); return i;
      },
      renombrar(i, nombre) { rango(i); if (!E.slots[i]) return; E.slots[i].nombre = (nombre || "").slice(0, 40) || "Mi figura"; escribir(); },
      usar(i) { rango(i); if (!E.slots[i]) return false; E.activa = i; escribir(); return true; },
      vaciar(i) { rango(i); E.slots[i] = null; if (E.activa === i) E.activa = primera(E); escribir(); },
      // copia la cápsula i en la primera vacía; devuelve el índice nuevo o -1 si no hay lugar
      duplicar(i) {
        rango(i); if (!E.slots[i]) return -1;
        const j = E.slots.findIndex(s => !s); if (j < 0) return -1;
        E.slots[j] = clon(E.slots[i]); E.slots[j].nombre = (E.slots[i].nombre + " (copia)").slice(0, 40); E.slots[j].actualizado = new Date().toISOString();
        escribir(); return j;
      },
      recargar() { E = leer(); return clon(E); },
    };
  }

  // Almacén en memoria (pruebas en Node o navegador sin localStorage)
  function memoria() { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; }

  return { crear, memoria };
});
