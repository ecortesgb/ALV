// Estado de la sala para cualquier aparato (celular o Pantalla): quién está, la partida publicada y mi secreto.
// Un aparato ignora avisos con versión menor a la que ya tiene (Maestro §21.4).
import { useCallback, useEffect, useRef, useState } from "react";
import { enlace } from "../servicios/enlace";
export function useSala(codigo, yo) {
    const [sala, setSala] = useState(null);
    const [error, setError] = useState(null);
    const [cerrada, setCerrada] = useState(false);
    const [miembros, setMiembros] = useState([]);
    const [red, setRed] = useState("conectando");
    const [partida, setPartida] = useState(null);
    const [secreto, setSecreto] = useState(null);
    const [tic, setTic] = useState(0);
    const ocupado = useRef(false), otra = useRef(false), ultima = useRef(null);
    useEffect(() => {
        let vivo = true;
        setSala(null);
        setError(null);
        setCerrada(false);
        setMiembros([]);
        setPartida(null);
        setSecreto(null);
        ultima.current = null;
        if (!codigo || !yo) {
            setError(codigo ? null : "Falta el código de la sala.");
            return;
        }
        void enlace.unirse(codigo).then(r => { if (!vivo)
            return; if (typeof r === "string")
            setError(r);
        else
            setSala(r); });
        return () => { vivo = false; };
    }, [codigo, yo]);
    const refrescar = useCallback(() => {
        if (!sala)
            return;
        // El motor no espera a esta lectura: arranca con el aviso y lee las acciones al mismo tiempo.
        setTic(t => t + 1);
        if (ocupado.current) {
            otra.current = true;
            return;
        }
        ocupado.current = true;
        void (async () => {
            try {
                // La partida no espera a la lista de miembros (que son varias consultas): cada una avanza por su lado.
                const gente = enlace.miembros(sala).then(ms => {
                    if (ms === null)
                        setCerrada(true);
                    else
                        setMiembros(prev => (JSON.stringify(prev) === JSON.stringify(ms) ? prev : ms));
                });
                const p = await enlace.partida(sala);
                const u = ultima.current;
                if (p && (!u || u.id !== p.id || p.version >= u.version)) {
                    const s = p.terminada ? null : await enlace.secreto(p.id);
                    ultima.current = { id: p.id, version: p.version };
                    setPartida(prev => (prev && prev.id === p.id && prev.version === p.version && prev.terminada === p.terminada && Object.keys(prev.estado).length === Object.keys(p.estado).length ? prev : p));
                    setSecreto(prev => (JSON.stringify(prev) === JSON.stringify(s) ? prev : s));
                }
                else if (!p)
                    setPartida(null);
                await gente;
                setTic(t => t + 1);
            }
            finally {
                ocupado.current = false;
                if (otra.current) {
                    otra.current = false;
                    refrescar();
                }
            }
        })();
    }, [sala]);
    useEffect(() => {
        if (!sala)
            return;
        refrescar();
        return enlace.escuchar(sala, refrescar, setRed);
    }, [sala, refrescar]);
    return { sala, error, cerrada, miembros, red, partida, secreto, tic, refrescar };
}
