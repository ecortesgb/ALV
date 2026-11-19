// Los 3 modos del personalizador (plan de 3 modos, 2026-11-19): tarjetas grandes al abrir el libro, separadores del
// canto para cambiar de modo y el modo Básico en 5 pasos. Los tres editan la misma figura.
import { useEffect, useState, type CSSProperties } from "react";
import type { ZonaFigura } from "../app/figura3d";
import {
  alternarDetalle, capaDe, colorPelo, colorPiernas, colorTorso, completar, cuelloDe, ponerBotas, ponerCapa, ponerCascoSolo, ponerCuello,
  ponerMascaraCompleta, ponerObjeto, ponerPelo, ponerPiel, ponerRostro, ponerTorsoCompleto, tipoPiernas, type Figura,
} from "../app/editarFigura";
import { sonar } from "../app/sonido";
import catalogo from "../content/catalogo-figura.json";
import type { FiguraV2 } from "../content/personaje";
import { esOriginal } from "../content/sagas";
import { infoPieza } from "./Desbloqueo";
import { DibujoDado, DibujoMomentos, DibujoNombre, Vineta, type Cambiar, type ModoEditor, type Pagina } from "./Libro";
import { Colores, Piezas, item } from "./Secciones";
import { Rayos, srcArte, useInclina } from "./TarjetasConfig";
import "./configurar.css";

export const MODOS: { m: ModoEditor; nombre: string; texto: string; color: string; minis: string[] }[] = [
  { m: "basico", nombre: "Básico", texto: "Piel, rostro, pelo, ropa y piernas. Rápido y sencillo.", color: "#f2a900", minis: ["estilo-civil", "estilo-fiesta", "estilo-espacial"] },
  { m: "original", nombre: "Personaje original", texto: "Escoge un personaje famoso ya armado.", color: "#c91a09", minis: ["traje-batman", "traje-spider-man", "traje-harry-potter"] },
  { m: "avanzado", nombre: "Avanzado", texto: "Mezcla piezas comunes y de personajes, pieza por pieza.", color: "#1d5fd1", minis: ["estilo-medieval", "traje-capitan-america", "estilo-superheroe"] },
];
const miniatura = (m: string) => `${import.meta.env.BASE_URL}arte/piezas/${m}.webp`;

/** Tarjeta de un modo. Usa la ilustración de Elías (`public/arte/personalizador/<modo>.webp`) cuando exista. */
function CartaModo({ m, nombre, texto, color, minis, elegida, indice, onClick }: (typeof MODOS)[number] & { elegida: boolean; indice: number; onClick: () => void }) {
  const inc = useInclina();
  const [sinArte, setSinArte] = useState(false);
  return (
    <button type="button" {...inc} className={"tc tc-tipo p-carta-modo" + (elegida ? " on" : "")} style={{ "--i": indice, "--tc": color } as CSSProperties}
      aria-pressed={elegida} aria-label={`${nombre}: ${texto}`} onClick={onClick}>
      {!sinArte && <img className="p-modo-arte" src={srcArte(`personalizador/${m}.webp`)} alt="" draggable={false} onError={() => setSinArte(true)} />}
      {sinArte && (
        <span className="p-modo-dibujo" aria-hidden="true">
          <Rayos color={color} />
          <span className="p-modo-figuras">{minis.map(x => <img key={x} src={miniatura(x)} alt="" draggable={false} />)}</span>
        </span>
      )}
      <span className="p-modo-pie"><span className="dsp p-modo-nombre">{nombre}</span><span className="p-modo-texto">{texto}</span></span>
      {elegida && <span className="tc-check" aria-hidden="true">✓</span>}
      <span className="tc-brillo" aria-hidden="true" />
    </button>
  );
}

/** Primera página del libro: los 3 modos y, abajo, lo que vale en cualquiera (nombre, momentos, al azar). */
export function PaginaModos({ modo, elegir, ir }: { modo: ModoEditor; elegir: (m: ModoEditor) => void; ir: (p: Pagina) => void }) {
  return <>
    <div className="p-modos">
      {MODOS.map((x, i) => <CartaModo key={x.m} {...x} indice={i} elegida={modo === x.m} onClick={() => elegir(x.m)} />)}
    </div>
    <p className="p-nota">Los tres modos cambian la misma figura: lo que hagas en uno se ve en los otros.</p>
    <div className="p-vinetas p-vinetas-mas">
      <Vineta titulo="Nombre" dibujo={<DibujoNombre />} onClick={() => ir("nombre")} />
      <Vineta titulo="Momentos" dibujo={<DibujoMomentos />} onClick={() => ir("momentos")} />
      <Vineta titulo="Aleatorio" dibujo={<DibujoDado />} onClick={() => ir("aleatorio")} />
    </div>
  </>;
}

/** Separadores de colores en el canto del libro: cambian de modo en cualquier página. */
export function Separadores({ modo, elegir }: { modo: ModoEditor | null; elegir: (m: ModoEditor) => void }) {
  return (
    <nav className="p-separadores" aria-label="Modo">
      {MODOS.map(x => (
        <button key={x.m} type="button" className={"p-separador " + x.m + (modo === x.m ? " on" : "")} aria-current={modo === x.m ? "page" : undefined}
          style={{ "--tc": x.color } as CSSProperties} onClick={() => { if (modo !== x.m) elegir(x.m); }}>{x.m === "original" ? "Original" : x.nombre}</button>
      ))}
    </nav>
  );
}

// ---------- Básico: 5 pasos ----------
const PASOS: { k: "piel" | "rostro" | "pelo" | "torso" | "piernas"; nombre: string; zona: ZonaFigura }[] = [
  { k: "piel", nombre: "Piel", zona: "cabeza" },
  { k: "rostro", nombre: "Rostro", zona: "cabeza" },
  { k: "pelo", nombre: "Pelo", zona: "pelo" },
  { k: "torso", nombre: "Torso", zona: "torso" },
  { k: "piernas", nombre: "Piernas", zona: "piernas" },
];
const S = catalogo.secciones;
const PELOS = [...new Set([...catalogo.coloresPelo, ...catalogo.paleta])];
type ItemTorso = { id: string | null; mini: string; nombre: string; original?: unknown };
/** Ropa normal: los torsos para pintar (sin dibujo de personaje ni uniforme). */
const ROPA = (S.torso as ItemTorso[]).filter(x => !x.original && !esOriginal(x.id));

export function PasosBasico({ figura, cambiar, setZona }: { figura: FiguraV2; cambiar: Cambiar; setZona: (z: ZonaFigura | null) => void }) {
  const [i, setI] = useState(0);
  const paso = PASOS[i]!;
  useEffect(() => { setZona(paso.zona); return () => setZona(null); }, [paso.zona, setZona]);
  const f = completar(figura);
  const poner = (g: Figura) => cambiar(g as unknown as FiguraV2);
  const ir = (k: number) => { sonar("clic"); setI(Math.max(0, Math.min(PASOS.length - 1, k))); };
  return <>
    <div className="p-pasos" role="tablist" aria-label="Pasos">
      {PASOS.map((p, k) => (
        <button key={p.k} type="button" role="tab" aria-selected={k === i} className={"p-paso" + (k === i ? " on" : "") + (k < i ? " hecho" : "")} onClick={() => ir(k)}>
          <i aria-hidden="true">{k + 1}</i><span>{p.nombre}</span>
        </button>
      ))}
    </div>
    <TambienLleva f={f} poner={poner} />
    <div className="p-paso-cuerpo">{cuerpo()}</div>
    <div className="p-pasos-pie">
      <button type="button" className="p-opcion" disabled={i === 0} onClick={() => ir(i - 1)}>Anterior</button>
      {i < PASOS.length - 1
        ? <button type="button" className="p-opcion on" onClick={() => ir(i + 1)}>Siguiente: {PASOS[i + 1]!.nombre}</button>
        : <span className="p-sfx p-listo">¡Lista!</span>}
    </div>
  </>;

  function cuerpo() {
    switch (paso.k) {
      case "piel": {
        const nombres = Object.fromEntries(catalogo.tonos.map(t => [t.hex, t.nombre]));
        return <Colores titulo="Color de piel" actual={f.identidad.piel} colores={catalogo.tonos.map(t => t.hex)} nombres={nombres} elegir={h => poner(ponerPiel(f, h))} />;
      }
      case "rostro": {
        const mascara = !!f.accesorios.cara;
        return <Piezas titulo="Rostro" items={S.rostro.map(p => item(p, !mascara && p.id === f.identidad.rostro, () => poner(ponerRostro(f, p.id!))))} />;
      }
      case "pelo": {
        const c = f.identidad.cabello;
        return <>
          <Piezas titulo="Peinado" items={S.pelo.map(p => item(p, (p.id ?? null) === (c?.id ?? null), () => poner(ponerPelo(f, p.id))))} />
          {c && <Colores titulo="Color del pelo" actual={c.color} colores={PELOS} elegir={h => poner(colorPelo(f, h))} />}
        </>;
      }
      case "torso": {
        const t = f.ropa.torso;
        const deRopa = ROPA.some(x => (x.id ?? null) === (t.estampado ?? null));
        return <>
          <Piezas titulo="Ropa" items={ROPA.map(p => item(p, (p.id ?? null) === (t.estampado ?? null), () => poner(ponerTorsoCompleto(f, p.id))))} />
          {deRopa && <Colores titulo="Color" actual={t.color} colores={catalogo.paleta} elegir={h => poner(colorTorso(f, h))} />}
        </>;
      }
      case "piernas": {
        const p = f.ropa.piernas;
        return <>
          <Piezas titulo="Largo" items={S.piernas.map(x => item(x, (x as { tipo?: string }).tipo === p.tipo, () => poner(tipoPiernas(f, (x as { tipo: "normal" | "cortas" }).tipo))))} />
          <Colores titulo="Color" actual={p.color} colores={catalogo.paleta} elegir={h => poner(colorPiernas(f, "ambos", h, true))} />
        </>;
      }
    }
  }
}

/** Lo que la figura trae de los otros modos y Básico no edita: se ve aquí y se puede quitar (con aviso). */
function TambienLleva({ f, poner }: { f: Figura; poner: (g: Figura) => void }) {
  const cosas: { nombre: string; quitar: () => Figura }[] = [];
  const casco = f.accesorios.cabeza, mascara = f.accesorios.cara, cuello = cuelloDe(f), capa = capaDe(f);
  if (casco) cosas.push({ nombre: infoPieza(casco.id).nombre, quitar: () => ponerCascoSolo(f, null, "") });
  if (mascara) cosas.push({ nombre: infoPieza(mascara.id).nombre, quitar: () => ponerMascaraCompleta(f, null, "") });
  if (f.identidad.detalles.length) cosas.push({ nombre: f.identidad.detalles.map(d => infoPieza(d).nombre).join(" + "), quitar: () => alternarDetalle(f, null, () => null) });
  if (cuello) cosas.push({ nombre: infoPieza(cuello.id).nombre, quitar: () => ponerCuello(f, null) });
  if (capa) cosas.push({ nombre: infoPieza(capa.id).nombre, quitar: () => ponerCapa(f, null) });
  const est = f.ropa.torso.estampado;
  if (est && !ROPA.some(x => x.id === est)) cosas.push({ nombre: infoPieza(est).nombre, quitar: () => colorTorso(ponerTorsoCompleto(f, null), f.ropa.torso.color) });
  if (f.ropa.piernas.botas) cosas.push({ nombre: "Botas", quitar: () => ponerBotas(f, null) });
  for (const m of ["mano_der", "mano_izq"] as const) { const o = f.accesorios[m]; if (o) cosas.push({ nombre: infoPieza(o.id).nombre, quitar: () => ponerObjeto(f, m, null) }); }
  if (!cosas.length) return null;
  return (
    <section className="p-tambien" aria-label="También lleva">
      <span className="p-tambien-titulo">También lleva</span>
      {cosas.map(c => (
        <button key={c.nombre} type="button" className="p-tambien-cosa" onClick={() => { sonar("clic"); poner(c.quitar()); }} aria-label={`Quitar ${c.nombre}`}>
          {c.nombre} <b aria-hidden="true">×</b>
        </button>
      ))}
    </section>
  );
}
