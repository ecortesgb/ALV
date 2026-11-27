import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { sonarPoder } from "./sonido";
// Figuras 3D (Minifig Studio, copiado en public/minifig): cápsulas por jugador, escena de varias figuras,
// fotos para las listas chicas y el editor. El 3D vive en iframes del mismo origen; aquí solo se mandan mensajes.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { paramsEscena } from "./preferencias";
import { alPedirGesto, animacionDe, esGesto, terminarGesto } from "./animaciones";
import { alPedirPoder } from "./poderes";
import { PRIORIDAD_VIDA, animPerfil, perfilDe, soloApariencia } from "./perfiles";
import { alVida, nombreVida, useVidaPerfil } from "./vidaPerfil";
import { conForma, useVersionFormas } from "./formas";
import { catalogoParaEscena, modoCorteV3, paraEscena, useCatalogoV3, useEscenaV3 } from "../personajes/integracion";
const BASE = `${import.meta.env.BASE_URL}minifig/`;
export const N_CAPSULAS = 3;
export const esFigura = (f) => !!f && typeof f === "object" && f.version === 2;
const vacio = () => ({ version: 1, activa: null, slots: Array(N_CAPSULAS).fill(null) });
/** Debe coincidir con tools/minifig/alv-puente.js. */
// Con el corte a v3 las cápsulas viven en otra clave (Codex, v3-directo-r1): lo guardado antes del corte en este aparato no se
// vuelve a subir ni cuenta como figura activa; «Mi personaje» pide elegir. (El editor viejo no se usa con el corte.)
export const claveCapsulas = (jugador) => (modoCorteV3() ? "alv-capsulas-c3-" : "alv-capsulas-") + (jugador.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "local");
/** Limpia lo que venga de localStorage, del editor o de la nube. */
export function normalizar(x) {
    const e = vacio();
    const s = x;
    if (!s || !Array.isArray(s.slots))
        return e;
    for (let i = 0; i < N_CAPSULAS; i++) {
        const c = s.slots[i];
        e.slots[i] = c && esFigura(c.figura) ? { nombre: String(c.nombre ?? "Mi figura").slice(0, 24), figura: c.figura, actualizado: String(c.actualizado ?? "") } : null;
    }
    const a = s.activa;
    e.activa = typeof a === "number" && e.slots[a] ? a : e.slots.findIndex(Boolean) >= 0 ? e.slots.findIndex(Boolean) : null;
    return e;
}
// ---------- Cápsulas guardadas en este celular (una clave por jugador) ----------
const oyentes = new Set();
const avisarCambio = () => oyentes.forEach(f => f());
const cache = new Map();
if (typeof window !== "undefined")
    addEventListener("storage", e => { if (e.key?.startsWith("alv-capsulas-"))
        avisarCambio(); });
export function leerCapsulas(jugador) {
    const k = claveCapsulas(jugador);
    let crudo = null;
    try {
        crudo = localStorage.getItem(k);
    }
    catch { /* sin almacenamiento */ }
    const c = cache.get(k);
    if (c && c.crudo === crudo)
        return c.estado;
    let estado = vacio();
    try {
        estado = normalizar(JSON.parse(crudo ?? "null"));
    }
    catch { /* roto: vacío */ }
    cache.set(k, { crudo, estado });
    return estado;
}
export function escribirCapsulas(jugador, e) {
    try {
        localStorage.setItem(claveCapsulas(jugador), JSON.stringify(normalizar(e)));
    }
    catch { /* sin espacio */ }
    avisarCambio();
}
export function useCapsulas(jugador) {
    return useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => leerCapsulas(jugador));
}
export const figuraActiva = (e) => (e.activa == null ? null : e.slots[e.activa]?.figura ?? null);
/** Apodo que el jugador le puso a su figura (personalizador → Nombre). Viaja dentro de la figura; nunca reemplaza su nombre. */
export function apodoDe(f) {
    const a = (f?.extensiones?.alv)?.apodo;
    if (typeof a !== "string")
        return null;
    const t = a.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 24);
    return t || null;
}
/** Para textos de una línea (chips): «Apodo (Nombre)». */
export const conApodo = (nombre, f) => { const a = apodoDe(f); return a ? `${a} (${nombre})` : nombre; };
// ---------- Huella y fotos ----------
export function huella(f) {
    const s = JSON.stringify(f);
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++)
        h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
    return h.toString(16);
}
const FOTOS_CLAVE = "alv-fotos-v6"; // subir el número si cambia el encuadre de las fotos (tools/minifig/escena.js)
const fotos = new Map(); // huella → data URL
const pedidas = new Map();
try {
    for (const [k, v] of JSON.parse(localStorage.getItem(FOTOS_CLAVE) ?? "[]"))
        fotos.set(k, v);
}
catch { /* nada */ }
function guardarFotos() {
    // Solo las 24 más recientes (cuerpo y busto de un lobby de 8): cada foto pesa unos 20 KB.
    const ult = [...fotos].slice(-24);
    try {
        localStorage.setItem(FOTOS_CLAVE, JSON.stringify(ult));
    }
    catch { /* sin espacio */ }
}
let fotografo = null;
let fotografoListo = false;
// Fase 5 (Codex, ajuste 7): fotos de figuras nuevas SOLO en memoria de esta sesión (son de modelos privados: nunca al
// localStorage de las fotos). Las que fallaron no se vuelven a pedir en la sesión: se usa la foto de la v2 de respaldo.
const fotosV3 = new Map();
const fallidasV3 = new Set();
/** Catálogo con el que se pidieron las fotos nuevas: si llega otro (Reintentar recuperó el acceso), las fallidas se olvidan. */
let catalogoFotos = null;
const esV3 = (pid) => pid.startsWith("V3:") || pid.startsWith("V3B:");
const colaFotos = [];
/** Pedidos ya mandados al fotógrafo que aún no responden (si se vuelve a crear, regresan a la cola). */
const enviadasFoto = new Map();
let oyenteFotos = false;
/** Con el corte, el fotógrafo se crea cuando la fuente privada ya resolvió (ver montajeEscena en integracion.ts). */
let esperaFotografo = null;
/** El iframe quedó bajo el service worker de los personajes privados (sin él, los GLB privados no le llegan). */
const bajoServiceWorker = (f) => { try {
    return !!f.contentWindow?.navigator.serviceWorker?.controller;
}
catch {
    return false;
} };
function crearFotografo() {
    fotografo = document.createElement("iframe");
    fotografoListo = false;
    fotografo.src = BASE + "escena.html";
    fotografo.title = "Fotos de figuras";
    fotografo.setAttribute("aria-hidden", "true");
    fotografo.tabIndex = -1;
    fotografo.style.cssText = "position:fixed;left:-400px;top:0;width:80px;height:80px;border:0;opacity:0;pointer-events:none";
    document.body.appendChild(fotografo);
    if (oyenteFotos)
        return;
    oyenteFotos = true;
    addEventListener("message", e => {
        if (e.origin !== location.origin || e.source !== fotografo?.contentWindow || e.data?.origen !== "minifig")
            return;
        if (e.data.tipo === "listo") {
            fotografoListo = true;
            if (!repararFotografo())
                vaciarColaFotos();
        }
        if (e.data.tipo === "foto") {
            enviadasFoto.delete(String(e.data.pid));
            const url = typeof e.data.url === "string" && e.data.url.startsWith("data:image/") ? e.data.url : null;
            if (esV3(String(e.data.pid))) {
                const pid = String(e.data.pid);
                if (url && e.data.v3 === true)
                    fotosV3.set(pid, url);
                else
                    fallidasV3.add(pid);
                (pedidas.get(pid) ?? []).forEach(f => f(url));
                pedidas.delete(pid);
                return;
            }
            // Un escena.js viejo (caché del navegador) ignora el busto y manda el cuerpo: se muestra, pero no se guarda.
            const ok = !String(e.data.pid).startsWith("B:") || e.data.zona === "busto";
            if (url && ok) {
                fotos.set(e.data.pid, url);
                guardarFotos();
            }
            (pedidas.get(e.data.pid) ?? []).forEach(f => f(url));
            pedidas.delete(e.data.pid);
        }
    });
}
const vaciarColaFotos = () => colaFotos.splice(0).forEach(x => enviarFoto(x.pid, x.m));
/** Veces que se rehízo el fotógrafo en esta página (tope: si el service worker no lo toma, las fotos nuevas fallan y se ve
 *  la de respaldo, sin dar vueltas). */
let reparaciones = 0;
/** Con el corte: si hay fotos nuevas por mandar y el fotógrafo ya cargado quedó fuera del service worker (se creó antes de
 *  que la fuente llegara, p. ej. con Reintentar), se quita, lo que no contestó regresa a la cola y se crea otro. true si lo
 *  rehízo (la cola se manda cuando el nuevo avise «listo»). Codex fuente-privada-verif, 2. */
function repararFotografo() {
    if (!modoCorteV3() || !fotografo || reparaciones >= 2 || !colaFotos.some(x => esV3(x.pid)) || bajoServiceWorker(fotografo))
        return false;
    reparaciones++;
    fotografo.remove();
    enviadasFoto.forEach((m, pid) => colaFotos.push({ pid, m }));
    enviadasFoto.clear();
    crearFotografo();
    return true;
}
function pedirAlFotografo(pid, m) {
    colaFotos.push({ pid, m });
    if (modoCorteV3() && !fotografo) {
        // Antes de que la fuente resuelva no se crea (quedaría fuera del service worker); los pedidos esperan en la cola.
        if (!esperaFotografo)
            esperaFotografo = catalogoParaEscena().then(() => { if (!fotografo)
                crearFotografo(); });
        return;
    }
    if (!fotografo)
        crearFotografo();
    if (fotografoListo && !repararFotografo())
        vaciarColaFotos();
}
const enviarFoto = (pid, m) => {
    enviadasFoto.set(pid, m);
    fotografo?.contentWindow?.postMessage({
        ...(m.encuadre === "busto"
            ? { origen: "alv", tipo: "foto", pid, figura: m.figura ?? null, semilla: m.semilla, ancho: 320, alto: 320, zona: "busto" }
            : { origen: "alv", tipo: "foto", pid, figura: m.figura ?? null, semilla: m.semilla, ancho: 240, alto: 300 }),
        ...(m.plano3 ? { plano3: m.plano3 } : {})
    }, location.origin);
};
/** Clave y plano de la foto de una figura nueva (con la bandera y el catálogo), o null: entonces la foto es la de siempre.
 *  La clave lleva el plano resuelto (personaje, piezas, tintes, GLB), la revisión del personaje y el encuadre. */
function fotoNueva(figura, encuadre, cat) {
    if (!cat || !figura)
        return null;
    if (cat !== catalogoFotos) {
        catalogoFotos = cat;
        fallidasV3.clear();
    }
    const x = paraEscena({ id: "foto", figura }, cat);
    if (!x.plano3)
        return null;
    const rev = figura.extensiones?.alv?.v3?.origen?.revision ?? 0;
    const pid = (encuadre === "busto" ? "V3B:" : "V3:") + huella({ p: x.plano3, rev });
    return fallidasV3.has(pid) ? null : { pid, plano3: x.plano3 };
}
/** Número fijo sacado de un texto: la misma figura al azar para el mismo jugador. */
export const semillaDe = (texto) => parseInt(huella(texto), 16) % 2147483647;
/** Foto de la figura (sale del 3D la primera vez y luego se guarda). Sin figura, una al azar fija por `semilla`. */
export function useFoto(figura, semilla, encuadre = "cuerpo") {
    const cat = useCatalogoV3();
    const [fallo, setFallo] = useState(0); // sube cuando una foto nueva falla: se recalcula y sale la de respaldo
    const nueva = useMemo(() => fotoNueva(figura, encuadre, cat), [figura, encuadre, cat, fallo]); // eslint-disable-line react-hooks/exhaustive-deps
    const h = useMemo(() => {
        if (nueva)
            return nueva.pid;
        const b = figura ? huella(figura) : semilla != null ? "s" + semilla : null;
        return b && encuadre === "busto" ? "B:" + b : b;
    }, [nueva, figura, semilla, encuadre]);
    const deMemoria = (k) => (esV3(k) ? fotosV3.get(k) : fotos.get(k)) ?? null;
    const [url, setUrl] = useState(() => (h ? deMemoria(h) : null));
    useEffect(() => {
        if (!h) {
            setUrl(null);
            return;
        }
        const ya = deMemoria(h);
        if (ya) {
            setUrl(ya);
            return;
        }
        let vivo = true;
        const lista = pedidas.get(h);
        const f = (u) => { if (!vivo)
            return; if (!u && esV3(h))
            setFallo(n => n + 1);
        else
            setUrl(u); };
        if (lista)
            lista.push(f);
        else {
            pedidas.set(h, [f]);
            pedirAlFotografo(h, { figura, semilla, encuadre, plano3: nueva?.plano3 });
        }
        return () => { vivo = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [h]);
    return url;
}
/** Figura en imagen, para tarjetas, ranking y listas. Ocupa la caja del Avatar (alto = 1.5 × ancho).
 *  `redondo`: retrato circular de cabeza y hombros (ver alv.css, «Retrato circular»). */
export function FotoFigura({ figura, semilla, size, nombre, redondo = false }) {
    const url = useFoto(figura, semilla);
    const caja = redondo ? { width: size, height: size } : { width: size, height: Math.round(size * 1.5) };
    return (_jsx("span", { className: "av av-3d" + (redondo ? " av-redondo" : ""), style: caja, role: "img", "aria-label": `Figura de ${nombre ?? "jugador"}`, children: url ? _jsx("img", { src: url, alt: "", draggable: false }) : _jsx("span", { className: "av-3d-cargando", "aria-hidden": "true" }) }));
}
/**
 * Una sola escena 3D con todas las figuras (de izquierda a derecha en el orden dado).
 * `momentos`: cada vez que cambia `n`, esa figura hace ese momento (al anotar, al ganar, al perder).
 */
// Prototipo «LEGO 3D cinematográfico» (ALV_PLAN_LEGO_CINE.md), solo en el HUB y solo con la bandera en la dirección:
// ?cine=1 → tu figura con el acabado nuevo · ?cine=prueba → la figura de prueba · &calidad=alta|media|baja fuerza el nivel.
function paramsCine() {
    const q = new URLSearchParams(location.search), cine = q.get("cine");
    if (!cine)
        return "";
    const calidad = q.get("calidad");
    return "&estilo=cine" + (cine === "prueba" ? "&prueba=cine" : "") + (calidad && /^(alta|media|baja)$/.test(calidad) ? "&calidad=" + calidad : "");
}
/**
 * Cada figura va con su talla y su especial (aparte, para que la huella de la figura no cambie). Con `vida` (HUB,
 * lobby, TV) también con las perillas de su personalidad, y al motor va solo la apariencia.
 */
const conAnim = (lista, vida, hay = () => false) => lista.map(x => (vida
    ? { ...x, figura: soloApariencia(x.figura), anim: { ...animacionDe(x.figura), ...animPerfil(x.figura, hay) } }
    : { ...x, anim: animacionDe(x.figura) }));
/** Lo que el motor avisa de los gestos: terminó, o no pudo hacerlo (la figura vuelve a su espera en la tienda). */
export function avisoDelMotor(d) {
    if (typeof d.id !== "string" || !esGesto(d.cual))
        return;
    if (d.tipo === "termino" || (d.tipo === "gesto" && d.ok === false))
        terminarGesto(d.id, d.cual);
}
export function Escena3D({ figuras, momentos, className, alto, modo, columnas, sinPedestal, asientos, boton, expulsar, alVolar, alCabezas, vida }) {
    const ref = useRef(null);
    const [listo, setListo] = useState(false);
    const enviar = (m) => ref.current?.contentWindow?.postMessage({ origen: "alv", ...m }, location.origin);
    // Fase 5: con la bandera encendida las figuras que traen v3 van con su plano; apagada, igual que siempre. Con el corte,
    // el iframe se crea cuando la fuente privada ya resolvió (y otra vez si llega tarde): ver montajeEscena.
    const { catalogo: v3, montar, clave } = useEscenaV3();
    // Iframe nuevo: hasta que avise «listo» no se le manda nada, y los momentos vigentes se le vuelven a mandar (Codex
    // fuente-privada-verif, 3).
    useEffect(() => { listoRef.current = false; setListo(false); vistos.current = new Map(); }, [clave]);
    const ultimas = useRef({ figuras, columnas, asientos, alVolar, alCabezas, vida, v3 });
    ultimas.current = { figuras, columnas, asientos, alVolar, alCabezas, vida, v3 };
    const listoRef = useRef(false);
    // Animaciones de la biblioteca que tiene ESTA escena (las avisa biblioteca-anim.js).
    const bib = useRef(new Set());
    const hay = (n) => bib.current.has(n);
    const mandarFiguras = () => { const u = ultimas.current; enviar({ tipo: "figuras", lista: conAnim(u.figuras.map(x => conForma(x, u.v3)), u.vida, hay).map(x => paraEscena(x, u.v3)), columnas: u.columnas, asientos: u.asientos }); };
    useEffect(() => { if (v3 && listoRef.current)
        mandarFiguras(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [v3]);
    useEffect(() => {
        const f = (e) => {
            if (e.origin !== location.origin || e.source !== ref.current?.contentWindow || e.data?.origen !== "minifig")
                return;
            // También llega si la escena se recarga: se le vuelven a mandar las figuras.
            if (e.data.tipo === "vuelo" && typeof e.data.d === "number")
                ultimas.current.alVolar?.(e.data.d);
            if (e.data.tipo === "cabezas" && e.data.pos && typeof e.data.pos === "object")
                ultimas.current.alCabezas?.(e.data.pos);
            if (e.data.tipo === "listo") {
                listoRef.current = true;
                setListo(true);
                mandarFiguras();
            }
            if (e.data.tipo === "sonido")
                sonarPoder(e.data.cual); // poderes: suena cuando sale el efecto
            if (e.data.tipo === "biblioteca" && Array.isArray(e.data.registradas)) {
                bib.current = new Set(e.data.registradas.filter((x) => typeof x === "string"));
                if (listoRef.current && ultimas.current.vida)
                    mandarFiguras();
            }
            avisoDelMotor(e.data);
        };
        addEventListener("message", f);
        // Gestos de la tienda global: solo los de las figuras de esta escena.
        const fuera = alPedirGesto(g => { if (listoRef.current && ultimas.current.figuras.some(x => x.id === g.jugador))
            enviar({ tipo: "momento", id: g.jugador, cual: g.gesto, prio: g.prioridad }); });
        // Vida automática (la decidió el aparato dueño de esa figura; aquí solo se dibuja).
        const fueraVida = alVida(v => {
            if (!listoRef.current || !ultimas.current.vida || !ultimas.current.figuras.some(x => x.id === v.jugador))
                return;
            enviar({ tipo: "momento", id: v.jugador, cual: nombreVida(v, hay), prio: PRIORIDAD_VIDA, vel: v.vel, int: v.int, ...(v.dur ? { dur: v.dur } : {}) });
        });
        // Poderes (rueda o mando): la escena toca el clip del juego y dibuja sus efectos.
        const fueraPoder = alPedirPoder(p => { if (listoRef.current && ultimas.current.figuras.some(x => x.id === p.jugador))
            enviar({ tipo: "poder", id: p.jugador, poder: p.poder }); });
        return () => { removeEventListener("message", f); fuera(); fueraVida(); fueraPoder(); };
    }, []);
    const firma = figuras.map(x => `${x.id}:${x.figura ? huella(x.figura) : "s" + x.semilla}:${x.foco ? 1 : 0}:${x.color ?? ""}:${x.columna ?? ""}`).join("|") + "#" + (columnas ?? "") + "#" + (asientos ?? []).join(",");
    // Transformaciones (formas.ts): al cambiar la forma de alguien se vuelven a mandar las figuras.
    const formas = useVersionFormas();
    useEffect(() => { if (listo)
        mandarFiguras(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [listo, firma, vida, formas]);
    useEffect(() => { if (listo && modo === "nave")
        enviar({ tipo: "nave", boton: boton ?? "quieto" }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [listo, boton]);
    useEffect(() => { if (listo && modo === "nave" && expulsar)
        enviar({ tipo: "expulsar", id: expulsar }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [listo, expulsar]);
    const vistos = useRef(new Map());
    useEffect(() => {
        if (!listo || !listoRef.current)
            return;
        for (const m of momentos ?? []) {
            const clave = `${m.id}:${m.cual}`;
            if (vistos.current.get(clave) === m.n)
                continue;
            const primera = !vistos.current.has(clave);
            vistos.current.set(clave, m.n);
            if (!primera || m.n > 0)
                enviar({ tipo: "momento", id: m.id, cual: m.cual });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listo, JSON.stringify(momentos ?? [])]);
    return (_jsxs("div", { className: "escena3d" + (className ? " " + className : ""), style: alto ? { height: alto } : undefined, children: [montar && _jsx("iframe", { ref: ref, src: BASE + "escena.html?modo=" + (modo ?? "") + (modo === "hub" ? paramsCine() : "") + (sinPedestal ? "&pedestal=no" : "") + paramsEscena(), title: "Escena con las figuras", tabIndex: -1 }, clave), !listo && _jsx("span", { className: "escena3d-cargando", "aria-live": "polite", children: "Armando figuras\u2026" })] }));
}
/**
 * Una sola figura grande sobre su base: se gira arrastrando, se acerca con la rueda o pellizcando, parpadea y sonríe sola.
 * Al cambiar `zona` la cámara va a esa parte. Al cambiar `figura` se redibuja sin recargar (con un saltito).
 */
export function FiguraViva({ figura, semilla, zona = "completa", mando, className, vida }) {
    const ref = useRef(null);
    const [listo, setListo] = useState(false);
    const enviar = (m) => ref.current?.contentWindow?.postMessage({ origen: "alv", ...m }, location.origin);
    const actual = useRef({ figura, semilla, zona });
    actual.current = { figura, semilla, zona };
    // Pedidos al motor que esperan respuesta; los que llegan antes de «listo» esperan en la cola.
    const espera = useRef(new Map());
    const cola = useRef([]);
    const listoRef = useRef(false);
    // Animaciones de la biblioteca que el motor ya tiene (las avisa biblioteca-anim.js) y pausa de la vida automática
    // mientras se prueba un momento a mano.
    const bib = useRef(new Set());
    const ocupado = useRef(0);
    const mandar = () => {
        const a = actual.current;
        // Al motor va solo la apariencia; la personalidad viaja como perillas (anim) y solo si se pidió `vida`.
        const anim = vida ? animPerfil(a.figura, n => bib.current.has(n)) : undefined;
        enviar({ tipo: "figuras", lista: [{ id: "yo", figura: soloApariencia(a.figura) ?? null, semilla: a.semilla, ...(anim ? { anim } : {}) }] });
    };
    useEffect(() => {
        const f = (e) => {
            if (e.origin !== location.origin || e.source !== ref.current?.contentWindow || e.data?.origen !== "minifig")
                return;
            if (e.data.tipo === "listo") {
                listoRef.current = true;
                setListo(true);
                mandar();
                enviar({ tipo: "enfocar", zona: actual.current.zona });
                cola.current.splice(0).forEach(enviar);
            }
            if (e.data.tipo === "biblioteca" && Array.isArray(e.data.registradas)) {
                bib.current = new Set(e.data.registradas.filter((x) => typeof x === "string"));
                if (listoRef.current)
                    mandar();
            }
            if ((e.data.tipo === "soltar" || e.data.tipo === "azar") && typeof e.data.pid === "string") {
                const r = espera.current.get(e.data.pid);
                espera.current.delete(e.data.pid);
                r?.(esFigura(e.data.figura) ? e.data.figura : null);
            }
        };
        addEventListener("message", f);
        return () => removeEventListener("message", f);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const perfil = vida ? perfilDe(figura) : null;
    const firma = (figura ? huella(figura) : "s" + semilla) + (vida ?? "");
    useEffect(() => { if (listo)
        mandar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [listo, firma]);
    useVidaPerfil({ activo: listo && !!vida, perfil, contexto: vida ?? "partida", id: "yo", enviar, hay: n => bib.current.has(n), ocupadoHasta: ocupado });
    useEffect(() => { if (listo)
        enviar({ tipo: "enfocar", zona }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [listo, zona]);
    useEffect(() => {
        if (!mando)
            return;
        mando.current = {
            girar: cuanto => enviar({ tipo: "girar", cuanto }),
            acercar: cuanto => enviar({ tipo: "acercar", cuanto }),
            gesto: cual => enviar({ tipo: "gesto", cual }),
            probar: momento => { ocupado.current = Date.now() + 6000; enviar({ tipo: "probar", cual: momento }); },
            pedir: (tipo, datos) => new Promise(ok => {
                const pid = tipo + Math.random().toString(36).slice(2);
                espera.current.set(pid, ok);
                const m = { tipo, pid, figura: datos.figura ?? null, semilla: datos.semilla };
                if (listoRef.current)
                    enviar(m);
                else
                    cola.current.push(m);
            }),
        };
        return () => { mando.current = null; };
    }, [mando]);
    return (_jsxs("div", { className: "escena3d figura-viva" + (className ? " " + className : ""), children: [_jsx("iframe", { ref: ref, src: BASE + "escena.html?modo=editor" + paramsEscena(), title: "Tu figura: arrastra para girarla" }), !listo && _jsx("span", { className: "escena3d-cargando", "aria-live": "polite", children: "Armando tu figura\u2026" })] }));
}
/** Un jugador listo para `Escena3D`: su figura, o una fija al azar por su id si aún no arma la suya. */
export const enEscena = (id, figura) => (figura ? { id, figura } : { id, semilla: semillaDe(id) });
