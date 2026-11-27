import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Página de prueba del sistema de personajes nuevo (tools/personajes/galeria.html). Solo desarrollo: no entra al juego.
// «Mi personaje» → Elegir personaje (galería) o Crear mi personaje (constructor básico).
// ?fuente=<url del servidor de personajes> (por omisión personajes-privados en 4193) · ?yo=<jugador> · ?vista=galeria|crear
// ?mp=1 → la pantalla real «Mi personaje» (mueble «Mi colección» + constructor) con la colección local.
// ?revisar=1 → modo revisión de los personajes del catálogo (Revision.tsx).
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Boton, FondoCiudad, Panel, RaizDS } from "../ds";
import { figuraActiva, guardarColeccion, leerColeccion, ponerEnColeccion } from "./coleccion";
import { Constructor } from "./Constructor";
import { figuraInicial, sePuedePersonalizar } from "./constructorDatos";
import { baseDelIndice, todasLasPiezas } from "./integracion";
import { MiPersonaje } from "./MiPersonaje";
import { Galeria } from "./Galeria";
import { Revision } from "./Revision";
import { cargarIndice } from "./indice";
const q = new URLSearchParams(location.search);
const FUENTE = q.get("fuente") || "http://127.0.0.1:4193/";
const JUGADOR = q.get("yo") || "prueba";
const ESCENA = "/tools/personajes/escena.html?fondo=no";
function Demo() {
    const [ind, setInd] = useState(null);
    const [error, setError] = useState(null);
    const [ancho, setAncho] = useState(innerWidth >= 860);
    const [coleccion, setColeccion] = useState(() => leerColeccion(JUGADOR));
    const [aviso, setAviso] = useState(null);
    const [vista, setVista] = useState({ cual: "inicio" });
    useEffect(() => { cargarIndice(FUENTE).then(setInd, e => setError(String(e))); }, []);
    useEffect(() => { const f = () => setAncho(innerWidth >= 860); addEventListener("resize", f); return () => removeEventListener("resize", f); }, []);
    useEffect(() => { if (!aviso)
        return; const t = setTimeout(() => setAviso(null), 2600); return () => clearTimeout(t); }, [aviso]);
    const piezas = useMemo(() => (ind ? todasLasPiezas(ind) : new Map()), [ind]);
    const activa = figuraActiva(coleccion);
    const crear = () => { const f = ind && figuraInicial(ind.catalogo, activa); if (f)
        setVista({ cual: "crear", figura: f }); };
    useEffect(() => { if (ind && q.get("vista") === "galeria")
        setVista({ cual: "galeria" }); if (ind && q.get("vista") === "crear")
        crear(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ind]);
    const guardar = (f, texto) => { const c = ponerEnColeccion(coleccion, f); guardarColeccion(JUGADOR, c); setColeccion(c); setAviso(texto); };
    window.__galeria = { ind, coleccion, piezas, vista };
    return (_jsxs(RaizDS, { ancho: ancho, className: vista.cual === "crear" ? "az" : "", style: { position: "fixed", inset: 0, overflow: "hidden" }, children: [vista.cual !== "crear" && _jsx("div", { className: "d-bg", children: _jsx(FondoCiudad, {}) }), error && _jsxs("p", { style: { position: "absolute", inset: "auto 16px 16px", color: "#fff" }, children: ["No responde el servidor de personajes (", FUENTE, "): ", error] }), ind && q.get("revisar") === "1" && _jsx(Revision, { catalogo: ind.catalogo, escenaUrl: ESCENA + "&frente=25" }), ind && q.get("revisar") !== "1" && vista.cual === "inicio" && (_jsxs("div", { className: "gal", style: { gridTemplateRows: "auto minmax(0,1fr)", gridTemplateAreas: '"top" "lista"', gridTemplateColumns: "1fr" }, children: [_jsx("header", { className: "gal-top", children: _jsx("h1", { className: "dsp ol gal-titulo", children: "Mi personaje" }) }), _jsxs("div", { style: { gridArea: "lista", display: "grid", gap: 16, gridTemplateColumns: ancho ? "1fr 1fr" : "1fr", alignContent: "center", maxWidth: 900, width: "100%", justifySelf: "center" }, children: [_jsxs(Panel, { style: { padding: 22, display: "grid", gap: 12, justifyItems: "start" }, children: [_jsx("h2", { className: "dsp ol", style: { margin: 0, fontSize: 30 }, children: "Elegir personaje" }), _jsxs("p", { style: { margin: 0, color: "var(--mut)" }, children: [ind.catalogo.size, " personajes listos para jugar."] }), _jsx(Boton, { color: "amarillo", texto: "Ver galer\u00EDa", icono: "users", onClick: () => setVista({ cual: "galeria" }) })] }), _jsxs(Panel, { style: { padding: 22, display: "grid", gap: 12, justifyItems: "start" }, children: [_jsx("h2", { className: "dsp ol", style: { margin: 0, fontSize: 30 }, children: "Crear mi personaje" }), _jsx("p", { style: { margin: 0, color: "var(--mut)" }, children: "Cabeza, torso, brazos y piernas. En segundos." }), _jsx(Boton, { color: "azul", texto: "Empezar", icono: "shirt", onClick: crear })] })] })] })), ind && vista.cual === "galeria" && (_jsx(Galeria, { catalogo: ind.catalogo, pruebas: ind.pruebas, jugador: JUGADOR, escenaUrl: ESCENA + "&frente=25" /* Codex r5: 25° en la galería */, actual: activa?.origen.tipo === "catalogo" && !Object.keys(activa.piezas).length ? activa.origen.personaje : null, onUsar: (f, t) => guardar(f, `${t.nombre} es tu personaje`), onPersonalizar: f => setVista({ cual: "crear", figura: { ...f, momentos: activa?.momentos ?? f.momentos } }), personalizable: fam => sePuedePersonalizar(piezas, fam), onSalir: () => setVista({ cual: "inicio" }) })), ind && vista.cual === "crear" && (_jsx(Constructor, { catalogo: ind.catalogo, piezas: piezas, inicial: vista.figura, escenaUrl: ESCENA, onGuardar: f => guardar(f, "Guardado en tu colección"), onSalir: () => setVista({ cual: "inicio" }) })), aviso && _jsx("div", { role: "status", style: { position: "absolute", left: "50%", top: 16, transform: "translateX(-50%)", zIndex: 9, background: "var(--yel)", color: "var(--ink)",
                    font: "800 italic 18px/1 var(--letra-display)", padding: "10px 16px", borderRadius: 99, border: "2.5px solid var(--ink)", boxShadow: "0 .2em 0 var(--ink)", whiteSpace: "nowrap" }, children: aviso })] }));
}
/** «Mi personaje» tal cual lo ve el jugador, con la colección de este aparato en lugar de las cápsulas de la nube. */
function DemoMP() {
    const [ind, setInd] = useState(null);
    const [coleccion, setColeccion] = useState(() => leerColeccion(JUGADOR));
    useEffect(() => { cargarIndice(FUENTE).then(setInd, e => console.warn(e)); }, []);
    const cat = useMemo(() => (ind ? { catalogo: ind.catalogo, piezas: todasLasPiezas(ind), base: baseDelIndice(ind) } : null), [ind]);
    window.__mp = { ind, coleccion, cat };
    return (_jsx(MiPersonaje, { jugador: JUGADOR, catalogo: cat, estadoCatalogo: cat ? "listo" : "cargando", espacios: coleccion.espacios.map(f => ({ figura: f, nombre: "", antes: false })), activa: coleccion.activa, onGuardar: async (i, f) => { const c = ponerEnColeccion(coleccion, f, i); guardarColeccion(JUGADOR, c); setColeccion(c); return "local"; }, onActivar: i => { const c = { ...coleccion, activa: i }; guardarColeccion(JUGADOR, c); setColeccion(c); }, onSalir: () => location.reload() }));
}
createRoot(document.getElementById("raiz")).render(q.get("mp") === "1" ? _jsx(DemoMP, {}) : _jsx(Demo, {}));
