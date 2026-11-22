// Escenario intercambiable del HUB: ciudad, azotea en primer plano y velo de legibilidad.
// PROVISIONAL: la ciudad es la imagen pintada que ya existe y la azotea es un dibujo SVG hecho aquí. Cuando lleguen
// las capas de Elías (ambiente.capas) se dibujan esas en su lugar, con el mismo paralaje.
import type { CSSProperties } from "react";
import type { Ambiente, MomentoAzotea } from "./paquetes";

const url = (nombre: string) => `url("${new URL(`${import.meta.env.BASE_URL}arte/${nombre}`, document.baseURI).href}")`;
const arte = (base: string) => ({ "--arte-g": url(`${base}-1920.webp`), "--arte-c": url(`${base}-1100.webp`) }) as CSSProperties;

// Foquitos de feria: colores pastel, alegres (nada de neón oscuro).
const FOCOS = ["#ff7eb6", "#ffe066", "#5ff0e2", "#9fd0ff", "#ffb066"];

export function EscenarioFondo({ ambiente, momento, velo }: { ambiente: Ambiente; momento: MomentoAzotea; velo: number }) {
  const c = ambiente.capas;
  return (
    <div className={`az-escenario m-${momento}${ambiente.foquitos ? " foquitos" : ""}`} style={{ "--az-velo": velo } as CSSProperties} aria-hidden="true">
      {/* Con pedestal pintado el fondo no se mueve con el cursor: la figura va clavada encima. */}
      {ambiente.fondo ? <div className={"az-capa az-fondo" + (ambiente.pedestal ? "" : " az-p2")} style={arte(ambiente.fondo)} />
      : c ? <>
        <div className="az-capa az-p0" style={{ backgroundImage: url(c.cielo) }} />
        <div className="az-capa az-p1" style={{ backgroundImage: url(c.lejos) }} />
        <div className="az-capa az-p2" style={{ backgroundImage: url(c.medio) }} />
        <div className="az-capa az-p3" style={{ backgroundImage: url(c.azotea) }} />
      </> : <>
        <div className="az-capa az-ciudad az-p1" style={arte(ambiente.ciudad)} />
        <AzoteaDibujada tinte={ambiente.tinte} fuerza={ambiente.tinteFuerza} />
      </>}
      <div className="az-velo" />
    </div>
  );
}

/** Primer plano provisional: pretil con studs, piso de losetas en perspectiva, tinaco, macetas, caja y foquitos. */
function AzoteaDibujada({ tinte, fuerza }: { tinte: string; fuerza: number }) {
  const H = 477, VX = 800; // horizonte (53 %) y punto de fuga del lienzo 1600×900
  const studs = Array.from({ length: 62 }, (_, i) => -40 + i * 28);
  const filas = [652, 668, 690, 720, 760, 812, 880];
  const cols = Array.from({ length: 23 }, (_, i) => -1300 + i * 190);
  const enPiso = (x: number, y: number) => VX + (x - VX) * ((y - H) / (900 - H));
  // Foquitos colgando entre dos postes (catenaria simple)
  const cuerda = (x1: number, y1: number, x2: number, y2: number, caida: number, n: number) =>
    Array.from({ length: n }, (_, i) => { const t = (i + 0.5) / n; return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * caida] as const; });
  const focos = [...cuerda(46, 352, 610, 404, 70, 14), ...cuerda(1040, 404, 1640, 330, 60, 14)];
  return (
    <svg className="az-capa az-p3 az-azotea" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="azPiso" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b9c4e4" /><stop offset="1" stopColor="#e3e9f8" /></linearGradient>
        <linearGradient id="azPretil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff9a6e" /><stop offset="1" stopColor="#e2553a" /></linearGradient>
        <linearGradient id="azTinaco" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#2a6fd8" /><stop offset=".45" stopColor="#5aa6ff" /><stop offset="1" stopColor="#1f4fae" /></linearGradient>
        <radialGradient id="azFoco"><stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset=".5" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      </defs>
      {/* Piso de losetas */}
      <path d="M-200 636H1800V900H-200Z" fill="url(#azPiso)" />
      <g stroke="#8f9cc6" strokeWidth="2" opacity=".55">
        {filas.map(y => <path key={y} d={`M-200 ${y}H1800`} />)}
        {cols.map(x => <path key={x} d={`M${enPiso(x, 640)} 640L${x} 900`} />)}
      </g>
      {/* Pretil con studs */}
      <g stroke="#0a1030" strokeWidth="3" strokeLinejoin="round">
        <path d="M-200 588H1800V640H-200Z" fill="url(#azPretil)" />
        <path d="M-200 588H1800" stroke="#ffc6a8" strokeWidth="4" />
        {studs.map(x => <g key={x}><path d={`M${x - 10} 588V578H${x + 10}V588`} fill="#ff8a62" /><ellipse cx={x} cy={578} rx={10} ry={4} fill="#ffb291" /></g>)}
        <path d="M-200 640H1800" stroke="#a33a22" strokeWidth="5" />
      </g>
      {/* Postes de los foquitos */}
      <g stroke="#0a1030" strokeWidth="3" fill="#3b4a8f">
        <path d="M38 352h16v290H38z" /><path d="M1030 404h16v236h-16z" />
      </g>
      <g className="az-cuerda" fill="none" stroke="#2a2f55" strokeWidth="2.5">
        <path d="M46 352 Q 330 474 610 404" /><path d="M1040 404 Q 1340 452 1640 330" />
      </g>
      <g className="az-focos">
        {focos.map(([x, y], i) => <g key={i} style={{ "--i": i } as CSSProperties}>
          <circle className="az-foco-luz" cx={x} cy={y + 9} r={26} fill="url(#azFoco)" />
          <path d={`M${x - 3} ${y}h6v5h-6z`} fill="#2a2f55" />
          <circle className="az-foco" cx={x} cy={y + 11} r={7} fill={FOCOS[i % FOCOS.length]} stroke="#0a1030" strokeWidth="2" />
        </g>)}
      </g>
      {/* Tinaco de piezas */}
      <g stroke="#0a1030" strokeWidth="3" strokeLinejoin="round">
        <path d="M92 820V700M248 820V700" stroke="#3b4a8f" strokeWidth="12" />
        <rect x="70" y="560" width="200" height="150" rx="18" fill="url(#azTinaco)" />
        <ellipse cx="170" cy="560" rx="100" ry="18" fill="#7cbcff" />
        {[120, 170, 220].map(x => <g key={x}><path d={`M${x - 14} 560V546H${x + 14}V560`} fill="#5aa6ff" /><ellipse cx={x} cy={546} rx={14} ry={5} fill="#a8d4ff" /></g>)}
        <path d="M70 640H270" stroke="#123e9c" strokeWidth="4" />
      </g>
      {/* Macetas */}
      <g stroke="#0a1030" strokeWidth="3" strokeLinejoin="round">
        <path d="M300 820h90l-10 60h-70z" fill="#ff8a3d" /><circle cx="320" cy="790" r="32" fill="#3fbf5a" /><circle cx="368" cy="784" r="36" fill="#56d46e" /><circle cx="344" cy="760" r="30" fill="#7be08c" />
        <path d="M1460 790h80l-8 54h-64z" fill="#ffd23f" /><circle cx="1480" cy="764" r="28" fill="#3fbf5a" /><circle cx="1520" cy="758" r="32" fill="#56d46e" />
      </g>
      {/* Caja de piezas */}
      <g stroke="#0a1030" strokeWidth="3" strokeLinejoin="round">
        <path d="M430 800h150v70H430z" fill="#ffc21a" /><path d="M430 800l20-22h150l-20 22z" fill="#ffe27a" /><path d="M580 800l20-22v70l-20 22z" fill="#d99a00" />
        {[460, 505, 550].map(x => <ellipse key={x} cx={x + 12} cy={789} rx={11} ry={4} fill="#fff1b0" />)}
      </g>
      {fuerza > 0 && <rect className="az-tinte" x="-200" y="560" width="2000" height="400" fill={tinte} opacity={fuerza} />}
    </svg>
  );
}
