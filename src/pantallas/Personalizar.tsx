// Personalizar: tus 3 cápsulas (trajes guardados) y el editor completo de la figura 3D (Minifig Studio).
// Tocar una cápsula la pone EN JUEGO al momento: se avisa al servidor sin esperar, y la sala la ve por tiempo real.
import { Suspense, lazy, useEffect, useRef } from "react";
import type { FiguraV2 } from "../content/personaje";
import { FotoFigura, N_CAPSULAS, escribirCapsulas, huella, leerCapsulas, useCapsulas, type EstadoCapsulas } from "../app/figura3d";
import { atras, ir } from "../app/rutas";
import { banderaV3, empaquetarV3, leerV3, sinV3, useCatalogoV3, type FiguraV2Puente, type FiguraV3 } from "../personajes/integracion";
import { useSesion } from "../app/sesion";
import { sonar } from "../app/sonido";
import { hayNube } from "../servicios/cliente";
import { cargarCapsulasNube, guardarCapsulasNube } from "../servicios/cuenta";
import { enlace } from "../servicios/enlace";
import { aviso } from "./comun";
import { Personalizador } from "./Personalizador";

// Subidas a la nube en fila, una a la vez (Codex, fase 5 ajuste 6): guardarCapsulasNube() BORRA los espacios vacíos, así que
// dos subidas cruzadas podían dejar la nube con un estado viejo. Cada subida lee lo último de este aparato al empezar.
let filaSubidas: Promise<unknown> = Promise.resolve();
function subirCapsulas(uid: string): Promise<boolean> {
  const p = filaSubidas.then(() => guardarCapsulasNube(leerCapsulas(uid)));
  filaSubidas = p.catch(() => false);
  return p.catch(() => false);
}

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
      else if (aqui.slots.some(Boolean) && await subirCapsulas(uid)) subida.current = huella(aqui);
      leida.current = uid;
    });
    return () => { vivo = false; };
  }, [uid, fase]);
  const h = huella(caps);
  useEffect(() => {
    if (!hayNube || leida.current !== uid || h === subida.current) return;
    const t = setTimeout(() => { void subirCapsulas(uid).then(ok => { if (ok) subida.current = h; }); }, 500);
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

// ---------- Fase 5: «Mi personaje» (solo con la bandera, en desarrollo) ----------

/** Guarda una figura nueva en el espacio `i` como UNA operación (Codex, ajuste 6): lee lo último (la nube manda, como en
 *  SincroCapsulas; lo que solo está aquí se conserva), mete la v3 en la v2 de ese espacio con el puente, lo activa, lo
 *  escribe aquí y lo sube en la fila. Dice si quedó en la nube o solo en este aparato. */
async function guardarFiguraNueva(uid: string, i: number, f: FiguraV3, nombre: string): Promise<"sincronizado" | "local" | "error"> {
  let base: EstadoCapsulas = leerCapsulas(uid);
  if (hayNube) {
    const nube = await cargarCapsulasNube();
    if (nube && nube.slots.some(Boolean)) base = { ...nube, slots: nube.slots.map((c, k) => c ?? base.slots[k] ?? null) };
  }
  const previa = base.slots[i]?.figura;
  const fig = empaquetarV3(f, previa ? sinV3(previa as unknown as FiguraV2Puente) : null);
  if (!fig) return "error";
  const slots = [...base.slots];
  slots[i] = { nombre: nombre.slice(0, 24), figura: fig as unknown as FiguraV2, actualizado: new Date().toISOString() };
  escribirCapsulas(uid, { ...base, slots, activa: i });
  void enlace.activarCapsula(i + 1);
  if (!hayNube) return "local";
  return (await subirCapsulas(uid)) ? "sincronizado" : "local";
}

const MiPersonaje = lazy(() => import("../personajes/MiPersonaje").then(m => ({ default: m.MiPersonaje })));

function MiPersonajeApp() {
  const { uid } = useSesion();
  const caps = useCapsulas(uid);
  const cat = useCatalogoV3();
  const espacios = caps.slots.map(c => ({ figura: c ? leerV3(c.figura) : null, nombre: c?.nombre ?? "", antes: !!c }));
  const activar = (i: number) => {
    if (!caps.slots[i] || caps.activa === i) return;
    sonar("exito");
    escribirCapsulas(uid, { ...leerCapsulas(uid), activa: i });
    void enlace.activarCapsula(i + 1);
  };
  return (
    <Suspense fallback={null}>
      <MiPersonaje jugador={uid} catalogo={cat} espacios={espacios} activa={caps.activa}
        onGuardar={(i, f, n) => guardarFiguraNueva(uid, i, f, n)} onActivar={activar} onSalir={atras} />
    </Suspense>
  );
}

/** #/personalizar: el personalizador (muro de espacios y libro de cómic, src/pantallas/Personalizador.tsx); con la bandera de
 *  la fase 5, «Mi personaje» del sistema nuevo. */
export function Personalizar() { return banderaV3() ? <MiPersonajeApp /> : <Personalizador />; }

/** #/editor: igual que #/personalizar. */
export function Editor() { return banderaV3() ? <MiPersonajeApp /> : <Personalizador />; }
