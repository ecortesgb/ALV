import { desdeBase } from "../personajes/integracion";
import { cliente, hayNube, uidActual } from "./cliente";
import { anunciarLobby, buscarLobby, escucharSala, vigilarPantalla } from "./tiempoReal";
import { vigilarPantallaSinNube } from "./difusion";
export const GESTOS = ["saludar", "bailar"];
const CODIGO = /^[A-Z0-9]{6}$/;
const MODOS = { "ALV con pantalla": "tv", "ALV sin pantalla": "mesa" };
const NOMBRE_MODO = { tv: "ALV con pantalla", mesa: "ALV sin pantalla" };
const log = (donde, e) => console.error(donde, e instanceof Error ? e.message : e);
/** El servidor todavía no tiene la función o el tipo nuevo (migraciones 017 y 018 sin aplicar). */
const esFalta = (e) => !!e && (e.code === "PGRST202" || e.code === "42883" || e.code === "23514" || /check constraint|Could not find the function/.test(e.message ?? ""));
// ---------- Nube ----------
const nube = {
    async abrir(modo) {
        try {
            const { data, error } = await cliente.rpc("crear_evento", { p_nombre: NOMBRE_MODO[modo], p_adulto: true, p_drunk: true });
            const fila = data?.[0];
            if (error || !fila) {
                log("abrir", error);
                return error?.message.includes("mayores") ? "ALV es solo para mayores de 18." : "No se pudo abrir la sala.";
            }
            return { id: fila.id, codigo: fila.codigo, modo, anfitrionId: (await uidActual()) ?? "" };
        }
        catch (e) {
            log("abrir", e);
            return "No se pudo abrir la sala.";
        }
    },
    async unirse(codigo) {
        const c = codigo.trim().toUpperCase();
        if (!CODIGO.test(c))
            return "El código tiene 6 letras o números.";
        try {
            const { data, error } = await cliente.rpc("unirse_evento", { p_codigo: c });
            if (error) {
                log("unirse", error);
                return error.message.includes("llena") ? "La sala está llena (8)." : error.message.includes("mayores") ? "ALV es solo para mayores de 18." : "No encontramos esa sala o ya se cerró.";
            }
            const ev = await cliente.from("eventos").select("id, codigo, nombre, anfitrion, cerrado").eq("id", data).maybeSingle();
            if (ev.error || !ev.data || ev.data.cerrado)
                return "No se pudo entrar a la sala.";
            return { id: ev.data.id, codigo: ev.data.codigo, modo: MODOS[ev.data.nombre] ?? "mesa", anfitrionId: ev.data.anfitrion };
        }
        catch (e) {
            log("unirse", e);
            return "No se pudo entrar a la sala.";
        }
    },
    async miSala() {
        try {
            const { data, error } = await cliente.from("eventos").select("id, codigo, nombre, anfitrion").eq("cerrado", false).order("inicia", { ascending: false }).limit(1);
            const e = data?.[0];
            return error || !e ? null : { id: e.id, codigo: e.codigo, modo: MODOS[e.nombre] ?? "mesa", anfitrionId: e.anfitrion };
        }
        catch (e) {
            log("miSala", e);
            return null;
        }
    },
    async miembros(sala) {
        try {
            const ev = await cliente.from("eventos").select("anfitrion, cerrado").eq("id", sala.id).maybeSingle();
            if (ev.error)
                return [];
            if (!ev.data || ev.data.cerrado)
                return null;
            const m = await cliente.from("miembros_evento").select("jugador, unido, listo, gesto, gesto_n").eq("evento", sala.id).order("unido");
            const ids = (m.data ?? []).map(x => x.jugador);
            if (m.error || !ids.length)
                return [];
            const [perf, figs] = await Promise.all([
                cliente.from("perfiles").select("id, nombre").in("id", ids),
                cliente.from("figuras_jugador").select("jugador, figura").eq("activa", true).in("jugador", ids),
            ]);
            const nombre = new Map((perf.data ?? []).map(x => [x.id, x.nombre]));
            const figura = new Map((figs.data ?? []).map(x => [x.jugador, desdeBase(x.figura)])); // frontera v3 (fase 5)
            return (m.data ?? []).map(x => ({
                id: x.jugador, nombre: nombre.get(x.jugador) ?? "Jugador", figura: figura.get(x.jugador) ?? null,
                anfitrion: x.jugador === ev.data.anfitrion, listo: !!x.listo,
                gesto: x.gesto ?? null, gestoN: Number(x.gesto_n ?? 0),
            }));
        }
        catch (e) {
            log("miembros", e);
            return [];
        }
    },
    async marcarListo(sala, listo) {
        try {
            const r = await cliente.rpc("marcar_en_sala", { p_evento: sala.id, p_listo: listo, p_gesto: null, p_a: null });
            if (r.error)
                log("marcarListo", r.error);
        }
        catch (e) {
            log("marcarListo", e);
        }
    },
    async gesto(sala, g) {
        if (!GESTOS.includes(g))
            return;
        try {
            const r = await cliente.rpc("marcar_en_sala", { p_evento: sala.id, p_listo: null, p_gesto: g, p_a: null });
            if (r.error)
                log("gesto", r.error);
        }
        catch (e) {
            log("gesto", e);
        }
    },
    async salir(sala) { try {
        await cliente.rpc("salir_evento", { p_evento: sala.id });
    }
    catch (e) {
        log("salir", e);
    } },
    async cerrar(sala) { try {
        await cliente.rpc("cerrar_evento", { p_evento: sala.id });
    }
    catch (e) {
        log("cerrar", e);
    } },
    async partida(sala) {
        try {
            const { data, error } = await cliente.from("partidas").select("id, juego, version, estado_publico, terminada").eq("evento", sala.id).order("creada", { ascending: false }).limit(1);
            const p = data?.[0];
            if (error || !p)
                return null;
            return { id: p.id, juego: p.juego, version: p.version, estado: (p.estado_publico ?? {}), terminada: !!p.terminada };
        }
        catch (e) {
            log("partida", e);
            return null;
        }
    },
    async historial(sala) {
        try {
            const { data, error } = await cliente.from("partidas").select("estado_publico").eq("evento", sala.id).not("terminada", "is", null).order("creada", { ascending: true }).limit(200);
            if (error) {
                log("historial", error);
                return [];
            }
            return (data ?? []).map(p => (p.estado_publico ?? {}));
        }
        catch (e) {
            log("historial", e);
            return [];
        }
    },
    async secreto(partida) {
        try {
            const uid = await uidActual();
            const { data, error } = await cliente.from("datos_privados").select("datos").eq("partida", partida).eq("jugador", uid ?? "").maybeSingle();
            return error ? null : (data?.datos ?? null);
        }
        catch (e) {
            log("secreto", e);
            return null;
        }
    },
    async crearPartida(sala, juego) {
        try {
            // La semilla real nunca va a la tabla partidas: viaja en la acción de arranque, que solo lee quien tiene el control.
            const r = await cliente.rpc("crear_partida_sala", { p_evento: sala.id, p_juego: juego, p_semilla: 1, p_config: {} });
            if (!r.error)
                return r.data;
            if (!esFalta(r.error)) {
                log("crearPartida", r.error);
                return null;
            }
            const viejo = await cliente.from("partidas").insert({ evento: sala.id, juego, semilla: 0 }).select("id").single();
            if (viejo.error) {
                log("crearPartida", viejo.error);
                return null;
            }
            return viejo.data.id;
        }
        catch (e) {
            log("crearPartida", e);
            return null;
        }
    },
    async enviar(partida, id, tipo, datos) {
        try {
            const uid = await uidActual();
            if (!uid)
                return false;
            const r = await cliente.from("acciones").insert({ id, partida, jugador: uid, tipo, datos });
            if (!r.error || r.error.code === "23505")
                return true;
            if (esFalta(r.error) && (tipo === "control" || tipo === "pista")) {
                // Servidor sin la migración 018: mismas acciones con un tipo que ya acepta. El motor revisa quién la manda.
                const v = await cliente.from("acciones").insert({ id, partida, jugador: uid, tipo: "carta", datos: { ...datos, _tipo: tipo } });
                if (!v.error || v.error.code === "23505")
                    return true;
                log("enviar", v.error);
                return false;
            }
            log("enviar", r.error);
            return false;
        }
        catch (e) {
            log("enviar", e);
            return false;
        }
    },
    async acciones(partida) {
        try {
            const { data, error } = await cliente.from("acciones").select("id, jugador, tipo, datos, creada").eq("partida", partida).order("creada").order("id");
            if (error) {
                log("acciones", error);
                return [];
            }
            return (data ?? []).map(f => {
                const d = (f.datos ?? {});
                return { id: f.id, jugador: f.jugador, tipo: (typeof d._tipo === "string" ? d._tipo : f.tipo), datos: d, creada: f.creada };
            });
        }
        catch (e) {
            log("acciones", e);
            return [];
        }
    },
    async publicar(partida, version, estado, privados) {
        try {
            const r = await cliente.rpc("publicar_partida", { p_partida: partida, p_version: version, p_estado: estado, p_privados: privados });
            if (r.error) {
                log("publicar", r.error);
                return false;
            }
            return true;
        }
        catch (e) {
            log("publicar", e);
            return false;
        }
    },
    async terminar(partida, juego, jugadores, resultados) {
        try {
            const r = await cliente.rpc("terminar_partida_sala", { p_partida: partida, p_juego: juego, p_jugadores: jugadores, p_resultados: resultados });
            if (r.error)
                log("terminar", r.error);
        }
        catch (e) {
            log("terminar", e);
        }
    },
    async guardarCopas(partida, copas) {
        try {
            const r = await cliente.rpc("guardar_copas", { p_partida: partida, p_copas: copas });
            if (r.error && !esFalta(r.error))
                log("guardarCopas", r.error);
        }
        catch (e) {
            log("guardarCopas", e);
        }
    },
    async darXp(sala, jugador, xp) {
        try {
            const r = await cliente.rpc("dar_xp_reto", { p_evento: sala.id, p_jugador: jugador, p_xp: xp });
            if (r.error)
                log("darXp", r.error);
            return !r.error;
        }
        catch (e) {
            log("darXp", e);
            return false;
        }
    },
    async activarCapsula(n) {
        try {
            const r = await cliente.rpc("activar_capsula", { p_capsula: n });
            if (r.error)
                log("activarCapsula", r.error);
        }
        catch (e) {
            log("activarCapsula", e);
        }
    },
    escuchar: (sala, alCambiar, alEstado) => escucharSala(sala.id, alCambiar, alEstado),
    vigilarPantalla: (sala, soyPantalla, alEstado) => vigilarPantalla(sala.id, soyPantalla, alEstado),
    anunciarLobby: sala => anunciarLobby(sala.codigo),
    buscarLobby,
    async lobbyAbierto() {
        try {
            const { data, error } = await cliente.rpc("lobby_abierto");
            if (error) {
                if (!esFalta(error))
                    log("lobbyAbierto", error);
                return esFalta(error) ? undefined : null;
            }
            const f = data?.[0];
            return f ? { codigo: f.codigo, miembros: Number(f.miembros) || 0 } : null;
        }
        catch (e) {
            log("lobbyAbierto", e);
            return undefined;
        }
    },
    async expulsar(sala, jugador) {
        try {
            const r = await cliente.rpc("expulsar_de_sala", { p_evento: sala.id, p_jugador: jugador });
            if (r.error)
                log("expulsar", r.error);
            return !r.error;
        }
        catch (e) {
            log("expulsar", e);
            return false;
        }
    },
    async listoDe(sala, jugador, listo) {
        try {
            const r = await cliente.rpc("marcar_listo_de", { p_evento: sala.id, p_jugador: jugador, p_listo: listo });
            if (r.error)
                log("listoDe", r.error);
            return !r.error;
        }
        catch (e) {
            log("listoDe", e);
            return false;
        }
    },
};
/** Quién soy en el respaldo local: lo fija la sesión de demostración. */
export const yoLocal = { id: "", nombre: "" };
const azarCodigo = () => Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
/**
 * `quien`: la persona que juega en este aparato (en la demostración, la sesión; en Local, el jugador que tiene el
 * teléfono). Las acciones de control siempre salen a nombre del anfitrión, que es quien tiene el control de la partida.
 */
function crearRespaldo(clave, canal, quien, prefijo) {
    const leer = () => { try {
        return JSON.parse(localStorage.getItem(clave) ?? "{}");
    }
    catch {
        return {};
    } };
    const oyentes = new Set();
    const radio = canal && typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(canal) : null;
    if (radio)
        radio.onmessage = () => oyentes.forEach(f => f());
    const guardar = (todo) => {
        try {
            localStorage.setItem(clave, JSON.stringify(todo));
        }
        catch { /* sin espacio */ }
        radio?.postMessage(1);
        oyentes.forEach(f => f());
    };
    const cambiar = (f) => { const todo = leer(); f(todo); guardar(todo); };
    const porPartida = (todo, id) => {
        for (const s of Object.values(todo)) {
            const p = s.partidas.find(x => x.id === id);
            if (p)
                return { p, s };
        }
        return undefined;
    };
    return {
        leer, cambiar,
        async abrir(modo) {
            const yo = quien();
            const sala = { id: prefijo + "sala-" + azarCodigo(), codigo: azarCodigo(), modo, anfitrionId: yo.id };
            cambiar(t => { t[sala.codigo] = { sala, cerrada: false, miembros: [{ id: yo.id, nombre: yo.nombre, listo: false }], partidas: [] }; });
            return sala;
        },
        async unirse(codigo) {
            const c = codigo.trim().toUpperCase(), yo = quien();
            const s = leer()[c];
            if (!CODIGO.test(c) || !s || s.cerrada)
                return "No encontramos esa sala o ya se cerró.";
            if (!s.miembros.some(m => m.id === yo.id)) {
                if (s.miembros.length >= 8)
                    return "La sala está llena (8).";
                cambiar(t => { t[c].miembros.push({ id: yo.id, nombre: yo.nombre, listo: false }); });
            }
            return s.sala;
        },
        async miSala() { const yo = quien(); return Object.values(leer()).reverse().find(s => !s.cerrada && s.miembros.some(m => m.id === yo.id))?.sala ?? null; },
        async miembros(sala) {
            const s = leer()[sala.codigo];
            if (!s || s.cerrada)
                return null;
            return s.miembros.map(m => ({ id: m.id, nombre: m.nombre, listo: m.listo, gesto: m.gesto, gestoN: m.gestoN, figura: m.figura ?? null, anfitrion: m.id === s.sala.anfitrionId }));
        },
        async marcarListo(sala, listo) { const yo = quien(); cambiar(t => { const m = t[sala.codigo]?.miembros.find(x => x.id === yo.id); if (m)
            m.listo = listo; }); },
        async gesto(sala, g) { const yo = quien(); cambiar(t => { const m = t[sala.codigo]?.miembros.find(x => x.id === yo.id); if (m && GESTOS.includes(g)) {
            m.gesto = g;
            m.gestoN = (m.gestoN ?? 0) + 1;
        } }); },
        async salir(sala) { const yo = quien(); cambiar(t => { const s = t[sala.codigo]; if (s)
            s.miembros = s.miembros.filter(m => m.id !== yo.id); }); },
        async cerrar(sala) { cambiar(t => { const s = t[sala.codigo]; if (s)
            s.cerrada = true; }); },
        async partida(sala) {
            const p = leer()[sala.codigo]?.partidas.at(-1);
            return p ? { id: p.id, juego: p.juego, version: p.version, estado: p.estado, terminada: p.terminada } : null;
        },
        async secreto(partida) { return porPartida(leer(), partida)?.p.privados[quien().id] ?? null; },
        async historial(sala) { return (leer()[sala.codigo]?.partidas ?? []).filter(p => p.terminada).map(p => p.estado); },
        async crearPartida(sala, juego) {
            const id = prefijo + "partida-" + Date.now().toString(36) + azarCodigo();
            cambiar(t => { const s = t[sala.codigo]; if (!s)
                return; s.partidas.forEach(p => { p.terminada = true; }); s.partidas = [...s.partidas.slice(-30), { id, juego, version: 1, estado: {}, terminada: false, privados: {}, acciones: [] }]; });
            return id;
        },
        async enviar(partida, id, tipo, datos) {
            let ok = false;
            cambiar(t => {
                const x = porPartida(t, partida);
                if (!x || x.p.terminada)
                    return;
                ok = true;
                const jugador = tipo === "control" ? x.s.sala.anfitrionId : quien().id;
                if (!x.p.acciones.some(a => a.id === id))
                    x.p.acciones.push({ id, jugador, tipo, datos, creada: new Date().toISOString() });
            });
            return ok;
        },
        async acciones(partida) { return porPartida(leer(), partida)?.p.acciones ?? []; },
        async publicar(partida, version, estado, privados) {
            cambiar(t => { const x = porPartida(t, partida); if (!x || x.p.version > version)
                return; x.p.version = version; x.p.estado = estado; x.p.privados = privados; });
            return true;
        },
        async terminar(partida) { cambiar(t => { const x = porPartida(t, partida); if (x)
            x.p.terminada = true; }); },
        async guardarCopas() { },
        async darXp() { return true; },
        async activarCapsula() { },
        escuchar(_sala, alCambiar, alEstado) {
            oyentes.add(alCambiar);
            alEstado?.("vivo");
            queueMicrotask(alCambiar);
            return () => { oyentes.delete(alCambiar); };
        },
        /** Sin servidor: latido entre pestañas del mismo navegador (demostración y Local en el mismo aparato). */
        vigilarPantalla: (sala, soyPantalla, alEstado) => vigilarPantallaSinNube(sala.id, soyPantalla, alEstado),
        /** Sin servidor el anuncio es la misma lista del navegador: el lobby abierto más reciente. */
        anunciarLobby: () => () => { },
        buscarLobby(alCodigo) {
            const f = () => alCodigo(Object.values(leer()).reverse().find(s => !s.cerrada)?.sala.codigo ?? null);
            oyentes.add(f);
            queueMicrotask(f);
            return () => { oyentes.delete(f); };
        },
        async lobbyAbierto() {
            const s = Object.values(leer()).reverse().find(x => !x.cerrada);
            return s ? { codigo: s.sala.codigo, miembros: s.miembros.length } : null;
        },
        async expulsar(sala, jugador) {
            let ok = false;
            const yo = quien();
            cambiar(t => { const s = t[sala.codigo]; if (s && s.sala.anfitrionId === yo.id && jugador !== yo.id) {
                s.miembros = s.miembros.filter(m => m.id !== jugador);
                ok = true;
            } });
            return ok;
        },
        async listoDe(sala, jugador, listo) {
            let ok = false;
            const yo = quien();
            cambiar(t => { const s = t[sala.codigo]; const m = s?.miembros.find(x => x.id === jugador); if (s && m && s.sala.anfitrionId === yo.id) {
                m.listo = listo;
                ok = true;
            } });
            return ok;
        },
    };
}
const demo = crearRespaldo("alv.demo.v1", "alv-demo", () => yoLocal, "");
// ---------- Modo Local (un solo teléfono) ----------
// La sala y sus personajes viven en el localStorage de este teléfono (clave «alv.local.v1»): sobreviven a una recarga y
// se borran con «Terminar sesión». Nada llega a Supabase: ni miembros, ni partidas, ni XP, ni monedas. Sus ids llevan
// el prefijo «loc-», así el enlace sabe que van aquí y no a la nube.
export const PREFIJO_LOCAL = "loc-";
const anfitrionLocal = { id: "", nombre: "" };
/** Jugador que tiene el teléfono en este momento (el que contesta). Vacío = el anfitrión. */
let activoLocal = "";
const quienLocal = () => {
    if (!activoLocal)
        return anfitrionLocal;
    for (const s of Object.values(localApp.leer())) {
        const m = s.miembros.find(x => x.id === activoLocal);
        if (m)
            return { id: m.id, nombre: m.nombre };
    }
    return anfitrionLocal;
};
const localApp = crearRespaldo("alv.local.v1", null, quienLocal, PREFIJO_LOCAL);
export const esLocal = (id) => !!id && id.startsWith(PREFIJO_LOCAL);
export const modoLocal = {
    /** El lobby local abierto de este teléfono (o null). */
    abierto() { return Object.values(localApp.leer()).reverse().find(s => !s.cerrada)?.sala ?? null; },
    /** Abre el lobby local con el anfitrión (cuenta abierta o demostración) como P1. */
    abrir(anfitrion) {
        const ya = modoLocal.abierto();
        if (ya)
            return ya;
        anfitrionLocal.id = anfitrion.id;
        anfitrionLocal.nombre = anfitrion.nombre;
        activoLocal = "";
        const sala = { id: PREFIJO_LOCAL + "sala-" + azarCodigo(), codigo: azarCodigo(), modo: "mesa", anfitrionId: anfitrion.id };
        localApp.cambiar(t => { t[sala.codigo] = { sala, cerrada: false, miembros: [{ id: anfitrion.id, nombre: anfitrion.nombre, listo: false, figura: anfitrion.figura }], partidas: [] }; });
        return sala;
    },
    /** Agrega un personaje sin cuenta (máximo 8 en la sala). */
    agregar(sala, p) {
        const nombre = p.nombre.replace(/\s+/g, " ").trim().slice(0, 20);
        if (nombre.length < 2)
            return null;
        const id = PREFIJO_LOCAL + "j-" + azarCodigo().toLowerCase();
        let ok = false;
        localApp.cambiar(t => { const s = t[sala.codigo]; if (!s || s.miembros.length >= 8)
            return; s.miembros.push({ id, nombre, listo: true, figura: p.figura, genero: p.genero }); ok = true; });
        return ok ? id : null;
    },
    /** Cambia la figura de un personaje (o la del anfitrión en esta sesión local). */
    figura(sala, jugador, figura) { localApp.cambiar(t => { const m = t[sala.codigo]?.miembros.find(x => x.id === jugador); if (m)
        m.figura = figura; }); },
    generos(sala) {
        const s = localApp.leer()[sala.codigo];
        return Object.fromEntries((s?.miembros ?? []).filter(m => m.genero).map(m => [m.id, m.genero]));
    },
    /** El teléfono pasa a manos de `jugador` (o regresa al anfitrión con ""). */
    pasarA(jugador) { activoLocal = jugador; },
    activo() { return activoLocal || anfitrionLocal.id; },
    /** Termina la sesión local: borra la sala, los personajes y sus partidas de este teléfono. */
    terminar() { activoLocal = ""; try {
        localStorage.removeItem("alv.local.v1");
    }
    catch { /* sin almacenamiento */ } },
    /** Recupera el anfitrión tras recargar la página (la sala sigue en localStorage). */
    recuperar(sala) { if (!anfitrionLocal.id) {
        const s = localApp.leer()[sala.codigo];
        const h = s?.miembros.find(m => m.id === sala.anfitrionId);
        if (h) {
            anfitrionLocal.id = h.id;
            anfitrionLocal.nombre = h.nombre;
        }
    } },
};
const base = hayNube ? nube : demo;
const porSala = (sala) => (esLocal(sala.id) ? localApp : base);
const porPartida = (partida) => (esLocal(partida) ? localApp : base);
/** El enlace que usa toda la app: las salas y partidas locales van al teléfono; el resto, a la nube (o la demostración). */
export const enlace = {
    abrir: modo => base.abrir(modo),
    async unirse(codigo) {
        const c = codigo.trim().toUpperCase(), s = localApp.leer()[c];
        if (s && !s.cerrada) {
            modoLocal.recuperar(s.sala);
            return s.sala;
        }
        return base.unirse(codigo);
    },
    miSala: () => base.miSala(),
    miembros: sala => porSala(sala).miembros(sala),
    marcarListo: (sala, l) => porSala(sala).marcarListo(sala, l),
    gesto: (sala, g) => porSala(sala).gesto(sala, g),
    salir: sala => porSala(sala).salir(sala),
    cerrar: async (sala) => { await porSala(sala).cerrar(sala); if (esLocal(sala.id))
        modoLocal.terminar(); },
    partida: sala => porSala(sala).partida(sala),
    historial: sala => porSala(sala).historial(sala),
    secreto: partida => porPartida(partida).secreto(partida),
    crearPartida: (sala, juego) => porSala(sala).crearPartida(sala, juego),
    enviar: (partida, id, tipo, datos) => porPartida(partida).enviar(partida, id, tipo, datos),
    acciones: partida => porPartida(partida).acciones(partida),
    publicar: (partida, v, e, p) => porPartida(partida).publicar(partida, v, e, p),
    terminar: (partida, j, n, r) => porPartida(partida).terminar(partida, j, n, r),
    guardarCopas: (partida, c) => porPartida(partida).guardarCopas(partida, c),
    darXp: (sala, j, x) => porSala(sala).darXp(sala, j, x),
    activarCapsula: n => base.activarCapsula(n),
    escuchar: (sala, f, e) => porSala(sala).escuchar(sala, f, e),
    vigilarPantalla: (sala, yo, f) => porSala(sala).vigilarPantalla(sala, yo, f),
    anunciarLobby: sala => porSala(sala).anunciarLobby(sala),
    buscarLobby: f => base.buscarLobby(f),
    lobbyAbierto: () => base.lobbyAbierto(),
    expulsar: (sala, j) => porSala(sala).expulsar(sala, j),
    listoDe: (sala, j, l) => porSala(sala).listoDe(sala, j, l),
};
/** Dirección que el QR abre: deja a la persona dentro de la sala. */
export const enlaceSala = (codigo) => `${location.origin}${location.pathname}#/s/${codigo}`;
