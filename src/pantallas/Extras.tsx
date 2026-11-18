// Páginas del libro fuera de Apariencia: Objetos, Momentos, Nombre (apodo de la figura) y Aleatorio.
import { useEffect, useRef, useState } from "react";
import { FotoFigura, type MandoFigura } from "../app/figura3d";
import {
  LARGO_APODO, MOMENTOS_NORMALES, completar, conservar, limpiarApodo, ponerApodo, ponerMomentos, ponerObjeto, vestirCompleto, vestirSoloTraje,
  type Figura, type Paquete, type Parte,
} from "../app/editarFigura";
import { useSesion } from "../app/sesion";
import { sonar } from "../app/sonido";
import catalogo from "../content/catalogo-figura.json";
import type { FiguraV2 } from "../content/personaje";
import { miniatura } from "./Libro";
import { estilosDe } from "./look";

type Pag = "objetos" | "momentos" | "nombre" | "aleatorio" | "trajes";
const PALETA = catalogo.paleta;

export function PaginaExtra({ pag, figura, cambiar, mando }: { pag: Pag; figura: FiguraV2; cambiar: (f: FiguraV2) => void; mando: { current: MandoFigura | null } }) {
  const f = completar(figura);
  const poner = (g: Figura) => cambiar(g as unknown as FiguraV2);
  if (pag === "objetos") return <Objetos f={f} poner={poner} />;
  if (pag === "momentos") return <Momentos f={f} poner={poner} mando={mando} />;
  if (pag === "nombre") return <Nombre f={f} poner={poner} />;
  if (pag === "trajes") return <Trajes f={f} poner={poner} />;
  return <Aleatorio f={f} poner={poner} mando={mando} />;
}

// ---------- Objetos: uno en cada mano ----------
function Objetos({ f, poner }: { f: Figura; poner: (g: Figura) => void }) {
  const [mano, setMano] = useState<"mano_der" | "mano_izq">("mano_der");
  const actual = f.accesorios[mano];
  return <>
    <section className="p-bloque">
      <h3 className="p-bloque-titulo">¿En qué mano?</h3>
      <div className="p-opciones" role="radiogroup" aria-label="Mano">
        {([["mano_der", "Mano derecha"], ["mano_izq", "Mano izquierda"]] as const).map(([m, n]) => (
          <button key={m} type="button" role="radio" aria-checked={mano === m} className={"p-opcion" + (mano === m ? " on" : "")} onClick={() => { sonar("clic"); setMano(m); }}>
            {n}{f.accesorios[m] ? " ✓" : ""}
          </button>
        ))}
      </div>
    </section>
    <section className="p-bloque">
      <div className="p-rejilla">
        {catalogo.secciones.objeto.map(p => {
          const on = (p.id ?? null) === (actual?.id ?? null);
          return (
            <button key={p.mini} type="button" className={"p-pieza" + (on ? " on" : "")} aria-pressed={on} title={p.nombre}
              onClick={() => { sonar("clic"); poner(ponerObjeto(f, mano, p.id ? { id: p.id, color: (p as { color?: string }).color ?? "#a0a5a9" } : null)); }}>
              <img src={miniatura(p.mini)} alt="" loading="lazy" draggable={false} />
              <span>{p.nombre}</span>
            </button>
          );
        })}
      </div>
    </section>
    {actual && (
      <section className="p-bloque">
        <h3 className="p-bloque-titulo">Color del objeto</h3>
        <div className="p-colores" role="radiogroup" aria-label="Color del objeto">
          {PALETA.map(c => (
            <button key={c} type="button" role="radio" aria-checked={actual.color === c} className={"p-color" + (actual.color === c ? " on" : "")} style={{ background: c }}
              aria-label={`Color ${c}`} onClick={() => { sonar("clic"); poner(ponerObjeto(f, mano, { ...actual, color: c })); }} />
          ))}
        </div>
      </section>
    )}
  </>;
}

// ---------- Momentos: cómo espera, anota, gana y pierde ----------
const PROBAR: [keyof Omit<Paquete, "id">, string][] = [["espera", "Esperar"], ["punto", "Anotar"], ["victoria", "Ganar"], ["derrota", "Perder"]];
function Momentos({ f, poner, mando }: { f: Figura; poner: (g: Figura) => void; mando: { current: MandoFigura | null } }) {
  const opciones: (Paquete & { nombre: string })[] = [{ ...MOMENTOS_NORMALES, nombre: "Normal" }, ...catalogo.paquetes];
  const actual = f.momentos.paquete ?? null;
  return <>
    <div className="p-momentos">
      {opciones.map(p => {
        const on = p.id === actual;
        return (
          <button key={p.id ?? "normal"} type="button" className={"p-momento" + (on ? " on" : "")} aria-pressed={on}
            onClick={() => { sonar("clic"); poner(ponerMomentos(f, p)); mando.current?.probar(p.victoria); }}>
            <span className="p-sfx">{p.nombre}</span>
          </button>
        );
      })}
    </div>
    <section className="p-bloque">
      <h3 className="p-bloque-titulo">Ver en la figura</h3>
      <div className="p-opciones">
        {PROBAR.map(([k, n]) => <button key={k} type="button" className="p-opcion" onClick={() => { sonar("clic"); mando.current?.probar(f.momentos[k]); }}>{n}</button>)}
      </div>
    </section>
    <p className="p-nota">Así se mueve tu figura en la sala y en la TV cuando espera, anota un punto, gana o pierde.</p>
  </>;
}

// ---------- Nombre: apodo de la figura; el nombre de la cuenta no cambia ----------
function Nombre({ f, poner }: { f: Figura; poner: (g: Figura) => void }) {
  const { nombre } = useSesion();
  const [texto, setTexto] = useState(f.nombre === "Mi figura" ? "" : f.nombre);
  // Se guarda solo, un momento después de dejar de escribir (y al salir de la página si quedó algo pendiente).
  const ultimo = useRef(texto);
  const vivo = useRef({ texto, f, poner });
  vivo.current = { texto, f, poner };
  useEffect(() => () => { const v = vivo.current; if (v.texto !== ultimo.current) v.poner(ponerApodo(v.f, v.texto)); }, []);
  useEffect(() => {
    if (texto === ultimo.current) return;
    const t = setTimeout(() => { ultimo.current = texto; poner(ponerApodo(f, texto)); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);
  return <>
    <label className="p-bloque p-apodo">
      <span className="p-bloque-titulo">Apodo de esta figura</span>
      <input type="text" value={texto} maxLength={LARGO_APODO} placeholder="Ej.: El Rayo, Doña Fiesta…" autoComplete="off" spellCheck={false}
        onChange={e => setTexto(limpiarApodo(e.target.value))}
        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
    </label>
    <CartaColeccion f={f} apodo={texto.trim() || "Mi figura"} jugador={nombre || "Tu nombre"} />
    <p className="p-nota">El apodo va arriba de tu nombre y es solo de esta figura (cada espacio puede tener el suyo). Tu nombre de jugador no cambia.</p>
  </>;
}

const NOMBRE_ESTILO: Record<string, string> = { heroe: "Superhéroe", medieval: "Medieval", magia: "Magia", espacio: "Espacial", trabajo: "Oficio", ciudad: "Ciudad", aventura: "Aventura", fiesta: "Fiesta" };
/** Carta tipo videojuego: la figura, su apodo, el jugador, su estilo y sus momentos. */
function CartaColeccion({ f, apodo, jugador }: { f: Figura; apodo: string; jugador: string }) {
  const estilo = estilosDe(f)[0];
  const mom = catalogo.paquetes.find(p => p.id === f.momentos.paquete)?.nombre ?? "Normal";
  return (
    <figure className="p-cartacol" aria-label={`Carta de ${apodo}`}>
      <span className="p-cartacol-rayos" aria-hidden="true" />
      <span className="p-cartacol-cinta p-sfx">{estilo ? NOMBRE_ESTILO[estilo] ?? estilo : "Original"}</span>
      <span className="p-cartacol-foto"><FotoFigura figura={f as unknown as FiguraV2} size={130} nombre={apodo} /></span>
      <figcaption>
        <span className="p-cartacol-apodo p-sfx">{apodo}</span>
        <span className="p-cartacol-jugador">{jugador}</span>
        <span className="p-cartacol-dato">Momentos: {mom}</span>
      </figcaption>
    </figure>
  );
}

// ---------- Trajes completos: personajes de la biblioteca y estilos de ALV ----------
type Traje = { id: string; nombre: string; coleccion?: string; mini: string; figura: FiguraV2 };
type DatosTrajes = { colecciones: { id: string; nombre: string }[]; estilos: Traje[]; trajes: Traje[] };
let trajesCargados: DatosTrajes | null = null;
function Trajes({ f, poner }: { f: Figura; poner: (g: Figura) => void }) {
  const [datos, setDatos] = useState<DatosTrajes | null>(trajesCargados);
  // Se cargan solo al abrir esta página (archivo aparte): el resto de la app no pesa más.
  useEffect(() => {
    if (datos) return;
    let vivo = true;
    void import("../content/trajes-figura.json").then(m => { trajesCargados = m.default as unknown as DatosTrajes; if (vivo) setDatos(trajesCargados); });
    return () => { vivo = false; };
  }, [datos]);
  const [col, setCol] = useState("estilos");
  const [elegido, setElegido] = useState<Traje | null>(null);
  const antes = useRef<Figura[]>([]);
  const [hay, setHay] = useState(0);
  if (!datos) return <p className="p-nota">Abriendo el armario…</p>;
  const lista = col === "estilos" ? datos.estilos : datos.trajes.filter(t => t.coleccion === col);
  const vestir = (todo: boolean) => {
    if (!elegido) return;
    antes.current = [...antes.current.slice(-9), f]; setHay(antes.current.length);
    sonar("exito"); poner(todo ? vestirCompleto(f, elegido.figura) : vestirSoloTraje(f, elegido.figura));
  };
  return <>
    <div className="p-opciones p-colecciones" role="tablist" aria-label="Colección">
      {datos.colecciones.map(c => (
        <button key={c.id} type="button" role="tab" aria-selected={col === c.id} className={"p-opcion" + (col === c.id ? " on" : "")}
          onClick={() => { sonar("clic"); setCol(c.id); setElegido(null); }}>{c.nombre}</button>
      ))}
    </div>
    {elegido && (
      <div className="p-vestir" role="group" aria-label={`Ponerte ${elegido.nombre}`}>
        <span className="p-sfx">{elegido.nombre}</span>
        <button type="button" className="p-opcion on" onClick={() => vestir(false)}>Solo el traje<small>tu cara y tu pelo se quedan</small></button>
        <button type="button" className="p-opcion" onClick={() => vestir(true)}>Personaje completo<small>todas sus piezas</small></button>
      </div>
    )}
    <div className="p-rejilla p-rejilla-trajes">
      {lista.map(t => (
        <button key={t.id} type="button" className={"p-pieza" + (elegido?.id === t.id ? " on" : "")} aria-pressed={elegido?.id === t.id} title={t.nombre}
          onClick={() => { sonar("clic"); setElegido(t); }}>
          <img src={miniatura(t.mini)} alt="" loading="lazy" draggable={false} />
          <span>{t.nombre}</span>
        </button>
      ))}
    </div>
    <button type="button" className="p-opcion p-deshacer" onClick={() => { const g = antes.current.pop(); setHay(antes.current.length); if (g) { sonar("clic"); poner(g); } }} disabled={!hay}>
      Deshacer{hay ? ` (${hay})` : ""}
    </button>
    <p className="p-nota">Después puedes retocar cualquier pieza en Apariencia (en Completo, todo).</p>
  </>;
}

// ---------- Aleatorio: una figura nueva entera, con deshacer ----------
function Aleatorio({ f, poner, mando }: { f: Figura; poner: (g: Figura) => void; mando: { current: MandoFigura | null } }) {
  const antes = useRef<Figura[]>([]);
  const [hay, setHay] = useState(0);
  const [pensando, setPensando] = useState(false);
  const [candados, setCandados] = useState<Set<Parte>>(() => new Set());
  const PARTES: [Parte, string][] = [["pelo", "Pelo y casco"], ["cabeza", "Cara y piel"], ["torso", "Torso y brazos"], ["piernas", "Piernas"], ["cuello", "Cuello y capa"], ["objetos", "Objetos"], ["momentos", "Momentos"]];
  const sorprender = async () => {
    if (pensando) return;
    setPensando(true); sonar("exito");
    const g = await mando.current?.pedir("azar", {});
    setPensando(false);
    if (!g) return;
    antes.current = [...antes.current.slice(-9), f]; setHay(antes.current.length);
    // El apodo se conserva (la figura cambia, sigue siendo «tuya») y lo que tiene candado no se toca.
    poner(conservar(vestirCompleto(f, completar(g)), f, candados));
  };
  const deshacer = () => {
    const g = antes.current.pop(); setHay(antes.current.length);
    if (g) { sonar("clic"); poner(g); }
  };
  return <>
    <button type="button" className="p-sorpresa" onClick={sorprender} disabled={pensando}>
      <span className="p-sfx">¡Sorpréndeme!</span>
      <small>{candados.size ? `Cambia todo menos ${candados.size === 1 ? "lo que tiene candado" : `las ${candados.size} partes con candado`}` : "Arma una figura completa al azar"}</small>
    </button>
    <button type="button" className="p-opcion p-deshacer" onClick={deshacer} disabled={!hay}>Deshacer{hay ? ` (${hay})` : ""}</button>
    <section className="p-bloque">
      <h3 className="p-bloque-titulo">Candados</h3>
      <p className="p-nota">Pon candado a lo que te gusta: «¡Sorpréndeme!» cambia todo lo demás.</p>
      <div className="p-opciones">
        {PARTES.map(([k, n]) => {
          const on = candados.has(k);
          return (
            <button key={k} type="button" aria-pressed={on} className={"p-opcion p-candado" + (on ? " on" : "")}
              onClick={() => { sonar("clic"); setCandados(c => { const x = new Set(c); if (x.has(k)) x.delete(k); else x.add(k); return x; }); }}>
              <span aria-hidden="true">{on ? "🔒" : "🔓"}</span> {n}
            </button>
          );
        })}
      </div>
    </section>
    <p className="p-nota">Cada página de Apariencia tiene su dado «Al azar» para cambiar solo esa parte.</p>
  </>;
}
