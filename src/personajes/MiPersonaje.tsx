// Rediseño 2026-11-26 (pedido de Elías): la entrada es el mueble «Mi colección» con los 3 personajes parados en sus nichos;
// tocar un nicho vacío ofrece crear o elegir ahí; uno ocupado lo pone en juego y, si ya lo está, lo abre para editarlo.
// Fase 5 · «Mi personaje» en la app (Codex D5, encargo 2026-11-26-fase5-r1): con la bandera encendida reemplaza a
// Personalizar (HUB, Perfil, lobby). Elegir personaje (galería) · Crear mi personaje (constructor) · Mi colección (los 3
// espacios = las 3 cápsulas de siempre, con la figura nueva dentro por el puente). Este archivo NO toca las cápsulas: la app
// le pasa los espacios y las funciones para guardar y activar (src/pantallas/Personalizar.tsx), así la zona no depende del
// sistema viejo (candado separacion.test.ts).
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Boton, FondoCiudad, RaizDS } from "../ds";
import { Constructor } from "./Constructor";
import { figuraInicial } from "./constructorDatos";
import { destinoGuardado } from "./espacios";
import { tarjetas } from "./galeriaDatos";
import { resolverFigura, type CatalogoV3 } from "./integracion";
import { useMiniaturas } from "./useMiniaturas";
import type { FiguraV3 } from "./tipos";
import "./mi-personaje.css";

/** Un espacio de la colección: la figura nueva si la tiene; `antes` = hay una figura del sistema anterior (sin v3). */
export interface EspacioMP { figura: FiguraV3 | null; nombre: string; antes: boolean }
/** Cómo quedó un guardado: en la nube, solo en este aparato (se sube al volver la conexión) o no se pudo. */
export type ResultadoGuardar = "sincronizado" | "local" | "error";

export interface MiPersonajeProps {
  jugador: string;
  /** Catálogo y piezas (null mientras carga o si no hay fuente). */
  catalogo: CatalogoV3 | null;
  /** En qué va el catálogo: sin acceso (sin sesión, sin permiso o falló) se ofrece reintentar. */
  estadoCatalogo?: "cargando" | "listo" | "sin-acceso";
  onReintentar?: () => void;
  espacios: EspacioMP[];
  activa: number | null;
  onGuardar: (espacio: number, figura: FiguraV3, nombre: string) => Promise<ResultadoGuardar>;
  onActivar: (espacio: number) => void;
  onSalir: () => void;
}

const BASE = import.meta.env.BASE_URL;
// La escena y el estudio publicados (copias de tools/personajes en public/personajes): tools/ no entra al build, y en lo
// publicado esa ruta no existía (lo halló el ensayo del corte, 2026-11-26).
const ESCENA = `${BASE}personajes/escena.html?fondo=no`;
const ESTUDIO = `${BASE}personajes/estudio.html`;
/** Centro de cada nicho en el arte del mueble (arte/mi-coleccion/mueble.webp), en % del ancho. */
const NICHOS = ["18.3%", "50.1%", "82%"];
type Vista = { cual: "inicio" } | { cual: "crear"; figura: FiguraV3; trajes?: boolean };
const TEXTO: Record<ResultadoGuardar, (n: string) => string> = {
  sincronizado: n => `${n}: guardado`,
  local: n => `${n}: guardado en este aparato (se sube al conectarte)`,
  error: () => "No se pudo guardar. Intenta otra vez.",
};

export function MiPersonaje({ catalogo, estadoCatalogo = catalogo ? "listo" : "cargando", onReintentar, espacios, activa, onGuardar, onActivar, onSalir }: MiPersonajeProps) {
  const [ancho, setAncho] = useState(() => innerWidth >= 860);
  const [vista, setVista] = useState<Vista>({ cual: "inicio" });
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [elegido, setElegido] = useState<number | null>(null);
  useEffect(() => { const f = () => setAncho(innerWidth >= 860); addEventListener("resize", f); return () => removeEventListener("resize", f); }, []);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 3200); return () => clearTimeout(t); }, [aviso]);
  const fotos = useMemo(() => new Map((catalogo ? tarjetas(catalogo.catalogo, { conBorradores: true }) : []).map(t => [t.id, t])), [catalogo]);
  // El vacío elegido tiene prioridad; después se conserva la regla del espacio en juego.
  const destino = destinoGuardado(espacios, activa, elegido);
  /** Dónde cae una figura nueva: el nicho vacío tocado o el primer vacío (null = colección llena: reemplaza la en juego). */
  const primerVacio = espacios.findIndex(e => !e.figura && !e.antes);
  const nuevoEn = elegido ?? (primerVacio >= 0 ? primerVacio : null);
  const activaV3 = activa != null ? espacios[activa]?.figura ?? null : null;

  const guardar = async (f: FiguraV3, nombre: string) => {
    if (guardando) return;
    setGuardando(true);
    const r = await onGuardar(destino, f, nombre).catch((): ResultadoGuardar => "error");
    setGuardando(false);
    setAviso(TEXTO[r](nombre));
    if (r !== "error") { setElegido(null); setVista({ cual: "inicio" }); }
  };
  /** Crear desde cero: en el nicho tocado o, si no, en el primer espacio vacío (así no se reemplaza la figura en juego). */
  const crear = (en?: number, trajes = false) => {
    const f = catalogo && figuraInicial(catalogo.catalogo, activaV3);
    if (!f) return;
    setElegido(en ?? nuevoEn);
    setVista({ cual: "crear", figura: f, trajes });
  };
  /** Elegir un personaje = el taller abierto en Trajes (Elías, 2026-11-26: nada del personalizador anterior). */
  const elegir = (en?: number) => crear(en, true);
  /** Tocar un espacio abre el taller (Elías, 2026-11-26: sin preguntar crear o elegir): vacío, en Trajes para elegir o
   *  armar; con figura, esa figura (y queda en juego). */
  const abrir = (i: number) => {
    if (!catalogo) return;
    const e = espacios[i];
    if (!e?.figura) { elegir(i); return; }
    if (activa !== i) onActivar(i);
    setElegido(i);
    setVista({ cual: "crear", figura: e.figura });
  };
  /** Nombre al guardar: un traje sin cambios se llama como su personaje. */
  const nombreDe = (f: FiguraV3) => (f.origen.tipo === "catalogo" && !Object.keys(f.piezas).length && fotos.get(f.origen.personaje)?.nombre) || "Mi personaje";
  // Foto de cuerpo entero de cada figura para su nicho: la saca el estudio con el motor real (así sale con sus piezas);
  // mientras llega, la foto de tarjeta del personaje del catálogo.
  const mini = useMiniaturas(vista.cual === "inicio" && catalogo ? ESTUDIO : null, catalogo?.catalogo ?? new Map());
  const planos = useMemo(() => espacios.map((e, i) => (catalogo && e.figura ? resolverFigura("nicho" + i, e.figura, catalogo.catalogo, catalogo.piezas, catalogo.base ?? null) : null)), [espacios, catalogo]);
  const claves = planos.map(p => (p ? "fig:" + JSON.stringify(p) : null));
  // Las figuras LDraw no traen movimiento especial propio y su capa va en el torso: en esa pose se tapan; van de pie.
  const poseDe = (f: FiguraV3 | null | undefined) => (f?.origen.tipo === "catalogo" && catalogo?.catalogo.get(f.origen.personaje)?.ficha.origen.fuente === "ldraw" ? "reposo" : "especial");
  useEffect(() => { planos.forEach((p, i) => { if (p) mini.pedirFigura(claves[i]!, p, poseDe(espacios[i]?.figura)); }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mini.listo, claves.join("|")]);
  const fotoNicho = (i: number, respaldo: string | null) => { const c = claves[i]; return (c && mini.fotoDe(c)) || respaldo; };

  return (
    <RaizDS ancho={ancho} className={"mp" + (vista.cual === "crear" ? " az" : "")} style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      {vista.cual !== "crear" && <div className="d-bg"><FondoCiudad /></div>}
      {vista.cual === "inicio" && (
        <div className="mp-inicio mp-cuarto">
          <header className="mp-top">
            <button type="button" className="mp-atras" onClick={onSalir} aria-label="Regresar">‹</button>
            <h1 className="dsp ol mp-titulo">Mi personaje</h1>
          </header>
          {!catalogo && estadoCatalogo === "cargando" && <p className="mp-cargando" role="status">Cargando personajes…</p>}
          {!catalogo && estadoCatalogo === "sin-acceso" && (
            <div className="mp-sin" role="alert">
              <p>No se pudieron cargar los personajes. Revisa tu sesión y tu conexión.</p>
              {onReintentar && <Boton color="amarillo" texto="Reintentar" icono="wheel" onClick={onReintentar} />}
            </div>
          )}
          <section className="mp-mueble" aria-label="Mi colección" style={{ "--mueble": `url(${new URL(BASE + "arte/mi-coleccion/mueble.webp", document.baseURI).href})` } as CSSProperties}>
            {espacios.map((e, i) => {
              const o = e.figura?.origen, t = o?.tipo === "catalogo" ? fotos.get(o.personaje) : null, en = activa === i;
              const vacio = !e.figura && !e.antes, aqui = elegido === i;
              const titulo = e.figura ? e.nombre || t?.nombre || "Mi personaje" : e.antes ? "Figura de antes" : "Vacío";
              const foto = fotoNicho(i, t?.foto ?? null);
              return (
                <div key={i} className={"mp-nicho" + (en ? " on" : "") + (aqui ? " elegido" : "") + (vacio ? " vacio" : "")} style={{ "--x": NICHOS[i] } as CSSProperties}>
                  <button type="button" className="mp-nicho-toca" aria-pressed={en || aqui}
                    onClick={() => abrir(i)} disabled={!catalogo}
                    aria-label={vacio ? `Espacio ${i + 1}: vacío. Tócalo para crear tu personaje aquí` : `Espacio ${i + 1}: ${titulo}${en ? ", en juego" : ""}. Tócalo para editarlo`}>
                    {foto ? <img src={foto} alt="" draggable={false} /> : !vacio ? <span className="dsp mp-mas" aria-hidden="true">?</span> : null}
                  </button>
                  {!vacio && <span className="mp-placa">{titulo}</span>}
                  {en && <span className="mp-en-juego">En juego</span>}
                  {!vacio && e.figura && (
                    <button type="button" className={"mp-estrella" + (en ? " on" : "")} aria-pressed={en} disabled={en}
                      aria-label={en ? `${titulo} es tu personaje principal` : `Hacer a ${titulo} tu personaje principal`} title={en ? "Principal" : "Hacer principal"}
                      onClick={() => onActivar(i)}>{en ? "★" : "☆"}</button>
                  )}
                </div>
              );
            })}
          </section>
          <p className="mp-nota">Toca un espacio para crear o editar tu personaje. La estrella marca el que queda en juego.</p>
          {mini.marco}
        </div>
      )}
      {catalogo && vista.cual === "crear" && (
        <Constructor catalogo={catalogo.catalogo} piezas={catalogo.piezas} base={catalogo.base ?? null} inicial={vista.figura} escenaUrl={ESCENA} seccion={vista.trajes ? "trajes" : undefined}
          onGuardar={f => void guardar(f, nombreDe(f))} onSalir={() => setVista({ cual: "inicio" })} />
      )}
      {aviso && <div role="status" className="mp-aviso">{aviso}</div>}
    </RaizDS>
  );
}
