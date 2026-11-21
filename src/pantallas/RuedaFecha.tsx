// Rueda de fecha (Día / Mes / Año): se gira con el dedo, la rueda del ratón, las flechas de arriba y abajo o el teclado.
// La fila del centro es la elegida. Cada giro avisa al momento con AAAA-MM-DD; «Listo» cierra.
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { diasDelMes, dos, hoy } from "../app/fecha";

const ALTO = 40; // alto de cada fila (px); también en alv.css (.a-rueda)
const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
type Opcion = { v: number; t: string };

function Columna({ etiqueta, opciones, valor, alCambiar }: { etiqueta: string; opciones: Opcion[]; valor: number; alCambiar: (v: number) => void }) {
  const lista = useRef<HTMLDivElement>(null), reloj = useRef<ReturnType<typeof setTimeout>>(), montada = useRef(false);
  const ultimo = useRef(valor); ultimo.current = valor;
  // Destino del desplazamiento que hace la rueda sola (para seguir lo elegido): mientras va hacia allá no elige nada.
  // Si la persona toca o gira en medio, se suelta y manda la persona.
  const auto = useRef<number | null>(null);
  const idx = Math.max(0, opciones.findIndex(o => o.v === valor));

  // Lleva la fila elegida al centro (sin animar la primera vez).
  useEffect(() => {
    const el = lista.current;
    if (!el || Math.round(el.scrollTop / ALTO) === idx) return;
    clearTimeout(reloj.current);
    auto.current = idx * ALTO;
    el.scrollTo({ top: idx * ALTO, behavior: montada.current ? "smooth" : "auto" });
    montada.current = true;
  }, [idx]);
  useEffect(() => { montada.current = true; return () => clearTimeout(reloj.current); }, []);

  // Al dejar de girar, la fila del centro queda elegida.
  const alGirar = () => {
    const el0 = lista.current;
    if (auto.current !== null) { if (el0 && Math.abs(el0.scrollTop - auto.current) < 2) auto.current = null; return; }
    clearTimeout(reloj.current);
    reloj.current = setTimeout(() => {
      const el = lista.current; if (!el) return;
      const i = Math.min(opciones.length - 1, Math.max(0, Math.round(el.scrollTop / ALTO)));
      if (opciones[i] && opciones[i]!.v !== ultimo.current) alCambiar(opciones[i]!.v);
    }, 110);
  };
  const soltar = () => { auto.current = null; };
  const mover = (d: number) => { const o = opciones[Math.min(opciones.length - 1, Math.max(0, idx + d))]; if (o) alCambiar(o.v); };
  const tecla = (e: KeyboardEvent) => {
    const d = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 }[e.key];
    if (d) { e.preventDefault(); mover(d); }
  };

  return (
    <div className="a-rueda-col">
      <span className="a-rueda-et">{etiqueta}</span>
      <button type="button" className="a-rueda-flecha" onClick={() => mover(-1)} aria-label={`${etiqueta}: anterior`} tabIndex={-1}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
      </button>
      <div ref={lista} className="a-rueda-lista" role="listbox" aria-label={etiqueta} tabIndex={0} onScroll={alGirar} onKeyDown={tecla}
        onWheel={soltar} onTouchStart={soltar} onPointerDown={soltar}>
        {opciones.map(o => (
          <div key={o.v} role="option" aria-selected={o.v === valor} className={o.v === valor ? "on" : ""} onClick={() => alCambiar(o.v)}>{o.t}</div>
        ))}
      </div>
      <button type="button" className="a-rueda-flecha" onClick={() => mover(1)} aria-label={`${etiqueta}: siguiente`} tabIndex={-1}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
    </div>
  );
}

/** Panel con las tres ruedas. `valor`: AAAA-MM-DD o "" (empieza en 01 ENE 2000). */
export function RuedaFecha({ valor, alCambiar, alCerrar }: { valor: string; alCambiar: (iso: string) => void; alCerrar: () => void }) {
  const tope = hoy().getFullYear() - 18;
  const leer = (v: string) => { const [a, m, d] = v ? v.split("-").map(Number) : [2000, 1, 1]; return { d: d!, m: m!, a: a! }; };
  const [f, setF] = useState(() => leer(valor));
  const caja = useRef<HTMLDivElement>(null);

  // Si se escribe una fecha válida a mano con la rueda abierta, la rueda la sigue.
  useEffect(() => { if (valor) setF(leer(valor)); }, [valor]);
  useEffect(() => { caja.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, []);

  const fijar = (n: { d: number; m: number; a: number }) => {
    const d = Math.min(n.d, diasDelMes(n.a, n.m)); // 31 de abril → 30
    setF({ d, m: n.m, a: n.a });
    alCambiar(`${n.a}-${dos(n.m)}-${dos(d)}`);
  };
  const dias: Opcion[] = Array.from({ length: diasDelMes(f.a, f.m) }, (_, i) => ({ v: i + 1, t: dos(i + 1) }));
  const meses: Opcion[] = MESES.map((t, i) => ({ v: i + 1, t }));
  const anios: Opcion[] = Array.from({ length: tope - 1919 }, (_, i) => ({ v: 1920 + i, t: String(1920 + i) }));

  return (
    <div ref={caja} className="a-rueda" role="group" aria-label="Elegir fecha de nacimiento" onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); alCerrar(); } }}>
      <div className="a-rueda-cols">
        <div className="a-rueda-banda" aria-hidden="true" />
        <Columna etiqueta="Día" opciones={dias} valor={f.d} alCambiar={d => fijar({ ...f, d })} />
        <Columna etiqueta="Mes" opciones={meses} valor={f.m} alCambiar={m => fijar({ ...f, m })} />
        <Columna etiqueta="Año" opciones={anios} valor={f.a} alCambiar={a => fijar({ ...f, a })} />
      </div>
      <button type="button" className="a-rueda-listo" onClick={() => { fijar(f); alCerrar(); }}>Listo</button>
    </div>
  );
}
