// Editor del personaje (6 pasos del armador) y la Tienda de accesorios, que vive en su propia pestaña.
import { useState } from "react";
import { crearAzar } from "../engine/azar";
import { nivelPorXp, tituloPorNivel, xpParaNivel, PRECIO_CARTAS } from "../engine/economia";
import { PASOS, PIEZAS, piezaEquipo, TIENDA, ZONAS, personajeAlAzar, rutaPieza, type Paso } from "../content/personaje";
import { rarezaDe, SOBRES, type CartaSobre, type TipoSobre } from "../engine/sobres";
import { AperturaSobre, PaqueteSobre, TarjetaArticulo } from "./Tarjetas";
import { sonar } from "./sonido";
import { CARTAS_PODER } from "../content/catalogo";
import { Avatar, IconoAdorno } from "./Avatar";
import { acciones, comprarAccesorio, comprarSobre, saldosDe, type JugadorLocal } from "./estado";
import { aviso } from "./comun";


export function NivelYSaldos({ j }: { j: JugadorLocal }) {
  const s = saldosDe(j);
  const nivel = nivelPorXp(s.acumulada);
  const desde = xpParaNivel(nivel), hasta = xpParaNivel(nivel + 1);
  const avance = Math.round(((s.acumulada - desde) / (hasta - desde)) * 100);
  return (
    <div className="pila">
      <div className="entre">
        <span><span className="sigla" style={{ fontSize: 22 }}>NV {nivel}</span> <span className="muted" style={{ fontWeight: 800 }}>· {tituloPorNivel(nivel)}</span></span>
        <span className="hint">{s.acumulada - desde} / {hasta - desde} XP</span>
      </div>
      <div className="barra"><span style={{ width: `${avance}%` }} /></div>
      <div className="saldos">
        <div className="saldo"><b>{s.acumulada}</b><small>XP acumulada · tu nivel</small></div>
        <div className="saldo"><b style={{ color: "var(--lime)" }}>{s.disponible}</b><small>XP disponible · accesorios</small></div>
        <div className="saldo"><b style={{ color: "var(--cyan)" }}>{s.delEvento}</b><small>XP del evento · cartas</small></div>
      </div>
    </div>
  );
}

export function EditorPersonaje({ j }: { j: JugadorLocal }) {
  const [tab, setTab] = useState<Paso>("piel");
  const [emote, setEmote] = useState<{ k: string; clave: number } | null>(null);
  const p = j.personaje;
  const animar = (k: string) => { sonar(k === "festejar" ? "exito" : "clic"); setEmote({ k, clave: Date.now() }); };
  return (
    <div className="pila">
      <div className="vitrina">
        <span key={emote?.clave ?? 0} className={"emote" + (emote ? " e-" + emote.k : "")} onAnimationEnd={() => setEmote(null)}>
          <Avatar p={p} size={150} nombre={j.nombre} articulado />
        </span>
      </div>
      <div className="chips" role="group" aria-label="Animaciones del personaje" style={{ justifyContent: "center" }}>
        {([["saludar", "👋 Saludo"], ["festejar", "🏆 Festejo"], ["bailar", "🕺 Baile"], ["aplaudir", "👏 Aplauso"], ["robot", "🤖 Robot"], ["caminar", "🚶 Caminar"], ["mirar", "👀 Mirar"]] as const).map(([k, n]) => (
          <button key={k} className="opcion" onClick={() => animar(k)}>{n}</button>
        ))}
      </div>
      <div className="entre">
        <b>{j.nombre}</b>
        <button className="btn sm" onClick={() => acciones.personaje(j.id, personajeAlAzar(p, crearAzar(Date.now() % 1e6)))}>🎲 Al azar</button>
      </div>
      <div className="pestanas" role="tablist">
        {PASOS.map(s => <button key={s.k} role="tab" aria-current={tab === s.k} onClick={() => setTab(s.k)}>{s.nombre}</button>)}
      </div>
      <Piezas j={j} paso={tab} />
    </div>
  );
}

function Piezas({ j, paso }: { j: JugadorLocal; paso: Paso }) {
  const st = PASOS.find(s => s.k === paso)!;
  const actual = j.personaje[paso];
  const equipoDe = j.personaje.equipo?.id ?? j.equipo;
  const nivel = nivelPorXp(saldosDe(j).acumulada);
  return (
    <div className="pila">
      <span className="label">{st.titulo}</span>
      {st.nota && <p className="hint">{st.nota}</p>}
      <div className="piezas">
        {st.opcional && (
          <button className="pieza" aria-pressed={actual === null} aria-label="Sin" onClick={() => acciones.personaje(j.id, { [paso]: null })}>
            <span className="muted" style={{ fontWeight: 800 }}>Sin</span>
          </button>
        )}
        {PIEZAS[paso].filter(x => { const pe = piezaEquipo(x.id); return !pe || pe.equipo === equipoDe; }).map(x => {
          const pe = piezaEquipo(x.id);
          const bloqueada = !!pe && nivel < pe.nivel;
          return (
            <button key={x.id} className={"pieza" + (pe ? " de-equipo" : "")} aria-pressed={actual === x.id} disabled={bloqueada}
              aria-label={x.nombre + (bloqueada ? `, se desbloquea en nivel ${pe!.nivel}` : "")} title={x.nombre} onClick={() => acciones.personaje(j.id, { [paso]: x.id })}>
              <img src={rutaPieza(x.id, true)} alt="" loading="lazy" />
              {pe && <span className="pieza-equipo">{bloqueada ? `🔒 ${pe.nivel}` : "★"}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const nombreArticulo = (id: string) => TIENDA.find(a => a.id === id)?.nombre ?? id;
const arteArticulo = (id: string) => (TIENDA.find(a => a.id === id)?.pieza ? <img src={rutaPieza(id, true)} alt="" /> : <IconoAdorno id={id} />);

/** Sobres: se compran con XP disponible y se abren con la animación de apertura. */
function Sobres({ j }: { j: JugadorLocal }) {
  const [abierto, setAbierto] = useState<{ tipo: TipoSobre; cartas: CartaSobre[] } | null>(null);
  const s = saldosDe(j), nivel = nivelPorXp(s.acumulada);
  const [ocupado, setOcupado] = useState(false);
  const faltan = TIENDA.filter(a => !j.tiene.includes(a.id)).length;
  const abrir = async (tipo: TipoSobre) => {
    if (ocupado) return;
    setOcupado(true);
    const r = await comprarSobre(j.id, tipo, crearAzar((Math.random() * 0xffffffff) >>> 0));
    setOcupado(false);
    if (!r.ok) { aviso(r.motivo); return; }
    setAbierto({ tipo, cartas: r.cartas });
  };
  const def = abierto ? SOBRES.find(x => x.id === abierto.tipo) : null;
  return (
    <div className="pila">
      <p className="hint">Cada sobre trae accesorios que todavía no tienes ({faltan} por descubrir). Pagas con tu <b style={{ color: "var(--lime)" }}>XP disponible ({s.disponible})</b>.</p>
      <div className="lista-sobres">
        {SOBRES.map(d => {
          const bloqueado = nivel < d.nivel, alcanza = s.disponible >= d.precio;
          const prob = Math.round((d.pesos.epica + d.pesos.legendaria) / Object.values(d.pesos).reduce((a, b) => a + b, 0) * 100);
          return (
            <section key={d.id} className={"ficha-sobre " + d.id} aria-labelledby={`t-${d.id}`}>
              <PaqueteSobre tipo={d.id} />
              <div className="fs-cuerpo">
                <h3 id={`t-${d.id}`}>{d.nombre}</h3>
                <div className="fs-stats">
                  <span><b>{d.cartas}</b><small>Cartas</small></span>
                  <span><b>{prob}%</b><small>Épica o más</small></span>
                  <span><b>{d.nivel}</b><small>Nivel mín.</small></span>
                </div>
                {bloqueado ? <span className="chip pink">Se desbloquea en nivel {d.nivel}</span> : (
                  <button className={"precio" + (alcanza ? "" : " corto")} disabled={!alcanza || ocupado} onClick={() => void abrir(d.id)}>
                    {alcanza ? <>Abrir · <b>{d.precio}</b> XP</> : <>Faltan <b>{d.precio - s.disponible}</b> XP</>}
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
      {abierto && def && <AperturaSobre def={def} cartas={abierto.cartas} nombreDe={nombreArticulo} arteDe={arteArticulo} cerrar={() => setAbierto(null)} />}
    </div>
  );
}

type PestanaTienda = "sobres" | "accesorios" | "comodines";

export function Tienda({ j }: { j: JugadorLocal }) {
  const s = saldosDe(j);
  const nivel = nivelPorXp(s.acumulada);
  const [tab, setTab] = useState<PestanaTienda>("sobres");
  const [probando, setProbando] = useState<string | null>(null);
  const probar = (id: string) => { sonar("clic"); setProbando(p => (p === id ? null : id)); };
  const TABS: [PestanaTienda, string][] = [["sobres", "Sobres"], ["accesorios", "Accesorios"], ["comodines", "Comodines"]];
  return (
    <div className="tienda-juego">
      <Probador j={j} articulo={probando} quitar={() => setProbando(null)} />
      <div className="pila tienda-contenido">
      <Destacado j={j} probar={id => { setTab("accesorios"); probar(id); }} />
      <div className="pestanas-menu" role="tablist" aria-label="Secciones de la tienda">
        {TABS.map(([k, n]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{n}{k === "accesorios" && (j.nuevos?.length ?? 0) > 0 && <i className="burbuja-nuevos" aria-label={`${j.nuevos!.length} nuevos`}>{j.nuevos!.length}</i>}</button>)}
      </div>
      {tab === "sobres" && <Sobres j={j} />}
      {tab === "accesorios" && (
        <>
          <p className="hint">Todo es para lucir: nada da ventaja. La corona del ALV vigente, las medallas de victoria y el delantal del mesero no se venden: se ganan.</p>
          {ZONAS.map(([zona, nombreZona]) => (
            <div className="pila" key={zona}>
              <span className="label">{nombreZona}</span>
              <div className="rejilla-tarjetas">
                {TIENDA.filter(a => a.zona === zona).map(a => {
                  const tiene = j.tiene.includes(a.id), puesto = j.personaje.puesto[zona] === a.id;
                  const bloqueado = nivel < a.nivel, alcanza = s.disponible >= a.precio;
                  return (
                    <TarjetaArticulo key={a.id} rareza={rarezaDe(a.precio)} arte={arteArticulo(a.id)} nombre={a.nombre} puesto={puesto}
                      alTocar={() => { probar(a.id); if (j.nuevos?.includes(a.id)) acciones.verNuevos(j.id, [a.id]); }} activa={probando === a.id} nuevo={j.nuevos?.includes(a.id)}
                      etiqueta={puesto ? "Puesto" : tiene ? "Tuyo" : undefined}>
                      {tiene ? (
                        <button className={"btn sm" + (puesto ? " on" : "")} onClick={() => acciones.ponerse(j.id, a.id)}>{puesto ? "Quitar" : "Ponérmelo"}</button>
                      ) : bloqueado ? (
                        <span className="chip pink">Nivel {a.nivel}</span>
                      ) : (
                        <button className={"precio sm" + (alcanza ? "" : " corto")} disabled={!alcanza}
                          onClick={async () => { const m = await comprarAccesorio(j.id, a.id); if (!m) sonar("exito"); aviso(m ?? `¡${a.nombre} es tuyo!`); }}>
                          <b>{a.precio}</b> XP
                        </button>
                      )}
                    </TarjetaArticulo>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
      {tab === "comodines" && (
        <>
          <p className="hint">Los comodines (cartas de poder) se compran dentro de una partida, solo con la <b style={{ color: "var(--cyan)" }}>XP de este evento ({s.delEvento})</b>: el 1.º cuesta {PRECIO_CARTAS[0]}, el 2.º {PRECIO_CARTAS[1]} y el 3.º {PRECIO_CARTAS[2]}. Máximo 3 por partida. También se ganan: 1 por cada 3 retos cumplidos. Al cerrar el evento caducan.</p>
          <div className="rejilla-tarjetas">
            {CARTAS_PODER.map(c => <TarjetaArticulo key={c.id} rareza="poder" arte={<span className="ta-sigla">{c.nombre.slice(0, 2).toUpperCase()}</span>} nombre={c.nombre} detalle={c.efecto} />)}
          </div>
        </>
      )}
      </div>
    </div>
  );
}

/** Probador: tu personaje con el artículo que tocaste puesto, para verlo antes de comprar. */
function Probador({ j, articulo, quitar }: { j: JugadorLocal; articulo: string | null; quitar: () => void }) {
  const a = TIENDA.find(x => x.id === articulo);
  const p = a ? { ...j.personaje, puesto: { ...j.personaje.puesto, [a.zona]: a.id } } : j.personaje;
  return (
    <aside className={"probador" + (a ? " con-articulo" : "")} aria-label="Probador">
      <span className="probador-luz" aria-hidden="true" />
      <span key={articulo ?? "nada"} className="probador-cuerpo"><Avatar p={p} size={150} nombre={j.nombre} articulado /></span>
      <div className="probador-info">
        {a ? <><span className="label">Probándote</span><b>{a.nombre}</b><button className="btn sm" onClick={quitar}>Quitar</button></>
           : <><span className="label">Probador</span><small className="muted">Toca un accesorio para vértelo puesto.</small></>}
      </div>
    </aside>
  );
}

/** Destacado del día: un accesorio que todavía no tienes, distinto cada día. */
function Destacado({ j, probar }: { j: JugadorLocal; probar: (id: string) => void }) {
  const faltan = TIENDA.filter(a => !j.tiene.includes(a.id));
  if (!faltan.length) return null;
  const hoy = new Date();
  const semilla = hoy.getFullYear() * 400 + hoy.getMonth() * 31 + hoy.getDate();
  const a = [...faltan].sort((x, y) => y.precio - x.precio)[semilla % Math.min(faltan.length, 6)]!;
  const r = rarezaDe(a.precio);
  return (
    <button className={"destacado r-" + r} onClick={() => probar(a.id)}>
      <span className="destacado-arte" aria-hidden="true">{arteArticulo(a.id)}</span>
      <span className="pila" style={{ gap: 4, minWidth: 0 }}>
        <span className="destacado-cinta">⭐ Destacado de hoy</span>
        <b className="destacado-nombre">{a.nombre}</b>
        <small>{RAREZA_NOMBRE[r]} · nivel {a.nivel} · <b>{a.precio} XP</b></small>
        <span className="destacado-ver">Pruébatelo ›</span>
      </span>
    </button>
  );
}
const RAREZA_NOMBRE = { comun: "Común", rara: "Rara", epica: "Épica", legendaria: "Legendaria" } as const;

/** Lo que ya tienes: lo nuevo primero y resaltado, para ponértelo desde aquí. */
export function MisCosas({ j }: { j: JugadorLocal }) {
  const nuevos = new Set(j.nuevos ?? []);
  const mios = TIENDA.filter(a => j.tiene.includes(a.id)).sort((a, b) => Number(nuevos.has(b.id)) - Number(nuevos.has(a.id)));
  return (
    <section className="pila" aria-labelledby="t-cosas">
      <div className="entre">
        <h2 id="t-cosas">Mis cosas <small className="muted">({mios.length})</small></h2>
        {nuevos.size > 0 && <button className="btn sm" onClick={() => acciones.verNuevos(j.id)}>Ya las vi</button>}
      </div>
      {mios.length === 0 && <p className="hint">Todavía no tienes accesorios. Ábrelos en sobres o cómpralos en la <a href="#/tienda">Tienda</a>.</p>}
      <div className="rejilla-tarjetas">
        {mios.map(a => {
          const puesto = j.personaje.puesto[a.zona] === a.id;
          return (
            <TarjetaArticulo key={a.id} rareza={rarezaDe(a.precio)} arte={arteArticulo(a.id)} nombre={a.nombre} puesto={puesto} nuevo={nuevos.has(a.id)}
              etiqueta={puesto ? "Puesto" : undefined} detalle={ZONAS.find(z => z[0] === a.zona)?.[1]}>
              <button className={"btn sm" + (puesto ? " on" : "")} onClick={() => { acciones.ponerse(j.id, a.id); acciones.verNuevos(j.id, [a.id]); sonar(puesto ? "clic" : "exito"); }}>{puesto ? "Quitar" : "Ponérmelo"}</button>
            </TarjetaArticulo>
          );
        })}
      </div>
    </section>
  );
}
