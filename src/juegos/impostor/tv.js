import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// El impostor con eliminación en la Pantalla (TV o laptop). Recibe SOLO la vista pública:
// los personajes de quienes siguen en juego, cada uno con su color, y la palabra que dijo en la vuelta.
// Quien tiene el turno pasa al frente. Al votar, quien sale se queda con su sello y en la vuelta siguiente ya no está.
import { useEffect, useState } from "react";
import { Cartel, Onomatopeya } from "../../ds";
import { colorDe, varsColor } from "../../app/colorJugador";
import { Escena3D, enEscena } from "../../app/figura3d";
import { NombreJugador } from "../../pantallas/comun";
import { Burbuja } from "../../pantallas/Identidad";
import { desenlaceImpostor, nombreDe, nombreJuego } from "../general/texto";
import { RelojTurno } from "../general/RelojTurno";
import { ExpulsionNave, FinNave, TableroVotos, VictoriaNave, arteNave, esNave, revNave, usePasoExpulsion } from "./nave";
import { AnuncioDiscusion, useAnuncioDiscusion } from "./papelNave";
import { MesaPalabras, PizarraVotos } from "./mesaNave";
import "./impostor.css";
const COLOR_ESCENARIO = { alverca: "#22E1FF", fogata: "#FFC23D", parque: "#C6FF3D" };
export function TvImpostor({ v, miembros }) {
    return esNave(v) ? _jsx(TvNave, { v: v, miembros: miembros }) : _jsx(TvImpostorClasico, { v: v, miembros: miembros });
}
/**
 * La nave (Elías, 24 nov): arriba la pantalla de la asamblea (palabras de la vuelta, votos o resultado); abajo la mesa
 * en 3D con cada figura sentada en su silla y el botón al centro, que late mientras se vota. Al revelar, el expulsado
 * se levanta y sale volando; luego la compuerta y el espacio. Al final, ganadores y castigos.
 */
function TvNave({ v, miembros }) {
    const im = v.impostor;
    const ids = v.jugadores.map(j => j.id);
    const r = revNave(v);
    const revelada = v.fase === "revelada";
    const [paso, saltarVictoria] = usePasoExpulsion(v);
    const figura = (id) => miembros.find(m => m.id === id)?.figura;
    const enMesa = ids.filter(id => !im.eliminados.includes(id) || (revelada && r.eliminado === id));
    const habla = !revelada && im.etapa === "pistas" ? v.turnoDe : undefined;
    // Papeles en la mesa (Elías, 24 nov): tablero con palabras, quién ya vio su papel y «¡A discutir!».
    const sala = !!im.palabras;
    const anuncio = useAnuncioDiscusion(v);
    // La figura sale volando un momento después de mostrar el conteo.
    const [vuela, setVuela] = useState(null);
    useEffect(() => {
        if (!revelada || !r.eliminado) {
            setVuela(null);
            return;
        }
        const t = setTimeout(() => setVuela(r.eliminado ?? null), 1300);
        return () => clearTimeout(t);
    }, [revelada, v.ronda]); // eslint-disable-line react-hooks/exhaustive-deps
    const figuras = enMesa.map(id => ({ ...enEscena(id, figura(id)), color: colorDe(id, ids)?.base, columna: ids.indexOf(id), foco: id === habla }));
    const momentos = revelada
        ? (r.fin ? enMesa.map(id => ({ id, n: v.ronda, cual: ((r.impostores ?? []).includes(id) === (r.fin === "impostores") ? "victoria" : "derrota") })) : [])
        : im.etapa === "votar" ? v.contestaron.map(id => ({ id, n: v.ronda, cual: "saludar" })) : [];
    const tema = v.carta?.texto ?? "";
    const faltan = im.etapa === "votar" ? v.esperados.filter(j => !v.contestaron.includes(j)).length : 0;
    const d = revelada ? desenlaceImpostor(v) : null;
    const vistos = im.vistos ?? [];
    const titulo = im.etapa === "papeles" ? `Hay ${im.total} ${im.total === 1 ? "impostor" : "impostores"} a bordo`
        : revelada ? d.titular : im.etapa === "votar" ? "¡Asamblea en la nave!" : `Le toca a ${nombreDe(v, v.turnoDe)}`;
    const sub = im.etapa === "papeles" ? `Cada quien mira su papel en su celular · ${vistos.length} de ${ids.length} listos`
        : revelada ? (r.fin ? "" : d.detalle ?? "") : im.etapa === "votar" ? `¿Quién se baja de la nave? Voten en su celular · faltan ${faltan}` : "Dice su palabra en voz alta y la escribe en su celular";
    const kick = im.etapa === "papeles" ? `Categoría: ${tema}`
        : `Vuelta ${v.ronda} · Tema: ${tema} · ${im.total} ${im.total === 1 ? "impostor" : "impostores"}${im.nave?.votos === "secretos" ? " · votos secretos" : ""}`;
    // Papeles en la mesa (Elías, 24 nov): como el celular, el cuarto visto desde arriba a pantalla completa con la mesa 3D y
    // la palabra de cada quien sobre su cabeza; arriba una franja con lo que pasa; al votar (y al ver los votos), la pizarra.
    if (sala) {
        const conPizarra = im.etapa === "votar" || (revelada && paso === "listo" && !r.fin);
        const pie = revelada ? _jsx("p", { className: "nm-estado", children: d?.detalle ?? "" }) : _jsxs("p", { className: "nm-estado", children: ["Voten en su celular \u00B7 faltan ", faltan] });
        return (_jsxs("div", { className: "nv-tv nm-tv", style: { "--cuarto": arteNave("nave-cuarto") }, children: [_jsx(MesaPalabras, { v: v, miembros: miembros, yo: "", tv: true, enMesa: enMesa, momentos: momentos, expulsar: vuela, golpe: anuncio }), _jsxs("header", { className: "nm-tv-cab", children: [_jsx("span", { className: "nv-kick", children: kick }), _jsx("span", { className: "nm-tv-t dsp ol", children: titulo }), sub && _jsx("span", { className: "nv-pant-sub", children: sub }), _jsx(RelojTurno, { v: v, size: "3.4em" })] }), im.etapa === "papeles" && (_jsx("ol", { className: "nv-vistos-tv nm-tv-vistos", "aria-label": "Qui\u00E9n ya vio su papel", children: ids.map(id => _jsx("li", { className: vistos.includes(id) ? "si" : "", children: _jsx(Burbuja, { p: { id, nombre: nombreDe(v, id), figura: figura(id), color: colorDe(id, ids), insignia: vistos.includes(id) ? "✓" : undefined }, tamano: "4em", conNombre: true }) }, id)) })), conPizarra && _jsx(PizarraVotos, { v: v, miembros: miembros, yo: "", sel: null, alElegir: () => { }, alVotar: () => { }, puedo: false, miVoto: null, tv: true, titulo: revelada ? d.titular : "¿Quién es el impostor?", pie: pie }), anuncio && _jsx(AnuncioDiscusion, { modo: "tv" }), paso === "vuela" && _jsx(ExpulsionNave, { v: v, miembros: miembros, modo: "tv" }), paso === "victoria" && _jsx(VictoriaNave, { v: v, miembros: miembros, modo: "tv", alSaltar: saltarVictoria }), r.fin && paso === "listo" && _jsx(FinNave, { v: v, miembros: miembros, modo: "tv" })] }));
    }
    return (_jsxs("div", { className: "nv-tv" + (r.fin === "impostores" && paso === "listo" ? " alarma" : ""), style: { "--ventana": arteNave("nave-espacio") }, children: [_jsxs("section", { className: "nv-pantalla", "aria-label": "Pantalla de la asamblea", children: [_jsxs("header", { className: "nv-pant-cab", children: [_jsx("span", { className: "nv-kick", children: kick }), _jsx("span", { className: "nv-pant-t dsp ol", children: titulo }), sub && _jsx("span", { className: "nv-pant-sub", children: sub }), _jsx(RelojTurno, { v: v, size: "4em" })] }), im.etapa === "papeles" ? (_jsx("ol", { className: "nv-vistos-tv", "aria-label": "Qui\u00E9n ya vio su papel", children: ids.map(id => _jsx("li", { className: vistos.includes(id) ? "si" : "", children: _jsx(Burbuja, { p: { id, nombre: nombreDe(v, id), figura: figura(id), color: colorDe(id, ids), insignia: vistos.includes(id) ? "✓" : undefined }, tamano: "4em", conNombre: true }) }, id)) })) : sala ? _jsx(TableroVotos, { v: v, miembros: miembros }) : !revelada && im.etapa === "pistas" ? (_jsx("ol", { className: "nv-palabras", "aria-label": "Palabras de la vuelta", children: im.orden.map(id => {
                            const c = colorDe(id, ids);
                            const dijo = v.pistas[id];
                            return (_jsxs("li", { className: (id === v.turnoDe ? "turno" : "") + (dijo ? " dijo" : ""), style: varsColor(c), children: [_jsx(Burbuja, { p: { id, nombre: nombreDe(v, id), figura: figura(id), color: c }, tamano: "3.2em" }), _jsxs("span", { children: [_jsx("b", { className: "dsp", children: nombreDe(v, id) }), _jsx("em", { className: "dsp", children: dijo ?? (id === v.turnoDe ? "hablando…" : "") })] })] }, id));
                        }) })) : _jsx(TableroVotos, { v: v, miembros: miembros })] }), _jsx(Escena3D, { modo: "nave", figuras: figuras, columnas: ids.length, asientos: ids.map(id => colorDe(id, ids)?.base ?? "#4a5687"), boton: !revelada && im.etapa === "votar" ? "votar" : anuncio ? "golpe" : "quieto", expulsar: vuela, momentos: momentos, className: "nv-3d" }), anuncio && _jsx(AnuncioDiscusion, { modo: "tv" }), im.eliminados.length > 0 && !(revelada && im.eliminados.length === 1 && r.eliminado) && (_jsxs("p", { className: "nv-fuera", children: ["Fuera de la nave: ", im.eliminados.filter(j => !(revelada && j === r.eliminado)).map(j => nombreDe(v, j)).join(", ")] })), paso === "vuela" && _jsx(ExpulsionNave, { v: v, miembros: miembros, modo: "tv" }), paso === "victoria" && _jsx(VictoriaNave, { v: v, miembros: miembros, modo: "tv", alSaltar: saltarVictoria }), r.fin && paso === "listo" && _jsx(FinNave, { v: v, miembros: miembros, modo: "tv" })] }));
}
function TvImpostorClasico({ v, miembros }) {
    const im = v.impostor;
    const ids = v.jugadores.map(j => j.id);
    const revelada = v.fase === "revelada";
    const r = (v.revelado ?? {});
    // En escena: quienes siguen. Al revelar, el eliminado todavía se ve (con su sello) hasta la vuelta siguiente.
    const enEscena_ = ids.filter(id => !im.eliminados.includes(id) || (revelada && r.eliminado === id));
    const habla = !revelada && im.etapa === "pistas" ? v.turnoDe : undefined;
    const figuras = enEscena_.map((id, i) => ({ ...enEscena(id, miembros.find(m => m.id === id)?.figura), color: colorDe(id, ids)?.base, columna: i, foco: id === habla }));
    const momentos = revelada
        ? enEscena_.map(id => ({ id, n: v.ronda, cual: (r.fin ? (r.impostores ?? []).includes(id) === (r.fin === "impostores") : id !== r.eliminado) ? "victoria" : "derrota" }))
        : [];
    const d = revelada ? desenlaceImpostor(v) : null;
    const sub = revelada ? d.titular : im.etapa === "votar" ? "¡A votar en su celular!" : `Le toca a ${nombreDe(v, v.turnoDe)}`;
    const estilo = { "--lugares": enEscena_.length, "--esc": COLOR_ESCENARIO[v.escenario ?? ""] ?? "#5fb4ff" };
    return (_jsxs("div", { className: "im-tv" + (v.escenario ? ` esc-${v.escenario}` : ""), style: estilo, children: [_jsxs("div", { className: "im-tv-cab", children: [_jsx(Cartel, { titulo: nombreJuego(v.juegoId), sub: sub }), _jsxs("div", { className: "im-tv-datos", children: [_jsxs("span", { className: "dsp ol", children: ["Vuelta ", v.ronda] }), _jsxs("small", { children: ["Tema: ", v.carta?.texto ?? "", " \u00B7 ", im.total, " ", im.total === 1 ? "impostor" : "impostores"] }), _jsx(RelojTurno, { v: v, size: "4.5em" })] })] }), _jsxs("div", { className: "im-tv-escena" + (enEscena_.length > 5 ? " muchos" : ""), children: [_jsx("div", { className: "im-tv-cols", "aria-hidden": "true", children: enEscena_.map(id => _jsx("div", { className: "im-tv-col" + (id === habla ? " habla" : "") + (revelada && id === r.eliminado ? " sale" : ""), style: varsColor(colorDe(id, ids)) }, id)) }), _jsx(Escena3D, { modo: "sala", figuras: figuras, columnas: enEscena_.length, momentos: momentos, className: "im-tv-3d" }), _jsx("ul", { className: "im-tv-rotulos", "aria-label": "Jugadores en escena", children: enEscena_.map(id => {
                            const c = colorDe(id, ids);
                            const dijo = v.pistas[id];
                            const voto = !revelada && im.etapa === "votar" && v.contestaron.includes(id);
                            return (_jsxs("li", { className: "im-tv-rot" + (id === habla ? " habla" : "") + (revelada && id === r.eliminado ? " sale" : ""), style: varsColor(c), children: [_jsx("span", { className: "im-pn dsp", children: c?.etiqueta }), dijo && _jsx("span", { className: "im-globo dsp", children: dijo }, dijo), !dijo && id === habla && _jsx("span", { className: "im-globo dsp pensando", children: "\u2026" }), voto && _jsx("span", { className: "im-voto dsp", "aria-label": "Ya vot\u00F3", children: "\u2713" }), revelada && r.votos && (r.votos[id] ?? 0) > 0 && _jsxs("span", { className: "im-votos dsp ol", children: [r.votos[id], " ", r.votos[id] === 1 ? "voto" : "votos"] }), revelada && id === r.eliminado && _jsx("span", { className: "im-sello dsp ol", children: r.eraImpostor ? "¡Impostor!" : "Fuera" }), _jsx("span", { className: "im-tv-nom", children: _jsx(NombreJugador, { nombre: nombreDe(v, id), figura: miembros.find(m => m.id === id)?.figura }) })] }, id));
                        }) })] }), revelada && d?.detalle && _jsx("p", { className: "dsp ol im-tv-detalle", children: d.detalle }), revelada && r.fin && _jsx(Onomatopeya, { texto: r.fin === "civiles" ? "¡ATRAPADOS!" : "¡ESCAPARON!", color: "var(--amarillo)", tamano: "4em", giro: -8, style: { position: "absolute", top: "44%", left: "50%", translate: "-50% 0", zIndex: 5, pointerEvents: "none" } }), im.eliminados.length > 0 && !(revelada && im.eliminados.length === 1 && r.eliminado) && (_jsxs("p", { className: "im-tv-fuera", children: ["Fuera de escena: ", im.eliminados.filter(j => !(revelada && j === r.eliminado)).map(j => nombreDe(v, j)).join(", ")] })), revelada && v.votosDe && _jsx("p", { className: "a-tv-votos", children: Object.entries(v.votosDe).map(([de, a]) => `${nombreDe(v, de)} → ${nombreDe(v, a)}`).join("   ·   ") })] }));
}
