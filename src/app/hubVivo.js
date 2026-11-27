// Estado compartido de «en línea» y chat: una sola conexión mientras la sesión esté abierta (se ve desde cualquier pantalla).
import { useEffect, useState, useSyncExternalStore } from "react";
import { cliente, hayNube } from "../servicios/cliente";
import { conectarHub } from "../servicios/hubVivo";
import { figuraActiva, leerCapsulas } from "./figura3d";
import { useSesion } from "./sesion";
import { desdeBase } from "../personajes/integracion";
const GUARDAR = 60; // mensajes que se quedan en memoria
const ESPERA_MS = 1200; // entre un mensaje y otro (evita ráfagas)
let estado = { enLinea: [], mensajes: [], sinLeer: 0, abierto: false };
const oyentes = new Set();
const fijar = (e) => { estado = { ...estado, ...e }; oyentes.forEach(f => f()); };
let con = null, conDe = "", ultimoEnvio = 0;
function agregar(m) {
    if (estado.mensajes.some(x => x.id === m.id))
        return;
    fijar({ mensajes: [...estado.mensajes, m].slice(-GUARDAR), sinLeer: estado.abierto ? 0 : estado.sinLeer + 1 });
}
/** Conecta (una vez por cuenta) y devuelve el estado. */
export function useHubVivo() {
    const s = useSesion();
    useEffect(() => {
        if (s.fase !== "dentro" || !s.uid)
            return;
        if (con && conDe === s.uid)
            return;
        con?.cerrar();
        fijar({ enLinea: [], mensajes: [], sinLeer: 0 });
        conDe = s.uid;
        con = conectarHub({ id: s.uid, nombre: s.nombre }, { enLinea: l => fijar({ enLinea: l }), mensaje: agregar });
    }, [s.fase, s.uid, s.nombre]);
    return useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => estado);
}
/** Manda un mensaje. Devuelve un aviso si no se pudo (vacío o muy seguido). */
export function enviarChat(texto) {
    if (!con)
        return "Sin conexión.";
    if (Date.now() - ultimoEnvio < ESPERA_MS)
        return "Espera un segundo.";
    const m = con.enviar(texto);
    if (!m)
        return "Escribe algo.";
    ultimoEnvio = Date.now();
    agregar(m);
    return null;
}
export function abrirChat(abierto) { fijar({ abierto, sinLeer: abierto ? 0 : estado.sinLeer }); }
// ---------- Figuras de quienes están en línea ----------
// Con nube solo se pueden leer las de quien ha compartido sala contigo (RLS de figuras_jugador); los demás salen con su inicial.
const figuras = new Map();
export function useFigurasDe(ids) {
    const clave = [...ids].sort().join(",");
    const [, setN] = useState(0);
    useEffect(() => {
        const faltan = ids.filter(id => !figuras.has(id));
        if (!faltan.length)
            return;
        if (!hayNube) {
            for (const id of faltan)
                figuras.set(id, figuraActiva(leerCapsulas(id)));
            setN(n => n + 1);
            return;
        }
        for (const id of faltan)
            figuras.set(id, null);
        let vivo = true;
        void cliente.from("figuras_jugador").select("jugador, figura").eq("activa", true).in("jugador", faltan).then(({ data }) => {
            for (const f of (data ?? []))
                figuras.set(f.jugador, desdeBase(f.figura)); // frontera v3
            if (vivo)
                setN(n => n + 1);
        });
        return () => { vivo = false; };
    }, [clave]); // eslint-disable-line react-hooks/exhaustive-deps
    return figuras;
}
