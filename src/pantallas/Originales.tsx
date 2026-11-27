// Catálogo de personajes: saga → grupo → personaje → versión, como portadas de cómic (sagas.ts).
// - Personaje original («o»): al final, «Ponerme todo» o «Solo el traje».
// - Avanzado, Piezas originales («a»): además, cada parte del personaje se pone sola (su máscara, su torso, su capa…).
// Las figuras de los personajes viven en trajes-figura.json y se cargan solo al abrir el catálogo.
import { useEffect, useState, type CSSProperties } from "react";
import { tomarPartes } from "../app/cambiosFigura";
import { capaDe, completar, cuelloDe, vestirCompleto, vestirSoloTraje, type Figura, type Parte } from "../app/editarFigura";
import { bloqueadasEn } from "../app/retos";
import { sonar } from "../app/sonido";
import type { FiguraV2 } from "../content/personaje";
import { PRECIO, rarezaDe } from "../content/rarezas";
import { SAGAS, listo, versionesListas, type Grupo, type Personaje, type Saga, type Version } from "../content/sagas";
import { desbloquear, libre, piezasAhora, usePiezas } from "../servicios/piezas";
import { aviso } from "./comun";
import { infoPieza } from "./Desbloqueo";
import { miniatura, type Cambiar, type Pagina } from "./Libro";
import { Rayos } from "./TarjetasConfig";

type Donde = "o" | "a";
export type PaginaCatalogo = "original" | "originales" | `${Donde}:${string}`;

type Traje = { id: string; nombre: string; mini: string; figura: FiguraV2 };
let cargados: Map<string, Traje> | null = null;
function useTrajes() {
  const [t, setT] = useState(cargados);
  useEffect(() => {
    if (t) return;
    let vivo = true;
    void import("../content/trajes-figura.json").then(m => {
      cargados = new Map((m.default.trajes as unknown as Traje[]).map(x => [x.id, x]));
      if (vivo) setT(cargados);
    });
    return () => { vivo = false; };
  }, [t]);
  return t;
}

// ---------- Rutas dentro del catálogo ----------
const buscar = (sid?: string, gid?: string, pid?: string) => {
  const saga = SAGAS.find(s => s.id === sid), grupo = saga?.grupos.find(g => g.id === gid), pj = grupo?.personajes.find(p => p.id === pid);
  return { saga, grupo, pj };
};
function leer(pag: PaginaCatalogo): { donde: Donde; nivel: "sagas" | "saga" | "grupo" | "pj"; saga?: Saga; grupo?: Grupo; pj?: Personaje } {
  if (pag === "original") return { donde: "o", nivel: "sagas" };
  if (pag === "originales") return { donde: "a", nivel: "sagas" };
  const [donde, nivel, ruta = ""] = pag.split(":") as [Donde, "saga" | "grupo" | "pj", string];
  const [sid, gid, pid] = ruta.split("/");
  return { donde, nivel, ...buscar(sid, gid, pid) };
}
export function tituloOriginal(pag: PaginaCatalogo): string {
  const x = leer(pag);
  if (x.nivel === "sagas") return x.donde === "o" ? "Personaje original" : "Piezas originales";
  return (x.nivel === "pj" ? x.pj?.nombre : x.nivel === "grupo" ? x.grupo?.nombre : x.saga?.nombre) ?? "Personajes";
}
const abrirSaga = (d: Donde, s: Saga): Pagina => (s.grupos.length === 1 ? `${d}:grupo:${s.id}/${s.grupos[0]!.id}` : `${d}:saga:${s.id}`);

// ---------- Portadas ----------
const miniDe = (t: Map<string, Traje>, v?: Version) => (v?.traje ? t.get(v.traje)?.mini : undefined);

function Portada({ titulo, color, minis, sub, onClick, pronto }: { titulo: string; color: string; minis: (string | undefined)[]; sub?: string; onClick?: () => void; pronto?: boolean }) {
  const ms = minis.filter((m): m is string => !!m).slice(0, 3);
  return (
    <button type="button" className={"p-portada" + (pronto ? " pronto" : "")} style={{ "--tc": color } as CSSProperties} onClick={onClick} disabled={!onClick} aria-label={titulo + (pronto ? ", próximamente" : "")}>
      <span className="p-portada-arte" aria-hidden="true">
        <Rayos color={color} />
        {ms.length ? <span className="p-portada-figuras">{ms.map(m => <img key={m} src={miniatura(m)} alt="" loading="lazy" draggable={false} />)}</span>
          : <span className="p-portada-silueta">?</span>}
      </span>
      <span className="p-portada-num dsp" aria-hidden="true">#1</span>
      <span className="p-portada-titulo dsp">{titulo}</span>
      {sub && <span className="p-portada-sub">{sub}</span>}
      {pronto && <span className="p-portada-pronto dsp">Próximamente</span>}
    </button>
  );
}

// ---------- Página ----------
export function PaginaOriginal({ pag, figura, cambiar, ir }: { pag: PaginaCatalogo; figura: FiguraV2; cambiar: Cambiar; ir: (p: Pagina) => void }) {
  const t = useTrajes();
  const x = leer(pag);
  if (!t) return <p className="p-nota">Abriendo el armario…</p>;
  const d = x.donde;
  if (x.nivel === "sagas") return <>
    {d === "a" && <p className="p-nota">Toma piezas sueltas de un personaje: su máscara, su torso, su capa… El resto de tu figura se queda.</p>}
    <div className="p-portadas">
      {SAGAS.map(s => {
        const pjs = s.grupos.flatMap(g => g.personajes);
        const hay = pjs.some(p => versionesListas(p).length);
        return <Portada key={s.id} titulo={s.nombre} color={s.color} sub={`${pjs.length} personajes`} pronto={!hay}
          minis={pjs.map(p => miniDe(t, versionesListas(p)[0]))} onClick={hay ? () => ir(abrirSaga(d, s)) : undefined} />;
      })}
    </div>
  </>;
  if (!x.saga) return <p className="p-nota">No encontré esa saga.</p>;
  const saga = x.saga;
  if (x.nivel === "saga") return (
    <div className="p-portadas">
      {saga.grupos.map(g => <Portada key={g.id} titulo={g.nombre} color={saga.color} sub={`${g.personajes.length} personajes`}
        minis={g.personajes.map(p => miniDe(t, versionesListas(p)[0]))} onClick={() => ir(`${d}:grupo:${saga.id}/${g.id}`)} />)}
    </div>
  );
  if (!x.grupo) return <p className="p-nota">No encontré ese grupo.</p>;
  const grupo = x.grupo;
  if (x.nivel === "grupo") return (
    <div className="p-portadas p-portadas-pj">
      {grupo.personajes.map(p => {
        const lista = versionesListas(p);
        return <Portada key={p.id} titulo={p.nombre} color={saga.color} minis={[miniDe(t, lista[0])]} pronto={!lista.length}
          sub={p.versiones.length > 1 ? `${p.versiones.length} versiones` : undefined}
          onClick={lista.length ? () => ir(`${d}:pj:${saga.id}/${grupo.id}/${p.id}`) : undefined} />;
      })}
    </div>
  );
  if (!x.pj) return <p className="p-nota">No encontré ese personaje.</p>;
  return <FichaPersonaje key={x.pj.id} pj={x.pj} color={saga.color} t={t} donde={d} figura={figura} cambiar={cambiar} />;
}

// Partes que se toman sueltas en Avanzado (las mismas de «¡Sorpréndeme!»).
const PARTES: { k: Parte; nombre: string; de: (g: Figura) => string | null }[] = [
  { k: "pelo", nombre: "Cabeza: pelo, casco o máscara", de: g => g.accesorios.cara?.id ?? g.accesorios.cabeza?.id ?? g.identidad.cabello?.id ?? null },
  { k: "cabeza", nombre: "Cara y piel", de: g => g.identidad.rostro },
  { k: "torso", nombre: "Torso, brazos y manos", de: g => g.ropa.torso.estampado ?? "liso" },
  { k: "piernas", nombre: "Cadera y piernas", de: () => "piernas" },
  { k: "cuello", nombre: "Cuello y capa", de: g => capaDe(g)?.id ?? cuelloDe(g)?.id ?? null },
  { k: "objetos", nombre: "Objetos", de: g => g.accesorios.mano_der?.id ?? g.accesorios.mano_izq?.id ?? null },
  { k: "momentos", nombre: "Momentos (poses)", de: g => (g.momentos.paquete ? "MOM_" + g.momentos.paquete : null) },
];
const nombrePieza = (v: string | null) => (v == null ? null : v === "liso" ? "Liso" : v === "piernas" ? "Sus colores" : infoPieza(v).nombre.replace(/^Momentos: /, ""));

function FichaPersonaje({ pj, color, t, donde, figura, cambiar }: { pj: Personaje; color: string; t: Map<string, Traje>; donde: Donde; figura: FiguraV2; cambiar: Cambiar }) {
  const lista = versionesListas(pj);
  const [vid, setVid] = useState(lista[0]?.id);
  const [ocupado, setOcupado] = useState(false);
  const est = usePiezas();
  const v = pj.versiones.find(x => x.id === vid) ?? lista[0];
  const traje = v?.traje ? t.get(v.traje) : undefined;
  const f = completar(figura);
  const faltan = (g: Figura) => (est.activo ? bloqueadasEn(g, est.tengo).filter(id => !libre(id, est)) : []);
  /** Pone el resultado; si trae piezas bloqueadas (con nube), primero las desbloquea con XP. */
  const poner = async (g: Figura) => {
    if (ocupado) return;
    const fx = faltan(g);
    if (fx.length) {
      const total = fx.reduce((n, id) => n + PRECIO[rarezaDe(id)], 0);
      if (piezasAhora().xp < total) { aviso(`Te faltan ${fx.length} piezas (${total} XP). Tienes ${piezasAhora().xp} XP.`); sonar("error"); return; }
      setOcupado(true);
      for (const id of fx) { const e = await desbloquear(id); if (e) { setOcupado(false); aviso(e); return; } }
      setOcupado(false); sonar("fanfarria");
    }
    sonar("exito"); cambiar(g as unknown as FiguraV2);
  };
  const candado = (g: Figura) => { const n = faltan(g).length; return n ? ` · 🔒 ${n}` : ""; };
  return <>
    {pj.versiones.length > 1 && (
      <section className="p-bloque">
        <h3 className="p-bloque-titulo">Versiones</h3>
        <div className="p-variantes" role="radiogroup" aria-label={`Versiones de ${pj.nombre}`}>
          {pj.versiones.map((x, i) => {
            const ok = listo(x), on = x.id === v?.id, m = miniDe(t, x);
            return (
              <button key={x.id} type="button" role="radio" aria-checked={on} disabled={!ok} className={"p-variante" + (on ? " on" : "") + (ok ? "" : " pronto")}
                style={{ "--tc": color, "--i": i - (pj.versiones.length - 1) / 2 } as CSSProperties} onClick={() => { sonar("clic"); setVid(x.id); }}>
                <span className="p-variante-arte">{m ? <img src={miniatura(m)} alt="" draggable={false} /> : <span className="p-portada-silueta">?</span>}</span>
                <span className="p-variante-nombre dsp">{x.nombre}</span>
                {!ok && <small>Próximamente</small>}
              </button>
            );
          })}
        </div>
      </section>
    )}
    {traje && <>
      {pj.versiones.length === 1 && <div className="p-ficha-arte" style={{ "--tc": color } as CSSProperties}><Rayos color={color} /><img src={miniatura(traje.mini)} alt="" draggable={false} /></div>}
      <div className="p-vestir" role="group" aria-label={`Ponerte ${pj.nombre}`}>
        <button type="button" className="p-opcion on" disabled={ocupado} onClick={() => void poner(vestirCompleto(f, traje.figura))}>
          Ponerme todo<small>con su cara y su pelo{candado(vestirCompleto(f, traje.figura))}</small>
        </button>
        <button type="button" className="p-opcion" disabled={ocupado} onClick={() => void poner(vestirSoloTraje(f, traje.figura))}>
          Solo el traje<small>tu cara y tu pelo se quedan{candado(vestirSoloTraje(f, traje.figura))}</small>
        </button>
      </div>
      {donde === "a" && (
        <section className="p-bloque">
          <h3 className="p-bloque-titulo">Piezas sueltas</h3>
          <div className="p-sueltas">
            {PARTES.map(p => {
              const pieza = nombrePieza(p.de(completar(traje.figura)));
              const g = tomarPartes(f, traje.figura, [p.k]);
              return (
                <button key={p.k} type="button" className="p-suelta" disabled={ocupado} onClick={() => void poner(g)}>
                  <span>{p.nombre}</span><small>{pieza ?? "Nada"}{candado(g)}</small>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </>}
    <p className="p-nota">Antes de cambiar algo te pregunto, y con «Regresar» deshaces el último paso.</p>
  </>;
}
