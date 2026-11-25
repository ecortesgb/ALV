// La figura 3D del HUB sobre la Plataforma ALV (modo «azotea» de tools/minifig/escena.js, el mismo motor de siempre).
// Desde aquí se le pide que voltee, que haga una pose breve, que llegue o que deje de dibujar.
import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { avisoDelMotor, huella, semillaDe } from "../../app/figura3d";
import { alPedirGesto, animacionDe } from "../../app/animaciones";
import { calidadAzotea, movimientoReducido, paramBiblioteca } from "../../app/preferencias";
import type { FiguraV2 } from "../../content/personaje";
import { PRIORIDAD_VIDA, animPerfil, soloApariencia, type Contexto } from "../../app/perfiles";
import { alVida, nombreVida } from "../../app/vidaPerfil";
import type { Ambiente, Anclaje, ColoresPlataforma } from "./paquetes";

const BASE = `${import.meta.env.BASE_URL}minifig/`;
const LLEGADA = "alv-azotea-llegada";

export type AccionFigura = "listo" | "mirarse" | "frotar" | "flexionar" | "orgullo" | "saludar";

export interface MandoAzotea {
  /** Voltea hacia un punto de la pantalla (null: vuelve a su reposo). */
  mirarA(punto: { x: number; y: number } | null): void;
  accion(cual: AccionFigura | null): void;
  llegada(): void;
  pausa(si: boolean): void;
}

const tactil = () => typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
/** La llegada sale una vez por sesión del navegador (al recargar no se repite). */
function primeraVez(): boolean {
  try { if (sessionStorage.getItem(LLEGADA)) return false; sessionStorage.setItem(LLEGADA, "1"); return true; } catch { return false; }
}

export const EscenaAzotea = forwardRef<MandoAzotea, { id: string; figura: FiguraV2 | null; ambiente: Ambiente; plataforma: ColoresPlataforma; className?: string;
  /** false: nunca hace la entrada (el Perfil no la repite). */ llegada?: boolean;
  /** Contexto con vida automática (perfiles.ts), p. ej. «hub». Sin él, la figura se mueve como siempre. */ vida?: Contexto }>(
  function EscenaAzotea({ id, figura, ambiente, plataforma, className, llegada = true, vida }, mando) {
    const ref = useRef<HTMLIFrameElement>(null);
    const [listo, setListo] = useState(false);
    const listoRef = useRef(false);
    // La dirección se calcula una sola vez: cambiarla recargaría la escena.
    const anclaje = ambiente.pedestal;
    // Calidad y movimiento salen de Configuración → Mi experiencia (al volver a esta pantalla ya se ven).
    const [src] = useState(() => `${BASE}escena.html?modo=azotea&estilo=cine&acabado=brillo&calidad=${calidadAzotea(tactil())}${llegada && primeraVez() ? "&llegada=1" : ""}${anclaje ? "&plataforma=no" : ""}${movimientoReducido() ? "&quieto=1" : ""}${paramBiblioteca()}`);
    const caja = useRef<HTMLDivElement>(null);
    // Dónde caen los pies dentro del lienzo y cuánto mide la figura (fracciones); la escena lo dice al encuadrar.
    const pies = useRef({ x: 0.5, y: 0.955, alto: 0.83 });
    const colocar = useRef<() => void>(() => {});
    colocar.current = () => { if (anclaje && caja.current) ponerSobrePedestal(caja.current, anclaje, pies.current); };
    const enviar = (m: object) => ref.current?.contentWindow?.postMessage({ origen: "alv", ...m }, location.origin);
    const datos = useRef({ id, figura, ambiente, plataforma, vida });
    datos.current = { id, figura, ambiente, plataforma, vida };
    // Animaciones de la biblioteca que tiene esta escena (las avisa biblioteca-anim.js).
    const bib = useRef(new Set<string>());
    const hay = (n: string) => bib.current.has(n);

    const mandarTodo = () => {
      const d = datos.current;
      enviar({ tipo: "plataforma", colores: d.plataforma });
      enviar({ tipo: "ambiente", brillo: d.ambiente.brillo, ranura: d.plataforma.ranura, ...d.ambiente.luz });
      // Con vida: al motor va solo la apariencia y la personalidad viaja como perillas (reposo, velocidad, intensidad).
      enviar({ tipo: "figuras", lista: [d.figura ? { id: d.id, figura: d.vida ? soloApariencia(d.figura) : d.figura, anim: d.vida ? { ...animacionDe(d.figura), ...animPerfil(d.figura, hay) } : animacionDe(d.figura) } : { id: d.id, semilla: semillaDe(d.id) }] });
    };
    useEffect(() => {
      const f = (e: MessageEvent) => {
        if (e.origin !== location.origin || e.source !== ref.current?.contentWindow || e.data?.origen !== "minifig") return;
        if (e.data.tipo === "listo") { listoRef.current = true; setListo(true); mandarTodo(); }
        if (e.data.tipo === "biblioteca" && Array.isArray(e.data.registradas)) { bib.current = new Set(e.data.registradas.filter((x: unknown) => typeof x === "string")); if (listoRef.current && datos.current.vida) mandarTodo(); }
        avisoDelMotor(e.data);
        if (e.data.tipo === "pies" && [e.data.x, e.data.y, e.data.alto].every(Number.isFinite) && e.data.alto > 0.1) {
          pies.current = { x: e.data.x, y: e.data.y, alto: e.data.alto }; colocar.current();
        }
      };
      addEventListener("message", f);
      // Gestos de la tienda global (MenuGestos, la sala): solo los de esta figura.
      const fuera = alPedirGesto(g => { if (listoRef.current && g.jugador === datos.current.id) enviar({ tipo: "momento", id: g.jugador, cual: g.gesto, prio: g.prioridad }); });
      // Vida automática de esta figura (la decide useVidaPropia en este aparato; aquí solo se dibuja).
      const fueraVida = alVida(v => {
        if (!listoRef.current || !datos.current.vida || v.jugador !== datos.current.id) return;
        enviar({ tipo: "momento", id: v.jugador, cual: nombreVida(v, hay), prio: PRIORIDAD_VIDA, vel: v.vel, int: v.int, ...(v.dur ? { dur: v.dur } : {}) });
      });
      return () => { removeEventListener("message", f); fuera(); fueraVida(); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Recolocar al cambiar el tamaño de la ventana o cuando el fondo ya tiene su tamaño.
    useEffect(() => {
      if (!anclaje) return;
      const f = () => colocar.current();
      f(); const t = setTimeout(f, 300);
      addEventListener("resize", f);
      const fondo = document.querySelector(".az-fondo"), ro = fondo && typeof ResizeObserver !== "undefined" ? new ResizeObserver(f) : null;
      if (fondo && ro) ro.observe(fondo);
      return () => { clearTimeout(t); removeEventListener("resize", f); ro?.disconnect(); };
    }, [anclaje]);

    // Girar la figura arrastrando (ratón o dedo); al soltar sigue girando con inercia. Un toque sin arrastrar la hace saludar.
    const gesto = useRef<{ x: number; t: number; v: number; total: number; id: number } | null>(null);
    const arrastre = {
      onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
        gesto.current = { x: e.clientX, t: performance.now(), v: 0, total: 0, id: e.pointerId };
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
        const g = gesto.current; if (!g || g.id !== e.pointerId) return;
        const dx = e.clientX - g.x, ahora = performance.now(), cuanto = dx * 0.012;
        if (!dx) return;
        enviar({ tipo: "girar", cuanto });
        g.v = cuanto / Math.max(0.008, (ahora - g.t) / 1000); g.x = e.clientX; g.t = ahora; g.total += Math.abs(dx);
      },
      onPointerUp: () => {
        const g = gesto.current; gesto.current = null; if (!g) return;
        if (g.total < 6) { enviar({ tipo: "accion", cual: "saludar" }); return; }
        if (performance.now() - g.t < 90) enviar({ tipo: "impulso", vel: g.v });
      },
      onPointerCancel: () => { gesto.current = null; },
    };

    const firma = figura ? huella(figura) : "s";
    useEffect(() => { if (listo) mandarTodo(); }, [listo, firma, ambiente, plataforma]); // eslint-disable-line react-hooks/exhaustive-deps

    useImperativeHandle(mando, () => ({
      mirarA(p) {
        const r = ref.current?.getBoundingClientRect();
        if (!p || !r) { enviar({ tipo: "mirar", x: 0, y: 0, activa: false }); return; }
        // Centro de la figura: a la mitad del lienzo, a la altura del pecho.
        const cx = r.left + r.width / 2, cy = r.top + r.height * 0.42;
        enviar({ tipo: "mirar", activa: true, x: (p.x - cx) / Math.max(200, r.width * 0.75), y: (p.y - cy) / Math.max(200, r.height * 0.6) });
      },
      accion: cual => enviar({ tipo: "accion", cual }),
      llegada: () => enviar({ tipo: "llegada" }),
      pausa: si => enviar({ tipo: "pausa", si }),
    }), []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <div ref={caja} className={"az-figura" + (listo ? " listo" : "") + (anclaje ? " anclada" : "") + (className ? " " + className : "")} {...arrastre}>
        <iframe ref={ref} src={src} title="Tu figura en la azotea" tabIndex={-1} aria-hidden="true" />
      </div>
    );
  });

/**
 * Pone el lienzo de la figura para que sus pies caigan en el pedestal pintado del fondo.
 * Calcula dónde se dibuja la imagen (cover o «auto N%», y su posición) y de ahí el punto del pedestal en pantalla.
 * En celular (fondo «auto N%») además corre la imagen para que el pedestal quede al centro.
 */
function ponerSobrePedestal(el: HTMLElement, a: Anclaje, p: { x: number; y: number; alto: number }) {
  const fondo = document.querySelector<HTMLElement>(".az-fondo"); if (!fondo) return;
  const r = fondo.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
  const cs = getComputedStyle(fondo), tam = cs.backgroundSize.trim();
  let dh: number;
  const pct = /^auto\s+([\d.]+)%$/.exec(tam);
  if (pct) dh = r.height * Number(pct[1]) / 100; else dh = Math.max(r.height, r.width / a.proporcion);
  const dw = dh * a.proporcion;
  // Posición en % (o «0px», que es 0); otra cosa se toma como centro.
  const pos = cs.backgroundPosition.split(/\s+/).map(v => (v.endsWith("%") ? Number(v.slice(0, -1)) / 100 : parseFloat(v) === 0 ? 0 : 0.5));
  let px = pos[0] ?? 0.5; const py = pos[1] ?? 0.5;
  if (pct && dw !== r.width) {
    px = Math.max(0, Math.min(1, (r.width / 2 - a.x * dw) / (r.width - dw)));
    fondo.style.backgroundPosition = `${(px * 100).toFixed(2)}% ${(py * 100).toFixed(2)}%`;
  }
  const ox = r.left + (r.width - dw) * px, oy = r.top + (r.height - dh) * py;
  const ax = ox + a.x * dw, ay = oy + a.y * dh;
  const h = (a.escala * dh) / p.alto, w = h * 0.8;
  Object.assign(el.style, { left: `${Math.round(ax - p.x * w)}px`, top: `${Math.round(ay - p.y * h)}px`, width: `${Math.round(w)}px`, height: `${Math.round(h)}px` });
}
