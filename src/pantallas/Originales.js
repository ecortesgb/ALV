import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Catálogo de personajes: saga → grupo → personaje → versión, como portadas de cómic (sagas.ts).
// - Personaje original («o»): al final, «Ponerme todo» o «Solo el traje».
// - Avanzado, Piezas originales («a»): además, cada parte del personaje se pone sola (su máscara, su torso, su capa…).
// Las figuras de los personajes viven en trajes-figura.json y se cargan solo al abrir el catálogo.
import { useEffect, useState } from "react";
import { tomarPartes } from "../app/cambiosFigura";
import { capaDe, completar, cuelloDe, vestirCompleto, vestirSoloTraje } from "../app/editarFigura";
import { bloqueadasEn } from "../app/retos";
import { sonar } from "../app/sonido";
import { PRECIO, rarezaDe } from "../content/rarezas";
import { SAGAS, listo, versionesListas } from "../content/sagas";
import { desbloquear, libre, piezasAhora, usePiezas } from "../servicios/piezas";
import { aviso } from "./comun";
import { infoPieza } from "./Desbloqueo";
import { miniatura } from "./Libro";
import { Rayos } from "./TarjetasConfig";
let cargados = null;
export function useTrajes() {
    const [t, setT] = useState(cargados);
    useEffect(() => {
        if (t)
            return;
        let vivo = true;
        void import("../content/trajes-figura.json").then(m => {
            cargados = new Map(m.default.trajes.map(x => [x.id, x]));
            if (vivo)
                setT(cargados);
        });
        return () => { vivo = false; };
    }, [t]);
    return t;
}
// ---------- Rutas dentro del catálogo ----------
const buscar = (sid, gid, pid) => {
    const saga = SAGAS.find(s => s.id === sid), grupo = saga?.grupos.find(g => g.id === gid), pj = grupo?.personajes.find(p => p.id === pid);
    return { saga, grupo, pj };
};
function leer(pag) {
    if (pag === "original")
        return { donde: "o", nivel: "sagas" };
    if (pag === "originales")
        return { donde: "a", nivel: "sagas" };
    const [donde, nivel, ruta = ""] = pag.split(":");
    const [sid, gid, pid] = ruta.split("/");
    return { donde, nivel, ...buscar(sid, gid, pid) };
}
export function tituloOriginal(pag) {
    const x = leer(pag);
    if (x.nivel === "sagas")
        return x.donde === "o" ? "Personaje original" : "Piezas originales";
    return (x.nivel === "pj" ? x.pj?.nombre : x.nivel === "grupo" ? x.grupo?.nombre : x.saga?.nombre) ?? "Personajes";
}
const abrirSaga = (d, s) => (s.grupos.length === 1 ? `${d}:grupo:${s.id}/${s.grupos[0].id}` : `${d}:saga:${s.id}`);
// ---------- Portadas ----------
const miniDe = (t, v) => (v?.traje ? t.get(v.traje)?.mini : undefined);
function Portada({ titulo, color, minis, sub, onClick, pronto }) {
    const ms = minis.filter((m) => !!m).slice(0, 3);
    return (_jsxs("button", { type: "button", className: "p-portada" + (pronto ? " pronto" : ""), style: { "--tc": color }, onClick: onClick, disabled: !onClick, "aria-label": titulo + (pronto ? ", próximamente" : ""), children: [_jsxs("span", { className: "p-portada-arte", "aria-hidden": "true", children: [_jsx(Rayos, { color: color }), ms.length ? _jsx("span", { className: "p-portada-figuras", children: ms.map(m => _jsx("img", { src: miniatura(m), alt: "", loading: "lazy", draggable: false }, m)) })
                        : _jsx("span", { className: "p-portada-silueta", children: "?" })] }), _jsx("span", { className: "p-portada-num dsp", "aria-hidden": "true", children: "#1" }), _jsx("span", { className: "p-portada-titulo dsp", children: titulo }), sub && _jsx("span", { className: "p-portada-sub", children: sub }), pronto && _jsx("span", { className: "p-portada-pronto dsp", children: "Pr\u00F3ximamente" })] }));
}
// ---------- Página ----------
export function PaginaOriginal({ pag, figura, cambiar, ir }) {
    const t = useTrajes();
    const x = leer(pag);
    if (!t)
        return _jsx("p", { className: "p-nota", children: "Abriendo el armario\u2026" });
    const d = x.donde;
    if (x.nivel === "sagas")
        return _jsxs(_Fragment, { children: [d === "a" && _jsx("p", { className: "p-nota", children: "Toma piezas sueltas de un personaje: su m\u00E1scara, su torso, su capa\u2026 El resto de tu figura se queda." }), _jsx("div", { className: "p-portadas", children: SAGAS.map(s => {
                        const pjs = s.grupos.flatMap(g => g.personajes);
                        const hay = pjs.some(p => versionesListas(p).length);
                        return _jsx(Portada, { titulo: s.nombre, color: s.color, sub: `${pjs.length} personajes`, pronto: !hay, minis: pjs.map(p => miniDe(t, versionesListas(p)[0])), onClick: hay ? () => ir(abrirSaga(d, s)) : undefined }, s.id);
                    }) })] });
    if (!x.saga)
        return _jsx("p", { className: "p-nota", children: "No encontr\u00E9 esa saga." });
    const saga = x.saga;
    if (x.nivel === "saga")
        return (_jsx("div", { className: "p-portadas", children: saga.grupos.map(g => _jsx(Portada, { titulo: g.nombre, color: saga.color, sub: `${g.personajes.length} personajes`, minis: g.personajes.map(p => miniDe(t, versionesListas(p)[0])), onClick: () => ir(`${d}:grupo:${saga.id}/${g.id}`) }, g.id)) }));
    if (!x.grupo)
        return _jsx("p", { className: "p-nota", children: "No encontr\u00E9 ese grupo." });
    const grupo = x.grupo;
    if (x.nivel === "grupo")
        return (_jsx("div", { className: "p-portadas p-portadas-pj", children: grupo.personajes.map(p => {
                const lista = versionesListas(p);
                return _jsx(Portada, { titulo: p.nombre, color: saga.color, minis: [miniDe(t, lista[0])], pronto: !lista.length, sub: p.versiones.length > 1 ? `${p.versiones.length} versiones` : undefined, onClick: lista.length ? () => ir(`${d}:pj:${saga.id}/${grupo.id}/${p.id}`) : undefined }, p.id);
            }) }));
    if (!x.pj)
        return _jsx("p", { className: "p-nota", children: "No encontr\u00E9 ese personaje." });
    return _jsx(FichaPersonaje, { pj: x.pj, color: saga.color, t: t, donde: d, figura: figura, cambiar: cambiar }, x.pj.id);
}
// Partes que se toman sueltas en Avanzado (las mismas de «¡Sorpréndeme!»).
const PARTES = [
    { k: "pelo", nombre: "Cabeza: pelo, casco o máscara", de: g => g.accesorios.cara?.id ?? g.accesorios.cabeza?.id ?? g.identidad.cabello?.id ?? null },
    { k: "cabeza", nombre: "Cara y piel", de: g => g.identidad.rostro },
    { k: "torso", nombre: "Torso, brazos y manos", de: g => g.ropa.torso.estampado ?? "liso" },
    { k: "piernas", nombre: "Cadera y piernas", de: () => "piernas" },
    { k: "cuello", nombre: "Cuello y capa", de: g => capaDe(g)?.id ?? cuelloDe(g)?.id ?? null },
    { k: "objetos", nombre: "Objetos", de: g => g.accesorios.mano_der?.id ?? g.accesorios.mano_izq?.id ?? null },
    { k: "momentos", nombre: "Momentos (poses)", de: g => (g.momentos.paquete ? "MOM_" + g.momentos.paquete : null) },
];
const nombrePieza = (v) => (v == null ? null : v === "liso" ? "Liso" : v === "piernas" ? "Sus colores" : infoPieza(v).nombre.replace(/^Momentos: /, ""));
function FichaPersonaje({ pj, color, t, donde, figura, cambiar }) {
    const lista = versionesListas(pj);
    const [vid, setVid] = useState(lista[0]?.id);
    const [ocupado, setOcupado] = useState(false);
    const est = usePiezas();
    const v = pj.versiones.find(x => x.id === vid) ?? lista[0];
    const traje = v?.traje ? t.get(v.traje) : undefined;
    const f = completar(figura);
    const faltan = (g) => (est.activo ? bloqueadasEn(g, est.tengo).filter(id => !libre(id, est)) : []);
    /** Pone el resultado; si trae piezas bloqueadas (con nube), primero las desbloquea con XP. */
    const poner = async (g) => {
        if (ocupado)
            return;
        const fx = faltan(g);
        if (fx.length) {
            const total = fx.reduce((n, id) => n + PRECIO[rarezaDe(id)], 0);
            if (piezasAhora().xp < total) {
                aviso(`Te faltan ${fx.length} piezas (${total} XP). Tienes ${piezasAhora().xp} XP.`);
                sonar("error");
                return;
            }
            setOcupado(true);
            for (const id of fx) {
                const e = await desbloquear(id);
                if (e) {
                    setOcupado(false);
                    aviso(e);
                    return;
                }
            }
            setOcupado(false);
            sonar("fanfarria");
        }
        sonar("exito");
        cambiar(g);
    };
    const candado = (g) => { const n = faltan(g).length; return n ? ` · 🔒 ${n}` : ""; };
    return _jsxs(_Fragment, { children: [pj.versiones.length > 1 && (_jsxs("section", { className: "p-bloque", children: [_jsx("h3", { className: "p-bloque-titulo", children: "Versiones" }), _jsx("div", { className: "p-variantes", role: "radiogroup", "aria-label": `Versiones de ${pj.nombre}`, children: pj.versiones.map((x, i) => {
                            const ok = listo(x), on = x.id === v?.id, m = miniDe(t, x);
                            return (_jsxs("button", { type: "button", role: "radio", "aria-checked": on, disabled: !ok, className: "p-variante" + (on ? " on" : "") + (ok ? "" : " pronto"), style: { "--tc": color, "--i": i - (pj.versiones.length - 1) / 2 }, onClick: () => { sonar("clic"); setVid(x.id); }, children: [_jsx("span", { className: "p-variante-arte", children: m ? _jsx("img", { src: miniatura(m), alt: "", draggable: false }) : _jsx("span", { className: "p-portada-silueta", children: "?" }) }), _jsx("span", { className: "p-variante-nombre dsp", children: x.nombre }), !ok && _jsx("small", { children: "Pr\u00F3ximamente" })] }, x.id));
                        }) })] })), traje && _jsxs(_Fragment, { children: [pj.versiones.length === 1 && _jsxs("div", { className: "p-ficha-arte", style: { "--tc": color }, children: [_jsx(Rayos, { color: color }), _jsx("img", { src: miniatura(traje.mini), alt: "", draggable: false })] }), _jsxs("div", { className: "p-vestir", role: "group", "aria-label": `Ponerte ${pj.nombre}`, children: [_jsxs("button", { type: "button", className: "p-opcion on", disabled: ocupado, onClick: () => void poner(vestirCompleto(f, traje.figura)), children: ["Ponerme todo", _jsxs("small", { children: ["con su cara y su pelo", candado(vestirCompleto(f, traje.figura))] })] }), _jsxs("button", { type: "button", className: "p-opcion", disabled: ocupado, onClick: () => void poner(vestirSoloTraje(f, traje.figura)), children: ["Solo el traje", _jsxs("small", { children: ["tu cara y tu pelo se quedan", candado(vestirSoloTraje(f, traje.figura))] })] })] }), donde === "a" && (_jsxs("section", { className: "p-bloque", children: [_jsx("h3", { className: "p-bloque-titulo", children: "Piezas sueltas" }), _jsx("div", { className: "p-sueltas", children: PARTES.map(p => {
                                    const pieza = nombrePieza(p.de(completar(traje.figura)));
                                    const g = tomarPartes(f, traje.figura, [p.k]);
                                    return (_jsxs("button", { type: "button", className: "p-suelta", disabled: ocupado, onClick: () => void poner(g), children: [_jsx("span", { children: p.nombre }), _jsxs("small", { children: [pieza ?? "Nada", candado(g)] })] }, p.k));
                                }) })] }))] }), _jsx("p", { className: "p-nota", children: "Antes de cambiar algo te pregunto, y con \u00ABRegresar\u00BB deshaces el \u00FAltimo paso." })] });
}
