// Difusión entre aparatos de una sala, sin tablas ni guardar nada (Elías, 24 nov: «dónde se juega»).
// Con nube: un canal de difusión de Realtime por nombre. Sin nube (demostración): BroadcastChannel entre pestañas.
// Lo que se manda aquí es solo aviso visual (la configuración en vivo, «deja de proyectar»): nunca decide nada del juego,
// y quien lo recibe lo valida (forma y largo) antes de mostrarlo.
import { cliente } from "./cliente";
import { crearDetectorPantalla, LATIDO_PANTALLA_MS, REVISION_PANTALLA_MS } from "./tiempoReal";
/** Abre un canal `nombre`. `alMensaje` recibe los avisos de los demás (nunca los propios). */
export function abrirDifusion(nombre, alMensaje) {
    if (!cliente) {
        if (typeof BroadcastChannel === "undefined")
            return { enviar: () => { }, cerrar: () => { } };
        const bc = new BroadcastChannel(`alv-${nombre}`);
        if (alMensaje)
            bc.onmessage = e => { const m = e.data; if (typeof m?.e === "string")
                alMensaje(m.e, (m.d ?? {})); };
        return { enviar: (e, d = {}) => bc.postMessage({ e, d }), cerrar: () => bc.close() };
    }
    const canal = cliente.channel(nombre);
    let listo = false, cerrado = false;
    const pendientes = [];
    if (alMensaje)
        canal.on("broadcast", { event: "m" }, ({ payload }) => {
            const m = payload;
            if (!cerrado && typeof m?.e === "string")
                alMensaje(m.e, (m.d ?? {}));
        });
    const mandar = (e, d) => { void canal.send({ type: "broadcast", event: "m", payload: { e, d } }); };
    canal.subscribe(s => {
        if (s !== "SUBSCRIBED" || cerrado)
            return;
        listo = true;
        for (const [e, d] of pendientes.splice(0))
            mandar(e, d);
    });
    return {
        enviar: (e, d = {}) => { if (cerrado)
            return; if (listo)
            mandar(e, d);
        else
            pendientes.splice(0, pendientes.length, [e, d]); },
        cerrar: () => { cerrado = true; void cliente?.removeChannel(canal); },
    };
}
/**
 * Presencia de la Pantalla sin nube (demostración, Local en el mismo aparato): la misma lógica del latido de P-02,
 * pero por BroadcastChannel. Con nube se usa `vigilarPantalla` de tiempoReal.
 */
export function vigilarPantallaSinNube(salaId, soyPantalla, alEstado) {
    if (typeof BroadcastChannel === "undefined")
        return () => { };
    const det = crearDetectorPantalla(alEstado);
    const d = abrirDifusion(`pantalla-${salaId}`, e => { if (e === "tv" && !soyPantalla)
        det.latido(); });
    const reloj = soyPantalla ? setInterval(() => d.enviar("tv"), LATIDO_PANTALLA_MS) : setInterval(() => det.revisar(), REVISION_PANTALLA_MS);
    if (soyPantalla)
        d.enviar("tv");
    else
        det.perdido();
    return () => { clearInterval(reloj); d.cerrar(); };
}
/** Pide a la Pantalla de la sala que deje de proyectar (vuelve a ser un aparato normal). */
export function pedirSalirPantalla(salaId) {
    const d = abrirDifusion(`proyectar-${salaId}`);
    d.enviar("salir");
    setTimeout(() => d.cerrar(), 3000);
}
/** La Pantalla oye si le piden dejar de proyectar. */
export function escucharSalirPantalla(salaId, alSalir) {
    const d = abrirDifusion(`proyectar-${salaId}`, e => { if (e === "salir")
        alSalir(); });
    return d.cerrar;
}
