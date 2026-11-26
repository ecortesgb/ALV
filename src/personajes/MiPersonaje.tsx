// Fase 5 · «Mi personaje» en la app (Codex D5, encargo 2026-11-26-fase5-r1): con la bandera encendida reemplaza a
// Personalizar (HUB, Perfil, lobby). Elegir personaje (galería) · Crear mi personaje (constructor) · Mi colección (los 3
// espacios = las 3 cápsulas de siempre, con la figura nueva dentro por el puente). Este archivo NO toca las cápsulas: la app
// le pasa los espacios y las funciones para guardar y activar (src/pantallas/Personalizar.tsx), así la zona no depende del
// sistema viejo (candado separacion.test.ts).
import { useEffect, useMemo, useState } from "react";
import { Boton, FondoCiudad, Panel, RaizDS } from "../ds";
import { Constructor } from "./Constructor";
import { figuraInicial, sePuedePersonalizar } from "./constructorDatos";
import { Galeria } from "./Galeria";
import { tarjetas } from "./galeriaDatos";
import type { CatalogoV3 } from "./integracion";
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
type Vista = { cual: "inicio" } | { cual: "galeria" } | { cual: "crear"; figura: FiguraV3 };
const TEXTO: Record<ResultadoGuardar, (n: string) => string> = {
  sincronizado: n => `${n}: guardado`,
  local: n => `${n}: guardado en este aparato (se sube al conectarte)`,
  error: () => "No se pudo guardar. Intenta otra vez.",
};

export function MiPersonaje({ jugador, catalogo, estadoCatalogo = catalogo ? "listo" : "cargando", onReintentar, espacios, activa, onGuardar, onActivar, onSalir }: MiPersonajeProps) {
  const [ancho, setAncho] = useState(() => innerWidth >= 860);
  const [vista, setVista] = useState<Vista>({ cual: "inicio" });
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => { const f = () => setAncho(innerWidth >= 860); addEventListener("resize", f); return () => removeEventListener("resize", f); }, []);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 3200); return () => clearTimeout(t); }, [aviso]);
  const fotos = useMemo(() => new Map((catalogo ? tarjetas(catalogo.catalogo, { conBorradores: true }) : []).map(t => [t.id, t])), [catalogo]);
  // Se guarda en el espacio en juego; si no hay, en el primero vacío; si no, en el primero.
  const destino = activa ?? (espacios.findIndex(e => !e.figura && !e.antes) >= 0 ? espacios.findIndex(e => !e.figura && !e.antes) : 0);
  const activaV3 = activa != null ? espacios[activa]?.figura ?? null : null;

  const guardar = async (f: FiguraV3, nombre: string) => {
    if (guardando) return;
    setGuardando(true);
    const r = await onGuardar(destino, f, nombre).catch((): ResultadoGuardar => "error");
    setGuardando(false);
    setAviso(TEXTO[r](nombre));
    if (r !== "error") setVista({ cual: "inicio" });
  };
  const conservar = (f: FiguraV3): FiguraV3 => (activaV3 ? { ...f, momentos: activaV3.momentos, extensiones: activaV3.extensiones } : f);
  const crear = () => { const f = catalogo && figuraInicial(catalogo.catalogo, activaV3); if (f) setVista({ cual: "crear", figura: f }); };

  return (
    <RaizDS ancho={ancho} className={"mp" + (vista.cual === "crear" ? " az" : "")} style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      {vista.cual !== "crear" && <div className="d-bg"><FondoCiudad /></div>}
      {vista.cual === "inicio" && (
        <div className="mp-inicio">
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
          <div className="mp-opciones">
            <Panel className="mp-opcion">
              <h2 className="dsp ol">Elegir personaje</h2>
              <p>{catalogo ? `${catalogo.catalogo.size} personajes listos para jugar.` : estadoCatalogo === "sin-acceso" ? "No disponibles por ahora." : "…"}</p>
              <Boton color="amarillo" texto="Ver galería" icono="users" cargando={!catalogo && estadoCatalogo === "cargando"} desactivado={!catalogo && estadoCatalogo === "sin-acceso"} onClick={() => setVista({ cual: "galeria" })} />
            </Panel>
            <Panel className="mp-opcion">
              <h2 className="dsp ol">Crear mi personaje</h2>
              <p>Cabeza, torso, brazos y piernas.</p>
              <Boton color="azul" texto="Empezar" icono="shirt" cargando={!catalogo && estadoCatalogo === "cargando"} desactivado={!catalogo && estadoCatalogo === "sin-acceso"} onClick={crear} />
            </Panel>
          </div>
          <section className="mp-coleccion" aria-label="Mi colección">
            <h2 className="dsp ol mp-sub">Mi colección</h2>
            <div className="mp-espacios" role="group">
              {espacios.map((e, i) => {
                const o = e.figura?.origen, t = o?.tipo === "catalogo" ? fotos.get(o.personaje) : null, en = activa === i;
                const titulo = e.figura ? e.nombre || t?.nombre || "Mi personaje" : e.antes ? "Figura de antes" : "Vacío";
                return (
                  <button key={i} type="button" className={"d-pnl mp-espacio" + (en ? " on" : "")} aria-pressed={en}
                    disabled={!e.figura && !e.antes} onClick={() => { if (!en) onActivar(i); }}
                    aria-label={`Espacio ${i + 1}: ${titulo}${en ? ", en juego" : ""}`}>
                    {t?.foto ? <img src={t.foto} alt="" draggable={false} /> : <span className="dsp mp-mas" aria-hidden="true">{e.antes ? "?" : "+"}</span>}
                    <small>{en ? "En juego" : titulo}</small>
                  </button>
                );
              })}
            </div>
            <p className="mp-nota">Lo que elijas o crees se guarda en el espacio {destino + 1}.</p>
          </section>
        </div>
      )}
      {catalogo && vista.cual === "galeria" && (
        <Galeria catalogo={catalogo.catalogo} jugador={jugador} escenaUrl={ESCENA + "&frente=25" /* Codex r5: 25° en la galería */}
          actual={activaV3?.origen.tipo === "catalogo" && !Object.keys(activaV3.piezas).length ? activaV3.origen.personaje : null}
          // Cambia la apariencia y conserva los momentos y extensiones (personalidad, apodo) de la figura en juego (Codex, ajuste 6).
          onUsar={(f, t) => void guardar(conservar(f), t.nombre)}
          onPersonalizar={f => setVista({ cual: "crear", figura: conservar(f) })}
          personalizable={fam => sePuedePersonalizar(catalogo.piezas, fam)}
          onSalir={() => setVista({ cual: "inicio" })} />
      )}
      {catalogo && vista.cual === "crear" && (
        <Constructor catalogo={catalogo.catalogo} piezas={catalogo.piezas} inicial={vista.figura} escenaUrl={ESCENA}
          onGuardar={f => void guardar(f, "Mi personaje")} onSalir={() => setVista({ cual: "inicio" })} />
      )}
      {aviso && <div role="status" className="mp-aviso">{aviso}</div>}
    </RaizDS>
  );
}
