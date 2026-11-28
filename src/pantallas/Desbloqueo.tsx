// Piezas con rareza: candado en las cuadrículas y el panel para desbloquear (con XP o ganándola en un reto).
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { sonar } from "../app/sonido";
import catalogo from "../content/catalogo-figura.json";
import { NOMBRE_RAREZA, PRECIO, RETOS, rarezaDe, type Rareza } from "../content/rarezas";
import { desbloquear, usePiezas } from "../servicios/piezas";
import { aviso } from "./comun";
import { miniatura } from "./Libro";

/** Nombre y miniatura de cualquier pieza del catálogo (MOM_x = paquete de momentos). */
export function infoPieza(id: string): { nombre: string; mini: string | null } {
  if (id.startsWith("MOM_")) { const p = catalogo.paquetes.find(x => x.id === id.slice(4)); return { nombre: `Momentos: ${p?.nombre ?? id.slice(4)}`, mini: null }; }
  for (const lista of Object.values(catalogo.secciones) as { id?: string | null; nombre: string; mini: string }[][]) {
    const x = lista.find(p => p.id === id); if (x) return { nombre: x.nombre, mini: x.mini };
  }
  return { nombre: id, mini: null };
}

// ---------- Panel (uno para todo el libro) ----------
let abierta: string | null = null;
const oyentes = new Set<() => void>();
export const pedirDesbloqueo = (id: string) => { abierta = id; sonar("clic"); oyentes.forEach(f => f()); };
const cerrar = () => { abierta = null; oyentes.forEach(f => f()); };

export function PanelDesbloqueo({ alIrARetos }: { alIrARetos: () => void }) {
  const id = useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => abierta);
  const p = usePiezas();
  const [ocupado, setOcupado] = useState(false);
  // Al salir del personalizador el panel se cierra: si no, `abierta` se quedaba y reaparecía al volver (auditoría 28 nov).
  useEffect(() => cerrar, []);
  if (!id) return null;
  const r = rarezaDe(id), precio = PRECIO[r], info = infoPieza(id), retos = RETOS.filter(x => x.premio === id);
  const alcanza = p.xp >= precio;
  const comprar = async () => {
    if (ocupado) return;
    setOcupado(true);
    let error: string | null;
    // Si falla la red, el botón no se queda desactivado para siempre.
    try { error = await desbloquear(id); } catch { error = "No se pudo desbloquear. Revisa tu conexión."; } finally { setOcupado(false); }
    if (error) { aviso(error); sonar("error"); return; }
    sonar("fanfarria"); aviso(`¡Desbloqueaste ${info.nombre}!`); cerrar();
  };
  // Fuera del libro (sus hojas tienen capas propias), pero dentro de la pantalla para conservar los colores del tema.
  const destino = document.querySelector(".D.p-taller") ?? document.body;
  return createPortal(
    <div className="p-desbloqueo-fondo" role="dialog" aria-modal="true" aria-label={`Desbloquear ${info.nombre}`} onClick={e => { if (e.target === e.currentTarget) cerrar(); }}>
      <div className={"p-desbloqueo r-" + r}>
        <span className="p-desbloqueo-rareza p-sfx">{NOMBRE_RAREZA[r]}</span>
        <div className="p-desbloqueo-arte">{info.mini ? <img src={miniatura(info.mini)} alt="" /> : <span className="p-sfx">¡POW!</span>}</div>
        <strong className="p-desbloqueo-nombre">{info.nombre}</strong>
        <p className="p-desbloqueo-saldo">Tienes <b>{p.xp.toLocaleString("es-MX")} XP</b>{p.demo ? " (de demostración)" : ""}</p>
        <button type="button" className="p-sorpresa" disabled={!alcanza || ocupado} onClick={() => void comprar()}>
          <span className="p-sfx">Desbloquear</span><small>{precio} XP</small>
        </button>
        {!alcanza && <p className="p-nota">Te faltan {precio - p.xp} XP. Gánalas jugando partidas o con los retos.</p>}
        {retos.length > 0 && (
          <div className="p-desbloqueo-retos">
            <span>O gánala gratis:</span>
            {retos.map(x => <button key={x.id} type="button" className="p-opcion" onClick={() => { cerrar(); alIrARetos(); }}>Reto «{x.nombre}»</button>)}
          </div>
        )}
        <button type="button" className="p-opcion p-desbloqueo-cerrar" onClick={cerrar}>Cerrar</button>
      </div>
    </div>,
    destino,
  );
}

/** Esquina de rareza y candado sobre una miniatura. */
export function MarcaRareza({ r, bloqueada }: { r: Rareza; bloqueada: boolean }) {
  if (r === "comun") return null;
  return <span className={"p-rareza r-" + r + (bloqueada ? " bloq" : "")} aria-label={NOMBRE_RAREZA[r] + (bloqueada ? ", bloqueada" : "")}>{bloqueada ? "🔒" : "★"}</span>;
}
