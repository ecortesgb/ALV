import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// El impostor en la nave (Elías, 24 nov): piezas que comparten la TV y el celular.
// Tablero de votos (tarjetas con la figura de cada quien y un bloque del color de quien votó), la expulsión (la figura
// sale volando al espacio) y el final con ganadores y castigos. Solo usan la vista pública.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { colorDe, varsColor } from "../../app/colorJugador";
import { Burbuja } from "../../pantallas/Identidad";
import { Escena3D, enEscena } from "../../app/figura3d";
import { urlArte } from "../../pantallas/comun";
import { SALTAR_VOTO } from "../../engine/partida";
import { desenlaceImpostor, nombreDe } from "../general/texto";
import "./nave.css";
export const revNave = (v) => (v.revelado ?? {});
export const esNave = (v) => !!v.impostor?.nave;
/** Cuánto dura la expulsión en pantalla (ms). Después queda el resultado o el final. */
export const DURA_EXPULSION = 8200;
/** Arte de la nave (PNG de Elías pasados a WebP). Si todavía no existe, el CSS pone su respaldo. */
export const arteNave = (nombre) => urlArte(`impostor/${nombre}.webp`);
/** Quién votó a quién en esta vuelta: en vivo con votos a la vista, al revelar si no son secretos. */
export function votosVisibles(v) {
    if (v.fase === "contestando")
        return v.impostor?.votosEnVivo ?? null;
    return v.votosDe ?? null;
}
const persona = (v, miembros, id) => ({
    id, nombre: nombreDe(v, id), figura: miembros.find(m => m.id === id)?.figura, color: colorDe(id, v.jugadores.map(j => j.id)),
});
/**
 * Tablero de la asamblea: una tarjeta por quien sigue a bordo (y quien acaba de salir), más «Nadie».
 * Votos a la vista: cada voto es un bloque del color de quien votó. Secretos: solo una palomita en quien ya votó y, al revelar, el conteo.
 */
export function TableroVotos({ v, miembros, compacto, yo, elegir }) {
    const im = v.impostor;
    const r = revNave(v);
    const revelada = v.fase === "revelada";
    const visibles = votosVisibles(v);
    // Papeles en la mesa (Elías, 24 nov): todos en el tablero (los que salieron, en gris), la palabra a la derecha de cada
    // quien y «Nadie» solo al votar. Sin papeles, como antes.
    const sala = !!im.palabras;
    const a = v.jugadores.map(j => j.id).filter(id => sala || !im.eliminados.includes(id) || (revelada && r.eliminado === id));
    const conNadie = !sala || im.etapa === "votar" || revelada;
    const bloques = (destino) => {
        if (visibles)
            return Object.entries(visibles).filter(([, x]) => x === destino).map(([de]) => ({ de, c: colorDe(de, v.jugadores.map(j => j.id)) }));
        // Secretos: al revelar, bloques grises por cada voto.
        if (!revelada)
            return [];
        const n = destino === SALTAR_VOTO ? r.saltos ?? 0 : r.votos?.[destino] ?? 0;
        return Array.from({ length: n }, (_, i) => ({ de: `${destino}-${i}`, c: null }));
    };
    const tarjeta = (id, cuerpo, cuantos, extra = "", puede = false) => (_jsxs("li", { className: "nv-tj" + extra + (puede ? " elegible" : "") + (puede && elegir?.sel === id ? " sel" : ""), style: id === SALTAR_VOTO ? undefined : varsColor(colorDe(id, v.jugadores.map(j => j.id))), ...(puede && elegir ? { role: "radio", tabIndex: 0, "aria-checked": elegir.sel === id, onClick: () => elegir.alElegir(id),
            onKeyDown: (e) => { if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                elegir.alElegir(id);
            } } } : {}), children: [cuerpo, _jsx("span", { className: "nv-bloques", "aria-label": `${cuantos.length} ${cuantos.length === 1 ? "voto" : "votos"}`, children: cuantos.map((b, i) => _jsx("i", { className: "nv-bloque" + (b.c ? "" : " gris"), style: { ...(b.c ? varsColor(b.c) : {}), "--i": i }, title: b.c ? nombreDe(v, b.de) : undefined }, b.de)) }), revelada && cuantos.length > 0 && _jsx("b", { className: "nv-cuenta dsp ol", children: cuantos.length })] }, id));
    return (_jsxs("ol", { className: "nv-tablero" + (compacto ? " compacto" : "") + (a.length > 6 ? " muchos" : "") + (sala ? " con-palabras" : "") + (elegir ? " eligiendo" : ""), "aria-label": "Palabras y votos de la asamblea", role: elegir ? "radiogroup" : undefined, children: [a.map(id => {
                const p = persona(v, miembros, id);
                const voto = v.contestaron.includes(id) && v.fase === "contestando" && im.etapa === "votar";
                const sale = revelada && r.eliminado === id;
                const fuera = sala && im.eliminados.includes(id) && !sale;
                const turno = sala && !revelada && im.etapa === "pistas" && v.turnoDe === id;
                const actual = v.pistas[id];
                const antes = (im.palabras?.[id] ?? []).slice(0, actual ? -1 : undefined);
                return tarjeta(id, sala ? _jsxs(_Fragment, { children: [_jsx(Burbuja, { p: { ...p, insignia: voto ? "✓" : undefined, apagada: fuera }, tamano: compacto ? "2.6em" : "3.8em" }), _jsxs("span", { className: "nv-tj-txt", children: [_jsxs("span", { className: "nv-tj-nom dsp", children: [p.nombre, id === yo && _jsx("small", { children: " (t\u00FA)" })] }), _jsx("b", { className: "nv-tj-palabra dsp", children: actual ?? (turno ? "hablando…" : fuera ? "fuera" : "") }, actual ?? "-"), antes.length > 0 && _jsx("small", { className: "nv-tj-antes", children: antes.join(" · ") })] })] }) : _jsxs(_Fragment, { children: [_jsx(Burbuja, { p: { ...p, insignia: voto ? "✓" : undefined }, tamano: compacto ? "2.9em" : "4.6em" }), _jsxs("span", { className: "nv-tj-nom dsp", children: [p.nombre, id === yo && _jsx("small", { children: " (t\u00FA)" })] })] }), fuera ? [] : bloques(id), (sale ? " sale" : "") + (id === yo ? " yo" : "") + (sala ? " ancha" : "") + (turno ? " turno" : "") + (fuera ? " fuera" : ""), !!elegir && id !== yo && !im.eliminados.includes(id));
            }), conNadie && tarjeta(SALTAR_VOTO, _jsxs(_Fragment, { children: [_jsx("span", { className: "nv-nadie", "aria-hidden": "true", style: { "--arte": arteNave("boton-saltar") } }), _jsx("span", { className: "nv-tj-nom dsp", children: "Nadie" })] }), bloques(SALTAR_VOTO), " nadie", !!elegir)] }));
}
/** Con papeles, si la partida acabó, después de la expulsión va la pantalla de Victoria (se puede saltar tocándola). */
export const DURA_VICTORIA = 6500;
export function usePasoExpulsion(v) {
    const [paso, setPaso] = useState("nada");
    useEffect(() => {
        if (v.fase !== "revelada" || !esNave(v)) {
            setPaso("nada");
            return;
        }
        setPaso("vuela");
        const victoria = !!v.impostor?.palabras && !!revNave(v).fin;
        const t1 = setTimeout(() => setPaso(victoria ? "victoria" : "listo"), DURA_EXPULSION);
        const t2 = victoria ? setTimeout(() => setPaso(p => (p === "victoria" ? "listo" : p)), DURA_EXPULSION + DURA_VICTORIA) : undefined;
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [v.fase, v.ronda]); // eslint-disable-line react-hooks/exhaustive-deps
    return [paso, () => setPaso(p => (p === "victoria" ? "listo" : p))];
}
/** La expulsión: se abre la compuerta y la figura sale girando al espacio. Sin expulsado, la compuerta no se abre. */
export function ExpulsionNave({ v, miembros, modo }) {
    // En el celular va sobre toda la pantalla: se dibuja en la raíz .D (dentro de un panel quedaba recortada).
    const ancla = useRef(null);
    const [raiz, setRaiz] = useState(null);
    useEffect(() => { if (modo === "celular")
        setRaiz(ancla.current?.closest(".D") ?? null); }, [modo]);
    const capa = _jsx(CapaExpulsion, { v: v, miembros: miembros, modo: modo });
    if (modo === "tv")
        return capa;
    return _jsx("span", { ref: ancla, hidden: true, children: raiz && createPortal(capa, raiz) });
}
function CapaExpulsion({ v, miembros, modo }) {
    if (v.impostor?.palabras)
        return _jsx(ExpulsionEspacio, { v: v, miembros: miembros, modo: modo });
    const r = revNave(v);
    const d = desenlaceImpostor(v);
    const p = r.eliminado ? persona(v, miembros, r.eliminado) : null;
    const marca = !r.eliminado ? null : r.secreto ? "¿?" : r.eraImpostor ? "Impostor" : "Civil";
    return (_jsxs("div", { className: `nv-exp ${modo}` + (p ? "" : " cerrada"), role: "status", "aria-live": "polite", children: [_jsxs("div", { className: "nv-espacio", style: { "--arte": arteNave("nave-espacio") }, "aria-hidden": "true", children: [_jsx("i", {}), _jsx("i", {}), _jsx("i", {})] }), _jsx("div", { className: "nv-compuerta", style: { "--arte": arteNave("nave-compuerta") }, "aria-hidden": "true" }), p && (v.impostor?.palabras
                ? _jsx("div", { className: "nv-vuela tres", "aria-hidden": "true", children: _jsx(Escena3D, { modo: "vuelo", figuras: [{ ...enEscena(p.id, p.figura ?? null), color: p.color?.base }], className: "nv-vuela-3d" }) })
                : _jsx("div", { className: "nv-vuela", style: varsColor(p.color), "aria-hidden": "true", children: _jsx(Burbuja, { p: p, tamano: modo === "tv" ? "11em" : "7em" }) })), _jsxs("div", { className: "nv-exp-txt", children: [_jsx("span", { className: "nv-exp-t dsp ol", children: d.titular }), marca && _jsx("span", { className: "nv-marca dsp" + (r.eraImpostor && !r.secreto ? " imp" : ""), children: marca }), d.detalle && !r.fin && _jsx("p", { children: d.detalle })] })] }));
}
/** Final de la nave: ganadores al frente, la palabra, quiénes eran y el castigo de cada perdedor. */
export function FinNave({ v, miembros, modo, yo, sinCastigos }) {
    const r = revNave(v);
    const imps = r.impostores ?? [];
    const ganan = v.jugadores.map(j => j.id).filter(id => imps.includes(id) === (r.fin === "impostores"));
    const d = desenlaceImpostor(v);
    const tam = modo === "tv" ? (ganan.length > 5 ? "6em" : "7.5em") : "3.6em";
    return (_jsxs("section", { className: `nv-fin ${modo} ` + (r.fin === "impostores" ? "rojo" : "salva"), "aria-label": "Final de la partida", children: [_jsx("span", { className: "nv-fin-arte", style: { "--arte": arteNave(r.fin === "impostores" ? "nave-ganan-impostores" : "nave-ganan-civiles") }, "aria-hidden": "true" }), _jsx("span", { className: "nv-fin-t dsp ol", children: d.titular }), _jsx("ul", { className: "nv-fin-ganan", "aria-label": "Ganadores", children: ganan.map(id => _jsx("li", { children: _jsx(Burbuja, { p: persona(v, miembros, id), tamano: tam, conNombre: true, seleccionada: id === yo }) }, id)) }), _jsx("p", { className: "nv-fin-det", children: d.detalle }), !sinCastigos && _jsx(CastigosNave, { v: v, miembros: miembros, modo: modo, yo: yo })] }));
}
/** Castigo de cada perdedor (si se eligió castigo): en el final de la TV y en su página del celular. */
export function CastigosNave({ v, miembros, modo, yo }) {
    const r = revNave(v);
    const imps = r.impostores ?? [];
    const castigos = Object.entries(r.castigos ?? {});
    if (!castigos.length)
        return null;
    return (_jsxs("div", { className: "nv-castigos", children: [_jsxs("span", { className: "nv-castigos-t dsp", children: ["Castigo para ", r.fin === "impostores" ? "los civiles" : imps.length > 1 ? "los impostores" : "el impostor"] }), _jsx("ul", { children: castigos.map(([id, { texto, trago }]) => {
                    const p = persona(v, miembros, id);
                    return (_jsxs("li", { className: id === yo ? "yo" : "", style: varsColor(p.color), children: [_jsx(Burbuja, { p: p, tamano: modo === "tv" ? "3.4em" : "2.6em" }), _jsxs("span", { children: [_jsx("b", { className: "dsp", children: p.nombre }), _jsx("small", { children: texto })] }), _jsx("span", { className: "nv-castigo-ico", style: { "--arte": arteNave(trago ? "castigo-trago" : "castigo-leve") }, "aria-hidden": "true" })] }, id));
                }) }), _jsx("small", { className: "nv-castigos-nota", children: "No da ni quita puntos. Quien no quiera hacerlo, no lo hace." })] }));
}
/** Curva del vuelo (igual a `uVuelo` de public/minifig/escena.js): fracción del ancho donde va el centro de la figura. */
const uVuelo = (d) => -0.18 + 1.36 * (0.55 * d + 0.45 * (1 - Math.pow(1 - d, 2)));
const DUR_VUELO = 5000;
/**
 * Expulsión con papeles (Elías, 24 nov, con cuadros de referencia): espacio negro con estrellas; la figura, chica, sale
 * disparada desde la izquierda a la altura del texto, gira y se pierde a la derecha. A su paso quedan escritas las
 * letras «Laura no era el impostor.» (blanco) o «Laura era el impostor.» con «impostor» en rojo. Luego, a máquina,
 * «Quedan N impostores.». Sin expulsado o con secreto, el texto se escribe solo.
 */
function ExpulsionEspacio({ v, miembros, modo }) {
    const r = revNave(v);
    const p = r.eliminado ? persona(v, miembros, r.eliminado) : null;
    const varios = (v.impostor?.total ?? 1) > 1;
    // Partes de la frase: la palabra «impostor» va en rojo cuando sí lo era.
    const partes = !p ? [{ t: "Nadie salió de la nave." }]
        : r.secreto ? [{ t: `${p.nombre} salió de la nave.` }]
            : [{ t: `${p.nombre} ${r.eraImpostor ? "era" : "no era"} ${varios ? "un" : "el"} ` }, { t: "impostor", rojo: !!r.eraImpostor }, { t: "." }];
    const frase = partes.map(x => x.t).join("");
    const quedan = !p || r.secreto || r.quedan == null ? null : r.quedan === 1 ? "Queda 1 impostor." : `Quedan ${r.quedan} impostores.`;
    const caja = useRef(null);
    const linea1 = useRef(null), linea2 = useRef(null);
    // Avance real de la figura (lo manda la escena 3D en cada cuadro). Si no llega en 2.6 s, las letras van por tiempo.
    const avance = useRef(null);
    useEffect(() => {
        const t0 = performance.now();
        let id = 0, fin1 = null, respaldo = null;
        const paso = () => {
            const c = caja.current, l1 = linea1.current, l2 = linea2.current;
            if (!c || !l1)
                return;
            const ahora = performance.now();
            if (p && avance.current == null && respaldo == null && ahora - t0 > 2600)
                respaldo = ahora;
            const x0 = c.getBoundingClientRect().left;
            // Con figura: la letra aparece cuando el centro de la figura ya pasó sobre ella. Sin figura: una cada 55 ms.
            const d = avance.current ?? (respaldo != null ? Math.min(1, (ahora - respaldo) / DUR_VUELO) : null);
            const borde = !p ? null : d == null ? -1 : uVuelo(d) * c.clientWidth;
            let todas = true;
            l1.querySelectorAll("i").forEach((el, n) => {
                const b = el.getBoundingClientRect();
                const ver = borde != null ? b.left + b.width / 2 - x0 < borde : ahora - t0 > 500 + n * 55;
                if (ver)
                    el.classList.add("on");
                else
                    todas = false;
            });
            if (todas && fin1 == null)
                fin1 = ahora;
            // Segunda línea, a máquina, cuando termina la primera.
            let todas2 = true;
            if (l2)
                l2.querySelectorAll("i").forEach((el, n) => { if (fin1 != null && ahora - fin1 > 350 + n * 45)
                    el.classList.add("on");
                else
                    todas2 = false; });
            if (todas && todas2)
                return;
            id = requestAnimationFrame(paso);
        };
        id = requestAnimationFrame(paso);
        return () => cancelAnimationFrame(id);
    }, [p]);
    const letras = (t, clase) => [...t].map((ch, n) => _jsx("i", { className: clase, children: ch === " " ? " " : ch }, n));
    return (_jsxs("div", { ref: caja, className: `nv-xe ${modo}`, role: "status", "aria-live": "polite", "aria-label": frase + (quedan ? " " + quedan : ""), children: [_jsxs("div", { className: "nv-xe-cielo", "aria-hidden": "true", children: [_jsx("b", {}), _jsx("b", {})] }), _jsxs("p", { className: "nv-xe-txt", "aria-hidden": "true", children: [_jsx("span", { ref: linea1, children: partes.map((x, n) => _jsx("span", { className: x.rojo ? "rojo" : undefined, children: letras(x.t) }, n)) }), quedan && _jsxs(_Fragment, { children: [_jsx("br", {}), _jsx("span", { ref: linea2, children: letras(quedan) })] })] }), p && _jsx("div", { className: "nv-xe-fig", "aria-hidden": "true", children: _jsx(Escena3D, { modo: "vuelo", figuras: [{ ...enEscena(p.id, p.figura ?? null), color: p.color?.base }], className: "nv-xe-3d", alVolar: d => { avance.current = d; } }) })] }));
}
/**
 * Victoria (Elías, 24 nov): justo después de la expulsión que acaba la partida. Letrero «Victoria» arriba y, abajo, los
 * ganadores como minifiguras quietas de frente, en formación sobre un piso que brilla (turquesa civiles, rojo impostores).
 */
export function VictoriaNave({ v, miembros, modo, alSaltar }) {
    const r = revNave(v);
    const imps = r.impostores ?? [];
    const ganan = v.jugadores.map(j => j.id).filter(id => imps.includes(id) === (r.fin === "impostores"));
    const rojo = r.fin === "impostores";
    const quien = rojo ? (imps.length > 1 ? "de los impostores" : "del impostor") : "de los civiles";
    const capa = (_jsxs("div", { className: `nv-vic ${modo}` + (rojo ? " rojo" : ""), role: "status", "aria-live": "assertive", "aria-label": `Victoria ${quien}`, onClick: alSaltar, children: [_jsxs("div", { className: "nv-xe-cielo", "aria-hidden": "true", children: [_jsx("b", {}), _jsx("b", {})] }), _jsxs("div", { className: "nv-vic-t", children: [_jsx("b", { className: "dsp", children: "Victoria" }), _jsx("small", { children: quien })] }), _jsxs("div", { className: "nv-vic-figs", "aria-hidden": "true", children: [_jsx("span", { className: "nv-vic-piso" }), _jsx(Escena3D, { figuras: ganan.map(id => ({ ...enEscena(id, miembros.find(m => m.id === id)?.figura ?? null) })), sinPedestal: true, className: "nv-vic-3d" })] }), _jsx("ul", { className: "nv-vic-nombres", "aria-label": "Ganadores", children: ganan.map(id => _jsx("li", { style: varsColor(colorDe(id, v.jugadores.map(j => j.id))), children: nombreDe(v, id) }, id)) }), alSaltar && _jsx("small", { className: "nv-vic-toca", children: "Toca para continuar" })] }));
    return modo === "tv" ? capa : _jsx(EnRaiz, { children: capa });
}
/** En el celular, las capas de pantalla completa se dibujan en la raíz .D (dentro de un panel quedaban recortadas). */
function EnRaiz({ children }) {
    const ancla = useRef(null);
    const [raiz, setRaiz] = useState(null);
    useEffect(() => { setRaiz(ancla.current?.closest(".D") ?? null); }, []);
    return _jsx("span", { ref: ancla, hidden: true, children: raiz && createPortal(children, raiz) });
}
