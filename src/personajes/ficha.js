// Lee y valida la ficha de un personaje que entrega producción (CONTRATO-ENTREGA.md §3).
// Lo que llega de un servidor no es confiable: se revisa campo por campo y se rechaza lo que no cuadra.
import { familia } from "./familias";
import { ACCIONES_JUEGO, HUESOS_LOGICOS, LOGICAS, esId, esLogica } from "./tipos";
const texto = (x, max = 80) => typeof x === "string" && x.length > 0 && x.length <= max;
/** Ruta relativa sin salir hacia arriba ni ser una dirección completa. */
const ruta = (x) => typeof x === "string" && x.length > 0 && x.length <= 200 && !/^[a-z]+:|^\/|\\|(^|\/)\.\.(\/|$)/i.test(x) && /^[\w./-]+$/.test(x);
const clip = (x) => typeof x === "string" && /^[\w .:-]{1,80}$/.test(x);
export function leerFicha(x, opciones = {}) {
    const e = [];
    const f = (x ?? {});
    const okRuta = (r) => ruta(r) || (opciones.rutasLibres === true && typeof r === "string" && /^(\.\.\/)*[\w./-]+$/.test(r));
    if (!esId(f.id))
        e.push("id");
    if (!texto(f.nombre, 40))
        e.push("nombre");
    if (!esId(f.saga))
        e.push("saga");
    if (!esId(f.grupo))
        e.push("grupo");
    if (!["heroe", "villano", "otro"].includes(f.bando))
        e.push("bando");
    const fam = esId(f.familia) ? familia(f.familia) : null;
    if (!fam)
        e.push("familia");
    if (f.rig !== "esqueleto" && f.rig !== "rigido")
        e.push("rig");
    else if (fam && fam.rig !== f.rig)
        e.push("rig distinto al de su familia");
    if (!okRuta(f.glb) || !/\.glb$/i.test(String(f.glb)))
        e.push("glb");
    const fotos = (f.fotos ?? {});
    if (!okRuta(fotos.tarjeta) || !okRuta(fotos.busto))
        e.push("fotos");
    const huesos = {};
    for (const [k, v] of Object.entries((f.huesos ?? {}))) {
        if (!HUESOS_LOGICOS.includes(k) || !clip(v)) {
            e.push("huesos." + k);
            continue;
        }
        huesos[k] = v;
    }
    if (!huesos.cabeza)
        e.push("huesos.cabeza");
    const an = (f.animaciones ?? {});
    const mapa = {};
    for (const [k, v] of Object.entries((an.mapa ?? {}))) {
        if (!esLogica(k) || !clip(v)) {
            e.push("animaciones.mapa." + k);
            continue;
        }
        mapa[k] = v;
    }
    if (!mapa.reposo)
        e.push("animaciones.mapa.reposo");
    const respaldo = {};
    for (const [k, v] of Object.entries((an.respaldo ?? {}))) {
        if (!esLogica(k) || !esLogica(v) || k === v) {
            e.push("animaciones.respaldo." + k);
            continue;
        }
        respaldo[k] = v;
    }
    const vida = Array.isArray(an.vida) ? an.vida : [];
    if (vida.length > 6 || !vida.every(clip))
        e.push("animaciones.vida");
    const sentado = an.sentado == null ? null : an.sentado;
    if (sentado !== null && !clip(sentado))
        e.push("animaciones.sentado");
    const med = (f.medidas ?? {});
    if (typeof med.altura !== "number" || !(med.altura > 0) || med.altura > 1000)
        e.push("medidas.altura");
    const carga = (f.carga ?? {});
    const rug = carga.rugosidad == null ? null : carga.rugosidad;
    if (typeof carga.colores_srgb !== "boolean")
        e.push("carga.colores_srgb");
    if (rug !== null && (typeof rug !== "number" || rug < 0 || rug > 1))
        e.push("carga.rugosidad");
    const metal = Array.isArray(carga.metal) ? carga.metal : [];
    if (!metal.every(clip))
        e.push("carga.metal");
    const origen = (f.origen ?? {});
    if (!["juego", "ldraw", "propia"].includes(origen.fuente))
        e.push("origen.fuente");
    if (typeof f.publica !== "boolean")
        e.push("publica");
    else if (f.publica && origen.fuente === "juego")
        e.push("publica: lo de un juego nunca es público");
    const cal = (f.calidad ?? {});
    if (!["borrador", "jugable", "revision", "aprobado"].includes(cal.estado))
        e.push("calidad.estado");
    // Bloque opcional `juego` (§3): <id>-juego.glb junto a la ficha y acciones conocidas → nombre de clip.
    let juego;
    if (f.juego != null) {
        const j = f.juego;
        const clips = {};
        if (!okRuta(j.glb) || String(j.glb) !== `${String(f.id)}-juego.glb`)
            e.push("juego.glb");
        for (const [k, v] of Object.entries((j.clips ?? {}))) {
            if (!ACCIONES_JUEGO.includes(k) || !clip(v)) {
                e.push("juego.clips." + k);
                continue;
            }
            clips[k] = v;
        }
        if (!Object.keys(clips).length)
            e.push("juego.clips");
        juego = { glb: j.glb, clips };
    }
    // Bloque opcional `poderes` (Elías, 27 nov 2026): <id>-poderes.glb junto a la ficha y poder → clip (a lo más 8).
    let poderes;
    if (f.poderes != null) {
        const p = f.poderes;
        const clips = {};
        if (!okRuta(p.glb) || String(p.glb) !== `${String(f.id)}-poderes.glb`)
            e.push("poderes.glb");
        const lista = Object.entries((p.clips ?? {}));
        if (lista.length > 8)
            e.push("poderes.clips");
        for (const [k, v] of lista.slice(0, 8)) {
            if (!/^[a-z][a-z0-9-]{0,23}$/.test(k) || !clip(v)) {
                e.push("poderes.clips." + k.slice(0, 24));
                continue;
            }
            clips[k] = v;
        }
        if (!Object.keys(clips).length)
            e.push("poderes.clips");
        poderes = { glb: p.glb, clips };
    }
    // Bloque opcional `sets` (Elías, 27 nov 2026): sets de movimientos que aloja este personaje (a lo más 12, de 16 clips).
    let sets;
    if (f.sets != null) {
        sets = {};
        const lista = typeof f.sets === "object" ? Object.entries(f.sets) : [];
        if (!lista.length || lista.length > 12)
            e.push("sets");
        for (const [k, v] of lista.slice(0, 12)) {
            const s = (v ?? {}), clips = {};
            if (!/^[a-z][a-z0-9]{0,15}$/.test(k) || !okRuta(s.glb) || String(s.glb) !== `${String(f.id)}-set-${k}.glb`) {
                e.push("sets." + k.slice(0, 16));
                continue;
            }
            const movs = Object.entries((s.clips ?? {}));
            if (!movs.length || movs.length > 16)
                e.push(`sets.${k}.clips`);
            for (const [m, c] of movs.slice(0, 16)) {
                if (!/^[a-z][a-z0-9-]{0,15}$/.test(m) || !clip(c)) {
                    e.push(`sets.${k}.clips.${m.slice(0, 16)}`);
                    continue;
                }
                clips[m] = c;
            }
            sets[k] = { glb: s.glb, clips };
        }
    }
    if (e.length)
        return { ok: false, errores: e };
    return {
        ok: true,
        ficha: {
            id: f.id, nombre: f.nombre, saga: f.saga, grupo: f.grupo, bando: f.bando,
            familia: f.familia, rig: f.rig, glb: f.glb,
            fotos: { tarjeta: fotos.tarjeta, busto: fotos.busto },
            huesos, animaciones: { mapa, respaldo, vida: vida, sentado: sentado },
            medidas: { altura: med.altura, pies_en_cero: med.pies_en_cero !== false, frente: "+Z" },
            carga: { colores_srgb: carga.colores_srgb, rugosidad: rug, metal: metal },
            origen: { fuente: origen.fuente, juego: origen.juego,
                personaje_juego: origen.personaje_juego, herramienta: origen.herramienta },
            publica: f.publica,
            calidad: { estado: cal.estado, notas: typeof cal.notas === "string" ? cal.notas.slice(0, 300) : undefined },
            ...(juego ? { juego } : {}),
            ...(poderes ? { poderes } : {}),
            ...(sets ? { sets } : {}),
        },
    };
}
/** Las lógicas que faltan en el mapa (para avisar a producción, no es error). */
export const logicasQueFaltan = (f) => LOGICAS.filter(l => !f.animaciones.mapa[l]);
