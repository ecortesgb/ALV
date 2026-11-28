// Lobby: «Agregar jugador» y «Cambiar figura» abren la sección Trajes del personalizador actual (Elías, 28 nov: ya no los
// personajes anteriores de trajes-figura.json). Es el mismo taller de «Mi personaje», encima del lobby; al guardar regresa
// la figura nueva (v3 dentro del puente v2, igual que las cápsulas) y no toca las cápsulas de nadie.
import { Suspense, lazy, useEffect, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RaizDS } from "../../ds";
import { figuraParaTrajes, proyectar, useEstadoCatalogoV3 } from "../../personajes/integracion";
import type { FiguraV2 } from "../../content/personaje";
import { rarezaPersonaje } from "../../content/personajesTienda";
import { cargarPersonajesTienda, useTienda } from "../../servicios/tienda";
import { useSesion } from "../../app/sesion";

// El taller pesa: se baja solo al abrirlo (igual que «Mi personaje»).
const TallerTrajes = lazy(() => import("../../personajes/MiPersonaje").then(m => ({ default: m.TallerTrajes })));

/** Qué personajes puede usar. El anfitrión, también los suyos de la tienda; un jugador nuevo, los mismos que una cuenta
 *  nueva (los comunes y los que no se venden). */
export function usePuedeUsar(propio: boolean): (id: string) => boolean {
  const { uid } = useSesion();
  const { demo, catalogoPersonajes, personajes } = useTienda();
  useEffect(() => { void cargarPersonajesTienda(); }, [uid]);
  return (id: string) => rarezaPersonaje(id) === "comun" || (propio && personajes.has(id)) || (!demo && !catalogoPersonajes?.some(c => c.id === id));
}

function Espera({ texto, children }: { texto: string; children?: ReactNode }) {
  return (
    <div className="pl-velo" role="dialog" aria-modal="true" aria-label="Trajes">
      <div className="pl-modal" style={{ alignItems: "center", textAlign: "center" }}><p className="pl-espera">{texto}</p>{children}</div>
    </div>
  );
}

/** El taller abierto en Trajes, a pantalla completa sobre el lobby. `inicial`: la figura que ya tiene. */
export function ElegirTraje({ inicial, propio, alElegir, alSalir }: { inicial?: FiguraV2 | null; propio: boolean; alElegir: (f: FiguraV2) => void; alSalir: () => void }) {
  const { catalogo: cat, estado, reintentar } = useEstadoCatalogoV3();
  const puedeUsar = usePuedeUsar(propio);
  const primera = useMemo(() => (cat ? figuraParaTrajes(cat, inicial) : null), [cat, inicial]);
  const espera = estado === "sin-acceso"
    ? <Espera texto="No se pudieron cargar los personajes. Revisa tu conexión.">
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="pl-azar" onClick={reintentar}>Reintentar</button>
          <button type="button" className="pl-azar" onClick={alSalir}>Cerrar</button>
        </div>
      </Espera>
    : <Espera texto="Cargando personajes…" />;
  return createPortal(
    cat && primera ? (
      <Suspense fallback={<RaizDS className="az">{espera}</RaizDS>}>
        <TallerTrajes catalogo={cat} inicial={primera} puedeUsar={puedeUsar} onGuardar={f => alElegir(proyectar(f) as unknown as FiguraV2)} onSalir={alSalir} />
      </Suspense>
    ) : <RaizDS className="az">{espera}</RaizDS>,
    document.body,
  );
}
