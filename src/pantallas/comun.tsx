// Piezas comunes de las pantallas de ALV 2.0: marco con ciudad, cabecera, avisos, confirmación y figuras.
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import type { FiguraV2 } from "../content/personaje";
import { Icono, RaizDS, type IconoId } from "../ds";
import { FondoALV } from "./Fondos";
import { BarraRecursos } from "./Recursos";
import { Escena3D, FotoFigura, apodoDe, semillaDe, type EnEscena, type Momento } from "../app/figura3d";
import { atras } from "../app/rutas";
import { varsColor, type ColorJugador } from "../app/colorJugador";

/** ¿Pantalla ancha (laptop o TV)? */
// Celular girado (horizontal, desde 600 px de ancho) usa el mismo diseño que la computadora.
const consultaAncho = (min: number) => `(min-width:${min}px), (orientation: landscape) and (min-width:600px)`;
export function useAncho(min = 900): boolean {
  const [a, setA] = useState(() => matchMedia(consultaAncho(min)).matches);
  useEffect(() => {
    const m = matchMedia(consultaAncho(min)), f = () => setA(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, [min]);
  return a;
}

/** Marco de toda pantalla: tokens del Design System, ciudad según la hora (o el fondo que se pase) y zona que se desliza. */
export function Marco({ children, clase = "", fijo, fondo }: { children: ReactNode; clase?: string; fijo?: ReactNode; fondo?: ReactNode }) {
  const ancho = useAncho();
  return (
    <RaizDS ancho={ancho} className={`alv ${clase}`.trim()}>
      {fondo ?? <FondoALV />}
      <div className="a-scroll">{children}</div>
      {fijo}
    </RaizDS>
  );
}

/** Cabecera con regreso y el nombre de la sección en su etiqueta amarilla. */
export function Cabecera({ titulo, icono, derecha, alVolver, recursos = true }: { titulo: string; icono?: IconoId; derecha?: ReactNode; alVolver?: () => void;
  /** Monedas y puntos a la derecha (Recursos.tsx), como en el HUB. */ recursos?: boolean }) {
  return (
    <header className={"a-cab" + (recursos ? " a-cab-rc" : "")}>
      <button type="button" className="a-atras" onClick={alVolver ?? atras} aria-label="Regresar"><Icono id="back" /></button>
      <h1 className="d-lbl a-titulo">{icono && <Icono id={icono} />}{titulo}</h1>
      {(derecha || recursos) && <div className="a-cab-der">{derecha}{recursos && <BarraRecursos compacta className="a-cab-recursos" />}</div>}
    </header>
  );
}

// ---------- Avisos (uno a la vez, abajo) y confirmación ----------
let avisoActual: { texto: string; n: number } | null = null, n = 0;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach(f => f());
/**
 * `url("…")` absoluta para una imagen de public/arte. Absoluta a propósito: el sitio publicado usa base «./» y una url
 * relativa dentro de una variable de CSS se resuelve desde la carpeta del CSS (assets/), donde no está la imagen.
 */
export const urlArte = (nombre: string) => `url("${new URL(`${import.meta.env.BASE_URL}arte/${nombre}`, document.baseURI).href}")`;

export function aviso(texto: string) {
  const mio = ++n;
  avisoActual = { texto, n: mio }; avisar();
  setTimeout(() => { if (avisoActual?.n === mio) { avisoActual = null; avisar(); } }, 3200);
}
export interface Pregunta { titulo: string; texto?: string; si: string; /** null: sin botón para cancelar (solo avisa). */ no?: string | null; peligro?: boolean;
  /** Lobby nuevo: caja de bloques del color de este jugador (Elías, 25 nov). */
  lobby?: ColorJugador | null }
let pregunta: (Pregunta & { responder: (v: boolean) => void }) | null = null;
export const confirmar = (p: Pregunta) => new Promise<boolean>(r => { pregunta = { ...p, responder: v => { pregunta = null; avisar(); r(v); } }; avisar(); });

export function Avisos() {
  const a = useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => avisoActual);
  const p = useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => pregunta);
  useEffect(() => {
    if (!p) return;
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") p.responder(false); };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, [p]);
  return (
    <RaizDS className="a-capa">
      {a && <div key={a.n} className="a-aviso" role="status">{a.texto}</div>}
      {p && (
        <div className="a-velo" onClick={() => p.responder(false)}>
          <div className={"d-pnl a-dialogo" + (p.lobby !== undefined ? " lbn-dlg" : "")} style={p.lobby !== undefined ? varsColor(p.lobby) : undefined} role="alertdialog" aria-modal="true" aria-label={p.titulo} onClick={e => e.stopPropagation()}>
            <span className="dsp ol a-t2">{p.titulo}</span>
            {p.texto && <p className="a-suave">{p.texto}</p>}
            <div className="a-fila">
              {p.no !== null && <button type="button" className="a-plano" onClick={() => p.responder(false)}>{p.no ?? "Cancelar"}</button>}
              <button type="button" className={"d-btn " + (p.peligro ? "k-red" : "k-yel")} autoFocus onClick={() => p.responder(true)}><span className="dsp">{p.si}</span></button>
            </div>
          </div>
        </div>
      )}
    </RaizDS>
  );
}

// ---------- Figuras ----------
/** Nombre del jugador con el apodo de su figura encima (si lo tiene). */
export function NombreJugador({ nombre, figura, clase = "dsp" }: { nombre: string; figura?: FiguraV2 | null; clase?: string }) {
  const apodo = apodoDe(figura);
  if (!apodo) return <span className={clase}>{nombre}</span>;
  return <span className="a-nom"><small className="a-apodo">{apodo}</small><span className={clase}>{nombre}</span></span>;
}

/** Retrato circular de un jugador: la misma foto de busto del medallón del HUB (sin figura, una fija al azar por su id). */
export function Retrato({ id, figura, nombre, size = 44 }: { id: string; figura?: FiguraV2 | null; nombre?: string; size?: number }) {
  return <FotoFigura figura={figura ?? undefined} semilla={figura ? undefined : semillaDe(id)} size={size} nombre={nombre} redondo encuadre="busto" />;
}
/** Escena 3D con varios jugadores de pie. */
export function Elenco({ gente, foco, momentos, alto, modo }: { gente: { id: string; figura?: FiguraV2 | null }[]; foco?: string; momentos?: { id: string; cual: Momento; n: number }[]; alto?: number | string; modo?: "hub" }) {
  const figuras: EnEscena[] = gente.map(g => ({ id: g.id, figura: g.figura ?? undefined, semilla: g.figura ? undefined : semillaDe(g.id), foco: g.id === foco }));
  return <Escena3D figuras={figuras} momentos={momentos} alto={alto} modo={modo} />;
}

/** Campo de texto con su etiqueta. */
export function Campo({ etiqueta, ...props }: { etiqueta: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className="a-campo"><span>{etiqueta}</span><input {...props} /></label>;
}

/** Estado vacío o de espera: un texto grande y uno chico, sin cajas grises. */
export function Vacio({ titulo, texto, children }: { titulo: string; texto?: string; children?: ReactNode }) {
  return <div className="a-vacio"><span className="dsp ol a-t2">{titulo}</span>{texto && <p className="a-suave">{texto}</p>}{children}</div>;
}
