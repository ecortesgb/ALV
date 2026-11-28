// La herramienta del jugador en su celular: una a la vez, según la mecánica de la ronda.
// Su secreto solo se ve mientras mantiene el dedo (Escáner). Cada toque se confirma: «Enviado» y luego «La TV ya lo recibió».
import { Fragment, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CARTAS_PODER } from "../../content/catalogo";
import { MAX_PISTA } from "../../engine/partida";
import { Chip, Escaner, Panel } from "../../ds";
import { ElegirEnAnillo } from "../../pantallas/Identidad";
import { colorDe } from "../../app/colorJugador";
import type { Miembro } from "../../servicios/enlace";
import { desenlace, instruccion, nombreDe, type Publico } from "./texto";
import { BotonAccion, CartaTurno, claveCarta, escalaTexto, selloDe, tonoDeMazo } from "./CartaTurno";
import { CelularImpostor } from "../impostor/celular";
import { CelularVerdadReto } from "../verdadReto/celular";
import { CelularFisico } from "../fisico/celular";
import { ComoJugar, tocaExplicar } from "./ComoJugar";
import { CeremoniaCopas, PodioJuego, esFinalDeJuego } from "./Copas";
import { BloqueComodines, EfectosComodines, SelectorComodines, SelectorComodinesMano } from "./SelectorComodines";
import { comodinPorId } from "../../content/tienda";
import { BarraEmotes } from "./Emotes";

const lista2 = (ns: string[]) => (ns.length <= 1 ? ns.join("") : ns.slice(0, -1).join(", ") + " y " + ns.at(-1));

export interface MiVista { yo: string; mio: unknown; miRespuesta: unknown; miMano: string[];
  /** Comodines que sirven ahora mismo (los decide el motor). */ misComodines?: string[];
  /** Comodines dirigidos: a quién puede ir cada uno (lo decide el motor). */ misObjetivos?: Record<string, string[]>;
  /** La partida en curso y si quien tiene el teléfono puede usar la colección de su cuenta. */ partida?: string; cuenta?: boolean;
  /** Otra cuenta que juega en este aparato: su sesión. Sin esto, la sesión del aparato. */ cliente?: SupabaseClient | null;
  /** Lobby de un solo aparato: la sala espejo de la nube. */ espejo?: string | null }
type Mandar = (tipo: "contestar" | "carta" | "pista", datos: Record<string, unknown>) => Promise<boolean>;

/** Elegir a alguien: burbujas en anillo con el color de cada quien; un toque marca y el botón confirma. */
function Elegir({ gente, miembros, sin, alElegir, titulo = "¿A quién eliges?", confirmar = "Votar", clave }: { gente: Publico["jugadores"]; miembros: Miembro[]; sin?: string; alElegir: (id: string) => void; titulo?: string; confirmar?: string; clave?: string }) {
  const ids = gente.map(j => j.id);
  // Más chico que el de 400 px: así el botón de confirmar queda a la vista, abajo de la carta.
  return <ElegirEnAnillo clave={clave} titulo={titulo} confirmar={confirmar} alElegir={alElegir} ancho={300}
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
  // Comodines (Maestro v1.74): en El impostor y ALV FÍSICO van abajo de su pantalla.
  const cm = <BloqueComodines v={p.v} mi={p.mi} mandar={p.mandar} />;
  if (p.v.motor === "rol-secreto" && p.v.impostor) return <>{reglas}<CelularImpostor {...p} />{cm}{emotes}{!p.v.impostor.palabras && podio}</>;
  if (p.v.motor === "turnos-cartas" && p.v.verdadReto) return <>{reglas}<CelularVerdadReto {...p} />{emotes}{podio}</>;
  if (p.v.motor === "fisico") return <>{reglas}<CelularFisico {...p} />{cm}{emotes}{podio}</>;
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
  // La decisión del anfitrión en «¿Coinciden?» también se bloquea al tocar (antes se podía mandar dos veces).
  const [decididas, setDecididas] = useState<string[]>([]);
  useEffect(() => { setTexto(""); setPista(""); setCuenta(0); setEleccion(null); setMarcas([]); setEmpate(null); setDecididas([]); setEnviado(null); }, [clave]);
  const yaEnvie = enviado === clave || recibido;
  // Un toque, un envío: mientras se manda, nada más se puede tocar; si falla, se puede volver a intentar.
  const contestar = async (valor: unknown) => { if (yaEnvie) return; setEnviado(clave); if (!(await mandar("contestar", { valor }))) setEnviado(null); };
  const soyTurno = v.turnoDe === yo;
  const mano = mi.miMano;
  const carta = v.carta;

  // Comodines (v1.74): en todos los juegos; mesero, castigos y trampas también al ver el resultado.
  const comodines = <>
    <EfectosComodines v={v} yo={yo} alElegir={i => void mandar("carta", { que: "camino", i })} />
    <SelectorComodines v={v} mi={mi} mandar={mandar} />
  </>;
  if (v.fase === "revelada") {
    const d = desenlace(v);
    return <Panel className="a-herr a-entra"><span className="a-kick">Resultado</span><span className="dsp ol a-t1">{d.titular}</span>{d.detalle && <p className="a-suave">{d.detalle}</p>}<p className="a-nota">Llevas {v.puntos[yo] ?? 0} {(v.puntos[yo] ?? 0) === 1 ? "punto" : "puntos"}</p>{comodines}</Panel>;
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
  const espera = <p className="cr-estado" role="status">{recibido ? "✓ La TV ya lo recibió" : "Enviado…"}</p>;
  // La carta del turno, con el color de su tipo (CartaTurno.tsx).
  const laCarta = (sello: string, tono = tonoDeMazo(carta?.tipo), txt: string | null = carta?.texto ?? "Sin carta para este nivel", extra?: ReactNode, k = "") =>
    <CartaTurno modo="celular" clave={claveCarta(v, k)} tono={tono} sello={sello} texto={txt ?? undefined} cartaId={carta?.id}>{extra}</CartaTurno>;

  let cuerpo: JSX.Element;
  switch (v.motor) {
    case "turnos-cartas": case "botella": case "ruleta": case "dados":
      cuerpo = soyTurno ? (
        <>
          <span className="a-kick">¡Te toca!</span>
          {laCarta(selloDe(v).sello)}
          {yaEnvie ? espera : v.efectos?.caminos ? null : <div className="cr-acciones">
            <BotonAccion tono="si" icono="✅" texto="Lo cumplí" onClick={() => void contestar("cumplio")} />
            {v.motor !== "dados" ? <BotonAccion tono="no" icono="✋" texto="No lo cumplí" sub="0 puntos" onClick={() => void contestar("paso")} />
              // Dados HOT: decir que no ya no es gratis (Maestro v1.72). Con Drunk se toma algo; sin Drunk resta 1.
              : v.drunk ? <BotonAccion tono="trago" icono="🥤" texto="Toma algo" sub="Lo que quieras · 0 puntos" onClick={() => void contestar("tomo")} />
              : <BotonAccion tono="no" icono="✋" texto="No lo hago" sub="−1 punto" onClick={() => void contestar("paso")} />}
          </div>}
        </>
      ) : <><span className="a-kick">{instruccion(v)}</span>{laCarta(selloDe(v).sello)}<p className="a-suave">Mira la pantalla y échale porras.</p></>;
      break;
    case "votacion": {
      const dos = v.jugadores.length === 2;
      const ops: ["a" | "b", string][] = [["a", carta?.texto ?? "A"], ["b", carta?.opcionB ?? "B"]];
      // Lo que ya mandé (con 2 es { eleccion, prediccion }): se marca en la carta.
      const mia = mi.miRespuesta as "a" | "b" | { eleccion?: "a" | "b"; prediccion?: "a" | "b" } | null;
      const marcada = yaEnvie ? (typeof mia === "string" ? mia : mia?.prediccion ?? null) : null;
      const prediciendo = dos && !!eleccion && !yaEnvie;
      const k = Math.min(...ops.map(([, t]) => escalaTexto(t)));
      const opciones = (
        <div className={"cr-ab" + (yaEnvie ? " apagada" : "")}>
          {ops.map(([op, t], i) => <Fragment key={op}>
            {i === 1 && <span className="cr-o" aria-hidden="true">o</span>}
            <button type="button" className={"cr-op " + op + (marcada === op ? " elegida" : "")} style={{ "--cr-k": k } as CSSProperties} disabled={yaEnvie}
              onClick={() => (prediciendo ? void contestar({ eleccion, prediccion: op }) : dos ? setEleccion(op) : void contestar(op))}><i aria-hidden="true">{op.toUpperCase()}</i>{t}</button>
          </Fragment>)}
        </div>
      );
      cuerpo = <>
        <span className="a-kick">{prediciendo ? `¿Qué crees que eligió ${nombreDe(v, v.jugadores.find(j => j.id !== yo)?.id)}?` : yaEnvie ? "Tu elección va en secreto" : "Elige en secreto"}</span>
        {laCarta(prediciendo ? "Adivina" : "¿Qué prefieres?", "votacion", null, opciones)}
        {yaEnvie ? espera : prediciendo && <button type="button" className="d-chip" onClick={() => setEleccion(null)}>Cambiar mi elección</button>}
      </>;
      break;
    }
    case "rol-secreto": {
      const m = (mi.mio ?? {}) as { rol?: string; palabra?: string; tema?: string };
      const impostor = m.rol === "impostor";
      cuerpo = (
        <>
          <Escaner secreto={impostor ? "Eres el impostor" : m.palabra ?? "…"} encabezado={impostor ? "TU PAPEL" : "PALABRA CLASIFICADA"} detalle={`Tema: ${m.tema ?? carta?.texto ?? ""}`} />
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
        const decidir = yo === (v.control ?? v.jugadores[0]?.id) ? v.pareja.porDecidir.filter(a => !decididas.includes(a)) : [];
        const respuestas = (ps: string[]) => <ul className="a-lista">{ps.map(id => <li key={id}><b>{id === yo ? "Tú" : nombreDe(v, id)}:</b> {textos[id] ?? "…"}</li>)}</ul>;
        const decide = async (a: string, coinciden: boolean) => { setDecididas(xs => [...xs, a]); if (!(await mandar("contestar", { valor: { decide: a, coinciden } }))) setDecididas(xs => xs.filter(x => x !== a)); };
        cuerpo = <>
          {mia ? <>
            <span className="a-kick">¿Coinciden?</span>
            {m.pregunta && laCarta("Tu pareja", "pareja", m.pregunta, undefined, "calificar")}
            {respuestas(mia)}
            {yaEnvie ? espera : <div className="cr-acciones">
              <BotonAccion tono="si" icono="💞" texto="Sí coinciden" sub="+2 a cada uno si los dos dicen que sí" onClick={() => void contestar("si")} />
              <BotonAccion tono="no" icono="💔" texto="No coinciden" onClick={() => void contestar("no")} />
            </div>}
          </> : <p className="a-suave">Las parejas marcan si coinciden. Mira la pantalla.</p>}
          {decidir.map(a => {
            const par = v.pareja!.parejas.find(x => x[0] === a) ?? [a];
            return <div key={a} className="cr-zona">
              <span className="a-kick">{lista2(par.map(id => nombreDe(v, id)))} no se ponen de acuerdo. Decides tú</span>
              {respuestas(par)}
              <div className="cr-acciones">
                <BotonAccion tono="si" icono="💞" texto="Sí coinciden" onClick={() => void decide(a, true)} />
                <BotonAccion tono="no" icono="💔" texto="No coinciden" onClick={() => void decide(a, false)} />
              </div>
            </div>;
          })}
        </>;
        break;
      }
      cuerpo = !meToca ? <p className="a-suave">Esta ronda la juegan las parejas. Mira la pantalla.</p> : (
        <><span className="a-kick">{m.papel === "adivina" ? "Adivina lo que contestó tu pareja" : "Contesta sobre ti: tu pareja va a adivinar"}</span>
          {laCarta("Tu pareja", "pareja", m.pregunta ?? "…")}
          {yaEnvie ? espera : <form className="cr-zona" onSubmit={e => { e.preventDefault(); if (texto.trim()) void contestar(texto.trim()); }}>
            <input className="a-input" value={texto} maxLength={120} onChange={e => setTexto(e.target.value)} placeholder="Escribe aquí" aria-label="Tu respuesta" />
            <div className="cr-acciones uno"><BotonAccion tipo="submit" icono="✍️" texto="Enviar" desactivado={!texto.trim()} /></div>
          </form>}</>
      );
      break;
    }
    case "conteo": {
      const palabras = ((mi.mio ?? {}) as { palabras?: { palabra: string; prohibidas: string[] }[] }).palabras;
      const tope = palabras ? palabras.length : 40;
      if (palabras && soyTurno && !yaEnvie) {
        // Mímica y Descríbelo (Elías, 27 nov, 3A): quien actúa toca quién adivinó cada palabra en el momento.
        // La palabra de ahora es la carta: cada palabra nueva se reparte.
        const actual = palabras[marcas.length];
        const marcar = (x: string) => setMarcas(ms => (ms.length < palabras.length ? [...ms, x] : ms));
        const conTachadas = palabras.some(x => x.prohibidas.length > 0);
        const enviar = () => void contestar({ adivinos: marcas.filter(x => x !== "x" && x !== "p"), tachadas: marcas.filter(x => x === "x").length });
        cuerpo = <>
          {actual ? <>
            <span className="a-kick">Te toca · {v.juegoId === "prohibida" ? "descríbela sin decirla" : "actúala sin hablar"}</span>
            {laCarta(`Palabra ${marcas.length + 1} de ${palabras.length}`, "palabra", actual.palabra,
              actual.prohibidas.length > 0 ? <ul className="cr-tachadas" aria-label="Sin decir">{actual.prohibidas.map(p => <li key={p}>{p}</li>)}</ul> : undefined, `p${marcas.length}`)}
            <span className="a-kick">¿Quién adivinó «{actual.palabra}»?</span>
            <div className="a-fila a-envuelve">{v.jugadores.filter(j => j.id !== yo).map(j => <button key={j.id} type="button" className="d-chip" onClick={() => marcar(j.id)}>{j.nombre}</button>)}</div>
            <div className="a-fila a-envuelve">
              <button type="button" className="d-chip" onClick={() => marcar("p")}>Pasar</button>
              {conTachadas && <button type="button" className="d-chip" onClick={() => marcar("x")}>Dijo una tachada</button>}
            </div>
          </> : <p className="cr-estado" role="status">¡Se acabaron las palabras!</p>}
          <ol className="a-palabras">{palabras.map((x, i) => {
            const mk = marcas[i];
            const estado = mk === undefined ? (i === marcas.length ? "actual" : "") : mk === "x" ? "tachada" : mk === "p" ? "pasada" : "hecha";
            return <li key={i} className={estado}><b>{x.palabra}</b>{x.prohibidas.length > 0 && <small>Sin decir: {x.prohibidas.join(", ")}</small>}
              {mk && mk !== "x" && mk !== "p" && <small>Adivinó {nombreDe(v, mk)}</small>}</li>;
          })}</ol>
          {marcas.length > 0 && <button type="button" className="d-chip" onClick={() => setMarcas(ms => ms.slice(0, -1))}>Deshacer la última</button>}
          <div className="cr-acciones uno"><BotonAccion icono="🏁" texto="Terminé" sub="+1 a ti y +1 a quien adivinó, por palabra" onClick={enviar} /></div>
        </>;
        break;
      }
      const sello = selloDe(v).sello;
      cuerpo = !soyTurno ? <><span className="a-kick">{instruccion(v)}</span>{laCarta(sello, "palabra")}</> : yaEnvie ? <><span className="a-kick">Tu cuenta</span>{laCarta(sello, "palabra")}{espera}</> : (
        <><span className="a-kick">¡Te toca!</span>
          {laCarta(sello, "palabra")}
          {palabras && <ol className="a-palabras">{palabras.map((p, i) => <li key={i} className={i < cuenta ? "hecha" : ""}><b>{p.palabra}</b>{p.prohibidas.length > 0 && <small>Sin decir: {p.prohibidas.join(", ")}</small>}</li>)}</ol>}
          <div className="a-contador"><button type="button" className="a-atras" onClick={() => setCuenta(c => Math.max(0, c - 1))} aria-label="Una menos">−</button><b className="dsp ol a-num" aria-live="polite">{cuenta}</b><button type="button" className="a-atras" onClick={() => setCuenta(c => Math.min(tope, c + 1))} aria-label="Una más">+</button></div>
          <div className="cr-acciones uno"><BotonAccion icono="🏁" texto="Terminé" sub="Envía cuántas lograste" onClick={() => void contestar(cuenta)} /></div></>
      );
      break;
    }
    case "confesion":
      cuerpo = <><span className="a-kick">{yaEnvie ? "Tu respuesta va en secreto" : "Contesta en secreto"}</span>{laCarta("Yo nunca…", "confesion")}
        {yaEnvie ? espera : <div className="cr-acciones">
          <BotonAccion tono="trago" icono="🙋" texto="Sí lo he hecho" onClick={() => void contestar("si")} />
          <BotonAccion tono="a" icono="🙅" texto="Nunca" onClick={() => void contestar("no")} />
        </div>}</>;
      break;
    case "senalar":
      cuerpo = <><span className="a-kick">{yaEnvie ? "Tu voto va en secreto" : "Señala a alguien"}</span>{laCarta("¿Quién es más probable?", "senalar")}
        {yaEnvie ? espera : <Elegir gente={v.jugadores} miembros={miembros} clave={clave} titulo="¿Quién?" alElegir={id => void contestar(id)} />}</>;
      break;
    case "competencia": {
      // La explicación del reto (va en «tipo») se lee dentro de la carta.
      const cartaReto = <CartaTurno modo="celular" clave={claveCarta(v)} tono="competencia" sello="Reto del lugar" texto={carta?.texto ?? "Sin carta para este nivel"} detalle={carta?.tipo} cartaId={carta?.id} />;
      cuerpo = meToca && !yaEnvie ? <>{cartaReto}
        {empate ? <>
          {/* Empate (Elías, 27 nov): +1 a cada quien empató. */}
          <span className="a-kick">¿Quiénes empataron?</span>
          <div className="a-fila a-envuelve">{v.jugadores.map(j => {
            const on = empate.includes(j.id);
            return <button key={j.id} type="button" className={"d-chip" + (on ? " on" : "")} aria-pressed={on} onClick={() => setEmpate(xs => xs && (on ? xs.filter(x => x !== j.id) : [...xs, j.id]))}>{j.nombre}</button>;
          })}</div>
          <div className="cr-acciones">
            <BotonAccion icono="🤝" texto="Empataron" sub="+1 a cada quien" desactivado={empate.length < 2} onClick={() => void contestar(empate)} />
            <BotonAccion tono="a" icono="↩️" texto="Volver" onClick={() => setEmpate(null)} />
          </div>
        </> : <>
          <span className="a-kick">Marca quién ganó</span><Elegir gente={v.jugadores} miembros={miembros} clave={clave} titulo="¿Quién ganó?" confirmar="Ganó" alElegir={id => void contestar(id)} />
          <div className="a-fila a-envuelve">
            <button type="button" className="d-chip" onClick={() => setEmpate([])}>Empate</button>
            <button type="button" className="d-chip" onClick={() => void contestar("nadie")}>Nadie ganó</button>
          </div>
        </>}</>
        : <>{cartaReto}{meToca ? espera : <p className="a-suave">El anfitrión marca quién ganó.</p>}</>;
      break;
    }
    case "fisico": // tiene su propia pantalla (CelularFisico)
      cuerpo = <></>;
      break;
  }
  return <section className="a-herr cr-zona" aria-label="Tu turno">{cuerpo}{cartas}{comodines}{v.cartaUsada && v.cartaUsada.ronda === v.ronda && <Chip texto={`${nombreDe(v, v.cartaUsada.jugador)} usó ${comodinPorId(v.cartaUsada.carta)?.nombre ?? CARTAS_PODER.find(c => c.id === v.cartaUsada!.carta)?.nombre ?? "un comodín"}`} icono="bolt" />}</section>;
}
