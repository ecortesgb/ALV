/** Figura de partida (igual que MinifigCore.nueva(), con colores de ALV). */
export function figuraNueva() {
    return {
        version: 2, nombre: "Mi figura",
        identidad: { piel: "#f2cd37", cabeza: null, rostro: "FACE_001", detalles: [], cabello: { id: "HAIR_001", color: "#582a12" }, estilo: "neutro" },
        ropa: {
            torso: { id: null, color: "#c91a09", estampado: null, colores: ["#ffffff", "#1b2a34", "#6b4a2b"], texto: "", imagen: null },
            mangas: null, brazos: null, guantes: null,
            cadera: { id: null, color: "#0055bf", cinturon: null },
            piernas: { tipo: "normal", id: null, color: "#0055bf", botas: null },
        },
        traje: { id: null, encima: true, usar: { pelo: false, rostro: false }, quitar: [] },
        manual: {},
        accesorios: { cabeza: null, cara: null, espalda: null, mano_der: null, mano_izq: null },
        momentos: { paquete: null, espera: "respirar", victoria: "salto-puno", derrota: "cabeza-baja", punto: "puno-arriba" },
        extensiones: {},
    };
}
const esObjeto = (v) => !!v && typeof v === "object" && !Array.isArray(v);
/** Mezcla profunda como la de minifig-core: los arreglos se reemplazan. */
function mezclar(a, b) {
    for (const k of Object.keys(b)) {
        const v = b[k];
        if (esObjeto(v) && esObjeto(a[k]))
            mezclar(a[k], v);
        else
            a[k] = structuredClone(v);
    }
    return a;
}
/** Cualquier figura guardada, con todos sus campos (lo que falte sale de figuraNueva). */
export function completar(f) {
    const base = figuraNueva();
    return (f ? mezclar(base, f) : base);
}
const editar = (f, cambio) => { const g = completar(f); cambio(g); return g; };
// ---------- Pelo y casco ----------
export const peloDe = (f) => f.identidad.cabello;
export const ponerPelo = (f, id) => editar(f, g => { g.identidad.cabello = id ? { id, color: g.identidad.cabello?.color ?? "#582a12" } : null; });
export const colorPelo = (f, color) => editar(f, g => { if (g.identidad.cabello)
    g.identidad.cabello.color = color; });
export const ponerCasco = (f, id, color) => editar(f, g => { g.accesorios.cabeza = id ? { id, color: g.accesorios.cabeza?.color ?? color } : null; });
export const colorCasco = (f, color) => editar(f, g => { if (g.accesorios.cabeza)
    g.accesorios.cabeza.color = color; });
// ---------- Cabeza ----------
export const ponerPiel = (f, hex) => editar(f, g => { g.identidad.piel = hex; });
export const ponerRostro = (f, id) => editar(f, g => { g.identidad.rostro = id; g.accesorios.cara = null; });
/** Lentes, barbas, pecas: se prenden y apagan. Dos que ocupan el mismo lugar (dos lentes) no van juntos. */
export function alternarDetalle(f, id, ocupa) {
    return editar(f, g => {
        if (!id) {
            g.identidad.detalles = [];
            return;
        }
        const d = g.identidad.detalles;
        if (d.includes(id)) {
            g.identidad.detalles = d.filter(x => x !== id);
            return;
        }
        const o = ocupa(id);
        g.identidad.detalles = [...(o ? d.filter(x => ocupa(x) !== o) : d), id];
    });
}
export const ponerMascara = (f, id) => editar(f, g => { g.accesorios.cara = id ? { id } : null; });
// ---------- Cuello y capa (los dos viven en accesorios.espalda; con capa, el cuello va en manual._cuelloExtra) ----------
const esCapa = (p) => !!p && p.id.startsWith("CAPE_");
export const capaDe = (f) => (esCapa(f.accesorios.espalda) ? f.accesorios.espalda : null);
export function cuelloDe(f) {
    const e = f.accesorios.espalda;
    if (e && !esCapa(e))
        return e;
    return esCapa(e) ? (f.manual._cuelloExtra ?? null) : null;
}
export function ponerCuello(f, p) {
    return editar(f, g => {
        if (esCapa(g.accesorios.espalda)) {
            if (p)
                g.manual._cuelloExtra = { ...p };
            else
                delete g.manual._cuelloExtra;
        }
        else
            g.accesorios.espalda = p ? { ...p } : null;
    });
}
export function ponerCapa(f, p) {
    return editar(f, g => {
        const cuello = cuelloDe(g);
        delete g.manual._cuelloExtra;
        if (p) {
            g.accesorios.espalda = { ...p };
            if (cuello)
                g.manual._cuelloExtra = { ...cuello };
        }
        else
            g.accesorios.espalda = cuello ? { ...cuello } : null;
    });
}
// ---------- Torso ----------
export const ponerEstampado = (f, id) => editar(f, g => { g.ropa.torso.estampado = id; });
export const colorTorso = (f, hex) => editar(f, g => { g.ropa.torso.color = hex; });
export const colorEstampado = (f, i, hex) => editar(f, g => {
    const c = g.ropa.torso.colores.slice(0, 3);
    while (c.length < 3)
        c.push(["#ffffff", "#1b2a34", "#6b4a2b"][c.length]);
    c[i] = hex;
    g.ropa.torso.colores = c;
});
// ---------- Brazos y manos ----------
const CLAVE = {
    brazo: { izq: "brazo_izq", der: "brazo_der" }, mano: { izq: "mano_izq", der: "mano_der" }, pierna: { izq: "pierna_izq", der: "pierna_der" },
};
/** Color base (sin ajustes de un lado) de brazos, manos o piernas, como lo calcula resolver(). */
function baseDe(g, parte) {
    if (parte === "pierna")
        return g.ropa.piernas.color;
    if (parte === "mano")
        return g.ropa.guantes ?? g.identidad.piel;
    return g.ropa.brazos ?? (g.ropa.mangas === "sin" ? g.identidad.piel : g.ropa.torso.color);
}
/**
 * Pinta un solo lado. Trampa del motor: el ajuste del lado derecho cambia el color base de AMBOS lados (resolver hace
 * `S.piernas.color = pierna_der.color`), así que al pintar el derecho el izquierdo se fija a como se veía.
 */
function pintarLado(g, parte, lado, hex) {
    const izq = CLAVE[parte].izq;
    if (lado === "der" && !g.manual[izq]?.color)
        colorManual(g, izq, colorVisible(g, parte, "izq"));
    colorManual(g, CLAVE[parte][lado], hex);
}
function colorVisible(g, parte, lado) {
    const der = g.manual[CLAVE[parte].der]?.color;
    const propio = g.manual[CLAVE[parte][lado]]?.color;
    return propio ?? der ?? baseDe(g, parte);
}
function colorManual(g, clave, hex) {
    const m = { ...(g.manual[clave] ?? {}) };
    if (hex)
        m.color = hex;
    else
        delete m.color;
    if (Object.keys(m).length)
        g.manual[clave] = m;
    else
        delete g.manual[clave];
}
/** Brazos: "torso" = mangas del color del torso, "piel" = sin mangas, o un color. */
export function ponerBrazos(f, lado, valor) {
    return editar(f, g => {
        if (lado === "ambos") {
            g.ropa.brazos = valor === "torso" || valor === "piel" ? null : valor;
            g.ropa.mangas = valor === "piel" ? "sin" : valor === "torso" ? "larga" : g.ropa.mangas;
            colorManual(g, CLAVE.brazo.izq, null);
            colorManual(g, CLAVE.brazo.der, null);
            return;
        }
        pintarLado(g, "brazo", lado, valor === "torso" ? g.ropa.torso.color : valor === "piel" ? g.identidad.piel : valor);
    });
}
/** Manos: "piel" = sin guantes, o un color. */
export function ponerManos(f, lado, valor) {
    return editar(f, g => {
        if (lado === "ambos") {
            g.ropa.guantes = valor === "piel" ? null : valor;
            colorManual(g, CLAVE.mano.izq, null);
            colorManual(g, CLAVE.mano.der, null);
            return;
        }
        pintarLado(g, "mano", lado, valor === "piel" ? g.identidad.piel : valor);
    });
}
/** Color que se ve en un lado (para marcar la muestra elegida). */
export function colorDeLado(f, parte, lado) {
    if (lado !== "ambos")
        return colorVisible(f, parte, lado);
    if (parte === "brazo")
        return f.ropa.brazos ?? (f.ropa.mangas === "sin" ? "piel" : "torso");
    if (parte === "mano")
        return f.ropa.guantes ?? "piel";
    return f.ropa.piernas.color;
}
/** ¿Tiene un lado distinto del otro? (para avisarlo en Básico) */
export const ladosPersonalizados = (f, parte) => !!(f.manual[CLAVE[parte].izq]?.color || f.manual[CLAVE[parte].der]?.color);
// ---------- Cadera, piernas y botas ----------
export const colorCadera = (f, hex) => editar(f, g => { g.ropa.cadera.color = hex; });
export const ponerCinturon = (f, color) => editar(f, g => { g.ropa.cadera.cinturon = color ? { id: "BELT_001", color } : null; });
export const tipoPiernas = (f, tipo) => editar(f, g => { g.ropa.piernas.tipo = tipo; g.ropa.piernas.id = null; });
/** Color de piernas. `conCadera` (Básico, «piernas completas»): la cadera toma el mismo color. */
export function colorPiernas(f, lado, hex, conCadera = false) {
    return editar(f, g => {
        if (lado === "ambos") {
            g.ropa.piernas.color = hex;
            if (conCadera)
                g.ropa.cadera.color = hex;
            if (!conCadera) {
                colorManual(g, CLAVE.pierna.izq, null);
                colorManual(g, CLAVE.pierna.der, null);
            }
            return;
        }
        pintarLado(g, "pierna", lado, hex);
    });
}
export const ponerBotas = (f, color) => editar(f, g => { g.ropa.piernas.botas = color; });
// ---------- Objetos ----------
export const ponerObjeto = (f, mano, p) => editar(f, g => { g.accesorios[mano] = p ? { ...p } : null; });
// ---------- Detalles por grupo (lentes / barba / marcas) ----------
/** Quita los detalles de un grupo (`ocupa`: "ojos", "barba"; null = marcas sueltas como pecas). */
export const quitarDetalles = (f, ocupa, grupo) => editar(f, g => { g.identidad.detalles = g.identidad.detalles.filter(x => ocupa(x) !== grupo); });
/** Los momentos de siempre (MOMENTOS_BASE de minifig-core). */
export const MOMENTOS_NORMALES = { id: null, espera: "respirar", victoria: "salto-puno", derrota: "cabeza-baja", punto: "puno-arriba" };
export const ponerMomentos = (f, p) => editar(f, g => { g.momentos = { paquete: p.id, espera: p.espera, victoria: p.victoria, derrota: p.derrota, punto: p.punto }; });
/** Apodo de la figura (nombre del outfit). No es el nombre de la cuenta. */
export const LARGO_APODO = 24;
export const limpiarApodo = (s) => s.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").slice(0, LARGO_APODO);
export const ponerApodo = (f, nombre) => editar(f, g => {
    const apodo = limpiarApodo(nombre).trim();
    g.nombre = apodo || "Mi figura";
    // extensiones.alv.apodo: solo existe si el jugador lo escribió (las figuras viejas traen nombres de personaje en `nombre`).
    const alv = { ...(g.extensiones.alv ?? {}) };
    if (apodo)
        alv.apodo = apodo;
    else
        delete alv.apodo;
    g.extensiones = { ...g.extensiones, alv };
});
// ---------- Cascos y máscaras (una sola cosa en la cabeza) ----------
/** Casco o gorro: quita la máscara de cara si había. */
export const ponerCascoSolo = (f, id, color) => editar(f, g => { g.accesorios.cabeza = id ? { id, color: g.accesorios.cabeza?.id === id ? g.accesorios.cabeza.color ?? color : color } : null; g.accesorios.cara = null; });
/** Máscara de cara completa (araña, pantera…): pinta la cabeza de su color, tapa el pelo y quita el casco. */
export const ponerMascaraCompleta = (f, id, color) => editar(f, g => { g.accesorios.cara = id ? { id, color, tapaPelo: true } : null; if (id)
    g.accesorios.cabeza = null; });
/** ¿Algo en la cabeza tapa el pelo? (casco o máscara que lo tapa) */
export const pelaTapado = (f) => !!f.accesorios.cabeza || !!f.accesorios.cara?.tapaPelo;
const AMARILLO_PIEL = "#f2cd37"; // en los personajes de la biblioteca, brazos o manos amarillos = piel descubierta
/**
 * Elige el torso y le pone brazos y manos que combinan. Con `original` (estampado de personaje) usa sus colores tal cual;
 * sin él (torsos para pintar) los brazos siguen al torso y las manos a la piel. Quita los ajustes de un solo brazo o mano.
 */
export function ponerTorsoCompleto(f, estampado, original) {
    return editar(f, g => {
        g.ropa.torso.estampado = estampado;
        ["brazo_izq", "brazo_der", "mano_izq", "mano_der"].forEach(k => colorManual(g, k, null));
        if (original) {
            g.ropa.torso.color = original.color;
            g.ropa.torso.colores = original.colores.slice(0, 3);
            const piel = original.brazos.toLowerCase() === AMARILLO_PIEL;
            g.ropa.mangas = piel ? "sin" : "larga";
            g.ropa.brazos = piel || original.brazos.toLowerCase() === original.color.toLowerCase() ? null : original.brazos;
            g.ropa.guantes = original.manos.toLowerCase() === AMARILLO_PIEL ? null : original.manos;
        }
        else {
            g.ropa.brazos = null;
            g.ropa.mangas = null;
            g.ropa.guantes = null;
        }
    });
}
// ---------- Trajes completos (personajes de la biblioteca y estilos de ALV) ----------
/** El personaje completo: todas sus piezas. Se conservan el apodo y lo guardado en extensiones (modo, apodo). */
export function vestirCompleto(f, traje) {
    const g = completar(traje);
    g.nombre = f.nombre;
    g.extensiones = structuredClone(f.extensiones);
    return g;
}
/** Solo el traje: ropa, capa, objetos y momentos del personaje; tu piel, rostro, pelo y lo que llevas en la cabeza se quedan. */
export function vestirSoloTraje(f, traje) {
    const g = vestirCompleto(f, traje);
    g.identidad = structuredClone(f.identidad);
    g.accesorios.cabeza = f.accesorios.cabeza ? { ...f.accesorios.cabeza } : null;
    g.accesorios.cara = f.accesorios.cara ? { ...f.accesorios.cara } : null;
    delete g.manual.cabeza;
    return g;
}
const MANUAL_DE = { cuello: ["_cuelloExtra"], torso: ["torso", "brazo_der", "brazo_izq", "mano_der", "mano_izq"], piernas: ["cadera", "piernas", "pierna_der", "pierna_izq"], cabeza: ["cabeza"] };
/** Copia de `antes` a `nueva` las partes con candado: «¡Sorpréndeme!» cambia todo lo demás. */
export function conservar(nueva, antes, partes) {
    return editar(nueva, g => {
        const a = completar(antes);
        for (const p of partes) {
            if (p === "pelo") {
                g.identidad.cabello = structuredClone(a.identidad.cabello);
                g.accesorios.cabeza = structuredClone(a.accesorios.cabeza);
                g.accesorios.cara = structuredClone(a.accesorios.cara);
            }
            if (p === "cabeza") {
                g.identidad.piel = a.identidad.piel;
                g.identidad.rostro = a.identidad.rostro;
                g.identidad.detalles = a.identidad.detalles.slice();
                g.identidad.cabeza = a.identidad.cabeza;
            }
            if (p === "cuello")
                g.accesorios.espalda = structuredClone(a.accesorios.espalda);
            if (p === "torso") {
                g.ropa.torso = structuredClone(a.ropa.torso);
                g.ropa.mangas = a.ropa.mangas;
                g.ropa.brazos = a.ropa.brazos;
                g.ropa.guantes = a.ropa.guantes;
            }
            if (p === "piernas") {
                g.ropa.cadera = structuredClone(a.ropa.cadera);
                g.ropa.piernas = structuredClone(a.ropa.piernas);
            }
            if (p === "objetos") {
                g.accesorios.mano_der = structuredClone(a.accesorios.mano_der);
                g.accesorios.mano_izq = structuredClone(a.accesorios.mano_izq);
            }
            if (p === "momentos")
                g.momentos = structuredClone(a.momentos);
            for (const k of MANUAL_DE[p] ?? []) {
                if (a.manual[k])
                    g.manual[k] = structuredClone(a.manual[k]);
                else
                    delete g.manual[k];
            }
        }
    });
}
// ---------- Piezas bloqueadas ----------
/**
 * Quita de la figura las piezas que el jugador no puede usar (`libre(id)` = false) y pone lo más parecido que sí es libre.
 * Sirve para el dado y «¡Sorpréndeme!», que pueden sacar piezas raras.
 */
export function limpiarBloqueadas(f, libre) {
    return editar(f, g => {
        if (g.identidad.cabello && !libre(g.identidad.cabello.id))
            g.identidad.cabello = { ...g.identidad.cabello, id: "HAIR_001" };
        if (g.identidad.rostro && !libre(g.identidad.rostro))
            g.identidad.rostro = "FACE_001";
        g.identidad.detalles = g.identidad.detalles.filter(libre);
        for (const k of ["cabeza", "cara", "espalda", "mano_der", "mano_izq"])
            if (g.accesorios[k] && !libre(g.accesorios[k].id))
                g.accesorios[k] = null;
        const extra = g.manual._cuelloExtra;
        if (extra && !libre(extra.id))
            delete g.manual._cuelloExtra;
        if (g.ropa.torso.estampado && !libre(g.ropa.torso.estampado))
            g.ropa.torso.estampado = null;
        if (g.momentos.paquete && !libre("MOM_" + g.momentos.paquete))
            g.momentos = { paquete: null, espera: MOMENTOS_NORMALES.espera, victoria: MOMENTOS_NORMALES.victoria, derrota: MOMENTOS_NORMALES.derrota, punto: MOMENTOS_NORMALES.punto };
    });
}
