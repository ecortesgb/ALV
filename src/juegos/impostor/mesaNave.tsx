// El impostor en la nave, celular (Elías, 24 nov): la mesa 3D con las minifiguras sentadas discutiendo y la palabra de
// cada quien sobre su cabeza; la pizarra para votar, que se abre solo cuando toca votar; y las palabras de las vueltas
// anteriores para comparar y no repetir. Solo leen la vista pública.
import { useState, type CSSProperties, type ReactNode } from "react";
import { colorDe, varsColor } from "../../app/colorJugador";
import { Escena3D, enEscena, type EnEscena, type Momento } from "../../app/figura3d";
import { SALTAR_VOTO } from "../../engine/partida";
import { Burbuja } from "../../pantallas/Identidad";
import type { Miembro } from "../../servicios/enlace";
import { nombreDe, type Publico } from "../general/texto";
import { votosVisibles } from "./nave";
import "./mesaNave.css";

const persona = (v: Publico, miembros: Miembro[], id: string) => ({
  id, nombre: nombreDe(v, id), figura: miembros.find(m => m.id === id)?.figura, color: colorDe(id, v.jugadores.map(j => j.id)),
});

/** La mesa: minifiguras sentadas (sillas del color de cada quien; la de quien salió, vacía) y su palabra sobre la cabeza. */
export function MesaPalabras({ v, miembros, yo, tv, enMesa: enMesaDada, momentos, expulsar, golpe }: { v: Publico; miembros: Miembro[]; yo: string;
  /** TV: globos más grandes y la del turno al frente. */ tv?: boolean; enMesa?: string[]; momentos?: { id: string; cual: Momento; n: number }[];
  /** TV: quién sale volando de su silla al revelar; «golpe»: el botón de la mesa se hunde al abrir la discusión. */ expulsar?: string | null; golpe?: boolean }) {
  const im = v.impostor!;
  const ids = v.jugadores.map(j => j.id);
  const enMesa = enMesaDada ?? ids.filter(id => !im.eliminados.includes(id));
  const [cabezas, setCabezas] = useState<Record<string, [number, number]>>({});
  const votando = im.etapa === "votar" && v.fase !== "revelada";
  const habla = im.etapa === "pistas" && v.fase !== "revelada" ? v.turnoDe : undefined;
  const figuras: EnEscena[] = enMesa.map(id => ({ ...enEscena(id, miembros.find(m => m.id === id)?.figura ?? null), color: colorDe(id, ids)?.base, columna: ids.indexOf(id), foco: !!tv && id === habla }));
  return (
    <div className={"nm-mesa" + (tv ? " tv" : "")}>
      <Escena3D modo="nave" figuras={figuras} columnas={ids.length} asientos={ids.map(id => colorDe(id, ids)?.base ?? "#4a5687")}
        boton={votando ? "votar" : golpe ? "golpe" : "quieto"} expulsar={expulsar} momentos={momentos} className="nm-3d" alCabezas={setCabezas} />
      <ul className="nm-globos" aria-label="Palabra de cada quien">
        {enMesa.map(id => {
          const pos = cabezas[id];
          if (!pos) return null;
          const dijo = v.pistas[id];
          const turno = habla === id;
          if (!dijo && !turno) return null;
          return (
            <li key={id} className={"nm-globo" + (turno ? " turno" : "") + (id === yo ? " yo" : "")} style={{ ...varsColor(colorDe(id, ids)), left: `${pos[0] * 100}%`, top: `${pos[1] * 100}%` } as CSSProperties}>
              <b className="dsp" key={dijo ?? "-"}>{dijo ?? "…"}</b>
              <small>{nombreDe(v, id)}</small>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Pizarra para votar: dos columnas con cada quien (su figura, su nombre y su palabra; las de antes, en chico), «✓ Votó»
 * en quien ya votó, los que salieron tachados y «Nadie» abajo. Un toque marca y el botón confirma.
 */
export function PizarraVotos({ v, miembros, yo, sel, alElegir, alVotar, puedo, miVoto, titulo, pie, tv }: {
  v: Publico; miembros: Miembro[]; yo: string; sel: string | null; alElegir: (id: string) => void; alVotar: () => void; puedo: boolean; miVoto: string | null;
  /** TV: otro título y pie, y letra más grande. */ titulo?: string; pie?: ReactNode; tv?: boolean;
}) {
  const im = v.impostor!;
  const ids = v.jugadores.map(j => j.id);
  const vivos = ids.filter(id => !im.eliminados.includes(id));
  const visibles = votosVisibles(v);
  const faltan = vivos.filter(j => !v.contestaron.includes(j)).length;
  const fila = (id: string) => {
    const p = persona(v, miembros, id);
    const fuera = im.eliminados.includes(id);
    const puede = puedo && !fuera && id !== yo;
    const voto = v.contestaron.includes(id) && !fuera;
    const actual = v.pistas[id];
    const antes = (im.palabras?.[id] ?? []).slice(0, actual ? -1 : undefined);
    const recibidos = visibles ? Object.entries(visibles).filter(([, x]) => x === id).map(([de]) => de) : [];
    return (
      <li key={id} className={"nm-fila" + (fuera ? " fuera" : "") + (id === yo ? " yo" : "") + (sel === id ? " sel" : "") + (puede ? " elegible" : "")}
        style={varsColor(p.color)} {...(puede ? { role: "radio", tabIndex: 0, "aria-checked": sel === id, onClick: () => alElegir(id),
          onKeyDown: (e: React.KeyboardEvent) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); alElegir(id); } } } : {})}>
        <span className="nm-cara"><Burbuja p={{ ...p, apagada: fuera }} tamano="2.5em" />{voto && <span className="nm-sello dsp">Votó</span>}</span>
        <span className="nm-txt">
          <span className="nm-nom">{p.nombre}{id === yo && <small> (tú)</small>}</span>
          <b className="nm-palabra dsp">{fuera ? "fuera" : actual ?? "—"}</b>
          {antes.length > 0 && !fuera && <small className="nm-antes">{antes.join(" · ")}</small>}
        </span>
        {recibidos.length > 0 && <span className="nm-votos" aria-label={`${recibidos.length} votos`}>{recibidos.map(de => <i key={de} style={varsColor(colorDe(de, ids))} />)}</span>}
      </li>
    );
  };
  const nadieVotos = visibles ? Object.values(visibles).filter(x => x === SALTAR_VOTO).length : 0;
  const nombreSel = sel === SALTAR_VOTO ? "Nadie" : sel ? nombreDe(v, sel) : null;
  return (
    <section className={"nm-pizarra" + (tv ? " tv" : "")} aria-label="Votación">
      <div className="nm-piz-marco">
        <span className="nm-piz-t dsp">{titulo ?? "¿Quién es el impostor?"}</span>
        <ul className="nm-filas" role={puedo ? "radiogroup" : undefined}>
          {ids.map(fila)}
          <li className={"nm-fila nadie" + (sel === SALTAR_VOTO ? " sel" : "") + (puedo ? " elegible" : "")}
            {...(puedo ? { role: "radio", tabIndex: 0, "aria-checked": sel === SALTAR_VOTO, onClick: () => alElegir(SALTAR_VOTO),
              onKeyDown: (e: React.KeyboardEvent) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); alElegir(SALTAR_VOTO); } } } : {})}>
            <span className="nm-nadie-ico" aria-hidden="true">⏭</span>
            <span className="nm-txt"><span className="nm-nom">Nadie, todavía</span></span>
            {nadieVotos > 0 && <span className="nm-votos"><b>{nadieVotos}</b></span>}
          </li>
        </ul>
        {pie !== undefined ? pie : puedo ? (
          <button type="button" className={"nm-votar dsp" + (sel ? " listo" : "")} disabled={!sel} onClick={alVotar}>{nombreSel ? `Votar: ${nombreSel}` : "Toca a alguien para votar"}</button>
        ) : (
          <p className="nm-estado">{miVoto ? <>Tu voto: <b>{miVoto === SALTAR_VOTO ? "Nadie" : nombreDe(v, miVoto)}</b> · </> : im.eliminados.includes(yo) ? "Ya no votas · " : ""}faltan {faltan} por votar</p>
        )}
      </div>
    </section>
  );
}

/** Palabras de todas las vueltas, por jugador: para comparar y no repetir. */
export function HistorialPalabras({ v, miembros, alCerrar }: { v: Publico; miembros: Miembro[]; alCerrar: () => void }) {
  const im = v.impostor!;
  const ids = v.jugadores.map(j => j.id);
  const vueltas = Math.max(1, ...ids.map(id => im.palabras?.[id]?.length ?? 0));
  return (
    <div className="nm-hist" role="dialog" aria-label="Palabras de cada vuelta" onClick={alCerrar}>
      <div className="nm-hist-caja" onClick={e => e.stopPropagation()}>
        <header><b className="dsp">Palabras de cada vuelta</b><button type="button" className="nm-hist-x" aria-label="Cerrar" onClick={alCerrar}>✕</button></header>
        <table>
          <thead><tr><th />{Array.from({ length: vueltas }, (_, n) => <th key={n}>V{n + 1}</th>)}</tr></thead>
          <tbody>
            {ids.map(id => {
              const p = persona(v, miembros, id);
              const pal = im.palabras?.[id] ?? [];
              return (
                <tr key={id} className={im.eliminados.includes(id) ? "fuera" : ""} style={varsColor(p.color)}>
                  <th scope="row"><Burbuja p={p} tamano="1.8em" /><span>{p.nombre}</span></th>
                  {Array.from({ length: vueltas }, (_, n) => <td key={n}>{pal[n] ?? "—"}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
