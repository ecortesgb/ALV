// Verdad o reto en el celular (Maestro 6A.6 B y 6A.11 C4, C13).
// Quien responde elige Verdad o Reto (Verdad solo una vez). Quien pregunta decide si la app da la carta o la dice en
// voz alta, y luego califica: cumplió o tomó. Con un comodín, quien responde pasa sin tomar.
// La carta del turno es la protagonista (CartaTurno): grande, con el color de Verdad o Reto y su nivel.
import { useState } from "react";
import { CARTAS_PODER } from "../../content/catalogo";
import { VR_PUNTOS } from "../../engine/partida";
import { Panel } from "../../ds";
import { colorDe, varsColor } from "../../app/colorJugador";
import { NombreJugador } from "../../pantallas/comun";
import { Burbuja } from "../../pantallas/Identidad";
import type { Miembro } from "../../servicios/enlace";
import type { MiVista } from "../general/celular";
import { EfectosComodines, SelectorComodines, SelectorComodinesMano } from "../general/SelectorComodines";
import { desenlace, nombreDe, type Publico } from "../general/texto";
import { CartaTurno, claveCarta } from "../general/CartaTurno";
import { Herramienta } from "./herramienta";
import { RelojTurno } from "../general/RelojTurno";
import "./verdadReto.css";

type Mandar = (tipo: "contestar" | "carta" | "pista", datos: Record<string, unknown>) => Promise<boolean>;

export function CelularVerdadReto({ v, mi, miembros, mandar }: { v: Publico; mi: MiVista; miembros: Miembro[]; mandar: Mandar }) {
  const yo = mi.yo, vr = v.verdadReto!;
  const ids = v.jugadores.map(j => j.id);
  const figura = (id: string) => miembros.find(m => m.id === id)?.figura;
  // Antes era un componente declarado aquí adentro: en cada dibujo React lo veía nuevo y volvía a montar la burbuja.
  const persona = (id: string, size = 40) => (
    <span className="vr-persona" style={varsColor(colorDe(id, ids))}>
      <Burbuja p={{ id, nombre: nombreDe(v, id), figura: figura(id), color: colorDe(id, ids) }} tamano={size} seleccionada={id === vr.responde && size > 40} />
      <NombreJugador nombre={nombreDe(v, id)} figura={figura(id)} clase="" />
    </span>
  );
  const soyResponde = vr.responde === yo, soyPregunta = vr.pregunta === yo;
  const yaUseVerdad = vr.verdadUsada.includes(yo);
  const esReto = vr.eleccion === "reto";
  // Un toque, un envío (antes un doble toque mandaba dos veces): se bloquea hasta que cambia la etapa o la carta.
  // Si no se pudo mandar, se vuelve a poder tocar; y si la partida no avanzó en unos segundos, también (respaldo).
  const paso = `${v.ronda}-${vr.etapa}-${v.carta?.id ?? ""}`;
  const [enviado, setEnviado] = useState<string | null>(null);
  const bloqueado = enviado === paso;
  const enviar = async (tipo: "contestar" | "carta", datos: Record<string, unknown>) => {
    if (bloqueado) return;
    setEnviado(paso);
    setTimeout(() => setEnviado(x => (x === paso ? null : x)), 5000);
    if (!(await mandar(tipo, datos))) setEnviado(null);
  };
  const contestar = (valor: unknown) => void enviar("contestar", { valor });

  // Comodines de quien responde: pasar (Escudo o Pasa turno) y cambiar la carta (solo si la dio la app).
  const comodines = soyResponde && !v.pausada && v.fase === "contestando" && vr.etapa !== "listo" ? mi.miMano.filter(c => c === "escudo" || c === "turno" || (c === "cambio" && vr.etapa === "calificar" && vr.fuente === "app")) : [];
  const barraComodines = comodines.length > 0 && (
    <SelectorComodinesMano key={v.ronda} cantidad={comodines.length}>
      {comodines.map((c, i) => {
        const d = CARTAS_PODER.find(x => x.id === c);
        return <button key={c + i} type="button" className="vr-comodin" title={d?.efecto} disabled={bloqueado} onClick={() => void enviar("carta", { carta: c })}>{c === "cambio" ? "🔄" : "🛡️"} {d?.nombre ?? c}</button>;
      })}
    </SelectorComodinesMano>
  );

  let cuerpo: JSX.Element;
  if (v.fase === "revelada") {
    const d = desenlace(v);
    cuerpo = <Panel className="vr-res a-entra" como="section"><span className="a-kick">Resultado</span><span className="dsp ol a-t1">{d.titular}</span>{d.detalle && <p className="a-suave">{d.detalle}</p>}<p className="a-nota">Llevas {v.puntos[yo] ?? 0} {(v.puntos[yo] ?? 0) === 1 ? "punto" : "puntos"}</p></Panel>;
  } else if (v.pausada) {
    cuerpo = <Panel className="vr-res"><span className="dsp ol a-t1">En pausa</span><p className="a-suave">El anfitrión detuvo la partida un momento.</p></Panel>;
  } else if (vr.etapa === "elegir") {
    cuerpo = soyResponde ? (
      <section className="vr-elegir a-entra" aria-label="Elige verdad o reto">
        <span className="dsp ol a-t2">¿Verdad o reto?</span>
        <div className="vr-dos">
          <button type="button" className="vr-opcion verdad" disabled={yaUseVerdad || bloqueado} onClick={() => contestar({ elige: "verdad" })}>
            <span className="vr-op-ico" aria-hidden="true">🗣️</span><b className="dsp ol">Verdad</b><small>{yaUseVerdad ? "Ya usaste tu verdad" : `Contesta una pregunta · +${VR_PUNTOS.verdad}`}</small>
          </button>
          <button type="button" className="vr-opcion reto" disabled={bloqueado} onClick={() => contestar({ elige: "reto" })}>
            <span className="vr-op-ico" aria-hidden="true">🔥</span><b className="dsp ol">Reto</b><small>Haz una actividad · +{VR_PUNTOS.reto}</small>
          </button>
        </div>
        <p className="a-nota">Solo puedes elegir Verdad una vez en toda la partida.</p>
      </section>
    ) : <Panel className="vr-espera"><span className="a-kick">{soyPregunta ? "Tú preguntas" : "Le toca a"}</span>{persona(vr.responde, 56)}<p className="a-suave">Está eligiendo verdad o reto…</p></Panel>;
  } else if (vr.etapa === "fuente") {
    cuerpo = soyPregunta ? (
      <section className="vr-fuente a-entra" aria-label="Quién pone la pregunta">
        <span className={"vr-sello dsp ol " + (esReto ? "reto" : "verdad")}>{esReto ? "Reto" : "Verdad"}</span>
        <span className="dsp ol a-t2">{esReto ? "¿Quién pone el reto?" : "¿Quién pone la pregunta?"}</span>
        <p className="a-suave">Para <b>{nombreDe(v, vr.responde)}</b>.</p>
        <div className="vr-dos">
          <button type="button" className="vr-opcion app" disabled={bloqueado} onClick={() => contestar({ fuente: "app" })}><span className="vr-op-ico" aria-hidden="true">💡</span><b className="dsp ol">Que ALV me dé una</b><small>Sale en la pantalla</small></button>
          <button type="button" className="vr-opcion voz" disabled={bloqueado} onClick={() => contestar({ fuente: "voz" })}><span className="vr-op-ico" aria-hidden="true">🎤</span><b className="dsp ol">La digo yo</b><small>En voz alta, de mi cabeza</small></button>
        </div>
      </section>
    ) : <Panel className="vr-espera"><span className={"vr-sello dsp ol " + (esReto ? "reto" : "verdad")}>{esReto ? "Reto" : "Verdad"}</span><p className="a-suave"><b>{nombreDe(v, vr.pregunta)}</b> está preparando {esReto ? "el reto" : "la pregunta"}…</p></Panel>;
  } else if (vr.etapa === "calificar") {
    // La carta grande con el color de su tipo. Si la dice quien pregunta, la carta lo anuncia.
    const carta = vr.fuente === "app"
      ? <CartaTurno modo="celular" clave={claveCarta(v)} tono={esReto ? "reto" : "verdad"} sello={esReto ? "Reto" : "Verdad"} texto={v.carta?.texto ?? "Sin carta para este nivel"} cartaId={v.carta?.id} />
      : <CartaTurno modo="celular" clave={claveCarta(v, "voz")} tono="voz" sello={esReto ? "Reto · en voz alta" : "Verdad · en voz alta"} texto={`🎤 ${nombreDe(v, vr.pregunta)} lo dice en voz alta`} />;
    cuerpo = (
      <section className="vr-calificar" aria-label="Calificar">
        <span className="a-kick">{soyResponde ? (esReto ? "¡Tu reto!" : "¡Tu verdad!") : `Para ${nombreDe(v, vr.responde)}`}</span>
        {carta}
        {v.efectos?.caminos ? null : soyPregunta ? <>
          <span className="a-kick">¿Qué hizo {nombreDe(v, vr.responde)}?</span>
          <div className="vr-dos">
            <button type="button" className="vr-opcion cumplio" disabled={bloqueado} onClick={() => contestar("cumplio")}><span className="vr-op-ico" aria-hidden="true">✅</span><b className="dsp ol">{esReto ? "¡Lo cumplió!" : "¡Respondió!"}</b><small>+{esReto ? VR_PUNTOS.reto : VR_PUNTOS.verdad}</small></button>
            <button type="button" className="vr-opcion tomo" disabled={bloqueado} onClick={() => contestar("tomo")}><span className="vr-op-ico" aria-hidden="true">🥤</span><b className="dsp ol">Tomó</b><small>+{VR_PUNTOS.tomar} · lo que cada quien quiera</small></button>
          </div>
        </> : soyResponde ? <p className="a-suave">{esReto ? "Haz el reto" : "Responde"} o toma algo (lo que tú quieras). <b>{nombreDe(v, vr.pregunta)}</b> califica.</p>
          : <p className="a-suave"><b>{nombreDe(v, vr.pregunta)}</b> califica a <b>{nombreDe(v, vr.responde)}</b>.</p>}
      </section>
    );
  } else {
    cuerpo = <Panel className="vr-espera"><p className="a-suave"><b>{nombreDe(v, vr.responde)}</b> pasó con un comodín.</p></Panel>;
  }

  return (
    <section className="vr-cel a-pila" aria-label="Verdad o reto">
      <div className="vr-arriba"><Herramienta v={v} chica interactiva /><RelojTurno v={v} /></div>
      <div className="vr-duelo">
        <div><span className="a-kick">Pregunta</span>{persona(vr.pregunta)}</div>
        <span className="vr-flecha" aria-hidden="true">➜</span>
        <div><span className="a-kick">Responde</span>{persona(vr.responde)}</div>
      </div>
      {cuerpo}
      <EfectosComodines v={v} yo={yo} alElegir={i => void mandar("carta", { que: "camino", i })} />
      {barraComodines}
      <SelectorComodines v={v} mi={mi} mandar={mandar} />
    </section>
  );
}
