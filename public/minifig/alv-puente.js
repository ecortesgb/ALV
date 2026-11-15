/* ============ Puente ALV ↔ editor de Minifig Studio ============ */
// Se carga antes de js/99-arranque.js solo en la copia de ALV (tools/copiar-minifig.mjs).
// Con ?app=alv&j=<jugador>: las cápsulas se guardan en la clave de ese jugador y cada cambio se avisa a ALV
// (la ventana de arriba) para que lo suba a la cuenta. El editor no habla con Supabase: eso lo hace ALV.
(function () {
  "use strict";
  const q = new URLSearchParams(location.search);
  if (q.get("app") !== "alv") return;
  const jugador = (q.get("j") || "local").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "local";
  const CLAVE = "alv-capsulas-" + jugador;
  const avisar = m => { try { if (window.parent !== window) window.parent.postMessage(Object.assign({ origen: "minifig" }, m), location.origin); } catch (e) { /* sin ventana de arriba */ } };

  let base;
  try { localStorage.setItem("_alv_t", "1"); localStorage.removeItem("_alv_t"); base = localStorage; } catch (e) { base = Capsulas.memoria(); }
  const almacen = {
    getItem: k => base.getItem(k),
    setItem: (k, v) => {
      base.setItem(k, v);
      if (k === CLAVE) { try { avisar({ tipo: "capsulas", jugador, estado: JSON.parse(v) }); } catch (e) { /* JSON roto: no se avisa */ } }
    },
  };

  // eslint-disable-next-line no-global-assign
  prCaps = function () { if (!CAPS) CAPS = Capsulas.crear(almacen, { clave: CLAVE, n: 3 }); return CAPS; };
  // En ALV no hay taller ni creador detrás: salir lo decide ALV con su propio botón.
  // eslint-disable-next-line no-global-assign
  prCerrar = function () { /* nada */ };

  // ALV puede pedir que se relean las cápsulas (por ejemplo, al llegar las de la nube).
  window.addEventListener("message", e => {
    if (e.origin !== location.origin || !e.data || e.data.origen !== "alv") return;
    if (e.data.tipo === "recargar" && CAPS) { CAPS.recargar(); if (typeof prEntrar === "function" && PR.on) prEntrar(); }
  });

  document.documentElement.classList.add("en-alv");
  const css = document.createElement("style");
  css.textContent = "#prTaller,#prCreador{display:none!important}";
  document.head.appendChild(css);
  window.addEventListener("load", () => avisar({ tipo: "listo", jugador }));
})();
