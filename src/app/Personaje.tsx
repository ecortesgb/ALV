// Editor del personaje (6 pasos del armador) y la Tienda de accesorios, que vive en su propia pestaña.
import { useState } from "react";
import { crearAzar } from "../engine/azar";
import { nivelPorXp, tituloPorNivel, xpParaNivel, PRECIO_CARTAS } from "../engine/economia";
import { PASOS, PIEZAS, TIENDA, ZONAS, personajeAlAzar, rutaPieza, type Paso } from "../content/personaje";
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
  const p = j.personaje;
  return (
    <div className="pila">
      <div className="vitrina"><Avatar p={p} size={150} nombre={j.nombre} /></div>
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
        {PIEZAS[paso].map(x => (
          <button key={x.id} className="pieza" aria-pressed={actual === x.id} aria-label={x.nombre} title={x.nombre} onClick={() => acciones.personaje(j.id, { [paso]: x.id })}>
            <img src={rutaPieza(x.id, true)} alt="" loading="lazy" />
          </button>
        ))}
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
  const TABS: [PestanaTienda, string][] = [["sobres", "Sobres"], ["accesorios", "Accesorios"], ["comodines", "Comodines"]];
  return (
    <div className="pila">
      <div className="pestanas-menu" role="tablist" aria-label="Secciones de la tienda">
        {TABS.map(([k, n]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{n}</button>)}
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
  );
}
