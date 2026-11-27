// Quién está en línea y chat del HUB. Sin tablas ni migraciones: canal de Realtime «alv-hub» con presencia
// (quién está conectado ahora) y mensajes de difusión (el chat no se guarda: solo lo ven quienes están conectados).
// Sin nube (demostración) usa un BroadcastChannel entre pestañas de este navegador.
// Lo que llega de otros no es confiable: se valida tipo y largo, y React lo escapa al mostrarlo.
import { cliente } from "./cliente";
export const MAX_TEXTO = 200;
const MAX_NOMBRE = 20;
/** Limpia un mensaje que llegó de la red; null si no sirve. */
export function mensajeValido(x) {
    if (!x || typeof x !== "object")
        return null;
    const m = x;
    if (typeof m.id !== "string" || typeof m.de !== "string" || typeof m.nombre !== "string" || typeof m.texto !== "string" || typeof m.t !== "number")
        return null;
    const texto = m.texto.replace(/\s+/g, " ").trim().slice(0, MAX_TEXTO);
    if (!texto || m.id.length > 64 || m.de.length > 64)
        return null;
    return { id: m.id, de: m.de, nombre: m.nombre.trim().slice(0, MAX_NOMBRE) || "Alguien", texto, t: m.t };
}
/** Une la presencia: una fila por cuenta, ordenada por nombre. */
export function unirPresencia(filas) {
    const m = new Map();
    for (const f of filas) {
        const p = f;
        if (p && typeof p.id === "string" && typeof p.nombre === "string" && p.id.length <= 64)
            m.set(p.id, { id: p.id, nombre: p.nombre.slice(0, MAX_NOMBRE) });
    }
    return [...m.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
export function conectarHub(yo, al) {
    const armar = (texto) => mensajeValido({ id: crypto.randomUUID(), de: yo.id, nombre: yo.nombre, texto, t: Date.now() });
    if (cliente) {
        const canal = cliente.channel("alv-hub", { config: { presence: { key: yo.id }, broadcast: { self: false } } });
        canal.on("presence", { event: "sync" }, () => al.enLinea(unirPresencia(Object.values(canal.presenceState()).flat())));
        canal.on("broadcast", { event: "chat" }, ({ payload }) => { const m = mensajeValido(payload); if (m)
            al.mensaje(m); });
        canal.subscribe(estado => { if (estado === "SUBSCRIBED")
            void canal.track({ id: yo.id, nombre: yo.nombre }); });
        return {
            enviar: texto => { const m = armar(texto); if (m)
                void canal.send({ type: "broadcast", event: "chat", payload: m }); return m; },
            cerrar: () => { void canal.untrack(); void cliente.removeChannel(canal); },
        };
    }
    // Demostración: cada pestaña avisa que sigue aquí cada 2 s; se olvida a quien calla 6 s.
    if (typeof BroadcastChannel === "undefined") {
        al.enLinea([yo]);
        return { enviar: armar, cerrar: () => { } };
    }
    const radio = new BroadcastChannel("alv-hub-demo");
    const vistos = new Map([[yo.id, { p: yo, t: Date.now() }]]);
    const publicar = () => al.enLinea(unirPresencia([...vistos.values()].map(v => v.p)));
    const hola = () => { vistos.set(yo.id, { p: yo, t: Date.now() }); radio.postMessage({ tipo: "hola", p: yo }); };
    radio.onmessage = e => {
        const d = e.data;
        if (d.tipo === "hola" && d.p) {
            vistos.set(d.p.id, { p: d.p, t: Date.now() });
            publicar();
        }
        if (d.tipo === "adios" && d.p) {
            vistos.delete(d.p.id);
            publicar();
        }
        if (d.tipo === "chat") {
            const m = mensajeValido(d.m);
            if (m)
                al.mensaje(m);
        }
    };
    const reloj = setInterval(() => {
        hola();
        for (const [id, v] of vistos)
            if (id !== yo.id && Date.now() - v.t > 6000)
                vistos.delete(id);
        publicar();
    }, 2000);
    hola();
    publicar();
    return {
        enviar: texto => { const m = armar(texto); if (m)
            radio.postMessage({ tipo: "chat", m }); return m; },
        cerrar: () => { clearInterval(reloj); radio.postMessage({ tipo: "adios", p: yo }); radio.close(); },
    };
}
