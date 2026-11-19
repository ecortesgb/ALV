// Identificadores de jugador con estilo de videojuego (referencia de Elías, 2026-11-18):
// - TarjetaEsquina: círculo con anillo del color del jugador, la figura sale por arriba (hombros y cabeza)
//   y al lado una placa con apodo, nombre y datos (XP, monedas, puntos…). Para el HUB y los marcadores.
// - Burbuja: círculo con la cabeza completa centrada. La seleccionada crece y su anillo brilla.
// - AnilloBurbujas: burbujas acomodadas en círculo alrededor de un centro (elegir, votar, turnos).
// Las fotos salen del motor 3D con el encuadre «busto» (tools/minifig/escena.js, ZONAS.busto), fondo transparente.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Boton } from "../ds";
import type { FiguraV2 } from "../content/personaje";
import { apodoDe, semillaDe, useFoto } from "../app/figura3d";
import { varsColor, type ColorJugador } from "../app/colorJugador";
import "./identidad.css";

export interface DatoTarjeta { icono: ReactNode; valor: ReactNode; titulo?: string }

function Busto({ id, figura }: { id: string; figura?: FiguraV2 | null }) {
  const url = useFoto(figura ?? null, figura ? undefined : semillaDe(id), "busto");
  return url ? <img src={url} alt="" draggable={false} /> : <span className="ide-cargando" aria-hidden="true" />;
}

/** Tarjeta de esquina. `tamano` = diámetro del círculo en px (o en em si se pasa como texto, p. ej. "3.4em"). */
export function TarjetaEsquina({ id, figura, nombre, color, lado = "izq", tamano = 72, datos = [], barra, onClick, etiqueta, className = "", children }: {
  id: string; figura?: FiguraV2 | null; nombre: string; color?: ColorJugador | null; lado?: "izq" | "der"; tamano?: number | string;
  datos?: DatoTarjeta[];
  /** Barra de progreso bajo el nombre (p. ej. XP del nivel). */
  barra?: { valor: number; max: number; texto?: string };
  onClick?: () => void; etiqueta?: string; className?: string; children?: ReactNode;
}) {
  const apodo = apodoDe(figura);
  const pct = barra && barra.max > 0 ? Math.max(0, Math.min(1, barra.valor / barra.max)) : 0;
  const estilo = { ...varsColor(color ?? null), "--ide": typeof tamano === "number" ? `${tamano}px` : tamano } as CSSProperties;
  const cuerpo = (<>
    <span className="ide-circulo" aria-hidden="true">
      <span className="ide-disco" />
      <span className="ide-busto"><Busto id={id} figura={figura} /></span>
      <span className="ide-arco" />
      {color && <span className="ide-pn dsp">{color.etiqueta}</span>}
    </span>
    <span className="ide-placa">
      {apodo && <small className="ide-apodo">{apodo}</small>}
      <span className="ide-nombre dsp ol">{nombre}</span>
      {barra && <span className="ide-nivel">{barra.texto && <em className="dsp">{barra.texto}</em>}<span className="ide-barra" role="progressbar" aria-label={barra.texto ?? "Progreso"} aria-valuemin={0} aria-valuemax={barra.max} aria-valuenow={barra.valor}><i style={{ width: `${Math.round(pct * 100)}%` }} /></span></span>}
      {datos.length > 0 && <span className="ide-datos">{datos.map((d, i) => <span key={i} className="ide-dato" title={d.titulo}><span className="ide-ico" aria-hidden="true">{d.icono}</span><b className="dsp">{d.valor}</b>{d.titulo && <span className="ide-sr">{d.titulo}</span>}</span>)}</span>}
      {children}
    </span>
  </>);
  const clase = `ide-tarjeta${lado === "der" ? " der" : ""}${color ? "" : " sin-color"} ${className}`;
  return onClick
    ? <button type="button" className={clase} style={estilo} onClick={onClick} aria-label={etiqueta ?? `Perfil de ${nombre}`}>{cuerpo}</button>
    : <div className={clase} style={estilo}>{cuerpo}</div>;
}

export interface PersonaBurbuja { id: string; figura?: FiguraV2 | null; nombre: string; color?: ColorJugador | null;
  /** Algo chico encima (✓, número de votos…). */
  insignia?: ReactNode; apagada?: boolean;
  /** Texto corto bajo el nombre (p. ej. la palabra que dijo en El impostor). */
  nota?: string }

/** Burbuja con la cabeza completa. `tamano` en px o como texto («4em», «22%»). */
export function Burbuja({ p, tamano = 64, seleccionada, conNombre, onClick, desactivada, className = "", style }: {
  p: PersonaBurbuja; tamano?: number | string; seleccionada?: boolean; conNombre?: boolean; onClick?: () => void; desactivada?: boolean; className?: string; style?: CSSProperties;
}) {
  const estilo = { ...varsColor(p.color ?? null), "--b": typeof tamano === "number" ? `${tamano}px` : tamano, ...style } as CSSProperties;
  const clase = `ide-burbuja${seleccionada ? " sel" : ""}${p.apagada ? " apagada" : ""}${p.color ? "" : " sin-color"} ${className}`;
  const apodo = apodoDe(p.figura);
  const cuerpo = (<>
    <span className="ide-b-circ" aria-hidden="true"><span className="ide-b-img"><Busto id={p.id} figura={p.figura} /></span></span>
    {p.color && <span className="ide-b-pn dsp" aria-hidden="true">{p.color.etiqueta}</span>}
    {p.insignia != null && <span className="ide-b-ins dsp">{p.insignia}</span>}
    {conNombre && <span className="ide-b-nom">{apodo && <small>{apodo}</small>}<span className="dsp">{p.nombre}</span>{p.nota && <em>«{p.nota}»</em>}</span>}
  </>);
  return onClick
    ? <button type="button" className={clase} style={estilo} onClick={onClick} disabled={desactivada} aria-pressed={seleccionada} aria-label={p.nombre}>{cuerpo}</button>
    : <span className={clase} style={estilo} role="img" aria-label={p.nombre}>{cuerpo}</span>;
}

/** Fila de burbujas (marcadores, quién ya contestó). */
export function FilaBurbujas({ gente, tamano = 48, seleccionada, conNombre, className = "" }: { gente: PersonaBurbuja[]; tamano?: number | string; seleccionada?: string; conNombre?: boolean; className?: string }) {
  return <div className={"ide-fila " + className}>{gente.map(p => <Burbuja key={p.id} p={p} tamano={tamano} seleccionada={p.id === seleccionada} conNombre={conNombre} />)}</div>;
}

/** Burbujas en anillo alrededor de `centro`. El tamaño se adapta al ancho del contenedor (hasta `ancho` px). */
export function AnilloBurbujas({ gente, centro, seleccionada, alElegir, ancho = 420, conNombre = true, etiqueta, className = "" }: {
  gente: PersonaBurbuja[]; centro?: ReactNode; seleccionada?: string | null; alElegir?: (id: string) => void; ancho?: number; conNombre?: boolean; etiqueta?: string; className?: string;
}) {
  const n = Math.max(1, gente.length);
  // Burbuja en % del anillo: más chica con más gente, para que no se encimen.
  const b = n <= 3 ? 27 : n <= 5 ? 24 : n <= 6 ? 22 : 19;
  const r = 50 - b / 2 - (conNombre ? 6 : 2);
  return (
    <div className={"ide-anillo " + className} style={{ "--ancho": `${ancho}px` } as CSSProperties} role={alElegir ? "group" : undefined} aria-label={etiqueta}>
      <span className="ide-anillo-guia" aria-hidden="true" style={{ inset: `${50 - r}%` }} />
      {centro != null && <div className="ide-anillo-centro" style={{ inset: `${50 - r + b / 2 + 2}%` }}>{centro}</div>}
      {gente.map((p, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        return <Burbuja key={p.id} p={p} tamano={`${b}%`} seleccionada={p.id === seleccionada} conNombre={conNombre} className="ide-en-anillo"
          style={{ left: `${50 + Math.cos(a) * r}%`, top: `${50 + Math.sin(a) * r}%` }}
          onClick={alElegir ? () => alElegir(p.id) : undefined} desactivada={p.apagada} />;
      })}
    </div>
  );
}

/** Elegir a una persona en anillo: un toque la marca (crece y brilla) y el botón de abajo confirma.
 *  Así un toque por error no manda el voto. `clave` reinicia la selección (p. ej. al cambiar de ronda). */
export function ElegirEnAnillo({ gente, titulo, confirmar = "Elegir", alElegir, clave, ancho = 400 }: {
  gente: PersonaBurbuja[]; titulo: ReactNode; confirmar?: string; alElegir: (id: string) => void; clave?: string; ancho?: number;
}) {
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => setSel(null), [clave]);
  const elegida = gente.find(p => p.id === sel);
  return (
    <div className="ide-elegir">
      <AnilloBurbujas gente={gente} seleccionada={sel} alElegir={setSel} ancho={ancho} etiqueta={typeof titulo === "string" ? titulo : undefined}
        centro={<span className="ide-centro-txt">{elegida ? <><small>Elegiste a</small><b className="dsp ol">{elegida.nombre}</b></> : titulo}</span>} />
      <Boton color="amarillo" texto={elegida ? `${confirmar}: ${elegida.nombre}` : "Toca a alguien"} icono="play" desactivado={!elegida} onClick={() => { if (elegida) alElegir(elegida.id); }} />
    </div>
  );
}
