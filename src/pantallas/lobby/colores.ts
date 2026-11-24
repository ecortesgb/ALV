// Colores del lobby para este aparato: el anfitrión primero y en rojo, los demás por orden de entrada y género
// (asignarColores en app/colorJugador.ts). El género sale de generos_sala (011), que solo responde a quien está en
// esa sala. Sin servidor o sin dato, cada quien toma el siguiente color libre.
import { useEffect, useMemo, useState } from "react";
import { asignarColores, fijarColoresSala, ordenSala, type GeneroColor } from "../../app/colorJugador";
import { generosSala } from "../../servicios/cuenta";
import { esLocal, modoLocal, type Miembro, type SalaV } from "../../servicios/enlace";

const GENERO: Record<string, GeneroColor> = { mujer: "mujer", hombre: "hombre", otro: "otro" };

/** Miembros en el orden de los lugares (anfitrión primero). Fija los colores para colorDe mientras la sala esté abierta. */
export function useColoresSala(sala: SalaV | null, miembros: readonly Miembro[]): Miembro[] {
  const ids = miembros.map(m => m.id).join(",");
  const [generos, setGeneros] = useState<Record<string, GeneroColor>>({});
  useEffect(() => {
    if (!sala || !ids) return;
    let vivo = true;
    // Local: el género lo guarda cada personaje en este teléfono; en la nube sale de generos_sala.
    const pedir = esLocal(sala.id) ? Promise.resolve(modoLocal.generos(sala)) : generosSala(sala.id);
    void pedir.then(g => { if (vivo) setGeneros(Object.fromEntries(Object.entries(g).map(([k, v]) => [k, GENERO[v] ?? "otro"]))); });
    return () => { vivo = false; };
  }, [sala?.id, ids]); // eslint-disable-line react-hooks/exhaustive-deps
  const anfitrion = sala?.anfitrionId ?? null;
  const mapa = useMemo(() => asignarColores(miembros.map(m => m.id), anfitrion, generos), [ids, anfitrion, generos]); // eslint-disable-line react-hooks/exhaustive-deps
  // Se fija durante el render para que los hijos de este mismo render ya lo vean.
  fijarColoresSala(mapa);
  useEffect(() => () => fijarColoresSala(null), []);
  return useMemo(() => {
    const orden = ordenSala(miembros.map(m => m.id), anfitrion);
    return orden.map(id => miembros.find(m => m.id === id)!);
  }, [miembros, anfitrion]);
}
