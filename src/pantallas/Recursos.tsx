// Barra de recursos con estilo «Arcade / Cómic festivo» (referencia de Elías, 2026-11-20/21).
// Todo se genera en CSS (recursos.css); solo los iconos son imágenes (public/arte/ui/icono-*.webp, de Elías).
// - XP: rayo, riel negro con anillo lima y relleno cian → verde según lo ganado en el nivel. Lleva al perfil.
// - Monedas: botón dorado, saldo y «+». Llevan a la tienda.
// - Puntos: trofeo con alas. PROPUESTA: son la XP total acumulada (lo que ordena el Ranking). Lleva al ranking.
import { useEffect } from "react";
import { costoNivel, xpParaNivel } from "../engine/economia";
import { useSesion } from "../app/sesion";
import { ir } from "../app/rutas";
import { cargarTienda, useTienda } from "../servicios/tienda";
import { useMisPuntos } from "../servicios/ranking";
import "./recursos.css";

const num = (n: number) => Math.max(0, Math.round(n)).toLocaleString("es-MX");

let pedida = false;
/** XP del nivel, monedas y puntos de la cuenta abierta. Pide el saldo de monedas una vez por sesión. */
export function useRecursos() {
  const s = useSesion();
  const t = useTienda();
  useEffect(() => { if (s.fase === "dentro" && !pedida) { pedida = true; void cargarTienda(); } }, [s.fase]);
  const base = xpParaNivel(s.nivel), costo = costoNivel(s.nivel);
  // PTS = Puntos ALV de la temporada (Maestro v1.54, T10); mientras se leen, 0.
  const pa = useMisPuntos();
  return { nivel: s.nivel, xp: Math.max(0, s.acumulada - base), costo, monedas: t.monedas, monedasListas: t.activa, puntos: pa ?? 0 };
}

const ico = (n: "xp" | "moneda" | "puntos") => `${import.meta.env.BASE_URL}arte/ui/icono-${n}.webp`;

/**
 * Barra de XP. `alTocar`: la vuelve botón (lleva a revisar la XP). Dentro de otro botón (la tarjeta del HUB) va sin él.
 */
export function BarraXP({ xp, costo, nivel, compacta, alTocar }: { xp: number; costo: number; nivel?: number; compacta?: boolean; alTocar?: () => void }) {
  const pct = costo > 0 ? Math.max(0, Math.min(1, xp / costo)) : 0;
  const cuerpo = (<>
    <img className="rc-ico rc-ico-xp" src={ico("xp")} alt="" draggable={false} />
    <span className="rc-riel" role="progressbar" aria-label={nivel ? `Nivel ${nivel}: XP` : "XP"} aria-valuemin={0} aria-valuemax={costo} aria-valuenow={xp}>
      <i className="rc-lleno" style={{ width: `${pct * 100}%` }} />
      <span className="rc-xp-txt"><b>XP</b><span className="rc-xp-num">{num(xp)}<em>/</em>{num(costo)}</span></span>
    </span>
  </>);
  const clase = "rc-xp" + (compacta ? " rc-compacta" : "");
  return alTocar
    ? <button type="button" className={clase + " rc-toca"} onClick={alTocar} aria-label={`XP ${num(xp)} de ${num(costo)}. Ver mi perfil`}>{cuerpo}</button>
    : <span className={clase}>{cuerpo}</span>;
}

export function PildoraMonedas({ monedas, conMas = true }: { monedas: number; conMas?: boolean }) {
  return (
    <span className="rc-pildora rc-monedas">
      <button type="button" className="rc-pil-btn" onClick={() => ir("tienda")} aria-label={`${num(monedas)} monedas. Abrir la tienda`}>
        <img className="rc-ico rc-ico-moneda" src={ico("moneda")} alt="" draggable={false} />
        <span className="rc-num">{num(monedas)}</span>
      </button>
      {conMas && <button type="button" className="rc-mas" onClick={() => ir("tienda")} aria-label="Conseguir monedas en la tienda"><span aria-hidden="true">+</span></button>}
    </span>
  );
}

export function PildoraPuntos({ puntos }: { puntos: number }) {
  return (
    <span className="rc-pildora rc-pts">
      <button type="button" className="rc-pil-btn" onClick={() => ir("ranking")} aria-label={`${num(puntos)} puntos. Ver el ranking`}>
        <img className="rc-ico rc-ico-pts" src={ico("puntos")} alt="" draggable={false} />
        <span className="rc-num">{num(puntos)}<small>PTS</small></span>
      </button>
    </span>
  );
}

/** Monedas y puntos juntos (la XP va aparte, junto al retrato). `xp`: agrega también la barra de XP. */
export function BarraRecursos({ xp = false, compacta = false, className = "" }: { xp?: boolean; compacta?: boolean; className?: string }) {
  const r = useRecursos();
  return (
    <div className={"rc-barra" + (compacta ? " rc-compacta" : "") + (className ? " " + className : "")}>
      {xp && <BarraXP xp={r.xp} costo={r.costo} nivel={r.nivel} compacta={compacta} alTocar={() => ir("perfil")} />}
      <PildoraMonedas monedas={r.monedas} />
      <PildoraPuntos puntos={r.puntos} />
    </div>
  );
}
