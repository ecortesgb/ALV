// La herramienta del jugador en su celular: una a la vez, según la mecánica de la ronda.
// Su secreto solo se ve mientras mantiene el dedo (Escáner). Cada toque se confirma: «Enviado» y luego «La TV ya lo recibió».
import { useEffect, useState } from "react";
import { CARTAS_PODER } from "../../content/catalogo";
import { MAX_PISTA } from "../../engine/partida";
import { Boton, Chip, Escaner, Panel } from "../../ds";
import { ElegirEnAnillo } from "../../pantallas/Identidad";
import { colorDe } from "../../app/colorJugador";
import type { Miembro } from "../../servicios/enlace";
import { desenlace, instruccion, nombreDe, type Publico } from "./texto";
import { CelularImpostor } from "../impostor/celular";
import { CelularVerdadReto } from "../verdadReto/celular";
import { CelularFisico } from "../fisico/celular";
import { ComoJugar, tocaExplicar } from "./ComoJugar";
import { CeremoniaCopas, PodioJuego, esFinalDeJuego } from "./Copas";
import { SelectorComodines } from "./SelectorComodines";

export interface MiVista { yo: string; mio: unknown; miRespuesta: unknown; miMano: string[] }
type Mandar = (tipo: "contestar" | "carta" | "pista", datos: Record<string, unknown>) => Promise<boolean>;

/** Elegir a alguien: burbujas en anillo con el color de cada quien; un toque marca y el botón confirma. */
function Elegir({ gente, miembros, sin, alElegir, titulo = "¿A quién eliges?", confirmar = "Votar", clave }: { gente: Publico["jugadores"]; miembros: Miembro[]; sin?: string; alElegir: (id: string) => void; titulo?: string; confirmar?: string; clave?: string }) {
  const ids = gente.map(j => j.id);
  return <ElegirEnAnillo clave={clave} titulo={titulo} confirmar={confirmar} alElegir={alElegir}
    gente={gente.filter(j => j.id !== sin).map(j => ({ id: j.id, nombre: j.nombre, figura: miembros.find(m => m.id === j.id)?.figura, color: colorDe(j.id, ids) }))} />;
}

export function HerramientaCelular(p: { v: Publico; mi: MiVista; miembros: Miembro[]; mandar: Mandar; /** Local: la carga ya se mostró antes de pasar el teléfono. */ sinCarga?: boolean;
  /** Solo el anfitrión: al cerrar la carga empieza la partida para todos (acción «comenzar»). */ alComenzar?: () => void }) {
  // Pantalla de carga antes de la primera ronda. Cada quien la cierra en su celular; la del anfitrión arranca la partida.
  const [visto, setVisto] = useState(false);
  const reglas = !visto && !p.sinCarga && tocaExplicar(p.v) && <ComoJugar v={p.v} modo="celular" alCerrar={() => { setVisto(true); p.alComenzar?.(); }} />;
  if (p.v.juegoId === "copas") return <CeremoniaCopas v={p.v} miembros={p.miembros} modo="celular" />;
  // Al final del juego, su podio abajo del resultado.
  const podio = esFinalDeJuego(p.v) && <PodioJuego v={p.v} miembros={p.miembros} modo="celular" />;
  // El impostor con eliminación (Maestro v1.44) tiene su propia pantalla.
  // Con papeles en la mesa, las posiciones van en una página de su final (Elías, 24 nov).
  if (p.v.motor === "rol-secreto" && p.v.impostor) return <>{reglas}<CelularImpostor {...p} />{!p.v.impostor.palabras && podio}</>;
  if (p.v.motor === "turnos-cartas" && p.v.verdadReto) return <>{reglas}<CelularVerdadReto {...p} />{podio}</>;
  if (p.v.motor === "fisico") return <>{reglas}<CelularFisico {...p} />{podio}</>;
  return <>{reglas}<HerramientaGeneral {...p} />{podio}</>;
}

function HerramientaGeneral({ v, mi, miembros, mandar }: { v: Publico; mi: MiVista; miembros: Miembro[]; mandar: Mandar }) {
  const yo = mi.yo;
  const meToca = v.esperados.includes(yo);
  const recibido = v.contestaron.includes(yo);
  const clave = `${v.ronda}-${v.carta?.id ?? ""}`;
  const [enviado, setEnviado] = useState<string | null>(null);
  const [texto, setTexto] = useState(""), [pista, setPista] = useState(""), [cuenta, setCuenta] = useState(0), [eleccion, setEleccion] = useState<"a" | "b" | null>(null);
  useEffect(() => { setTexto(""); setPista(""); setCuenta(0); setEleccion(null); }, [clave]);
  const yaEnvie = enviado === clave || recibido;
  const contestar = async (valor: unknown) => { setEnviado(clave); if (!(await mandar("contestar", { valor }))) setEnviado(null); };
  const soyTurno = v.turnoDe === yo;
  const mano = mi.miMano;

  if (v.fase === "revelada") {
    const d = desenlace(v);
    return <Panel className="a-herr a-entra"><span className="a-kick">Resultado</span><span className="dsp ol a-t1">{d.titular}</span>{d.detalle && <p className="a-suave">{d.detalle}</p>}<p className="a-nota">Llevas {v.puntos[yo] ?? 0} {(v.puntos[yo] ?? 0) === 1 ? "punto" : "puntos"}</p></Panel>;
  }
  if (v.pausada) return <Panel className="a-herr"><span className="dsp ol a-t1">En pausa</span><p className="a-suave">El anfitrión detuvo la partida un momento.</p></Panel>;

  const cartas = mano.length > 0 && v.fase === "contestando" && (
    <SelectorComodines key={clave} cantidad={mano.length}>
      {mano.map((c, i) => {
        const def = CARTAS_PODER.find(x => x.id === c);
        const deTurno = c === "escudo" || c === "turno" || c === "cambio";
        const puede = !deTurno || (soyTurno && !recibido && ["turnos-cartas", "botella", "ruleta", "dados"].includes(v.motor));
        return <button key={c + i} type="button" className="d-chip a-comodin" disabled={!puede} title={def?.efecto} onClick={() => void mandar("carta", { carta: c })}>{def?.nombre ?? c}</button>;
      })}
    </SelectorComodines>
  );
  const espera = <p className="a-estado" role="status">{recibido ? "La TV ya lo recibió" : "Enviado…"}</p>;

  let cuerpo: JSX.Element;
  switch (v.motor) {
    case "turnos-cartas": case "botella": case "ruleta": case "dados":
      cuerpo = soyTurno ? (
        <>
          <span className="a-kick">Te toca · {v.carta?.tipo ?? "carta"}</span>
          <p className="a-carta">{v.carta?.texto ?? "Sin carta para este nivel"}</p>
          {yaEnvie ? espera : <div className="a-pila">
            <Boton color="verde" texto="Lo cumplí" icono="star" onClick={() => void contestar("cumplio")} />
            <Boton color="rojo" texto="No lo cumplí" sub="0 puntos" onClick={() => void contestar("paso")} />
          </div>}
        </>
      ) : <><span className="a-kick">{instruccion(v)}</span><p className="a-carta">{v.carta?.texto}</p><p className="a-suave">Mira la pantalla y échale porras.</p></>;
      break;
    case "votacion": {
      const dos = v.jugadores.length === 2;
      const ops: ["a" | "b", string][] = [["a", v.carta?.texto ?? "A"], ["b", v.carta?.opcionB ?? "B"]];
      cuerpo = yaEnvie ? <><span className="a-kick">¿Qué prefieres?</span>{espera}</> : dos && eleccion ? (
        <><span className="a-kick">¿Qué crees que eligió {nombreDe(v, v.jugadores.find(j => j.id !== yo)?.id)}?</span>
          <div className="a-pila">{ops.map(([k, t]) => <Boton key={k} color={k === "a" ? "azul" : "morado"} texto={t} onClick={() => void contestar({ eleccion, prediccion: k })} />)}</div></>
      ) : (
        <><span className="a-kick">¿Qué prefieres?</span>
          <div className="a-pila">{ops.map(([k, t]) => <Boton key={k} color={k === "a" ? "azul" : "morado"} texto={t} onClick={() => (dos ? setEleccion(k) : void contestar(k))} />)}</div></>
      );
      break;
    }
    case "rol-secreto": {
      const m = (mi.mio ?? {}) as { rol?: string; palabra?: string; tema?: string };
      const impostor = m.rol === "impostor";
      cuerpo = (
        <>
          <Escaner secreto={impostor ? "Eres el impostor" : m.palabra ?? "…"} encabezado={impostor ? "TU PAPEL" : "PALABRA CLASIFICADA"} detalle={`Tema: ${m.tema ?? v.carta?.texto ?? ""}`} />
          {v.pistas[yo] ? <p className="a-estado">Tu pista: «{v.pistas[yo]}»</p> : (
            <form className="a-fila" onSubmit={e => { e.preventDefault(); if (pista.trim()) void mandar("pista", { texto: pista.trim() }); }}>
              <input className="a-input" value={pista} maxLength={MAX_PISTA} onChange={e => setPista(e.target.value)} placeholder="Tu pista, una palabra" aria-label="Tu pista" />
              <button type="submit" className="d-btn k-blu a-chico" disabled={!pista.trim()}><span className="dsp">Ya dije</span></button>
            </form>
          )}
          {yaEnvie ? espera : <><span className="a-kick">¿Quién es el impostor?</span><Elegir gente={v.jugadores} miembros={miembros} sin={yo} clave={clave} titulo="¿Quién es?" alElegir={id => void contestar(id)} /></>}
        </>
      );
      break;
    }
    case "pareja": {
      const m = (mi.mio ?? {}) as { papel?: string; pregunta?: string };
      cuerpo = !meToca ? <p className="a-suave">Esta ronda la juegan las parejas. Mira la pantalla.</p> : yaEnvie ? <><span className="a-kick">Tu respuesta</span>{espera}</> : (
        <><span className="a-kick">{m.papel === "adivina" ? "Adivina lo que contestó tu pareja" : "Contesta sobre ti"}</span>
          <p className="a-carta">{m.pregunta}</p>
          <form className="a-pila" onSubmit={e => { e.preventDefault(); if (texto.trim()) void contestar(texto.trim()); }}>
            <input className="a-input" value={texto} maxLength={120} onChange={e => setTexto(e.target.value)} placeholder="Escribe aquí" aria-label="Tu respuesta" />
            <Boton color="amarillo" texto="Enviar" icono="play" desactivado={!texto.trim()} onClick={() => void contestar(texto.trim())} />
          </form></>
      );
      break;
    }
    case "conteo": {
      const palabras = ((mi.mio ?? {}) as { palabras?: { palabra: string; prohibidas: string[] }[] }).palabras;
      const tope = palabras ? palabras.length : 40;
      cuerpo = !soyTurno ? <><span className="a-kick">{instruccion(v)}</span><p className="a-carta">{v.carta?.texto}</p></> : yaEnvie ? <><span className="a-kick">Tu cuenta</span>{espera}</> : (
        <><span className="a-kick">Te toca · {v.carta?.texto}</span>
          {palabras && <ol className="a-palabras">{palabras.map((p, i) => <li key={i} className={i < cuenta ? "hecha" : ""}><b>{p.palabra}</b>{p.prohibidas.length > 0 && <small>Sin decir: {p.prohibidas.join(", ")}</small>}</li>)}</ol>}
          <div className="a-contador"><button type="button" className="a-atras" onClick={() => setCuenta(c => Math.max(0, c - 1))} aria-label="Una menos">−</button><b className="dsp ol a-num" aria-live="polite">{cuenta}</b><button type="button" className="a-atras" onClick={() => setCuenta(c => Math.min(tope, c + 1))} aria-label="Una más">+</button></div>
          <Boton color="amarillo" texto="Terminé" sub="Envía cuántas lograste" icono="play" onClick={() => void contestar(cuenta)} /></>
      );
      break;
    }
    case "confesion":
      cuerpo = yaEnvie ? <><span className="a-kick">Yo nunca…</span>{espera}</> : (
        <><span className="a-kick">Yo nunca…</span><p className="a-carta">{v.carta?.texto}</p>
          <div className="a-pila"><Boton color="naranja" texto="Sí lo he hecho" onClick={() => void contestar("si")} /><Boton color="azul" texto="Nunca" onClick={() => void contestar("no")} /></div></>
      );
      break;
    case "senalar":
      cuerpo = yaEnvie ? <><span className="a-kick">Tu voto</span>{espera}</> : <><span className="a-kick">¿Quién es más probable que…?</span><p className="a-carta">{v.carta?.texto}</p><Elegir gente={v.jugadores} miembros={miembros} clave={clave} titulo="¿Quién?" alElegir={id => void contestar(id)} /></>;
      break;
    case "competencia":
      cuerpo = meToca && !yaEnvie ? <><span className="a-kick">{v.carta?.tipo || "Reto del lugar"}</span><p className="a-carta">{v.carta?.texto}</p><span className="a-kick">Marca quién ganó</span><Elegir gente={v.jugadores} miembros={miembros} clave={clave} titulo="¿Quién ganó?" confirmar="Ganó" alElegir={id => void contestar(id)} /></>
        : <><span className="a-kick">{v.carta?.tipo || "Reto del lugar"}</span><p className="a-carta">{v.carta?.texto}</p>{meToca ? espera : <p className="a-suave">El anfitrión marca quién ganó.</p>}</>;
      break;
    case "fisico": // tiene su propia pantalla (CelularFisico)
      cuerpo = <></>;
      break;
  }
  return <Panel className="a-herr a-entra" como="section">{cuerpo}{cartas}{v.cartaUsada && v.cartaUsada.ronda === v.ronda && <Chip texto={`${nombreDe(v, v.cartaUsada.jugador)} usó ${CARTAS_PODER.find(c => c.id === v.cartaUsada!.carta)?.nombre ?? "un comodín"}`} icono="bolt" />}</Panel>;
}
