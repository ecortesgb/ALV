// Recompensas al terminar una partida (Maestro 6A.11 C1 y C7; referencia de Elías: «Rewards / Experience»).
// Se monta una vez en App. Cuando la XP acumulada de la cuenta sube estando en una sala (el servidor la acreditó al
// terminar la partida), muestra: tu figura, «+N XP», la barra del nivel que se llena (y vuelve a empezar al subir de
// nivel), el próximo premio con candado y, si subiste, una tarjeta por cada premio de nivel desbloqueado.
// Para probarla sin nube: window.dispatchEvent(new CustomEvent("alv-recompensa", { detail: { antes: 80, despues: 260 } })).
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Escena3D, enEscena, figuraActiva, useCapsulas } from "../app/figura3d";
import { ir, useRuta } from "../app/rutas";
import { useSesion } from "../app/sesion";
import { sonar } from "../app/sonido";
import { costoNivel, nivelPorXp, xpParaNivel } from "../engine/economia";
import { PREMIOS_NIVEL, siguientePremio } from "../content/premiosNivel";
import { NOMBRE_RAREZA, rarezaDe } from "../content/rarezas";
import { reclamarPremiosNivel } from "../servicios/piezas";
import { infoPieza } from "./Desbloqueo";
import { miniatura } from "./Libro";
import "./recompensas.css";

interface Evento { antes: number; despues: number }

/** Nivel con el que se regala cada pieza (para la tarjeta del premio). */
const NIVEL_DE_PREMIO = new Map(Object.entries(PREMIOS_NIVEL).flatMap(([n, ids]) => ids.map(id => [id, Number(n)] as const)));

export function Recompensas() {
  const ses = useSesion();
  const { ruta } = useRuta();
  const previo = useRef<{ uid: string; acumulada: number } | null>(null);
  const [evento, setEvento] = useState<Evento | null>(null);
  // La XP subió mientras estaba en una sala: es la de la partida que terminó.
  useEffect(() => {
    if (ses.fase !== "dentro" || !ses.uid) return;
    const p = previo.current;
    if (p && p.uid === ses.uid && ses.acumulada > p.acumulada && (ruta === "sala" || ruta === "configurar")) setEvento({ antes: p.acumulada, despues: ses.acumulada });
    previo.current = { uid: ses.uid, acumulada: ses.acumulada };
  }, [ses.uid, ses.acumulada, ses.fase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const f = (e: Event) => { const d = (e as CustomEvent<Evento>).detail; if (d && d.despues > d.antes) setEvento(d); };
    addEventListener("alv-recompensa", f);
    return () => removeEventListener("alv-recompensa", f);
  }, []);
  if (!evento) return null;
  return <PantallaRecompensas key={`${evento.antes}-${evento.despues}`} {...evento} alCerrar={() => setEvento(null)} />;
}

function PantallaRecompensas({ antes, despues, alCerrar }: Evento & { alCerrar: () => void }) {
  const ses = useSesion();
  const caps = useCapsulas(ses.uid);
  const [mostrado, setMostrado] = useState(antes);
  const [premios, setPremios] = useState<string[] | null>(null);
  const [k, setK] = useState(-1); // -1: experiencia; 0…: tarjeta de premio
  const nivelAntes = nivelPorXp(antes), nivelDespues = nivelPorXp(despues);
  const subio = nivelDespues > nivelAntes;
  const ancla = useRef<HTMLSpanElement>(null);
  const [raiz, setRaiz] = useState<Element | null>(null);
  useEffect(() => { setRaiz(ancla.current?.closest(".D") ?? document.querySelector(".D")); }, []);

  // La barra se llena poco a poco (2.4 s); al cruzar de nivel vuelve a empezar.
  useEffect(() => {
    const t0 = performance.now(), dur = 2400;
    let raf = 0;
    const paso = (t: number) => {
      const x = Math.min(1, (t - t0) / dur), suave = 1 - Math.pow(1 - x, 3);
      setMostrado(Math.round(antes + (despues - antes) * suave));
      if (x < 1) raf = requestAnimationFrame(paso);
      else if (subio) sonar("exito");
    };
    raf = requestAnimationFrame(paso);
    // Si la pestaña está oculta no corre requestAnimationFrame: se termina igual para no dejar «Continuar» apagado.
    const fin = setTimeout(() => { cancelAnimationFrame(raf); setMostrado(despues); }, dur + 300);
    return () => { cancelAnimationFrame(raf); clearTimeout(fin); };
  }, [antes, despues, subio]);
  // Premios del nivel: los da el servidor (migración 035); sin ella no hay ninguno.
  // Se reclama una sola vez: una segunda llamada devolvería [] (ya las tiene) y taparía la lista buena.
  const reclamado = useRef(false);
  useEffect(() => {
    if (!subio) { setPremios([]); return; }
    if (reclamado.current) return;
    reclamado.current = true;
    void reclamarPremiosNivel(nivelAntes, nivelDespues).then(setPremios);
  }, [subio, nivelAntes, nivelDespues]);

  const nivel = nivelPorXp(mostrado), dentro = mostrado - xpParaNivel(nivel), costo = costoNivel(nivel);
  const prox = siguientePremio(nivel);
  const figura = figuraActiva(caps);
  const momento = subio && mostrado >= despues ? [{ id: ses.uid, cual: "victoria" as const, n: 1 }] : [];

  if (!raiz) return <span ref={ancla} hidden />;
  const premio = premios && k >= 0 ? premios[k] : undefined;
  return createPortal(
    <div className="rw" role="dialog" aria-modal="true" aria-label="Recompensas">
      <span className="rw-cinta dsp ol">Recompensas</span>
      {premio ? (
        <div className="rw-premio" key={premio}>
          <span className="rw-premio-t dsp ol">¡Nuevo! {infoPieza(premio).nombre}</span>
          <small className="rw-premio-sub">Premio por llegar a nivel {NIVEL_DE_PREMIO.get(premio) ?? nivelDespues} · {NOMBRE_RAREZA[rarezaDe(premio)]}</small>
          <div className="rw-pedestal">
            {infoPieza(premio).mini ? <img src={miniatura(infoPieza(premio).mini!)} alt="" /> : <span className="rw-pow dsp ol">¡POW!</span>}
          </div>
          <div className="rw-botones">
            <button type="button" className="d-btn k-yel" onClick={() => (k + 1 < (premios?.length ?? 0) ? setK(k + 1) : alCerrar())}><span className="dsp">¡Genial!</span></button>
            <button type="button" className="rw-poner" onClick={() => { alCerrar(); ir("personalizar"); }}>Ponérmelo</button>
          </div>
        </div>
      ) : (
        <div className="rw-cuerpo">
          <div className="rw-figura">
            <span className="rw-nombre">{ses.nombre}</span>
            <Escena3D modo="sala" figuras={[{ ...enEscena(ses.uid, figura), color: "#ffd23f", columna: 0 }]} columnas={1} momentos={momento} className="rw-3d" />
          </div>
          <section className="rw-panel" aria-label="Experiencia">
            <span className="rw-panel-t dsp">Experiencia</span>
            <b className="rw-mas dsp ol">+{mostrado - antes} XP</b>
            <div className="rw-fila">
              <span className="rw-fila-t dsp">XP de jugador</span><small>{dentro} / {costo} XP</small>
            </div>
            <div className="rw-barra" aria-label={`Nivel ${nivel}: ${dentro} de ${costo} XP`}>
              <span className="rw-nivel dsp ol">{nivel}</span>
              <span className="rw-carril"><i style={{ width: `${Math.min(100, (dentro / costo) * 100)}%` }} /></span>
              <span className="rw-nivel sig dsp ol">{nivel + 1}</span>
            </div>
            {prox && (
              <div className="rw-prox" title={`Premio en nivel ${prox.nivel}`}>
                {infoPieza(prox.pieza).mini ? <img src={miniatura(infoPieza(prox.pieza).mini!)} alt="" /> : <span aria-hidden="true">🎁</span>}
                <span><small>Próximo premio · nivel {prox.nivel}</small><b>{infoPieza(prox.pieza).nombre}</b></span>
                <span className="rw-candado" aria-hidden="true">🔒</span>
              </div>
            )}
            {nivel > nivelAntes && <p className="rw-subio dsp ol" key={nivel}>¡Subiste a nivel {nivel}!</p>}
          </section>
        </div>
      )}
      {!premio && (
        <div className="rw-botones">
          <button type="button" className="d-btn k-yel" disabled={mostrado < despues || (subio && premios === null)}
            onClick={() => (premios && premios.length ? setK(0) : alCerrar())}><span className="dsp">{premios && premios.length ? `Ver ${premios.length === 1 ? "premio" : "premios"}` : "Continuar"}</span></button>
        </div>
      )}
    </div>,
    raiz,
  );
}
