// «Crear mi personaje» en página de cómic (rediseño pedido por Elías el 2026-11-26): el orden del «Armario» del Centro de
// Mando GB (secciones con palomita, rejilla, figura con deshacer/rehacer, Restablecer, ¡Guardar!) con el estilo cómic que
// ya tenía (ALV_DISENO_PERSONALIZADOR.md §0, losas .az-losa, ¡Guardar! como .az-jugar). Cada sección es una viñeta con su
// cartela; cambiar de sección voltea la hoja como el libro del personalizador anterior. Cada parte tiene el switch
// Originales (piezas de los personajes, por saga) / Genéricas (piezas de producción, por tipo). Seis secciones: Cabeza,
// Torso, Brazos, Piernas, Accesorios y Movimientos (saludar, ganar, perder, especial; de un personaje o genéricos).
// Va dentro de <RaizDS className="az">. Entrada: la página del HUB se voltea; «Atrás»: se voltea de regreso y luego sale.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as PE } from "react";
import { caraDeMascara, esMascara, PALETAS, paletaDePieza, piezasDe, planoConstructor, ponerPiel, ponerPieza, quitarTinte, teñir, type Color, type PiezaCons, type Piezas } from "./constructorDatos";
import { DONANTES_FUERA, VERSION_MINIFIG } from "./cabezas";
import { caben, nombreSaga, paginas, tarjetas, type Tarjeta } from "./galeriaDatos";
import { GRUPOS_GENERICAS } from "./genericas";
import { esOtros, grupoMostrado, juntarVersiones, nombreBase } from "./agrupar";
import { conMovimientos, elegirMovimiento, GESTOS, movimientosElegidos, NOMBRE_GESTO, opcionesMovimiento, type BaseGenerica, type Gesto, type OpcionMov } from "./movimientos";
import type { Catalogo } from "./plano";
import type { FiguraV3, Id, Parte } from "./tipos";
import { TrazosGesto } from "../pantallas/gestos/RuedaGestos";
import { RuedaAnimaciones, type Accion } from "../pantallas/gestos/RuedaFigura";
import { useMiniaturas } from "./useMiniaturas";
import { Vista3D } from "./Vista3D";
import { CartaPersonaje, LOGOS, logo, temaDe } from "../pantallas/CartaPersonaje";
import "../pantallas/azotea/azotea.css";
import "../pantallas/perfil/perfil.css";
import "../pantallas/lobby/lobby.css";
import "../pantallas/gestos/menu-gestos.css";
import "./constructor.css";

/** Secciones del editor (pedido de Elías, 2026-11-26: orden del «Armario» del Centro de Mando GB, en viñetas de cómic). */
type Pestana = "trajes" | "cabeza" | "torso" | "brazos" | "piernas" | "accesorios" | "movimientos" | "transformacion";
type Sub = Parte | Gesto | "traje" | "mascara" | "transformacion";
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
  // Elías (27 nov): cualquiera se puede transformar en cualquier personaje del catálogo con «Transformar» de la rueda.
  { id: "transformacion", titulo: "Transformación", cartela: "Capítulo 7: tu otra forma", c1: "#c77dff", c2: "#7b2cbf", lab: "#4a1680", ico: "ico-transformacion" },
];
const NOMBRE_SUB: Record<string, string> = { traje: "Traje completo", cabeza: "Piel", cara: "Cara", mascara: "Máscaras", cabello: "Pelo", torso: "Torso", brazos: "Brazos", manos: "Manos", cadera: "Cadera", piernas: "Piernas",
  accesorio: "Capas y objetos", sombrero: "Cascos", transformacion: "Se convierte en", ...NOMBRE_GESTO };
const NOMBRE_PALETA = { piel: "Piel", pelo: "Pelo", ropa: "Color" } as const;
/** Sub-partes de cada sección, en el orden en que salen (la cabeza: piel, cara, máscaras y pelo). */
const SUBPARTES: Record<Pestana, Sub[]> = { trajes: ["traje"], cabeza: ["cabeza", "cara", "mascara", "cabello"], torso: ["torso"], brazos: ["brazos", "manos"], piernas: ["piernas", "cadera"],
  accesorios: ["accesorio", "sombrero"], movimientos: [...GESTOS], transformacion: ["transformacion"] };
const esGesto = (x: Sub): x is Gesto => (GESTOS as readonly string[]).includes(x);
/** Sagas de las piezas originales (ficha.grupo), en el orden de los chips. */
/** Sagas (primer nivel del filtro de originales) y sus grupos (segundo nivel), en este orden. Lo que no esté aquí sale
 *  con su id legible al final (Elías, 2026-11-26: «Marvel y dentro Avengers, X-Men…; habrá Harry Potter, Star Wars»). */
const SAGAS: { id: Id; nombre: string }[] = [
  { id: "marvel", nombre: "Marvel" }, { id: "dc", nombre: "DC" }, { id: "star-wars", nombre: "Star Wars" }, { id: "harry-potter", nombre: "Harry Potter" },
  { id: "disney", nombre: "Disney" }, { id: "simpsons", nombre: "Los Simpson" }, { id: "looney-tunes", nombre: "Looney Tunes" },
  { id: "muppets", nombre: "Los Muppets" }, { id: "plaza-sesamo", nombre: "Plaza Sésamo" }, { id: "hora-de-aventura", nombre: "Hora de Aventura" },
  { id: "chicas-superpoderosas", nombre: "Las Chicas Superpoderosas" },
];
const GRUPOS: { id: Id; nombre: string }[] = [
  { id: "avengers", nombre: "Avengers" }, { id: "x-men", nombre: "X-Men" }, { id: "guardianes", nombre: "Guardianes" },
  { id: "villanos-marvel", nombre: "Villanos" }, { id: "cuatro-fantasticos", nombre: "Los 4 Fantásticos" }, { id: "otros-marvel", nombre: "Otros" },
  { id: "batman", nombre: "Batman" }, { id: "liga-justicia", nombre: "Liga de la Justicia" },
  { id: "increibles", nombre: "Los Increíbles" },
];
/** Secciones que el Álbum separa aparte de `ficha.grupo` (Los 4 Fantásticos; en DC, Batman y la Liga de la Justicia). */
const SECCIONES_ALBUM = new Set(["cuatro-fantasticos", "batman", "liga-justicia"]);
/** Botón de saga o grupo con su logo (los mismos del Álbum de la tienda; Elías, 2026-11-27). Sin logo, el nombre. */
const conLogo = (id: Id) => !!LOGOS[id];
function NombreSeccion({ id, nombre }: { id: Id; nombre: string }) {
  const archivo = id === "guardianes" ? "guardianes-plata" : id === "villanos-marvel" ? "villanos" : id;
  return LOGOS[id] ? <img src={logo(archivo)} alt={nombre} draggable={false} /> : <>{nombre}</>;
}
/** Ordena los ids según una lista conocida (los desconocidos al final, por nombre). */
function ordenar(ids: Iterable<Id>, conocidos: { id: Id; nombre: string }[]): { id: Id; nombre: string }[] {
  const pos = (id: Id) => { const i = conocidos.findIndex(c => c.id === id); return esOtros(id) ? 1000 : i < 0 ? 999 : i; };
  return [...new Set(ids)].filter(Boolean).map(id => ({ id, nombre: conocidos.find(c => c.id === id)?.nombre ?? (esOtros(id) ? "Otros" : nombreSaga(id)) }))
    .sort((a, b) => pos(a.id) - pos(b.id) || a.nombre.localeCompare(b.nombre, "es"));
}
/** Gesto del menú de la rueda para cada gesto de la figura (para probarlo al elegirlo). */
const RUEDA_DE: Record<Gesto, string> = { saludo: "saludar", victoria: "victoria", derrota: "derrota", especial: "especial" };
type Fuente = "original" | "generica";
/** Elemento de la rejilla: pieza o movimiento. */
/** Elemento de la rejilla: pieza, movimiento o traje completo (un personaje del catálogo tal cual). */
/** Un traje con varias versiones del mismo personaje sale una vez; al tocarlo se abren sus versiones (Elías, 2026-11-27). */
type Item = { tipo: "pieza"; pz: PiezaCons } | { tipo: "mov"; op: OpcionMov | null } | { tipo: "volver" } | { tipo: "color"; c: Color | null }
  | { tipo: "traje"; id: Id; nombre: string; grupo: Id; foto: string | null; base?: string; versiones?: Id[] };

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
  puedeUsar?: (id: string) => boolean;
}

const sinMovimiento = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Quita los movimientos elegidos cuando la figura cambia de familia (los de una grande no le sirven a una minifigura). */
function sinMovimientosSi(si: boolean, f: FiguraV3): FiguraV3 {
  const alv = f.extensiones.alv;
  if (!si || !alv?.animaciones?.propias) return f;
  return { ...f, extensiones: { ...f.extensiones, alv: { ...alv, animaciones: { ...alv.animaciones, propias: {} } } } };
}
const fotoValida = (u: string | null | undefined) => !!u;

export function Constructor({ catalogo, piezas, inicial, seccion, escenaUrl, onGuardar, onSalir, base = null, paginaAnterior = `${ARTE}azotea-pedestal-noche-1920.webp`,
  estudioUrl = escenaUrl.replace(/escena\.html.*$/, "estudio.html"), frente = 10, puedeUsar }: ConstructorProps) {
  const mini = useMiniaturas(estudioUrl, catalogo);
  const [figura, setFigura] = useState(inicial);
  const [historia, setHistoria] = useState<FiguraV3[]>([]);
  const [futuro, setFuturo] = useState<FiguraV3[]>([]);
  const [pestana, setPestana] = useState<Pestana>(seccion ?? "cabeza");
  const [sub, setSub] = useState<Sub>(seccion ? "traje" : "cabeza");
  /** Switch Originales / Genéricas, recordado por sub-parte. */
  /** Switch Originales / Común: uno para todo el taller (Elías, 2026-11-26). Cambia las piezas que se ofrecen y el fondo:
   *  cómic con las originales, clóset con las comunes. */
  const [modo, setModo] = useState<Fuente>("original");
  const [abierto, setAbierto] = useState<string | null>(null); // personaje con sus versiones abiertas en Trajes
  const [grupo, setGrupo] = useState<Id>("todas");
  const [saga, setSaga] = useState<Id>("todas");
  const [pagina, setPagina] = useState(0);
  const [cajas, setCajas] = useState({ piezas: { columnas: 4, filas: 2 }, cartas: { columnas: 4, filas: 2 } });
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
  /** La primera figura entra con su saltito; las demás no hacen nada al cambiar una pieza. */
  const [llego, setLlego] = useState(false);
  const salio = useRef(false);
  const salirYa = () => { if (!onSalir || volteo === "sale") return; if (!paginaAnterior || sinMovimiento()) onSalir(); else setVolteo("sale"); };
  /** Salir con cambios sin guardar pide confirmación (Elías, 2026-11-27). */
  const [ultimaGuardada, setUltimaGuardada] = useState(inicial);
  const [confirmarSalir, setConfirmarSalir] = useState(false);
  const salir = () => { if (JSON.stringify(figura) !== JSON.stringify(ultimaGuardada)) setConfirmarSalir(true); else salirYa(); };
  const finVolteo = () => {
    if (volteo === "sale") { if (!salio.current) { salio.current = true; onSalir?.(); } } else setVolteo(null);
  };
  // Si la animación no termina (se canceló o se pidió reducir movimiento a medias), el volteo se cierra igual (Codex O10).
  useEffect(() => { if (!volteo) return; const t = setTimeout(finVolteo, volteo === "entra" ? 900 : 750); return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [volteo]);

  useEffect(() => {
    const el = rejilla.current;
    if (!el) return;
    // Los trajes van en carta (5:7, más alta): caben menos, para que el nombre se lea.
    const medir = () => setCajas({ piezas: caben(el.clientWidth, el.clientHeight, { min: el.clientWidth < 520 ? 92 : 128, proporcion: 1.05, hueco: 8 }),
      cartas: caben(el.clientWidth, el.clientHeight, { min: innerWidth < 700 ? 78 : 100, proporcion: 1.4, hueco: 8 }) });
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plano = useMemo(() => { const p = planoConstructor("yo", figura, catalogo, piezas); return p ? conMovimientos(p, figura, catalogo, base) : null; }, [figura, catalogo, piezas, base]);
  const firma = plano ? JSON.stringify(plano) : "";
  const sePuedeGuardar = !!plano && firma === confirmada;
  const gesto = esGesto(sub) ? sub : null;
  const parte = gesto || sub === "traje" || sub === "transformacion" ? null : sub === "mascara" ? "cabeza" : (sub as Parte);
  /** Figura grande: se usa tal cual. Si tiene versión minifigura (Hulk → Bruce Banner), sus piezas son las de esa versión
   *  y al elegir una la figura pasa a ser esa (Elías, 2026-11-27). */
  const idBase = figura.origen.tipo === "catalogo" ? figura.origen.personaje : null;
  const grande = figura.familia !== "minifig";
  const pareja = grande && idBase ? VERSION_MINIFIG[idBase] ?? null : null;
  const familiaPiezas = grande && pareja ? "minifig" : figura.familia;
  const bloqueada = grande && !pareja && sub !== "traje" && sub !== "transformacion";
  const movs = useMemo(() => (gesto ? opcionesMovimiento(catalogo, base, gesto, figura.familia) : []), [catalogo, base, gesto, figura.familia]);
  /** Trajes completos originales: cada personaje de la familia, con su foto de tarjeta (pedido de Elías, 2026-11-26). */
  const trajes = useMemo<Item[]>(() => [...catalogo.values()].filter(e => (e.ficha.familia === "minifig" || e.ficha.familia === "bigfig") && !DONANTES_FUERA.has(e.ficha.id))
    .sort((a, b) => a.ficha.nombre.localeCompare(b.ficha.nombre, "es"))
    .map(({ ficha: f, base: carpeta }) => ({ tipo: "traje" as const, id: f.id, nombre: f.nombre, grupo: f.grupo,
      foto: /\.(webp|png|jpg)$/i.test(f.fotos.tarjeta) && !/no-hay/.test(f.fotos.tarjeta) ? new URL(f.fotos.tarjeta, carpeta).href : null })), [catalogo]);
  /** Carta de cada personaje (el mismo diseño del Álbum de la tienda; Elías, 2026-11-27). */
  const cartas = useMemo(() => new Map<Id, Tarjeta>(tarjetas(catalogo, { conBorradores: true }).map(t => [t.id, t])), [catalogo]);
  /** Trajes a mostrar: uno por personaje (con sus versiones) o, con uno abierto, sus versiones y «Volver». */
  const vistaTrajes = useMemo<Item[]>(() => {
    const solo = trajes as Extract<Item, { tipo: "traje" }>[];
    if (abierto) { const vs = solo.filter(t => nombreBase(t.nombre) === abierto); if (vs.length > 1) return [{ tipo: "volver" }, ...vs.map(v => ({ ...v, nombre: /\(([^)]*)\)\s*$/.exec(v.nombre)?.[1] ?? v.nombre }))]; }
    return juntarVersiones(solo, t => t.nombre).map(j => (j.versiones.length > 1 ? { ...j.rep, nombre: j.base, base: j.base, versiones: j.versiones.map(v => v.id) } : j.rep));
  }, [trajes, abierto]);
  const todas = useMemo<Item[]>(() => {
    if (sub === "traje" || sub === "transformacion") return vistaTrajes;
    if (bloqueada) return [];
    // Piel: solo el color de una cabeza lisa (Elías, 2026-11-27); las máscaras van en su propia pestaña.
    if (sub === "cabeza") return [{ tipo: "color" as const, c: null }, ...PALETAS.piel.map(c => ({ tipo: "color" as const, c }))];
    if (parte) return piezasDe(piezas, parte, familiaPiezas).filter(pz => (sub === "mascara" ? esMascara(pz) : !caraDeMascara(pz))).map(pz => ({ tipo: "pieza" as const, pz }));
    return movs.map(op => ({ tipo: "mov" as const, op }));
  }, [sub, vistaTrajes, piezas, parte, familiaPiezas, movs, bloqueada]);
  const origenDe = (it: Item) => (it.tipo === "traje" || it.tipo === "volver" ? "original" : it.tipo === "pieza" ? it.pz.origen ?? "original" : it.tipo === "mov" ? it.op?.origen ?? "ninguna" : "ninguna");
  const grupoCrudo = (it: Item) => {
    const g0 = it.tipo === "traje" ? it.grupo : it.tipo === "pieza" ? it.pz.grupo ?? "" : it.tipo === "mov" ? it.op?.grupo ?? "" : "";
    if (origenDe(it) !== "original") return g0;
    // Mismas secciones que el Álbum de la tienda (Elías, 2026-11-27: «te faltan 4 fantásticos…»).
    const id = it.tipo === "traje" ? it.id : it.tipo === "pieza" ? it.pz.donante : it.tipo === "mov" ? /^p:([^:]+):/.exec(it.op?.id ?? "")?.[1] : undefined;
    const t = id ? cartas.get(id) : undefined;
    if (t?.saga === "otros") return t.grupo; // saga chica: su nombre es el grupo dentro de «Otros»
    const tema = t ? temaDe(t) : "";
    return SECCIONES_ALBUM.has(tema) ? tema : g0;
  };
  /** Saga del personaje de donde sale el elemento (traje, pieza original o movimiento original). */
  const sagaDe = (it: Item): Id => {
    const id = it.tipo === "traje" ? it.id : it.tipo === "pieza" ? it.pz.donante : it.tipo === "mov" && it.op?.origen === "original" ? /^p:([^:]+):/.exec(it.op.id)?.[1] : undefined;
    return (id && (cartas.get(id)?.saga ?? catalogo.get(id)?.ficha.saga)) || "";
  };
  /** Grupos de 3 o menos se juntan en «Otros» de su saga (Elías, 2026-11-27); las comunes conservan su tipo. */
  const grupoDe = useMemo(() => {
    const orig = grupoMostrado(todas.filter(it => origenDe(it) === "original"), sagaDe, grupoCrudo);
    return (it: Item) => (origenDe(it) === "original" ? orig(it) : grupoCrudo(it));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todas, catalogo]);
  const fuente: Fuente = modo;
  const originales = fuente === "original";
  /** Primer nivel (solo originales): las sagas que tienen algo aquí. */
  const sagas = useMemo(() => (originales ? ordenar(todas.filter(it => origenDe(it) === "original").map(sagaDe), SAGAS) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todas, originales]);
  const sg = sagas.some(x => x.id === saga) ? saga : "todas";
  /** Segundo nivel: grupos de la saga elegida (originales) o tipos (comunes), solo los que tienen algo. */
  const grupos = useMemo(() => {
    const de = todas.filter(it => origenDe(it) === fuente && (!originales || sg === "todas" || sagaDe(it) === sg));
    if (originales) return sg === "todas" ? [] : ordenar(de.map(grupoDe), GRUPOS);
    return (parte ? GRUPOS_GENERICAS[parte] ?? [] : []).filter(x => de.some(it => grupoDe(it) === x.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todas, fuente, parte, sg, grupoDe]);
  const g = grupos.some(x => x.id === grupo) ? grupo : "todas";
  /** ¿Es de un personaje que aún no tiene? (un traje con versiones, si no tiene ninguna). */
  const porConseguir = (it: Item) => {
    if (!puedeUsar || sub === "transformacion") return false; // Elías (27 nov): cualquiera del catálogo, aunque no lo tenga
    if (it.tipo === "traje") return it.versiones ? it.versiones.every(v => !puedeUsar(v)) : !puedeUsar(it.id);
    return it.tipo === "pieza" && it.pz.origen === "original" && !!it.pz.donante && !puedeUsar(it.pz.donante);
  };
  const ninguno: Item | null = gesto ? { tipo: "mov", op: null } : todas.find(it => origenDe(it) === "ninguna") ?? null;
  const lista = useMemo<Item[]>(() => {
    if (todas[0]?.tipo === "volver" || todas[0]?.tipo === "color") return todas; // versiones de un personaje o colores de piel: sin filtros
    const l = todas.filter(it => origenDe(it) === fuente && (!originales || sg === "todas" || sagaDe(it) === sg) && (g === "todas" || grupoDe(it) === g));
    // Lo que ya tiene va primero y lo bloqueado al final (Elías, 2026-11-27: «para que sea más fácil elegirlos»).
    const orden = [...l.filter(it => !porConseguir(it)), ...l.filter(porConseguir)];
    return ninguno ? [ninguno, ...orden] : orden;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todas, fuente, sg, g, ninguno, grupoDe, puedeUsar]);
  const caja = sub === "traje" || sub === "transformacion" ? cajas.cartas : cajas.piezas;
  const pags = useMemo(() => paginas(lista, caja.columnas * caja.filas), [lista, caja]);
  const p = Math.min(pagina, pags.length - 1);
  const elegidos = movimientosElegidos(figura);
  const puesta = parte ? figura.piezas[parte]?.id ?? null : null;
  const pzPuesta = puesta ? piezas.get(puesta) : undefined;
  const paleta = parte && sub !== "cabeza" && pzPuesta?.origen === "generica" ? paletaDePieza(pzPuesta, parte) : undefined; // las originales ya traen su color
  const tinte = parte && paleta ? figura.piezas[parte]?.tintes?.[paleta] ?? null : null;
  const baseId = figura.origen.tipo === "catalogo" ? figura.origen.personaje : null;
  const piel = figura.piezas.cabeza?.tintes?.piel ?? null;
  const otraForma = figura.extensiones.alv?.transformacion ?? null;
  const visible = (it: Item) => it.tipo === "volver" ? false : sub === "transformacion" ? it.tipo === "traje" && (it.versiones ? !!otraForma && it.versiones.includes(otraForma) : it.id === otraForma) : it.tipo === "color" ? (it.c?.id ?? null) === piel && !esMascara(piezas.get(figura.piezas.cabeza?.id ?? "")) : it.tipo === "traje" ? (it.versiones ? !!baseId && it.versiones.includes(baseId) : it.id === baseId) : it.tipo === "pieza" ? it.pz.id === puesta || (!puesta && it.pz.donante === baseId) : (it.op?.id ?? null) === (gesto ? elegidos[gesto] ?? null : null);
  const bloqueado = (it: Item) => porConseguir(it) && !visible(it);
  const losa = LOSAS.find(l => l.id === pestana)!;
  /** Palomita de cada sección: algo cambió respecto al personaje base. */
  const hecha = (t: Pestana) => t === "transformacion" ? !!otraForma : t === "trajes" ? baseId !== (inicial.origen.tipo === "catalogo" ? inicial.origen.personaje : null) : t === "movimientos" ? Object.keys(elegidos).length > 0 : SUBPARTES[t].some(x => !!figura.piezas[x as Parte]);
  // Pide las fotos de las piezas de la página que se ve (las demás, cuando se llegue a ellas).
  useEffect(() => { pags[p]?.forEach(it => { if (it.tipo === "pieza") mini.pedir(it.pz); }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mini.listo, pags, p]);
  // Con el estudio listo, adelanta poco a poco las fotos de la primera página de cada parte (Elías: «tarda mucho en cargar
  // cada elemento al cambiar de sección»). Va después de la página que se ve y una a la vez, para no tapar al estudio.
  useEffect(() => {
    if (!mini.listo) return;
    const n = Math.max(8, cajas.piezas.columnas * cajas.piezas.filas);
    const cola = (Object.values(SUBPARTES).flat().filter(x => !esGesto(x) && x !== "traje" && x !== "transformacion") as Parte[])
      .filter(pt => pt !== "mascara" && pt !== "cabeza")
      .flatMap(pt => piezasDe(piezas, pt, familiaPiezas).filter(pz => pz.origen !== "generica" && pz.glb).slice(0, n));
    let i = 0;
    const t = setInterval(() => { const pz = cola[i++]; if (!pz) { clearInterval(t); return; } mini.pedir(pz); }, 180);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mini.listo, piezas, familiaPiezas]);

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
    setPestana(t); setSub(SUBPARTES[t][0]!); setGrupo("todas"); setPagina(0); setPasa(null); setAbierto(null);
  };
  const elegirSub = (x: Sub) => { setSub(x); setGrupo("todas"); setPagina(0); setPasa(null); setAbierto(null); };
  const elegirModo = (f: Fuente) => { if (f === modo) return; setModo(f); setGrupo("todas"); setPagina(0); setPasa(null); setAbierto(null); };
  const elegirSaga = (x: Id) => { setSaga(x); setGrupo("todas"); setPagina(0); setPasa(null); setAbierto(null); };
  const elegirGrupo = (x: Id) => { setGrupo(x); setPagina(0); setPasa(null); setAbierto(null); };
  const deshacer = () => { if (!historia.length) return; setFuturo(f => [figura, ...f].slice(0, 30)); setFigura(historia[historia.length - 1]!); setHistoria(h => h.slice(0, -1)); setGuardado(false); };
  const rehacer = () => { if (!futuro.length) return; setHistoria(h => [...h.slice(-29), figura]); setFigura(futuro[0]!); setFuturo(f => f.slice(1)); setGuardado(false); };
  const restablecer = () => { if (figura !== inicial) cambiar(inicial); };
  const tocarItem = (it: Item) => {
    if (bloqueado(it)) { setAviso("Consigue este personaje en la tienda para usarlo."); return; }
    // Traje completo: el personaje tal cual (sin piezas cambiadas); conserva movimientos y extensiones.
    if (it.tipo === "volver") { setAbierto(null); setPagina(0); setPasa(null); return; }
    // Figura grande con versión minifigura: al cambiar una pieza o la piel pasa a ser esa versión.
    const comoMini = () => (pareja ? sinMovimientosSi(true, { ...figura, familia: "minifig", origen: { tipo: "catalogo" as const, personaje: pareja, version: "base", revision: 1 }, piezas: {} }) : figura);
    if (it.tipo === "color") { cambiar(ponerPiel(comoMini(), it.c?.id ?? null, piezas)); return; }
    if (it.tipo === "traje" && it.versiones && it.base) { setAbierto(it.base); setPagina(0); setPasa(null); return; }
    // Transformación: tocar a uno lo elige; tocar al elegido lo quita. La figura del jugador no cambia.
    if (it.tipo === "traje" && sub === "transformacion") {
      const alv = { ...figura.extensiones.alv };
      if (otraForma === it.id || it.id === baseId) delete alv.transformacion; else alv.transformacion = it.id;
      cambiar({ ...figura, extensiones: { ...figura.extensiones, alv } });
      setAviso(alv.transformacion ? `Con «Transformar» de la rueda te conviertes en ${it.nombre}.` : "Sin transformación elegida.");
      return;
    }
    if (it.tipo === "traje") {
      if (it.id === baseId && !Object.keys(figura.piezas).length) return;
      // La familia la pone el traje (Hulkbuster → minifigura ya no deja la figura como grande). Si cambia de familia,
      // los movimientos elegidos dejan de servir y se vuelve a los de siempre.
      const familia = catalogo.get(it.id)?.ficha.familia ?? figura.familia;
      cambiar(sinMovimientosSi(familia !== figura.familia, { ...figura, familia, origen: { tipo: "catalogo", personaje: it.id, version: "base", revision: 1 }, piezas: {} }));
      return;
    }
    if (it.tipo === "pieza") {
      cambiar(ponerPieza(comoMini(), it.pz, piezas)); return;
    }
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
  // Círculo fijo: se mide contra la vista (arriba a la derecha de la cabeza) al cargar y al cambiar el tamaño.
  const [fijo, setFijo] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const medir = () => {
      const e = escena.current, v = e?.querySelector<HTMLElement>(".pz-vista");
      if (!e || !v) return;
      const re = e.getBoundingClientRect(), rv = v.getBoundingClientRect();
      // Mismo tamaño que .pz-escena .rg-fija en constructor.css.
      const radio = Math.min(140, Math.max(92, innerWidth * 0.13)) / 2, borde = radio + 10;
      // Esquina de arriba a la derecha de la viñeta (el rótulo va a la izquierda). La figura se queda al centro (Elías,
      // 2026-11-27: «que el personaje quede en medio, no se mueva hacia la izquierda»).
      const x = Math.min(re.width, rv.right - re.left) - borde;
      const y = Math.max(rv.top - re.top, 0) + borde;
      setFijo({ x: Math.max(borde, x), y: Math.min(re.height - borde, y) });
    };
    medir(); const t = setTimeout(medir, 600);
    addEventListener("resize", medir);
    return () => { clearTimeout(t); removeEventListener("resize", medir); };
  }, []);
  const puente = useMemo(() => ({ extensiones: { alv: { v3: figura } } }), [figura]);
  const accionRueda = (a: Accion) => {
    if (a.tipo === "gesto") gestoRueda(a.cual);
    else if (a.tipo === "poder" && plano) setOrden(o => ({ n: (o?.n ?? 0) + 1, msg: { tipo: "poder", id: plano.id, poder: a.id } }));
  };
  const nada = useCallback(() => {}, []);
  const teclaFigura = (ev: { key: string; preventDefault: () => void }) => {
    if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); tocarParte(0.5, 0.5); }
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

  const pocas = lista.filter(it => (it.tipo === "traje" || it.tipo === "color" || (it.tipo === "pieza" ? !!it.pz.glb : it.tipo === "mov" && !!it.op))).length;
  const indiceSel = lista.filter(it => (it.tipo === "traje" || (it.tipo === "pieza" ? !!it.pz.glb : it.tipo === "mov" && !!it.op))).findIndex(visible);
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
            <span className="pz-sec-txt" style={{ "--n": l.titulo.length } as CSSProperties}>{l.titulo}</span>
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
        </div>
        {/* Círculo de animaciones fijo arriba a la derecha, a la altura de la cabeza (Elías, 27 nov: tocar la figura ya
            abre la parte para editarla). */}
        {fijo && <RuedaAnimaciones figura={puente} jugador="yo" x={fijo.x} y={fijo.y} fija sinTransformar onAccion={accionRueda} onCerrar={nada} />}
        {aviso && <div className="pz-aviso" role="status">{aviso}</div>}
      </div>

      <section className="pz-panel" style={{ "--pj": losa.c2, "--pj1": losa.c1 } as CSSProperties} aria-label={losa.titulo}>
        <header className="pz-cab">
          <IconoLosa id={losa.ico} />
          <div>
            <h2>{losa.titulo}</h2>
            <p>{NOMBRE_SUB[sub]} · {pocas ? (indiceSel >= 0 ? `${indiceSel + 1} de ${pocas}` : `${pocas} ${gesto ? "movimientos" : sub === "cabeza" ? "colores" : sub === "traje" || sub === "transformacion" ? "personajes" : "piezas"}`) : "nada por ahora"}{comun ? " comunes" : " originales"}</p>
          </div>
        </header>
        {SUBPARTES[pestana].length > 1 && (
          <div className="pz-subs" role="tablist">
            {SUBPARTES[pestana].map(x => <button key={x} type="button" role="tab" className={"pz-sub" + (sub === x ? " on" : "")} aria-selected={sub === x} onClick={() => elegirSub(x)}>{NOMBRE_SUB[x]}</button>)}
          </div>
        )}
        {todas[0]?.tipo !== "volver" && todas[0]?.tipo !== "color" && (sagas.length > 0 || grupos.length > 1 || paleta) && (
          <div className="pz-filtros">
            {sagas.length > 0 && (
              <div className="pz-chips pz-sagas" role="group" aria-label="Sagas">
                {[{ id: "todas", nombre: "Todas" }, ...sagas].map(x => (
                  <button key={x.id} type="button" className={"pz-chip" + (conLogo(x.id) ? " pz-chip-logo" : "") + (sg === x.id ? " on" : "")} aria-pressed={sg === x.id} onClick={() => elegirSaga(x.id)}><NombreSeccion id={x.id} nombre={x.nombre} /></button>
                ))}
              </div>
            )}
            {grupos.length > 1 && (
              <div className="pz-chips" role="group" aria-label={originales ? "Grupos" : "Tipos"}>
                {[{ id: "todas", nombre: "Todos" }, ...grupos].map(x => (
                  <button key={x.id} type="button" className={"pz-chip" + (originales && conLogo(x.id) ? " pz-chip-logo" : "") + (g === x.id ? " on" : "")} aria-pressed={g === x.id} onClick={() => elegirGrupo(x.id)}>{originales ? <NombreSeccion id={x.id} nombre={x.nombre} /> : x.nombre}</button>
                ))}
              </div>
            )}
            {paleta && (
              <div className="pz-colores" role="group" aria-label={NOMBRE_PALETA[paleta]}>
                <button type="button" className={"pz-color pz-color-original" + (tinte ? "" : " on")} aria-label="Color original" aria-pressed={!tinte}
                  title="Color original" onClick={() => parte && cambiar(quitarTinte(figura, parte, paleta))} />
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
            const clave = it.tipo === "volver" ? "volver" : it.tipo === "traje" ? "traje-" + it.id + (it.versiones ? "-v" : "") : it.tipo === "pieza" ? it.pz.id : it.tipo === "color" ? "color-" + (it.c?.id ?? "original") : it.op?.id ?? "de-siempre";
            const nombre = it.tipo === "volver" ? "Volver" : it.tipo === "traje" ? it.nombre : it.tipo === "pieza" ? (it.pz.glb ? it.pz.nombre : "Ninguno") : it.tipo === "color" ? it.c?.nombre ?? "Original" : it.op ? it.op.nombre : "De siempre";
            const on = visible(it);
            return (
              <button key={clave} type="button" className={"pz-pieza" + (on ? " on" : "") + (it.tipo === "traje" && cartas.has(it.id) ? " pz-carta" : "")} aria-pressed={on} onClick={() => tocarItem(it)}
                data-bloqueado={bloqueado(it) || undefined}
                title={it.tipo === "mov" && it.op ? `${it.op.nombre} · ${it.op.sub}` : nombre}>
                {(() => {
                  if (it.tipo === "volver") return <span className="pz-sin pz-volver" aria-hidden="true">‹</span>;
                  if (it.tipo === "traje" && cartas.has(it.id)) return <CartaPersonaje tarjeta={{ ...cartas.get(it.id)!, nombre: it.nombre }} conseguida={!porConseguir(it)} />;
                  if (it.tipo === "traje") return it.foto ? <img src={it.foto} alt="" draggable={false} loading="lazy" /> : <span className="pz-sin" aria-hidden="true">—</span>;
                  if (it.tipo === "mov") {
                    if (it.op?.foto) return <img src={it.op.foto} alt="" draggable={false} loading="lazy" />;
                    return <svg className="pz-mov-ico" viewBox="0 0 24 24" aria-hidden="true"><TrazosGesto cual={gesto ? RUEDA_DE[gesto] : "especial"} /></svg>;
                  }
                  if (it.tipo === "color") return <span className={"pz-color-muestra" + (it.c ? "" : " original")} style={{ "--c": it.c?.hex } as CSSProperties} aria-hidden="true" />;
                  const pz = it.pz;
                  if (!pz.glb) return <span className="pz-sin" aria-hidden="true">—</span>;
                  if (pz.origen === "generica") return fotoValida(pz.foto) ? <img src={pz.foto!} alt="" draggable={false} loading="lazy" /> : <span className="pz-sin" aria-hidden="true">—</span>;
                  const m = mini.foto(pz);
                  if (m) return <img src={m} alt="" draggable={false} />;
                  // Solo la pieza, nunca la foto del personaje completo (Elías, 2026-11-27).
                  if (m === undefined) return <span className="pz-espera" aria-hidden="true" />;
                  return <span className="pz-sin" aria-hidden="true">—</span>;
                })()}
                {!(it.tipo === "traje" && cartas.has(it.id)) && <span>{nombre}</span>}
                {it.tipo === "mov" && it.op && <small className="pz-mov-sub">{it.op.sub}</small>}
                {it.tipo === "traje" && it.versiones && <small className="pz-mov-sub">{it.versiones.length} versiones</small>}
                {on && <i className="pz-check" aria-hidden="true">✓</i>}
                {bloqueado(it) && <i className="pz-candado" aria-label="Por conseguir">🔒</i>}
              </button>
            );
          })}
          {!pocas && (
            <p className="pz-vacio">{bloqueada ? "Las figuras grandes se usan tal cual: para cambiar piezas elige un traje de minifigura." : comun ? "Pronto: aún no hay piezas comunes de este tipo. Prueba con las originales." : "Todavía no hay piezas de este tipo."}</p>
          )}
        </div>
        {pags.length > 1 && (
          <div className="pz-paginas">
            <button type="button" className="pz-flecha" onClick={() => irA(p - 1)} disabled={p === 0} aria-label="Página anterior"><span className="pz-flecha-t">‹</span></button>
            <span className="pz-puntos" aria-label={`Página ${p + 1} de ${pags.length}`}>{pags.map((_, i) => <i key={i} className={i === p ? "on" : ""} />)}</span>
            <button type="button" className="pz-flecha" onClick={() => irA(p + 1)} disabled={p >= pags.length - 1} aria-label="Página siguiente"><span className="pz-flecha-t">›</span></button>
          </div>
        )}
      </section>

      <footer className="pz-pie">
        <button type="button" className="pz-redondo" onClick={deshacer} disabled={!historia.length} aria-label="Deshacer" title="Deshacer">↶</button>
        <button type="button" className="pz-redondo" onClick={rehacer} disabled={!futuro.length} aria-label="Rehacer" title="Rehacer">↷</button>
        <button type="button" className="pz-restablecer" onClick={restablecer} disabled={figura === inicial}>Restablecer</button>
        <button type="button" className={"pz-guardar" + (guarda ? " guarda" : "")} disabled={!sePuedeGuardar} onAnimationEnd={() => setGuarda(false)}
          onClick={() => { if (sePuedeGuardar) { onGuardar(figura); setUltimaGuardada(figura); setGuardado(true); setGuarda(true); } }}>
          <span aria-hidden="true">✓</span> {guardado ? "¡Guardado!" : <>Guardar<span className="pz-largo"> personaje</span></>}
        </button>
      </footer>
      {confirmarSalir && (
        <div className="pz-confirma" role="dialog" aria-modal="true" aria-labelledby="pz-confirma-t" onClick={e => { if (e.target === e.currentTarget) setConfirmarSalir(false); }}>
          <div className="pz-confirma-caja">
            <h3 id="pz-confirma-t">¿Salir sin guardar?</h3>
            <p>Tus cambios a este personaje no se han guardado.</p>
            <div className="pz-confirma-botones">
              {sePuedeGuardar && <button type="button" className="pz-guardar" onClick={() => { onGuardar(figura); setUltimaGuardada(figura); setConfirmarSalir(false); salirYa(); }}>Guardar y salir</button>}
              <button type="button" className="pz-restablecer" onClick={() => { setConfirmarSalir(false); salirYa(); }}>Salir sin guardar</button>
              <button type="button" className="pz-restablecer" onClick={() => setConfirmarSalir(false)} autoFocus>Seguir editando</button>
            </div>
          </div>
        </div>
      )}
      {mini.marco}
      {volteo && paginaAnterior && (
        <div className={"pz-volteo " + volteo} aria-hidden="true" onAnimationEnd={finVolteo}>
          <div className="pz-hoja" style={{ backgroundImage: `url(${ARTE}personalizar/comic-accion-${innerWidth >= 860 ? "horizontal" : "vertical"}.webp)` }} />
        </div>
      )}
    </div>
  );
}
