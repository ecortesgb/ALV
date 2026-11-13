// Tarjetas al estilo de los menús de juegos deportivos en línea (referencia del usuario), con arte y personajes propios de ALV:
// tarjeta de jugador, tarjeta de artículo con marco por rareza, paquete de sobre y la animación de apertura.
// Todo es presentación: la compra, el azar y lo que trae cada sobre siguen en estado.ts y engine/sobres.ts.
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { nivelPorXp, tituloPorNivel, xpParaNivel } from "../engine/economia";
import { RAREZAS, type CartaSobre, type DefinicionSobre, type Rareza, type TipoSobre } from "../engine/sobres";
import { Avatar, tipoCartaPorNivel } from "./Avatar";
import { Confeti } from "./efectos";
import { acciones, saldosDe, type JugadorLocal } from "./estado";
import { EQUIPOS, GRUPOS_EQUIPO, equipoDe } from "../content/equipos";
import { sonar } from "./sonido";


export function TarjetaJugador({ j }: { j: JugadorLocal }) {
  const s = saldosDe(j);
  const nivel = nivelPorXp(s.acumulada);
  const desde = xpParaNivel(nivel), hasta = xpParaNivel(nivel + 1);
  const avance = Math.round(((s.acumulada - desde) / (hasta - desde)) * 100);
  const eq = equipoDe(j.equipo);
  return (
    <div className="ficha-jugador">
      <div className={"tarjeta-jugador " + tipoCartaPorNivel(nivel) + (eq ? " con-equipo" : "")} aria-label={`Tarjeta de ${j.nombre}, nivel ${nivel}`}
        style={eq ? { ["--eq1" as string]: eq.c1, ["--eq2" as string]: eq.c2 } : undefined}>
        {eq && <span className="tj-equipo" title={eq.nombre}>{eq.icono}</span>}
        <span className="tj-nivel"><small>NIVEL</small><b>{nivel}</b></span>
        <span className="tj-arte"><Avatar p={j.personaje} size={150} nombre={j.nombre} /></span>
        <span className="tj-pie"><b>{j.nombre}</b><small>{tituloPorNivel(nivel)}</small></span>
      </div>
      <div className="tj-datos">
        <span className="label">Tu tarjeta</span>
        <h2 className="tj-nombre">{j.nombre}</h2>
        <span className="tj-titulo">{tituloPorNivel(nivel)}{eq ? ` · ${eq.icono} ${eq.nombre}` : ""}</span>
        <div className="tj-escalones" aria-label={`Nivel ${nivel}, ${avance}% hacia el nivel ${nivel + 1}`}>
          <span className="escalon-n">{nivel}</span>
          <span className="barra"><span style={{ width: `${avance}%` }} /></span>
          <span className="escalon-n siguiente">{nivel + 1}</span>
        </div>
        <div className="tj-stats">
          <span><b>{s.acumulada}</b><small>XP total</small></span>
          <span><b style={{ color: "var(--lime)" }}>{s.disponible}</b><small>Disponible</small></span>
          <span><b style={{ color: "var(--cyan)" }}>{s.delEvento}</b><small>Del evento</small></span>
          <span><b style={{ color: "var(--gold)" }}>{j.tiene.length}</b><small>Accesorios</small></span>
        </div>
      </div>
    </div>
  );
}

/** Tarjeta de artículo de la tienda o de comodín. El marco cambia con la rareza. */
export function TarjetaArticulo({ rareza, arte, nombre, detalle, etiqueta, puesto, children }:
  { rareza: Rareza | "poder"; arte?: ReactNode; nombre: string; detalle?: string; etiqueta?: string; puesto?: boolean; children?: ReactNode }) {
  return (
    <div className={"tarjeta-articulo r-" + rareza + (puesto ? " puesto" : "")}>
      <span className="ta-cinta">{etiqueta ?? (rareza === "poder" ? "Comodín" : RAREZAS[rareza])}</span>
      <span className="ta-arte" aria-hidden="true">{arte}</span>
      <b className="ta-nombre">{nombre}</b>
      {detalle && <small className="ta-detalle">{detalle}</small>}
      {children && <span className="ta-accion">{children}</span>}
    </div>
  );
}

/** Paquete de sobre dibujado con CSS: metal por tipo y la sigla ALV. */
export function PaqueteSobre({ tipo, grande = false }: { tipo: TipoSobre; grande?: boolean }) {
  return (
    <span className={"paquete " + tipo + (grande ? " grande" : "")} aria-hidden="true">
      <span className="paquete-brillo" />
      <span className="paquete-sigla">ALV</span>
      <span className="paquete-borde">ALV · ALV · ALV · ALV · ALV</span>
    </span>
  );
}

type Fase = "sobre" | "rasgando" | "carta" | "resumen";

/**
 * Apertura del sobre a pantalla completa: el sobre tiembla, se toca para rasgarlo y las cartas salen una por una
 * volteándose. Épicas y legendarias traen rayos de luz; una legendaria, además, confeti.
 * Se puede saltar al resumen en cualquier momento. Con «reducir movimiento» las animaciones se apagan solas.
 */
export function AperturaSobre({ def, cartas, nombreDe, arteDe, cerrar }:
  { def: DefinicionSobre; cartas: CartaSobre[]; nombreDe: (id: string) => string; arteDe: (id: string) => ReactNode; cerrar: () => void }) {
  const [fase, setFase] = useState<Fase>("sobre");
  const [paso, setPaso] = useState(0);
  const [volteada, setVolteada] = useState(false);
  const mejor = cartas.some(c => c.rareza === "legendaria") ? "legendaria" : cartas.some(c => c.rareza === "epica") ? "epica" : "normal";

  useEffect(() => {
    if (fase !== "rasgando") return;
    const t = setTimeout(() => { setFase("carta"); setVolteada(false); }, 750);
    return () => clearTimeout(t);
  }, [fase]);
  // La carta sale boca abajo y se voltea sola un instante después.
  useEffect(() => {
    if (fase !== "carta") return;
    const t = setTimeout(() => {
      setVolteada(true);
      const r = cartas[paso]?.rareza;
      sonar(r === "legendaria" || r === "epica" ? "exito" : "revelar");
    }, 450);
    return () => clearTimeout(t);
  }, [fase, paso, cartas]);
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, [cerrar]);

  const rasgar = () => { sonar("poder"); setFase("rasgando"); };
  const siguiente = () => {
    if (paso + 1 < cartas.length) { setPaso(paso + 1); setVolteada(false); sonar("carta"); }
    else setFase("resumen");
  };
  const c = cartas[paso];

  // Portal a <body>: .app crea su propio apilamiento y la barra de navegación quedaría encima.
  return createPortal(
    <div className={"apertura destino-" + mejor} role="dialog" aria-modal="true" aria-label={`Abriendo ${def.nombre}`}>
      <div className="apertura-rayos" aria-hidden="true" />
      {fase === "sobre" && (
        <div className="apertura-centro">
          <span className="label">{def.nombre} · {cartas.length} cartas</span>
          <button className="paquete-boton" onClick={rasgar} aria-label="Abrir el sobre"><PaqueteSobre tipo={def.id} grande /></button>
          <p className="hint">Toca el sobre para abrirlo</p>
        </div>
      )}
      {fase === "rasgando" && (
        <div className="apertura-centro">
          <span className="rasgado"><PaqueteSobre tipo={def.id} grande /></span>
        </div>
      )}
      {fase === "carta" && c && (
        <div className="apertura-centro">
          <span className="label">Carta {paso + 1} de {cartas.length}</span>
          <div key={paso} className={"carta-sobre" + (volteada ? " volteada" : "") + " r-" + c.rareza}>
            <span className="cs-reverso"><PaqueteSobre tipo={def.id} /></span>
            <span className="cs-frente">
              <TarjetaArticulo rareza={c.rareza} arte={arteDe(c.id)} nombre={nombreDe(c.id)} detalle="Nueva en tu colección" />
            </span>
          </div>
          {volteada && c.rareza === "legendaria" && <Confeti duracion={2200} />}
          <div className="fila" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={() => setFase("resumen")}>Saltar</button>
            <button className="btn principal" onClick={siguiente} disabled={!volteada}>{paso + 1 < cartas.length ? "Siguiente" : "Ver todo"}</button>
          </div>
        </div>
      )}
      {fase === "resumen" && (
        <div className="apertura-centro">
          <span className="label">{def.nombre}</span>
          <h2 className="titulo" style={{ textAlign: "center" }}>¡Ya son tuyas!</h2>
          <div className="apertura-resumen">
            {cartas.map((x, i) => (
              <span key={x.id} style={{ ["--i" as string]: i }}>
                <TarjetaArticulo rareza={x.rareza} arte={arteDe(x.id)} nombre={nombreDe(x.id)} />
              </span>
            ))}
          </div>
          <p className="hint" style={{ textAlign: "center" }}>Póntelas desde la pestaña Accesorios.</p>
          <button className="btn principal" onClick={cerrar}>Listo</button>
        </div>
      )}
    </div>,
    document.body,
  );
}

/** Equipo o casa del jugador: le da color a su carta y frases propias cuando gana XP. Se cambia cuando quiera. */
export function SelectorEquipo({ j }: { j: JugadorLocal }) {
  const [grupo, setGrupo] = useState<string>(equipoDe(j.equipo)?.grupo ?? GRUPOS_EQUIPO[0]);
  return (
    <section className="card" aria-labelledby="t-equipo">
      <div className="entre"><h2 id="t-equipo">Tu equipo o casa</h2>{j.equipo && <button className="btn sm" onClick={() => acciones.equipo(j.id, undefined)}>Quitar</button>}</div>
      <p className="hint">Le da identidad a tu carta. Lo puedes cambiar cuando quieras.</p>
      <div className="pestanas-menu" role="tablist" aria-label="Grupos">
        {GRUPOS_EQUIPO.map(g => <button key={g} role="tab" aria-selected={grupo === g} onClick={() => setGrupo(g)}>{g}</button>)}
      </div>
      <div className="equipos">
        {EQUIPOS.filter(e => e.grupo === grupo).map(e => (
          <button key={e.id} className="equipo" aria-pressed={j.equipo === e.id} onClick={() => { acciones.equipo(j.id, e.id); sonar("exito"); }}
            style={{ ["--eq1" as string]: e.c1, ["--eq2" as string]: e.c2 }}>
            <span className="equipo-icono" aria-hidden="true">{e.icono}</span>
            <b>{e.nombre}</b>
          </button>
        ))}
      </div>
    </section>
  );
}
