import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// La Pantalla (#/tv/código): la laptop o TV que todos ven. No juega: corre el motor y dibuja lo público.
// Sin QR (Elías, 18 nov): quien abre ALV entra al lobby único con «¡Jugar!». Tiene controles de respaldo para quien tiene el control.
import { useEffect, useState } from "react";
import { cancionesDe, useFondoTema } from "../../app/temas";
import { tocarFanfarria } from "../../app/musica";
import { RaizDS, Reloj } from "../../ds";
import { ir } from "../../app/rutas";
import { useSesion } from "../../app/sesion";
import { enlace } from "../../servicios/enlace";
import { EscenaTv } from "../../juegos/general/tv";
import { EmotesVolando } from "../../juegos/general/Emotes";
import { esPublico, marcador, nombreDe, nombreJuego } from "../../juegos/general/texto";
import { Conexion, useDespierta, usePantalla, useQuedan } from "../../pantallas/Sala";
import { Posiciones, esFinalDeJuego } from "../../juegos/general/Copas";
import { confirmar } from "../../pantallas/comun";
import { FichaJugador } from "../../pantallas/lobby/Ficha";
import { FondoCuarto } from "../../pantallas/lobby/Cuarto";
import { FondoEscenario } from "../../pantallas/Fondos";
import { escucharSalirPantalla } from "../../servicios/difusion";
import { ConfigEnVivo, useConfigEnVivo } from "../../pantallas/ConfigEnVivo";
import { MesaJuego } from "../../pantallas/MesaJuego";
import "../../pantallas/lobby/cast.css";
import { colorDe, varsColor } from "../../app/colorJugador";
import { CUPO_LOBBY, Pedestales, TodosListos, lugaresSala, preparados } from "../../pantallas/SalaEspera";
import { claseLobby, LOBBY_NUEVO } from "../../pantallas/lobby/version";
import { Confeti, NumeroLetrero, useCelebracion } from "../../pantallas/LetreroVivo";
import "../../pantallas/azotea/azotea.css";
import "../../pantallas/perfil/perfil.css";
import "../../pantallas/lobby/lobby.css";
import { useColoresSala } from "../../pantallas/lobby/colores";
import { useSala } from "../sala";
import { AvisoLogro } from "../../pantallas/AvisoLogro";
import { control, useMotor } from "./motor";
import { useGestosSala } from "../../servicios/gestosSala";
export function PantallaTv({ codigo }) {
    const ses = useSesion();
    const s = useSala(codigo, ses.uid);
    const ordenados = useColoresSala(s.sala, s.miembros);
    // La TV solo escucha los gestos de los jugadores (no tiene figura propia).
    useGestosSala(s.sala?.id, "", s.miembros);
    const tengoControl = !!s.sala && s.sala.anfitrionId === ses.uid;
    // El motor corre siempre en el celular del anfitrión (Elías, 24 nov); la Pantalla solo muestra. Las salas viejas
    // «con pantalla» (modo tv) siguen corriéndolo aquí.
    useMotor(s.sala, s.partida, tengoControl && s.sala?.modo === "tv", s.tic);
    useDespierta(true);
    usePantalla(s.sala, true, true); // se anota como la Pantalla: los celulares saben si está
    const v = s.partida && !s.partida.terminada && esPublico(s.partida.estado) ? s.partida.estado : null;
    const final = s.partida?.terminada && esPublico(s.partida.estado) ? s.partida.estado : null;
    const quedanS = useQuedan(v);
    // Si esta pantalla es del anfitrión, también anuncia el lobby.
    useEffect(() => { if (!s.sala || !tengoControl)
        return; return enlace.anunciarLobby(s.sala); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [s.sala?.id, tengoControl]);
    const [ruleta, setRuleta] = useState(null);
    const nRuleta = v?.ruleta?.n ?? 0;
    useEffect(() => {
        if (!v?.ruleta || nRuleta === 0)
            return;
        setRuleta({ quien: nombreDe(v, v.ruleta.jugador), texto: v.ruleta.texto });
        const t = setTimeout(() => setRuleta(null), 9000);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nRuleta]);
    // Con el estilo del lobby (Elías, 23 nov): el cuarto de fondo y los componentes de cada juego en vidrio (`az pt`).
    // En partida, el fondo es el escenario elegido (Elías, 24 nov); en el lobby y las copas, el cuarto.
    const escPartida = v && v.juegoId !== "copas" && v.escenario ? v.escenario : null;
    // En el lobby, la TV muestra en grande lo que el anfitrión va armando.
    const vivoTv = useConfigEnVivo(s.sala?.id, !v);
    // Dejar de proyectar (Elías, 24 nov): este aparato vuelve a ser normal. También si el anfitrión lo pide desde su celular.
    const dejar = () => ir(s.sala ? "sala" : "inicio", s.sala?.codigo);
    // «¡Todos listos!» se celebra solo al pasar a todos listos, no al abrir la TV con todos listos.
    const fiesta = useCelebracion(s.sala && s.miembros.length ? preparados(s.miembros).todos : null);
    useEffect(() => { if (!s.sala)
        return; return escucharSalirPantalla(s.sala.id, dejar); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [s.sala?.id]);
    // Resultados (Elías, 26 nov): el fondo del tema del ganador y ~8 s de su canción (temas.ts). Con empate, el cuarto.
    const podio = final ? marcador(final) : [];
    const ganador = podio.length && podio.filter(j => j.lugar === 1).length === 1 ? podio[0].id : null;
    const figuraGanador = ganador ? s.miembros.find(m => m.id === ganador)?.figura ?? null : null;
    const fondoGanador = useFondoTema(figuraGanador, "g").css;
    const idFinal = final ? s.partida?.id ?? "" : "";
    useEffect(() => {
        if (!idFinal || !figuraGanador)
            return;
        let vivo = true;
        void cancionesDe(figuraGanador).then(l => { if (vivo && l.length)
            tocarFanfarria(l[Math.floor(Math.random() * l.length)]); });
        return () => { vivo = false; };
        // Una vez por partida terminada.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idFinal, ganador]);
    const fondoTv = escPartida ? _jsx(FondoEscenario, { escenario: escPartida })
        : fondoGanador ? _jsxs("div", { className: "d-bg a-fondo-alv a-fondo-tema", "aria-hidden": "true", children: [_jsx("div", { className: "a-fa-capa", style: { "--arte-g": fondoGanador, "--arte-c": fondoGanador } }), _jsx("div", { className: "a-fa-capa", style: { background: "linear-gradient(180deg, rgba(5,6,12,.55), rgba(5,6,12,.35) 40%, rgba(5,6,12,.7))" } })] })
            : _jsx(FondoCuarto, { oscuro: true });
    const marco = (hijos) => _jsxs(RaizDS, { ancho: true, className: "alv a-tv az pt" + (escPartida ? " pt-esc" : ""), children: [fondoTv, hijos, _jsxs("button", { type: "button", className: "cs-boton on tv-dejar", onClick: dejar, "aria-label": "Dejar de proyectar", children: [_jsx("span", { "aria-hidden": "true", children: "\u2715" }), " Dejar de proyectar"] }), _jsx(AvisoLogro, { tv: s.sala?.id ?? "" })] });
    if (s.error || s.cerrada)
        return marco(_jsxs("div", { className: "lb-vacio a-tv-msj", children: [_jsx("b", { children: s.cerrada ? "La sala se cerró" : "No se pudo abrir la pantalla" }), s.error && _jsx("p", { children: s.error }), _jsx("button", { type: "button", className: "lb-listo", onClick: () => ir("inicio"), children: "Ir al inicio" })] }));
    if (!s.sala)
        return marco(_jsx("div", { className: "lb-vacio a-tv-msj", children: _jsx("b", { children: "Abriendo la sala\u2026" }) }));
    const pid = s.partida?.id ?? "";
    if (v) {
        const ultima = esFinalDeJuego(v);
        // Ceremonia de copas: sin ronda, marcador ni controles de partida; quien tiene el control puede cerrar la sala.
        const copas = v.juegoId === "copas";
        // Mesa con los personajes a los lados (Elías, 24 nov). El impostor ya pone a todos en su escena.
        const conMesa = !copas && !v.impostor;
        const cerrar = async () => { if (s.sala && await confirmar({ titulo: "¿Cerrar la sala?", texto: "Todos salen y la sesión termina.", si: "Cerrar sala", peligro: true })) {
            await enlace.cerrar(s.sala);
            ir("inicio");
        } };
        return marco(_jsxs(_Fragment, { children: [_jsxs("header", { className: "a-tv-top", children: [!copas && _jsxs("div", { className: "lb-banner pt-banner tv-banner", children: [_jsx(NumeroLetrero, { valor: v.ronda + (v.impostor?.etapa ?? ""), children: v.impostor?.etapa === "papeles" ? "La nave" : v.impostor ? `Vuelta ${v.ronda}` : `${v.ronda}/${v.totalRondas}` }), _jsx("span", { className: "lb-banner-t", children: nombreJuego(v.juegoId) })] }), _jsx(Conexion, { red: s.red }), v.reloj && v.fase === "contestando" && _jsx(Reloj, { segundos: quedanS, total: v.reloj.total, pausado: v.pausada, style: { width: "6.5em", height: "6.5em" } })] }), _jsxs("main", { className: "a-tv-main", children: [conMesa ? _jsx(MesaJuego, { v: v, miembros: s.miembros, modo: "tv", children: _jsx(EscenaTv, { v: v, miembros: s.miembros }) }) : _jsx(EscenaTv, { v: v, miembros: s.miembros }), v.fase === "revelada" && v.ausentes?.length > 0 && _jsxs("p", { className: "a-tv-sub", children: ["Sin respuesta en esta ronda: ", v.ausentes.map(j => nombreDe(v, j)).join(", ")] })] }), _jsx(EmotesVolando, { v: v }), !copas && !conMesa && _jsx("footer", { className: "a-tv-pie", children: _jsx("ul", { className: "a-tv-marcador", "aria-label": "Marcador", children: marcador(v).map(j => _jsx("li", { className: "tv-ficha", style: varsColor(colorDe(j.id, v.jugadores.map(x => x.id))), children: _jsx(FichaJugador, { id: j.id, figura: s.miembros.find(m => m.id === j.id)?.figura, nombre: j.nombre, color: colorDe(j.id, v.jugadores.map(x => x.id)), tamano: v.jugadores.length > 5 ? 54 : 64, children: _jsxs("span", { className: "fj-datos", children: [_jsxs("span", { children: ["\uD83C\uDFC6 ", _jsx("b", { children: j.puntos })] }), (v.cartasEnMano[j.id] ?? 0) > 0 && _jsxs("span", { children: ["\u26A1 ", _jsx("b", { children: v.cartasEnMano[j.id] })] })] }) }) }, j.id)) }) }), v.pausada && _jsx("div", { className: "a-tv-velo", children: _jsx("span", { className: "tv-pausa", children: "Pausa" }) }), ruleta && _jsx("div", { className: "a-tv-velo", onClick: () => setRuleta(null), children: _jsxs("div", { className: "d-pnl a-tv-ruleta", children: [_jsx("img", { className: "tv-ruleta-ico", src: `${import.meta.env.BASE_URL}arte/ui/configurar/herr-ruleta.webp`, alt: "" }), _jsx("span", { className: "lb-banner-t", children: "Ruleta de castigos" }), _jsx("span", { className: "dsp ol a-tv-t1", children: ruleta.quien }), _jsx("span", { className: "a-tv-sub", children: ruleta.texto })] }) }), tengoControl && copas && _jsx("div", { className: "a-tv-respaldo", "aria-label": "Controles de respaldo", children: _jsx("button", { type: "button", onClick: () => void cerrar(), children: "Cerrar sala" }) }), tengoControl && !copas && v.impostor?.etapa !== "papeles" && (_jsxs("div", { className: "a-tv-respaldo", "aria-label": "Controles de respaldo", children: [_jsx("button", { type: "button", onClick: () => void control(pid, v.pausada ? "reanudar" : "pausar"), children: v.pausada ? "Seguir" : "Pausar" }), v.fase === "contestando" ? _jsx("button", { type: "button", onClick: () => void control(pid, "saltar"), children: "Saltar" })
                            : _jsx("button", { type: "button", onClick: () => void control(pid, "siguiente"), children: ultima ? "Resultados" : "Siguiente" }), _jsx("button", { type: "button", onClick: () => void confirmar({ titulo: "¿Terminar la partida?", texto: "Se reparten los puntos como van.", si: "Terminar", peligro: true }).then(ok => { if (ok)
                                void control(pid, "terminar"); }), children: "Terminar" })] }))] }));
    }
    // Lobby nuevo en la TV (Elías, 26 nov): el mismo cuarto, cabinas, plataformas, J1/J2 y barra de nombres que en los
    // celulares, sin paneles ni botones. Los resultados de la partida anterior siguen con la vista de siempre.
    if (!final && LOBBY_NUEVO) {
        const pr = preparados(s.miembros);
        return (_jsxs(RaizDS, { ancho: true, className: "alv a-tv az lb tv-lb" + claseLobby, children: [_jsx(FondoCuarto, {}), _jsx("div", { className: "a-scroll", children: _jsxs("div", { className: "lb-caja", children: [_jsxs("header", { className: "lb-top", children: [_jsxs("div", { className: "lb-banner" + (pr.todos ? " todos" : "") + (fiesta ? " mov-celebra" : ""), role: "status", "aria-live": "polite", children: [_jsxs(NumeroLetrero, { valor: s.miembros.length, conocido: s.miembros.length > 0, children: [s.miembros.length, "/", CUPO_LOBBY] }), _jsx("span", { className: "lb-banner-t", children: pr.todos ? "¡Todos listos!" : `${pr.listos} listo${pr.listos === 1 ? "" : "s"}` }), _jsx("small", { className: "lb-banner-s", children: pr.todos ? "El administrador arma la partida" : "Abre ALV en tu celular y toca «¡Jugar!»" })] }), fiesta && _jsx(Confeti, {}), _jsx("span", { className: "lb-red", children: _jsx(Conexion, { red: s.red }) })] }), _jsx("section", { className: "lb-escenario", style: { "--lugares": lugaresSala(ordenados.length) }, children: _jsx(Pedestales, { miembros: ordenados, className: "lb-pedestales", fiesta: { escenarios: true }, vida: "tv" }) })] }) }), vivoTv && _jsx("div", { className: "cv-tv", children: _jsx(ConfigEnVivo, { e: vivoTv, grande: true }) }), _jsxs("button", { type: "button", className: "cs-boton on tv-dejar", onClick: dejar, "aria-label": "Dejar de proyectar", children: [_jsx("span", { "aria-hidden": "true", children: "\u2715" }), " Dejar de proyectar"] }), _jsx(AvisoLogro, { tv: s.sala?.id ?? "" })] }));
    }
    return marco(_jsxs(_Fragment, { children: [vivoTv && _jsx("div", { className: "cv-tv", children: _jsx(ConfigEnVivo, { e: vivoTv, grande: true }) }), _jsxs("header", { className: "a-tv-top", children: [_jsxs("div", { className: "lb-banner pt-banner tv-banner", children: [_jsxs("span", { className: "lb-banner-n", children: [s.miembros.length, "/", CUPO_LOBBY] }), _jsx("span", { className: "lb-banner-t", children: final ? `Resultados · ${nombreJuego(final.juegoId)}` : `${s.miembros.filter(m => m.listo).length} listos` }), _jsx("small", { className: "lb-banner-s", children: final ? "Marquen «¡Listo!» para la siguiente" : "Abre ALV en tu celular y toca «¡Jugar!»" })] }), _jsx(Conexion, { red: s.red })] }), _jsxs("main", { className: "a-tv-main a-tv-lobby", children: [final ? _jsx(Posiciones, { v: final, miembros: s.miembros, grande: true }) : (_jsxs("div", { className: "a-tv-elenco", children: [_jsx(Pedestales, { miembros: ordenados, className: "lb-pedestales", fiesta: { escenarios: true }, vida: "tv" }), !s.miembros.length && _jsx("span", { className: "dsp ol a-tv-t2", children: "Abre ALV y toca \u00AB\u00A1Jugar!\u00BB para entrar" })] })), _jsx(TodosListos, { miembros: s.miembros })] })] }));
}
