import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Configurar partida (Maestro v1.44): lo hace solo el anfitrión, después de que todos dan «¡Listo!».
// Estilo menú de juego de fiesta: arriba el nombre de la sección, en medio las tarjetas para elegir y abajo «Siguiente».
// Secciones: tipo de partida → (armar equipos, si aplica) → juego → opciones o instrumento → escenario → resumen.
// En el resumen cada parte se toca para cambiarla (y se regresa al resumen); desde ahí se inicia.
// `ConfigurarPartida` recibe los miembros y devuelve la configuración; no habla con la base.
// `PaginaConfigurar` (#/configurar/código) la envuelve: arranca la partida en la sala y regresa a ella.
import { useEffect, useMemo, useRef, useState } from "react";
import { CONTENIDO } from "../content";
import { EJE_DE_MAZO, ESCENARIOS, JUEGOS, NIVELES_EJE } from "../content/catalogo";
import { ARTE_ESCENARIOS, ARTE_JUEGOS, ARTE_TIPOS } from "../content/arteJuegos";
import { INSTRUMENTOS, JUEGOS_FISICO, MODALIDADES, MODALIDADES_JUEGO, admite } from "../content/configurar";
import { GRUPOS_EQUIPOS, JUEGOS_CON_TEMPORIZADOR, armarArranque, armarGrupos, conParejas, intensidadVieja } from "../engine/nucleo";
import { adultoPorEjes, cartasPermitidas } from "../engine/filtros";
import { maxImpostores } from "../engine/partida";
import { Boton } from "../ds";
import { colorJugador, varsColor } from "../app/colorJugador";
import { bandosIniciales, parejasIniciales } from "../app/bandos";
import { generosSala } from "../servicios/cuenta";
import { ir } from "../app/rutas";
import { useSesion } from "../app/sesion";
import { sonar } from "../app/sonido";
import { entregarCopas, iniciarPartida } from "../roles/pantalla/motor";
import { useSala } from "../roles/sala";
import { usePuedeAbrir } from "../app/lobby";
import { esLocal, modoLocal } from "../servicios/enlace";
import { guardarPartidaPredeterminada, leerPartidaPredeterminada } from "../servicios/partidaPredeterminada";
import { mascaraSalieron, olvidarMazos, salieronDe } from "../app/cartasSalieron";
import { candado, colorDe, gente } from "./Catalogo";
import { SeccionIntensidad, ejesDeJuego, nivelMinimo } from "./Intensidad";
import { Categorias, Vitrinas, categoriasDe } from "./VitrinasJuego";
import { ArmarEquipos, gruposDe } from "./ArmarEquipos";
import { useTransmitirConfig } from "./ConfigEnVivo";
import { BotonCast } from "./lobby/Cast";
import { usePantalla } from "./Sala";
import { ArteCfg, CartaEscenario, CartaTipo, SinArte, srcArte } from "./TarjetasConfig";
import { Marco, Vacio, aviso, confirmar } from "./comun";
import { FondoEscenario } from "./Fondos";
import { useRecursos } from "./Recursos";
import { MedallonJugador, RecursosAzotea, arteHub } from "./azotea/Cabecera";
import { EscenarioFondo } from "./azotea/Escenario";
import { useMomentoAzotea } from "./azotea/HubAzotea";
import { escenarioActual } from "./azotea/paquetes";
import "./azotea/azotea.css";
import "./perfil/perfil.css";
import "./configurar.css";
import { nombreCategoria } from "../juegos/impostor/papelNave";
import { OpcionesNave } from "../juegos/impostor/OpcionesNave";
import "./configurar-az.css";
/** Nivel con que arranca el configurador (hasta que existan las reglas de la casa). */
export const EJES_INICIALES = { temperatura: 1, voltaje: 1, drunk: false };
/** Candado del juego sin contar el nivel (el nivel se revisa en su sección). */
const candadoJuego = (j, n) => candado(j, n, 4);
/** Si el juego pide más nivel del elegido (Dados HOT solo en Sobrecarga), la razón; si no, null. */
export function faltaNivel(juego, ejes) {
    const j = defJuego(juego);
    for (const eje of ejesDeJuego(juego)) {
        const min = nivelMinimo(juego, eje);
        if (ejes[eje] < min)
            return `${j?.nombre ?? "Este juego"} pide ${NIVELES_EJE[eje][min]}`;
    }
    return null;
}
/** Cuántas preguntas y retos hay para esta configuración (los mismos filtros del motor). */
export function cuentaCartas(miembros, juego, rondas, opciones) {
    const a = armarArranque(miembros, juego, rondas, 1, 1, opciones);
    const mazos = (defJuego(juego)?.mazo ?? "").split("+").filter(Boolean);
    if (!a || mazos.length === 0)
        return undefined;
    const de = (eje) => cartasPermitidas(a.cfg, CONTENIDO.cartas, mazos.filter(m => EJE_DE_MAZO[m] === eje)).length;
    return { preguntas: de("temperatura"), retos: de("voltaje") };
}
const defJuego = (id) => JUEGOS.find(j => j.id === id);
const esImpostor = (j) => j?.motor === "rol-secreto";
/** Por qué un tipo de partida no sirve con `n` jugadores (o null si sí). */
export function candadoTipo(tipo, n) {
    const m = MODALIDADES.find(x => x.id === tipo);
    if (n < m.minimo)
        return `Mínimo ${m.minimo}`;
    if (m.par && n % 2 !== 0)
        return "Número par";
    return null;
}
/** Por qué el juego no se puede jugar con `n` jugadores en ninguno de sus modos (o null si alguno sirve). */
export function candadoModo(juego, n) {
    const modos = MODALIDADES_JUEGO[juego] ?? ["individual"];
    return modos.some(m => !candadoTipo(m, n)) ? null : candadoTipo(modos[0], n);
}
/** Por qué el escenario no sirve con este juego (o null si sí). */
export function candadoEscenario(esc, j) {
    if (!esc || !j || j.lugares.length === 0)
        return null;
    const lugar = ESCENARIOS.find(e => e.id === esc)?.lugar;
    return lugar && !j.lugares.includes(lugar) ? "No en este lugar" : null;
}
/**
 * Pasos del configurador (Elías, 24 nov): juego → modo (si hay más de uno) → equipos → herramientas → intensidad →
 * escenario → resumen. El impostor pone en «Modo de juego» sus opciones y la categoría, y no pide escenario (la nave).
 */
export function ordenPasos(juego, conGrupos) {
    const imp = esImpostor(defJuego(juego));
    const conModo = imp || (MODALIDADES_JUEGO[juego]?.length ?? 1) > 1;
    const conHerramientas = !imp || JUEGOS_CON_TEMPORIZADOR.includes(juego);
    const conNivel = ejesDeJuego(juego).length > 0;
    return ["juego", ...(conModo ? ["tipo"] : []), ...(conGrupos ? ["grupos"] : []), ...(conHerramientas ? ["opciones"] : []),
        ...(conNivel ? ["intensidad"] : []), ...(imp ? [] : ["escenario"]), "resumen"];
}
/** Revisa la configuración completa. Devuelve la razón por la que no se puede iniciar, o null. */
export function motivoConfig(c, miembros) {
    const j = defJuego(c.juego);
    if (!j)
        return "Elige un juego";
    const tipo = c.opciones.modalidad ?? "individual";
    if (!admite(c.juego, tipo))
        return `${j.nombre} no se juega en ${MODALIDADES.find(m => m.id === tipo).nombre}`;
    const t = candadoTipo(tipo, miembros.length);
    if (t)
        return `${MODALIDADES.find(m => m.id === tipo).nombre}: ${t.toLowerCase()}`;
    if (!armarGrupos(conParejas(miembros), c.opciones))
        return tipo === "sexos" ? "Falta decir de qué bando es cada quien" : "Revisa los equipos";
    const cj = candadoJuego(j, miembros.length);
    if (cj)
        return `${j.nombre}: ${cj.toLowerCase()}`;
    const cn = faltaNivel(c.juego, c.ejes);
    if (cn)
        return cn;
    const ce = candadoEscenario(c.opciones.escenario, j);
    if (ce)
        return `${j.nombre} no se juega en ${ESCENARIOS.find(e => e.id === c.opciones.escenario)?.nombre ?? "ese escenario"}`;
    return null;
}
/** Juegos que ya se jugaron en este aparato (para proponer «Cómo jugar» solo la primera vez). */
const CLAVE_JUGADOS = "alv-juegos-jugados";
function jugados() { try {
    return JSON.parse(localStorage.getItem(CLAVE_JUGADOS) ?? "[]");
}
catch {
    return [];
} }
export const yaJugado = (juego) => jugados().includes(juego);
function marcarJugado(juego) { try {
    localStorage.setItem(CLAVE_JUGADOS, JSON.stringify([...new Set([...jugados(), juego])].slice(-40)));
}
catch { /* sin almacenamiento: se vuelve a proponer */ } }
/** Sin repetir entre noches (Elías, 27 nov): se recuerda en este aparato si el anfitrión quiere solo cartas nuevas. Encendido por defecto. */
const CLAVE_NUEVAS = "alv-solo-cartas-nuevas";
function leerSoloNuevas() { try {
    return localStorage.getItem(CLAVE_NUEVAS) !== "no";
}
catch {
    return true;
} }
function guardarSoloNuevas(si) { try {
    localStorage.setItem(CLAVE_NUEVAS, si ? "si" : "no");
}
catch { /* sin almacenamiento */ } }
/** Cuántas cartas puede sacar esta configuración y cuántas no han salido en este aparato. */
export function cuentaNuevas(miembros, juego, rondas, opciones, salieron) {
    const mazos = (defJuego(juego)?.mazo ?? "").split("+").filter(Boolean);
    const a = mazos.length ? armarArranque(miembros, juego, rondas, 1, 1, opciones) : null;
    if (!a)
        return undefined;
    const pool = cartasPermitidas(a.cfg, CONTENIDO.cartas, mazos);
    const ya = new Set(salieron);
    return { total: pool.length, nuevas: pool.filter(c => !ya.has(c.id)).length, mazos };
}
const LOBBY = (n) => `${import.meta.env.BASE_URL}arte/lobby/${n}.webp`;
/** Icono de cada sección: el de Elías (`sec-<sección>`) o, mientras llega, uno del HUB o del lobby. */
const ICONO_SECCION = {
    tipo: LOBBY("ico-cambiar-figura"), grupos: LOBBY("ico-dar-listo"), juego: arteHub("icono-jugar"), intensidad: arteHub("xp"),
    opciones: arteHub("ajustes"), escenario: undefined, resumen: LOBBY("ico-listo"),
};
/** Herramientas del juego físico (se usan durante la partida; aquí solo se presentan). */
const HERRAMIENTAS_FISICO_CFG = [
    { id: "dados", nombre: "Dados", detalle: "Dos dados con su suma.", icono: "herr-dados" },
    { id: "ruleta", nombre: "Ruleta", detalle: "Elige a alguien al azar.", icono: "herr-ruleta" },
    { id: "carta", nombre: "Carta", detalle: "Saca un naipe de póker.", icono: "herr-poker" },
    { id: "orden", nombre: "Orden", detalle: "Revuelve quién va primero.", icono: "herr-orden" },
    { id: "cronometro", nombre: "Cronómetro", detalle: "30 s, 1 min o 2 min.", icono: "herr-tiempo" },
];
/** Equipos por orden de llegada: A, B, A, B… */
const repartir = (ids, cuantos) => Object.fromEntries(ids.map((id, i) => [id, GRUPOS_EQUIPOS[i % cuantos].id]));
/** Ilustración de un juego (o la placa de vidrio si todavía no tiene). */
function ArteJuego({ id, className = "" }) {
    const arte = ARTE_JUEGOS[id];
    return arte ? _jsx("img", { className: className, src: srcArte(arte), alt: "", draggable: false })
        : _jsx(SinArte, { className: className });
}
/** ¿Dos configuraciones son la misma partida? (para saber si lo que se ve ya es la predeterminada). */
export function mismaPartida(a, b) {
    if (!b)
        return false;
    const o = (c) => JSON.stringify([c.juego, c.rondas, c.ejes.temperatura, c.ejes.voltaje, c.ejes.drunk, c.opciones.modalidad ?? "individual",
        c.opciones.escenario ?? null, c.opciones.temporizador ?? null, !!c.opciones.explicar, c.opciones.herramienta ?? null, c.opciones.impostor ?? null, !!c.opciones.votoSecreto]);
    return o(a) === o(b);
}
export function ConfigurarPartida({ miembros, alIniciar, alCancelar, iniciando, inicial, abrirEnResumen = true, predeterminada, modoFisico, alEntregarCopas, alFondo, generos, alEstadoVivo, nombreAnfitrion, cabExtra }) {
    const n = miembros.length;
    const r = useRecursos();
    const ids = useMemo(() => miembros.map(m => m.id), [miembros]);
    // Orden (Elías, 24 nov): juego → modo → equipos → herramientas → intensidad → escenario → resumen (ver `ordenPasos`).
    const [sec, setSec] = useState(inicial && abrirEnResumen ? "resumen" : "juego");
    // Si se entró a una sección desde el resumen, «Listo» regresa al resumen.
    const [desdeResumen, setDesdeResumen] = useState(false);
    const cuerpo = useRef(null);
    useEffect(() => { cuerpo.current?.scrollTo({ top: 0 }); }, [sec]);
    const [tipo, setTipo] = useState(inicial?.opciones.modalidad ?? "individual");
    const [cuantosEquipos, setCuantosEquipos] = useState(2);
    const [grupos, setGrupos] = useState(inicial?.opciones.grupos ?? {});
    // Nombre que el anfitrión le pone a cada equipo, pareja o bando (vacío = el de siempre).
    const [nombres, setNombres] = useState(inicial?.opciones.nombres ?? {});
    const [juego, setJuego] = useState(inicial?.juego ?? (modoFisico ? JUEGOS_FISICO[0] : "impostor"));
    const [ejes, setEjes] = useState(inicial?.ejes ?? EJES_INICIALES);
    const adulto = adultoPorEjes(ejes);
    const [rondas, setRondas] = useState(inicial?.rondas ?? 8);
    // Con `inicial`, el instrumento que corresponde a su herramienta o turno.
    const [instrumento, setInstrumento] = useState(() => (INSTRUMENTOS[inicial?.juego ?? ""] ?? [])
        .find(x => (inicial?.opciones.herramienta && x.herramienta === inicial.opciones.herramienta) || (inicial?.opciones.turno && x.turno === inicial.opciones.turno))?.id);
    const [impostores, setImpostores] = useState(inicial?.opciones.impostor?.cantidad ?? 1);
    // El impostor en la nave (Elías, 24 nov): categoría de la nave, votos a la vista o secretos, revelar al expulsar,
    // pista para el impostor y castigo al bando que pierde. De la vez pasada solo sirven las categorías de la nave.
    const impInicial = inicial?.opciones.impostor;
    const [tema, setTema] = useState(typeof impInicial?.tema === "string" && CONTENIDO.temas.some(t => t.id === impInicial.tema && t.soloNave) ? impInicial.tema : null);
    const [votosNave, setVotosNave] = useState(impInicial?.votos === "secretos" ? "secretos" : "visibles");
    const [revelarNave, setRevelarNave] = useState(impInicial?.revelar !== false);
    const [pistaNave, setPistaNave] = useState(impInicial?.pista === true);
    const [castigoNave, setCastigoNave] = useState(impInicial?.castigo !== false);
    const [escenario, setEscenario] = useState(inicial?.opciones.escenario);
    // ¿Quién es más probable?: votos a la vista o secretos (Elías, 27 nov). Sin repetir entre noches: solo cartas nuevas.
    const [votoSecreto, setVotoSecreto] = useState(inicial?.opciones.votoSecreto === true);
    const [soloNuevas, setSoloNuevas] = useState(leerSoloNuevas);
    const [deCero, setDeCero] = useState(0);
    // Categoría abierta en «Elige el juego» (null: las tarjetas de categoría). En Físico abre directo la de competencias.
    const cats = useMemo(() => categoriasDe(id => id in MODALIDADES_JUEGO), []);
    const catDe = (id) => cats.find(c => c.juegos.includes(id))?.id ?? null;
    const [filtro, setFiltro] = useState(() => (modoFisico ? catDe(JUEGOS_FISICO[0]) : null));
    // Temporizador por turno (herramienta opcional, 6A.11 C6). null: sin tiempo.
    const [temporizador, setTemporizador] = useState(inicial?.opciones.temporizador ?? null);
    const conTemporizador = JUEGOS_CON_TEMPORIZADOR.includes(juego);
    // «Cómo jugar»: se propone explicar si en este aparato nunca se ha jugado ese juego; el anfitrión puede omitirlo.
    // Pantalla de carga siempre al iniciar (Elías, 24 nov): ya no se elige en el resumen.
    const explicarFinal = true;
    const j = defJuego(juego);
    const instrumentos = INSTRUMENTOS[juego] ?? [];
    const inst = instrumentos.find(i => i.id === instrumento) ?? instrumentos[0];
    const maxImp = maxImpostores(n);
    const conGrupos = tipo === "equipos" || tipo === "sexos" || tipo === "parejas";
    // Al cambiar de tipo, grupos de arranque (el anfitrión los puede cambiar antes de iniciar): equipos alternados;
    // parejas por orden de llegada; ALVersus según el género de cada quien («Prefiero no decirlo» al bando con menos gente).
    useEffect(() => {
        if (tipo === "equipos")
            setGrupos(g => (ids.every(id => GRUPOS_EQUIPOS.some(x => x.id === g[id])) ? g : repartir(ids, cuantosEquipos)));
        if (tipo === "parejas")
            setGrupos(g => parejasIniciales(ids, g));
        if (tipo === "sexos" && generos)
            setGrupos(g => bandosIniciales(ids, generos, g));
    }, [tipo, ids, generos]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (impostores > maxImp)
        setImpostores(maxImp); }, [maxImp, impostores]);
    // La categoría Adultos solo con Temperatura en Extremo: si baja, se vuelve «Al azar».
    useEffect(() => { if (ejes.temperatura < 3 && tema && CONTENIDO.temas.find(t => t.id === tema)?.adulto)
        setTema(null); }, [ejes.temperatura, tema]);
    // El juego manda: si no admite el modo elegido, se pasa al primero que sí admite y sirve con quienes están.
    useEffect(() => {
        if (admite(juego, tipo))
            return;
        const modos = MODALIDADES_JUEGO[juego] ?? ["individual"];
        setTipo(modos.find(m => !candadoTipo(m, n)) ?? modos[0]);
    }, [juego]); // eslint-disable-line react-hooks/exhaustive-deps
    const opciones = {
        modalidad: tipo,
        ...(conGrupos ? { grupos: Object.fromEntries(ids.filter(id => grupos[id]).map(id => [id, grupos[id]])) } : {}),
        ...(conGrupos && Object.values(nombres).some(x => x.trim()) ? { nombres: Object.fromEntries(Object.entries(nombres).filter(([, x]) => x.trim()).map(([g, x]) => [g, x.trim()])) } : {}),
        ...(escenario && !esImpostor(j) ? { escenario } : {}),
        ...(inst?.turno ? { turno: inst.turno } : {}),
        ...(inst?.herramienta ? { herramienta: inst.herramienta } : {}),
        ...(esImpostor(j) ? { impostor: { cantidad: Math.min(impostores, maxImp), tema, nave: true, papeles: true, votos: votosNave, revelar: revelarNave, pista: pistaNave, castigo: castigoNave } } : {}),
        ...(explicarFinal ? { explicar: true } : {}),
        ...(temporizador && conTemporizador ? { temporizador } : {}),
        ...(votoSecreto && j?.motor === "senalar" ? { votoSecreto: true } : {}),
        ejes,
    };
    const config = { juego, rondas, ejes, opciones };
    const cuenta = useMemo(() => cuentaCartas(miembros, juego, rondas, opciones), [miembros, juego, rondas, JSON.stringify(opciones)]); // eslint-disable-line react-hooks/exhaustive-deps
    const mazosJuego = (j?.mazo ?? "").split("+").filter(Boolean);
    const nuevas = useMemo(() => cuentaNuevas(miembros, juego, rondas, opciones, salieronDe(mazosJuego)), [miembros, juego, rondas, JSON.stringify(opciones), deCero]); // eslint-disable-line react-hooks/exhaustive-deps
    const conMazo = !!nuevas && nuevas.total > 0 && !esImpostor(j);
    const motivo = motivoConfig(config, miembros);
    const gruposOk = !!armarGrupos(conParejas(miembros), opciones);
    // Pasos sin nada que elegir se saltan (modo con uno solo, herramientas sin nada, intensidad sin ejes); El impostor
    // no pide modo ni escenario.
    const orden = ordenPasos(juego, conGrupos);
    const k = Math.max(0, orden.indexOf(sec));
    // El fondo de la página es la azotea hasta el paso Escenario; desde ahí, el escenario elegido.
    const kEsc = orden.indexOf("escenario");
    const fondoEsc = kEsc >= 0 && k >= kEsc ? escenario ?? null : undefined;
    useEffect(() => { alFondo?.(fondoEsc); }, [fondoEsc, alFondo]);
    // Un escenario que ya no sirve con el juego (o El impostor, que juega en la nave) se quita.
    useEffect(() => { if (escenario && (esImpostor(j) || candadoEscenario(escenario, j)))
        setEscenario(undefined); }, [juego]); // eslint-disable-line react-hooks/exhaustive-deps
    const falta = (s) => {
        if (s === "tipo")
            return candadoTipo(tipo, n);
        if (s === "grupos" && tipo === "equipos") {
            if (ids.some(id => !GRUPOS_EQUIPOS.slice(0, cuantosEquipos).some(g => g.id === grupos[id])))
                return "Falta acomodar a alguien de la banca";
            if (GRUPOS_EQUIPOS.slice(0, cuantosEquipos).some(g => !ids.some(id => grupos[id] === g.id)))
                return "Cada equipo necesita al menos una persona";
        }
        if (s === "grupos")
            return gruposOk ? null : tipo === "sexos" ? (generos ? "Toca Ellas o Ellos en cada quien" : "Acomodando bandos…") : tipo === "parejas" ? "Cada pareja necesita dos" : "Cada equipo necesita gente";
        if (s === "juego")
            return j ? candadoJuego(j, n) ?? candadoModo(juego, n) : "Elige un juego";
        if (s === "escenario")
            return candadoEscenario(escenario, j);
        if (s === "intensidad")
            return faltaNivel(juego, ejes);
        return null;
    };
    const siguiente = () => {
        // Desde el resumen se regresa al resumen, salvo que el tipo nuevo pida armar equipos antes.
        // Si desde el resumen se cambió el juego, se siguen sus pasos (sus opciones, modo, herramientas) antes de volver.
        const cambioJuego = sec === "juego" && juego !== juegoAlEditar.current;
        if (desdeResumen && !(sec === "tipo" && conGrupos) && !cambioJuego) {
            setDesdeResumen(false);
            setSec("resumen");
            return;
        }
        if (cambioJuego)
            setDesdeResumen(false);
        setSec(orden[Math.min(orden.length - 1, k + 1)]);
    };
    const atras = () => {
        // Dentro de una categoría, «Atrás» regresa a las categorías.
        if (sec === "juego" && filtro) {
            setFiltro(null);
            return;
        }
        if (desdeResumen) {
            setDesdeResumen(false);
            setSec("resumen");
            return;
        }
        if (k <= 0)
            alCancelar?.();
        else
            setSec(orden[k - 1]);
    };
    const juegoAlEditar = useRef(juego);
    // «Cargar la predeterminada» desde el resumen: pone todo como en la guardada (lo mismo que hace `inicial` al abrir).
    const cargar = (c) => {
        const o = c.opciones, imp = o.impostor;
        setJuego(c.juego);
        setEjes(c.ejes ?? EJES_INICIALES);
        setRondas(c.rondas);
        setTipo(o.modalidad ?? "individual");
        setGrupos(o.grupos ?? {});
        setNombres(o.nombres ?? {});
        setEscenario(o.escenario);
        setInstrumento((INSTRUMENTOS[c.juego] ?? []).find(x => (o.herramienta && x.herramienta === o.herramienta) || (o.turno && x.turno === o.turno))?.id);
        setTemporizador(o.temporizador ?? null);
        setImpostores(imp?.cantidad ?? 1);
        setTema(typeof imp?.tema === "string" && CONTENIDO.temas.some(t => t.id === imp.tema && t.soloNave) ? imp.tema : null);
        setVotosNave(imp?.votos === "secretos" ? "secretos" : "visibles");
        setRevelarNave(imp?.revelar !== false);
        setPistaNave(imp?.pista === true);
        setCastigoNave(imp?.castigo !== false);
        setVotoSecreto(o.votoSecreto === true);
    };
    const editar = (s) => { juegoAlEditar.current = juego; if (s === "juego")
        setFiltro(catDe(juego)); setDesdeResumen(true); setSec(s); };
    // Elegir y seguir (Elías, 24 nov): en pasos de una sola elección, tocar la tarjeta avanza sola tras una pausa corta.
    const [avanzar, setAvanzar] = useState(0);
    const avanzado = useRef(0); // cada toque avanza una sola vez (aunque el efecto se vuelva a correr)
    useEffect(() => {
        if (!avanzar || avanzar === avanzado.current)
            return;
        avanzado.current = avanzar;
        const t = setTimeout(() => { if (!falta(sec))
            siguiente(); }, 260);
        return () => clearTimeout(t);
    }, [avanzar]); // eslint-disable-line react-hooks/exhaustive-deps
    const color = (id) => colorJugador(ids.indexOf(id));
    // Pasos donde tocar ya elige y sigue: no llevan botón «Siguiente».
    const soloTocar = sec === "escenario" || sec === "juego" || (sec === "tipo" && !esImpostor(j));
    const TITULO = {
        tipo: esImpostor(j) ? "Opciones del juego" : "Modo de juego", grupos: tipo === "sexos" ? "Ellas y ellos" : tipo === "parejas" ? "Arma las parejas" : "Arma los equipos", juego: cats.find(c => c.id === filtro)?.nombre ?? "Elige el juego",
        intensidad: "Intensidad", opciones: "Herramientas", escenario: "¿Dónde juegan?", resumen: "¡Todo listo!",
    };
    let contenido;
    if (sec === "tipo" && esImpostor(j)) {
        // El impostor solo se juega individual (Maestro 6A.12): aquí van sus opciones y la categoría con imagen (Elías, 24 nov).
        contenido = _jsx(OpcionesNave, { jugadores: n, maxImpostores: maxImp, adulto: ejes.temperatura === 3, drunk: ejes.drunk, impostores: impostores, alImpostores: setImpostores, tema: tema, alTema: setTema, votos: votosNave, alVotos: setVotosNave, revelar: revelarNave, alRevelar: setRevelarNave, pista: pistaNave, alPista: setPistaNave, castigo: castigoNave, alCastigo: setCastigoNave });
    }
    else if (sec === "tipo") {
        // Solo los modos que admite el juego elegido (Maestro 6A.12). Tocar uno elige y sigue.
        contenido = (_jsx("div", { className: "cfg-tipos", role: "radiogroup", "aria-label": "Modo de juego", children: MODALIDADES.filter(m => admite(juego, m.id)).map((m, i) => _jsx(CartaTipo, { id: m.id, indice: i, nombre: m.nombre, texto: m.gana, elegida: tipo === m.id, bloqueada: candadoTipo(m.id, n), onClick: () => { setTipo(m.id); setAvanzar(x => x + 1); } }, m.id)) }));
    }
    else if (sec === "grupos") {
        // Banca y placas con arrastre (Elías, 24 nov): equipos, parejas o bandos, con nombre editable por grupo.
        contenido = _jsx(ArmarEquipos, { tipo: tipo, miembros: miembros, grupos: grupos, alGrupos: setGrupos, cuantos: cuantosEquipos, alCuantos: x => { setCuantosEquipos(x); setGrupos(repartir(ids, x)); }, nombres: nombres, alNombres: setNombres, color: color });
    }
    else if (sec === "juego") {
        // Categorías y vitrinas giratorias (Elías, 24 nov). Con candado los juegos que no sirven con quienes están o en el escenario.
        const categoria = cats.find(c => c.id === filtro);
        contenido = categoria
            ? _jsx(Vitrinas, { categoria: categoria, elegido: juego, candado: d => candadoJuego(d, n) ?? candadoModo(d.id, n), alElegir: id => { if (id !== juego) {
                    setJuego(id);
                    setInstrumento(undefined);
                } setAvanzar(x => x + 1); } })
            : _jsx(Categorias, { categorias: cats, actual: cats.find(c => c.juegos.includes(juego))?.id, alElegir: setFiltro });
    }
    else if (sec === "intensidad") {
        contenido = _jsx(SeccionIntensidad, { juego: juego, valor: ejes, alCambiar: setEjes, cuenta: cuenta, sinCastigo: !castigoNave });
    }
    else if (sec === "opciones") {
        contenido = (_jsxs("div", { className: "cfg-opciones", children: [_jsxs("div", { className: "cfg-opciones-arte", style: { "--tc": colorDe(juego) }, children: [_jsx(ArteJuego, { id: juego, className: "cfg-opciones-img" }), _jsx("span", { className: "cfg-cinta dsp ol", children: j?.nombre })] }), _jsx("div", { className: "a-pila cfg-opciones-lado", children: esImpostor(j) ? _jsx(_Fragment, { children: conTemporizador && _jsxs("section", { className: "a-pila", children: [_jsxs("span", { className: "cfg-sub dsp ol", children: [_jsx(ArteCfg, { nombre: "herr-tiempo", className: "cfg-sub-ico" }), "Temporizador"] }), _jsx("div", { className: "a-fila a-envuelve", children: [null, 20, 30, 60, 90].map(x => (_jsx("button", { type: "button", className: "cfg-tiempo" + (temporizador === x ? " on" : ""), "aria-pressed": temporizador === x, onClick: () => setTemporizador(x), children: x ? `${x} s` : "Sin tiempo" }, x ?? 0))) }), _jsx("p", { className: "a-nota", children: temporizador ? `Cada turno dura ${temporizador} s; si se acaba, el turno pasa al siguiente.` : "Sin tiempo por turno: si alguien tarda, el anfitrión decide esperar o seguir." })] }) }) : _jsxs(_Fragment, { children: [j?.motor === "fisico" ? _jsxs("section", { className: "a-pila", children: [_jsx("span", { className: "cfg-sub dsp ol", children: "Herramientas en tu celular" }), _jsx("div", { className: "cfg-temas grandes", children: HERRAMIENTAS_FISICO_CFG.map(x => (_jsxs("div", { className: "cfg-tema", children: [_jsx(ArteCfg, { nombre: x.icono, className: "cfg-tema-ico" }), _jsxs("span", { children: [_jsx("b", { className: "dsp", children: x.nombre }), _jsx("small", { children: x.detalle })] })] }, x.id))) }), _jsx("p", { className: "a-nota", children: "Durante la partida t\u00FA das o quitas puntos y usas estas herramientas cuando quieras; todos ven lo que sale." })] }) : instrumentos.length > 0 && _jsxs("section", { className: "a-pila", children: [_jsx("span", { className: "cfg-sub dsp ol", children: "\u00BFCon qu\u00E9 se juega?" }), _jsx("div", { className: "cfg-temas grandes", children: instrumentos.map(x => (_jsxs("button", { type: "button", className: "cfg-tema" + (inst?.id === x.id ? " on" : ""), "aria-pressed": inst?.id === x.id, onClick: () => setInstrumento(x.id), children: [_jsx(ArteCfg, { nombre: `herr-${x.id}`, className: "cfg-tema-ico" }), _jsxs("span", { children: [_jsx("b", { className: "dsp", children: x.nombre }), _jsx("small", { children: x.detalle })] })] }, x.id))) })] }), conTemporizador && _jsxs("section", { className: "a-pila", children: [_jsxs("span", { className: "cfg-sub dsp ol", children: [_jsx(ArteCfg, { nombre: "herr-tiempo", className: "cfg-sub-ico" }), "Temporizador"] }), _jsx("div", { className: "a-fila a-envuelve", children: [null, 20, 30, 60, 90].map(x => (_jsx("button", { type: "button", className: "cfg-tiempo" + (temporizador === x ? " on" : ""), "aria-pressed": temporizador === x, onClick: () => setTemporizador(x), children: x ? `${x} s` : "Sin tiempo" }, x ?? 0))) }), _jsx("p", { className: "a-nota", children: temporizador ? `Cada turno dura ${temporizador} s; si se acaba, el turno pasa al siguiente.` : "Sin tiempo por turno: si alguien tarda, el anfitrión decide esperar o seguir." })] }), j?.motor === "senalar" && _jsxs("section", { className: "a-pila", children: [_jsx("span", { className: "cfg-sub dsp ol", children: "Votos" }), _jsx("div", { className: "a-fila a-envuelve", children: [[false, "A la vista"], [true, "Secretos"]].map(([x, t]) => (_jsx("button", { type: "button", className: "cfg-tiempo" + (votoSecreto === x ? " on" : ""), "aria-pressed": votoSecreto === x, onClick: () => setVotoSecreto(x), children: t }, t))) }), _jsx("p", { className: "a-nota", children: votoSecreto ? "Al revelar solo se ve cuántos votos tuvo cada quien. Nadie sabe por quién votaste." : "Al revelar se ve quién votó por quién." })] }), conMazo && _jsxs("section", { className: "a-pila", children: [_jsx("span", { className: "cfg-sub dsp ol", children: "Cartas" }), _jsx("div", { className: "a-fila a-envuelve", children: [[true, "Solo cartas nuevas"], [false, "Todas"]].map(([x, t]) => (_jsx("button", { type: "button", className: "cfg-tiempo" + (soloNuevas === x ? " on" : ""), "aria-pressed": soloNuevas === x, onClick: () => { setSoloNuevas(x); guardarSoloNuevas(x); }, children: t }, t))) }), _jsxs("p", { className: "a-nota", children: [nuevas.nuevas, " de ", nuevas.total, " cartas no han salido en este aparato", soloNuevas ? ". Salen primero; cuando se acaben, vuelven las demás." : "."] }), nuevas.nuevas < nuevas.total && _jsx("button", { type: "button", className: "cfg-tiempo", onClick: () => void (async () => {
                                            if (!(await confirmar({ titulo: "¿Empezar el mazo de cero?", texto: `Las cartas de ${j?.nombre ?? "este juego"} vuelven a contar como nuevas en este aparato.`, si: "Empezar de cero" })))
                                                return;
                                            olvidarMazos(nuevas.mazos);
                                            setDeCero(x => x + 1);
                                        })(), children: "Empezar el mazo de cero" })] }), _jsxs("section", { className: "a-pila", children: [_jsx("span", { className: "cfg-sub dsp ol", children: "Rondas" }), _jsx("div", { className: "a-fila a-envuelve", children: [5, 8, 12].map(x => (_jsx("button", { type: "button", className: "cp-num dsp ol" + (rondas === x ? " on" : ""), "aria-pressed": rondas === x, onClick: () => setRondas(x), children: x }, x))) })] })] }) })] }));
    }
    else if (sec === "escenario") {
        contenido = (_jsxs("div", { className: "cfg-escs", children: [_jsx(CartaEscenario, { id: "ciudad", nombre: "Ciudad ALV", texto: "Sin escenario: cartas de cualquier lugar.", emoji: "\uD83C\uDF03", color: "#5fb4ff", elegida: !escenario, onClick: () => { setEscenario(undefined); setAvanzar(x => x + 1); } }), ESCENARIOS.filter(e => e.activo && (!e.adulto || adulto)).map(e => (
                // El juego ya está elegido: los escenarios donde no se juega salen con candado y la razón.
                _jsx(CartaEscenario, { id: e.id, nombre: e.nombre, texto: e.ambientacion, emoji: e.emoji, color: e.color, elegida: escenario === e.id, bloqueada: candadoEscenario(e.id, j), onClick: () => { setEscenario(e.id); setAvanzar(x => x + 1); } }, e.id)))] }));
    }
    else {
        // Resumen estilo «panel de vidrio» (Elías, 25 nov): el juego grande a la izquierda; a la derecha nivel, opciones
        // (y modo y escenario en los juegos que los usan) y abajo los jugadores con «Editar jugadores».
        const m = MODALIDADES.find(x => x.id === tipo);
        const esc = ESCENARIOS.find(e => e.id === escenario);
        const usa = ejesDeJuego(juego).filter(e => !(esImpostor(j) && !castigoNave && e === "voltaje"));
        const chicas = [
            _jsx(Casilla, { titulo: "Nivel", valor: usa.map(x => NIVELES_EJE[x][ejes[x]]).join(" · ") || "Sin nivel", detalle: (ejes.drunk ? "Drunk encendido" : "Drunk apagado") + (cuenta && usa.length && !esImpostor(j) ? ` · ${[usa.includes("temperatura") ? `${cuenta.preguntas} preguntas` : "", usa.includes("voltaje") ? `${cuenta.retos} retos` : ""].filter(Boolean).join(" y ")}` : ""), ico: usa.length === 2
                    ? _jsxs("span", { className: "rz-doble", children: [_jsx(ArteCfg, { nombre: `termometro-${ejes.temperatura}`, alterno: arteHub("xp") }), _jsx(ArteCfg, { nombre: `voltimetro-${ejes.voltaje}`, alterno: arteHub("xp") })] })
                    : _jsx(ArteCfg, { nombre: usa[0] === "voltaje" ? `voltimetro-${ejes.voltaje}` : `termometro-${ejes.temperatura}`, alterno: arteHub("xp") }), alTocar: () => editar("intensidad") }, "nivel"),
            _jsx(Casilla, { titulo: esImpostor(j) ? "Opciones" : "Herramienta", valor: esImpostor(j) ? `${Math.min(impostores, maxImp)} ${Math.min(impostores, maxImp) === 1 ? "impostor" : "impostores"}` : inst?.nombre ?? "—", detalle: esImpostor(j) ? `${nombreCategoria(tema)} · votos ${votosNave === "visibles" ? "a la vista" : "secretos"}${revelarNave ? "" : " · sin revelar"}${pistaNave ? " · con pista" : ""}${castigoNave ? " · con castigo" : ""}` : `${rondas} rondas${temporizador && conTemporizador ? ` · ⏱ ${temporizador} s` : ""}${votoSecreto && j?.motor === "senalar" ? " · votos secretos" : ""}${conMazo && soloNuevas ? " · cartas nuevas" : ""}`, ico: _jsx(ArteCfg, { nombre: esImpostor(j) ? "sec-herramienta" : `herr-${inst?.id ?? "cartas"}`, alterno: arteHub("ajustes") }), alTocar: () => editar(esImpostor(j) ? "tipo" : "opciones") }, "opc"),
            // Herramientas de El impostor (Elías, 25 nov): se ve aunque no se use el temporizador.
            ...(esImpostor(j) && conTemporizador ? [
                _jsx(Casilla, { titulo: "Herramientas", valor: temporizador ? `${temporizador} s por turno` : "Sin temporizador", detalle: temporizador ? "Si se acaba, el turno pasa al siguiente" : "Cada quien se toma su tiempo", ico: _jsx(ArteCfg, { nombre: "herr-tiempo", alterno: arteHub("ajustes") }), alTocar: () => editar("opciones") }, "herr"),
            ] : []),
            ...(esImpostor(j) ? [] : [
                _jsx(Casilla, { titulo: "Modo", valor: m.nombre, detalle: conGrupos ? (gruposOk ? "Equipos listos" : "Falta armar equipos") : m.gana, img: srcArte(ARTE_TIPOS[tipo]), alTocar: () => editar("tipo") }, "modo"),
                _jsx(Casilla, { titulo: "Escenario", valor: esc ? esc.nombre : "Ciudad ALV", detalle: esc ? esc.ambientacion : "Sin escenario", img: ARTE_ESCENARIOS[escenario ?? "ciudad"] ? srcArte(ARTE_ESCENARIOS[escenario ?? "ciudad"]) : undefined, alTocar: () => editar("escenario") }, "esc"),
            ]),
        ];
        contenido = (_jsxs("div", { className: "rz", children: [_jsxs("h2", { className: "rz-titulo dsp", children: [_jsx("span", { children: "\u00A1Todo listo!" }), _jsx("small", { children: " \u2013 Configuraci\u00F3n del juego" })] }), _jsxs("div", { className: "rz-panel", children: [_jsx(Casilla, { titulo: "Juego", valor: j?.nombre ?? "—", detalle: j ? `${gente(j)} jugadores` : undefined, arte: _jsx(ArteJuego, { id: juego }), alTocar: () => editar("juego"), grande: true }), _jsxs("div", { className: "rz-lado", children: [_jsx("div", { className: "rz-chicas n" + chicas.length, children: chicas }), _jsxs("div", { className: "cfg-casilla rz-gente", children: [_jsxs("span", { className: "cfg-casilla-t dsp", children: ["Jugadores", _jsx("span", { className: "rz-act", children: " activos" })] }), _jsx("ul", { className: "rz-burbujas", "aria-label": `${n} jugadores`, children: miembros.map(x => _jsxs("li", { style: varsColor(color(x.id)), children: [_jsx(MedallonJugador, { id: x.id, figura: x.figura, estrella: ids.indexOf(x.id) + 1, tamano: "var(--rz-b)" }), _jsx("span", { className: "rz-nom", children: x.nombre })] }, x.id)) }), alCancelar && _jsx("button", { type: "button", className: "rz-editar dsp", onClick: alCancelar, children: "Editar jugadores" })] })] })] }), motivo && _jsx("p", { className: "a-error rz-motivo", role: "alert", children: motivo })] }));
    }
    // Configuración en vivo para los demás (Elías, 24 nov): lo mismo que se ve aquí, ya en texto.
    const escNombre = escenario ? ESCENARIOS.find(e => e.id === escenario)?.nombre ?? "" : "Ciudad ALV";
    const vivo = {
        quien: nombreAnfitrion ?? "", paso: TITULO[sec], escenario: escenario ?? null, escenarioNombre: escNombre, juego, juegoNombre: j?.nombre ?? "",
        modo: MODALIDADES.find(m => m.id === tipo)?.nombre ?? "",
        grupos: conGrupos ? gruposDe(tipo, n, cuantosEquipos).map(g => ({
            nombre: nombres[g.id]?.trim() || (tipo === "parejas" ? miembros.filter(m => grupos[m.id] === g.id).map(m => m.nombre).join(" y ") || g.nombre : g.nombre),
            jugadores: miembros.filter(m => grupos[m.id] === g.id).map(m => m.nombre)
        })) : [],
        herramienta: esImpostor(j) ? `${Math.min(impostores, maxImp)} ${Math.min(impostores, maxImp) === 1 ? "impostor" : "impostores"}` : inst?.nombre ?? "",
        nivel: ejesDeJuego(juego).map(x => NIVELES_EJE[x][ejes[x]]).join(" · ") + (ejes.drunk ? " · Drunk" : ""),
    };
    const claveVivo = JSON.stringify(vivo);
    useEffect(() => { alEstadoVivo?.(vivo); }, [claveVivo]); // eslint-disable-line react-hooks/exhaustive-deps
    return (_jsxs("div", { className: "cfg", children: [_jsxs("header", { className: "cfg-cab", children: [_jsxs("div", { className: "cfg-cab-fila", children: [_jsxs("button", { type: "button", className: "pf-atras cfg-volver", onClick: atras, "aria-label": desdeResumen ? "Volver al resumen" : k <= 0 ? "Volver a la sala" : "Atrás", children: [_jsx("span", { "aria-hidden": "true", children: "\u25C0" }), desdeResumen ? "Resumen" : "Atrás"] }), alEntregarCopas && k === 0 && !desdeResumen && _jsxs("button", { type: "button", className: "cfg-copas", onClick: alEntregarCopas, "aria-label": "Entregar copas", children: [_jsx(ArteCfg, { nombre: "copas", alterno: arteHub("icono-ranking"), className: "cfg-copas-ico" }), _jsx("span", { className: "cfg-copas-txt", children: "Entregar copas" })] }), cabExtra, _jsx(RecursosAzotea, { monedas: r.monedas, puntos: r.puntos })] }), _jsxs("div", { className: "cfg-cab-titulo", hidden: sec === "resumen", children: [_jsx("h2", { className: "pf-tit cfg-titulo", children: _jsxs("span", { children: [_jsx(ArteCfg, { nombre: `sec-${sec === "grupos" ? "equipos" : sec === "opciones" ? "herramienta" : sec}`, alterno: ICONO_SECCION[sec], className: "cfg-tit-ico" }), _jsx("span", { className: "cfg-tit-txt", children: TITULO[sec] })] }) }, sec), _jsx("ol", { className: "cfg-avance", "aria-label": `Paso ${k + 1} de ${orden.length}`, children: orden.map((s, x) => _jsx("li", { className: x === k ? "on" : x < k ? "hecho" : "" }, s)) })] })] }), _jsx("div", { className: "cfg-cuerpo", ref: cuerpo, children: contenido }, sec), _jsxs("footer", { className: "cfg-pie", children: [sec === "tipo" && !esImpostor(j) && _jsxs("p", { className: "cfg-pie-info", "aria-live": "polite", children: [_jsxs("b", { className: "dsp", children: [MODALIDADES.find(x => x.id === tipo).nombre, ":"] }), " ", MODALIDADES.find(x => x.id === tipo).gana] }), sec === "resumen" && predeterminada && (
                    // Partida predeterminada (solo administrador): cargarla si hay otra, guardarla o quitarla.
                    _jsx("div", { className: "cfg-pred rz-pred", children: mismaPartida(config, predeterminada.actual)
                            ? _jsxs(_Fragment, { children: [_jsxs("span", { className: "cfg-pred-txt", children: [_jsx(ArteCfg, { nombre: "sec-resumen", alterno: LOBBY("ico-listo"), className: "cfg-pred-ico" }), "Es tu partida predeterminada"] }), _jsx("button", { type: "button", className: "cfg-pred-btn", disabled: predeterminada.guardando, onClick: predeterminada.alQuitar, children: "Quitar" })] })
                            : _jsxs(_Fragment, { children: [predeterminada.actual
                                        ? _jsxs("span", { className: "cfg-pred-txt", children: [_jsx("span", { className: "rz-alt", children: "Alternativas:" }), _jsxs("button", { type: "button", className: "rz-cargar", onClick: () => cargar(predeterminada.actual), children: ["Cargar la predeterminada", _jsx("i", { "aria-hidden": "true", children: "\u25BE" })] })] })
                                        : _jsx("span", { className: "cfg-pred-txt", children: "Sin partida predeterminada" }), _jsx("button", { type: "button", className: "cfg-pred-btn on", disabled: predeterminada.guardando || !!motivo, onClick: () => predeterminada.alGuardar(config), children: predeterminada.guardando ? "Guardando…" : "Guardar como predeterminada" })] }) })), sec === "resumen"
                        ? _jsx(BotonPie, { principal: true, texto: iniciando ? "Iniciando…" : "¡Comenzar!", sub: motivo ?? `${j?.nombre ?? ""} · ${n} jugadores`, desactivado: !!motivo || !!iniciando, onClick: () => { marcarJugado(juego); alIniciar(conMazo && soloNuevas ? { ...config, opciones: { ...opciones, ...(mascaraSalieron() ? { yaSalieron: mascaraSalieron() } : {}) } } : config); } })
                        : soloTocar ? null // tocar la tarjeta ya elige y sigue
                            : _jsx(BotonPie, { listo: desdeResumen, texto: desdeResumen ? "Listo" : "Siguiente", sub: falta(sec) ?? undefined, desactivado: !!falta(sec), onClick: siguiente })] })] }));
}
/** Una casilla del resumen: se toca para cambiar esa parte. */
function Casilla({ titulo, valor, detalle, img, arte, ico, grande, alTocar }) {
    return (_jsxs("button", { type: "button", className: "cfg-casilla" + (grande ? " rz-juego" : ""), onClick: alTocar, "aria-label": `${titulo}: ${valor}. Cambiar`, children: [_jsx("span", { className: "cfg-casilla-t dsp", children: titulo }), _jsx("span", { className: "cfg-casilla-img", children: img ? _jsx("img", { src: img, alt: "", draggable: false }) : arte ?? _jsx("span", { className: "cfg-casilla-ico", "aria-hidden": "true", children: ico }) }), _jsx("b", { className: "dsp ol", children: valor }), detalle && _jsx("small", { children: detalle }), _jsx("span", { className: "cfg-cambiar", children: "Cambiar" })] }));
}
/** Botón del pie: vidrio para avanzar, dorado para iniciar. `sub` dice qué falta. */
function BotonPie({ texto, sub, principal, listo, desactivado, onClick }) {
    return (_jsxs("button", { type: "button", className: "cfg-sig" + (principal ? " principal" : listo ? " listo" : ""), disabled: desactivado, onClick: onClick, children: [_jsxs("span", { className: "cfg-sig-txt", children: [_jsx("b", { children: texto }), sub && _jsx("small", { children: sub })] }), _jsx("span", { className: "cfg-sig-flecha", "aria-hidden": "true", children: "\u25B6" })] }));
}
/**
 * #/configurar/código: el anfitrión configura y arranca la partida de su sala; al iniciar vuelve a la sala.
 * Los demás ven que el anfitrión está configurando. Si ya hay una partida en curso, regresa a la sala.
 */
export function PaginaConfigurar({ codigo }) {
    const ses = useSesion();
    const s = useSala(codigo, ses.uid);
    const [iniciando, setIniciando] = useState(false);
    const [fondoEsc, setFondoEsc] = useState(undefined);
    const momento = useMomentoAzotea();
    const az = escenarioActual();
    const soyAnfitrion = !!s.sala && s.sala.anfitrionId === ses.uid;
    const [generos, setGeneros] = useState(undefined);
    // Modo por el que se entró (Modos de juego lo deja en la pestaña). En Físico, la predeterminada no se usa si es de otro juego.
    const [modoFisico] = useState(() => { try {
        return sessionStorage.getItem("alv-modo") === "fisico";
    }
    catch {
        return false;
    } });
    // Partida predeterminada (solo administrador): se lee antes de abrir el configurador.
    const esAdmin = usePuedeAbrir(ses.uid);
    const [pred, setPred] = useState(undefined);
    const [guardandoPred, setGuardandoPred] = useState(false);
    // Dónde se juega (Elías, 24 nov): presencia de la Pantalla para el botón «cast», y la configuración en vivo para los demás.
    const salaLocal = esLocal(s.sala?.id);
    const pantalla = usePantalla(s.sala, false, !!s.sala && !salaLocal);
    const [vivo, setVivo] = useState(null);
    useTransmitirConfig(soyAnfitrion && !salaLocal ? s.sala?.id : undefined, vivo);
    useEffect(() => {
        let vivo = true;
        const t = setTimeout(() => { if (vivo)
            setPred(p => (p === undefined ? null : p)); }, 4000);
        void leerPartidaPredeterminada().then(p => { if (vivo)
            setPred(p); });
        return () => { vivo = false; clearTimeout(t); };
    }, [ses.uid]);
    const salaId = s.sala?.id, cuantos = s.miembros.length;
    // Se vuelve a leer si entra o sale alguien (para ALVersus).
    // En Local los personajes viven en el teléfono: su género sale de ahí, no de la nube.
    useEffect(() => {
        if (!salaId || !soyAnfitrion || !s.sala)
            return;
        if (esLocal(salaId))
            setGeneros(modoLocal.generos(s.sala));
        else
            void generosSala(salaId).then(setGeneros);
    }, [salaId, soyAnfitrion, cuantos]); // eslint-disable-line react-hooks/exhaustive-deps
    const enCurso = !!s.partida && !s.partida.terminada;
    useEffect(() => { if (enCurso && !iniciando)
        ir("sala", codigo); }, [enCurso, iniciando, codigo]);
    // Mientras abre, el mismo fondo de la azotea que la página (nunca la ciudad vieja del marco común).
    const fondoAz = _jsx("div", { className: "cfg-fondo", children: _jsx(EscenarioFondo, { ambiente: az.ambientes[momento], momento: momento, velo: az.velo }) });
    if (s.error)
        return _jsx(Marco, { clase: `az pf cfg-pagina a-centro m-${momento}`, fondo: fondoAz, children: _jsx(Vacio, { titulo: "No se pudo abrir", texto: s.error, children: _jsx(Boton, { color: "amarillo", texto: "Volver", icono: "back", onClick: () => ir("jugar") }) }) });
    // El anfitrión espera la predeterminada y a los jugadores: con ellos se decide si abre en el resumen o en el paso 1.
    if (!s.sala || (soyAnfitrion && (pred === undefined || s.miembros.length === 0)))
        return _jsx(Marco, { clase: `az pf cfg-pagina a-centro m-${momento}`, fondo: fondoAz, children: _jsx("p", { className: "a-suave a-pulso cfg-abriendo", role: "status", children: "Preparando la partida\u2026" }) });
    const sala = s.sala;
    // Si la predeterminada no sirve con quienes están (faltan jugadores, número par…), se abre en el paso 1 con ella marcada.
    const predSirve = !!pred && !motivoConfig(pred, s.miembros);
    const guardarPred = async (c) => {
        setGuardandoPred(true);
        const err = await guardarPartidaPredeterminada(c);
        setGuardandoPred(false);
        if (err) {
            aviso(err);
            return;
        }
        setPred(c);
        sonar("exito");
        aviso(c ? "Partida predeterminada guardada." : "Partida predeterminada quitada.");
    };
    const iniciar = async (c) => {
        setIniciando(true);
        const ok = await iniciarPartida(sala, s.miembros, c.juego, c.rondas, intensidadVieja(c.ejes), c.opciones);
        setIniciando(false);
        if (!ok) {
            aviso("No se pudo iniciar. Intenta otra vez.");
            return;
        }
        sonar("exito");
        ir("sala", codigo);
    };
    // Fin de la noche: se suman todos los juegos terminados y la ceremonia sale en la Pantalla y en cada celular.
    const copas = async () => {
        if (!(await confirmar({ titulo: "¿Entregar las copas?", texto: "Se suman los puntos de todos los juegos de la noche y se anuncian los ganadores.", si: "Entregar copas" })))
            return;
        setIniciando(true);
        const ok = await entregarCopas(sala, s.miembros);
        setIniciando(false);
        if (!ok) {
            aviso("No se pudieron entregar las copas. Intenta otra vez.");
            return;
        }
        sonar("exito");
        ir("sala", codigo);
    };
    return (_jsx(Marco, { clase: `az pf cfg-pagina m-${momento}`, fondo: _jsx("div", { className: "cfg-fondo", children: fondoEsc !== undefined
                ? _jsx(FondoEscenario, { escenario: fondoEsc })
                : _jsx(EscenarioFondo, { ambiente: az.ambientes[momento], momento: momento, velo: az.velo }) }), children: soyAnfitrion
            ? _jsx(ConfigurarPartida, { miembros: s.miembros, generos: generos, alEstadoVivo: setVivo, nombreAnfitrion: ses.nombre, cabExtra: !salaLocal ? _jsx(BotonCast, { sala: sala, pantalla: pantalla, className: "cfg-cast" }) : undefined, inicial: pred && (!modoFisico || JUEGOS_FISICO.includes(pred.juego)) ? pred : undefined, abrirEnResumen: predSirve, modoFisico: modoFisico, predeterminada: esAdmin ? { actual: pred ?? null, guardando: guardandoPred, alGuardar: c => void guardarPred(c), alQuitar: () => void guardarPred(null) } : undefined, iniciando: iniciando, alIniciar: c => void iniciar(c), alCancelar: () => ir("sala", codigo), alEntregarCopas: () => void copas(), alFondo: setFondoEsc })
            : _jsx(Vacio, { titulo: "El anfitri\u00F3n est\u00E1 configurando", texto: "En cuanto toque \u00ABIniciar\u00BB, empieza la partida.", children: _jsx(Boton, { color: "amarillo", texto: "Volver a la sala", icono: "back", onClick: () => ir("sala", codigo) }) }) }));
}
