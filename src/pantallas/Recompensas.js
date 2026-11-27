import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Recompensas al terminar una partida (Maestro 6A.11 C1 y C7; referencia de Elías: «Rewards / Experience»).
// Se monta una vez en App. Cuando la XP acumulada de la cuenta sube estando en una sala (el servidor la acreditó al
// terminar la partida), muestra: tu figura, «+N XP», la barra del nivel que se llena (y vuelve a empezar al subir de
// nivel), el próximo premio con candado y, si subiste, una tarjeta por cada premio de nivel desbloqueado.
// Para probarla sin nube: window.dispatchEvent(new CustomEvent("alv-recompensa", { detail: { antes: 80, despues: 260 } })).
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Escena3D, enEscena, figuraActiva, useCapsulas } from "../app/figura3d";
import { ir, useRuta } from "../app/rutas";
import { useSesion } from "../app/sesion";
import { sonar } from "../app/sonido";
import { costoNivel, nivelPorXp, xpParaNivel } from "../engine/economia";
import { PREMIOS_NIVEL, siguientePremio } from "../content/premiosNivel";
import { NOMBRE_RAREZA, rarezaDe } from "../content/rarezas";
import { reclamarPremiosNivel } from "../servicios/piezas";
import { infoPieza } from "./Desbloqueo";
import { miniatura } from "./Libro";
import "./recompensas.css";
/** Nivel con el que se regala cada pieza (para la tarjeta del premio). */
const NIVEL_DE_PREMIO = new Map(Object.entries(PREMIOS_NIVEL).flatMap(([n, ids]) => ids.map(id => [id, Number(n)])));
export function Recompensas() {
    const ses = useSesion();
    const { ruta } = useRuta();
    const previo = useRef(null);
    const [evento, setEvento] = useState(null);
    // La XP subió mientras estaba en una sala: es la de la partida que terminó.
    useEffect(() => {
        if (ses.fase !== "dentro" || !ses.uid)
            return;
        const p = previo.current;
        if (p && p.uid === ses.uid && ses.acumulada > p.acumulada && (ruta === "sala" || ruta === "configurar"))
            setEvento({ antes: p.acumulada, despues: ses.acumulada });
        previo.current = { uid: ses.uid, acumulada: ses.acumulada };
    }, [ses.uid, ses.acumulada, ses.fase]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        const f = (e) => { const d = e.detail; if (d && d.despues > d.antes)
            setEvento(d); };
        addEventListener("alv-recompensa", f);
        return () => removeEventListener("alv-recompensa", f);
    }, []);
    if (!evento)
        return null;
    return _jsx(PantallaRecompensas, { ...evento, alCerrar: () => setEvento(null) }, `${evento.antes}-${evento.despues}`);
}
function PantallaRecompensas({ antes, despues, alCerrar }) {
    const ses = useSesion();
    const caps = useCapsulas(ses.uid);
    const [mostrado, setMostrado] = useState(antes);
    const [premios, setPremios] = useState(null);
    const [k, setK] = useState(-1); // -1: experiencia; 0…: tarjeta de premio
    const nivelAntes = nivelPorXp(antes), nivelDespues = nivelPorXp(despues);
    const subio = nivelDespues > nivelAntes;
    const ancla = useRef(null);
    const [raiz, setRaiz] = useState(null);
    useEffect(() => { setRaiz(ancla.current?.closest(".D") ?? document.querySelector(".D")); }, []);
    // La barra se llena poco a poco (2.4 s); al cruzar de nivel vuelve a empezar.
    useEffect(() => {
        const t0 = performance.now(), dur = 2400;
        let raf = 0;
        const paso = (t) => {
            const x = Math.min(1, (t - t0) / dur), suave = 1 - Math.pow(1 - x, 3);
            setMostrado(Math.round(antes + (despues - antes) * suave));
            if (x < 1)
                raf = requestAnimationFrame(paso);
            else if (subio)
                sonar("exito");
        };
        raf = requestAnimationFrame(paso);
        // Si la pestaña está oculta no corre requestAnimationFrame: se termina igual para no dejar «Continuar» apagado.
        const fin = setTimeout(() => { cancelAnimationFrame(raf); setMostrado(despues); }, dur + 300);
        return () => { cancelAnimationFrame(raf); clearTimeout(fin); };
    }, [antes, despues, subio]);
    // Premios del nivel: los da el servidor (migración 035); sin ella no hay ninguno.
    // Se reclama una sola vez: una segunda llamada devolvería [] (ya las tiene) y taparía la lista buena.
    const reclamado = useRef(false);
    useEffect(() => {
        if (!subio) {
            setPremios([]);
            return;
        }
        if (reclamado.current)
            return;
        reclamado.current = true;
        void reclamarPremiosNivel(nivelAntes, nivelDespues).then(setPremios);
    }, [subio, nivelAntes, nivelDespues]);
    const nivel = nivelPorXp(mostrado), dentro = mostrado - xpParaNivel(nivel), costo = costoNivel(nivel);
    const prox = siguientePremio(nivel);
    const figura = figuraActiva(caps);
    const momento = subio && mostrado >= despues ? [{ id: ses.uid, cual: "victoria", n: 1 }] : [];
    if (!raiz)
        return _jsx("span", { ref: ancla, hidden: true });
    const premio = premios && k >= 0 ? premios[k] : undefined;
    return createPortal(_jsxs("div", { className: "rw", role: "dialog", "aria-modal": "true", "aria-label": "Recompensas", children: [_jsx("span", { className: "rw-cinta dsp ol", children: "Recompensas" }), premio ? (_jsxs("div", { className: "rw-premio", children: [_jsxs("span", { className: "rw-premio-t dsp ol", children: ["\u00A1Nuevo! ", infoPieza(premio).nombre] }), _jsxs("small", { className: "rw-premio-sub", children: ["Premio por llegar a nivel ", NIVEL_DE_PREMIO.get(premio) ?? nivelDespues, " \u00B7 ", NOMBRE_RAREZA[rarezaDe(premio)]] }), _jsx("div", { className: "rw-pedestal", children: infoPieza(premio).mini ? _jsx("img", { src: miniatura(infoPieza(premio).mini), alt: "" }) : _jsx("span", { className: "rw-pow dsp ol", children: "\u00A1POW!" }) }), _jsxs("div", { className: "rw-botones", children: [_jsx("button", { type: "button", className: "d-btn k-yel", onClick: () => (k + 1 < (premios?.length ?? 0) ? setK(k + 1) : alCerrar()), children: _jsx("span", { className: "dsp", children: "\u00A1Genial!" }) }), _jsx("button", { type: "button", className: "rw-poner", onClick: () => { alCerrar(); ir("personalizar"); }, children: "Pon\u00E9rmelo" })] })] }, premio)) : (_jsxs("div", { className: "rw-cuerpo", children: [_jsxs("div", { className: "rw-figura", children: [_jsx("span", { className: "rw-nombre", children: ses.nombre }), _jsx(Escena3D, { modo: "sala", figuras: [{ ...enEscena(ses.uid, figura), color: "#ffd23f", columna: 0 }], columnas: 1, momentos: momento, className: "rw-3d" })] }), _jsxs("section", { className: "rw-panel", "aria-label": "Experiencia", children: [_jsx("span", { className: "rw-panel-t dsp", children: "Experiencia" }), _jsxs("b", { className: "rw-mas dsp ol", children: ["+", mostrado - antes, " XP"] }), _jsxs("div", { className: "rw-fila", children: [_jsx("span", { className: "rw-fila-t dsp", children: "XP de jugador" }), _jsxs("small", { children: [dentro, " / ", costo, " XP"] })] }), _jsxs("div", { className: "rw-barra", "aria-label": `Nivel ${nivel}: ${dentro} de ${costo} XP`, children: [_jsx("span", { className: "rw-nivel dsp ol", children: nivel }), _jsx("span", { className: "rw-carril", children: _jsx("i", { style: { width: `${Math.min(100, (dentro / costo) * 100)}%` } }) }), _jsx("span", { className: "rw-nivel sig dsp ol", children: nivel + 1 })] }), prox && (_jsxs("div", { className: "rw-prox", title: `Premio en nivel ${prox.nivel}`, children: [infoPieza(prox.pieza).mini ? _jsx("img", { src: miniatura(infoPieza(prox.pieza).mini), alt: "" }) : _jsx("span", { "aria-hidden": "true", children: "\uD83C\uDF81" }), _jsxs("span", { children: [_jsxs("small", { children: ["Pr\u00F3ximo premio \u00B7 nivel ", prox.nivel] }), _jsx("b", { children: infoPieza(prox.pieza).nombre })] }), _jsx("span", { className: "rw-candado", "aria-hidden": "true", children: "\uD83D\uDD12" })] })), nivel > nivelAntes && _jsxs("p", { className: "rw-subio dsp ol", children: ["\u00A1Subiste a nivel ", nivel, "!"] }, nivel)] })] })), !premio && (_jsx("div", { className: "rw-botones", children: _jsx("button", { type: "button", className: "d-btn k-yel", disabled: mostrado < despues || (subio && premios === null), onClick: () => (premios && premios.length ? setK(0) : alCerrar()), children: _jsx("span", { className: "dsp", children: premios && premios.length ? `Ver ${premios.length === 1 ? "premio" : "premios"}` : "Continuar" }) }) }))] }), raiz);
}
