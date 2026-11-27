// Personalizar: tus 3 cápsulas (trajes guardados) y el editor completo de la figura 3D (Minifig Studio).
// Tocar una cápsula la pone EN JUEGO al momento: se avisa al servidor sin esperar, y la sala la ve por tiempo real.
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { FiguraV2 } from "../content/personaje";
import { FotoFigura, N_CAPSULAS, escribirCapsulas, huella, leerCapsulas, useCapsulas, type EstadoCapsulas } from "../app/figura3d";
import { atras, ir } from "../app/rutas";
import { combinar, debeRestaurar, leerPendientes, leerSellos, marcarPendiente, marcarRestaurada, prepararEpoca, quitarPendientes } from "../app/capsulasPendientes";
import { banderaV3, empaquetarV3, leerV3, modoCorteV3, proyectar, sinV3, useEstadoCatalogoV3, type FiguraV2Puente, type FiguraV3 } from "../personajes/integracion";
import { useSesion } from "../app/sesion";
import { sonar } from "../app/sonido";
import { hayNube } from "../servicios/cliente";
import { cargarCapsulasNube, guardarCapsulasNube } from "../servicios/cuenta";
import { enlace } from "../servicios/enlace";
import { aviso } from "./comun";
import { Personalizador } from "./Personalizador";

// Sincronizar con la nube (fase 5, Codex paso4-r1). guardarCapsulasNube() BORRA los espacios ausentes, así que:
//  · todo va en UNA fila (lectura incluida): dos sincronizaciones nunca se cruzan;
//  · nunca se sube sin leer antes la nube: si la lectura falla, no se sube nada y lo de aquí queda pendiente;
//  · los espacios cambiados en este aparato se marcan pendientes (capsulasPendientes.ts): la nube no los pisa al cargar y
//    se reintentan al entrar, al recuperar la conexión y al volver a la app.
let fila: Promise<unknown> = Promise.resolve();
function enFila<T>(f: () => Promise<T>, siFalla: T): Promise<T> { const p = fila.then(f).catch(() => siFalla); fila = p; return p; }

/** Lee la nube, combina (manda la nube salvo los pendientes de aquí), lo deja aquí y lo sube. true = igual en los dos lados. */
export function sincronizar(uid: string): Promise<boolean> {
  return enFila(async () => {
    const nube = await cargarCapsulasNube();
    if (!nube) return false;
    // Tras revertir el corte (hasta que esta cuenta lo termine bien): manda la nube aunque esté vacía; de aquí solo suben
    // los pendientes guardados DESPUÉS de revertir (los de antes se borraron al detectar la reversión).
    const restaurar = debeRestaurar(uid);
    const sellos = leerSellos(uid), pend = Object.keys(sellos).map(Number), aqui = leerCapsulas(uid);
    // Nube vacía: lo de este aparato sube completo (cuentas que guardaron antes de tener nube), salvo al restaurar.
    const base = nube.slots.some(Boolean) || restaurar ? combinar(nube, aqui, pend) : aqui;
    if (huella(base) !== huella(aqui)) escribirCapsulas(uid, base);
    const listo = () => { quitarPendientes(uid, sellos); if (restaurar) marcarRestaurada(uid, restaurar); return true; };
    if (!base.slots.some(Boolean) || huella(base) === huella(nube)) return listo();
    return (await guardarCapsulasNube(base)) ? listo() : false;
  }, false);
}

const mismoEspacio = (a: EstadoCapsulas["slots"][number], b: EstadoCapsulas["slots"][number]) => (a ? huella(a.figura) + "|" + a.nombre : "") === (b ? huella(b.figura) + "|" + b.nombre : "");

/** Mantiene las cápsulas de la cuenta iguales aquí y en la nube. Al abrir manda la nube (salvo lo pendiente de aquí);
 *  después, cada espacio que cambia aquí se marca pendiente y se sincroniza. */
export function SincroCapsulas() {
  const { uid, fase } = useSesion();
  const caps = useCapsulas(uid || "nadie");
  // Lo que había aquí tras la última sincronización buena (para saber qué espacios cambiaron después).
  const ultima = useRef<{ uid: string; e: EstadoCapsulas } | null>(null);
  useEffect(() => {
    if (!hayNube || fase !== "dentro" || !uid) return;
    prepararEpoca();
    let vivo = true;
    const intentar = () => void sincronizar(uid).then(ok => { if (vivo && ok) ultima.current = { uid, e: leerCapsulas(uid) }; });
    intentar();
    // Reintentos de lo pendiente (o de la restauración tras revertir): al recuperar la conexión y al volver a la app.
    const otraVez = () => { if ((leerPendientes(uid).length || debeRestaurar(uid)) && document.visibilityState === "visible") intentar(); };
    addEventListener("online", otraVez); document.addEventListener("visibilitychange", otraVez);
    return () => { vivo = false; removeEventListener("online", otraVez); document.removeEventListener("visibilitychange", otraVez); };
  }, [uid, fase]);
  const h = huella(caps);
  useEffect(() => {
    const u = ultima.current;
    if (!hayNube || !u || u.uid !== uid) return; // antes de la primera sincronización buena no se sube nada
    const t = setTimeout(() => {
      const aqui = leerCapsulas(uid);
      aqui.slots.forEach((s, k) => { if (!mismoEspacio(s, u.e.slots[k] ?? null)) marcarPendiente(uid, k); });
      if (!leerPendientes(uid).length && aqui.activa === u.e.activa) return;
      void sincronizar(uid).then(ok => { if (ok) ultima.current = { uid, e: leerCapsulas(uid) }; });
    }, 500);
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

/** Guarda una figura nueva en el espacio `i` (Codex, ajuste 6 y paso4-r1): mete la v3 en la v2 de ese espacio con el puente
 *  (la v2 queda de respaldo), lo activa y lo escribe aquí; con nube lo marca pendiente y sincroniza (lee, combina y sube en
 *  la fila). Dice si quedó en la nube o solo en este aparato (entonces se reintenta solo). */
export async function guardarFiguraNueva(uid: string, i: number, f: FiguraV3, nombre: string): Promise<"sincronizado" | "local" | "error"> {
  const aqui = leerCapsulas(uid);
  const previa = aqui.slots[i]?.figura;
  // Con el corte la figura interna es la proyección de la v3 (sin respaldo v2: la base ya no guarda v2).
  const fig = modoCorteV3() ? (leerV3({ version: 2, extensiones: { alv: { v3: f } } }) ? proyectar(f) : null)
    : empaquetarV3(f, previa ? sinV3(previa as unknown as FiguraV2Puente) : null);
  if (!fig) return "error";
  const slots = [...aqui.slots];
  slots[i] = { nombre: nombre.slice(0, 24), figura: fig as unknown as FiguraV2, actualizado: new Date().toISOString() };
  escribirCapsulas(uid, { ...aqui, slots, activa: i });
  if (!hayNube) return "local";
  marcarPendiente(uid, i);
  return (await sincronizar(uid)) ? "sincronizado" : "local";
}

const MiPersonaje = lazy(() => import("../personajes/MiPersonaje").then(m => ({ default: m.MiPersonaje })));

function MiPersonajeApp() {
  const { uid } = useSesion();
  const caps = useCapsulas(uid);
  const { catalogo: cat, estado, reintentar } = useEstadoCatalogoV3();
  const espacios = caps.slots.map(c => ({ figura: c ? leerV3(c.figura) : null, nombre: c?.nombre ?? "", antes: !!c }));
  const activar = (i: number) => {
    if (!caps.slots[i] || caps.activa === i) return;
    sonar("exito");
    escribirCapsulas(uid, { ...leerCapsulas(uid), activa: i });
    void enlace.activarCapsula(i + 1);
  };
  return (
    <Suspense fallback={null}>
      <MiPersonaje jugador={uid} catalogo={cat} estadoCatalogo={estado} onReintentar={reintentar} espacios={espacios} activa={caps.activa}
        onGuardar={(i, f, n) => guardarFiguraNueva(uid, i, f, n)} onActivar={activar} onSalir={atras} />
    </Suspense>
  );
}

/** #/personalizar: el personalizador (muro de espacios y libro de cómic, src/pantallas/Personalizador.tsx); con la bandera de
 *  la fase 5, «Mi personaje» del sistema nuevo. */
export function Personalizar() { return banderaV3() ? <MiPersonajeApp /> : <Personalizador />; }

/** #/editor: igual que #/personalizar. */
export function Editor() { return banderaV3() ? <MiPersonajeApp /> : <Personalizador />; }

/** Cuenta sin figura (Elías, 2026-11-26): no pasa al HUB hasta crear o elegir su personaje. Solo con la bandera v3, con
 *  nube y para cuentas registradas (las invitadas no bajan personajes). Mira primero este aparato y, si aquí no hay nada,
 *  la nube (una vez por cuenta): mientras no se sabe, no se bloquea. */
export function useDebeCrearFigura(): boolean {
  const { uid, fase, invitado } = useSesion();
  const caps = useCapsulas(uid || "nadie");
  const tieneAqui = caps.slots.some(Boolean);
  const aplica = fase === "dentro" && !invitado && !!uid && hayNube && banderaV3();
  const [nube, setNube] = useState<{ uid: string; vacia: boolean } | null>(null);
  useEffect(() => {
    if (!aplica || tieneAqui || nube?.uid === uid) return;
    let vivo = true;
    void cargarCapsulasNube().then(n => { if (vivo && n) setNube({ uid, vacia: !n.slots.some(Boolean) }); });
    return () => { vivo = false; };
  }, [aplica, tieneAqui, uid, nube?.uid]);
  return aplica && !tieneAqui && nube?.uid === uid && nube.vacia;
}
