import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Rediseño 2026-11-26 (pedido de Elías): la entrada es el mueble «Mi colección» con los 3 personajes parados en sus nichos;
// tocar un nicho vacío ofrece crear o elegir ahí; uno ocupado lo pone en juego y, si ya lo está, lo abre para editarlo.
// Fase 5 · «Mi personaje» en la app (Codex D5, encargo 2026-11-26-fase5-r1): con la bandera encendida reemplaza a
// Personalizar (HUB, Perfil, lobby). Elegir personaje (galería) · Crear mi personaje (constructor) · Mi colección (los 3
// espacios = las 3 cápsulas de siempre, con la figura nueva dentro por el puente). Este archivo NO toca las cápsulas: la app
// le pasa los espacios y las funciones para guardar y activar (src/pantallas/Personalizar.tsx), así la zona no depende del
// sistema viejo (candado separacion.test.ts).
import { useEffect, useMemo, useState } from "react";
import { Boton, FondoCiudad, RaizDS } from "../ds";
import { Constructor } from "./Constructor";
import { figuraInicial } from "./constructorDatos";
import { destinoGuardado } from "./espacios";
import { tarjetas } from "./galeriaDatos";
import { resolverFigura } from "./integracion";
import { useMiniaturas } from "./useMiniaturas";
import "./mi-personaje.css";
const BASE = import.meta.env.BASE_URL;
// La escena y el estudio publicados (copias de tools/personajes en public/personajes): tools/ no entra al build, y en lo
// publicado esa ruta no existía (lo halló el ensayo del corte, 2026-11-26).
const ESCENA = `${BASE}personajes/escena.html?fondo=no`;
const ESTUDIO = `${BASE}personajes/estudio.html`;
/** Centro de cada nicho en el arte del mueble (arte/mi-coleccion/mueble.webp), en % del ancho. */
const NICHOS = ["18.3%", "50.1%", "82%"];
const TEXTO = {
    sincronizado: n => `${n}: guardado`,
    local: n => `${n}: guardado en este aparato (se sube al conectarte)`,
    error: () => "No se pudo guardar. Intenta otra vez.",
};
export function MiPersonaje({ catalogo, estadoCatalogo = catalogo ? "listo" : "cargando", onReintentar, espacios, activa, onGuardar, onActivar, onSalir, puedeUsar }) {
    const [ancho, setAncho] = useState(() => innerWidth >= 860);
    const [vista, setVista] = useState({ cual: "inicio" });
    const [aviso, setAviso] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [elegido, setElegido] = useState(null);
    useEffect(() => { const f = () => setAncho(innerWidth >= 860); addEventListener("resize", f); return () => removeEventListener("resize", f); }, []);
    useEffect(() => { if (!aviso)
        return; const t = setTimeout(() => setAviso(null), 3200); return () => clearTimeout(t); }, [aviso]);
    const fotos = useMemo(() => new Map((catalogo ? tarjetas(catalogo.catalogo, { conBorradores: true }) : []).map(t => [t.id, t])), [catalogo]);
    // El vacío elegido tiene prioridad; después se conserva la regla del espacio en juego.
    const destino = destinoGuardado(espacios, activa, elegido);
    /** Dónde cae una figura nueva: el nicho vacío tocado o el primer vacío (null = colección llena: reemplaza la en juego). */
    const primerVacio = espacios.findIndex(e => !e.figura && !e.antes);
    const nuevoEn = elegido ?? (primerVacio >= 0 ? primerVacio : null);
    const activaV3 = activa != null ? espacios[activa]?.figura ?? null : null;
    const guardar = async (f, nombre) => {
        if (guardando)
            return;
        setGuardando(true);
        const r = await onGuardar(destino, f, nombre).catch(() => "error");
        setGuardando(false);
        setAviso(TEXTO[r](nombre));
        if (r !== "error") {
            setElegido(null);
            setVista({ cual: "inicio" });
        }
    };
    /** Crear desde cero: en el nicho tocado o, si no, en el primer espacio vacío (así no se reemplaza la figura en juego). */
    const crear = (en, trajes = false) => {
        const f = catalogo && figuraInicial(catalogo.catalogo, activaV3);
        if (!f)
            return;
        setElegido(en ?? nuevoEn);
        setVista({ cual: "crear", figura: f, trajes });
    };
    /** Elegir un personaje = el taller abierto en Trajes (Elías, 2026-11-26: nada del personalizador anterior). */
    const elegir = (en) => crear(en, true);
    /** Tocar un espacio abre el taller (Elías, 2026-11-26: sin preguntar crear o elegir): vacío, en Trajes para elegir o
     *  armar; con figura, esa figura (y queda en juego). */
    const abrir = (i) => {
        if (!catalogo)
            return;
        const e = espacios[i];
        if (!e?.figura) {
            elegir(i);
            return;
        }
        if (activa !== i)
            onActivar(i);
        setElegido(i);
        setVista({ cual: "crear", figura: e.figura });
    };
    /** Nombre al guardar: un traje sin cambios se llama como su personaje. */
    const nombreDe = (f) => (f.origen.tipo === "catalogo" && !Object.keys(f.piezas).length && fotos.get(f.origen.personaje)?.nombre) || "Mi personaje";
    // Foto de cuerpo entero de cada figura para su nicho: la saca el estudio con el motor real (así sale con sus piezas);
    // mientras llega, la foto de tarjeta del personaje del catálogo.
    const mini = useMiniaturas(vista.cual === "inicio" && catalogo ? ESTUDIO : null, catalogo?.catalogo ?? new Map());
    const planos = useMemo(() => espacios.map((e, i) => (catalogo && e.figura ? resolverFigura("nicho" + i, e.figura, catalogo.catalogo, catalogo.piezas, catalogo.base ?? null) : null)), [espacios, catalogo]);
    const claves = planos.map(p => (p ? "fig:" + JSON.stringify(p) : null));
    // Figuras LDraw sin cambios: su foto de tarjeta (el estudio todavía no las arma bien: la capa las tapa). Las demás, el
    // estudio en su movimiento especial.
    const tarjetaLdraw = (f) => f?.origen.tipo === "catalogo" && !Object.keys(f.piezas).length
        && catalogo?.catalogo.get(f.origen.personaje)?.ficha.origen.fuente === "ldraw";
    useEffect(() => { planos.forEach((p, i) => { if (p && !tarjetaLdraw(espacios[i]?.figura))
        mini.pedirFigura(claves[i], p, espacios[i]?.figura?.familia === "bigfig" ? "reposo" : "especial"); }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mini.listo, claves.join("|")]);
    /** Figura grande más grande que una minifigura (Elías, 2026-11-27): su foto crece lo que creció su cuadro, hasta 1.4
     *  veces el nicho (sale por arriba). Va en reposo, más angosta que en su movimiento especial. */
    const escalaNicho = (i) => { const c = claves[i]; return c && mini.fotoDe(c) ? Math.min(1.4, mini.escalaDe(c)) : 1; };
    const fotoNicho = (i, respaldo) => { const c = claves[i]; return (c && mini.fotoDe(c)) || respaldo; };
    return (_jsxs(RaizDS, { ancho: ancho, className: "mp" + (vista.cual === "crear" ? " az" : ""), style: { position: "fixed", inset: 0, overflow: "hidden" }, children: [vista.cual !== "crear" && _jsx("div", { className: "d-bg", children: _jsx(FondoCiudad, {}) }), vista.cual === "inicio" && (_jsxs("div", { className: "mp-inicio mp-cuarto", children: [_jsxs("header", { className: "mp-top", children: [_jsx("button", { type: "button", className: "mp-atras", onClick: onSalir, "aria-label": "Regresar", children: "\u2039" }), _jsx("h1", { className: "dsp ol mp-titulo", children: "Mi personaje" })] }), !catalogo && estadoCatalogo === "cargando" && _jsx("p", { className: "mp-cargando", role: "status", children: "Cargando personajes\u2026" }), !catalogo && estadoCatalogo === "sin-acceso" && (_jsxs("div", { className: "mp-sin", role: "alert", children: [_jsx("p", { children: "No se pudieron cargar los personajes. Revisa tu sesi\u00F3n y tu conexi\u00F3n." }), onReintentar && _jsx(Boton, { color: "amarillo", texto: "Reintentar", icono: "wheel", onClick: onReintentar })] })), _jsx("section", { className: "mp-mueble", "aria-label": "Mi colecci\u00F3n", style: { "--mueble": `url(${new URL(BASE + "arte/mi-coleccion/mueble.webp", document.baseURI).href})` }, children: espacios.map((e, i) => {
                            const o = e.figura?.origen, t = o?.tipo === "catalogo" ? fotos.get(o.personaje) : null, en = activa === i;
                            const vacio = !e.figura && !e.antes, aqui = elegido === i;
                            const titulo = e.figura ? e.nombre || t?.nombre || "Mi personaje" : e.antes ? "Figura de antes" : "Vacío";
                            const foto = fotoNicho(i, t?.foto ?? null);
                            return (_jsxs("div", { className: "mp-nicho" + (en ? " on" : "") + (aqui ? " elegido" : "") + (vacio ? " vacio" : ""), style: { "--x": NICHOS[i] }, children: [_jsx("button", { type: "button", className: "mp-nicho-toca", "aria-pressed": en || aqui, onClick: () => abrir(i), disabled: !catalogo, "aria-label": vacio ? `Espacio ${i + 1}: vacío. Tócalo para crear tu personaje aquí` : `Espacio ${i + 1}: ${titulo}${en ? ", en juego" : ""}. Tócalo para editarlo`, children: foto ? _jsx("img", { className: tarjetaLdraw(e.figura) ? "mp-foto-tarjeta" : undefined, src: foto, alt: "", draggable: false, style: escalaNicho(i) > 1 ? { height: `${104 * escalaNicho(i)}%`, maxWidth: "none", zIndex: 2 } : undefined }) : !vacio ? _jsx("span", { className: "dsp mp-mas", "aria-hidden": "true", children: "?" }) : null }), !vacio && _jsx("span", { className: "mp-placa", children: titulo }), en && _jsx("span", { className: "mp-en-juego", children: "En juego" }), !vacio && e.figura && (_jsx("button", { type: "button", className: "mp-estrella" + (en ? " on" : ""), "aria-pressed": en, disabled: en, "aria-label": en ? `${titulo} es tu personaje principal` : `Hacer a ${titulo} tu personaje principal`, title: en ? "Principal" : "Hacer principal", onClick: () => onActivar(i), children: en ? "★" : "☆" }))] }, i));
                        }) }), _jsx("p", { className: "mp-nota", children: "Toca un espacio para crear o editar tu personaje. La estrella marca el que queda en juego." }), mini.marco] })), catalogo && vista.cual === "crear" && (_jsx(Constructor, { catalogo: catalogo.catalogo, piezas: catalogo.piezas, base: catalogo.base ?? null, inicial: vista.figura, escenaUrl: ESCENA, seccion: vista.trajes ? "trajes" : undefined, puedeUsar: puedeUsar, onGuardar: f => void guardar(f, nombreDe(f)), onSalir: () => setVista({ cual: "inicio" }) })), aviso && _jsx("div", { role: "status", className: "mp-aviso", children: aviso })] }));
}
