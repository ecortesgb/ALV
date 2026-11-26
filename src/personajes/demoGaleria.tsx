// Página de prueba del sistema de personajes nuevo (tools/personajes/galeria.html). Solo desarrollo: no entra al juego.
// «Mi personaje» → Elegir personaje (galería) o Crear mi personaje (constructor básico).
// ?fuente=<url del servidor de personajes> (por omisión personajes-privados en 4193) · ?yo=<jugador> · ?vista=galeria|crear
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Boton, FondoCiudad, Panel, RaizDS } from "../ds";
import { figuraActiva, guardarColeccion, leerColeccion, ponerEnColeccion } from "./coleccion";
import { Constructor } from "./Constructor";
import { figuraInicial, piezasDeCatalogo } from "./constructorDatos";
import { Galeria } from "./Galeria";
import { cargarIndice, type Indice } from "./indice";
import type { FiguraV3 } from "./tipos";

const q = new URLSearchParams(location.search);
const FUENTE = q.get("fuente") || "http://127.0.0.1:4193/";
const JUGADOR = q.get("yo") || "prueba";
const ESCENA = "/tools/personajes/escena.html?fondo=no";
type Vista = { cual: "inicio" } | { cual: "galeria" } | { cual: "crear"; figura: FiguraV3 };

function Demo() {
  const [ind, setInd] = useState<Indice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ancho, setAncho] = useState(innerWidth >= 860);
  const [coleccion, setColeccion] = useState(() => leerColeccion(JUGADOR));
  const [aviso, setAviso] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>({ cual: "inicio" });
  useEffect(() => { cargarIndice(FUENTE).then(setInd, e => setError(String(e))); }, []);
  useEffect(() => { const f = () => setAncho(innerWidth >= 860); addEventListener("resize", f); return () => removeEventListener("resize", f); }, []);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 2600); return () => clearTimeout(t); }, [aviso]);
  const piezas = useMemo(() => (ind ? piezasDeCatalogo(ind.catalogo, ind.ranuras) : new Map()), [ind]);
  const activa = figuraActiva(coleccion);
  const crear = () => { const f = ind && figuraInicial(ind.catalogo, activa); if (f) setVista({ cual: "crear", figura: f }); };
  useEffect(() => { if (ind && q.get("vista") === "galeria") setVista({ cual: "galeria" }); if (ind && q.get("vista") === "crear") crear(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ind]);
  const guardar = (f: FiguraV3, texto: string) => { const c = ponerEnColeccion(coleccion, f); guardarColeccion(JUGADOR, c); setColeccion(c); setAviso(texto); };
  (window as unknown as { __galeria: unknown }).__galeria = { ind, coleccion, piezas, vista };

  return (
    <RaizDS ancho={ancho} style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      <div className="d-bg"><FondoCiudad /></div>
      {error && <p style={{ position: "absolute", inset: "auto 16px 16px", color: "#fff" }}>No responde el servidor de personajes ({FUENTE}): {error}</p>}
      {ind && vista.cual === "inicio" && (
        <div className="gal" style={{ gridTemplateRows: "auto minmax(0,1fr)", gridTemplateAreas: '"top" "lista"', gridTemplateColumns: "1fr" }}>
          <header className="gal-top"><h1 className="dsp ol gal-titulo">Mi personaje</h1></header>
          <div style={{ gridArea: "lista", display: "grid", gap: 16, gridTemplateColumns: ancho ? "1fr 1fr" : "1fr", alignContent: "center", maxWidth: 900, width: "100%", justifySelf: "center" }}>
            <Panel style={{ padding: 22, display: "grid", gap: 12, justifyItems: "start" }}>
              <h2 className="dsp ol" style={{ margin: 0, fontSize: 30 }}>Elegir personaje</h2>
              <p style={{ margin: 0, color: "var(--mut)" }}>{ind.catalogo.size} personajes listos para jugar.</p>
              <Boton color="amarillo" texto="Ver galería" icono="users" onClick={() => setVista({ cual: "galeria" })} />
            </Panel>
            <Panel style={{ padding: 22, display: "grid", gap: 12, justifyItems: "start" }}>
              <h2 className="dsp ol" style={{ margin: 0, fontSize: 30 }}>Crear mi personaje</h2>
              <p style={{ margin: 0, color: "var(--mut)" }}>Cabeza, torso, brazos y piernas. En segundos.</p>
              <Boton color="azul" texto="Empezar" icono="shirt" onClick={crear} />
            </Panel>
          </div>
        </div>
      )}
      {ind && vista.cual === "galeria" && (
        <Galeria catalogo={ind.catalogo} pruebas={ind.pruebas} jugador={JUGADOR} escenaUrl={ESCENA}
          actual={activa?.origen.tipo === "catalogo" && !Object.keys(activa.piezas).length ? activa.origen.personaje : null}
          onUsar={(f, t) => guardar(f, `${t.nombre} es tu personaje`)}
          onPersonalizar={f => setVista({ cual: "crear", figura: { ...f, momentos: activa?.momentos ?? f.momentos } })}
          onSalir={() => setVista({ cual: "inicio" })} />
      )}
      {ind && vista.cual === "crear" && (
        <Constructor catalogo={ind.catalogo} piezas={piezas} inicial={vista.figura} escenaUrl={ESCENA}
          onGuardar={f => guardar(f, "Guardado en tu colección")} onSalir={() => setVista({ cual: "inicio" })} />
      )}
      {aviso && <div role="status" style={{ position: "absolute", left: "50%", top: 16, transform: "translateX(-50%)", zIndex: 9, background: "var(--yel)", color: "var(--ink)",
        font: "800 italic 18px/1 var(--letra-display)", padding: "10px 16px", borderRadius: 99, border: "2.5px solid var(--ink)", boxShadow: "0 .2em 0 var(--ink)", whiteSpace: "nowrap" }}>{aviso}</div>}
    </RaizDS>
  );
}

createRoot(document.getElementById("raiz")!).render(<Demo />);
