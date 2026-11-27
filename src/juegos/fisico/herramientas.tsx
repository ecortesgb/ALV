// Juego físico: lo que salió de la última herramienta del administrador (dados, ruleta, carta, orden, cronómetro,
// palabra o pregunta). Solo usa la vista pública: la ven la TV y todos los celulares.
// La palabra sale tapada en cada aparato: quien la va a describir o actuar la destapa en el suyo.
import { useEffect, useState, type CSSProperties } from "react";
import { colorDe, varsColor } from "../../app/colorJugador";
import { ArteCfg } from "../../pantallas/TarjetasConfig";
import { Burbuja } from "../../pantallas/Identidad";
import type { SeleccionFisico, HerramientaFisico } from "../../engine/partida";
import type { Miembro } from "../../servicios/enlace";
import { nombreDe, type Publico } from "../general/texto";

const CARA = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const VALOR = (v: number) => (v <= 10 ? String(v) : ["J", "Q", "K", "A"][v - 11]!);
const PALO = ["♣", "♦", "♥", "♠"];

/** Nombre e icono (arte de Elías en `ui/configurar/`) de cada herramienta. */
export const HERR_FISICO: Record<HerramientaFisico, { nombre: string; icono: string }> = {
  dados: { nombre: "Dados", icono: "herr-dados" },
  ruleta: { nombre: "Ruleta", icono: "herr-ruleta" },
  carta: { nombre: "Carta", icono: "herr-poker" },
  orden: { nombre: "Orden", icono: "herr-orden" },
  cronometro: { nombre: "Cronómetro", icono: "herr-tiempo" },
  // Sin arte propio todavía: palabra usa el de cartas y pregunta el termómetro de Temperatura.
  palabra: { nombre: "Palabra", icono: "herr-cartas" },
  pregunta: { nombre: "Pregunta", icono: "termometro-2" },
};

export const selFisico = (v: Publico) => (v.seleccion ?? { deltas: {} }) as unknown as SeleccionFisico;

/** Cuenta regresiva del cronómetro. Arranca cuando este aparato lo ve (cada uso tiene su número `n`). */
function Cronometro({ segundos, n }: { segundos: number; n: number }) {
  const [fin] = useState(() => Date.now() + segundos * 1000);
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 250); return () => clearInterval(t); }, [n]);
  const quedan = Math.max(0, Math.ceil((fin - ahora) / 1000));
  const m = Math.floor(quedan / 60), s = quedan % 60;
  return (
    <div className={"fi-crono" + (quedan === 0 ? " fin" : quedan <= 5 ? " ya" : "")} role="timer" aria-live="off">
      <b>{quedan === 0 ? "¡Tiempo!" : `${m}:${String(s).padStart(2, "0")}`}</b>
      <span className="fi-crono-barra" style={{ "--p": `${(quedan / segundos) * 100}%` } as CSSProperties} />
    </div>
  );
}

/** Los dados ruedan un momento y caen en el resultado (que ya decidió el motor). */
function DadosRuedan({ dados }: { dados: [number, number] }) {
  const [listo, setListo] = useState(false);
  const [c, setC] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setC(1 + Math.floor(Math.random() * 6)), 80);
    const f = setTimeout(() => { clearInterval(t); setListo(true); }, 1100);
    return () => { clearInterval(t); clearTimeout(f); };
  }, []);
  return (
    <div className={"fi-dados" + (listo ? " listo" : " rodando")} aria-label={listo ? `Dados: ${dados[0]} y ${dados[1]}` : "Rodando los dados"}>
      <span>{CARA[listo ? dados[0] : c]}</span><span>{CARA[listo ? dados[1] : (c % 6) + 1]}</span>
      {listo && <b className="fi-suma">= {dados[0] + dados[1]}</b>}
    </div>
  );
}

/** Palabra tapada: se destapa solo en este aparato. Cada palabra nueva vuelve a salir tapada. */
function PalabraTapada({ texto, prohibidas, grande }: { texto: string; prohibidas?: string[]; grande?: boolean }) {
  const [ver, setVer] = useState(false);
  if (!ver) return (
    <button type="button" className="fi-tapada" onClick={() => setVer(true)}>
      <b>Palabra lista</b><small>{grande ? "Que no la vea quien adivina. Toca para verla." : "Toca para verla (que no la vea quien adivina)"}</small>
    </button>
  );
  return (
    <div className="fi-palabra">
      <b>{texto}</b>
      {prohibidas?.length ? <p>Sin decir: {prohibidas.join(", ")}</p> : null}
      <button type="button" className="fi-chip" onClick={() => setVer(false)}>Tapar</button>
    </div>
  );
}

/** Resultado de la última herramienta. `grande` para la TV. */
export function ResultadoHerramienta({ v, miembros, grande }: { v: Publico; miembros: Miembro[]; grande?: boolean }) {
  const h = selFisico(v).herr;
  if (!h) return null;
  const ids = v.jugadores.map(j => j.id);
  const info = HERR_FISICO[h.tipo];
  let cuerpo: JSX.Element | null = null;
  if (h.tipo === "dados" && h.dados) {
    cuerpo = <DadosRuedan key={h.n} dados={h.dados} />;
  } else if (h.tipo === "ruleta" && h.jugador) {
    const c = colorDe(h.jugador, ids);
    cuerpo = <div className="fi-ruleta" style={varsColor(c)}><Burbuja p={{ id: h.jugador, nombre: nombreDe(v, h.jugador), figura: miembros.find(m => m.id === h.jugador)?.figura, color: c }} tamano={grande ? "6em" : 64} seleccionada /><b>{nombreDe(v, h.jugador)}</b></div>;
  } else if (h.tipo === "carta" && h.carta) {
    const rojo = h.carta.p === 1 || h.carta.p === 2;
    cuerpo = <span className={"fi-naipe" + (rojo ? " rojo" : "")} aria-label={`${VALOR(h.carta.v)} de ${PALO[h.carta.p]}`}><b>{VALOR(h.carta.v)}</b><span>{PALO[h.carta.p]}</span></span>;
  } else if (h.tipo === "orden" && h.orden) {
    cuerpo = <ol className="fi-orden">{h.orden.map((id, i) => <li key={id} style={varsColor(colorDe(id, ids))}><i>{i + 1}</i>{nombreDe(v, id)}</li>)}</ol>;
  } else if (h.tipo === "palabra" && h.texto) {
    cuerpo = <PalabraTapada key={h.n} texto={h.texto.texto} prohibidas={h.texto.prohibidas} grande={grande} />;
  } else if (h.tipo === "pregunta" && h.texto) {
    const c = h.jugador ? colorDe(h.jugador, ids) : undefined;
    cuerpo = <div className="fi-pregunta" style={c ? varsColor(c) : undefined}>{h.jugador && <span className="fi-para">Para {nombreDe(v, h.jugador)}</span>}<b>{h.texto.texto}</b></div>;
  } else if (h.tipo === "cronometro" && h.segundos) {
    cuerpo = <Cronometro key={h.n} segundos={h.segundos} n={h.n} />;
  }
  return (
    <div className={"fi-res" + (grande ? " grande" : "")} key={h.n}>
      <span className="fi-res-t"><ArteCfg nombre={info.icono} className="fi-res-ico" />{info.nombre}</span>
      {cuerpo}
    </div>
  );
}
