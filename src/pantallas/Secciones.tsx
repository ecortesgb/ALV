// Páginas de Apariencia: cuadrícula de piezas (la elegida con borde amarillo), colores de esa pieza y, donde el modelo
// lo permite, ambos lados / izquierdo / derecho. Básico muestra lo esencial de cada página; Completo, todo.
// Todas las ediciones pasan por src/app/editarFigura.ts (misma figura en los dos modos).
import { useEffect, useState } from "react";
import type { ZonaFigura } from "../app/figura3d";
import {
  alternarDetalle, capaDe, colorCadera, colorCasco, colorDeLado, colorEstampado, colorPelo, colorPiernas, colorTorso, completar, cuelloDe,
  ladosPersonalizados, pelaTapado, ponerBotas, ponerBrazos, ponerCapa, ponerCascoSolo, ponerCinturon, ponerCuello, ponerManos, ponerMascaraCompleta,
  ponerPelo, ponerPiel, ponerRostro, ponerTorsoCompleto, quitarDetalles, tipoPiernas, type Figura, type Lado, type TrajeOriginal,
} from "../app/editarFigura";
import { sonar } from "../app/sonido";
import catalogo from "../content/catalogo-figura.json";
import type { FiguraV2 } from "../content/personaje";
import { miniatura, type ModoEditor, type Seccion } from "./Libro";
import { aplicar, combinan, estilosDe, ordenarPorEstilo, sugerencias, type SeccionLook } from "./look";

const PALETA = catalogo.paleta;
const PELO = [...new Set([...catalogo.coloresPelo, ...catalogo.paleta])];
const OCUPA = new Map(catalogo.secciones.detalle.filter(d => d.id).map(d => [d.id as string, (d as { ocupa?: string | null }).ocupa ?? null]));
const ocupa = (id: string) => OCUPA.get(id) ?? null;

// ---------- Piezas ----------
interface Item { clave: string; mini: string; nombre: string; on: boolean; elegir: () => void }
function Piezas({ titulo, items }: { titulo?: string; items: Item[] }) {
  return (
    <section className="p-bloque">
      {titulo && <h3 className="p-bloque-titulo">{titulo}</h3>}
      <div className="p-rejilla">
        {items.map(p => (
          <button key={p.clave} type="button" className={"p-pieza" + (p.on ? " on" : "")} aria-pressed={p.on} title={p.nombre}
            onClick={() => { sonar("encaje"); p.elegir(); }}>
            <img src={miniatura(p.mini)} alt="" loading="lazy" draggable={false} />
            <span>{p.nombre}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ---------- Colores ----------
interface Especial { valor: string; nombre: string; muestra: string }
function Colores({ titulo, actual, colores, especiales = [], nombres, sugeridos = [], elegir }: {
  titulo: string; actual: string | null | undefined; colores: string[]; especiales?: Especial[]; nombres?: Record<string, string>;
  /** Colores que combinan con la figura: van primero, con una estrella. */ sugeridos?: string[]; elegir: (v: string) => void;
}) {
  const a = actual?.toLowerCase();
  const sug = sugeridos.filter(c => colores.includes(c));
  colores = [...sug, ...colores.filter(c => !sug.includes(c))];
  return (
    <section className="p-bloque">
      <h3 className="p-bloque-titulo">{titulo}</h3>
      <div className="p-colores" role="radiogroup" aria-label={titulo}>
        {especiales.map(e => (
          <button key={e.valor} type="button" role="radio" aria-checked={a === e.valor} className={"p-color p-color-texto" + (a === e.valor ? " on" : "")}
            onClick={() => { sonar("clic"); elegir(e.valor); }}>
            <i style={{ background: e.muestra }} aria-hidden="true" />{e.nombre}
          </button>
        ))}
        {colores.map(c => (
          <button key={c} type="button" role="radio" aria-checked={a === c.toLowerCase()} className={"p-color" + (a === c.toLowerCase() ? " on" : "") + (sug.includes(c) ? " sug" : "")}
            style={{ background: c }} aria-label={(nombres?.[c] ?? `Color ${c}`) + (sug.includes(c) ? ", combina con tu figura" : "")}
            title={sug.includes(c) ? "Combina con tu figura" : nombres?.[c]} onClick={() => { sonar("clic"); elegir(c); }} />
        ))}
      </div>
    </section>
  );
}

// ---------- Opciones de texto (con cinturón, sin máscara…) ----------
function Opciones({ titulo, ops }: { titulo: string; ops: { nombre: string; on: boolean; elegir: () => void }[] }) {
  return (
    <section className="p-bloque">
      <h3 className="p-bloque-titulo">{titulo}</h3>
      <div className="p-opciones">
        {ops.map(o => <button key={o.nombre} type="button" aria-pressed={o.on} className={"p-opcion" + (o.on ? " on" : "")} onClick={() => { sonar("clic"); o.elegir(); }}>{o.nombre}</button>)}
      </div>
    </section>
  );
}

// ---------- Lados (ambas / izquierda / derecha) como tres viñetas ----------
function Lados({ lado, setLado, ambos, img, igualar }: { lado: Lado; setLado: (l: Lado) => void; ambos: string; img: string; igualar?: () => void }) {
  const ops: [Lado, string][] = [["ambos", ambos], ["izq", "Izquierda"], ["der", "Derecha"]];
  return (
    <>
    <div className="p-lados" role="radiogroup" aria-label="Qué lado">
      {ops.map(([l, n]) => (
        <button key={l} type="button" role="radio" aria-checked={lado === l} className={"p-lado " + l + (lado === l ? " on" : "")} onClick={() => { sonar("clic"); setLado(l); }}>
          <span className="p-lado-arte" aria-hidden="true"><img src={miniatura(img)} alt="" draggable={false} /></span>
          <span className="p-lado-cap">{n}</span>
        </button>
      ))}
    </div>
    {lado !== "ambos" && igualar && (
      <button type="button" className="p-opcion p-espejo" onClick={() => { sonar("encaje"); igualar(); }}>
        ⇄ Copiar {lado === "izq" ? "la izquierda" : "la derecha"} al otro lado
      </button>
    )}
    </>
  );
}

/** «Combina con tu look»: piezas de otras secciones del mismo estilo. */
function CombinaLook({ f, excluir, poner }: { f: Figura; excluir: SeccionLook[]; poner: (g: Figura) => void }) {
  const lista = sugerencias(f, excluir);
  if (!lista.length) return null;
  return (
    <section className="p-bloque p-look">
      <h3 className="p-bloque-titulo">Combina con tu look</h3>
      <div className="p-look-fila">
        {lista.map(x => (
          <button key={x.seccion + x.item.mini} type="button" className="p-pieza p-look-pieza" title={x.item.nombre} onClick={() => { sonar("encaje"); poner(aplicar(f, x)); }}>
            <img src={miniatura(x.item.mini)} alt="" loading="lazy" draggable={false} />
            <span><b>{x.etiqueta}</b> {x.item.nombre}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

const item = (p: { id?: string | null; mini: string; nombre: string }, on: boolean, elegir: () => void): Item => ({ clave: p.mini, mini: p.mini, nombre: p.nombre, on, elegir });

const GRUPOS: { titulo: string; ocupa: string | null; nada: string }[] = [
  { titulo: "Lentes y parche", ocupa: "ojos", nada: "Sin lentes" },
  { titulo: "Barba y bigote", ocupa: "barba", nada: "Sin barba" },
  { titulo: "Marcas", ocupa: null, nada: "Sin marcas" },
];
/** «Marcas» junta las sueltas (cicatriz) y las de mejillas (pecas o chapitas: una a la vez). */
const enGrupo = (id: string, g: string | null) => (g === null ? ocupa(id) === null || ocupa(id) === "mejillas" : ocupa(id) === g);

type ItemCat = { id: string | null; mini: string; nombre: string; color?: string; fijo?: boolean; mira?: string; original?: TrajeOriginal };

const uno = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]!;
/** El dado de cada página: cambia solo esa parte, al azar. */
function azarDe(k: Seccion, f: Figura, completo: boolean): Figura {
  const S = catalogo.secciones, color = () => uno(PALETA);
  switch (k) {
    case "pelo": return colorPelo(ponerPelo(f, uno(S.pelo.filter(p => p.id)).id), uno(PELO));
    case "casco": { const p = uno(S.casco) as ItemCat; return ponerCascoSolo(f, p.id, p.color ?? "#6c6e68"); }
    case "cabeza": return ponerRostro(ponerPiel(f, uno(catalogo.tonos).hex), uno(S.rostro).id!);
    case "cuello": { const p = uno(S.cuello); const g = ponerCuello(f, p.id ? { id: p.id, color: color() } : null); return Math.random() < 0.25 ? ponerCapa(g, { id: "CAPE_001", color: color() }) : g; }
    case "torso": { const p = uno(S.torso) as ItemCat; const g = ponerTorsoCompleto(f, p.id, p.original); return p.original ? g : colorTorso(g, color()); }
    case "brazos": return ponerBrazos(f, "ambos", uno(["torso", "piel", color()]));
    case "manos": return ponerManos(f, "ambos", uno(["piel", "piel", color()]));
    case "capa": { const p = uno(S.capa); return ponerCapa(f, p.id ? { id: p.id, color: color() } : null); }
    case "cadera": return ponerCinturon(colorCadera(f, color()), Math.random() < 0.4 ? color() : null);
    case "piernas": return colorPiernas(f, "ambos", color(), !completo);
    case "botas": return ponerBotas(f, Math.random() < 0.5 ? color() : null);
  }
}

/** Contenido de una página de Apariencia. `setZona` acerca la cámara a un lado (pierna izquierda…). */
export function PaginaSeccion({ k, modo, figura, cambiar, setZona }: { k: Seccion; modo: ModoEditor; figura: FiguraV2; cambiar: (f: FiguraV2) => void; setZona: (z: ZonaFigura | null) => void }) {
  const f = completar(figura);
  const poner = (g: Figura) => cambiar(g as unknown as FiguraV2);
  const completo = modo === "completo";
  const [lado, setLado] = useState<Lado>("ambos");
  useEffect(() => { setLado("ambos"); }, [k]);
  // Cuello: la cámara va hacia la parte principal de la pieza elegida (barba y chalecos de frente, mochilas de espaldas).
  const [vistaCuello, setVistaCuello] = useState<ZonaFigura | null>(null);
  const cuelloActual = k === "cuello" ? cuelloDe(f) : null;
  const miraCuello = (id: string | null | undefined): ZonaFigura =>
    (catalogo.secciones.cuello as ItemCat[]).find(x => x.id === id)?.mira === "espalda" ? "cuello" : "cuello_frente";
  useEffect(() => {
    const z = k === "piernas" && lado !== "ambos" ? (lado === "izq" ? "pierna_izq" : "pierna_der")
      : k === "cuello" ? vistaCuello ?? miraCuello(cuelloActual?.id) : null;
    setZona(z);
    return () => setZona(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, lado, setZona, vistaCuello]);
  useEffect(() => { setVistaCuello(null); }, [k]);
  const S = catalogo.secciones;
  const estilos = estilosDe(f);
  const sugeridos = combinan([f.ropa.torso.color, f.ropa.piernas.color], PALETA);
  const EXCLUIR: Partial<Record<Seccion, SeccionLook[]>> = { casco: ["casco", "mascara"], cuello: ["cuello", "capa"], torso: ["torso"], cabeza: ["detalle"] };
  const conLook = ["pelo", "casco", "cabeza", "cuello", "torso"].includes(k);
  return <>
    <button type="button" className="p-dado" onClick={() => { sonar("clic"); poner(azarDe(k, f, completo)); }} aria-label="Esta parte al azar">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8" cy="8" r="1.6" /><circle cx="16" cy="16" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="16" cy="8" r="1.6" /><circle cx="8" cy="16" r="1.6" /></svg>
      Al azar
    </button>
    {cuerpo()}
    {conLook && <CombinaLook f={f} excluir={EXCLUIR[k] ?? []} poner={poner} />}
  </>;

  function cuerpo() {
  switch (k) {
    case "pelo": {
      const c = f.identidad.cabello;
      const tapado = pelaTapado(f);
      return <>
        {tapado && (
          <div className="p-aviso" role="status">
            <span>{f.accesorios.cara ? "La máscara" : "El casco"} tapa el pelo. Tu peinado se guarda para cuando lo quites.</span>
            <button type="button" className="p-opcion" onClick={() => { sonar("clic"); poner(ponerMascaraCompleta(ponerCascoSolo(f, null, ""), null, "")); }}>Quitar {f.accesorios.cara ? "máscara" : "casco"}</button>
          </div>
        )}
        <div className={tapado ? "p-tapado" : undefined}>
          <Piezas items={S.pelo.map(p => item(p, (p.id ?? null) === (c?.id ?? null), () => poner(ponerPelo(f, p.id))))} />
          {c && <Colores titulo="Color del pelo" actual={c.color} colores={PELO} elegir={h => poner(colorPelo(f, h))} />}
        </div>
      </>;
    }
    case "casco": {
      const c = f.accesorios.cabeza, m = f.accesorios.cara;
      const cascos = ordenarPorEstilo(S.casco as ItemCat[], estilos), mascaras = ordenarPorEstilo(S.mascara as ItemCat[], estilos);
      const fijo = !!cascos.find(x => x.id === c?.id)?.fijo;
      return <>
        <Piezas titulo="Cascos y gorros" items={cascos.map(p => item(p, p.id ? p.id === c?.id : !c && !m,
          () => poner(p.id ? ponerCascoSolo(f, p.id, p.color ?? "#6c6e68") : ponerMascaraCompleta(ponerCascoSolo(f, null, ""), null, ""))))} />
        {c && !fijo && <Colores titulo="Color del casco" actual={c.color} colores={PALETA} sugeridos={sugeridos} elegir={h => poner(colorCasco(f, h))} />}
        {completo && <Piezas titulo="Máscaras" items={mascaras.map(p => item(p, p.id === m?.id, () => poner(ponerMascaraCompleta(f, p.id === m?.id ? null : p.id, p.color ?? "#c91a09"))))} />}
        {(fijo || m) && <p className="p-nota">Pieza de personaje: va con su color original.</p>}
        {(c || m) && <p className="p-nota">Tapa el pelo; tu peinado se guarda para cuando lo quites.</p>}
      </>;
    }
    case "cabeza": {
      const mascara = f.accesorios.cara?.id ?? null;
      const nombresPiel = Object.fromEntries(catalogo.tonos.map(t => [t.hex, t.nombre]));
      return <>
        <Colores titulo="Tono de piel" actual={f.identidad.piel} colores={catalogo.tonos.map(t => t.hex)} nombres={nombresPiel} elegir={h => poner(ponerPiel(f, h))} />
        <Piezas titulo="Rostro" items={S.rostro.map(p => item(p, !mascara && p.id === f.identidad.rostro, () => poner(ponerRostro(f, p.id!))))} />
        {GRUPOS.map(gr => {
          const lista = S.detalle.filter(p => p.id && enGrupo(p.id, gr.ocupa));
          const nada = !f.identidad.detalles.some(d => enGrupo(d, gr.ocupa));
          const quitar = () => (gr.ocupa === null ? quitarDetalles(quitarDetalles(f, ocupa, null), ocupa, "mejillas") : quitarDetalles(f, ocupa, gr.ocupa));
          return <Piezas key={gr.titulo} titulo={gr.titulo} items={[
            item({ mini: "sin-detalle", nombre: gr.nada }, nada, () => poner(quitar())),
            ...lista.map(p => item(p, f.identidad.detalles.includes(p.id!), () => poner(alternarDetalle(f, p.id, ocupa)))),
          ]} />;
        })}
        <p className="p-nota">Puedes llevar lentes, barba y marcas al mismo tiempo. Pecas y chapitas van una a la vez. Las máscaras están en Casco.</p>
      </>;
    }
    case "cuello": {
      const c = cuelloDe(f), capa = capaDe(f);
      return <>
        <Piezas titulo="Cuello y espalda" items={ordenarPorEstilo(S.cuello as ItemCat[], estilos).map(p => item(p, (p.id ?? null) === (c?.id ?? null), () => {
          setVistaCuello(miraCuello(p.id)); poner(ponerCuello(f, p.id ? { id: p.id, color: c?.color ?? "#6c6e68" } : null));
        }))} />
        {c && <Colores titulo="Color" actual={c.color} colores={PALETA} sugeridos={sugeridos} elegir={h => poner(ponerCuello(f, { ...c, color: h }))} />}
        <Piezas titulo="Capa" items={S.capa.map(p => item(p, (p.id ?? null) === (capa?.id ?? null), () => {
          setVistaCuello("capa"); poner(ponerCapa(f, p.id ? { id: p.id, color: capa?.color ?? "#c91a09" } : null));
        }))} />
        {capa && <Colores titulo="Color de la capa" actual={capa.color} colores={PALETA} sugeridos={sugeridos} elegir={h => { setVistaCuello("capa"); poner(ponerCapa(f, { ...capa, color: h })); }} />}
        <p className="p-nota">La capa y una pieza de cuello o espalda van juntas.</p>
      </>;
    }
    case "torso": {
      const t = f.ropa.torso, torsos = S.torso as ItemCat[];
      const actual = torsos.find(x => (x.id ?? null) === (t.estampado ?? null));
      const fijo = !!actual?.original;
      const pintables = torsos.filter(x => !x.original), trajes = ordenarPorEstilo(torsos.filter(x => x.original), estilos);
      const elegirTorso = (p: ItemCat) => poner(ponerTorsoCompleto(f, p.id, p.original));
      return <>
        <Piezas titulo="Para pintar" items={pintables.map(p => item(p, (p.id ?? null) === (t.estampado ?? null), () => elegirTorso(p)))} />
        {!fijo && <Colores titulo="Color del torso" actual={t.color} colores={PALETA} sugeridos={combinan([f.ropa.piernas.color], PALETA)} elegir={h => poner(colorTorso(f, h))} />}
        {!fijo && completo && t.estampado && [0, 1, 2].map(i => (
          <Colores key={i} titulo={`Color del dibujo ${i + 1}`} actual={t.colores[i]} colores={PALETA} elegir={h => poner(colorEstampado(f, i, h))} />
        ))}
        <Piezas titulo="Trajes" items={trajes.map(p => item(p, p.id === t.estampado, () => elegirTorso(p)))} />
        {fijo && <p className="p-nota">Traje original: va con sus colores, brazos y manos.</p>}
        <p className="p-nota">Al elegir un torso, brazos y manos se ponen a juego. {completo ? "Puedes cambiarlos en Brazos y Manos." : "En Completo puedes pintarlos aparte."}</p>
      </>;
    }
    case "brazos": return <>
      <Lados lado={lado} setLado={setLado} ambos="Ambos brazos" img="print-019" igualar={() => { poner(ponerBrazos(f, "ambos", colorDeLado(f, "brazo", lado)!)); setLado("ambos"); }} />
      <Colores titulo={lado === "ambos" ? "Color de los brazos" : `Brazo ${lado === "izq" ? "izquierdo" : "derecho"}`} actual={colorDeLado(f, "brazo", lado)} colores={PALETA}
        especiales={[{ valor: "torso", nombre: "Como el torso", muestra: f.ropa.torso.color }, { valor: "piel", nombre: "Sin mangas", muestra: f.identidad.piel }]} sugeridos={sugeridos}
        elegir={v => poner(ponerBrazos(f, lado, v))} />
    </>;
    case "manos": return <>
      <Lados lado={lado} setLado={setLado} ambos="Ambas manos" img="sin-objeto" igualar={() => { poner(ponerManos(f, "ambos", colorDeLado(f, "mano", lado)!)); setLado("ambos"); }} />
      <Colores titulo={lado === "ambos" ? "Color de las manos" : `Mano ${lado === "izq" ? "izquierda" : "derecha"}`} actual={colorDeLado(f, "mano", lado)} colores={PALETA}
        especiales={[{ valor: "piel", nombre: "Sin guantes", muestra: f.identidad.piel }]} sugeridos={sugeridos} elegir={v => poner(ponerManos(f, lado, v))} />
    </>;
    case "capa": {
      const c = capaDe(f);
      return <>
        <Piezas items={S.capa.map(p => item(p, (p.id ?? null) === (c?.id ?? null), () => poner(ponerCapa(f, p.id ? { id: p.id, color: c?.color ?? "#c91a09" } : null))))} />
        {c && <Colores titulo="Color de la capa" actual={c.color} colores={PALETA} elegir={h => poner(ponerCapa(f, { ...c, color: h }))} />}
      </>;
    }
    case "cadera": {
      if (f.ropa.piernas.tipo === "cortas") return <p className="p-nota">Con piernas cortas la cadera va pegada a las piernas: cámbiala en Piernas.</p>;
      const cin = f.ropa.cadera.cinturon;
      return <>
        <Colores titulo="Color de la cadera" actual={f.ropa.cadera.color} colores={PALETA} sugeridos={sugeridos} elegir={h => poner(colorCadera(f, h))} />
        <Opciones titulo="Cinturón" ops={[{ nombre: "Sin cinturón", on: !cin, elegir: () => poner(ponerCinturon(f, null)) }, { nombre: "Con cinturón", on: !!cin, elegir: () => poner(ponerCinturon(f, cin?.color ?? "#582a12")) }]} />
        {cin && <Colores titulo="Color del cinturón" actual={cin.color} colores={PALETA} elegir={h => poner(ponerCinturon(f, h))} />}
      </>;
    }
    case "piernas": {
      const p = f.ropa.piernas, conLados = completo && p.tipo === "normal";
      const l = conLados ? lado : "ambos";
      return <>
        <Piezas items={S.piernas.map(x => item(x, (x as { tipo?: string }).tipo === p.tipo, () => poner(tipoPiernas(f, (x as { tipo: "normal" | "cortas" }).tipo))))} />
        {conLados && <Lados lado={lado} setLado={setLado} ambos="Ambas piernas" img="piernas-normal" igualar={() => { poner(colorPiernas(f, "ambos", colorDeLado(f, "pierna", lado)!)); setLado("ambos"); }} />}
        <Colores titulo={l === "ambos" ? (completo ? "Color de las piernas" : "Color de cadera y piernas") : `Pierna ${l === "izq" ? "izquierda" : "derecha"}`}
          actual={colorDeLado(f, "pierna", l)} colores={PALETA} sugeridos={combinan([f.ropa.torso.color], PALETA)} elegir={h => poner(colorPiernas(f, l, h, !completo))} />
        {completo && p.tipo === "normal" && <Colores titulo="Cadera (cintura y entrepierna)" actual={f.ropa.cadera.color} colores={PALETA} sugeridos={sugeridos} elegir={h => poner(colorCadera(f, h))} />}
        {!completo && ladosPersonalizados(f, "pierna") && <p className="p-nota">Tienes una pierna de otro color (hecho en Completo); se conserva.</p>}
      </>;
    }
    case "botas": {
      const b = f.ropa.piernas.botas;
      return <>
        <Piezas items={S.botas.map(x => item(x, !!(x as { botas?: boolean }).botas === !!b, () => poner(ponerBotas(f, (x as { botas?: boolean }).botas ? b ?? "#1b2a34" : null))))} />
        {b && <Colores titulo="Color de las botas" actual={b} colores={PALETA} sugeridos={sugeridos} elegir={h => poner(ponerBotas(f, h))} />}
      </>;
    }
  }
  }
}
