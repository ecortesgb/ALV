// El celular de cada jugador durante una partida de la sala. La pantalla grande (anfitrión) corre el motor;
// aquí solo se ve lo público, el dato secreto propio y la herramienta que toca. Las respuestas van a «acciones».
import { useEffect, useRef, useState } from "react";
import { JUEGOS, SECCIONES } from "../content/catalogo";
import type { VistaPublica } from "../engine/vistas";
import { Avatar } from "./Avatar";
import { aviso, NOMBRE_CARTA_PODER } from "./comun";
import { useEstado } from "./estado";
import { enviarAccion, miSecreto, miUid, partidaDeSala, type PartidaPublicada } from "./nube";
import { personajeInicial } from "../content/personaje";
import { sonar } from "./sonido";
import { BotonVoto, ChipHerramienta, PanelHerramienta, Rondas } from "./Hud";

interface Secreto { mio?: Record<string, unknown> | null; miRespuesta?: unknown; miMano?: string[] }

/** Vigila si el anfitrión empezó una partida; mientras haya una en juego, la muestra. */
export function useAPartidaDeSala() {
  const s = useEstado();
  const [p, setP] = useState<PartidaPublicada | null>(null);
  const sala = s.sala;
  useEffect(() => {
    if (!sala || sala.anfitrion) { setP(null); return; }
    let vivo = true;
    const leer = async () => { const x = await partidaDeSala(sala); if (vivo) setP(x && !x.terminada && Object.keys(x.estado).length > 0 ? x : null); };
    void leer();
    const t = window.setInterval(() => { if (document.visibilityState === "visible") void leer(); }, 1500);
    return () => { vivo = false; window.clearInterval(t); };
  }, [sala?.id, sala?.anfitrion]);
  return p;
}

export function PartidaCelular({ p }: { p: PartidaPublicada }) {
  const s = useEstado();
  const v = p.estado as unknown as VistaPublica;
  const [yo, setYo] = useState<string | null>(null);
  const [sec, setSec] = useState<Secreto>({});
  const [enviado, setEnviado] = useState<string | null>(null);
  useEffect(() => { void miUid().then(u => setYo(u ? `c-${u}` : null)); }, []);
  useEffect(() => { let vivo = true; void miSecreto(p.id).then(x => { if (vivo) setSec((x ?? {}) as Secreto); }); return () => { vivo = false; }; }, [p.id, p.version]);
  // Lo enviado se olvida al cambiar de ronda.
  useEffect(() => setEnviado(null), [v.ronda, v.fase]);

  const juego = JUEGOS.find(j => j.id === v.juegoId);
  const nombre = (id?: string) => v.jugadores.find(j => j.id === id)?.nombre ?? "";
  const miembro = (id: string) => s.miembros?.find(m => `c-${m.id}` === id);
  const yaConteste = !!yo && (v.contestaron.includes(yo) || enviado === `${v.ronda}`);

  const mandar = async (tipo: "contestar" | "carta", datos: Record<string, unknown>) => {
    if (!yo) return;
    const ok = await enviarAccion(p.id, `m${yo.slice(2, 10)}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`, tipo, datos);
    if (!ok) { aviso("No se pudo enviar. Revisa tu señal y vuelve a intentar."); sonar("error"); return; }
    sonar("exito");
    if (tipo === "contestar") setEnviado(`${v.ronda}`);
  };

  let herramienta: React.ReactNode = null;
  if (v.fase === "revelada") {
    herramienta = <p className="hint" style={{ textAlign: "center" }}>👀 Miren la pantalla grande: ya se reveló la ronda.</p>;
  } else if (!yo) {
    herramienta = <p className="hint">Conectando…</p>;
  } else if (yaConteste) {
    herramienta = <p className="hint" style={{ textAlign: "center" }}>✅ Listo. Espera a los demás.</p>;
  } else {
    herramienta = <Herramienta v={v} yo={yo} sec={sec} mandar={mandar} nombre={nombre} />;
  }

  return (
    <section className="card celular-partida" aria-labelledby="t-cel">
      <header className="hud-partida hud-celular">
        <span className="hud-juego">
          <span className="sigla" id="t-cel">{juego?.sigla ?? (juego ? SECCIONES[juego.seccion].sigla : "ALV")}</span>
          <span className="pila" style={{ gap: 4, minWidth: 0 }}>
            <b className="hud-nombre">{juego?.nombre}</b>
            <ChipHerramienta motor={v.motor} />
          </span>
        </span>
        <Rondas ronda={v.ronda} total={v.totalRondas} />
      </header>
      {v.carta?.texto && v.motor !== "conteo" && <div className="carta" style={{ height: "auto", minHeight: 120 }}><div className="cara"><p style={{ fontSize: 22 }}>{v.carta.texto}</p>{v.carta.opcionB && <p style={{ margin: 0, fontSize: 18, color: "var(--cyan)" }}>o… {v.carta.opcionB}</p>}</div></div>}
      <PanelHerramienta motor={v.motor}>{herramienta}</PanelHerramienta>
      <div className="marcador" aria-label="Puntos">
        {[...v.jugadores].sort((a, b) => (v.puntos[b.id] ?? 0) - (v.puntos[a.id] ?? 0)).map((j, i) => (
          <div key={j.id} className={"lugar" + (j.id === yo ? " activo" : "")}>
            <Avatar p={miembro(j.id)?.personaje ?? personajeInicial(i)} size={28} nombre={j.nombre} />
            <b>{j.id === yo ? "Tú" : j.nombre}</b>
            <span>{v.puntos[j.id] ?? 0}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Herramienta({ v, yo, sec, mandar, nombre }: {
  v: VistaPublica; yo: string; sec: Secreto; nombre: (id?: string) => string;
  mandar: (tipo: "contestar" | "carta", datos: Record<string, unknown>) => Promise<void>;
}) {
  const turno = ["turnos-cartas", "botella", "ruleta", "dados", "conteo"].includes(v.motor);
  if (turno && v.turnoDe !== yo) return <p className="hint" style={{ textAlign: "center" }}>Le toca a <b>{nombre(v.turnoDe)}</b>. Mira la pantalla grande.</p>;

  switch (v.motor) {
    case "turnos-cartas": case "botella": case "ruleta": case "dados": {
      const mano = sec.miMano ?? [];
      return (
        <div className="pila">
          <b className="tu-turno">¡Es tu turno!</b>
          <div className="controles">
            <button className="control paso" onClick={() => void mandar("contestar", { valor: "paso" })}><span aria-hidden="true">←</span>Paso</button>
            <button className="control cumpli" onClick={() => void mandar("contestar", { valor: "cumplio" })}><span aria-hidden="true">✓</span>Cumplí</button>
          </div>
          {mano.length > 0 && (
            <div className="mano">
              {mano.map((c, i) => <button key={c + i} className="poder" onClick={() => void mandar("carta", { carta: c })}><b>{NOMBRE_CARTA_PODER[c]}</b><small>Usar</small></button>)}
            </div>
          )}
          <p className="hint">Pasar no tiene castigo.</p>
        </div>
      );
    }
    case "votacion": return <Votar v={v} mandar={mandar} />;
    case "rol-secreto": return <Impostor v={v} yo={yo} sec={sec} mandar={mandar} />;
    case "pareja": return <Pareja sec={sec} mandar={mandar} />;
    case "conteo": return <Conteo v={v} sec={sec} mandar={mandar} />;
    case "confesion":
      return (
        <div className="controles">
          <button className="control cumpli" onClick={() => void mandar("contestar", { valor: "si" })}><span aria-hidden="true">🙋</span>Yo sí</button>
          <button className="control paso" onClick={() => void mandar("contestar", { valor: "no" })}><span aria-hidden="true">🙅</span>Yo no</button>
        </div>
      );
    case "senalar":
      return (
        <div className="pila">
          <span className="label">Señala en secreto</span>
          {v.jugadores.map((j, i) => <BotonVoto key={j.id} letra={String(i + 1)} onClick={() => void mandar("contestar", { valor: j.id })}>{j.id === yo ? "Yo" : j.nombre}</BotonVoto>)}
        </div>
      );
    case "competencia":
      return <p className="hint" style={{ textAlign: "center" }}>¡A competir! El anfitrión marca quién ganó.</p>;
  }
}

function Votar({ v, mandar }: { v: VistaPublica; mandar: (t: "contestar", d: Record<string, unknown>) => Promise<void> }) {
  const [eleccion, setEleccion] = useState<"a" | "b" | null>(null);
  const dos = v.jugadores.length === 2;
  if (dos && eleccion) {
    return (
      <div className="pila">
        <span className="label">Ahora adivina qué eligió tu rival</span>
        <BotonVoto letra="A" onClick={() => void mandar("contestar", { valor: { eleccion, prediccion: "a" } })}>{v.carta?.texto}</BotonVoto>
        <BotonVoto letra="B" onClick={() => void mandar("contestar", { valor: { eleccion, prediccion: "b" } })}>{v.carta?.opcionB}</BotonVoto>
      </div>
    );
  }
  const elegir = (x: "a" | "b") => (dos ? setEleccion(x) : void mandar("contestar", { valor: x }));
  return (
    <div className="pila">
      <span className="label">Elige en secreto</span>
      <BotonVoto letra="A" onClick={() => elegir("a")}>{v.carta?.texto}</BotonVoto>
      <BotonVoto letra="B" onClick={() => elegir("b")}>{v.carta?.opcionB}</BotonVoto>
    </div>
  );
}

/** Mantener presionado para ver; al soltar se tapa. */
function Ver({ children }: { children: React.ReactNode }) {
  const [ver, setVer] = useState(false);
  return (
    <button className="btn cortina-celular" onPointerDown={() => setVer(true)} onPointerUp={() => setVer(false)} onPointerLeave={() => setVer(false)}
      onKeyDown={e => { if (e.key === " " || e.key === "Enter") setVer(true); }} onKeyUp={() => setVer(false)}>
      {ver ? children : "Mantén presionado para ver tu secreto"}
    </button>
  );
}

function Impostor({ v, yo, sec, mandar }: { v: VistaPublica; yo: string; sec: Secreto; mandar: (t: "contestar", d: Record<string, unknown>) => Promise<void> }) {
  const mio = sec.mio as { rol?: string; palabra?: string; tema?: string } | null | undefined;
  return (
    <div className="pila">
      <span className="label">Tema: {mio?.tema ?? v.carta?.texto}</span>
      {mio ? <Ver>{mio.rol === "impostor" ? <b style={{ color: "var(--red)" }}>¡ERES EL IMPOSTOR!</b> : <b className="secreto">{mio.palabra}</b>}</Ver> : <p className="hint">Cargando tu secreto…</p>}
      <span className="label">Cuando hablen todos, vota: ¿quién es el impostor?</span>
      {v.jugadores.filter(j => j.id !== yo).map(j => <button key={j.id} className="btn" onClick={() => void mandar("contestar", { valor: j.id })}>{j.nombre}</button>)}
    </div>
  );
}

function Pareja({ sec, mandar }: { sec: Secreto; mandar: (t: "contestar", d: Record<string, unknown>) => Promise<void> }) {
  const mio = sec.mio as { pregunta?: string; papel?: string } | null | undefined;
  const [texto, setTexto] = useState("");
  if (!mio) return <p className="hint" style={{ textAlign: "center" }}>En esta ronda no te toca contestar.</p>;
  return (
    <div className="pila">
      <span className="label">{mio.papel === "contesta" ? "Contesta sobre ti" : "Adivina qué contestó tu pareja"}</span>
      <h2>{mio.pregunta}</h2>
      <input className="input" value={texto} maxLength={120} onChange={e => setTexto(e.target.value)} placeholder="Tu respuesta secreta" />
      <button className="btn principal" disabled={!texto.trim()} onClick={() => void mandar("contestar", { valor: texto })}>Enviar en secreto</button>
    </div>
  );
}

/** Contra reloj en tu celular: cuentas tú; en Mímica y Prohibida ves las palabras solo tú. */
function Conteo({ v, sec, mandar }: { v: VistaPublica; sec: Secreto; mandar: (t: "contestar", d: Record<string, unknown>) => Promise<void> }) {
  const palabras = ((sec.mio as { palabras?: { palabra: string; prohibidas: string[] }[] } | null)?.palabras) ?? [];
  const total = v.segundos ?? 30;
  const [etapa, setEtapa] = useState<"listo" | "jugando" | "fin">("listo");
  const [t, setT] = useState(total);
  const [cuenta, setCuenta] = useState(0);
  const [i, setI] = useState(0);
  const fin = useRef(false);
  useEffect(() => {
    if (etapa !== "jugando") return;
    const iv = window.setInterval(() => setT(x => { if (x <= 1) { setEtapa("fin"); return 0; } return x - 1; }), 1000);
    return () => window.clearInterval(iv);
  }, [etapa]);
  const conPalabras = v.mazo === "palabra";
  const actual = palabras[i];
  const siguiente = (ok: boolean) => { if (ok) setCuenta(c => c + 1); if (i + 1 >= palabras.length) setEtapa("fin"); else setI(i + 1); };
  return (
    <div className="pila">
      {!conPalabras && <div className="carta" style={{ height: "auto", minHeight: 100 }}><div className="cara"><p style={{ fontSize: 22 }}>{v.carta?.texto}</p></div></div>}
      <div className="temporizador"><span style={{ width: `${(t / total) * 100}%` }} className={t <= 5 ? "fin" : ""} /><b>{t}</b></div>
      {etapa === "listo" && <button className="btn principal" onClick={() => setEtapa("jugando")}>¡Arranca! · {total} s</button>}
      {etapa === "jugando" && conPalabras && actual && (
        <>
          <div className="carta" style={{ height: "auto", minHeight: 140 }}><div className="cara" style={{ textAlign: "center" }}>
            <p style={{ fontSize: 32 }}>{actual.palabra}</p>
            {actual.prohibidas.length > 0 && <div className="fila" style={{ justifyContent: "center", flexWrap: "wrap" }}>{actual.prohibidas.map(x => <span key={x} className="chip pink" style={{ textDecoration: "line-through" }}>{x}</span>)}</div>}
          </div></div>
          <div className="tres" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <button className="btn" onClick={() => siguiente(false)}>Pasar palabra</button>
            <button className="btn lime" onClick={() => siguiente(true)}>¡Adivinaron! +1</button>
          </div>
        </>
      )}
      {etapa === "jugando" && !conPalabras && <button className="btn lime contador" onClick={() => setCuenta(c => Math.min(40, c + 1))}>+1 · llevan {cuenta}</button>}
      {etapa === "fin" && (
        <button className="btn principal" disabled={fin.current} onClick={() => { fin.current = true; void mandar("contestar", { valor: cuenta }); }}>Guardar {cuenta} puntos</button>
      )}
    </div>
  );
}
