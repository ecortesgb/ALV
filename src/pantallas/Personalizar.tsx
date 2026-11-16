// Personalizar: tus 3 cápsulas (trajes guardados) y el editor completo de la figura 3D (Minifig Studio).
// Tocar una cápsula la pone EN JUEGO al momento: se avisa al servidor sin esperar, y la sala la ve por tiempo real.
import { useEffect, useRef } from "react";
import { Boton, Chip, Etiqueta, Panel } from "../ds";
import { EditorFigura, FotoFigura, N_CAPSULAS, escribirCapsulas, figuraActiva, huella, leerCapsulas, useCapsulas } from "../app/figura3d";
import { atras, ir } from "../app/rutas";
import { useSesion } from "../app/sesion";
import { sonar } from "../app/sonido";
import { hayNube } from "../servicios/cliente";
import { cargarCapsulasNube, guardarCapsulasNube } from "../servicios/cuenta";
import { enlace } from "../servicios/enlace";
import { Cabecera, Elenco, Marco, aviso } from "./comun";

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

export function Personalizar() {
  const { uid, nombre } = useSesion();
  const f = figuraActiva(useCapsulas(uid));
  return (
    <Marco>
      <div className="a-ancho a-pila">
        <Cabecera titulo="Personalizar" icono="shirt" />
        <div className="a-dos">
          <Panel className="a-vitrina" como="section">
            <Elenco gente={[{ id: uid, figura: f }]} foco={uid} />
            <Chip texto={f ? nombre : "Figura de muestra"} icono="users" />
          </Panel>
          <Panel className="a-pila" como="section">
            <Etiqueta texto="Tus cápsulas" icono="bag" />
            <p className="a-suave">Cada cápsula guarda un traje completo. Toca una para jugar con ella; se cambia en la sala entre partidas.</p>
            <Capsulas />
            <Boton color="azul" texto={f ? "Editar mis figuras" : "Armar mi figura"} sub="Personaje, uno al azar o pieza por pieza" icono="shirt" onClick={() => ir("editor")} />
          </Panel>
        </div>
      </div>
    </Marco>
  );
}

/** #/editor: Minifig Studio a pantalla completa. Lo que guarda llega solo a las cápsulas. */
export function Editor() {
  const { uid } = useSesion();
  return (
    <div className="a-editor">
      <EditorFigura jugador={uid} alCambiar={() => { /* SincroCapsulas sube el cambio */ }} />
      <button type="button" className="d-btn k-yel a-editor-listo" onClick={() => { sonar("clic"); atras(); }}><span className="dsp">Listo</span></button>
    </div>
  );
}
