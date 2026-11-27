import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// «Crear mi personaje» en página de cómic (rediseño pedido por Elías el 2026-11-26): el orden del «Armario» del Centro de
// Mando GB (secciones con palomita, rejilla, figura con deshacer/rehacer, Restablecer, ¡Guardar!) con el estilo cómic que
// ya tenía (ALV_DISENO_PERSONALIZADOR.md §0, losas .az-losa, ¡Guardar! como .az-jugar). Cada sección es una viñeta con su
// cartela; cambiar de sección voltea la hoja como el libro del personalizador anterior. Cada parte tiene el switch
// Originales (piezas de los personajes, por saga) / Genéricas (piezas de producción, por tipo). Seis secciones: Cabeza,
// Torso, Brazos, Piernas, Accesorios y Movimientos (saludar, ganar, perder, especial; de un personaje o genéricos).
// Va dentro de <RaizDS className="az">. Entrada: la página del HUB se voltea; «Atrás»: se voltea de regreso y luego sale.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PALETAS, paletaDePieza, piezasDe, planoConstructor, ponerPieza, quitarTinte, teñir } from "./constructorDatos";
import { caben, paginas } from "./galeriaDatos";
import { GRUPOS_GENERICAS } from "./genericas";
import { conMovimientos, elegirMovimiento, GESTOS, movimientosElegidos, NOMBRE_GESTO, opcionesMovimiento } from "./movimientos";
import { RUEDA, RuedaGestos, TrazosGesto } from "../pantallas/gestos/RuedaGestos";
import { useMiniaturas } from "./useMiniaturas";
import { Vista3D } from "./Vista3D";
import "../pantallas/azotea/azotea.css";
import "../pantallas/perfil/perfil.css";
import "../pantallas/lobby/lobby.css";
import "../pantallas/gestos/menu-gestos.css";
import "./constructor.css";
const ARTE = `${import.meta.env.BASE_URL}arte/`;
/** Una url() dentro de una variable CSS se resuelve contra la hoja de estilos (assets/), no contra la página: con la base
 *  "./" de lo publicado se rompía. Se pasa ya absoluta. */
const absoluta = (ruta) => new URL(ruta, document.baseURI).href;
const LOSAS = [
    { id: "trajes", titulo: "Trajes", cartela: "Trajes completos", c1: "#ff8a6b", c2: "#e0392b", lab: "#8f1d14", ico: "ico-armaduras" },
    { id: "cabeza", titulo: "Cabeza", cartela: "Capítulo 1: una cara nueva", c1: "#6fb6ff", c2: "#1f5fd6", lab: "#123e9c", ico: "ico-cabeza" },
    { id: "torso", titulo: "Torso", cartela: "Capítulo 2: el traje", c1: "#c08bff", c2: "#6f2fd6", lab: "#4a1c9c", ico: "ico-torso" },
    { id: "brazos", titulo: "Brazos", cartela: "Capítulo 3: brazos y manos", c1: "#7bea92", c2: "#1fa84a", lab: "#137033", ico: "ico-brazos" },
    { id: "piernas", titulo: "Piernas", cartela: "Capítulo 4: listo para correr", c1: "#ffb866", c2: "#f06a12", lab: "#a8420a", ico: "ico-piernas" },
    { id: "accesorios", titulo: "Accesorios", cartela: "Capítulo 5: el equipo", c1: "#ff8fb3", c2: "#d6246a", lab: "#8c1242", ico: "ico-accesorios" },
    { id: "movimientos", titulo: "Movimientos", cartela: "Capítulo 6: movimientos especiales", c1: "#ffe066", c2: "#e0a400", lab: "#8a6200", ico: "ico-efectos" },
];
const NOMBRE_SUB = { traje: "Traje completo", cabeza: "Piel", cara: "Cara", cabello: "Pelo", torso: "Torso", brazos: "Brazos", manos: "Manos", cadera: "Cadera", piernas: "Piernas",
    accesorio: "Capas y objetos", sombrero: "Cascos", ...NOMBRE_GESTO };
const NOMBRE_PALETA = { piel: "Piel", pelo: "Pelo", ropa: "Color" };
/** Sub-partes de cada sección, en el orden en que salen (la cabeza: piel, cara y pelo). */
const SUBPARTES = { trajes: ["traje"], cabeza: ["cabeza", "cara", "cabello"], torso: ["torso"], brazos: ["brazos", "manos"], piernas: ["piernas", "cadera"],
    accesorios: ["accesorio", "sombrero"], movimientos: [...GESTOS] };
const esGesto = (x) => GESTOS.includes(x);
/** Sagas de las piezas originales (ficha.grupo), en el orden de los chips. */
/** Sagas (primer nivel del filtro de originales) y sus grupos (segundo nivel), en este orden. Lo que no esté aquí sale
 *  con su id legible al final (Elías, 2026-11-26: «Marvel y dentro Avengers, X-Men…; habrá Harry Potter, Star Wars»). */
const SAGAS = [
    { id: "marvel", nombre: "Marvel" }, { id: "dc", nombre: "DC" }, { id: "star-wars", nombre: "Star Wars" }, { id: "harry-potter", nombre: "Harry Potter" },
];
const GRUPOS = [
    { id: "avengers", nombre: "Avengers" }, { id: "x-men", nombre: "X-Men" }, { id: "guardianes", nombre: "Guardianes" },
    { id: "villanos-marvel", nombre: "Villanos" }, { id: "otros-marvel", nombre: "Otros" },
];
const legible = (id) => id.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
/** Ordena los ids según una lista conocida (los desconocidos al final, por nombre). */
function ordenar(ids, conocidos) {
    const pos = (id) => { const i = conocidos.findIndex(c => c.id === id); return i < 0 ? 999 : i; };
    return [...new Set(ids)].filter(Boolean).map(id => ({ id, nombre: conocidos.find(c => c.id === id)?.nombre ?? legible(id) }))
        .sort((a, b) => pos(a.id) - pos(b.id) || a.nombre.localeCompare(b.nombre, "es"));
}
/** Gesto del menú de la rueda para cada gesto de la figura (para probarlo al elegirlo). */
const RUEDA_DE = { saludo: "saludar", victoria: "victoria", derrota: "derrota", especial: "especial" };
/** Ícono ilustrado de Elías (arte/ui/personalizar/<id>.webp); mientras no exista, su lugar queda vacío. */
const faltan = new Set();
function IconoLosa({ id }) {
    const [falta, setFalta] = useState(() => faltan.has(id));
    if (falta)
        return _jsx("span", { className: "az-ico pz-ico-vacio", "aria-hidden": "true" });
    return _jsx("img", { className: "az-ico", src: `${ARTE}ui/personalizar/${id}.webp`, alt: "", draggable: false, onError: () => { faltan.add(id); setFalta(true); } });
}
const sinMovimiento = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const fotoValida = (u) => !!u;
export function Constructor({ catalogo, piezas, inicial, seccion, escenaUrl, onGuardar, onSalir, base = null, paginaAnterior = `${ARTE}azotea-pedestal-noche-1920.webp`, estudioUrl = escenaUrl.replace(/escena\.html.*$/, "estudio.html"), frente = 10 }) {
    const mini = useMiniaturas(estudioUrl, catalogo);
    const [figura, setFigura] = useState(inicial);
    const [historia, setHistoria] = useState([]);
    const [futuro, setFuturo] = useState([]);
    const [pestana, setPestana] = useState(seccion ?? "cabeza");
    const [sub, setSub] = useState(seccion ? "traje" : "cabeza");
    /** Switch Originales / Genéricas, recordado por sub-parte. */
    /** Switch Originales / Común: uno para todo el taller (Elías, 2026-11-26). Cambia las piezas que se ofrecen y el fondo:
     *  cómic con las originales, clóset con las comunes. */
    const [modo, setModo] = useState("original");
    const [grupo, setGrupo] = useState("todas");
    const [saga, setSaga] = useState("todas");
    const [pagina, setPagina] = useState(0);
    const [caja, setCaja] = useState({ columnas: 4, filas: 2 });
    const [guardado, setGuardado] = useState(false);
    const [momento, setMomento] = useState(null);
    /** Gesto que se toca en cuanto la escena arme la figura con el movimiento recién elegido. */
    const probar = useRef(null);
    /** Firma del último plano que la escena armó bien. Solo se guarda si el plano de ahora es ese (Codex O2). */
    const [confirmada, setConfirmada] = useState(null);
    /** Última figura que la escena confirmó; si una pieza no encaja, se vuelve a ella. */
    const valida = useRef(null);
    const [aviso, setAviso] = useState(null);
    const rejilla = useRef(null);
    /** Volteo de página: "entra" (el HUB se va), "sale" (el HUB regresa y luego onSalir), null = quieto. */
    const [volteo, setVolteo] = useState(() => (paginaAnterior && !sinMovimiento() ? "entra" : null));
    /** La primera figura entra con su saltito; las demás no hacen nada al cambiar una pieza. */
    const [llego, setLlego] = useState(false);
    const salio = useRef(false);
    const salir = () => { if (!onSalir || volteo === "sale")
        return; if (!paginaAnterior || sinMovimiento())
        onSalir();
    else
        setVolteo("sale"); };
    const finVolteo = () => {
        if (volteo === "sale") {
            if (!salio.current) {
                salio.current = true;
                onSalir?.();
            }
        }
        else
            setVolteo(null);
    };
    // Si la animación no termina (se canceló o se pidió reducir movimiento a medias), el volteo se cierra igual (Codex O10).
    useEffect(() => { if (!volteo)
        return; const t = setTimeout(finVolteo, volteo === "entra" ? 900 : 750); return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [volteo]);
    useEffect(() => {
        const el = rejilla.current;
        if (!el)
            return;
        const medir = () => setCaja(caben(el.clientWidth, el.clientHeight, { min: el.clientWidth < 520 ? 92 : 128, proporcion: 1.05, hueco: 8 }));
        medir();
        const ro = new ResizeObserver(medir);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const plano = useMemo(() => { const p = planoConstructor("yo", figura, catalogo, piezas); return p ? conMovimientos(p, figura, catalogo, base) : null; }, [figura, catalogo, piezas, base]);
    const firma = plano ? JSON.stringify(plano) : "";
    const sePuedeGuardar = !!plano && firma === confirmada;
    const gesto = esGesto(sub) ? sub : null;
    const parte = gesto || sub === "traje" ? null : sub;
    const movs = useMemo(() => (gesto ? opcionesMovimiento(catalogo, base, gesto, figura.familia) : []), [catalogo, base, gesto, figura.familia]);
    /** Trajes completos originales: cada personaje de la familia, con su foto de tarjeta (pedido de Elías, 2026-11-26). */
    const trajes = useMemo(() => [...catalogo.values()].filter(e => e.ficha.familia === figura.familia)
        .sort((a, b) => a.ficha.nombre.localeCompare(b.ficha.nombre, "es"))
        .map(({ ficha: f, base: carpeta }) => ({ tipo: "traje", id: f.id, nombre: f.nombre, grupo: f.grupo,
        foto: /\.(webp|png|jpg)$/i.test(f.fotos.tarjeta) && !/no-hay/.test(f.fotos.tarjeta) ? new URL(f.fotos.tarjeta, carpeta).href : null })), [catalogo, figura.familia]);
    const todas = useMemo(() => (sub === "traje" ? trajes : parte ? piezasDe(piezas, parte, figura.familia).map(pz => ({ tipo: "pieza", pz })) : movs.map(op => ({ tipo: "mov", op }))), [sub, trajes, piezas, parte, figura.familia, movs]);
    const origenDe = (it) => (it.tipo === "traje" ? "original" : it.tipo === "pieza" ? it.pz.origen ?? "original" : it.op?.origen ?? "ninguna");
    const grupoDe = (it) => (it.tipo === "traje" ? it.grupo : it.tipo === "pieza" ? it.pz.grupo ?? "" : it.op?.grupo ?? "");
    /** Saga del personaje de donde sale el elemento (traje, pieza original o movimiento original). */
    const sagaDe = (it) => {
        const id = it.tipo === "traje" ? it.id : it.tipo === "pieza" ? it.pz.donante : it.op?.origen === "original" ? /^p:([^:]+):/.exec(it.op.id)?.[1] : undefined;
        return (id && catalogo.get(id)?.ficha.saga) || "";
    };
    const fuente = modo;
    const originales = fuente === "original";
    /** Primer nivel (solo originales): las sagas que tienen algo aquí. */
    const sagas = useMemo(() => (originales ? ordenar(todas.filter(it => origenDe(it) === "original").map(sagaDe), SAGAS) : []), 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todas, originales]);
    const sg = sagas.some(x => x.id === saga) ? saga : "todas";
    /** Segundo nivel: grupos de la saga elegida (originales) o tipos (comunes), solo los que tienen algo. */
    const grupos = useMemo(() => {
        const de = todas.filter(it => origenDe(it) === fuente && (!originales || sg === "todas" || sagaDe(it) === sg));
        if (originales)
            return sg === "todas" ? [] : ordenar(de.map(grupoDe), GRUPOS);
        return (parte ? GRUPOS_GENERICAS[parte] ?? [] : []).filter(x => de.some(it => grupoDe(it) === x.id));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [todas, fuente, parte, sg]);
    const g = grupos.some(x => x.id === grupo) ? grupo : "todas";
    const ninguno = gesto ? { tipo: "mov", op: null } : todas.find(it => origenDe(it) === "ninguna") ?? null;
    const lista = useMemo(() => {
        const l = todas.filter(it => origenDe(it) === fuente && (!originales || sg === "todas" || sagaDe(it) === sg) && (g === "todas" || grupoDe(it) === g));
        return ninguno ? [ninguno, ...l] : l;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [todas, fuente, sg, g, ninguno]);
    const pags = useMemo(() => paginas(lista, caja.columnas * caja.filas), [lista, caja]);
    const p = Math.min(pagina, pags.length - 1);
    const elegidos = movimientosElegidos(figura);
    const puesta = parte ? figura.piezas[parte]?.id ?? null : null;
    const pzPuesta = puesta ? piezas.get(puesta) : undefined;
    const paleta = parte && pzPuesta?.origen === "generica" ? paletaDePieza(pzPuesta, parte) : undefined; // las originales ya traen su color
    const tinte = parte && paleta ? figura.piezas[parte]?.tintes?.[paleta] ?? null : null;
    const baseId = figura.origen.tipo === "catalogo" ? figura.origen.personaje : null;
    const visible = (it) => it.tipo === "traje" ? it.id === baseId : it.tipo === "pieza" ? it.pz.id === puesta || (!puesta && it.pz.donante === baseId) : (it.op?.id ?? null) === (gesto ? elegidos[gesto] ?? null : null);
    const losa = LOSAS.find(l => l.id === pestana);
    /** Palomita de cada sección: algo cambió respecto al personaje base. */
    const hecha = (t) => t === "trajes" ? baseId !== (inicial.origen.tipo === "catalogo" ? inicial.origen.personaje : null) : t === "movimientos" ? Object.keys(elegidos).length > 0 : SUBPARTES[t].some(x => !!figura.piezas[x]);
    // Pide las fotos de las piezas de la página que se ve (las demás, cuando se llegue a ellas).
    useEffect(() => { pags[p]?.forEach(it => { if (it.tipo === "pieza")
        mini.pedir(it.pz); }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mini.listo, pags, p]);
    // Con el estudio listo, adelanta poco a poco las fotos de la primera página de cada parte (Elías: «tarda mucho en cargar
    // cada elemento al cambiar de sección»). Va después de la página que se ve y una a la vez, para no tapar al estudio.
    useEffect(() => {
        if (!mini.listo)
            return;
        const n = Math.max(8, caja.columnas * caja.filas);
        const cola = Object.values(SUBPARTES).flat().filter(x => !esGesto(x) && x !== "traje")
            .flatMap(pt => piezasDe(piezas, pt, figura.familia).filter(pz => pz.origen !== "generica" && pz.glb).slice(0, n));
        let i = 0;
        const t = setInterval(() => { const pz = cola[i++]; if (!pz) {
            clearInterval(t);
            return;
        } mini.pedir(pz); }, 180);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mini.listo, piezas, figura.familia]);
    const cambiar = (nueva) => { setHistoria(h => [...h.slice(-29), figura]); setFuturo([]); setFigura(nueva); setGuardado(false); };
    // Respuesta de la escena al plano de la figura actual (las viejas ya las descartó Vista3D). Si una pieza no encaja,
    // se vuelve a la última figura confirmada y se espera a que la escena la confirme otra vez; sin ninguna confirmada,
    // ¡Guardar! queda apagado (Codex O2).
    const alArmar = (ok, errores) => {
        setLlego(true);
        if (ok) {
            valida.current = figura;
            setConfirmada(firma);
            if (probar.current) {
                const c = probar.current;
                probar.current = null;
                setTimeout(() => setMomento(m => ({ cual: c, n: (m?.n ?? 0) + 1 })), 150);
            }
            return;
        }
        probar.current = null;
        setAviso("Esa pieza no le queda a tu figura.");
        console.warn("pieza rechazada:", errores);
        const v = valida.current;
        if (v && v !== figura) {
            setFigura(v);
            setHistoria(h => h.slice(0, -1));
        }
    };
    useEffect(() => { if (!aviso)
        return; const t = setTimeout(() => setAviso(null), 2600); return () => clearTimeout(t); }, [aviso]);
    // Dirección del último cambio de página de la rejilla, para que entre por ese lado (Codex E5.2).
    const [pasa, setPasa] = useState(null);
    const [guarda, setGuarda] = useState(false);
    const elegirLosa = (t) => {
        if (t === pestana)
            return;
        setPestana(t);
        setSub(SUBPARTES[t][0]);
        setGrupo("todas");
        setPagina(0);
        setPasa(null);
    };
    const elegirSub = (x) => { setSub(x); setGrupo("todas"); setPagina(0); setPasa(null); };
    const elegirModo = (f) => { if (f === modo)
        return; setModo(f); setGrupo("todas"); setPagina(0); setPasa(null); };
    const elegirSaga = (x) => { setSaga(x); setGrupo("todas"); setPagina(0); setPasa(null); };
    const elegirGrupo = (x) => { setGrupo(x); setPagina(0); setPasa(null); };
    const deshacer = () => { if (!historia.length)
        return; setFuturo(f => [figura, ...f].slice(0, 30)); setFigura(historia[historia.length - 1]); setHistoria(h => h.slice(0, -1)); setGuardado(false); };
    const rehacer = () => { if (!futuro.length)
        return; setHistoria(h => [...h.slice(-29), figura]); setFigura(futuro[0]); setFuturo(f => f.slice(1)); setGuardado(false); };
    const restablecer = () => { if (figura !== inicial)
        cambiar(inicial); };
    const tocarItem = (it) => {
        // Traje completo: el personaje tal cual (sin piezas cambiadas); conserva movimientos y extensiones.
        if (it.tipo === "traje") {
            if (it.id !== baseId || Object.keys(figura.piezas).length)
                cambiar({ ...figura, origen: { tipo: "catalogo", personaje: it.id, version: "base", revision: 1 }, piezas: {} });
            return;
        }
        if (it.tipo === "pieza") {
            cambiar(ponerPieza(figura, it.pz, piezas));
            return;
        }
        if (!gesto)
            return;
        const nueva = elegirMovimiento(figura, gesto, it.op?.id ?? null);
        if (nueva.extensiones.alv?.animaciones?.propias?.[gesto] === elegidos[gesto]) {
            setMomento(m => ({ cual: RUEDA_DE[gesto], n: (m?.n ?? 0) + 1 }));
            return;
        }
        probar.current = RUEDA_DE[gesto];
        cambiar(nueva);
    };
    const gestoRueda = (cual) => setMomento(m => ({ cual, n: (m?.n ?? 0) + 1 }));
    // Rueda de gestos al tocar al personaje (reemplaza a los 4 botones). Decidió Codex (encargo 2026-11-26-rueda-gestos-r1):
    // en computadora sale a un lado del toque, hacia donde hay más espacio y sin tapar la cara; en celular, fija en la
    // esquina de abajo a la derecha; siempre a 16 px o más de los bordes de la viñeta.
    const escena = useRef(null);
    const [rueda, setRueda] = useState(null);
    const [pista, setPista] = useState(() => { try {
        return localStorage.getItem("alv-pista-rueda") !== "vista";
    }
    catch {
        return true;
    } });
    const tocar = (nx, ny) => {
        const e = escena.current, v = e?.querySelector(".pz-vista");
        if (!e || !v)
            return;
        const re = e.getBoundingClientRect(), rv = v.getBoundingClientRect();
        const radio = Math.min(168, Math.max(136, innerWidth * 0.15)) / 2, borde = radio + 16;
        let x, y;
        if (innerWidth >= 860) {
            x = rv.left - re.left + nx * rv.width + (nx < 0.5 ? 1 : -1) * radio * 1.15;
            y = Math.max(rv.top - re.top + ny * rv.height, rv.top - re.top + rv.height * 0.5); // de la cintura para abajo: libre la cara
        }
        else {
            x = re.width - borde;
            y = rv.bottom - re.top - borde;
            setCorrer({ x: 0.24, ms: 220 });
        } // celular: la figura se hace a la izquierda (Codex r2, C)
        setRueda({ x: Math.max(borde, Math.min(re.width - borde, x)), y: Math.max(borde, Math.min(re.height - borde, y)) });
        if (pista) {
            setPista(false);
            try {
                localStorage.setItem("alv-pista-rueda", "vista");
            }
            catch { /* sin almacenamiento */ }
        }
    };
    /** Tocar la figura abre la parte tocada (Elías: «seleccionar partes directamente tocando el personaje»). La vista
     *  encuadra la figura de cuerpo entero: arriba la cabeza, al centro el torso (los lados, los brazos), abajo las piernas. */
    const [marca, setMarca] = useState(null);
    const tocarParte = (nx, ny) => {
        if (rueda) {
            cerrarRueda("fuera");
            return;
        }
        const t = ny < 0.4 ? "cabeza" : ny < 0.66 ? (Math.abs(nx - 0.5) > 0.13 ? "brazos" : "torso") : "piernas";
        setMarca(m => ({ t, n: (m?.n ?? 0) + 1 }));
        elegirLosa(t);
        if (pista) {
            setPista(false);
            try {
                localStorage.setItem("alv-pista-rueda", "vista");
            }
            catch { /* sin almacenamiento */ }
        }
    };
    useEffect(() => { if (!marca)
        return; const t = setTimeout(() => setMarca(null), 700); return () => clearTimeout(t); }, [marca]);
    /** Acercar a la cara o ver el cuerpo entero (la escena ya sabe enfocar). */
    const [orden, setOrden] = useState(null);
    const [cerca, setCerca] = useState(false);
    const enfocar = (cabeza) => { setCerca(cabeza); setOrden(o => ({ n: (o?.n ?? 0) + 1, msg: { tipo: "enfocar", zona: cabeza ? "cabeza" : "cuerpo" } })); };
    const girar = (cuanto) => setGiro(g => ({ n: (g?.n ?? 0) + 1, cuanto }));
    // Celular: mientras la rueda está abierta la cámara corre la figura a la izquierda. Al elegir: late 100 ms, la figura
    // regresa al centro en 180 ms mientras la rueda se cierra, y el gesto empieza cuando ya regresó (Codex r2).
    const [correr, setCorrer] = useState(undefined);
    const corrida = useRef(false);
    corrida.current = !!correr && correr.x !== 0;
    const toca = useRef(null);
    const cerrarRueda = useCallback((motivo) => {
        setRueda(null);
        if (corrida.current)
            setCorrer({ x: 0, ms: 180 });
        if (motivo === "elegir" || motivo === "tecla")
            toca.current?.focus({ preventScroll: true }); // el foco vuelve al personaje (Codex)
    }, []);
    // Girar con el teclado: con el personaje enfocado y la rueda cerrada, ← y → (Codex, cierre-r1).
    const [giro, setGiro] = useState(null);
    const elegirGesto = (cual) => {
        if (corrida.current) {
            setTimeout(() => setCorrer({ x: 0, ms: 180 }), 100);
            setTimeout(() => gestoRueda(cual), 280);
        }
        else
            setTimeout(() => gestoRueda(cual), 220);
    };
    const teclaFigura = (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            tocar(0.5, 0.45);
        }
        if (!rueda && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) {
            ev.preventDefault();
            setGiro(g => ({ n: (g?.n ?? 0) + 1, cuanto: ev.key === "ArrowLeft" ? -0.35 : 0.35 }));
        }
    };
    // Pasar de página deslizando de lado (como el carrusel del lobby).
    const toque = useRef(null);
    const bajar = (e) => { toque.current = { x: e.clientX, y: e.clientY }; };
    const subir = (e) => {
        const s = toque.current;
        toque.current = null;
        if (!s)
            return;
        const dx = e.clientX - s.x;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y))
            irA(p + (dx < 0 ? 1 : -1));
    };
    function irA(n) { const m = Math.max(0, Math.min(pags.length - 1, n)); if (m === p)
        return; setPasa(m > p ? "sig" : "ant"); setPagina(m); }
    const pocas = lista.filter(it => (it.tipo === "traje" || (it.tipo === "pieza" ? !!it.pz.glb : !!it.op))).length;
    const indiceSel = lista.filter(it => (it.tipo === "traje" || (it.tipo === "pieza" ? !!it.pz.glb : !!it.op))).findIndex(visible);
    const comun = modo === "generica";
    return (_jsxs("div", { className: "pz pz-taller" + (comun ? " comun" : " original"), children: [_jsx("div", { className: "pz-fondo", "aria-hidden": "true" }), _jsxs("header", { className: "pz-top", children: [onSalir && _jsxs("button", { type: "button", className: "pz-volver", onClick: salir, children: [_jsx("span", { "aria-hidden": "true", children: "\u2190" }), " Volver"] }), _jsx("h1", { className: "pz-titulo", children: "Crear mi personaje" }), _jsxs("button", { type: "button", role: "switch", "aria-checked": comun, className: "pz-modo", onClick: () => elegirModo(comun ? "original" : "generica"), "aria-label": comun ? "Piezas comunes. Toca para usar las originales" : "Piezas originales. Toca para usar las comunes", children: [_jsx("span", { className: "pz-modo-txt izq", children: "Originales" }), _jsx("span", { className: "pz-modo-txt der", children: "Com\u00FAn" }), _jsx("span", { className: "pz-modo-perilla", "aria-hidden": "true", children: comun ? "Común" : "Originales" })] })] }), _jsx("nav", { className: "pz-nav", "aria-label": "Secciones del personaje", children: LOSAS.map(l => (_jsxs("button", { type: "button", className: "pz-sec" + (pestana === l.id ? " on" : "") + (marca?.t === l.id ? " marca" : ""), "aria-pressed": pestana === l.id, style: { "--c1": l.c1, "--c2": l.c2, "--lab": l.lab }, onClick: () => elegirLosa(l.id), children: [_jsx(IconoLosa, { id: l.ico }), _jsx("span", { className: "pz-sec-txt", children: l.titulo }), hecha(l.id) && _jsx("i", { className: "pz-palomita", "aria-label": "con cambios", children: "\u2713" })] }, l.id))) }), _jsxs("div", { className: "pz-escena", ref: escena, children: [_jsx("div", { className: "pz-escena-fondo comic", "aria-hidden": "true", style: { "--arte-h": `url(${absoluta(ARTE + "personalizar/comic-accion-horizontal.webp")})`, "--arte-v": `url(${absoluta(ARTE + "personalizar/comic-accion-vertical.webp")})` } }), _jsx("div", { className: "pz-escena-fondo closet", "aria-hidden": "true", style: { backgroundImage: `url(${ARTE}personalizar/closet.webp)` } }), _jsx("p", { className: "pz-etiqueta", "aria-hidden": "true", children: comun ? "En el clóset…" : "Mientras tanto, en el vestidor…" }), _jsx("div", { className: "pz-toca", ref: toca, tabIndex: 0, role: "button", "aria-label": "Tu personaje: toca una parte para editarla; Enter para los gestos; flechas para girarlo", onKeyDown: teclaFigura, children: _jsx(Vista3D, { url: escenaUrl + (escenaUrl.includes("?") ? "&" : "?") + ["cerca=1", frente ? "frente=" + frente : ""].filter(Boolean).join("&"), plano: plano, alLlegar: llego ? null : "entrada", className: "pz-vista", momento: momento, onArmado: alArmar, onToque: tocarParte, correr: correr, giro: giro, orden: orden, onPresion: () => { if (rueda)
                                cerrarRueda("fuera"); } }) }), pista && !rueda && _jsx("p", { className: "pz-pista", "aria-hidden": "true", children: "Toca una parte para editarla" }), _jsxs("div", { className: "pz-controles", children: [_jsxs("div", { className: "pz-grupo-ctl", children: [_jsx("button", { type: "button", onClick: () => girar(-0.5), "aria-label": "Girar a la izquierda", title: "Girar", children: "\u27F2" }), _jsx("button", { type: "button", onClick: () => girar(0.5), "aria-label": "Girar a la derecha", title: "Girar", children: "\u27F3" })] }), _jsxs("div", { className: "pz-grupo-ctl", children: [_jsx("button", { type: "button", onClick: () => enfocar(false), disabled: !cerca, "aria-label": "Ver cuerpo entero", title: "Alejar", children: "\u2212" }), _jsx("button", { type: "button", onClick: () => enfocar(true), disabled: cerca, "aria-label": "Acercar a la cara", title: "Acercar", children: "+" })] }), _jsx("button", { type: "button", className: "pz-gestos", onClick: () => tocar(0.62, 0.6), "aria-label": "Probar gestos", children: "\u2605 Gestos" })] }), rueda && _jsx(RuedaGestos, { gestos: RUEDA, x: rueda.x, y: rueda.y, onElegir: elegirGesto, onCerrar: cerrarRueda }), aviso && _jsx("div", { className: "pz-aviso", role: "status", children: aviso })] }), _jsxs("section", { className: "pz-panel", style: { "--pj": losa.c2, "--pj1": losa.c1 }, "aria-label": losa.titulo, children: [_jsxs("header", { className: "pz-cab", children: [_jsx(IconoLosa, { id: losa.ico }), _jsxs("div", { children: [_jsx("h2", { children: losa.titulo }), _jsxs("p", { children: [NOMBRE_SUB[sub], " \u00B7 ", pocas ? (indiceSel >= 0 ? `${indiceSel + 1} de ${pocas}` : `${pocas} ${gesto ? "movimientos" : "piezas"}`) : "nada por ahora", comun ? " comunes" : " originales"] })] })] }), SUBPARTES[pestana].length > 1 && (_jsx("div", { className: "pz-subs", role: "tablist", children: SUBPARTES[pestana].map(x => _jsx("button", { type: "button", role: "tab", className: "pz-sub" + (sub === x ? " on" : ""), "aria-selected": sub === x, onClick: () => elegirSub(x), children: NOMBRE_SUB[x] }, x)) })), (sagas.length > 0 || grupos.length > 1 || paleta) && (_jsxs("div", { className: "pz-filtros", children: [sagas.length > 0 && (_jsx("div", { className: "pz-chips pz-sagas", role: "group", "aria-label": "Sagas", children: [{ id: "todas", nombre: "Todas" }, ...sagas].map(x => (_jsx("button", { type: "button", className: "pz-chip" + (sg === x.id ? " on" : ""), "aria-pressed": sg === x.id, onClick: () => elegirSaga(x.id), children: x.nombre }, x.id))) })), grupos.length > 1 && (_jsx("div", { className: "pz-chips", role: "group", "aria-label": originales ? "Grupos" : "Tipos", children: [{ id: "todas", nombre: "Todos" }, ...grupos].map(x => (_jsx("button", { type: "button", className: "pz-chip" + (g === x.id ? " on" : ""), "aria-pressed": g === x.id, onClick: () => elegirGrupo(x.id), children: x.nombre }, x.id))) })), paleta && (_jsxs("div", { className: "pz-colores", role: "group", "aria-label": NOMBRE_PALETA[paleta], children: [_jsx("button", { type: "button", className: "pz-color pz-color-original" + (tinte ? "" : " on"), "aria-label": "Color original", "aria-pressed": !tinte, title: "Color original", onClick: () => parte && cambiar(quitarTinte(figura, parte, paleta)) }), PALETAS[paleta].map(c => (_jsx("button", { type: "button", className: "pz-color" + (tinte === c.id ? " on" : ""), style: { "--c": c.hex }, "aria-label": c.nombre, "aria-pressed": tinte === c.id, title: c.nombre, onClick: () => parte && cambiar(teñir(figura, parte, paleta, c.id)) }, c.id)))] }))] })), _jsxs("div", { className: "pz-rejilla" + (pasa ? " pasa-" + pasa : ""), ref: rejilla, onPointerDown: bajar, onPointerUp: subir, style: { gridTemplateColumns: `repeat(${caja.columnas}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${caja.filas}, minmax(0, 1fr))` }, children: [(pags[p] ?? []).map(it => {
                                const clave = it.tipo === "traje" ? "traje-" + it.id : it.tipo === "pieza" ? it.pz.id : it.op?.id ?? "de-siempre";
                                const nombre = it.tipo === "traje" ? it.nombre : it.tipo === "pieza" ? (it.pz.glb ? it.pz.nombre : "Ninguno") : it.op ? it.op.nombre : "De siempre";
                                const on = visible(it);
                                return (_jsxs("button", { type: "button", className: "pz-pieza" + (on ? " on" : ""), "aria-pressed": on, onClick: () => tocarItem(it), title: it.tipo === "mov" && it.op ? `${it.op.nombre} · ${it.op.sub}` : nombre, children: [(() => {
                                            if (it.tipo === "traje")
                                                return it.foto ? _jsx("img", { src: it.foto, alt: "", draggable: false, loading: "lazy" }) : _jsx("span", { className: "pz-sin", "aria-hidden": "true", children: "\u2014" });
                                            if (it.tipo === "mov") {
                                                if (it.op?.foto)
                                                    return _jsx("img", { src: it.op.foto, alt: "", draggable: false, loading: "lazy" });
                                                return _jsx("svg", { className: "pz-mov-ico", viewBox: "0 0 24 24", "aria-hidden": "true", children: _jsx(TrazosGesto, { cual: gesto ? RUEDA_DE[gesto] : "especial" }) });
                                            }
                                            const pz = it.pz;
                                            if (!pz.glb)
                                                return _jsx("span", { className: "pz-sin", "aria-hidden": "true", children: "\u2014" });
                                            if (pz.origen === "generica")
                                                return fotoValida(pz.foto) ? _jsx("img", { src: pz.foto, alt: "", draggable: false, loading: "lazy" }) : _jsx("span", { className: "pz-sin", "aria-hidden": "true", children: "\u2014" });
                                            const m = mini.foto(pz);
                                            if (m)
                                                return _jsx("img", { src: m, alt: "", draggable: false });
                                            // Mientras llega su foto, la del personaje del que sale (no un círculo girando): la rejilla se ve de inmediato.
                                            if (m === undefined)
                                                return pz.foto ? _jsx("img", { className: "provisional", src: pz.foto, alt: "", draggable: false }) : _jsx("span", { className: "pz-espera", "aria-hidden": "true" });
                                            return pz.foto ? _jsx("img", { src: pz.foto, alt: "", draggable: false, loading: "lazy" }) : _jsx("span", { className: "pz-sin", "aria-hidden": "true", children: "\u2014" });
                                        })(), _jsx("span", { children: nombre }), it.tipo === "mov" && it.op && _jsx("small", { className: "pz-mov-sub", children: it.op.sub }), on && _jsx("i", { className: "pz-check", "aria-hidden": "true", children: "\u2713" })] }, clave));
                            }), !pocas && (_jsx("p", { className: "pz-vacio", children: comun ? "Pronto: aún no hay piezas comunes de este tipo. Prueba con las originales." : "Todavía no hay piezas de este tipo." }))] }), pags.length > 1 && (_jsxs("div", { className: "pz-paginas", children: [_jsx("button", { type: "button", className: "pz-flecha", onClick: () => irA(p - 1), disabled: p === 0, "aria-label": "P\u00E1gina anterior", children: _jsx("span", { className: "pz-flecha-t", children: "\u2039" }) }), _jsx("span", { className: "pz-puntos", "aria-label": `Página ${p + 1} de ${pags.length}`, children: pags.map((_, i) => _jsx("i", { className: i === p ? "on" : "" }, i)) }), _jsx("button", { type: "button", className: "pz-flecha", onClick: () => irA(p + 1), disabled: p >= pags.length - 1, "aria-label": "P\u00E1gina siguiente", children: _jsx("span", { className: "pz-flecha-t", children: "\u203A" }) })] }))] }), _jsxs("footer", { className: "pz-pie", children: [_jsx("button", { type: "button", className: "pz-redondo", onClick: deshacer, disabled: !historia.length, "aria-label": "Deshacer", title: "Deshacer", children: "\u21B6" }), _jsx("button", { type: "button", className: "pz-redondo", onClick: rehacer, disabled: !futuro.length, "aria-label": "Rehacer", title: "Rehacer", children: "\u21B7" }), _jsx("button", { type: "button", className: "pz-restablecer", onClick: restablecer, disabled: figura === inicial, children: "Restablecer" }), _jsxs("button", { type: "button", className: "pz-guardar" + (guarda ? " guarda" : ""), disabled: !sePuedeGuardar, onAnimationEnd: () => setGuarda(false), onClick: () => { if (sePuedeGuardar) {
                            onGuardar(figura);
                            setGuardado(true);
                            setGuarda(true);
                        } }, children: [_jsx("span", { "aria-hidden": "true", children: "\u2713" }), " ", guardado ? "¡Guardado!" : _jsxs(_Fragment, { children: ["Guardar", _jsx("span", { className: "pz-largo", children: " personaje" })] })] })] }), mini.marco, volteo && paginaAnterior && (_jsx("div", { className: "pz-volteo " + volteo, "aria-hidden": "true", onAnimationEnd: finVolteo, children: _jsx("div", { className: "pz-hoja", style: { backgroundImage: `url(${ARTE}personalizar/comic-accion-${innerWidth >= 860 ? "horizontal" : "vertical"}.webp)` } }) }))] }));
}
