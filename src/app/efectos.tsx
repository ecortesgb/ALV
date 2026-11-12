// Efectos de la dirección Neo-Arcade: fondo vivo, temporizador en anillo, números flotantes y confeti.
// Todo respeta «reducir movimiento»: sin animación, la información sigue ahí.
import { useEffect, useRef, useState } from "react";
import { sonar } from "./sonido";

const menosMovimiento = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Fondo de la app: manchas de color que se mueven despacio, un aura del color de la sección y estrellas que parpadean. */
export function Fondo() {
  return (
    <div className="fondo" aria-hidden="true">
      <span className="mancha m1" /><span className="mancha m2" /><span className="mancha m3" />
      <span className="aura" />
      <span className="estrellas e1" /><span className="estrellas e2" />
    </div>
  );
}

/** Pinta el aura del fondo con el color de la sección activa mientras el componente esté montado. */
export function useAura(color: string | undefined) {
  useEffect(() => {
    if (!color) return;
    const raiz = document.documentElement;
    raiz.style.setProperty("--aura", color);
    return () => { raiz.style.removeProperty("--aura"); };
  }, [color]);
}

/**
 * Temporizador en anillo: avanza de forma continua y cambia de color
 * (cian, ámbar desde la mitad, rojo parpadeante en los últimos 10 s). Suena tic-tac al final.
 */
export function Anillo({ clave, segundos = 60, alTerminar }: { clave: string; segundos?: number; alTerminar?: () => void }) {
  const [resta, setResta] = useState(segundos * 1000);
  const fin = useRef(0);
  const ultimoTic = useRef(-1);
  useEffect(() => {
    fin.current = performance.now() + segundos * 1000;
    ultimoTic.current = -1;
    setResta(segundos * 1000);
    let marco = 0, sonado = false;
    const paso = () => {
      const r = Math.max(0, fin.current - performance.now());
      setResta(r);
      const s = Math.ceil(r / 1000);
      if (s <= 10 && s > 0 && s !== ultimoTic.current) { ultimoTic.current = s; sonar("tic"); }
      if (r === 0) { if (!sonado) { sonado = true; sonar("tiempo"); alTerminar?.(); } return; }
      marco = requestAnimationFrame(paso);
    };
    marco = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(marco);
    // alTerminar se lee al final; no reinicia el reloj si cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, segundos]);
  const s = Math.ceil(resta / 1000);
  const parte = resta / (segundos * 1000);
  const estado = s <= 10 ? "rojo" : parte <= 0.5 ? "ambar" : "cian";
  const R = 26, C = 2 * Math.PI * R;
  return (
    <div className={`anillo ${estado}`} role="timer" aria-label={s > 0 ? `${s} segundos` : "Se acabó el tiempo"}>
      <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
        <circle cx="32" cy="32" r={R} className="pista" />
        <circle cx="32" cy="32" r={R} className="avance" strokeDasharray={C} strokeDashoffset={C * (1 - parte)} />
      </svg>
      <span>{s > 0 ? s : "¡YA!"}</span>
    </div>
  );
}

/** Números de recompensa que salen de la carta y viajan hacia el marcador. */
export interface Flotante { id: number; texto: string; tono: "lime" | "cyan" | "gold" }
let siguiente = 0;
export function useFlotantes() {
  const [lista, setLista] = useState<Flotante[]>([]);
  const lanzar = (textos: [string, Flotante["tono"]][]) => {
    const nuevos = textos.map(([texto, tono]) => ({ id: siguiente++, texto, tono }));
    setLista(x => [...x, ...nuevos]);
    setTimeout(() => setLista(x => x.filter(f => !nuevos.includes(f))), 1500);
  };
  return { lista, lanzar };
}
export function Flotantes({ lista }: { lista: Flotante[] }) {
  return (
    <div className="flotantes" aria-live="polite">
      {lista.map(f => <span key={f.id} className={`flotante ${f.tono}`}>{f.texto}</span>)}
    </div>
  );
}

/** Lluvia de confeti en un canvas ligero. Se apaga sola y no corre con «reducir movimiento». */
export function Confeti({ duracion = 3800 }: { duracion?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || menosMovimiento()) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const ajustar = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    ajustar();
    addEventListener("resize", ajustar);
    const colores = ["#FF2E88", "#22E1FF", "#C6FF3D", "#FFCF4A", "#A77BFF", "#FF7A2E"];
    const n = Math.min(160, Math.round(innerWidth / 3));
    const piezas = Array.from({ length: n }, () => ({
      x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.6,
      vx: (Math.random() - 0.5) * 2.4, vy: 2 + Math.random() * 3.2,
      g: Math.random() * Math.PI * 2, vg: (Math.random() - 0.5) * 0.3,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, color: colores[Math.floor(Math.random() * colores.length)]!,
    }));
    const inicio = performance.now();
    let marco = 0;
    const paso = (t: number) => {
      const pasado = t - inicio;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalAlpha = pasado > duracion - 800 ? Math.max(0, (duracion - pasado) / 800) : 1;
      for (const p of piezas) {
        p.x += p.vx + Math.sin(p.g) * 0.6; p.y += p.vy; p.g += p.vg;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.g);
        ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.g)));
        ctx.restore();
      }
      if (pasado < duracion) marco = requestAnimationFrame(paso);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    marco = requestAnimationFrame(paso);
    return () => { cancelAnimationFrame(marco); removeEventListener("resize", ajustar); };
  }, [duracion]);
  return <canvas ref={ref} className="confeti" aria-hidden="true" />;
}
