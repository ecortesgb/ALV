import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// La sala en el celular (#/sala/código): espera, partida y resultados, en un solo lugar.
// El papel es del aparato: aquí siempre se juega. A quien tiene el control le sale además la barra del anfitrión.
// Sin pantalla (modo mesa), el celular del anfitrión también corre el motor y se queda encendido.
import { useEffect, useState } from "react";
import { Chip, Escaner, Panel, Reloj } from "../ds";
import { ir } from "../app/rutas";
import { refrescarSesion, useSesion } from "../app/sesion";
import { sonar } from "../app/sonido";
import { enlace, esLocal, modoLocal } from "../servicios/enlace";
import { LOBBY_NUEVO } from "./lobby/version";
import { FichaJugador } from "./lobby/Ficha";
import { AvisoCuarto, FondoCuarto } from "./lobby/Cuarto";
import { FondoEscenario } from "./Fondos";
import { ComoJugar, tocaExplicar } from "../juegos/general/ComoJugar";
import { HerramientaCelular } from "../juegos/general/celular";
import { EmotesVolando } from "../juegos/general/Emotes";
import { esPublico, marcador, nombreJuego, quedan } from "../juegos/general/texto";
import { control, entregarCopas, jugada, useMotor } from "../roles/pantalla/motor";
import { AnuncioDiscusion, PapelNave, useAnuncioDiscusion } from "../juegos/impostor/papelNave";
import { esFinalDeJuego } from "../juegos/general/Copas";
import { useSala } from "../roles/sala";
import { Marco, aviso, confirmar } from "./comun";
import { colorDe, varsColor } from "../app/colorJugador";
import { MedallonJugador } from "./azotea/Cabecera";
import { Lobby } from "./lobby/Lobby";
import { useColoresSala } from "./lobby/colores";
import { BotonCast } from "./lobby/Cast";
import { MesaJuego } from "./MesaJuego";
import { useGestosSala } from "../servicios/gestosSala";
import { anotarCarta } from "../app/cartasSalieron";
/** Mantiene la pantalla encendida mientras `activo` (la Pantalla y el celular que hace de Pantalla). */
export function useDespierta(activo) {
    useEffect(() => {
        if (!activo || !("wakeLock" in navigator))
            return;
        let cerrojo = null, vivo = true;
        const pedir = () => { void navigator.wakeLock.request("screen").then(c => { if (vivo)
            cerrojo = c;
        else
            void c.release(); }).catch(() => { }); };
        pedir();
        const f = () => { if (document.visibilityState === "visible")
            pedir(); };
        document.addEventListener("visibilitychange", f);
        return () => { vivo = false; document.removeEventListener("visibilitychange", f); void cerrojo?.release(); };
    }, [activo]);
}
/** ¿Está conectada la Pantalla de la sala? `soyPantalla`: este aparato es la Pantalla y se anota. Sin `activo` o sin servidor: «desconocida». */
export function usePantalla(sala, soyPantalla, activo) {
    const [p, setP] = useState("desconocida");
    useEffect(() => {
        setP("desconocida");
        if (!activo || !sala)
            return;
        return enlace.vigilarPantalla(sala, soyPantalla, setP);
    }, [sala?.id, soyPantalla, activo]); // eslint-disable-line react-hooks/exhaustive-deps
    return p;
}
/** Atributo `inert` (React 18 no lo conoce): quita el foco y los toques a todo lo de dentro. */
const inerte = (si) => (si ? { inert: "" } : {});
/** Segundos que quedan, actualizados 4 veces por segundo solo si hay reloj. */
export function useQuedan(v) {
    const [, set] = useState(0);
    const hay = !!v?.reloj && v.fase === "contestando" && !v.pausada;
    useEffect(() => { if (!hay)
        return; const t = setInterval(() => set(x => x + 1), 250); return () => clearInterval(t); }, [hay]);
    return v && hay ? quedan(v) : 0;
}
/** P-03: true cuando ya pasó `fin` (marca de tiempo). Un solo temporizador, sin intervalos. */
export function useVencida(fin) {
    const [, set] = useState(0);
    useEffect(() => {
        if (!fin)
            return;
        const t = setTimeout(() => set(x => x + 1), Math.max(0, fin - Date.now()) + 20);
        return () => clearTimeout(t);
    }, [fin]);
    return !!fin && Date.now() >= fin;
}
export function Conexion({ red }) {
    if (red === "vivo")
        return null;
    return _jsx("span", { className: "a-red", role: "status", children: red === "respaldo" ? "Reconectando…" : "Conectando…" });
}
function XpReto({ v, alDar, cerrar }) {
    const [quien, setQuien] = useState(v.jugadores[0]?.id ?? "");
    return (_jsx("div", { className: "a-velo", onClick: cerrar, children: _jsx(Panel, { className: "a-dialogo a-pila", como: "section", children: _jsxs("div", { onClick: e => e.stopPropagation(), className: "a-pila", children: [_jsx("span", { className: "dsp ol a-t2", children: "XP por reto en vivo" }), _jsx("div", { className: "a-fila a-envuelve", children: v.jugadores.map(j => _jsx(Chip, { texto: j.nombre, seleccionado: quien === j.id, onClick: () => setQuien(j.id) }, j.id)) }), _jsx("div", { className: "a-fila a-envuelve", children: [10, 25, 50, 100].map(x => _jsx("button", { type: "button", className: "d-btn k-grn a-chico", onClick: () => { alDar(quien, x); cerrar(); }, children: _jsxs("span", { className: "dsp", children: ["+", x] }) }, x)) }), _jsx("button", { type: "button", className: "a-plano", onClick: cerrar, children: "Cancelar" })] }) }) }));
}
export function Sala({ codigo }) {
    const ses = useSesion();
    const s = useSala(codigo, ses.uid);
    // Colores del lobby (anfitrión P1 rojo; los demás por entrada y género) y los miembros en orden de lugares.
    const ordenados = useColoresSala(s.sala, s.miembros);
    // Gestos de la figura (rueda de gestos): los ve toda la sala y la TV.
    useGestosSala(s.sala?.id, ses.uid, s.miembros);
    const soyAnfitrion = !!s.sala && s.sala.anfitrionId === ses.uid;
    // Modo Local: un solo teléfono. Juega quien lo tiene en la mano (`enMano`); vacío = el anfitrión.
    const local = esLocal(s.sala?.id);
    const [enMano, setEnMano] = useState("");
    // Local: la pantalla de carga se ve una vez por partida, antes de pasar el teléfono.
    const [cargaVista, setCargaVista] = useState("");
    // Local, El impostor en la nave: quiénes ya vieron su palabra antes de la primera vuelta (Elías, 24 nov).
    // «Ya la vi» nunca va al motor; se guarda en la sesión del navegador para que una recarga no repita la ronda.
    const [vistos, setVistos] = useState({ pid: "", ids: [] });
    const v = s.partida && !s.partida.terminada && esPublico(s.partida.estado) ? s.partida.estado : null;
    // Sin repetir entre noches: el aparato del anfitrión (donde se configura) anota cada carta que sale en la mesa.
    const cartaMesa = soyAnfitrion ? v?.carta?.id : undefined;
    useEffect(() => { anotarCarta(cartaMesa); }, [cartaMesa]);
    const final = s.partida?.terminada && esPublico(s.partida.estado) ? s.partida.estado : null;
    // El impostor en la nave, papeles en la mesa (Elías, 24 nov): «Ya lo vi» se marca al instante y «¡A discutir!» se anuncia.
    const [vistoYo, setVistoYo] = useState("");
    const anuncioNave = useAnuncioDiscusion(v);
    // Relevo: con pantalla, el motor corre en la TV. Si el anfitrión termina la partida, su celular también la procesa,
    // así la partida se cierra aunque la TV se haya apagado o desconectado (antes se quedaba trabada).
    const [relevo, setRelevo] = useState(false);
    const corroMotor = soyAnfitrion && (s.sala?.modo === "mesa" || relevo);
    useMotor(s.sala, s.partida, corroMotor, s.tic, () => void refrescarSesion());
    useDespierta(corroMotor && !!v);
    // Con pantalla (modo tv) la partida solo avanza si la Pantalla está. Sin ella, el celular no deja contestar ni avanzar.
    // ¿Hay una Pantalla conectada? Con ella se juega «en pantalla externa» (Elías, 24 nov); se vigila siempre (no en Local).
    const pantalla = usePantalla(s.sala, false, !!s.sala && !local);
    const sinPantalla = s.sala?.modo === "tv" && !!v && pantalla === "ausente";
    const conPantalla = pantalla === "presente";
    const quedanS = useQuedan(v);
    const esperaVencida = useVencida(v?.fase === "contestando" && !v.pausada ? v.espera?.fin : null);
    const [copando, setCopando] = useState(false), [xpReto, setXpReto] = useState(false);
    const terminada = !!s.partida?.terminada;
    useEffect(() => { if (terminada) {
        sonar("exito");
        void refrescarSesion();
    } }, [terminada, s.partida?.id]);
    useEffect(() => { setRelevo(false); }, [s.partida?.id]);
    // Al volver al lobby (o al cambiar de partida), el teléfono regresa al anfitrión.
    useEffect(() => { if (local && !v) {
        modoLocal.pasarA("");
        setEnMano("");
    } }, [local, !!v, s.partida?.id]); // eslint-disable-line react-hooks/exhaustive-deps
    // Lobby: cada quien marca «¡Listo!» y el anfitrión inicia la partida cuando quiera (Elías, 18 nov).
    const listoYo = !!s.miembros.find(m => m.id === ses.uid)?.listo;
    // El anfitrión anuncia su lobby mientras esté abierto: quien abre ALV entra sin código.
    useEffect(() => { if (!s.sala || !soyAnfitrion)
        return; return enlace.anunciarLobby(s.sala); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [s.sala?.id, soyAnfitrion]);
    // Al empezar una partida, cada quien se quita el «listo» para la siguiente espera.
    const enJuego = !!s.partida && !s.partida.terminada;
    useEffect(() => { if (enJuego && listoYo && s.sala)
        void enlace.marcarListo(s.sala, false).then(s.refrescar); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [enJuego, s.partida?.id, listoYo]);
    const nRuleta = v?.ruleta?.n ?? 0;
    useEffect(() => { if (v?.ruleta && nRuleta > 0)
        aviso(`Ruleta: ${v.jugadores.find(j => j.id === v.ruleta.jugador)?.nombre ?? ""} · ${v.ruleta.texto}`); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [nRuleta]);
    if (s.error)
        return _jsx(AvisoCuarto, { titulo: "No se pudo entrar", texto: s.error, children: _jsx("button", { type: "button", className: "lb-listo", onClick: () => ir("modos"), children: "Volver" }) });
    if (s.cerrada)
        return _jsx(AvisoCuarto, { titulo: "La sala se cerr\u00F3", texto: "El anfitri\u00F3n termin\u00F3 la sesi\u00F3n.", children: _jsx("button", { type: "button", className: "lb-listo", onClick: () => ir("inicio"), children: "Ir al inicio" }) });
    if (!s.sala)
        return _jsx(AvisoCuarto, { titulo: "Entrando al lobby\u2026" });
    const sala = s.sala, pid = s.partida?.id ?? "";
    const salir = async () => {
        const caja = LOBBY_NUEVO ? { lobby: colorDe(ses.uid, s.miembros.map(m => m.id)) } : {};
        if (!(await confirmar(local ? { titulo: "¿Terminar la sesión local?", texto: "Se borran los personajes y las partidas de este teléfono.", si: "Terminar sesión", peligro: true, ...caja }
            : soyAnfitrion ? { titulo: "¿Cerrar la sala?", texto: "Todos salen y la sesión termina.", si: "Cerrar sala", peligro: true, ...caja } : { titulo: "¿Salir de la sala?", si: "Salir", ...caja })))
            return;
        await (soyAnfitrion ? enlace.cerrar(sala) : enlace.salir(sala));
        ir("inicio");
    };
    const terminarPartida = async () => {
        if (!(await confirmar({ titulo: "¿Terminar la partida?", texto: "Se reparten los puntos como van.", si: "Terminar", peligro: true })))
            return;
        await control(pid, "terminar");
        if (sala.modo === "tv")
            setRelevo(true);
    };
    // ---------- En partida ----------
    if (v) {
        // Local: a quién le toca el teléfono. Mientras alguien deba contestar, a él; si no, al anfitrión.
        const anf = sala.anfitrionId;
        const pendientes = v.fase === "contestando" ? v.esperados.filter(j => !v.contestaron.includes(j)) : [];
        const mano = enMano || anf;
        const idPartida = s.partida?.id ?? "";
        const yaVieron = vistos.pid === idPartida ? vistos.ids : leerVistos(idPartida);
        const naveSala = !!v.impostor?.palabras;
        // Local: «¡A discutir!» se ve antes de pasar el teléfono al primer turno.
        if (local && naveSala && anuncioNave)
            return _jsx(Marco, { clase: "az pt ns-marco", fondo: _jsx(FondoCuarto, { oscuro: true }), children: _jsx(AnuncioDiscusion, { modo: "celular" }) });
        const etapaNave = naveSala ? v.impostor.etapa : null;
        const verPalabra = local && !!v.impostor?.nave && !naveSala && v.ronda === 1 && v.fase === "contestando" && v.impostor.etapa === "pistas" && Object.keys(v.pistas).length === 0;
        const faltaVer = verPalabra ? v.jugadores.map(j => j.id).find(id => !yaVieron.includes(id)) : undefined;
        // Local, papeles de la nave: el teléfono pasa por cada quien que no ha visto su papel.
        const faltaPapel = local && etapaNave === "papeles" ? v.jugadores.map(j => j.id).find(id => !(v.impostor.vistos ?? []).includes(id)) : undefined;
        const sigue = faltaPapel ?? faltaVer ?? pendientes[0] ?? anf;
        // Pantalla de carga: en Local siempre aquí; con la sala de espera de la nave también en línea (antes de la sala).
        if ((local || (naveSala && !(conPantalla && !soyAnfitrion))) && tocaExplicar(v) && cargaVista !== idPartida) {
            return _jsx(Marco, { clase: "az pt", fondo: v.escenario ? _jsx(FondoEscenario, { escenario: v.escenario }) : _jsx(FondoCuarto, { oscuro: true }), children: _jsx(ComoJugar, { v: v, modo: "celular", alCerrar: () => { setCargaVista(idPartida); if (soyAnfitrion)
                        void control(idPartida, "comenzar"); } }) });
        }
        if (local && mano !== sigue && v.juegoId !== "copas") {
            const m = s.miembros.find(x => x.id === sigue);
            return _jsx(PasaTelefono, { nombre: m?.nombre ?? "el siguiente", id: sigue, figura: m?.figura ?? null, color: colorDe(sigue, v.jugadores.map(j => j.id)), alListo: () => { modoLocal.pasarA(sigue === anf ? "" : sigue); setEnMano(sigue === anf ? "" : sigue); s.refrescar(); } });
        }
        // Papeles de la nave: cada quien ve el suyo (en Local, por turnos); luego el anfitrión abre la discusión.
        if (etapaNave === "papeles" && (!local || mano === (faltaPapel ?? anf))) {
            const quien = local ? mano : ses.uid;
            const sec = (s.secreto ?? {});
            const vi = (v.impostor.vistos ?? []).includes(quien) || vistoYo === `${idPartida}:${quien}`;
            return (_jsx(Marco, { clase: "az pt ns-marco", fondo: _jsx(FondoCuarto, { oscuro: true }), children: _jsx("div", { className: "pt-caja", children: _jsx(PapelNave, { v: v, mio: sec.mio ?? null, miembros: s.miembros, yo: quien, vi: vi, local: local, alVisto: () => { setVistoYo(`${idPartida}:${quien}`); void jugada(idPartida, "carta", { que: "visto" }); }, soyAnfitrion: soyAnfitrion && (!local || quien === anf), alDiscutir: () => void control(idPartida, "discutir") }) }) }));
        }
        if (faltaVer && mano === faltaVer) {
            const m = s.miembros.find(x => x.id === mano);
            const sec = (s.secreto ?? {});
            const mio = sec.mio ?? null;
            const imp = mio?.rol === "impostor";
            const listo = () => { const ids = [...yaVieron, mano]; guardarVistos(idPartida, ids); setVistos({ pid: idPartida, ids }); };
            return (_jsx(Marco, { clase: "az lb pt-aviso", fondo: v.escenario ? _jsx(FondoEscenario, { escenario: v.escenario }) : _jsx(FondoCuarto, { oscuro: true }), children: _jsxs("div", { className: "a-pasa-caja nv-ver", style: { "--pj": colorDe(mano, v.jugadores.map(j => j.id))?.base ?? "#ffc21a" }, children: [_jsxs("span", { className: "nv-ver-t dsp ol", children: [m?.nombre ?? "Tu turno", ": tu palabra secreta"] }), mio ? _jsx(Escaner, { secreto: imp ? "Eres el impostor" : mio.palabra ?? "…", encabezado: imp ? "TU PAPEL" : "PALABRA CLASIFICADA", detalle: `Tema: ${mio.tema ?? v.carta?.texto ?? ""}` })
                            : _jsx("p", { className: "a-suave", children: "Cargando\u2026" }), _jsx("p", { className: "a-suave", children: "Mant\u00E9n el dedo para verla. Cuando la memorices, suelta y toca \u00ABYa la vi\u00BB." }), _jsx("button", { type: "button", className: "lb-listo", disabled: !mio, onClick: listo, children: "Ya la vi" })] }) }));
        }
        const yo = local ? mano : ses.uid;
        const yoNombre = s.miembros.find(x => x.id === yo)?.nombre ?? ses.nombre;
        const estoy = v.jugadores.some(j => j.id === yo);
        const sec = (s.secreto ?? {});
        const mi = { yo, mio: sec.mio ?? null, miRespuesta: sec.miRespuesta ?? null, miMano: sec.miMano ?? [] };
        const ultima = esFinalDeJuego(v);
        // Ceremonia de copas de la noche: sin ronda, sin barra del anfitrión ni marcador; al final se cierra la sala.
        const copas = v.juegoId === "copas";
        const ids = v.jugadores.map(j => j.id);
        const figDe = (id) => s.miembros.find(x => x.id === id)?.figura ?? null;
        const ico = (n) => `${import.meta.env.BASE_URL}arte/ui/${n}.webp`;
        return (_jsxs(Marco, { clase: "az pt" + (!copas && v.escenario ? " pt-esc" : ""), fondo: !copas && v.escenario ? _jsx(FondoEscenario, { escenario: v.escenario }) : _jsx(FondoCuarto, { oscuro: true }), fijo: soyAnfitrion && !copas ? (
            // Barra del anfitrión con el arte nuevo (Elías, 23 nov): sin los iconos del sistema de diseño viejo.
            _jsxs("nav", { className: "pt-host" + (sinPantalla ? " a-sin-pantalla" : ""), "aria-label": "Controles del anfitri\u00F3n", ...inerte(sinPantalla), children: [v.fase === "revelada" && !sinPantalla && _jsx("button", { type: "button", className: "pt-momento", onClick: () => void control(pid, "siguiente"), children: ultima ? "Ver resultados" : "Siguiente ronda" }), _jsxs("div", { className: "pt-host-fila", children: [_jsxs("button", { type: "button", className: "pt-hb", onClick: () => void control(pid, v.pausada ? "reanudar" : "pausar"), children: [_jsx("b", { className: "pt-hb-txt", children: v.pausada ? "▶" : "❚❚" }), _jsx("small", { children: v.pausada ? "Seguir" : "Pausar" })] }), _jsxs("button", { type: "button", className: "pt-hb", onClick: () => void (v.fase === "contestando" ? control(pid, "saltar") : control(pid, "siguiente")), children: [_jsx("img", { src: ico("configurar/omitir"), alt: "" }), _jsx("small", { children: "Saltar" })] }), _jsxs("button", { type: "button", className: "pt-hb", onClick: () => void control(pid, "ruleta"), children: [_jsx("img", { src: ico("configurar/herr-ruleta"), alt: "" }), _jsx("small", { children: "Ruleta" })] }), !local && _jsxs("button", { type: "button", className: "pt-hb", onClick: () => setXpReto(true), children: [_jsx("img", { src: ico("hub/xp"), alt: "" }), _jsx("small", { children: "XP reto" })] }), _jsxs("button", { type: "button", className: "pt-hb", onClick: () => void terminarPartida(), children: [_jsx("b", { className: "pt-hb-txt", children: "\u23F9" }), _jsx("small", { children: "Terminar" })] }), _jsxs("button", { type: "button", className: "pt-hb peligro", onClick: () => void salir(), children: [_jsx("b", { className: "pt-hb-txt", children: "\u2715" }), _jsx("small", { children: local ? "Cerrar" : "Cerrar sala" })] })] })] })) : undefined, children: [_jsxs("div", { className: "pt-caja" + (soyAnfitrion && !copas ? " con-barra" : ""), children: [_jsxs("header", { className: "pt-top", children: [_jsxs("div", { className: "lb-banner pt-banner", children: [!copas && _jsx("span", { className: "lb-banner-n", children: v.impostor ? `Vuelta ${v.ronda}` : `${v.ronda}/${v.totalRondas}` }), _jsx("span", { className: "lb-banner-t", children: nombreJuego(v.juegoId) })] }), v.reloj && v.fase === "contestando" && _jsx(Reloj, { segundos: quedanS, total: v.reloj.total, pausado: v.pausada, style: { width: 56, height: 56 } }), _jsx(Conexion, { red: s.red }), soyAnfitrion && !local && !copas && _jsx(BotonCast, { sala: sala, pantalla: pantalla, className: "pt-cast" })] }), estoy && !copas && conPantalla && (() => {
                            const m = marcador(v).find(j => j.id === yo), cartas = v.cartasEnMano[yo] ?? 0;
                            return _jsx(FichaJugador, { className: "pt-mia", id: yo, figura: figDe(yo), nombre: yoNombre, color: colorDe(yo, ids), tamano: 72, yo: true, children: _jsxs("span", { className: "fj-datos", children: [_jsxs("span", { children: ["\uD83C\uDFC6 ", _jsx("b", { children: v.puntos[yo] ?? 0 })] }), m && _jsxs("span", { children: ["\uD83C\uDFC5 ", _jsxs("b", { children: [m.lugar, ".\u00BA"] })] }), cartas > 0 && _jsxs("span", { children: ["\u26A1 ", _jsx("b", { children: cartas })] })] }) });
                        })(), sinPantalla && _jsxs("div", { className: "pt-aviso", role: "alert", children: [_jsx("b", { children: "La pantalla se desconect\u00F3" }), _jsxs("p", { children: ["La partida espera. ", soyAnfitrion ? "Abre la pantalla otra vez para seguir." : "Lo que ya enviaste se conserva."] })] }), soyAnfitrion && !sinPantalla && esperaVencida && v.fase === "contestando" && (_jsxs("div", { className: "pt-aviso", role: "alert", children: [_jsxs("b", { children: ["Falta contestar: ", v.esperados.filter(j => !v.contestaron.includes(j)).map(j => v.jugadores.find(p => p.id === j)?.nombre ?? "alguien").join(", ")] }), _jsxs("div", { className: "pt-fila", children: [_jsx("button", { type: "button", className: "lb-sec", onClick: () => void control(pid, "esperar"), children: "Esperar al jugador" }), _jsx("button", { type: "button", className: "lb-listo", onClick: () => void control(pid, "seguir-sin"), children: "Seguir sin \u00E9l" })] })] })), v.fase === "revelada" && v.ausentes?.includes(yo) && _jsxs("div", { className: "pt-aviso", role: "status", children: [_jsx("b", { children: "La ronda se cerr\u00F3 sin tu respuesta" }), _jsx("p", { children: "No sumaste puntos en esta ronda. Sigues en la partida y juegas la siguiente." })] }), (() => {
                            const juego = estoy ? _jsx("div", { className: "pt-juego" + (sinPantalla ? " a-espera-tv" : ""), ...inerte(sinPantalla), children: _jsx(HerramientaCelular, { v: v, mi: mi, miembros: s.miembros, sinCarga: local || (conPantalla && !soyAnfitrion), alComenzar: soyAnfitrion ? () => void control(pid, "comenzar") : undefined, mandar: async (t, d) => !sinPantalla && jugada(pid, t, d) }) })
                                : _jsxs("div", { className: "pt-aviso", children: [_jsx("b", { children: "Juegas en la siguiente" }), _jsx("p", { children: "Llegaste con la partida empezada. Mira la pantalla." })] });
                            // El impostor con papeles en la mesa ya muestra a todos en su tablero: sin la mesa de los lados (Elías, 24 nov).
                            return !copas && !conPantalla && !v.impostor?.palabras ? _jsx(MesaJuego, { v: v, miembros: s.miembros, yo: yo, modo: "celular", children: juego }) : juego;
                        })(), !conPantalla && !copas && _jsx(EmotesVolando, { v: v }), conPantalla && !copas && _jsxs("p", { className: "pt-mira", role: "status", children: [_jsx("span", { "aria-hidden": "true", children: "\uD83D\uDCFA" }), " Mira la pantalla: aqu\u00ED solo va lo tuyo."] }), copas && _jsx("div", { className: "pt-salidas", children: _jsx("button", { type: "button", className: "lb-listo", onClick: () => void salir(), children: local ? "Terminar sesión" : soyAnfitrion ? "Cerrar sala" : "Salir de la sala" }) })] }), xpReto && _jsx(XpReto, { v: v, cerrar: () => setXpReto(false), alDar: (j, x) => { void enlace.darXp(sala, j, x).then(ok => { if (ok) {
                        void control(pid, "xp-reto", { jugador: j, xp: x });
                        aviso(`+${x} XP para ${v.jugadores.find(p => p.id === j)?.nombre ?? ""}`);
                    }
                    else
                        aviso("No se pudo dar la XP."); }); } })] }));
    }
    // ---------- Espera: lobby estilo fiesta (pantallas/lobby/Lobby.tsx) ----------
    // Si el administrador te sacó del lobby, ya no apareces en la lista.
    if (s.miembros.length > 0 && !s.miembros.some(m => m.id === ses.uid))
        return _jsx(AvisoCuarto, { titulo: "Saliste del lobby", texto: "El administrador te sac\u00F3 del lobby.", children: _jsx("button", { type: "button", className: "lb-listo", onClick: () => ir("inicio"), children: "Ir al inicio" }) });
    const copasNoche = async () => {
        if (!(await confirmar({ titulo: "¿Entregar las copas?", texto: "Se suman los puntos de todos los juegos de la noche y se anuncian los ganadores.", si: "Entregar copas" })))
            return;
        setCopando(true);
        const ok = await entregarCopas(sala, s.miembros);
        setCopando(false);
        if (!ok)
            aviso("No se pudieron entregar las copas. Intenta otra vez.");
        else {
            sonar("exito");
            s.refrescar();
        }
    };
    return _jsx(Lobby, { sala: sala, miembros: ordenados, yo: ses.uid, soyAnfitrion: soyAnfitrion, final: final, red: s.red, refrescar: s.refrescar, alSalir: () => void salir(), alCopas: () => void copasNoche(), copando: copando, pantalla: pantalla });
}
/** Local: tapa la pantalla entre turnos para que nadie vea lo de otro. */
function PasaTelefono({ nombre, id, figura, color, alListo }) {
    return (_jsx(Marco, { clase: "az lb pt-aviso", fondo: _jsx(FondoCuarto, { oscuro: true }), children: _jsxs("div", { className: "a-pasa-caja pasa-n", style: varsColor(color), children: [_jsx("span", { className: "pasa-t", children: "P\u00E1sale el tel\u00E9fono a" }), _jsx(MedallonJugador, { id: id, figura: figura, estrella: color?.etiqueta?.replace(/\D/g, "") || undefined, tamano: "clamp(120px, 24dvh, 180px)" }), _jsx("b", { className: "pasa-nom", children: nombre }), _jsx("p", { className: "pasa-nota", children: "Que nadie m\u00E1s vea la pantalla." }), _jsxs("button", { type: "button", className: "pasa-btn", onClick: alListo, children: ["Soy ", nombre] })] }) }));
}
const claveVistos = (pid) => `alv-vistos-${pid}`;
function leerVistos(pid) {
    try {
        const x = JSON.parse(sessionStorage.getItem(claveVistos(pid)) ?? "[]");
        return Array.isArray(x) ? x.filter((i) => typeof i === "string") : [];
    }
    catch {
        return [];
    }
}
function guardarVistos(pid, ids) { try {
    sessionStorage.setItem(claveVistos(pid), JSON.stringify(ids));
}
catch { /* sin almacenamiento: se recuerda mientras siga abierta */ } }
