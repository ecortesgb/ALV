// Personalizar: tus 3 cápsulas (trajes guardados) y el editor completo de la figura 3D (Minifig Studio).
// Tocar una cápsula la pone EN JUEGO al momento: se avisa al servidor sin esperar, y la sala la ve por tiempo real.
import { useEffect, useRef } from "react";
import { FotoFigura, N_CAPSULAS, escribirCapsulas, huella, leerCapsulas, useCapsulas } from "../app/figura3d";
import { ir } from "../app/rutas";
import { useSesion } from "../app/sesion";
import { sonar } from "../app/sonido";
import { hayNube } from "../servicios/cliente";
import { cargarCapsulasNube, guardarCapsulasNube } from "../servicios/cuenta";
import { enlace } from "../servicios/enlace";
import { aviso } from "./comun";

/** Mantiene las cápsulas de la cuenta iguales aquí y en la nube. Al abrir manda la nube; después, cada cambio sube. */
export function SincroCapsulas() {
  const { uid, fase } = useSesion();
  const caps = useCapsulas(uid || "nadie");
  const leida = useRef(""), subida = useRef("");
  useEffect(() => {
    if (!hayNube || fase !== "dentro" || !uid) return;
    let vivo = true;
    void cargarCapsulasNube().then(async nube => {
      if (!vivo || !nube) return;
      const aqui = leerCapsulas(uid);
      if (nube.slots.some(Boolean)) { subida.current = huella(nube); escribirCapsulas(uid, nube); }
      else if (aqui.slots.some(Boolean) && await guardarCapsulasNube(aqui)) subida.current = huella(aqui);
      leida.current = uid;
    });
    return () => { vivo = false; };
  }, [uid, fase]);
  const h = huella(caps);
  useEffect(() => {
    if (!hayNube || leida.current !== uid || h === subida.current) return;
    const t = setTimeout(() => { void guardarCapsulasNube(leerCapsulas(uid)).then(ok => { if (ok) subida.current = h; }); }, 500);
    return () => clearTimeout(t);
  }, [h, uid]);
  return null;
}

/** Las 3 cápsulas: un toque cambia la que está EN JUEGO; una vacía abre el editor. */
export function Capsulas() {
  const { uid } = useSesion();
  const caps = useCapsulas(uid);
  const usar = (i: number) => {
    const c = caps.slots[i];
    if (!c) { ir("editor"); return; }
    if (caps.activa === i) return;
    sonar("exito");
    escribirCapsulas(uid, { ...leerCapsulas(uid), activa: i });
    void enlace.activarCapsula(i + 1);
    aviso(`En juego: ${c.nombre || "cápsula " + (i + 1)}`);
  };
  return (
    <div className="a-capsulas" role="group" aria-label="Tus cápsulas">
      {Array.from({ length: N_CAPSULAS }, (_, i) => {
        const c = caps.slots[i], activa = caps.activa === i;
        return (
          <button key={i} type="button" className={"d-pnl a-capsula" + (activa ? " on" : "")} aria-pressed={activa} onClick={() => usar(i)}
            aria-label={c ? `${c.nombre || "Cápsula " + (i + 1)}${activa ? ", en juego" : ""}` : `Cápsula ${i + 1} vacía: armar figura`}>
            {c ? <FotoFigura figura={c.figura} size={52} nombre={c.nombre} /> : <span className="dsp a-mas" aria-hidden="true">+</span>}
            <small>{activa ? "En juego" : c ? c.nombre || `Cápsula ${i + 1}` : "Vacía"}</small>
          </button>
        );
      })}
    </div>
  );
}

/** #/personalizar: el personalizador nuevo (muro de espacios y libro de cómic, src/pantallas/Personalizador.tsx). */
export { Personalizador as Personalizar } from "./Personalizador";

/** #/editor: el personalizador nuevo (libro de cómic, src/pantallas/Personalizador.tsx). */
export { Personalizador as Editor } from "./Personalizador";
