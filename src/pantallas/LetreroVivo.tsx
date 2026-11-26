// Letrero del lobby y de la TV que reacciona (movimiento.css; decidió Codex, encargo 2026-11-26-movimiento-pantallas-r1):
// el número late cuando cambia (no al abrir la pantalla) y «¡Todos listos!» se celebra una sola vez, al pasar de
// faltar alguien a todos listos (abrir o recargar con todos listos no celebra).
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { movimientoReducido } from "../app/preferencias";

/**
 * Número del letrero: se vuelve a montar cuando cambia el valor y, si ya cambió alguna vez, late.
 * `conocido = false` mientras los datos no llegan (la TV arranca sin miembros): ese valor no cuenta como cambio.
 */
export function NumeroLetrero({ valor, conocido = true, children }: { valor: string | number; conocido?: boolean; children: ReactNode }) {
  const primero = useRef(valor);
  const cambio = useRef(false);
  if (!conocido) primero.current = valor;
  else if (valor !== primero.current) cambio.current = true;
  return <span key={String(valor)} className={"lb-banner-n" + (cambio.current ? " mov-late" : "")}>{children}</span>;
}

/** Se celebra solo al pasar de «faltan» (false) a «todos listos» (true); desde «no se sabe» (null), no. */
export const esCelebracion = (antes: boolean | null, ahora: boolean | null) => ahora === true && antes === false;

/**
 * true durante la celebración (0.7 s) que sigue a pasar de «faltan» a «todos listos».
 * `null` = todavía no se sabe (sin miembros cargados): así abrir la TV con todos listos no celebra.
 */
export function useCelebracion(todos: boolean | null): boolean {
  const antes = useRef(todos);
  const reloj = useRef(0);
  const [fiesta, setFiesta] = useState(false);
  useEffect(() => {
    const paso = esCelebracion(antes.current, todos);
    antes.current = todos;
    if (!paso || movimientoReducido()) return;
    setFiesta(true);
    clearTimeout(reloj.current);
    reloj.current = window.setTimeout(() => setFiesta(false), 700);
  }, [todos]);
  useEffect(() => () => clearTimeout(reloj.current), []);
  return fiesta;
}

// 14 papelitos detrás del letrero, dentro de los primeros 120 px de la pantalla; 0.6 s con los retardos.
// Salen de las orillas del letrero (su ancho cambia entre celular, computadora y TV) para no quedar tapados por él.
const COLORES = ["#ffe14a", "#34d36a", "#ff5fa2", "#4fd8ff", "#ff9f1a", "#ffffff"];
const papeles = (mitad: number) => Array.from({ length: 14 }, (_, i) => {
  const lado = i % 2 ? 1 : -1;
  const k = Math.floor(i / 2);
  return { x: lado * Math.round(mitad - 40 + k * 22), y: 14 + ((k * 23) % 64), c: COLORES[i % COLORES.length], d: (k % 5) * 25 };
});

export function Confeti() {
  const [lista] = useState(() => papeles((document.querySelector(".lb-banner")?.getBoundingClientRect().width ?? 300) / 2));
  return (
    <span className="mov-confeti" aria-hidden="true">
      {lista.map((p, i) => <i key={i} style={{ "--x": `${p.x}px`, "--y": `${p.y}px`, "--c": p.c, "--d": `${p.d}ms` } as CSSProperties} />)}
    </span>
  );
}
