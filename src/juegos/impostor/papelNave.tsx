// El impostor en la nave: papeles en la mesa (Elías, 24 nov). Se configura en «Modo de juego» (categorías con imagen);
// después de la carga, la partida nace con los papeles repartidos: cada quien ve el suyo con la huella y, cuando todos lo
// vieron, el administrador abre la discusión. Solo leen la vista pública y, en el papel, lo privado de cada quien.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Escaner } from "../../ds";
import { colorDe, varsColor } from "../../app/colorJugador";
import { Escena3D, enEscena } from "../../app/figura3d";
import { sonar } from "../../app/sonido";
import { CONTENIDO } from "../../content";
import { Burbuja } from "../../pantallas/Identidad";
import { srcArte } from "../../pantallas/TarjetasConfig";
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
        <span className="ns-t2 dsp ol">{faltan.length ? "Esperando a que todos vean su papel" : "Todos vieron su papel"}</span>
        <ul className="ns-vistos" aria-label="Quién ya vio su papel">
          {ids.map(id => <li key={id} className={vistos.includes(id) ? "si" : ""}><Burbuja p={{ ...persona(v, miembros, id), insignia: vistos.includes(id) ? "✓" : undefined }} tamano="2.6em" conNombre /></li>)}
        </ul>
        {soyAnfitrion ? (
          <>
            {faltan.length > 0 && <small className="ns-nota">Faltan: {faltan.map(id => nombreDe(v, id)).join(", ")}. {local ? "" : "Puedes empezar sin esperar."}</small>}
            <button type="button" className="lb-listo ns-discutir" disabled={!!local && faltan.length > 0} onClick={alDiscutir}>¡A discutir!</button>
          </>
        ) : <p className="ns-espera a-pulso" role="status">El administrador abre la discusión en cuanto todos lo vean.</p>}
      </section>
    );
  }
  const imp = mio.rol === "impostor";
  const comp = mio.companeros ?? [];
  const yoP = persona(v, miembros, yo);
  // Una sola pantalla (Elías): tu figura 3D flotando en el espacio con el brillo de tu bando, el papel en grande,
  // la huella para ver la palabra y «Ya lo vi» siempre a la vista. En pantalla ancha, figura a la izquierda.
  return (
    <section className={"ns-papel " + (imp ? "imp" : "civil")} aria-label="Tu papel" style={{ ...varsColor(yoP.color), "--espacio": arteNave("espacio") } as CSSProperties}>
      <div className="ns-p-fig" aria-hidden="true">
        <span className="ns-p-halo" />
        <Escena3D figuras={[enEscena(yo, yoP.figura ?? null)]} sinPedestal className="ns-p-3d" />
      </div>
      <div className="ns-p-info">
        <span className="ns-p-quien">{yoP.nombre} · tu papel</span>
        <span className="ns-rol dsp">{imp ? "Impostor" : "Civil"}</span>
        {imp ? (
          comp.length ? <div className="ns-comp"><small>{comp.length === 1 ? "Tu compañero" : "Tus compañeros"}</small><ul>{comp.map(id => <li key={id}><Burbuja p={persona(v, miembros, id)} tamano="2.4em" conNombre /></li>)}</ul></div>
            : <p className="ns-papel-sub">Eres el único impostor. Que no te descubran.</p>
        ) : <p className="ns-papel-sub">Hay {total} {total === 1 ? "impostor" : "impostores"} a bordo. Descubre quién.</p>}
        <Escaner secreto={imp ? mio.pista ?? (mio.tema ?? "") : mio.palabra ?? "…"} encabezado={imp ? (mio.pista ? "TU PISTA" : "CATEGORÍA") : "PALABRA SECRETA"}
          detalle={`Categoría: ${mio.tema ?? ""}`} style={{ minHeight: "0", width: "100%" }} />
        <button type="button" className="lb-listo ns-p-listo" onClick={alVisto}>Ya lo vi</button>
      </div>
    </section>
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
