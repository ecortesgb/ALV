// «Crear mi personaje» en página de cómic (rediseño pedido por Elías el 2026-11-26): el orden del «Armario» del Centro de
// Mando GB (secciones con palomita, rejilla, figura con deshacer/rehacer, Restablecer, ¡Guardar!) con el estilo cómic que
// ya tenía (ALV_DISENO_PERSONALIZADOR.md §0, losas .az-losa, ¡Guardar! como .az-jugar). Cada sección es una viñeta con su
// cartela; cambiar de sección voltea la hoja como el libro del personalizador anterior. Cada parte tiene el switch
// Originales (piezas de los personajes, por saga) / Genéricas (piezas de producción, por tipo). Seis secciones: Cabeza,
// Torso, Brazos, Piernas, Accesorios y Movimientos (saludar, ganar, perder, especial; de un personaje o genéricos).
// Va dentro de <RaizDS className="az">. Entrada: la página del HUB se voltea; «Atrás»: se voltea de regreso y luego sale.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as PE } from "react";
import { PALETAS, paletaDePieza, piezasDe, planoConstructor, ponerPieza, teñir, type PiezaCons, type Piezas } from "./constructorDatos";
import { caben, paginas } from "./galeriaDatos";
import { GRUPOS_GENERICAS } from "./genericas";
import { conMovimientos, elegirMovimiento, GESTOS, movimientosElegidos, NOMBRE_GESTO, opcionesMovimiento, type BaseGenerica, type Gesto, type OpcionMov } from "./movimientos";
import type { Catalogo } from "./plano";
import type { FiguraV3, Id, Parte } from "./tipos";
import { RUEDA, RuedaGestos, TrazosGesto } from "../pantallas/gestos/RuedaGestos";
import { useMiniaturas } from "./useMiniaturas";
import { Vista3D } from "./Vista3D";
import "../pantallas/azotea/azotea.css";
import "../pantallas/perfil/perfil.css";
import "../pantallas/lobby/lobby.css";
import "../pantallas/gestos/menu-gestos.css";
import "./constructor.css";

/** Secciones del editor (pedido de Elías, 2026-11-26: orden del «Armario» del Centro de Mando GB, en viñetas de cómic). */
type Pestana = "trajes" | "cabeza" | "torso" | "brazos" | "piernas" | "accesorios" | "movimientos";
type Sub = Parte | Gesto | "traje";
const ARTE = `${import.meta.env.BASE_URL}arte/`;
/** Una url() dentro de una variable CSS se resuelve contra la hoja de estilos (assets/), no contra la página: con la base
 *  "./" de lo publicado se rompía. Se pasa ya absoluta. */
const absoluta = (ruta: string) => new URL(ruta, document.baseURI).href;
const LOSAS: { id: Pestana; titulo: string; cartela: string; c1: string; c2: string; lab: string; ico: string }[] = [
  { id: "trajes", titulo: "Trajes", cartela: "Trajes completos", c1: "#ff8a6b", c2: "#e0392b", lab: "#8f1d14", ico: "ico-armaduras" },
  { id: "cabeza", titulo: "Cabeza", cartela: "Capítulo 1: una cara nueva", c1: "#6fb6ff", c2: "#1f5fd6", lab: "#123e9c", ico: "ico-cabeza" },
  { id: "torso", titulo: "Torso", cartela: "Capítulo 2: el traje", c1: "#c08bff", c2: "#6f2fd6", lab: "#4a1c9c", ico: "ico-torso" },
  { id: "brazos", titulo: "Brazos", cartela: "Capítulo 3: brazos y manos", c1: "#7bea92", c2: "#1fa84a", lab: "#137033", ico: "ico-brazos" },
  { id: "piernas", titulo: "Piernas", cartela: "Capítulo 4: listo para correr", c1: "#ffb866", c2: "#f06a12", lab: "#a8420a", ico: "ico-piernas" },
  { id: "accesorios", titulo: "Accesorios", cartela: "Capítulo 5: el equipo", c1: "#ff8fb3", c2: "#d6246a", lab: "#8c1242", ico: "ico-accesorios" },
  { id: "movimientos", titulo: "Movimientos", cartela: "Capítulo 6: movimientos especiales", c1: "#ffe066", c2: "#e0a400", lab: "#8a6200", ico: "ico-efectos" },
];
const NOMBRE_SUB: Record<string, string> = { traje: "Traje completo", cabeza: "Piel", cara: "Cara", cabello: "Pelo", torso: "Torso", brazos: "Brazos", manos: "Manos", cadera: "Cadera", piernas: "Piernas",
  accesorio: "Capas y objetos", sombrero: "Cascos", ...NOMBRE_GESTO };
const NOMBRE_PALETA = { piel: "Piel", pelo: "Pelo", ropa: "Color" } as const;
/** Sub-partes de cada sección, en el orden en que salen (la cabeza empieza por la cara). */
const SUBPARTES: Record<Pestana, Sub[]> = { trajes: ["traje"], cabeza: ["cara", "cabello", "cabeza"], torso: ["torso"], brazos: ["brazos", "manos"], piernas: ["piernas", "cadera"],
  accesorios: ["accesorio", "sombrero"], movimientos: [...GESTOS] };
const esGesto = (x: Sub): x is Gesto => (GESTOS as readonly string[]).includes(x);
/** Sagas de las piezas originales (ficha.grupo), en el orden de los chips. */
const SAGAS: { id: Id; nombre: string }[] = [
  { id: "avengers", nombre: "Avengers" }, { id: "x-men", nombre: "X-Men" }, { id: "guardianes", nombre: "Guardianes" },
  { id: "villanos-marvel", nombre: "Villanos" }, { id: "otros-marvel", nombre: "Otros Marvel" },
];
/** Gesto del menú de la rueda para cada gesto de la figura (para probarlo al elegirlo). */
const RUEDA_DE: Record<Gesto, string> = { saludo: "saludar", victoria: "victoria", derrota: "derrota", especial: "especial" };
type Fuente = "original" | "generica";
/** Elemento de la rejilla: pieza o movimiento. */
/** Elemento de la rejilla: pieza, movimiento o traje completo (un personaje del catálogo tal cual). */
type Item = { tipo: "pieza"; pz: PiezaCons } | { tipo: "mov"; op: OpcionMov | null } | { tipo: "traje"; id: Id; nombre: string; grupo: Id; foto: string | null };

/** Ícono ilustrado de Elías (arte/ui/personalizar/<id>.webp); mientras no exista, su lugar queda vacío. */
const faltan = new Set<string>();
function IconoLosa({ id }: { id: string }) {
  const [falta, setFalta] = useState(() => faltan.has(id));
  if (falta) return <span className="az-ico pz-ico-vacio" aria-hidden="true" />;
  return <img className="az-ico" src={`${ARTE}ui/personalizar/${id}.webp`} alt="" draggable={false} onError={() => { faltan.add(id); setFalta(true); }} />;
}


export interface ConstructorProps {
  catalogo: Catalogo;
  piezas: Piezas;
  inicial: FiguraV3;
  /** Sección con la que abre («Elegir personaje» abre en Trajes). */
  seccion?: "trajes";
  escenaUrl: string;
  onGuardar: (figura: FiguraV3) => void;
  onSalir?: () => void;
  /** Base genérica (movimientos genéricos); null si la entrega no la trae. */
  base?: BaseGenerica | null;
  /** Imagen de la página que se voltea al entrar y al salir (el HUB). null = sin volteo. */
  paginaAnterior?: string | null;
  /** Estudio de miniaturas de piezas sueltas; null = usar la foto del personaje que dona la pieza. */
  estudioUrl?: string | null;
  /** Grados máximos que el cuerpo se aparta del frente en reposo (0 = como venga el clip). Decidió Codex: 10° (encargo
   *  2026-11-25-constructor-diseno-r5). */
  frente?: number;
}

const sinMovimiento = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const fotoValida = (u: string | null | undefined) => !!u;

export function Constructor({ catalogo, piezas, inicial, seccion, escenaUrl, onGuardar, onSalir, base = null, paginaAnterior = `${ARTE}azotea-pedestal-noche-1920.webp`,
  estudioUrl = escenaUrl.replace(/escena\.html.*$/, "estudio.html"), frente = 10 }: ConstructorProps) {
  const mini = useMiniaturas(estudioUrl, catalogo);
  const [figura, setFigura] = useState(inicial);
  const [historia, setHistoria] = useState<FiguraV3[]>([]);
  const [futuro, setFuturo] = useState<FiguraV3[]>([]);
  const [pestana, setPestana] = useState<Pestana>(seccion ?? "cabeza");
  const [sub, setSub] = useState<Sub>(seccion ? "traje" : "cara");
  /** Switch Originales / Genéricas, recordado por sub-parte. */
  /** Switch Originales / Común: uno para todo el taller (Elías, 2026-11-26). Cambia las piezas que se ofrecen y el fondo:
   *  cómic con las originales, clóset con las comunes. */
  const [modo, setModo] = useState<Fuente>("original");
  const [grupo, setGrupo] = useState<Id>("todas");
  const [pagina, setPagina] = useState(0);
  const [caja, setCaja] = useState({ columnas: 4, filas: 2 });
  const [guardado, setGuardado] = useState(false);
  const [momento, setMomento] = useState<{ cual: string; n: number } | null>(null);
  /** Gesto que se toca en cuanto la escena arme la figura con el movimiento recién elegido. */
  const probar = useRef<string | null>(null);
  /** Firma del último plano que la escena armó bien. Solo se guarda si el plano de ahora es ese (Codex O2). */
  const [confirmada, setConfirmada] = useState<string | null>(null);
  /** Última figura que la escena confirmó; si una pieza no encaja, se vuelve a ella. */
  const valida = useRef<FiguraV3 | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const rejilla = useRef<HTMLDivElement>(null);
  /** Volteo de página: "entra" (el HUB se va), "sale" (el HUB regresa y luego onSalir), null = quieto. */
  const [volteo, setVolteo] = useState<"entra" | "sale" | null>(() => (paginaAnterior && !sinMovimiento() ? "entra" : null));
  /** Vuelta de página al cambiar de sección: hacia adelante o hacia atrás (n cambia para reiniciar la animación). */
  const [hoja, setHoja] = useState<{ dir: "sig" | "ant"; n: number } | null>(null);
  /** La primera figura entra con su saltito; las demás no hacen nada al cambiar una pieza. */
  const [llego, setLlego] = useState(false);
  const salio = useRef(false);
  const salir = () => { if (!onSalir || volteo === "sale") return; if (!paginaAnterior || sinMovimiento()) onSalir(); else setVolteo("sale"); };
  const finVolteo = () => {
    if (volteo === "sale") { if (!salio.current) { salio.current = true; onSalir?.(); } } else setVolteo(null);
  };
  // Si la animación no termina (se canceló o se pidió reducir movimiento a medias), el volteo se cierra igual (Codex O10).
  useEffect(() => { if (!volteo) return; const t = setTimeout(finVolteo, volteo === "entra" ? 1100 : 1000); return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [volteo]);
  useEffect(() => { if (!hoja) return; const t = setTimeout(() => setHoja(null), 800); return () => clearTimeout(t); }, [hoja]);

  useEffect(() => {
    const el = rejilla.current;
    if (!el) return;
    const medir = () => setCaja(caben(el.clientWidth, el.clientHeight, { min: el.clientWidth < 520 ? 70 : 92, proporcion: 1.05, hueco: 8 }));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plano = useMemo(() => { const p = planoConstructor("yo", figura, catalogo, piezas); return p ? conMovimientos(p, figura, catalogo, base) : null; }, [figura, catalogo, piezas, base]);
  const firma = plano ? JSON.stringify(plano) : "";
  const sePuedeGuardar = !!plano && firma === confirmada;
  const gesto = esGesto(sub) ? sub : null;
  const parte = gesto || sub === "traje" ? null : (sub as Parte);
  const movs = useMemo(() => (gesto ? opcionesMovimiento(catalogo, base, gesto, figura.familia) : []), [catalogo, base, gesto, figura.familia]);
  /** Trajes completos originales: cada personaje de la familia, con su foto de tarjeta (pedido de Elías, 2026-11-26). */
  const trajes = useMemo<Item[]>(() => [...catalogo.values()].filter(e => e.ficha.familia === figura.familia)
    .sort((a, b) => a.ficha.nombre.localeCompare(b.ficha.nombre, "es"))
    .map(({ ficha: f, base: carpeta }) => ({ tipo: "traje" as const, id: f.id, nombre: f.nombre, grupo: f.grupo,
      foto: /\.(webp|png|jpg)$/i.test(f.fotos.tarjeta) && !/no-hay/.test(f.fotos.tarjeta) ? new URL(f.fotos.tarjeta, carpeta).href : null })), [catalogo, figura.familia]);
  const todas = useMemo<Item[]>(() => (sub === "traje" ? trajes : parte ? piezasDe(piezas, parte, figura.familia).map(pz => ({ tipo: "pieza" as const, pz })) : movs.map(op => ({ tipo: "mov" as const, op }))),
    [sub, trajes, piezas, parte, figura.familia, movs]);
  const origenDe = (it: Item) => (it.tipo === "traje" ? "original" : it.tipo === "pieza" ? it.pz.origen ?? "original" : it.op?.origen ?? "ninguna");
  const grupoDe = (it: Item) => (it.tipo === "traje" ? it.grupo : it.tipo === "pieza" ? it.pz.grupo ?? "" : it.op?.grupo ?? "");
  const hay = (f: Fuente) => todas.some(it => origenDe(it) === f);
  const fuente: Fuente = modo;
  void hay;
  /** Chips de grupo: sagas (originales) o tipos (genéricas), solo los que tienen algo. */
  const grupos = useMemo(() => {
    const de = todas.filter(it => origenDe(it) === fuente);
    const lista = fuente === "original" ? SAGAS : parte ? GRUPOS_GENERICAS[parte] ?? [] : [];
    return lista.filter(g => de.some(it => grupoDe(it) === g.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todas, fuente, parte]);
  const g = grupos.some(x => x.id === grupo) ? grupo : "todas";
  const ninguno: Item | null = gesto ? { tipo: "mov", op: null } : todas.find(it => origenDe(it) === "ninguna") ?? null;
  const lista = useMemo<Item[]>(() => {
    const l = todas.filter(it => origenDe(it) === fuente && (g === "todas" || grupoDe(it) === g));
    return ninguno ? [ninguno, ...l] : l;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todas, fuente, g, ninguno]);
  const pags = useMemo(() => paginas(lista, caja.columnas * caja.filas), [lista, caja]);
  const p = Math.min(pagina, pags.length - 1);
  const elegidos = movimientosElegidos(figura);
  const puesta = parte ? figura.piezas[parte]?.id ?? null : null;
  const pzPuesta = puesta ? piezas.get(puesta) : undefined;
  const paleta = parte ? paletaDePieza(pzPuesta, parte) : undefined;
  const tinte = parte && paleta ? figura.piezas[parte]?.tintes?.[paleta] ?? null : null;
  const baseId = figura.origen.tipo === "catalogo" ? figura.origen.personaje : null;
  const visible = (it: Item) => it.tipo === "traje" ? it.id === baseId : it.tipo === "pieza" ? it.pz.id === puesta || (!puesta && it.pz.donante === baseId) : (it.op?.id ?? null) === (gesto ? elegidos[gesto] ?? null : null);
  const losa = LOSAS.find(l => l.id === pestana)!;
  /** Palomita de cada sección: algo cambió respecto al personaje base. */
  const hecha = (t: Pestana) => t === "trajes" ? baseId !== (inicial.origen.tipo === "catalogo" ? inicial.origen.personaje : null) : t === "movimientos" ? Object.keys(elegidos).length > 0 : SUBPARTES[t].some(x => !!figura.piezas[x as Parte]);
  // Pide las fotos de las piezas de la página que se ve (las demás, cuando se llegue a ellas).
  useEffect(() => { pags[p]?.forEach(it => { if (it.tipo === "pieza") mini.pedir(it.pz); }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mini.listo, pags, p]);

  const cambiar = (nueva: FiguraV3) => { setHistoria(h => [...h.slice(-29), figura]); setFuturo([]); setFigura(nueva); setGuardado(false); };
  // Respuesta de la escena al plano de la figura actual (las viejas ya las descartó Vista3D). Si una pieza no encaja,
  // se vuelve a la última figura confirmada y se espera a que la escena la confirme otra vez; sin ninguna confirmada,
  // ¡Guardar! queda apagado (Codex O2).
  const alArmar = (ok: boolean, errores: string[]) => {
    setLlego(true);
    if (ok) {
      valida.current = figura; setConfirmada(firma);
      if (probar.current) { const c = probar.current; probar.current = null; setTimeout(() => setMomento(m => ({ cual: c, n: (m?.n ?? 0) + 1 })), 150); }
      return;
    }
    probar.current = null;
    setAviso("Esa pieza no le queda a tu figura.");
    console.warn("pieza rechazada:", errores);
    const v = valida.current;
    if (v && v !== figura) { setFigura(v); setHistoria(h => h.slice(0, -1)); }
  };
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 2600); return () => clearTimeout(t); }, [aviso]);
  // Dirección del último cambio de página de la rejilla, para que entre por ese lado (Codex E5.2).
  const [pasa, setPasa] = useState<"sig" | "ant" | null>(null);
  const [guarda, setGuarda] = useState(false);
  const elegirLosa = (t: Pestana) => {
    if (t === pestana) return;
    const i = LOSAS.findIndex(l => l.id === t), j = LOSAS.findIndex(l => l.id === pestana);
    if (!sinMovimiento()) setHoja(h => ({ dir: i > j ? "sig" : "ant", n: (h?.n ?? 0) + 1 }));
    setPestana(t); setSub(SUBPARTES[t][0]!); setGrupo("todas"); setPagina(0); setPasa(null);
  };
  const elegirSub = (x: Sub) => { setSub(x); setGrupo("todas"); setPagina(0); setPasa(null); };
  const elegirModo = (f: Fuente) => { if (f === modo) return; setModo(f); setGrupo("todas"); setPagina(0); setPasa(null); };
  const elegirGrupo = (x: Id) => { setGrupo(x); setPagina(0); setPasa(null); };
  const deshacer = () => { if (!historia.length) return; setFuturo(f => [figura, ...f].slice(0, 30)); setFigura(historia[historia.length - 1]!); setHistoria(h => h.slice(0, -1)); setGuardado(false); };
  const rehacer = () => { if (!futuro.length) return; setHistoria(h => [...h.slice(-29), figura]); setFigura(futuro[0]!); setFuturo(f => f.slice(1)); setGuardado(false); };
  const restablecer = () => { if (figura !== inicial) cambiar(inicial); };
  const tocarItem = (it: Item) => {
    // Traje completo: el personaje tal cual (sin piezas cambiadas); conserva movimientos y extensiones.
    if (it.tipo === "traje") { if (it.id !== baseId || Object.keys(figura.piezas).length) cambiar({ ...figura, origen: { tipo: "catalogo", personaje: it.id, version: "base", revision: 1 }, piezas: {} }); return; }
    if (it.tipo === "pieza") { cambiar(ponerPieza(figura, it.pz)); return; }
    if (!gesto) return;
    const nueva = elegirMovimiento(figura, gesto, it.op?.id ?? null);
    if (nueva.extensiones.alv?.animaciones?.propias?.[gesto] === elegidos[gesto]) { setMomento(m => ({ cual: RUEDA_DE[gesto], n: (m?.n ?? 0) + 1 })); return; }
    probar.current = RUEDA_DE[gesto];
    cambiar(nueva);
  };
  const gestoRueda = (cual: string) => setMomento(m => ({ cual, n: (m?.n ?? 0) + 1 }));
  // Rueda de gestos al tocar al personaje (reemplaza a los 4 botones). Decidió Codex (encargo 2026-11-26-rueda-gestos-r1):
  // en computadora sale a un lado del toque, hacia donde hay más espacio y sin tapar la cara; en celular, fija en la
  // esquina de abajo a la derecha; siempre a 16 px o más de los bordes de la viñeta.
  const escena = useRef<HTMLDivElement>(null);
  const [rueda, setRueda] = useState<{ x: number; y: number } | null>(null);
  const [pista, setPista] = useState(() => { try { return localStorage.getItem("alv-pista-rueda") !== "vista"; } catch { return true; } });
  const tocar = (nx: number, ny: number) => {
    const e = escena.current, v = e?.querySelector<HTMLElement>(".pz-vista");
    if (!e || !v) return;
    const re = e.getBoundingClientRect(), rv = v.getBoundingClientRect();
    const radio = Math.min(168, Math.max(136, innerWidth * 0.15)) / 2, borde = radio + 16;
    let x: number, y: number;
    if (innerWidth >= 860) {
      x = rv.left - re.left + nx * rv.width + (nx < 0.5 ? 1 : -1) * radio * 1.15;
      y = Math.max(rv.top - re.top + ny * rv.height, rv.top - re.top + rv.height * 0.5); // de la cintura para abajo: libre la cara
    } else { x = re.width - borde; y = rv.bottom - re.top - borde; setCorrer({ x: 0.24, ms: 220 }); } // celular: la figura se hace a la izquierda (Codex r2, C)
    setRueda({ x: Math.max(borde, Math.min(re.width - borde, x)), y: Math.max(borde, Math.min(re.height - borde, y)) });
    if (pista) { setPista(false); try { localStorage.setItem("alv-pista-rueda", "vista"); } catch { /* sin almacenamiento */ } }
  };
  /** Tocar la figura abre la parte tocada (Elías: «seleccionar partes directamente tocando el personaje»). La vista
   *  encuadra la figura de cuerpo entero: arriba la cabeza, al centro el torso (los lados, los brazos), abajo las piernas. */
  const [marca, setMarca] = useState<{ t: Pestana; n: number } | null>(null);
  const tocarParte = (nx: number, ny: number) => {
    if (rueda) { cerrarRueda("fuera"); return; }
    const t: Pestana = ny < 0.4 ? "cabeza" : ny < 0.66 ? (Math.abs(nx - 0.5) > 0.13 ? "brazos" : "torso") : "piernas";
    setMarca(m => ({ t, n: (m?.n ?? 0) + 1 }));
    elegirLosa(t);
    if (pista) { setPista(false); try { localStorage.setItem("alv-pista-rueda", "vista"); } catch { /* sin almacenamiento */ } }
  };
  useEffect(() => { if (!marca) return; const t = setTimeout(() => setMarca(null), 700); return () => clearTimeout(t); }, [marca]);
  /** Acercar a la cara o ver el cuerpo entero (la escena ya sabe enfocar). */
  const [orden, setOrden] = useState<{ n: number; msg: Record<string, unknown> } | null>(null);
  const [cerca, setCerca] = useState(false);
  const enfocar = (cabeza: boolean) => { setCerca(cabeza); setOrden(o => ({ n: (o?.n ?? 0) + 1, msg: { tipo: "enfocar", zona: cabeza ? "cabeza" : "cuerpo" } })); };
  const girar = (cuanto: number) => setGiro(g => ({ n: (g?.n ?? 0) + 1, cuanto }));
  // Celular: mientras la rueda está abierta la cámara corre la figura a la izquierda. Al elegir: late 100 ms, la figura
  // regresa al centro en 180 ms mientras la rueda se cierra, y el gesto empieza cuando ya regresó (Codex r2).
  const [correr, setCorrer] = useState<{ x: number; ms: number } | undefined>(undefined);
  const corrida = useRef(false);
  corrida.current = !!correr && correr.x !== 0;
  const toca = useRef<HTMLDivElement>(null);
  const cerrarRueda = useCallback((motivo?: "elegir" | "tecla" | "fuera") => {
    setRueda(null);
    if (corrida.current) setCorrer({ x: 0, ms: 180 });
    if (motivo === "elegir" || motivo === "tecla") toca.current?.focus({ preventScroll: true }); // el foco vuelve al personaje (Codex)
  }, []);
  // Girar con el teclado: con el personaje enfocado y la rueda cerrada, ← y → (Codex, cierre-r1).
  const [giro, setGiro] = useState<{ n: number; cuanto: number } | null>(null);
  const elegirGesto = (cual: string) => {
    if (corrida.current) { setTimeout(() => setCorrer({ x: 0, ms: 180 }), 100); setTimeout(() => gestoRueda(cual), 280); }
    else setTimeout(() => gestoRueda(cual), 220);
  };
  const teclaFigura = (ev: { key: string; preventDefault: () => void }) => {
    if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); tocar(0.5, 0.45); }
    if (!rueda && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) { ev.preventDefault(); setGiro(g => ({ n: (g?.n ?? 0) + 1, cuanto: ev.key === "ArrowLeft" ? -0.35 : 0.35 })); }
  };

  // Pasar de página deslizando de lado (como el carrusel del lobby).
  const toque = useRef<{ x: number; y: number } | null>(null);
  const bajar = (e: PE) => { toque.current = { x: e.clientX, y: e.clientY }; };
  const subir = (e: PE) => {
    const s = toque.current; toque.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) irA(p + (dx < 0 ? 1 : -1));
  };
  function irA(n: number) { const m = Math.max(0, Math.min(pags.length - 1, n)); if (m === p) return; setPasa(m > p ? "sig" : "ant"); setPagina(m); }

  const pocas = lista.filter(it => (it.tipo === "traje" || (it.tipo === "pieza" ? !!it.pz.glb : !!it.op))).length;
  const indiceSel = lista.filter(it => (it.tipo === "traje" || (it.tipo === "pieza" ? !!it.pz.glb : !!it.op))).findIndex(visible);
  const comun = modo === "generica";

  return (
    <div className={"pz pz-taller" + (comun ? " comun" : " original")}>
      <div className="pz-fondo" aria-hidden="true" />
      <header className="pz-top">
        {onSalir && <button type="button" className="pz-volver" onClick={salir}><span aria-hidden="true">←</span> Volver</button>}
        <h1 className="pz-titulo">Crear mi personaje</h1>
        {/* Switch Originales / Común: distinto a todo lo demás, con perilla que se desliza (Elías, 2026-11-26). */}
        <button type="button" role="switch" aria-checked={comun} className="pz-modo" onClick={() => elegirModo(comun ? "original" : "generica")}
          aria-label={comun ? "Piezas comunes. Toca para usar las originales" : "Piezas originales. Toca para usar las comunes"}>
          <span className="pz-modo-txt izq">Originales</span>
          <span className="pz-modo-txt der">Común</span>
          <span className="pz-modo-perilla" aria-hidden="true">{comun ? "Común" : "Originales"}</span>
        </button>
      </header>

      <nav className="pz-nav" aria-label="Secciones del personaje">
        {LOSAS.map(l => (
          <button key={l.id} type="button" className={"pz-sec" + (pestana === l.id ? " on" : "") + (marca?.t === l.id ? " marca" : "")} aria-pressed={pestana === l.id}
            style={{ "--c1": l.c1, "--c2": l.c2, "--lab": l.lab } as CSSProperties} onClick={() => elegirLosa(l.id)}>
            <IconoLosa id={l.ico} />
            <span className="pz-sec-txt">{l.titulo}</span>
            {hecha(l.id) && <i className="pz-palomita" aria-label="con cambios">✓</i>}
          </button>
        ))}
      </nav>

      <div className="pz-escena" ref={escena}>
        <div className="pz-escena-fondo comic" aria-hidden="true" style={{ "--arte-h": `url(${absoluta(ARTE + "personalizar/comic-accion-horizontal.webp")})`, "--arte-v": `url(${absoluta(ARTE + "personalizar/comic-accion-vertical.webp")})` } as CSSProperties} />
        <div className="pz-escena-fondo closet" aria-hidden="true" style={{ backgroundImage: `url(${ARTE}personalizar/closet.webp)` }} />
        <p className="pz-etiqueta" aria-hidden="true">{comun ? "En el clóset…" : "Mientras tanto, en el vestidor…"}</p>
        <div className="pz-toca" ref={toca} tabIndex={0} role="button" aria-label="Tu personaje: toca una parte para editarla; Enter para los gestos; flechas para girarlo" onKeyDown={teclaFigura}>
          <Vista3D url={escenaUrl + (escenaUrl.includes("?") ? "&" : "?") + ["cerca=1", frente ? "frente=" + frente : ""].filter(Boolean).join("&")} plano={plano} alLlegar={llego ? null : "entrada"} className="pz-vista" momento={momento} onArmado={alArmar} onToque={tocarParte} correr={correr} giro={giro} orden={orden}
            onPresion={() => { if (rueda) cerrarRueda("fuera"); }} />
        </div>
        {pista && !rueda && <p className="pz-pista" aria-hidden="true">Toca una parte para editarla</p>}
        <div className="pz-controles">
          <div className="pz-grupo-ctl">
            <button type="button" onClick={() => girar(-0.5)} aria-label="Girar a la izquierda" title="Girar">⟲</button>
            <button type="button" onClick={() => girar(0.5)} aria-label="Girar a la derecha" title="Girar">⟳</button>
          </div>
          <div className="pz-grupo-ctl">
            <button type="button" onClick={() => enfocar(false)} disabled={!cerca} aria-label="Ver cuerpo entero" title="Alejar">−</button>
            <button type="button" onClick={() => enfocar(true)} disabled={cerca} aria-label="Acercar a la cara" title="Acercar">+</button>
          </div>
          <button type="button" className="pz-gestos" onClick={() => tocar(0.62, 0.6)} aria-label="Probar gestos">★ Gestos</button>
        </div>
        {rueda && <RuedaGestos gestos={RUEDA} x={rueda.x} y={rueda.y} onElegir={elegirGesto} onCerrar={cerrarRueda} />}
        {aviso && <div className="pz-aviso" role="status">{aviso}</div>}
      </div>

      <section className="pz-panel" style={{ "--pj": losa.c2, "--pj1": losa.c1 } as CSSProperties} aria-label={losa.titulo}>
        <header className="pz-cab">
          <IconoLosa id={losa.ico} />
          <div>
            <h2>{losa.titulo}</h2>
            <p>{NOMBRE_SUB[sub]} · {pocas ? (indiceSel >= 0 ? `${indiceSel + 1} de ${pocas}` : `${pocas} ${gesto ? "movimientos" : "piezas"}`) : "nada por ahora"}{comun ? " comunes" : " originales"}</p>
          </div>
        </header>
        {SUBPARTES[pestana].length > 1 && (
          <div className="pz-subs" role="tablist">
            {SUBPARTES[pestana].map(x => <button key={x} type="button" role="tab" className={"pz-sub" + (sub === x ? " on" : "")} aria-selected={sub === x} onClick={() => elegirSub(x)}>{NOMBRE_SUB[x]}</button>)}
          </div>
        )}
        {(grupos.length > 1 || paleta) && (
          <div className="pz-filtros">
            {grupos.length > 1 && (
              <div className="pz-chips" role="group" aria-label={fuente === "original" ? "Sagas" : "Tipos"}>
                {[{ id: "todas", nombre: "Todos" }, ...grupos].map(x => (
                  <button key={x.id} type="button" className={"pz-chip" + (g === x.id ? " on" : "")} aria-pressed={g === x.id} onClick={() => elegirGrupo(x.id)}>{x.nombre}</button>
                ))}
              </div>
            )}
            {paleta && (
              <div className="pz-colores" role="group" aria-label={NOMBRE_PALETA[paleta]}>
                {PALETAS[paleta].map(c => (
                  <button key={c.id} type="button" className={"pz-color" + (tinte === c.id ? " on" : "")} style={{ "--c": c.hex } as CSSProperties} aria-label={c.nombre} aria-pressed={tinte === c.id}
                    title={c.nombre} onClick={() => parte && cambiar(teñir(figura, parte, paleta, c.id))} />
                ))}
              </div>
            )}
          </div>
        )}
        <div className={"pz-rejilla" + (pasa ? " pasa-" + pasa : "")} ref={rejilla} onPointerDown={bajar} onPointerUp={subir}
          style={{ gridTemplateColumns: `repeat(${caja.columnas}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${caja.filas}, minmax(0, 1fr))` }}>
          {(pags[p] ?? []).map(it => {
            const clave = it.tipo === "traje" ? "traje-" + it.id : it.tipo === "pieza" ? it.pz.id : it.op?.id ?? "de-siempre";
            const nombre = it.tipo === "traje" ? it.nombre : it.tipo === "pieza" ? (it.pz.glb ? it.pz.nombre : "Ninguno") : it.op ? it.op.nombre : "De siempre";
            const on = visible(it);
            return (
              <button key={clave} type="button" className={"pz-pieza" + (on ? " on" : "")} aria-pressed={on} onClick={() => tocarItem(it)}
                title={it.tipo === "mov" && it.op ? `${it.op.nombre} · ${it.op.sub}` : nombre}>
                {(() => {
                  if (it.tipo === "traje") return it.foto ? <img src={it.foto} alt="" draggable={false} loading="lazy" /> : <span className="pz-sin" aria-hidden="true">—</span>;
                  if (it.tipo === "mov") {
                    if (it.op?.foto) return <img src={it.op.foto} alt="" draggable={false} loading="lazy" />;
                    return <svg className="pz-mov-ico" viewBox="0 0 24 24" aria-hidden="true"><TrazosGesto cual={gesto ? RUEDA_DE[gesto] : "especial"} /></svg>;
                  }
                  const pz = it.pz;
                  if (!pz.glb) return <span className="pz-sin" aria-hidden="true">—</span>;
                  if (pz.origen === "generica") return fotoValida(pz.foto) ? <img src={pz.foto!} alt="" draggable={false} loading="lazy" /> : <span className="pz-sin" aria-hidden="true">—</span>;
                  const m = mini.foto(pz);
                  if (m) return <img src={m} alt="" draggable={false} />;
                  if (m === undefined) return <span className="pz-espera" aria-hidden="true" />;
                  return pz.foto ? <img src={pz.foto} alt="" draggable={false} loading="lazy" /> : <span className="pz-sin" aria-hidden="true">—</span>;
                })()}
                <span>{nombre}</span>
                {it.tipo === "mov" && it.op && <small className="pz-mov-sub">{it.op.sub}</small>}
                {on && <i className="pz-check" aria-hidden="true">✓</i>}
              </button>
            );
          })}
          {!pocas && (
            <p className="pz-vacio">{comun ? "Pronto: aún no hay piezas comunes de este tipo. Prueba con las originales." : "Todavía no hay piezas de este tipo."}</p>
          )}
        </div>
        {pags.length > 1 && (
          <div className="pz-paginas">
            <button type="button" className="pz-flecha" onClick={() => irA(p - 1)} disabled={p === 0} aria-label="Página anterior"><span className="pz-flecha-t">‹</span></button>
            <span className="pz-puntos" aria-label={`Página ${p + 1} de ${pags.length}`}>{pags.map((_, i) => <i key={i} className={i === p ? "on" : ""} />)}</span>
            <button type="button" className="pz-flecha" onClick={() => irA(p + 1)} disabled={p >= pags.length - 1} aria-label="Página siguiente"><span className="pz-flecha-t">›</span></button>
          </div>
        )}
        {hoja && (
          <div key={hoja.n} className={"pz-hoja-sec " + hoja.dir} aria-hidden="true">
            <div className="pz-hoja-frente" /><div className="pz-hoja-reverso" />
          </div>
        )}
      </section>

      <footer className="pz-pie">
        <button type="button" className="pz-redondo" onClick={deshacer} disabled={!historia.length} aria-label="Deshacer" title="Deshacer">↶</button>
        <button type="button" className="pz-redondo" onClick={rehacer} disabled={!futuro.length} aria-label="Rehacer" title="Rehacer">↷</button>
        <button type="button" className="pz-restablecer" onClick={restablecer} disabled={figura === inicial}>Restablecer</button>
        <button type="button" className={"pz-guardar" + (guarda ? " guarda" : "")} disabled={!sePuedeGuardar} onAnimationEnd={() => setGuarda(false)}
          onClick={() => { if (sePuedeGuardar) { onGuardar(figura); setGuardado(true); setGuarda(true); } }}>
          <span aria-hidden="true">✓</span> {guardado ? "¡Guardado!" : <>Guardar<span className="pz-largo"> personaje</span></>}
        </button>
      </footer>
      {mini.marco}
      {volteo && paginaAnterior && (
        <div className={"pz-volteo " + volteo} aria-hidden="true" onAnimationEnd={finVolteo}>
          <div className="pz-hoja" style={{ backgroundImage: `url(${paginaAnterior})` }} />
        </div>
      )}
    </div>
  );
}
