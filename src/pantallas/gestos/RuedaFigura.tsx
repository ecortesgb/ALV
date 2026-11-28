// Rueda de gestos al tocar tu figura en el HUB, el Perfil, el lobby y la mesa (la misma del constructor, RuedaGestos.tsx).
// Pide el gesto a la tienda global como el menú de botones: «Especial» toca el movimiento especial que elegiste.
// Va en una capa fija porque la figura del HUB puede estar anclada al pedestal (position: fixed).
import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { pedirGesto, type Gesto } from "../../app/animaciones";
import { sonar } from "../../app/sonido";
import { tocarVoz } from "../../app/musica";
import { prepararVoz, urlObjeto, vozDe } from "../../app/temas";
import type { FiguraV2 } from "../../content/personaje";
import { BOTON_VOLVER, GAJO_TRANSFORMAR, RuedaGestos, gajosCategorias, gajosOpciones } from "./RuedaGestos";
import { conForma, seTransforma, transformar, useVersionFormas } from "../../app/formas";
import { pedirPoder } from "../../app/poderes";
import { movimientosDe, poderesDe, useCatalogoV3 } from "../../personajes/integracion";
import { armarRueda, pagina, type Categoria } from "./categorias";

/** Aviso de primera vez: se queda hasta que abras la rueda una vez en este aparato (Elías, 26 nov). */
const VISTA = "alv-pista-rueda-juego";
const pistaVista = () => { try { return localStorage.getItem(VISTA) === "vista"; } catch { return false; } };
const marcarVista = () => { try { localStorage.setItem(VISTA, "vista"); } catch { /* sin almacenamiento */ } };

export interface MandoRueda {
  /** Abre la rueda junto al punto tocado (coordenadas de la ventana). */
  abrir(x: number, y: number): void;
}

export const RuedaFigura = forwardRef<MandoRueda, { jugador: string; figura?: FiguraV2 | null;
  /** Selector de lo que se toca (tu figura): el aviso de primera vez sale sobre su parte de abajo. Sin él, no hay aviso. */
  pistaSobre?: string }>(function RuedaFigura({ jugador, figura, pistaSobre }, mando) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [pista, setPista] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!pistaSobre || pistaVista()) return;
    const medir = () => {
      // Ya abrió la rueda: el aviso no vuelve (antes la siguiente medida lo volvía a poner).
      if (pistaVista()) { setPista(null); return; }
      const r = document.querySelector(pistaSobre)?.getBoundingClientRect();
      setPista(r && r.width > 20 && r.height > 20 ? { x: Math.max(130, Math.min(innerWidth - 130, r.left + r.width / 2)), y: r.top + r.height * 0.72 } : null);
    };
    // Se mide otra vez un rato: la figura del HUB se acomoda en el pedestal cuando su escena carga.
    const t0 = setTimeout(medir, 1200), t1 = setInterval(medir, 1500);
    addEventListener("resize", medir);
    return () => { clearTimeout(t0); clearInterval(t1); removeEventListener("resize", medir); };
  }, [pistaSobre]);
  // Voz del personaje al hacer «Especial» (temas.ts, Elías 27 nov): se baja antes para que suene al instante.
  useEffect(() => { prepararVoz(figura, "especial"); }, [figura]);
  // El toque que cierra la rueda por fuera también suelta sobre la figura: sin esto se volvería a abrir.
  const cerro = useRef(0);

  useImperativeHandle(mando, () => ({
    abrir(x, y) {
      if (performance.now() - cerro.current < 350) return;
      const radio = Math.min(216, Math.max(184, innerWidth * 0.19)) / 2, borde = radio + 16;
      // Computadora: a un lado de la figura, hacia donde hay más espacio, sin taparla. Celular: no cabe al lado; se pega
      // al borde derecho (o izquierdo si tocaste a la derecha) a la altura del toque y tapa solo media figura.
      const ancho = innerWidth >= 860, haciaDerecha = x < innerWidth / 2;
      const cx = ancho ? x + (haciaDerecha ? 1 : -1) * (radio + 80) : haciaDerecha ? innerWidth - borde : borde;
      const cy = y;
      setPos({ x: Math.max(borde, Math.min(innerWidth - borde, cx)), y: Math.max(borde, Math.min(innerHeight - borde, cy)) });
      sonar("clic");
      setPista(null); marcarVista();
    },
  }), []);

  const accion = (a: Accion) => {
    if (a.tipo === "transformar") { sonar(transformar(jugador, figura) ? "poder" : "tic"); return; }
    if (a.tipo === "poder") { sonar(pedirPoder(jugador, a.id) ? (a.id.includes("-") ? "clic" : "poder") : "tic"); return; }
    // Voz del personaje en «Especial» (temas.ts); el gesto empieza cuando la rueda ya se cerró.
    const voz = vozDe(figura, a.cual);
    const ok = pedirGesto(jugador, a.cual, figura);
    if (ok && voz) { void urlObjeto(voz).then(u => { if (!u || !tocarVoz(u)) sonar("poder"); }); return; }
    sonar(ok ? (a.cual === "especial" ? "poder" : "clic") : "tic");
  };
  const cerrar = useCallback(() => { cerro.current = performance.now(); setPos(null); }, []);
  if (!pos && !pista) return null;
  return (
    <div className="rg-capa">
      {pos && <RuedaAnimaciones figura={figura} jugador={jugador} x={pos.x} y={pos.y} onAccion={accion} onCerrar={cerrar} />}
      {!pos && pista && <p className="rg-pista" style={{ left: pista.x, top: pista.y }} aria-hidden="true">Toca a tu personaje para animarlo</p>}
    </div>
  );
});

/** Lo que pide el círculo: un gesto (saludar, ganar, perder, especial), un poder o movimiento, o transformarse. */
export type Accion = { tipo: "gesto"; cual: Gesto } | { tipo: "poder"; id: string } | { tipo: "transformar" };

/**
 * Círculo de animaciones por categorías (Elías, 27 nov; categorias.ts): el principal con Poderes, Especial, Pelea, Habilidad,
 * Fiesta y Gestos (Transformar al centro), y cada categoría con sus movimientos directo (Volver al centro). Lo usan la
 * rueda que sale al tocar tu figura (RuedaFigura) y la fija del personalizador (`fija`).
 */
export function RuedaAnimaciones({ figura, jugador, x, y, fija, sinTransformar, onAccion, onCerrar }: {
  figura: unknown; jugador: string; x: number; y: number; fija?: boolean; sinTransformar?: boolean;
  onAccion: (a: Accion) => void; onCerrar: () => void;
}) {
  const cat = useCatalogoV3();
  useVersionFormas();
  // En su forma de ahora: Spider-Man tiene sus poderes, Peter no.
  const enForma = figura ? conForma({ id: jugador, figura: figura as FiguraV2 }, cat).figura : null;
  const armada = armarRueda(enForma ? poderesDe(enForma, cat) : [], enForma ? movimientosDe(enForma, cat) : []);
  const [sub, setSub] = useState<{ c: Categoria; pag: number } | null>(null);
  const [n, setN] = useState(0); // vuelve a montar la rueda (anima al cambiar de nivel)
  const ir = (s: { c: Categoria; pag: number } | null) => { setSub(s); setN(v => v + 1); };
  const transforma = !sinTransformar && !!figura && seTransforma(figura);
  const cerrarYa = useRef(onCerrar); cerrarYa.current = onCerrar;
  // Suelta: la rueda se cierra al elegir; para cambiar de nivel se vuelve a abrir en el mismo lugar.
  const reabrir = useRef(false);
  const cerrar = useCallback((m: "elegir" | "tecla" | "fuera") => {
    if (m === "elegir" && reabrir.current) { reabrir.current = false; return; }
    if (!fija) cerrarYa.current();
    setSub(null);
  }, [fija]);
  const elegir = (cual: string) => {
    const tarde = (f: () => void) => setTimeout(f, fija ? 0 : 220);
    if (cual === "volver") { reabrir.current = true; tarde(() => ir(null)); return; }
    if (cual === "transformar") { tarde(() => onAccion({ tipo: "transformar" })); return; }
    if (cual === "mas" && sub) { reabrir.current = true; tarde(() => ir({ c: sub.c, pag: sub.pag + 1 })); return; }
    if (cual.startsWith("cat:")) {
      const c = cual.slice(4) as Categoria, lista = armada.opciones[c];
      // Especial y las categorías de un solo movimiento se tocan directo.
      if (c === "especial") { tarde(() => onAccion({ tipo: "gesto", cual: "especial" })); return; }
      if (lista.length === 1) { const o = lista[0]!; tarde(() => onAccion(o.cual.includes(":") ? { tipo: "poder", id: o.cual.slice(o.cual.indexOf(":") + 1) } : { tipo: "gesto", cual: o.cual as Gesto })); return; }
      reabrir.current = true; tarde(() => ir({ c, pag: 0 })); return;
    }
    if (cual.startsWith("poder:") || cual.startsWith("mov:")) { const id = cual.slice(cual.indexOf(":") + 1); tarde(() => onAccion({ tipo: "poder", id })); return; }
    tarde(() => onAccion({ tipo: "gesto", cual: cual as Gesto }));
  };
  const gestos = sub ? gajosOpciones(pagina(armada.opciones[sub.c], sub.pag)) : gajosCategorias(armada.principal);
  const boton = sub ? BOTON_VOLVER : transforma ? GAJO_TRANSFORMAR : null;
  return <RuedaGestos key={(sub ? sub.c + sub.pag : "principal") + n} gestos={gestos} boton={boton} x={x} y={y} fija={fija} grande={!fija} onElegir={elegir} onCerrar={cerrar} />;
}
