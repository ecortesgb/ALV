// Apertura de un sobre: sacudir, rasgar, luz por rareza, cartas una por una, «¡NUEVO!» y «Ponérmelo».
// El resultado ya viene decidido (servidor o, en la demostración, la tirada local): la animación solo lo muestra.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiguraViva, figuraActiva, useCapsulas } from "../app/figura3d";
import { ponerPieza } from "../app/equiparPieza";
import { sesionAhora } from "../app/sesion";
import { sonar } from "../app/sonido";
import { RaizDS } from "../ds";
import { NOMBRE_RAREZA } from "../content/rarezas";
import { comodinPorId, type Sobre } from "../content/tienda";
import type { Apertura as Resultado, Carta } from "../engine/sobresTienda";
import { ponermelo, useTienda } from "../servicios/tienda";
import { aviso } from "./comun";
import { infoPieza } from "./Desbloqueo";
import { miniatura } from "./Libro";
import { Momento, srcArte } from "./Tienda";

type Fase = "sacudir" | "rasgar" | "luz" | "cartas" | "resumen";
const GOLPES = 3;
const quieto = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Vibración corta (Android; en iPhone el navegador no la permite). */
const vibrar = (p: number | number[]) => { try { if (!quieto()) navigator.vibrate?.(p); } catch { /* sin vibración */ } };

export function Apertura({ sobre, apertura, alOtro, alColeccion }: { sobre: Sobre; apertura: Resultado; alOtro: () => void; alColeccion: () => void }) {
  const [fase, setFase] = useState<Fase>("sacudir");
  const [golpes, setGolpes] = useState(0);
  const [vistas, setVistas] = useState(0);
  const [corte, setCorte] = useState(0);
  const arrastre = useRef<number | null>(null);
  const t = useTienda();
  const n = apertura.cartas.length, mejor = apertura.mejor;

  // Luz por rareza: después pasan las cartas.
  useEffect(() => {
    if (fase !== "luz") return;
    sonar(mejor);
    vibrar(mejor === "legendaria" ? [60, 40, 60, 40, 180] : mejor === "epica" ? [50, 40, 90] : 40);
    const ms = quieto() ? 500 : mejor === "legendaria" ? 2300 : mejor === "epica" ? 1700 : 1200;
    const id = setTimeout(() => setFase("cartas"), ms);
    return () => clearTimeout(id);
  }, [fase, mejor]);

  const sacudir = () => {
    if (fase !== "sacudir") return;
    const g = golpes + 1;
    sonar("sacudir"); vibrar(25 + g * 20);
    setGolpes(g);
    if (g >= GOLPES) setTimeout(() => setFase("rasgar"), 350);
  };
  const rasgar = () => { if (fase !== "rasgar") return; setCorte(1); sonar("rasgar"); vibrar([30, 30, 60]); setTimeout(() => setFase("luz"), quieto() ? 150 : 650); };
  const voltear = (k: number) => {
    if (fase !== "cartas" || k !== vistas) return;
    const c = apertura.cartas[k]!;
    sonar("voltear");
    if (c.tipo === "pieza" && c.rareza !== "rara") setTimeout(() => { sonar(c.rareza); vibrar(c.rareza === "legendaria" ? [80, 40, 120] : 50); }, 220);
    setVistas(k + 1);
  };
  const abrirTodas = () => {
    for (let k = vistas; k < n; k++) setTimeout(() => { sonar("voltear"); setVistas(v => Math.max(v, k + 1)); }, (k - vistas) * 260);
  };
  useEffect(() => {
    if (fase !== "cartas" || vistas < n) return;
    const id = setTimeout(() => setFase("resumen"), quieto() ? 300 : 1300);
    return () => clearTimeout(id);
  }, [fase, vistas, n]);

  // Capa propia sobre todo (como los avisos): dentro del marco la posición fija no cubría la pantalla.
  return createPortal(
    <RaizDS className="a-capa t-tienda t-ap-raiz">
    <div className={`t-ap t-fase-${fase} t-luz-${mejor}`} role="dialog" aria-modal="true" aria-label={`Abriendo ${sobre.nombre}`}
      style={{ ["--c" as string]: sobre.color }}>
      <div className="t-ap-rayos" aria-hidden="true" />
      {(fase === "luz" || (fase === "cartas" && mejor === "legendaria")) && <div className="t-ap-destello" aria-hidden="true" />}
      {mejor === "legendaria" && (fase === "luz" || fase === "cartas") && <Confeti />}

      {(fase === "sacudir" || fase === "rasgar" || fase === "luz") && (
        <div className="t-ap-centro">
          <div className={`t-ap-sobre g-${golpes}` + (corte ? " t-rasgado" : "")} key={golpes}
            onClick={fase === "sacudir" ? sacudir : fase === "rasgar" ? rasgar : undefined}
            onPointerDown={e => { if (fase === "rasgar") arrastre.current = e.clientX; }}
            onPointerMove={e => { if (fase === "rasgar" && arrastre.current != null && Math.abs(e.clientX - arrastre.current) > 60) { arrastre.current = null; rasgar(); } }}>
            <img className="t-ap-cuerpo" src={srcArte("tienda/" + sobre.arte)} alt="" draggable={false} />
            <img className="t-ap-tira" src={srcArte("tienda/" + sobre.arte)} alt="" draggable={false} />
            {fase === "rasgar" && <div className="t-ap-guia" aria-hidden="true"><span>✂</span></div>}
          </div>
          <p className="t-ap-texto t-sfx">
            {fase === "sacudir" ? `¡Toca para sacudir! ${golpes}/${GOLPES}` : fase === "rasgar" ? "¡Desliza para abrir!" : NOMBRE_RAREZA[mejor] === "Rara" ? "…" : `¡${NOMBRE_RAREZA[mejor]}!`}
          </p>
        </div>
      )}

      {fase === "cartas" && (
        <div className="t-ap-mesa">
          <div className="t-ap-cartas" style={{ ["--n" as string]: n }}>
            {apertura.cartas.map((c, k) => (
              <button key={k} type="button" className={"t-carta-3d" + (k < vistas ? " t-volteada" : "") + (k === vistas ? " t-siguiente" : "")}
                style={{ ["--k" as string]: k }} onClick={() => voltear(k)} aria-label={k < vistas ? nombreCarta(c) : "Carta boca abajo"}>
                <span className="t-cara t-reverso"><span className="t-sfx">ALV</span></span>
                <span className="t-cara t-frente"><CartaFrente c={c} /></span>
              </button>
            ))}
          </div>
          <p className="t-ap-texto t-sfx">{vistas < n ? "Toca la carta" : "¡Listo!"}</p>
          {vistas < n && <button type="button" className="t-ap-todas" onClick={abrirTodas}>Abrir todas</button>}
        </div>
      )}

      {fase === "resumen" && <Resumen apertura={apertura} sobre={sobre} monedas={t.monedas} alOtro={alOtro} alColeccion={alColeccion} />}
    </div>
    </RaizDS>,
    document.body,
  );
}

const nombreCarta = (c: Carta) => (c.tipo === "pieza" ? infoPieza(c.id).nombre : c.tipo === "comodin" ? comodinPorId(c.id)?.nombre ?? c.id : `${c.cantidad} monedas`);

function CartaFrente({ c }: { c: Carta }) {
  if (c.tipo === "pieza") {
    const info = infoPieza(c.id);
    return (
      <span className={"t-carta r-" + c.rareza}>
        <span className="t-carta-banda">{NOMBRE_RAREZA[c.rareza]}</span>
        <span className="t-carta-arte">{info.mini ? <img src={miniatura(info.mini)} alt="" /> : <Momento />}</span>
        <span className="t-carta-nombre">{info.nombre}</span>
        <span className="t-nuevo t-sfx">¡Nuevo!</span>
      </span>
    );
  }
  if (c.tipo === "comodin") {
    const x = comodinPorId(c.id);
    return (
      <span className={"t-carta t-carta-comodin" + (c.especial ? " t-especial" : "")}>
        <span className="t-carta-banda">{c.especial ? "Comodín especial" : "Comodín"}</span>
        <span className="t-carta-arte"><span className="t-mini-ico">{x?.icono ?? "🃏"}</span></span>
        <span className="t-carta-nombre">{x?.nombre ?? c.id}</span>
      </span>
    );
  }
  return (
    <span className="t-carta t-carta-monedas">
      <span className="t-carta-banda">Ya tienes 9</span>
      <span className="t-carta-arte"><span className="t-moneda t-moneda-xl" /></span>
      <span className="t-carta-nombre">+{c.cantidad} monedas</span>
    </span>
  );
}

function Resumen({ apertura, sobre, monedas, alOtro, alColeccion }: { apertura: Resultado; sobre: Sobre; monedas: number; alOtro: () => void; alColeccion: () => void }) {
  const piezas = apertura.cartas.filter((c): c is Extract<Carta, { tipo: "pieza" }> => c.tipo === "pieza");
  const [elegida, setElegida] = useState<string | null>(piezas[piezas.length - 1]?.id ?? null);
  const [puestas, setPuestas] = useState<Set<string>>(new Set());
  const caps = useCapsulas(sesionAhora().uid || "nadie");
  const actual = figuraActiva(caps);
  const vista = useMemo(() => (elegida && !puestas.has(elegida) ? ponerPieza(actual, elegida) ?? actual : actual), [actual, elegida, puestas]);

  const poner = () => {
    if (!elegida) return;
    const k = ponermelo(elegida);
    if (!k) { aviso("No se pudo poner esa pieza."); return; }
    sonar("encaje"); vibrar(30);
    setPuestas(s => new Set([...s, elegida]));
    aviso(`¡Listo! Ya la traes puesta (espacio ${k}).`);
  };

  return (
    <div className="t-ap-resumen">
      {piezas.length > 0 && (
        <div className="t-ap-figura">
          <FiguraViva figura={vista} className="t-ap-viva" />
          <div className="t-ap-pedestal" aria-hidden="true" />
        </div>
      )}
      <div className="t-ap-lado">
        <h2 className="t-sfx">¡Lo que te salió!</h2>
        <div className="t-ap-lista">
          {apertura.cartas.map((c, k) => (
            <button key={k} type="button" disabled={c.tipo !== "pieza"}
              className={"t-ap-item" + (c.tipo === "pieza" && c.id === elegida ? " t-on" : "")}
              onClick={() => { if (c.tipo === "pieza") { sonar("tic"); setElegida(c.id); } }}>
              <CartaFrente c={c} />
              {c.tipo === "pieza" && puestas.has(c.id) && <span className="t-puesta">Puesta</span>}
            </button>
          ))}
        </div>
        <div className="t-ap-botones">
          {elegida && <button type="button" className="t-comprar t-chico" disabled={puestas.has(elegida)} onClick={poner}>{puestas.has(elegida) ? "¡Ya la traes!" : "Ponérmelo"}</button>}
          <button type="button" className="t-boton-azul" onClick={alOtro}>{monedas >= sobre.precio ? "Abrir otro" : "Volver a la tienda"}</button>
          <button type="button" className="t-boton-azul" onClick={alColeccion}>Ver colección</button>
        </div>
      </div>
    </div>
  );
}

function Confeti() {
  const piezas = useMemo(() => Array.from({ length: 36 }, (_, i) => ({ i, x: Math.random() * 100, d: Math.random() * 0.8, r: Math.random() * 360, c: ["#ffd23f", "#ffb21f", "#fff4c2", "#ff3fb4", "#3fb6ff"][i % 5] })), []);
  return (
    <div className="t-ap-confeti" aria-hidden="true">
      {piezas.map(p => <i key={p.i} style={{ left: `${p.x}%`, animationDelay: `${p.d}s`, background: p.c, transform: `rotate(${p.r}deg)` }} />)}
    </div>
  );
}
