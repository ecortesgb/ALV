// La carta del turno (Elías, 28 nov: «que la carta sea la protagonista»): grande al centro en el celular y en la TV,
// con el color de su tipo, su nivel (Temperatura o Voltaje) y si es de trago. Se reparte desde el mazo y se voltea
// solo cuando sale una carta nueva: al volver a montarse (reconexión, pasar el teléfono) aparece quieta.
// Solo usa la vista pública y las etiquetas del contenido (que ya es público); el texto va como texto, nunca como HTML.
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { CONTENIDO } from "../../content";
import { EJE_DE_MAZO, NIVELES_EJE } from "../../content/catalogo";
import type { Carta, Eje } from "../../engine/types";
import { nombreJuego, type Publico } from "./texto";
import "./carta.css";

/** Color de la carta: uno por tipo de juego o de mazo. */
export type TonoCarta = "verdad" | "reto" | "castigo" | "confesion" | "senalar" | "votacion" | "pareja" | "palabra" | "competencia" | "dados" | "voz" | "neutro";

const TONO_MAZO: Record<string, TonoCarta> = {
  verdad: "verdad", reto: "reto", "reto-escenario": "reto", castigo: "castigo", "yo-nunca": "confesion", "mas-probable": "senalar",
  "que-prefieres": "votacion", conoces: "pareja", palabra: "palabra", lista: "palabra", competencia: "competencia", dados: "dados",
};
/** Tono por el mazo de la carta (o por el tipo que manda el motor). */
export const tonoDeMazo = (mazo?: string): TonoCarta => (mazo && TONO_MAZO[mazo]) || "neutro";

// Etiquetas de cada carta por su id (el contenido ya viene en el paquete: no pesa más). Se arma una sola vez.
let indice: Map<string, Carta> | null = null;
/** Etiquetas de la carta: mazo, nivel en su eje, si es de trago y si tiene contacto. Las cartas armadas al vuelo no tienen. */
export function etiquetasDe(id?: string): { mazo: string; eje?: Eje; nivel: number; trago: boolean; contacto: boolean } | null {
  if (!id) return null;
  indice ??= new Map(CONTENIDO.cartas.map(c => [c.id, c]));
  const c = indice.get(id);
  return c ? { mazo: c.mazo, eje: EJE_DE_MAZO[c.mazo], nivel: c.nivel ?? 1, trago: !!c.drunk, contacto: !!c.contacto } : null;
}

const SELLO: Record<string, string> = {
  verdad: "Verdad", reto: "Reto", "reto-escenario": "Reto", castigo: "Castigo", dados: "Dados HOT", lista: "Lista", palabra: "Palabra",
};
/** Qué dice la banda de la carta y de qué color va, según el juego y el mazo. */
export function selloDe(v: Publico): { sello: string; tono: TonoCarta } {
  switch (v.motor) {
    case "votacion": return { sello: "¿Qué prefieres?", tono: "votacion" };
    case "confesion": return { sello: "Yo nunca…", tono: "confesion" };
    case "senalar": return { sello: "Más probable", tono: "senalar" };
    case "pareja": return { sello: "Tu pareja", tono: "pareja" };
    case "conteo": return { sello: nombreJuego(v.juegoId), tono: "palabra" };
    // En Reto del lugar el «tipo» es la explicación del reto: va como detalle dentro de la carta, no en la banda.
    case "competencia": return { sello: "Reto del lugar", tono: "competencia" };
    default: return { sello: SELLO[v.carta?.tipo ?? ""] ?? "Carta", tono: tonoDeMazo(v.carta?.tipo) };
  }
}

/** Clave de reparto: la misma carta en la misma ronda del mismo juego no se vuelve a repartir. */
export const claveCarta = (v: Publico, extra = "") => `${v.juegoId}|${v.ronda}|${v.carta?.id ?? ""}${extra ? "|" + extra : ""}`;

// Cartas que este aparato ya vio repartirse. Sobrevive a recargar la página (sessionStorage) para no repetir la animación al reconectar.
const CLAVE_VISTAS = "alv-cartas-vistas";
let vistas: string[] | null = null;
function leerVistas(): string[] {
  if (vistas) return vistas;
  try { const x = JSON.parse(sessionStorage.getItem(CLAVE_VISTAS) ?? "[]"); vistas = Array.isArray(x) ? x.filter(s => typeof s === "string").slice(-40) : []; }
  catch { vistas = []; }
  return vistas;
}
function marcarVista(clave: string) {
  const xs = leerVistas();
  if (xs.includes(clave)) return;
  xs.push(clave);
  if (xs.length > 40) xs.splice(0, xs.length - 40);
  try { sessionStorage.setItem(CLAVE_VISTAS, JSON.stringify(xs)); } catch { /* sin almacenamiento: solo en memoria */ }
}

/** Tamaño de la letra según el largo: las cartas cortas se ven enormes y las largas caben sin desbordar. */
export function escalaTexto(texto: string): number {
  const n = texto.length;
  return n <= 24 ? 1 : n <= 48 ? .86 : n <= 80 ? .74 : n <= 120 ? .65 : n <= 170 ? .57 : .5;
}

export function CartaTurno({ modo, clave, tono, sello, texto, detalle, cartaId, pie, children, className = "" }: {
  modo: "celular" | "tv";
  /** Cambia cuando sale una carta nueva (ver `claveCarta`). */
  clave: string;
  tono: TonoCarta;
  /** El tipo en la banda de arriba: «Reto», «Verdad», «Yo nunca»… */
  sello: string;
  texto?: string;
  /** Explicación debajo del texto (Reto del lugar: cómo se juega). */
  detalle?: string;
  /** Id de la carta del contenido, para su nivel y si es de trago. */
  cartaId?: string;
  /** Línea chica dentro de la carta, abajo. */
  pie?: ReactNode;
  /** Contenido extra dentro de la carta (por ejemplo, las dos opciones de ¿Qué prefieres?). */
  children?: ReactNode;
  className?: string;
}) {
  // Se decide una vez por carta: si ya se vio (reconexión o volver a montar), aparece quieta.
  const r = useRef<{ clave: string; reparte: boolean } | null>(null);
  if (!r.current || r.current.clave !== clave) r.current = { clave: clave, reparte: !leerVistas().includes(`${modo}|${clave}`) };
  const reparte = r.current.reparte;
  useEffect(() => { marcarVista(`${modo}|${clave}`); }, [modo, clave]);

  const et = etiquetasDe(cartaId);
  const nivel = et?.eje ? { eje: et.eje, n: Math.min(3, Math.max(1, et.nivel)) } : null;
  const nombreNivel = nivel ? NIVELES_EJE[nivel.eje][nivel.n as 1 | 2 | 3] : "";
  return (
    <div className={`cr-escena cr-${modo} cr-t-${tono} ${className}`.trim()}>
      <article key={clave} className={"cr" + (reparte ? " cr-reparte" : "")} aria-roledescription="carta">
        <div className="cr-giro">
          <div className="cr-cara">
            <header className="cr-banda">
              <span className="cr-sello">{sello}</span>
              {nivel && (
                <span className={"cr-nivel " + nivel.eje} style={{ "--n": nivel.n } as CSSProperties} aria-label={`Nivel: ${nombreNivel}, ${nivel.n} de 3`} title={nombreNivel}>
                  <span className="cr-barras" aria-hidden="true">{[1, 2, 3].map(i => <i key={i} className={i <= nivel.n ? "on" : ""} />)}</span>
                  <b aria-hidden="true">{nombreNivel}</b>
                </span>
              )}
            </header>
            {texto !== undefined && <p className="cr-texto" style={{ "--cr-k": escalaTexto(texto) } as CSSProperties}>{texto}</p>}
            {detalle && <p className="cr-detalle">{detalle}</p>}
            {children}
            {(pie || et?.trago || et?.contacto) && (
              <footer className="cr-pie">
                {et?.trago && <span className="cr-chip trago">🥤 Trago: cada quien elige qué tomar</span>}
                {et?.contacto && <span className="cr-chip contacto">🤝 Contacto: solo con consentimiento</span>}
                {pie && <span className="cr-pie-txt">{pie}</span>}
              </footer>
            )}
          </div>
          {reparte && <div className="cr-dorso" aria-hidden="true"><span>ALV</span></div>}
        </div>
      </article>
    </div>
  );
}

/** Botón de acción grande para el pulgar: color por intención, presionado a .97 y deshabilitado claro. */
export function BotonAccion({ tono = "neutro", icono, texto, sub, onClick, desactivado, tipo = "button" }: {
  tono?: "si" | "no" | "a" | "b" | "trago" | "neutro"; icono?: string; texto: string; sub?: string; onClick?: () => void; desactivado?: boolean; tipo?: "button" | "submit";
}) {
  return (
    <button type={tipo} className={"cr-btn " + tono} disabled={desactivado} onClick={onClick}>
      {icono && <span className="cr-btn-ico" aria-hidden="true">{icono}</span>}
      <span className="cr-btn-txt"><b>{texto}</b>{sub && <small>{sub}</small>}</span>
    </button>
  );
}
