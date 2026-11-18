// Páginas del libro fuera de Apariencia: Objetos, Momentos, Nombre (apodo de la figura) y Aleatorio.
import { useEffect, useRef, useState } from "react";
import type { MandoFigura } from "../app/figura3d";
import { LARGO_APODO, MOMENTOS_NORMALES, completar, limpiarApodo, ponerApodo, ponerMomentos, ponerObjeto, type Figura, type Paquete } from "../app/editarFigura";
import { useSesion } from "../app/sesion";
import { sonar } from "../app/sonido";
import catalogo from "../content/catalogo-figura.json";
import type { FiguraV2 } from "../content/personaje";
import { miniatura } from "./Libro";

type Pag = "objetos" | "momentos" | "nombre" | "aleatorio";
const PALETA = catalogo.paleta;

export function PaginaExtra({ pag, figura, cambiar, mando }: { pag: Pag; figura: FiguraV2; cambiar: (f: FiguraV2) => void; mando: { current: MandoFigura | null } }) {
  const f = completar(figura);
  const poner = (g: Figura) => cambiar(g as unknown as FiguraV2);
  if (pag === "objetos") return <Objetos f={f} poner={poner} />;
  if (pag === "momentos") return <Momentos f={f} poner={poner} mando={mando} />;
  if (pag === "nombre") return <Nombre f={f} poner={poner} />;
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
    <div className="p-ficha" aria-label="Así se verá">
      <span className="p-ficha-apodo p-sfx">{texto.trim() || "Mi figura"}</span>
      <span className="p-ficha-nombre">{nombre || "Tu nombre"}</span>
    </div>
    <p className="p-nota">El apodo va arriba de tu nombre y es solo de esta figura (cada espacio puede tener el suyo). Tu nombre de jugador no cambia.</p>
  </>;
}

// ---------- Aleatorio: una figura nueva entera, con deshacer ----------
function Aleatorio({ f, poner, mando }: { f: Figura; poner: (g: Figura) => void; mando: { current: MandoFigura | null } }) {
  const antes = useRef<Figura[]>([]);
  const [hay, setHay] = useState(0);
  const [pensando, setPensando] = useState(false);
  const sorprender = async () => {
    if (pensando) return;
    setPensando(true); sonar("exito");
    const g = await mando.current?.pedir("azar", {});
    setPensando(false);
    if (!g) return;
    antes.current = [...antes.current.slice(-9), f]; setHay(antes.current.length);
    // El apodo se conserva: la figura cambia, sigue siendo «tuya».
    poner(ponerApodo(completar(g), f.nombre));
  };
  const deshacer = () => {
    const g = antes.current.pop(); setHay(antes.current.length);
    if (g) { sonar("clic"); poner(g); }
  };
  return <>
    <button type="button" className="p-sorpresa" onClick={sorprender} disabled={pensando}>
      <span className="p-sfx">¡Sorpréndeme!</span>
      <small>Arma una figura completa al azar</small>
    </button>
    <button type="button" className="p-opcion p-deshacer" onClick={deshacer} disabled={!hay}>Deshacer{hay ? ` (${hay})` : ""}</button>
    <p className="p-nota">Cada página de Apariencia tiene su dado «Al azar» para cambiar solo esa parte.</p>
  </>;
}
