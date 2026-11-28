// El impostor en la nave: papeles en la mesa (Elías, 24 nov). Se configura en «Modo de juego» (categorías con imagen);
// después de la carga, la partida nace con los papeles repartidos: cada quien ve el suyo con la huella y, cuando todos lo
// vieron, el administrador abre la discusión. Solo leen la vista pública y, en el papel, lo privado de cada quien.
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { Icono } from "../../ds";
import { colorDe, varsColor } from "../../app/colorJugador";
import { sonar } from "../../app/sonido";
import { CONTENIDO } from "../../content";
import { srcArte } from "../../pantallas/TarjetasConfig";
import { MedallonJugador } from "../../pantallas/azotea/Cabecera";
import type { Miembro } from "../../servicios/enlace";
import { nombreDe, type Publico } from "../general/texto";
import { arteNave } from "./nave";
import "./papelNave.css";

/** Arte de cada categoría (PNG de Elías a WebP en `arte/impostor/`). Mientras no llegue, sale su emoji. */
export const ARTE_CATEGORIA: Record<string, { arte: string; emoji: string }> = {
  azar: { arte: "cat-azar", emoji: "🎲" }, "s-pel": { arte: "cat-peliculas", emoji: "🎬" }, "s-vid": { arte: "cat-videojuegos", emoji: "🎮" },
  "s-ser": { arte: "cat-series", emoji: "📺" }, "s-can": { arte: "cat-cantantes", emoji: "🎤" }, "s-sup": { arte: "cat-superheroes", emoji: "🦸" },
  "s-ani": { arte: "cat-animados", emoji: "🎨" }, "s-cel": { arte: "cat-celebridades", emoji: "⭐" }, "s-fut": { arte: "cat-futbol", emoji: "⚽" },
  "s-adu": { arte: "cat-adultos", emoji: "🔥" }, "s-obj": { arte: "cat-objetos", emoji: "🔑" },
};

/** Las tarjetas de categoría: «Al azar» y las de la nave (Adultos solo con Temperatura alta). */
export function categoriasNave(adulto: boolean): { id: string | null; nombre: string }[] {
  return [{ id: null, nombre: "Al azar" }, ...CONTENIDO.temas.filter(t => t.soloNave && (!t.adulto || adulto)).map(t => ({ id: t.id, nombre: t.nombre }))];
}
export const nombreCategoria = (id: string | null) => (id === null ? "Al azar" : CONTENIDO.temas.find(t => t.id === id)?.nombre ?? "Al azar");

/** Imagen de la categoría; si el archivo todavía no existe, el emoji sobre el color de la tarjeta. */
export function ArteCategoria({ id }: { id: string | null }) {
  const a = ARTE_CATEGORIA[id ?? "azar"] ?? ARTE_CATEGORIA.azar!;
  const [falla, setFalla] = useState(false);
  return falla ? <span className="ns-cat-emoji" aria-hidden="true">{a.emoji}</span>
    : <img className="ns-cat-img" src={srcArte(`impostor/${a.arte}.webp`)} alt="" draggable={false} onError={() => setFalla(true)} />;
}

const persona = (v: Publico, miembros: Miembro[], id: string) => ({
  id, nombre: nombreDe(v, id), figura: miembros.find(m => m.id === id)?.figura, color: colorDe(id, v.jugadores.map(j => j.id)),
});

type Mio = { rol?: string; tema?: string; palabra?: string; companeros?: string[]; pista?: string } | null;

/**
 * Tu papel: civil (con la palabra en la huella) o impostor (con quiénes son los otros y la pista o la categoría).
 * Después de «Ya lo vi», quién falta; el administrador abre la discusión (aunque falte alguien).
 */
export function PapelNave({ v, mio, miembros, yo, vi, alVisto, soyAnfitrion, alDiscutir, local }: {
  v: Publico; mio: Mio; miembros: Miembro[]; yo: string; vi: boolean; alVisto: () => void;
  soyAnfitrion: boolean; alDiscutir: () => void; local?: boolean;
}) {
  const im = v.impostor!;
  const ids = v.jugadores.map(j => j.id);
  const vistos = im.vistos ?? [];
  const faltan = ids.filter(id => !vistos.includes(id));
  const total = im.total;
  if (vi || !mio) {
    return (
      <section className="ns-papel espera" aria-label="Papeles">
        <span className="ns-kick">Papeles repartidos</span>
        <span className="ns-t2">{faltan.length ? "Esperando a que todos vean su papel" : "Todos vieron su papel"}</span>
        <ul className="ns-vistos" aria-label="Quién ya vio su papel">
          {ids.map((id, i) => { const p = persona(v, miembros, id); return (
            <li key={id} className={vistos.includes(id) ? "si" : ""} style={varsColor(p.color)}>
              <MedallonJugador id={id} figura={p.figura} estrella={i + 1} tamano="var(--ns-v)" />
              <span className="ns-v-nom">{p.nombre}</span>{vistos.includes(id) && <span className="ns-v-ok" aria-label="Ya lo vio">✓</span>}
            </li>); })}
        </ul>
        {soyAnfitrion ? (
          <>
            {faltan.length > 0 && <small className="ns-nota">Faltan: {faltan.map(id => nombreDe(v, id)).join(", ")}. {local ? "" : "Puedes empezar sin esperar."}</small>}
            <button type="button" className="ns-bloque ns-discutir" disabled={!!local && faltan.length > 0} onClick={alDiscutir}><b>¡A discutir!</b></button>
          </>
        ) : <p className="ns-espera a-pulso" role="status">El administrador abre la discusión en cuanto todos lo vean.</p>}
      </section>
    );
  }
  const imp = mio.rol === "impostor";
  const comp = mio.companeros ?? [];
  const yoP = persona(v, miembros, yo);
  // Como desbloquear el celular (Elías, 25 nov): tu burbuja arriba y el lector abajo. Por fuera nada dice si eres
  // impostor o civil (mismo color y brillo para todos); el papel sale solo dentro del círculo mientras mantienes el dedo.
  return (
    <section className="ns-papel ns-lector-pant" aria-label="Tu papel" style={{ ...varsColor(yoP.color), "--espacio": arteNave("espacio") } as CSSProperties}>
      <div className="ns-yo">
        <MedallonJugador id={yo} figura={yoP.figura} estrella={ids.indexOf(yo) + 1} tamano="var(--ns-b)" />
        <b className="ns-yo-nom">{yoP.nombre}</b>
      </div>
      <LectorHuella>
        {imp ? (
          <>
            <span className="ns-l-kick">Tu papel</span>
            <b className="ns-l-imp">Impostor</b>
            <span className="ns-l-det">{mio.pista ? <>Pista: <b>{mio.pista}</b></> : <>Categoría: <b>{mio.tema}</b></>}</span>
            {mio.pista && <span className="ns-l-det">Categoría: {mio.tema}</span>}
            <span className="ns-l-det chico">{comp.length ? `Con ${comp.map(id => nombreDe(v, id)).join(" y ")}` : "Eres el único. Que no te descubran."}</span>
          </>
        ) : (
          <>
            <span className="ns-l-kick">Tu palabra</span>
            <b className="ns-l-pal" style={{ "--n": Math.max(5, ...(mio.palabra ?? "").split(/\s+/).map(x => x.length)) } as CSSProperties}>{mio.palabra}</b>
            <span className="ns-l-det">Categoría: <b>{mio.tema}</b></span>
          </>
        )}
      </LectorHuella>
      <p className="ns-l-ayuda">Hay {total} {total === 1 ? "impostor" : "impostores"} a bordo. Que nadie más vea la pantalla.</p>
      <button type="button" className="ns-bloque" onClick={alVisto}><b>Ya lo vi</b></button>
    </section>
  );
}

/** Lector de huella redondo: el secreto (los hijos) se ve dentro del círculo solo mientras se mantiene el dedo, Espacio o Enter. */
export function LectorHuella({ children, etiqueta = "Mantén el dedo para ver tu papel", pide = ["Mantén el dedo para ver", "Suelta para ocultar"] }: {
  children: ReactNode; etiqueta?: string; pide?: [string, string] }) {
  const [on, setOn] = useState(false);
  const tecla = (e: KeyboardEvent, valor: boolean) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setOn(valor); } };
  return (
    <div className="ns-lector-caja">
      <div className={"ns-lector" + (on ? " on" : "")} role="button" tabIndex={0} aria-pressed={on} aria-label={etiqueta}
        onPointerDown={() => setOn(true)} onPointerUp={() => setOn(false)} onPointerLeave={() => setOn(false)} onPointerCancel={() => setOn(false)}
        onContextMenu={e => e.preventDefault()} onBlur={() => setOn(false)} onKeyDown={e => tecla(e, true)} onKeyUp={e => tecla(e, false)}>
        <span className="ns-l-anillo" aria-hidden="true" />
        <span className="ns-l-tapa" aria-hidden={on}><Icono id="finger" /><span className="ns-l-raya" /></span>
        <span className="ns-l-secreto" aria-hidden={!on} aria-live="polite">{on ? children : null}</span>
      </div>
      <span className="ns-l-pide" aria-hidden="true">{on ? pide[1] : pide[0]}</span>
    </div>
  );
}

/** ¿Acaba de abrirse la discusión? true durante 2.4 s cuando la etapa pasa de «papeles» a la vuelta de palabras. */
export function useAnuncioDiscusion(v: Publico | null): boolean {
  const antes = useRef(v?.impostor?.etapa);
  const [ver, setVer] = useState(false);
  const etapa = v?.impostor?.etapa;
  useEffect(() => {
    const prev = antes.current; antes.current = etapa;
    if (prev !== "papeles" || etapa !== "pistas") return;
    setVer(true); sonar("epica");
    const t = setTimeout(() => setVer(false), 2400);
    return () => clearTimeout(t);
  }, [etapa]);
  return ver;
}

/** «¡A discutir!»: el botón dorado de la mesa se hunde, destello y el aviso (TV y celulares). */
export function AnuncioDiscusion({ modo }: { modo: "tv" | "celular" }) {
  return (
    <div className={`ns-anuncio ${modo}`} role="status" aria-live="assertive">
      <span className="ns-anuncio-boton" aria-hidden="true" />
      <b className="ns-anuncio-t dsp ol">¡A discutir!</b>
      <small>Por turnos, cada quien dice su palabra en voz alta y la escribe.</small>
    </div>
  );
}
