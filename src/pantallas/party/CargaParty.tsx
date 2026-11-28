// Pantalla de carga de ALV PARTY (Elías, 27 nov 2026): mini tutorial del minijuego antes de empezar.
// Proyectar se decide en el lobby: si la sala tiene Pantalla, el juego se abre ahí y cada celular queda como mando.
// El anfitrión avisa por la difusión de la sala («party-<sala>»); la Pantalla y los celulares del lobby lo oyen,
// enseñan el tutorial y abren su parte. Lo que llega se valida (leerAvisoParty); nunca decide nada del juego.
import { useEffect, useState, type CSSProperties } from "react";
import { useSesion } from "../../app/sesion";
import { miniDe, urlsParty, leerAvisoParty, type AvisoParty } from "../../content/party";
import { abrirDifusion } from "../../servicios/difusion";
import "./party.css";

const BASE = () => new URL(import.meta.env.BASE_URL, location.href).href;
const ESPERA_S = 10;

/** El anfitrión avisa a la sala que empieza un minijuego. */
export function avisarParty(salaId: string, aviso: AvisoParty) {
  const d = abrirDifusion(`party-${salaId}`);
  d.enviar("abrir", { ...aviso });
  setTimeout(() => d.cerrar(), 5000);
}

/** Oye los avisos de minijuego de la sala. */
export function useAvisoParty(salaId: string | undefined): [AvisoParty | null, () => void] {
  const [aviso, setAviso] = useState<AvisoParty | null>(null);
  useEffect(() => {
    if (!salaId) return;
    const d = abrirDifusion(`party-${salaId}`, (e, datos) => { if (e === "abrir") { const a = leerAvisoParty(datos); if (a) setAviso(a); } });
    return d.cerrar;
  }, [salaId]);
  return [aviso, () => setAviso(null)];
}

/** Tutorial a pantalla completa. Al terminar (o al tocar «¡Entendido!») abre la TV o el mando. */
export function CargaParty({ aviso, rol, nombre, alCancelar }: { aviso: AvisoParty; rol: "tv" | "mando"; nombre?: string; alCancelar?: () => void }) {
  const m = miniDe(aviso.juego)!;
  const [quedan, setQuedan] = useState(ESPERA_S);
  const destino = urlsParty(aviso, aviso.sala, BASE(), nombre)[rol];
  useEffect(() => {
    if (quedan <= 0) { location.assign(destino); return; }
    const t = setTimeout(() => setQuedan(q => q - 1), 1000);
    return () => clearTimeout(t);
  }, [quedan, destino]);
  return (
    <div className="D pt-carga" role="dialog" aria-modal="true" aria-label={`Cómo se juega ${m.nombre}`} style={{ "--pc": m.color } as CSSProperties}>
      <div className="pt-carga-caja">
        <img className="pt-carga-portada" src={`${import.meta.env.BASE_URL}arte/${m.portada}`} alt="" draggable={false} />
        <h2 className="dsp pt-carga-tit">Cómo se juega</h2>
        <ol className="pt-carga-pasos">
          {m.tutorial.map((t, i) => <li key={i} style={{ "--i": i } as CSSProperties}><b className="dsp">{i + 1}</b><span>{t}</span></li>)}
        </ol>
        <div className="pt-carga-botones" aria-label="Botones del mando">
          {m.botones.map(b => <img key={b} src={`${import.meta.env.BASE_URL}arte/ui/mando/x-${b}.webp`} alt={b === "stick" ? "Stick" : b.toUpperCase()} draggable={false} />)}
        </div>
        <p className="pt-carga-pie">{rol === "tv" ? "Esta pantalla muestra el juego. Entren con su celular." : "Tu celular será tu mando."} Sala <b className="dsp">{aviso.sala}</b></p>
        <div className="pt-acciones">
          {alCancelar && <button type="button" className="pf-atras" onClick={alCancelar}><span aria-hidden="true">◀</span>Cambiar</button>}
          <button type="button" className="cfg-sig principal" onClick={() => location.assign(destino)}>
            <span className="cfg-sig-txt"><b>¡Entendido!</b><small>Empieza en {quedan} s</small></span><span className="cfg-sig-flecha" aria-hidden="true">▶</span>
          </button>
        </div>
        <span className="pt-carga-barra" style={{ "--t": `${ESPERA_S}s` } as CSSProperties} aria-hidden="true" />
      </div>
    </div>
  );
}

/** Para el lobby (celulares) y la Pantalla: si el anfitrión empieza un minijuego, enseña el tutorial y abre su parte. */
export function EscuchaParty({ salaId, rol }: { salaId: string | undefined; rol: "tv" | "mando" }) {
  const ses = useSesion();
  const [aviso, quitar] = useAvisoParty(salaId);
  return aviso ? <CargaParty aviso={aviso} rol={rol} nombre={ses.nombre} alCancelar={quitar} /> : null;
}
