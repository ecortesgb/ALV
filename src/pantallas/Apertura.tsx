// Apertura de un sobre: rasgar, luz por rareza y revelar las cartas del mazo una por una.
// El resultado ya viene decidido (servidor o, en la demostración, la tirada local): la animación solo lo muestra.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { FiguraViva, figuraActiva, useCapsulas } from "../app/figura3d";
import { ponerPieza } from "../app/equiparPieza";
import { sesionAhora } from "../app/sesion";
import { movimientoReducido, vibrar } from "../app/preferencias";
import { sonar } from "../app/sonido";
import { RaizDS } from "../ds";
import { NOMBRE_RAREZA } from "../content/rarezas";
import { comodinPorId, DORSO_SOBRE, type SobreVisual } from "../content/tienda";
import type { Apertura as Resultado, Carta } from "../engine/sobresTienda";
import { ponermelo } from "../servicios/tienda";
import { aviso } from "./comun";
import { infoPieza } from "./Desbloqueo";
import { miniatura } from "./Libro";
import { ComodinIcono, Momento, srcArte } from "./Tienda";
import { arteHub } from "./azotea/Cabecera";
import { CartaPersonaje } from "./CartaPersonaje";
import type { Tarjeta } from "../personajes/integracion";

type Fase = "rasgar" | "extraer" | "cartas" | "resumen";
const quieto = movimientoReducido;
const REVERSO = `${import.meta.env.BASE_URL}arte/tienda/carta-reverso-alv.webp`;
export function Apertura({ sobre, apertura, fondo, deEspaldas = false, personajes, alOtro, alColeccion }: { sobre: SobreVisual; apertura: Resultado; fondo: string; deEspaldas?: boolean; personajes: ReadonlyMap<string, Tarjeta>; alOtro: () => void; alColeccion: () => void }) {
  const [fase, setFase] = useState<Fase>("rasgar");
  const [revelada, setRevelada] = useState(false);
  const [sobreDeEspaldas, setSobreDeEspaldas] = useState(deEspaldas);
  const [vistas, setVistas] = useState(0);
  const [corte, setCorte] = useState(0);
  const arrastre = useRef<number | null>(null);
  const toqueCarta = useRef<number | null>(null);
  const deslizoCarta = useRef(false);
  const dialogo = useRef<HTMLDivElement>(null);
  const n = apertura.cartas.length, mejor = apertura.mejor;
  useEffect(() => { dialogo.current?.focus(); }, [fase]);

  // El sello se separa primero. El mazo sale por detrás del cuerpo del sobre.
  useEffect(() => {
    if (fase !== "extraer") return;
    const reduce = quieto();
    const id = setTimeout(() => {
      setRevelada(!sobreDeEspaldas);
      setFase(n ? "cartas" : "resumen");
    }, reduce ? 0 : 1000);
    const luz = reduce ? undefined : setTimeout(() => { sonar(mejor); vibrar(40); }, 240);
    return () => { clearTimeout(id); clearTimeout(luz); };
  }, [fase, mejor, n, sobreDeEspaldas]);

  const rasgar = () => { if (fase !== "rasgar" || corte) return; setCorte(1); sonar("rasgar"); vibrar([30, 30, 60]); };
  useEffect(() => {
    if (fase !== "rasgar" || !corte) return;
    const id = setTimeout(() => setFase("extraer"), quieto() ? 0 : 280);
    return () => clearTimeout(id);
  }, [fase, corte]);
  const carta = apertura.cartas[vistas];
  const personaje = carta?.tipo === "personaje" ? personajes.get(carta.id) : undefined;
  const siguiente = () => {
    if (!revelada) { sonar("voltear"); setRevelada(true); return; }
    if (vistas + 1 >= n) setFase("resumen");
    else { setVistas(vistas + 1); setRevelada(!sobreDeEspaldas); }
  };
  const frenteSobre = srcArte("tienda/" + sobre.arte);

  // Capa propia sobre todo (como los avisos): dentro del marco la posición fija no cubría la pantalla.
  return createPortal(
    <RaizDS className="az a-capa t-tienda t-ap-raiz">
    <div ref={dialogo} tabIndex={-1} className={`t-ap t-fase-${fase} t-luz-${mejor}`} role="dialog" aria-modal="true" aria-label={`Abriendo ${sobre.nombre}`}
      style={{ "--c": sobre.color, "--t-fondo": fondo } as CSSProperties}>
      <div className="t-ap-rayos" aria-hidden="true" />
      {mejor === "legendaria" && fase === "extraer" && <Confeti />}

      {(fase === "rasgar" || fase === "extraer") && (
        <div className="t-ap-centro">
          <div className="t-ap-escenario" data-cortado={!!corte}>
          {fase === "extraer" && n > 0 && <div className="t-ap-salida" aria-hidden="true">
            {sobreDeEspaldas || !carta ? <img src={REVERSO} alt="" /> : <CartaFrente c={carta} personaje={personaje} />}
          </div>}
          <button type="button" className={"t-ap-sobre" + (corte ? " t-rasgado" : "")}
            disabled={!!corte}
            aria-label={sobreDeEspaldas ? "Girar sobre al frente" : "Girar sobre al reverso"}
            onClick={() => { if (arrastre.current === null && !corte) { sonar("tic"); setSobreDeEspaldas(v => !v); } }}
            onPointerDown={e => { arrastre.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={e => {
              if (arrastre.current === null) return;
              const distancia = e.clientX - arrastre.current;
              if (!quieto()) e.currentTarget.style.setProperty("--t-inclinacion", `${distancia / 15}deg`);
              if (Math.abs(distancia) > 60) { arrastre.current = null; rasgar(); }
            }}
            onLostPointerCapture={e => { arrastre.current = null; e.currentTarget.style.removeProperty("--t-inclinacion"); }}>
            <span className={"t-sobre-caras" + (sobreDeEspaldas ? " de-espaldas" : "")}>
              {[frenteSobre, srcArte("tienda/" + DORSO_SOBRE)].map((arte, i) => (
                <span className={"t-sobre-cara" + (i ? " t-sobre-dorso" : "")} key={arte}>
                  <img className="t-ap-cuerpo" src={arte} alt="" draggable={false} />
                  <img className="t-ap-tira" src={arte} alt="" draggable={false} />
                </span>
              ))}
            </span>
          </button>
          {!corte && <button type="button" className="t-ap-guia" aria-label="Rasgar sello" onClick={rasgar}
            onPointerDown={e => { arrastre.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={e => { if (arrastre.current !== null && Math.abs(e.clientX - arrastre.current) > 60) rasgar(); }}
            onLostPointerCapture={() => { arrastre.current = null; }} />}
          </div>
          <p className="t-ap-texto t-sfx">
            {!corte ? "Toca para girar · Desliza para rasgar" : "¡Sobre abierto!"}
          </p>
          <button type="button" className="t-ap-todas t-ap-saltar" onClick={() => setFase("resumen")}>Ver resultado</button>
        </div>
      )}

      {fase === "cartas" && carta && (
        <div className="t-ap-mesa">
          <p className="t-ap-progreso" aria-live="polite">Carta {vistas + 1} de {n}{revelada ? " · " + nombreCarta(carta, personaje) : ""}</p>
          <button type="button" className="t-mazo" data-restantes={Math.min(3, n - vistas - 1)}
            aria-label={!revelada ? "Revelar carta" : vistas + 1 === n ? "Ver resultado" : "Siguiente carta"}
            onPointerDown={e => { toqueCarta.current = e.clientX; deslizoCarta.current = false; e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerCancel={() => { toqueCarta.current = null; }}
            onPointerUp={e => {
              if (toqueCarta.current !== null && Math.abs(e.clientX - toqueCarta.current) >= 40) {
                deslizoCarta.current = true;
                siguiente();
              }
              toqueCarta.current = null;
            }}
            onClick={e => { if (e.detail === 0 || !deslizoCarta.current) siguiente(); deslizoCarta.current = false; }}>
            <span key={vistas} className={"t-mazo-carta" + (revelada ? " t-volteada" : "")}>
              <span className="t-cara t-reverso" aria-hidden="true"><img src={REVERSO} alt="" /></span>
              <span className="t-cara t-frente" aria-hidden={!revelada} data-revelado={revelada ? destelloDe(carta, personaje) : undefined}><CartaFrente c={carta} personaje={personaje} /></span>
            </span>
          </button>
          <p className="t-ap-instruccion">{revelada ? "Desliza para " + (vistas + 1 === n ? "ver el resumen" : "pasar de carta") : "Toca la carta para voltearla"}</p>
        </div>
      )}

      {fase === "resumen" && <Resumen apertura={apertura} personajes={personajes} alOtro={alOtro} alColeccion={alColeccion} />}
    </div>
    </RaizDS>,
    document.body,
  );
}

const nombreCarta = (c: Carta, t?: Tarjeta) => c.tipo === "personaje" ? t?.nombre ?? c.id
  : c.tipo === "pieza" ? infoPieza(c.id).nombre : c.tipo === "comodin" ? comodinPorId(c.id)?.nombre ?? c.id : `${c.cantidad} monedas`;
const destelloDe = (c: Carta, t?: Tarjeta) => (c.tipo === "pieza" || c.tipo === "personaje") && (c.rareza === "epica" || c.rareza === "legendaria")
  ? c.rareza : (c.tipo === "comodin" && c.especial) || t?.tamano === "grande" ? "epica" : undefined;

export function CartaFrente({ c, personaje }: { c: Carta; personaje?: Tarjeta }) {
  if (c.tipo === "personaje") return personaje ? <CartaPersonaje tarjeta={personaje} nivel={c.rareza} conseguida />
    : <span className={"t-carta r-" + c.rareza}><span className="t-carta-nombre">{nombreCarta(c)}</span></span>;
  if (c.tipo === "pieza") {
    const info = infoPieza(c.id);
    return (
      <span className={"t-carta r-" + c.rareza}>
        <span className="t-carta-banda">{NOMBRE_RAREZA[c.rareza]}</span>
        <span className="t-carta-arte">{info.mini ? <img src={miniatura(info.mini)} alt="" /> : <Momento />}</span>
        <span className="t-carta-nombre">{info.nombre}</span>
        <span className="t-carta-efecto">Pieza para personalizar tu figura.</span>
        <span className="t-nuevo t-sfx">¡Nuevo!</span>
      </span>
    );
  }
  if (c.tipo === "comodin") {
    const x = comodinPorId(c.id);
    if (x?.arte) return (
      <span className="t-carta t-carta-comodin ilustrada" data-comodin={c.id}>
        <span className="t-comodin-cab">
          <span className="t-comodin-sello">{x.trampa ? "Trampa" : c.especial ? "Especial" : "Comodín"}</span>
          <span className="t-carta-nombre">{x.nombre}</span>
          <span className="t-comodin-glifo"><ComodinIcono id={c.id} alterno={x.icono} /></span>
        </span>
        <span className="t-carta-arte"><img src={srcArte("tienda/" + x.arte)} alt="" loading="lazy" draggable={false} /></span>
        <span className="t-carta-efecto">{x.efecto}</span>
      </span>
    );
    return (
      <span className={"t-carta t-carta-comodin" + (c.especial ? " t-especial" : "")}>
        <span className="t-carta-banda">{c.especial ? "Comodín especial" : "Comodín"}</span>
        <span className="t-carta-arte"><ComodinIcono id={c.id} alterno={x?.icono ?? "🃏"} /></span>
        <span className="t-carta-nombre">{x?.nombre ?? c.id}</span>
        <span className="t-carta-efecto">{x?.efecto}</span>
      </span>
    );
  }
  return (
    <span className="t-carta t-carta-monedas">
      <span className="t-carta-banda">Ya tienes 9</span>
      <span className="t-carta-arte"><img className="t-moneda t-moneda-xl" src={arteHub("moneda")} alt="" /></span>
      <span className="t-carta-nombre">+{c.cantidad} monedas</span>
      <span className="t-carta-efecto">Se agregaron a tu saldo.</span>
    </span>
  );
}

function Resumen({ apertura, personajes, alOtro, alColeccion }: { apertura: Resultado; personajes: ReadonlyMap<string, Tarjeta>; alOtro: () => void; alColeccion: () => void }) {
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
    <div className={"t-ap-resumen" + (piezas.length ? "" : " sin-figura")}>
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
              <CartaFrente c={c} personaje={c.tipo === "personaje" ? personajes.get(c.id) : undefined} />
              {c.tipo === "pieza" && puestas.has(c.id) && <span className="t-puesta">Puesta</span>}
            </button>
          ))}
        </div>
        <div className="t-ap-botones">
          {elegida && <button type="button" className="t-comprar t-chico" disabled={puestas.has(elegida)} onClick={poner}>{puestas.has(elegida) ? "¡Ya la traes!" : "Ponérmelo"}</button>}
          <button type="button" className="t-boton-azul" onClick={alOtro}>Guardar y volver</button>
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
