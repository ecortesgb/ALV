// Fondo pintado de una sección (Ranking, Logros): imagen fija a pantalla completa y velo oscuro para leer encima.
// Imágenes de Elías en public/arte/fondos/<nombre>-1920.webp y -1100.webp (originales en juegos-fiesta\arte-hub).
// PRUEBA: `?fondo=<clave>` en la dirección elige otra opción de la sección para comparar.
import type { CSSProperties } from "react";
import "./fondo-seccion.css";

export interface OpcionFondo { clave: string; archivo: string; foco?: string }

const url = (nombre: string) => `url("${new URL(`${import.meta.env.BASE_URL}arte/fondos/${nombre}`, document.baseURI).href}")`;

/** La opción pedida con `?fondo=` o la primera de la lista. */
export function elegirFondo(opciones: OpcionFondo[]): OpcionFondo {
  let pedida: string | null = null;
  try { pedida = new URLSearchParams(location.search).get("fondo"); } catch { /* sin dirección */ }
  return opciones.find(o => o.clave === pedida) ?? opciones[0]!;
}

export function FondoSeccion({ opciones, velo = .5 }: { opciones: OpcionFondo[]; velo?: number }) {
  const o = elegirFondo(opciones);
  const estilo = { "--sf-g": url(`${o.archivo}-1920.webp`), "--sf-c": url(`${o.archivo}-1100.webp`), "--sf-foco": o.foco ?? "50% 50%", "--sf-velo": velo } as CSSProperties;
  return (
    <div className={`sf sf-${o.clave}`} style={estilo} aria-hidden="true">
      <div className="sf-img" />
      <div className="sf-velo" />
    </div>
  );
}
