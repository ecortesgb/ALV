// Modo Local: el anfitrión agrega personajes sin cuenta (nombre, género para el color y figura) o les cambia la figura.
// La figura sale de los personajes ya armados (trajes-figura.json) o al azar. Nada se guarda en la nube.
// Estilo del lobby (Elías, 24 nov): vidrio oscuro, la cabina del color de fondo y la figura completa (sin el círculo viejo).
import { useEffect, useState, type CSSProperties } from "react";
import type { FiguraV2 } from "../../content/personaje";
import { PALETA_SALA, varsColor, type ColorJugador } from "../../app/colorJugador";
import { semillaDe, useFoto } from "../../app/figura3d";
import { cabinaDe } from "./Ficha";

interface Traje { id: string; nombre: string; mini: string; figura: FiguraV2 }
let cargados: Traje[] | null = null;
function useTrajes(): Traje[] | null {
  const [t, setT] = useState(cargados);
  useEffect(() => {
    if (t) return;
    let vivo = true;
    void import("../../content/trajes-figura.json").then(m => { cargados = m.default.trajes as unknown as Traje[]; if (vivo) setT(cargados); });
    return () => { vivo = false; };
  }, [t]);
  return t;
}
const BASE = import.meta.env.BASE_URL;
type Genero = "mujer" | "hombre" | "otro";
const GENEROS: { id: Genero; texto: string }[] = [{ id: "mujer", texto: "Mujer" }, { id: "hombre", texto: "Hombre" }, { id: "otro", texto: "Prefiero no decirlo" }];
/** Color de la vista previa: el primero del grupo de cada género (el real lo asigna el lobby al entrar). */
const COLOR_VISTA: Record<Genero, keyof typeof PALETA_SALA> = { mujer: "rosa", hombre: "azul", otro: "amarillo" };
const colorVista = (g: Genero): ColorJugador => ({ ...PALETA_SALA[COLOR_VISTA[g]], n: 0, etiqueta: "" });

export interface DatosPersonaje { nombre: string; genero: Genero; figura: FiguraV2 | null }

/** `soloFigura`: cambiar la figura de alguien que ya está (sin nombre ni género). `color`: el suyo, si ya tiene. */
/** `rapido` (055): personaje rápido con cuenta; pide confirmar mayoría de edad y avisa que se crea su acceso. */
export function PersonajeLocal({ titulo, inicial, soloFigura, color, alListo, alCerrar, rapido, ocupado, error }: {
  titulo: string; inicial?: Partial<DatosPersonaje>; soloFigura?: boolean; color?: ColorJugador | null; alListo: (d: DatosPersonaje) => void; alCerrar: () => void;
  rapido?: boolean; ocupado?: boolean; error?: string | null;
}) {
  const [mayor, setMayor] = useState(false);
  const trajes = useTrajes();
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [genero, setGenero] = useState<Genero>(inicial?.genero ?? "otro");
  const [figura, setFigura] = useState<FiguraV2 | null>(inicial?.figura ?? null);
  const [elegido, setElegido] = useState<string | null>(null);
  const limpio = nombre.replace(/\s+/g, " ").trim();
  const valido = (soloFigura || (limpio.length >= 2 && limpio.length <= 20)) && (!rapido || mayor) && !ocupado;
  const azar = () => { if (!trajes?.length) return; const t = trajes[Math.floor(Math.random() * trajes.length)]!; setFigura(t.figura); setElegido(t.id); };
  const c = color ?? colorVista(genero);
  const foto = useFoto(figura, figura ? undefined : semillaDe(elegido ?? (limpio || "nuevo")), "busto");
  // Escape cierra.
  useEffect(() => { const f = (e: KeyboardEvent) => { if (e.key === "Escape") alCerrar(); }; addEventListener("keydown", f); return () => removeEventListener("keydown", f); }, [alCerrar]);
  return (
    <div className="pl-velo" role="dialog" aria-modal="true" aria-label={titulo} onClick={alCerrar}>
      <div className="pl-modal" onClick={e => e.stopPropagation()} style={varsColor(c)}>
        <header className="pl-top"><h2 className="pl-tit"><span>{titulo}</span></h2><button type="button" className="pl-cerrar" onClick={alCerrar} aria-label="Cerrar">✕</button></header>
        <div className="pl-cuerpo">
          <div className="pl-vista">
            <span className="pl-cabina" style={{ "--fj-cab": cabinaDe(c) } as CSSProperties} aria-hidden="true">
              {foto ? <img key={foto} src={foto} alt="" draggable={false} /> : <span className="fj-cargando" />}
            </span>
            <b className="pl-nombre">{soloFigura ? inicial?.nombre ?? "" : limpio || "Nuevo jugador"}</b>
            <button type="button" className="pl-azar" onClick={azar} disabled={!trajes?.length}>🎲 Al azar</button>
          </div>
          <div className="pl-datos">
            {!soloFigura && <>
              <label className="pl-campo"><span>Nombre</span>
                <input value={nombre} onChange={e => setNombre(e.target.value.slice(0, 20))} maxLength={20} autoComplete="off" autoFocus placeholder="Cómo le dicen" />
              </label>
              <div className="pl-chips" role="group" aria-label="Género (para el color)">
                {GENEROS.map(g => <button key={g.id} type="button" className={"pl-chip" + (genero === g.id ? " si" : "")} aria-pressed={genero === g.id} onClick={() => setGenero(g.id)}>{g.texto}</button>)}
              </div>
            </>}
            {rapido && <>
              <p className="pl-nota">Se crea su acceso (Usuario y contraseña) para que después entre a ver lo que ganó.</p>
              <label className="pl-check"><input type="checkbox" checked={mayor} onChange={e => setMayor(e.target.checked)} /><span>Es mayor de 18 y juega con respeto: nadie está obligado a tomar ni a cumplir un reto.</span></label>
            </>}
            {error && <p className="pl-error" role="alert">{error}</p>}
            <span className="pl-sub">Elige su figura</span>
            <div className="pl-trajes" aria-label="Elige su figura">
              {trajes ? trajes.map(t => (
                <button key={t.id} type="button" className={"pl-traje" + (elegido === t.id ? " si" : "")} onClick={() => { setFigura(t.figura); setElegido(t.id); }} aria-pressed={elegido === t.id} title={t.nombre}>
                  <img src={`${BASE}arte/piezas/${t.mini}.webp`} alt={t.nombre} loading="lazy" draggable={false} />
                </button>
              )) : <p className="pl-espera">Cargando figuras…</p>}
            </div>
          </div>
        </div>
        <button type="button" className="pl-listo" disabled={!valido} onClick={() => alListo({ nombre: limpio, genero, figura })}>{ocupado ? "Creando…" : soloFigura ? "Usar esta figura" : rapido ? "Crear personaje" : "Agregar al lobby"}</button>
      </div>
    </div>
  );
}
