// Páginas del libro fuera de Apariencia: Objetos, Momentos, Nombre (apodo de la figura), Aleatorio y Retos.
// Los objetos de personaje (escudo del Capitán) están en «Piezas originales» de Avanzado.
import { useEffect, useRef, useState } from "react";
import { FotoFigura, type MandoFigura } from "../app/figura3d";
import {
  LARGO_APODO, MOMENTOS_NORMALES, completar, conservar, limpiarApodo, limpiarBloqueadas, ponerApodo, ponerMomentos, ponerObjeto, vestirCompleto,
  type Figura, type Paquete, type Parte,
} from "../app/editarFigura";
import { useSesion } from "../app/sesion";
import { sonar } from "../app/sonido";
import catalogo from "../content/catalogo-figura.json";
import type { FiguraV2 } from "../content/personaje";
import { miniatura, type Cambiar } from "./Libro";
import { esOriginal } from "../content/sagas";
import { estilosDe } from "./look";
import { MarcaRareza, infoPieza, pedirDesbloqueo } from "./Desbloqueo";
import { aviso } from "./comun";
import { cumple } from "../app/retos";
import { NOMBRE_RAREZA, RETOS, hoyMexico, rarezaDe, retoDelDia, type Reto } from "../content/rarezas";
import { claveReto, libre, reclamar, usePiezas } from "../servicios/piezas";

type Pag = "objetos" | "momentos" | "nombre" | "aleatorio" | "retos";
const PALETA = catalogo.paleta;

export function PaginaExtra({ pag, figura, cambiar, mando, capsula }: { pag: Pag; figura: FiguraV2; cambiar: Cambiar; mando: { current: MandoFigura | null }; capsula: number }) {
  const f = completar(figura);
  const poner = (g: Figura) => cambiar(g as unknown as FiguraV2);
  // Aleatorio es a propósito: no pregunta (para eso tiene su deshacer y está «Regresar»).
  const azar = (g: Figura) => cambiar(g as unknown as FiguraV2, { sinAviso: true });
  if (pag === "objetos") return <Objetos f={f} poner={poner} />;
  if (pag === "momentos") return <Momentos f={f} poner={poner} mando={mando} />;
  if (pag === "nombre") return <Nombre f={f} poner={poner} />;
  if (pag === "retos") return <Retos f={f} capsula={capsula} />;
  return <Aleatorio f={f} poner={azar} mando={mando} />;
}

// ---------- Objetos: uno en cada mano ----------
function Objetos({ f, poner }: { f: Figura; poner: (g: Figura) => void }) {
  const est = usePiezas();
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
        {catalogo.secciones.objeto.filter(p => !esOriginal(p.id)).map(p => {
          const on = (p.id ?? null) === (actual?.id ?? null), r = est.activo ? rarezaDe(p.id) : "comun", bloq = !libre(p.id, est);
          return (
            <button key={p.mini} type="button" className={"p-pieza r-" + r + (on ? " on" : "") + (bloq ? " bloq" : "")} aria-pressed={on} title={p.nombre}
              onClick={() => { if (bloq) { pedirDesbloqueo(p.id!); return; } sonar("encaje"); poner(ponerObjeto(f, mano, p.id ? { id: p.id, color: (p as { color?: string }).color ?? "#a0a5a9" } : null)); }}>
              <img src={miniatura(p.mini)} alt="" loading="lazy" draggable={false} />
              <MarcaRareza r={r} bloqueada={bloq} />
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
  const est = usePiezas();
  return <>
    <div className="p-momentos">
      {opciones.map(p => {
        const on = p.id === actual, id = p.id ? "MOM_" + p.id : null, r = est.activo ? rarezaDe(id) : "comun", bloq = !libre(id, est);
        return (
          <button key={p.id ?? "normal"} type="button" className={"p-momento r-" + r + (on ? " on" : "") + (bloq ? " bloq" : "")} aria-pressed={on}
            onClick={() => { if (bloq) { pedirDesbloqueo(id!); mando.current?.probar(p.victoria); return; } sonar("clic"); poner(ponerMomentos(f, p)); mando.current?.probar(p.victoria); }}>
            <MarcaRareza r={r} bloqueada={bloq} />
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
    poner(limpiarBloqueadas(conservar(vestirCompleto(f, completar(g)), f, candados), id => libre(id)));
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

// ---------- Retos: el del día y los de combinación; el premio es una pieza (o XP si ya la tenías) ----------
function TarjetaReto({ r, f, capsula, hecho }: { r: Reto; f: Figura; capsula: number; hecho: boolean }) {
  const [ocupado, setOcupado] = useState(false);
  const ok = cumple(f, r.condicion), premio = infoPieza(r.premio), rar = rarezaDe(r.premio);
  const tengo = !libre(r.premio) ? false : rar !== "comun";
  const piezas = r.condicion.todas ?? [];
  const pedir = async () => {
    setOcupado(true);
    const x = await reclamar(r.id, capsula);
    setOcupado(false);
    if (typeof x === "string") { aviso(x); sonar("error"); return; }
    sonar("fanfarria"); aviso(x.pieza ? `¡Ganaste ${infoPieza(x.pieza).nombre}!` : `Ya la tenías: +${x.xp} XP`);
  };
  return (
    <div className={"p-reto" + (hecho ? " hecho" : ok ? " listo" : "")}>
      <div className={"p-reto-premio r-" + rar}>{premio.mini ? <img src={miniatura(premio.mini)} alt="" /> : <span className="p-sfx">¡POW!</span>}</div>
      <div className="p-reto-texto">
        <strong className="p-sfx">{r.nombre}</strong>
        <span>{r.texto}</span>
        {piezas.length > 0 && <small>{piezas.filter(id => [...(f.identidad.detalles ?? [])].includes(id) || JSON.stringify(f).includes(`"${id}"`)).length} de {piezas.length} piezas puestas</small>}
        <small>Premio: {premio.nombre} · {NOMBRE_RAREZA[rar]}{tengo ? " (ya la tienes: +40 XP)" : ""}</small>
      </div>
      {hecho ? <span className="p-reto-sello p-sfx">¡Hecho!</span>
        : <button type="button" className="p-opcion on" disabled={!ok || ocupado} onClick={() => void pedir()}>{ok ? "Reclamar" : "Aún no"}</button>}
    </div>
  );
}

function Retos({ f, capsula }: { f: Figura; capsula: number }) {
  const est = usePiezas();
  const hoy = hoyMexico(), diario = retoDelDia(hoy);
  if (!est.activo) return <p className="p-nota">Los retos se activan cuando el sistema de piezas raras esté encendido en el servidor.</p>;
  return <>
    <p className="p-nota">Los retos revisan la figura de este espacio. Ármala en Apariencia y vuelve a reclamar.</p>
    <section className="p-bloque">
      <h3 className="p-bloque-titulo">Reto de hoy</h3>
      <TarjetaReto r={diario} f={f} capsula={capsula} hecho={est.reclamados.has(claveReto(diario.id, "diario", hoy))} />
    </section>
    <section className="p-bloque">
      <h3 className="p-bloque-titulo">Combinaciones</h3>
      {RETOS.filter(r => r.tipo === "combinacion").map(r => <TarjetaReto key={r.id} r={r} f={f} capsula={capsula} hecho={est.reclamados.has(r.id)} />)}
    </section>
  </>;
}
