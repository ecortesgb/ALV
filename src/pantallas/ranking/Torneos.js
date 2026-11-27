import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Pestaña «Torneos» del Ranking (migración 041; Maestro v1.54, T13).
// (a) Torneo de la noche: las copas de la sala en la que estás, en vivo (engine/copas.ts con el historial de la sala).
// (b) Torneos que abre el administrador: tabla por Puntos ALV, tiempo restante y «a N PA de subir».
// Sin rondas ni llaves (etapa 3 si se piden).
import { useEffect, useMemo, useState } from "react";
import { calcularCopas, esResultado } from "../../engine/copas";
import { enlace } from "../../servicios/enlace";
import { VOTOS, votarNoche, votosDeLaNoche } from "../../servicios/ranking";
import { cancelarTorneo, crearTorneo, cuentaRegresiva, tablaTorneo, torneosVigentes } from "../../servicios/torneos";
import { aviso } from "../comun";
import { arteHub } from "../azotea/Cabecera";
import { Arte, Fila, Podio } from "./Ranking";
const MODALIDAD = { todas: "Todas las partidas", individual: "Individual", parejas: "Parejas", equipos: "Equipos" };
export function Torneos({ yo, admin }) {
    const [lista, setLista] = useState(undefined);
    const [abierto, setAbierto] = useState(null);
    const [, setTic] = useState(0);
    const cargar = () => torneosVigentes().then(l => { setLista(l); if (l && !abierto)
        setAbierto(l.find(t => t.estado === "activo")?.id ?? null); });
    useEffect(() => { void cargar(); }, []);
    // La cuenta regresiva se mueve sola.
    useEffect(() => { const t = setInterval(() => setTic(n => n + 1), 30000); return () => clearInterval(t); }, []);
    return (_jsxs(_Fragment, { children: [_jsx(TorneoNoche, { yo: yo }), lista === undefined ? _jsx("p", { className: "rk-cargando", role: "status", children: "Buscando torneos\u2026" })
                : lista === null ? _jsx("p", { className: "rk-cargando", role: "status", children: "No se pudieron leer los torneos. Revisa tu conexi\u00F3n." })
                    : !lista.length ? _jsx("section", { className: "pf-bloque rk-vacio", children: _jsxs("p", { className: "pf-suave", children: ["No hay torneos abiertos. ", admin ? "Abre uno abajo." : "Cuando el administrador abra uno, aparece aquí."] }) })
                        : lista.map(t => (_jsx(TarjetaTorneo, { t: t, yo: yo, admin: admin, abierto: abierto === t.id, alAbrir: () => setAbierto(a => (a === t.id ? null : t.id)), alCancelar: async () => { if (await cancelarTorneo(t.id)) {
                                aviso("Torneo cancelado.");
                                void cargar();
                            }
                            else
                                aviso("No se pudo cancelar."); } }, t.id))), admin && _jsx(NuevoTorneo, { alCrear: () => void cargar() })] }));
}
/** Copas de la sala en la que estás: se recalculan cada 20 s con lo que ya terminó. */
function TorneoNoche({ yo }) {
    const [sala, setSala] = useState(undefined);
    const [hist, setHist] = useState([]);
    useEffect(() => { let v = true; void enlace.miSala().then(x => { if (v)
        setSala(x); }); return () => { v = false; }; }, []);
    useEffect(() => {
        if (!sala)
            return;
        let v = true;
        const leer = () => enlace.historial(sala).then(h => { if (v)
            setHist(h); });
        void leer();
        const t = setInterval(leer, 20000);
        return () => { v = false; clearInterval(t); };
    }, [sala?.id]);
    const filas = useMemo(() => {
        const rs = hist.filter(esResultado);
        if (!rs.length)
            return [];
        const c = calcularCopas(rs), nombres = new Map(rs.flatMap(r => r.jugadores.map(j => [j.id, j.nombre])));
        const orden = Object.entries(c.totales).sort((a, b) => b[1] - a[1]);
        let lugar = 0, previo = null;
        return orden.map(([id, pts], i) => {
            if (pts !== previo) {
                lugar = i + 1;
                previo = pts;
            }
            return { posicion: lugar, lugar, valor: pts, id, nombre: nombres.get(id) ?? "Jugador", nivel: 1, figura: null, puntos_alv: pts, victorias: 0, partidas: rs.length,
                mvp: 0, racha: 0, juegos: 0, victorias_azar: 0, victorias_deduccion: 0 };
        });
    }, [hist]);
    if (!sala)
        return null;
    return (_jsxs("section", { className: "pf-bloque rk-tabla-caja rk-noche", "aria-label": "Torneo de la noche", children: [_jsxs("h2", { className: "pf-tit", children: [_jsx("span", { children: "Torneo de la noche" }), _jsxs("small", { className: "rk-periodo", children: ["Sala ", sala.codigo, " \u00B7 en vivo"] })] }), !filas.length ? _jsx("p", { className: "pf-suave", children: "Todav\u00EDa no termina ning\u00FAn juego en esta sala. La tabla se arma sola al terminar el primero." }) : (_jsx("ol", { className: "rk-tabla", children: filas.map(f => _jsx(Fila, { f: f, unidad: "pts", yo: yo }, f.id)) })), _jsx("p", { className: "rk-nota", children: "Suma los puntos de cada juego de esta noche. Las copas se entregan al cerrar la sala." }), _jsx(VotosNoche, { evento: sala.id, yo: yo, gente: filas.map(f => ({ id: f.id, nombre: f.nombre })) })] }));
}
function TarjetaTorneo({ t, yo, admin, abierto, alAbrir, alCancelar }) {
    const [tabla, setTabla] = useState(undefined);
    useEffect(() => { if (abierto && tabla === undefined)
        void tablaTorneo(t.id).then(setTabla); }, [abierto]);
    const filas = (tabla ?? []).map(f => ({ ...f, lugar: f.posicion, valor: f.puntos_alv, mvp: 0, racha: 0, juegos: 0, victorias_azar: 0, victorias_deduccion: 0 }));
    const mia = filas.find(f => f.id === yo);
    const arriba = mia && mia.lugar > 1 ? filas.filter(f => f.valor > mia.valor).at(-1) : undefined;
    return (_jsxs("section", { className: `pf-bloque rk-torneo e-${t.estado}`, "aria-label": t.nombre, children: [_jsxs("button", { type: "button", className: "rk-torneo-cab", onClick: alAbrir, "aria-expanded": abierto, children: [_jsx(Arte, { nombre: "torneo", alterno: arteHub("icono-ranking"), className: "rk-torneo-ico" }), _jsxs("span", { className: "rk-torneo-txt", children: [_jsx("b", { children: t.nombre }), _jsxs("small", { children: [MODALIDAD[t.modalidad], " \u00B7 ", t.participantes, " ", t.participantes === 1 ? "participante" : "participantes", t.premio ? ` · Premio: ${t.premio}` : ""] })] }), _jsx("span", { className: `rk-reloj e-${t.estado}`, children: cuentaRegresiva(t) })] }), t.estado === "terminado" && t.campeones?.length ? _jsxs("p", { className: "rk-campeones", children: [t.campeones.length > 1 ? "Campeones" : "Campeón", ": ", _jsx("b", { children: t.campeones.join(", ") })] }) : null, abierto && (tabla === undefined ? _jsx("p", { className: "rk-cargando", role: "status", children: "Leyendo la tabla\u2026" })
                : tabla === null ? _jsx("p", { className: "rk-cargando", children: "No se pudo leer la tabla." })
                    : !filas.length ? _jsxs("p", { className: "pf-suave", children: ["Todav\u00EDa nadie suma. Cada partida terminada ", t.modalidad === "todas" ? "" : `en ${MODALIDAD[t.modalidad].toLowerCase()} `, "cuenta."] })
                        : _jsxs(_Fragment, { children: [t.estado === "activo" && mia && (mia.lugar === 1 ? _jsx("p", { className: "rk-subir lider", children: "Vas en primer lugar. \u00A1Que no te alcancen!" })
                                    : arriba ? _jsxs("p", { className: "rk-subir", children: ["Est\u00E1s a ", _jsxs("b", { children: [arriba.valor - mia.valor, " PA"] }), " de alcanzar el lugar ", arriba.lugar, "."] }) : null), filas.length >= 3 && _jsx(Podio, { filas: filas.slice(0, 3), unidad: "PA", yo: yo }), _jsxs("ol", { className: "rk-tabla", children: [filas.slice(0, 20).map(f => _jsx(Fila, { f: f, unidad: "PA", yo: yo }, f.id)), mia && mia.lugar > 20 && _jsxs(_Fragment, { children: [_jsx("li", { className: "rk-salto", "aria-hidden": "true", children: "\u00B7\u00B7\u00B7" }), _jsx(Fila, { f: mia, unidad: "PA", yo: yo })] })] })] })), admin && t.estado !== "terminado" && _jsx("button", { type: "button", className: "rk-cancelar", onClick: () => { if (confirm(`¿Cancelar «${t.nombre}»? Desaparece para todos.`))
                    alCancelar(); }, children: "Cancelar torneo" })] }));
}
/** Fin de hoy, en 7 días o fin de mes, en hora de México. */
function finDe(opcion) {
    const ahora = new Date();
    if (opcion === "semana")
        return new Date(ahora.getTime() + 7 * 86400e3);
    const mx = new Date(ahora.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
    const desfase = ahora.getTime() - mx.getTime();
    const objetivo = opcion === "hoy" ? new Date(mx.getFullYear(), mx.getMonth(), mx.getDate() + 1) : new Date(mx.getFullYear(), mx.getMonth() + 1, 1);
    return new Date(objetivo.getTime() + desfase);
}
function NuevoTorneo({ alCrear }) {
    const [abierto, setAbierto] = useState(false);
    const [nombre, setNombre] = useState("");
    const [modalidad, setModalidad] = useState("todas");
    const [duracion, setDuracion] = useState("semana");
    const [premio, setPremio] = useState("");
    const [enviando, setEnviando] = useState(false);
    const enviar = async () => {
        setEnviando(true);
        const error = await crearTorneo(nombre.trim(), modalidad, new Date(), finDe(duracion), premio.trim());
        setEnviando(false);
        if (error) {
            aviso(error);
            return;
        }
        aviso(`Torneo «${nombre.trim()}» abierto.`);
        setNombre("");
        setPremio("");
        setAbierto(false);
        alCrear();
    };
    if (!abierto)
        return _jsx("button", { type: "button", className: "rk-nuevo-boton", onClick: () => setAbierto(true), children: "+ Abrir un torneo" });
    return (_jsxs("section", { className: "pf-bloque rk-nuevo", "aria-label": "Abrir un torneo", children: [_jsxs("h2", { className: "pf-tit", children: [_jsx("span", { children: "Abrir un torneo" }), _jsx("span", { className: "pf-pronto", children: "Solo administrador" })] }), _jsxs("label", { children: ["Nombre", _jsx("input", { value: nombre, maxLength: 60, onChange: e => setNombre(e.target.value), placeholder: "ALV Champions" })] }), _jsxs("label", { children: ["Cuentan las partidas de", _jsx("select", { value: modalidad, onChange: e => setModalidad(e.target.value), children: Object.keys(MODALIDAD).map(m => _jsx("option", { value: m, children: MODALIDAD[m] }, m)) })] }), _jsx("div", { className: "rk-seg", role: "group", "aria-label": "Duraci\u00F3n", children: [["hoy", "Hasta hoy"], ["semana", "7 días"], ["mes", "Fin de mes"]].map(([v, t]) => (_jsx("button", { type: "button", className: duracion === v ? "si" : "", "aria-pressed": duracion === v, onClick: () => setDuracion(v), children: t }, v))) }), _jsxs("label", { children: ["Premio (texto, opcional)", _jsx("input", { value: premio, maxLength: 80, onChange: e => setPremio(e.target.value), placeholder: "Insignia de campe\u00F3n" })] }), _jsx("p", { className: "rk-nota", children: "Empieza ahora. Suma los Puntos ALV de cada partida terminada hasta el final. Al terminar, quien tenga m\u00E1s gana el logro \u00ABCampe\u00F3n\u00BB." }), _jsxs("div", { className: "rk-nuevo-acciones", children: [_jsx("button", { type: "button", className: "rk-cancelar", onClick: () => setAbierto(false), children: "Cancelar" }), _jsx("button", { type: "button", className: "rk-abrir", disabled: enviando || nombre.trim().length < 3, onClick: () => void enviar(), children: enviando ? "Abriendo…" : "Abrir torneo" })] })] }));
}
/** Votación de la noche (043, D6): cada quien vota una vez por categoría y puede cambiar su voto. Nadie ve quién votó. */
function VotosNoche({ evento, yo, gente }) {
    const [conteo, setConteo] = useState(null);
    const [abierta, setAbierta] = useState(null);
    const cargar = () => votosDeLaNoche(evento).then(setConteo);
    useEffect(() => { void cargar(); }, [evento]);
    const otros = gente.filter(g => g.id !== yo);
    if (!otros.length)
        return null;
    const votar = async (c, id) => {
        const error = await votarNoche(evento, c, id);
        if (error) {
            aviso(error);
            return;
        }
        setAbierta(null);
        void cargar();
    };
    return (_jsxs("div", { className: "rk-votacion", children: [_jsx("h3", { children: "Vota por los de esta noche" }), _jsx("div", { className: "rk-votos-lista", children: VOTOS.map(v => {
                    const mio = conteo?.find(x => x.categoria === v.id)?.mi_voto ?? null;
                    const lider = conteo?.filter(x => x.categoria === v.id && x.votado).sort((a, b) => b.votos - a.votos)[0];
                    return (_jsxs("div", { className: "rk-voto" + (abierta === v.id ? " abierta" : ""), children: [_jsxs("button", { type: "button", className: "rk-voto-cab", onClick: () => setAbierta(a => (a === v.id ? null : v.id)), "aria-expanded": abierta === v.id, children: [_jsx("span", { "aria-hidden": "true", children: v.emoji }), _jsx("b", { children: v.titulo }), _jsxs("small", { children: [mio ? `Votaste por ${gente.find(g => g.id === mio)?.nombre ?? "alguien"}` : "Sin votar", lider?.nombre ? ` · Va ganando ${lider.nombre}` : ""] })] }), abierta === v.id && _jsx("div", { className: "rk-voto-opciones", children: otros.map(g => (_jsx("button", { type: "button", className: g.id === mio ? "si" : "", "aria-pressed": g.id === mio, onClick: () => void votar(v.id, g.id), children: g.nombre }, g.id))) })] }, v.id));
                }) })] }));
}
