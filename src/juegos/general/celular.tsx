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
import { EfectosComodines, SelectorComodines, SelectorComodinesMano } from "./SelectorComodines";
import { comodinPorId } from "../../content/tienda";
import { MOTORES_CON_COMODINES } from "../../content/comodinesPartida";
import { BarraEmotes } from "./Emotes";

const lista2 = (ns: string[]) => (ns.length <= 1 ? ns.join("") : ns.slice(0, -1).join(", ") + " y " + ns.at(-1));

export interface MiVista { yo: string; mio: unknown; miRespuesta: unknown; miMano: string[];
  /** Comodines que sirven ahora mismo (los decide el motor). */ misComodines?: string[];
  /** La partida en curso y si este celular puede usar la colección de la cuenta (no en el modo de un solo aparato). */ partida?: string; cuenta?: boolean }
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
  // Emotes al revelar (Elías, 27 nov): mientras se ve el resultado, reacciones que vuelan en la TV.
  const emotes = p.v.fase === "revelada" && !esFinalDeJuego(p.v) && <BarraEmotes yo={p.mi.yo} />;
  // El impostor con eliminación (Maestro v1.44) tiene su propia pantalla.
  // Con papeles en la mesa, las posiciones van en una página de su final (Elías, 24 nov).
  if (p.v.motor === "rol-secreto" && p.v.impostor) return <>{reglas}<CelularImpostor {...p} />{emotes}{!p.v.impostor.palabras && podio}</>;
  if (p.v.motor === "turnos-cartas" && p.v.verdadReto) return <>{reglas}<CelularVerdadReto {...p} />{emotes}{podio}</>;
  if (p.v.motor === "fisico") return <>{reglas}<CelularFisico {...p} />{emotes}{podio}</>;
  return <>{reglas}<HerramientaGeneral {...p} />{emotes}{podio}</>;
}

function HerramientaGeneral({ v, mi, miembros, mandar }: { v: Publico; mi: MiVista; miembros: Miembro[]; mandar: Mandar }) {
  const yo = mi.yo;
  const meToca = v.esperados.includes(yo);
  const recibido = v.contestaron.includes(yo);
  // En ¿Cuánto conoces a tu pareja? la etapa de calificar es otra respuesta: cambia la clave.
  const clave = `${v.ronda}-${v.carta?.id ?? ""}${v.pareja ? "-calificar" : ""}`;
  const [enviado, setEnviado] = useState<string | null>(null);
  const [texto, setTexto] = useState(""), [pista, setPista] = useState(""), [cuenta, setCuenta] = useState(0), [eleccion, setEleccion] = useState<"a" | "b" | null>(null);
  // Mímica y Descríbelo: qué pasó con cada palabra, en orden (id de quien adivinó, «x» tachada o «p» pasó).
  const [marcas, setMarcas] = useState<string[]>([]);
  // Reto del lugar: quiénes empataron (null: no se está marcando empate).
  const [empate, setEmpate] = useState<string[] | null>(null);
  useEffect(() => { setTexto(""); setPista(""); setCuenta(0); setEleccion(null); setMarcas([]); setEmpate(null); }, [clave]);
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
    <SelectorComodinesMano key={clave} cantidad={mano.length}>
      {mano.map((c, i) => {
        const def = CARTAS_PODER.find(x => x.id === c);
        const deTurno = c === "escudo" || c === "turno" || c === "cambio";
        const puede = !deTurno || (soyTurno && !recibido && ["turnos-cartas", "botella", "ruleta", "dados"].includes(v.motor));
        return <button key={c + i} type="button" className="d-chip a-comodin" disabled={!puede} title={def?.efecto} onClick={() => void mandar("carta", { carta: c })}>{def?.nombre ?? c}</button>;
      })}
    </SelectorComodinesMano>
  );
  const comodines = MOTORES_CON_COMODINES.includes(v.motor) && <>
    <EfectosComodines v={v} yo={yo} alElegir={i => void mandar("carta", { que: "camino", i })} />
    <SelectorComodines v={v} mi={mi} />
  </>;
  const espera = <p className="a-estado" role="status">{recibido ? "La TV ya lo recibió" : "Enviado…"}</p>;

  let cuerpo: JSX.Element;
  switch (v.motor) {
    case "turnos-cartas": case "botella": case "ruleta": case "dados":
      cuerpo = soyTurno ? (
        <>
          <span className="a-kick">Te toca · {v.carta?.tipo ?? "carta"}</span>
          <p className="a-carta">{v.carta?.texto ?? "Sin carta para este nivel"}</p>
          {yaEnvie ? espera : v.efectos?.caminos ? null : <div className="a-pila">
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
      if (v.pareja) {
        // Calificar (Elías, 27 nov): cada quien ve las dos respuestas de su pareja y marca si coinciden.
        const textos = (v.seleccion?.textos ?? {}) as Record<string, string>;
        const mia = v.pareja.parejas.find(x => x.includes(yo));
        const decidir = yo === (v.control ?? v.jugadores[0]?.id) ? v.pareja.porDecidir : [];
        const respuestas = (ps: string[]) => <ul className="a-lista">{ps.map(id => <li key={id}><b>{id === yo ? "Tú" : nombreDe(v, id)}:</b> {textos[id] ?? "…"}</li>)}</ul>;
        cuerpo = <>
          {mia ? (yaEnvie ? <><span className="a-kick">¿Coinciden?</span>{espera}</> : <>
            <span className="a-kick">¿Coinciden?</span>
            {m.pregunta && <p className="a-carta">{m.pregunta}</p>}
            {respuestas(mia)}
            <div className="a-pila">
              <Boton color="verde" texto="Sí coinciden" sub="+2 a cada uno si los dos dicen que sí" onClick={() => void contestar("si")} />
              <Boton color="rojo" texto="No coinciden" onClick={() => void contestar("no")} />
            </div>
          </>) : <p className="a-suave">Las parejas marcan si coinciden. Mira la pantalla.</p>}
          {decidir.map(a => {
            const par = v.pareja!.parejas.find(x => x[0] === a) ?? [a];
            return <div key={a} className="a-pila">
              <span className="a-kick">{lista2(par.map(id => nombreDe(v, id)))} no se ponen de acuerdo. Decides tú</span>
              {respuestas(par)}
              <Boton color="verde" texto="Sí coinciden" onClick={() => void mandar("contestar", { valor: { decide: a, coinciden: true } })} />
              <Boton color="rojo" texto="No coinciden" onClick={() => void mandar("contestar", { valor: { decide: a, coinciden: false } })} />
            </div>;
          })}
        </>;
        break;
      }
      cuerpo = !meToca ? <p className="a-suave">Esta ronda la juegan las parejas. Mira la pantalla.</p> : yaEnvie ? <><span className="a-kick">Tu respuesta</span>{espera}</> : (
        <><span className="a-kick">{m.papel === "adivina" ? "Adivina lo que contestó tu pareja" : "Contesta sobre ti: tu pareja va a adivinar"}</span>
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
      if (palabras && soyTurno && !yaEnvie) {
        // Mímica y Descríbelo (Elías, 27 nov, 3A): quien actúa toca quién adivinó cada palabra en el momento.
        const actual = palabras[marcas.length];
        const marcar = (x: string) => setMarcas(ms => (ms.length < palabras.length ? [...ms, x] : ms));
        const conTachadas = palabras.some(x => x.prohibidas.length > 0);
        const enviar = () => void contestar({ adivinos: marcas.filter(x => x !== "x" && x !== "p"), tachadas: marcas.filter(x => x === "x").length });
        cuerpo = <>
          <span className="a-kick">Te toca · {v.carta?.texto}</span>
          <ol className="a-palabras">{palabras.map((x, i) => {
            const mk = marcas[i];
            const estado = mk === undefined ? (i === marcas.length ? "actual" : "") : mk === "x" ? "tachada" : mk === "p" ? "pasada" : "hecha";
            return <li key={i} className={estado}><b>{x.palabra}</b>{x.prohibidas.length > 0 && <small>Sin decir: {x.prohibidas.join(", ")}</small>}
              {mk && mk !== "x" && mk !== "p" && <small>Adivinó {nombreDe(v, mk)}</small>}</li>;
          })}</ol>
          {actual ? <>
            <span className="a-kick">¿Quién adivinó «{actual.palabra}»?</span>
            <div className="a-fila a-envuelve">{v.jugadores.filter(j => j.id !== yo).map(j => <button key={j.id} type="button" className="d-chip" onClick={() => marcar(j.id)}>{j.nombre}</button>)}</div>
            <div className="a-fila a-envuelve">
              <button type="button" className="d-chip" onClick={() => marcar("p")}>Pasar</button>
              {conTachadas && <button type="button" className="d-chip" onClick={() => marcar("x")}>Dijo una tachada</button>}
            </div>
          </> : <p className="a-suave">¡Se acabaron las palabras!</p>}
          {marcas.length > 0 && <button type="button" className="d-chip" onClick={() => setMarcas(ms => ms.slice(0, -1))}>Deshacer la última</button>}
          <Boton color="amarillo" texto="Terminé" sub="+1 a ti y +1 a quien adivinó, por palabra" icono="play" onClick={enviar} />
        </>;
        break;
      }
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
      cuerpo = meToca && !yaEnvie ? <><span className="a-kick">{v.carta?.tipo || "Reto del lugar"}</span><p className="a-carta">{v.carta?.texto}</p>
        {empate ? <>
          {/* Empate (Elías, 27 nov): +1 a cada quien empató. */}
          <span className="a-kick">¿Quiénes empataron?</span>
          <div className="a-fila a-envuelve">{v.jugadores.map(j => {
            const on = empate.includes(j.id);
            return <button key={j.id} type="button" className={"d-chip" + (on ? " on" : "")} aria-pressed={on} onClick={() => setEmpate(xs => xs && (on ? xs.filter(x => x !== j.id) : [...xs, j.id]))}>{j.nombre}</button>;
          })}</div>
          <Boton color="amarillo" texto="Empataron" sub="+1 a cada quien" desactivado={empate.length < 2} onClick={() => void contestar(empate)} />
          <button type="button" className="d-chip" onClick={() => setEmpate(null)}>Volver</button>
        </> : <>
          <span className="a-kick">Marca quién ganó</span><Elegir gente={v.jugadores} miembros={miembros} clave={clave} titulo="¿Quién ganó?" confirmar="Ganó" alElegir={id => void contestar(id)} />
          <div className="a-fila a-envuelve">
            <button type="button" className="d-chip" onClick={() => setEmpate([])}>Empate</button>
            <button type="button" className="d-chip" onClick={() => void contestar("nadie")}>Nadie ganó</button>
          </div>
        </>}</>
        : <><span className="a-kick">{v.carta?.tipo || "Reto del lugar"}</span><p className="a-carta">{v.carta?.texto}</p>{meToca ? espera : <p className="a-suave">El anfitrión marca quién ganó.</p>}</>;
      break;
    case "fisico": // tiene su propia pantalla (CelularFisico)
      cuerpo = <></>;
      break;
  }
  return <Panel className="a-herr a-entra" como="section">{cuerpo}{cartas}{comodines}{v.cartaUsada && v.cartaUsada.ronda === v.ronda && <Chip texto={`${nombreDe(v, v.cartaUsada.jugador)} usó ${comodinPorId(v.cartaUsada.carta)?.nombre ?? CARTAS_PODER.find(c => c.id === v.cartaUsada!.carta)?.nombre ?? "un comodín"}`} icono="bolt" />}</Panel>;
}
