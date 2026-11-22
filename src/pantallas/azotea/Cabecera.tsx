// Encabezado del prototipo «La Azotea», versión profesional (2026-11-21) con el arte de Elías (public/arte/ui/hub/):
// medallón (marco + foto «busto» de la figura + estrella de nivel), placa de vidrio con apodo, rango y barra de XP,
// y pastillas de monedas y puntos con su icono 3D. Los textos y números son interfaz real; solo los objetos son imagen.
// Mismos datos que el HUB (useRecursos, apodo de la figura). La moneda gira cuando sube el saldo.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { apodoDe, semillaDe, useFoto } from "../../app/figura3d";
import { ir } from "../../app/rutas";
import type { FiguraV2 } from "../../content/personaje";
import { tituloPorNivel } from "../../engine/economia";

const num = (n: number) => Math.max(0, Math.round(n)).toLocaleString("es-MX");
// Ojo: dentro de una variable CSS la url relativa se resolvería desde assets/ en el sitio (base "./"); ahí va absoluta.
export const arteHub = (n: string) => `${import.meta.env.BASE_URL}arte/ui/hub/${n}.webp`;

export function CabeceraJugador({ id, nombre, figura, nivel, xp, costo, compacta }: {
  id: string; nombre: string; figura: FiguraV2 | null; nivel: number; xp: number; costo: number; compacta?: boolean;
}) {
  const foto = useFoto(figura, figura ? undefined : semillaDe(id), "busto");
  const apodo = apodoDe(figura);
  const titulo = tituloPorNivel(nivel);
  return (
    <button type="button" className={"azc" + (compacta ? " compacta" : "")} onClick={() => ir("perfil")}
      aria-label={`${apodo ? apodo + ", " : ""}${nombre}, nivel ${nivel}, ${titulo}. XP ${num(xp)} de ${num(costo)}. Ver mi perfil`}>
      <span className="azc-medallon" aria-hidden="true">
        <span className="azc-fondo" />
        {/* La figura va dos veces: recortada en el círculo (debajo del marco) y solo su parte de arriba encima del marco,
            así la cabeza tapa el aro y parece que sale del círculo. */}
        {foto ? <span className="azc-dentro"><img className="azc-foto" src={foto} alt="" draggable={false} /></span> : <span className="azc-cargando" />}
        <img className="azc-marco" src={arteHub("marco-avatar")} alt="" draggable={false} />
        {foto && <span className="azc-asoma"><img className="azc-foto" src={foto} alt="" draggable={false} /></span>}
        <span className="azc-nivel"><img src={arteHub("insignia-nivel")} alt="" draggable={false} /><b>{nivel}</b></span>
        <i className="azc-punto" />
      </span>
      <span className="azc-placa">
        <span className="azc-nombres">
          <b className="azc-apodo">{apodo ?? nombre}</b>
          <small className="azc-sub">{apodo && <span className="azc-cuenta">@{nombre}</span>}<span className="azc-rango">{titulo}</span></small>
        </span>
        <BarraXPAzotea xp={xp} costo={costo} nivel={nivel} />
      </span>
    </button>
  );
}

/** Barra de XP fina: rayo 3D, riel de vidrio, relleno turquesa con brillo y la cifra encima a la derecha. */
export function BarraXPAzotea({ xp, costo, nivel }: { xp: number; costo: number; nivel: number }) {
  const pct = costo > 0 ? Math.max(0, Math.min(1, xp / costo)) : 0;
  const [visto, setVisto] = useState(0);
  const primera = useRef(true);
  useEffect(() => { const t = setTimeout(() => setVisto(pct), primera.current ? 450 : 0); primera.current = false; return () => clearTimeout(t); }, [pct]);
  return (
    <span className="azc-xp">
      <img className="azc-xp-ico" src={arteHub("xp")} alt="" draggable={false} />
      <span className="azc-xp-cuerpo">
        <span className="azc-xp-datos"><small>Nivel {nivel}</small><span><b>{num(xp)}</b> / {num(costo)} XP</span></span>
        <span className="azc-tubo" role="progressbar" aria-label={`XP del nivel ${nivel}`} aria-valuemin={0} aria-valuemax={costo} aria-valuenow={xp}>
          <span className="azc-relleno" style={{ "--p": visto } as CSSProperties} />
        </span>
      </span>
      <span className="azc-sig" title={`Siguiente: nivel ${nivel + 1}`}><img src={arteHub("insignia-nivel")} alt="" draggable={false} /><b>{nivel + 1}</b></span>
    </span>
  );
}

/** Monedas (con «+» a la tienda), puntos (al ranking) y ajustes. La moneda gira cuando sube el saldo o al tocarla. */
export function RecursosAzotea({ monedas, puntos }: { monedas: number; puntos: number }) {
  const [gira, setGira] = useState(0);
  const antes = useRef(monedas);
  useEffect(() => { if (monedas > antes.current) setGira(g => g + 1); antes.current = monedas; }, [monedas]);
  return (
    <div className="azr">
      <span className="azr-pildora azr-monedas">
        <button type="button" className="azr-cuerpo" onClick={() => ir("tienda")} aria-label={`${num(monedas)} monedas. Abrir la tienda`}
          onPointerEnter={e => { if (e.pointerType === "mouse") setGira(g => g + 1); }}>
          <span key={gira} className={"azr-ico azr-moneda" + (gira ? " gira" : "")} style={{ "--sprite": `url("${new URL(arteHub("moneda-giro"), document.baseURI).href}")` } as CSSProperties} aria-hidden="true" />
          <b>{num(monedas)}</b>
        </button>
        <button type="button" className="azr-mas" onClick={() => ir("tienda")} aria-label="Conseguir monedas en la tienda"><span aria-hidden="true">+</span></button>
      </span>
      <button type="button" className="azr-pildora azr-puntos azr-cuerpo" onClick={() => ir("ranking")} aria-label={`${num(puntos)} puntos. Ver el ranking`}>
        <img className="azr-ico" src={arteHub("puntos")} alt="" draggable={false} />
        <b>{num(puntos)}</b><small>PTS</small>
      </button>
      <button type="button" className="azr-ajustes" onClick={() => ir("ajustes")} aria-label="Ajustes"><img src={arteHub("ajustes")} alt="" draggable={false} /></button>
    </div>
  );
}
