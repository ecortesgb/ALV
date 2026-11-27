import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Configuración en vivo (Elías, 24 nov): mientras el anfitrión arma la partida, los demás ven en qué paso va y qué
// eligió. Va por difusión (`config-<sala>`), sin guardar nada; el anfitrión la repite cada pocos segundos para quien
// llegue tarde y la da por terminada al salir. Es solo para ver: no decide nada del juego.
import { useEffect, useRef, useState } from "react";
import { abrirDifusion } from "../servicios/difusion";
import { ARTE_ESCENARIOS, ARTE_JUEGOS, EMOJI_JUEGO } from "../content/arteJuegos";
import { srcArte } from "./TarjetasConfig";
import "./config-vivo.css";
const REPITE_MS = 3000, OLVIDO_MS = 9000;
const txt = (x, max = 60) => (typeof x === "string" ? x.slice(0, max) : "");
/** Revisa forma y largo de lo que llega (viene de otro aparato). */
export function leerEstadoConfig(d) {
    if (typeof d.juego !== "string" || !/^[a-z0-9-]{1,40}$/.test(d.juego))
        return null;
    const esc = typeof d.escenario === "string" && /^[a-z0-9-]{1,40}$/.test(d.escenario) ? d.escenario : null;
    const grupos = Array.isArray(d.grupos) ? d.grupos.slice(0, 8).map(g => {
        const o = (g ?? {});
        return { nombre: txt(o.nombre, 24), jugadores: Array.isArray(o.jugadores) ? o.jugadores.slice(0, 8).map(j => txt(j, 24)) : [] };
    }) : [];
    return { quien: txt(d.quien, 24), paso: txt(d.paso, 40), escenario: esc, escenarioNombre: txt(d.escenarioNombre), juego: d.juego, juegoNombre: txt(d.juegoNombre),
        modo: txt(d.modo, 30), grupos, herramienta: txt(d.herramienta, 40), nivel: txt(d.nivel, 60) };
}
/** Anfitrión: transmite `estado` mientras está en el configurador. */
export function useTransmitirConfig(salaId, estado) {
    const canal = useRef(null);
    const ultimo = useRef(null);
    ultimo.current = estado;
    useEffect(() => {
        if (!salaId)
            return;
        const c = abrirDifusion(`config-${salaId}`);
        canal.current = c;
        const t = setInterval(() => { if (ultimo.current)
            c.enviar("cfg", ultimo.current); }, REPITE_MS);
        return () => { clearInterval(t); c.enviar("fin"); setTimeout(() => c.cerrar(), 1500); canal.current = null; };
    }, [salaId]);
    const clave = JSON.stringify(estado);
    useEffect(() => { if (estado)
        canal.current?.enviar("cfg", estado); }, [clave]); // eslint-disable-line react-hooks/exhaustive-deps
}
/** Los demás: lo último que transmitió el anfitrión (null si no está configurando). */
export function useConfigEnVivo(salaId, activo = true) {
    const [e, setE] = useState(null);
    useEffect(() => {
        setE(null);
        if (!salaId || !activo)
            return;
        let visto = 0;
        const c = abrirDifusion(`config-${salaId}`, (ev, d) => {
            if (ev === "fin") {
                setE(null);
                return;
            }
            if (ev !== "cfg")
                return;
            const x = leerEstadoConfig(d);
            if (x) {
                visto = Date.now();
                setE(x);
            }
        });
        const t = setInterval(() => { if (visto && Date.now() - visto > OLVIDO_MS) {
            visto = 0;
            setE(null);
        } }, 1000);
        return () => { clearInterval(t); c.cerrar(); };
    }, [salaId, activo]);
    return e;
}
/** Tarjeta que ven los demás: paso actual y lo elegido. `grande` para la TV. */
export function ConfigEnVivo({ e, grande }) {
    const arteJ = ARTE_JUEGOS[e.juego], arteE = e.escenario ? ARTE_ESCENARIOS[e.escenario] : ARTE_ESCENARIOS.ciudad;
    return (_jsxs("section", { className: "cv" + (grande ? " grande" : ""), "aria-live": "polite", "aria-label": "El anfitri\u00F3n est\u00E1 armando la partida", children: [_jsxs("header", { className: "cv-cab", children: [_jsx("span", { className: "cv-punto", "aria-hidden": "true" }), _jsxs("b", { children: [e.quien || "El anfitrión", " est\u00E1 armando la partida"] }), _jsx("span", { className: "cv-paso", children: e.paso }, e.paso)] }), _jsxs("div", { className: "cv-fila", children: [_jsxs("figure", { className: "cv-item", children: [_jsx("span", { className: "cv-img", children: arteE ? _jsx("img", { src: srcArte(arteE), alt: "" }) : null }), _jsxs("figcaption", { children: [_jsx("small", { children: "D\u00F3nde" }), e.escenarioNombre] })] }), _jsxs("figure", { className: "cv-item", children: [_jsx("span", { className: "cv-img", children: arteJ ? _jsx("img", { src: srcArte(arteJ), alt: "" }) : _jsx("span", { className: "cv-emoji", children: EMOJI_JUEGO[e.juego] ?? "🎲" }) }), _jsxs("figcaption", { children: [_jsx("small", { children: "Juego" }), e.juegoNombre] })] })] }), _jsxs("dl", { className: "cv-datos", children: [e.modo && _jsxs("div", { children: [_jsx("dt", { children: "Modo" }), _jsx("dd", { children: e.modo })] }), e.herramienta && _jsxs("div", { children: [_jsx("dt", { children: "Herramienta" }), _jsx("dd", { children: e.herramienta })] }), e.nivel && _jsxs("div", { children: [_jsx("dt", { children: "Nivel" }), _jsx("dd", { children: e.nivel })] })] }), e.grupos.length > 0 && _jsx("ul", { className: "cv-grupos", children: e.grupos.map((g, i) => (_jsxs("li", { style: { "--i": i }, children: [_jsx("b", { children: g.nombre }), _jsx("span", { children: g.jugadores.join(" · ") || "—" })] }, i))) })] }));
}
