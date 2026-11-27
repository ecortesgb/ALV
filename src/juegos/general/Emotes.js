import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Emotes al revelar (Elías, 27 nov). En el celular, una fila de reacciones mientras se ve el resultado;
// en la TV, las que llegan suben flotando con el color de quien la mandó. Solo visual.
import { useEffect, useRef, useState } from "react";
import { EMOTES, alEmote, lanzarEmote } from "../../app/emotes";
import { colorDe } from "../../app/colorJugador";
import { nombreDe } from "./texto";
import "./emotes.css";
/** Fila de emotes del celular. Cada toque brinca para que se note que salió. */
export function BarraEmotes({ yo }) {
    const [salio, setSalio] = useState(null);
    return (_jsx("div", { className: "em-barra", role: "group", "aria-label": "Reacciona en la TV", children: EMOTES.map((e, k) => (_jsx("button", { type: "button", className: "em-btn" + (salio?.k === k ? " salio" : ""), "aria-label": `Mandar ${e}`, onClick: () => { if (lanzarEmote(yo, k))
                setSalio(s => ({ k, n: (s?.n ?? 0) + 1 })); }, children: e }, `${k}-${salio?.k === k ? salio.n : 0}`))) }));
}
/** Capa de la TV: los emotes que llegan suben y desaparecen (máximo 24 a la vez). */
export function EmotesVolando({ v }) {
    const [lista, setLista] = useState([]);
    const vista = useRef(v);
    vista.current = v;
    useEffect(() => {
        let id = 0;
        const relojes = new Set();
        const fuera = alEmote(e => {
            const v = vista.current;
            const ids = v?.jugadores.map(j => j.id) ?? [];
            if (!v || !ids.includes(e.jugador))
                return;
            const nuevo = { id: ++id, k: e.k, x: 8 + Math.random() * 84, nombre: nombreDe(v, e.jugador), color: colorDe(e.jugador, ids)?.base ?? "#7cc0ff" };
            setLista(l => [...l.slice(-23), nuevo]);
            const t = setTimeout(() => { relojes.delete(t); setLista(l => l.filter(x => x.id !== nuevo.id)); }, 2600);
            relojes.add(t);
        });
        return () => { fuera(); relojes.forEach(clearTimeout); };
    }, []);
    if (!lista.length)
        return null;
    return (_jsx("div", { className: "em-capa", "aria-hidden": "true", children: lista.map(x => _jsxs("span", { className: "em-vuela", style: { left: `${x.x}%`, "--em": x.color }, children: [_jsx("b", { children: EMOTES[x.k] }), _jsx("small", { children: x.nombre })] }, x.id)) }));
}
