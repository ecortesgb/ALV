// Traducción entre los ids de la sala en el servidor (cuentas) y los personajes de cada pantalla.
// Anfitrión: su cuenta es su primer jugador local y los demás son `c-<id de cuenta>`.
// Invitado: los personajes usan el id de la cuenta tal cual.
import type { GestoSala, MiembroSala } from "./nube";

export type VistaSala = "anfitrion" | "invitado";

export interface SalaTraducida {
  listos: Set<string>;
  gestos: Record<string, { gesto: GestoSala; a?: string; n: number }>;
  /** De id de pantalla a id de cuenta; undefined si es un jugador local sin cuenta. */
  aServidor: (id: string) => string | undefined;
}

export function traducirSala(vista: VistaSala, miembros: MiembroSala[], primeroLocal: string | undefined): SalaTraducida {
  const host = miembros.find(m => m.anfitrion)?.id;
  const aVista = (u: string) => (vista === "invitado" ? u : u === host ? primeroLocal : `c-${u}`);
  const aServidor = (id: string) => (vista === "invitado" ? id : id === primeroLocal ? host : id.startsWith("c-") ? id.slice(2) : undefined);
  const listos = new Set<string>();
  const gestos: SalaTraducida["gestos"] = {};
  for (const m of miembros) {
    const id = aVista(m.id);
    if (!id) continue;
    if (m.listo) listos.add(id);
    if (m.gesto) gestos[id] = { gesto: m.gesto, a: m.gestoA ? aVista(m.gestoA) : undefined, n: m.gestoN };
  }
  return { listos, gestos, aServidor };
}
