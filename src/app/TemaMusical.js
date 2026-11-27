// Pone la canción del tema de tu personaje (temas.ts) en el HUB, el taller y la colección. Si el tema trae varias,
// elige una al azar por carga. Sin tema, vuelve la música de siempre del HUB.
import { useEffect } from "react";
import { figuraActiva, useCapsulas } from "./figura3d";
import { ponerPistaTema } from "./musica";
import { useSesion } from "./sesion";
import { cancionesDe, personajeDe } from "./temas";
const elegida = new Map();
export function TemaMusical() {
    const s = useSesion();
    const f = figuraActiva(useCapsulas(s.uid));
    const personaje = personajeDe(f);
    useEffect(() => {
        let vivo = true;
        if (!personaje) {
            ponerPistaTema(null);
            return;
        }
        void cancionesDe(f).then(lista => {
            if (!vivo)
                return;
            if (!lista.length) {
                ponerPistaTema(null);
                return;
            }
            // La misma canción mientras no cambie el personaje (no salta a otra al volver al HUB).
            let u = elegida.get(personaje);
            if (!u || !lista.includes(u)) {
                u = lista[Math.floor(Math.random() * lista.length)];
                elegida.set(personaje, u);
            }
            ponerPistaTema(u);
        });
        return () => { vivo = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [personaje, s.uid]);
    return null;
}
