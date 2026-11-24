// Botón «cast» del anfitrión (Elías, 24 nov): proyectar en este aparato o en otra pantalla, y dejar de proyectar.
// El modo se decide solo: con una Pantalla conectada se juega «en pantalla externa»; sin ella, «en celulares».
// Sale arriba en el lobby, al configurar y en la partida. Nada se guarda: la presencia es el latido de la Pantalla.
import { useEffect, useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { ir } from "../../app/rutas";
import type { SalaV } from "../../servicios/enlace";
import { pedirSalirPantalla } from "../../servicios/difusion";
import type { PresenciaPantalla } from "../../servicios/tiempoReal";
import { aviso } from "../comun";
import "./cast.css";

/** Enlace que abre la Pantalla de esta sala (en la TV o laptop, con la cuenta del anfitrión). */
export const enlacePantalla = (codigo: string) => `${location.origin}${import.meta.env.BASE_URL}#/tv/${codigo}`;

/** Código QR dibujado con elementos SVG (sin insertar HTML). */
function Qr({ texto }: { texto: string }) {
  const celdas = useMemo(() => {
    const q = qrcode(0, "M"); q.addData(texto); q.make();
    const n = q.getModuleCount(), r: [number, number][] = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) r.push([x, y]);
    return { n, r };
  }, [texto]);
  return (
    <svg className="cs-qr" viewBox={`-2 -2 ${celdas.n + 4} ${celdas.n + 4}`} role="img" aria-label="Código QR para abrir la pantalla">
      <rect x="-2" y="-2" width={celdas.n + 4} height={celdas.n + 4} fill="#fff" />
      {celdas.r.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill="#0a1030" />)}
    </svg>
  );
}

/** Icono de transmitir (pantalla con ondas). */
const IconoCast = ({ activo }: { activo: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="cs-ico">
    <path d="M3 18a3 3 0 0 1 3 3M3 14a7 7 0 0 1 7 7M3 10a11 11 0 0 1 11 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M6 7V5a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {activo && <rect x="9" y="7" width="9" height="9" rx="1" fill="currentColor" opacity=".55" />}
  </svg>
);

export function BotonCast({ sala, pantalla, className = "" }: { sala: SalaV; pantalla: PresenciaPantalla; className?: string }) {
  const [abierto, setAbierto] = useState(false);
  const proyectando = pantalla === "presente";
  const url = enlacePantalla(sala.codigo);
  const ancho = typeof matchMedia !== "undefined" && matchMedia("(min-width: 900px)").matches;
  useEffect(() => { if (!abierto) return; const f = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); }; addEventListener("keydown", f); return () => removeEventListener("keydown", f); }, [abierto]);
  const copiar = async () => { try { await navigator.clipboard.writeText(url); aviso("Enlace copiado."); } catch { aviso("No se pudo copiar; escríbelo en la TV."); } };
  return (
    <>
      <button type="button" className={"cs-boton" + (proyectando ? " on" : "") + (className ? " " + className : "")} onClick={() => setAbierto(true)}
        aria-label={proyectando ? "Proyectando en la pantalla. Opciones" : "Proyectar en una pantalla"}>
        <IconoCast activo={proyectando} /><span className="cs-txt">{proyectando ? "En pantalla" : "Proyectar"}</span>
      </button>
      {abierto && (
        <div className="cs-velo" role="dialog" aria-modal="true" aria-label="Dónde se juega" onClick={() => setAbierto(false)}>
          <div className="cs-panel" onClick={e => e.stopPropagation()}>
            <header className="cs-cab"><b>¿Dónde se juega?</b><button type="button" className="cs-cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar">✕</button></header>
            {proyectando ? <>
              <p className="cs-estado on"><IconoCast activo />Se está jugando en la <b>pantalla externa</b>. Los celulares solo muestran a cada quien su personaje y lo que le toca hacer.</p>
              <button type="button" className="cs-op peligro" onClick={() => { pedirSalirPantalla(sala.id); setAbierto(false); aviso("La pantalla deja de proyectar. Se juega en los celulares."); }}>
                <b>Dejar de proyectar</b><small>La pantalla vuelve a ser un aparato normal y cada celular ve todo.</small>
              </button>
            </> : <>
              <p className="cs-estado">Ahora se juega <b>en celulares</b>: cada quien ve todo en el suyo.</p>
              {/* Solo en pantallas anchas: si el anfitrión proyectara en su único celular, nadie correría el motor. */}
              {ancho ? <button type="button" className="cs-op" onClick={() => ir("tv", sala.codigo)}>
                <b>Proyectar en este aparato</b><small>Esta laptop o TV se vuelve la pantalla. Tú sigues jugando desde tu celular.</small>
              </button> : <p className="cs-nota">Desde el celular no se proyecta aquí mismo: abre la pantalla en la TV o laptop.</p>}
              <div className="cs-op cs-otra">
                <b>En otra pantalla</b>
                <small>Abre esto en la TV o laptop con tu cuenta, o escanéalo:</small>
                <div className="cs-otra-fila"><Qr texto={url} /><div className="cs-url"><code>{url}</code><button type="button" className="cs-copiar" onClick={() => void copiar()}>Copiar enlace</button></div></div>
              </div>
            </>}
          </div>
        </div>
      )}
    </>
  );
}
