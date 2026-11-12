// Editor del personaje (6 pasos del armador) y la Tienda de accesorios, que vive en su propia pestaña.
import { useState } from "react";
import { crearAzar } from "../engine/azar";
import { nivelPorXp, tituloPorNivel, xpParaNivel, PRECIO_CARTAS } from "../engine/economia";
import { PASOS, PIEZAS, TIENDA, ZONAS, personajeAlAzar, rutaPieza, type Paso } from "../content/personaje";
import { RAREZAS, SOBRES, type CartaSobre, type TipoSobre } from "../engine/sobres";
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

/** Sobres: se compran con XP disponible y se abren una carta a la vez. */
function Sobres({ j }: { j: JugadorLocal }) {
  const [abierto, setAbierto] = useState<{ tipo: TipoSobre; cartas: CartaSobre[]; paso: number } | null>(null);
  const s = saldosDe(j), nivel = nivelPorXp(s.acumulada);
  const [ocupado, setOcupado] = useState(false);
  const abrir = async (tipo: TipoSobre) => {
    if (ocupado) return;
    setOcupado(true);
    const r = await comprarSobre(j.id, tipo, crearAzar((Math.random() * 0xffffffff) >>> 0));
    setOcupado(false);
    if (!r.ok) { aviso(r.motivo); return; }
    sonar("poder");
    setAbierto({ tipo, cartas: r.cartas, paso: 0 });
  };
  const nombreDe = (id: string) => TIENDA.find(a => a.id === id)?.nombre ?? id;
  const arteDe = (id: string) => (TIENDA.find(a => a.id === id)?.pieza ? <img src={rutaPieza(id, true)} alt="" /> : <IconoAdorno id={id} />);
  const def = abierto ? SOBRES.find(x => x.id === abierto.tipo) : null;
  return (
    <div className="pila">
      <span className="label">Sobres</span>
      <p className="hint">Cada sobre trae cartas de accesorios que todavía no tienes. Pagas con tu <b style={{ color: "var(--lime)" }}>XP disponible ({s.disponible})</b>.</p>
      <div className="tienda">
        {SOBRES.map(d => {
          const bloqueado = nivel < d.nivel, alcanza = s.disponible >= d.precio;
          return (
            <div key={d.id} className={"articulo sobre " + d.id}>
              <span className="arte sobre-arte" aria-hidden="true">✉</span>
              <b>{d.nombre}</b>
              <small className="muted">{d.cartas} cartas</small>
              {bloqueado ? <span className="chip pink">Nivel {d.nivel}</span> : (
                <button className={"btn sm" + (alcanza ? " lime" : "")} disabled={!alcanza || ocupado} onClick={() => void abrir(d.id)}>
                  {alcanza ? `Abrir · ${d.precio} XP` : `Faltan ${d.precio - s.disponible}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {abierto && def && (
        <div className="card sobre-revelado" role="dialog" aria-label={`Abriendo ${def.nombre}`}>
          {abierto.paso < abierto.cartas.length ? (() => {
            const c = abierto.cartas[abierto.paso]!;
            return (
              <>
                <span className={`chip rareza ${c.rareza}`}>{RAREZAS[c.rareza]}</span>
                <span className="arte-grande" aria-hidden="true">{arteDe(c.id)}</span>
                <b>{nombreDe(c.id)}</b>
                <small className="muted">Carta {abierto.paso + 1} de {abierto.cartas.length}</small>
                <button className="btn lime" onClick={() => { sonar("revelar"); setAbierto({ ...abierto, paso: abierto.paso + 1 }); }}>
                  {abierto.paso + 1 < abierto.cartas.length ? "Revelar siguiente" : "Ver resumen"}
                </button>
              </>
            );
          })() : (
            <>
              <b>Resumen de {def.nombre}</b>
              <ul className="logros">
                {abierto.cartas.map(c => <li key={c.id} className="logro ganado"><b>{nombreDe(c.id)}</b><small className="muted">{RAREZAS[c.rareza]} · nueva en tu colección</small></li>)}
              </ul>
              <button className="btn" onClick={() => setAbierto(null)}>Cerrar</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function Tienda({ j }: { j: JugadorLocal }) {
  const s = saldosDe(j);
  const nivel = nivelPorXp(s.acumulada);
  return (
    <div className="pila">
      <Sobres j={j} />
      <p className="hint">Todo es para lucir: nada da ventaja. Pagas con tu <b style={{ color: "var(--lime)" }}>XP disponible ({s.disponible})</b>. La corona del ALV vigente, las medallas de victoria y el delantal del mesero no se venden: se ganan.</p>
      {ZONAS.map(([zona, nombreZona]) => (
        <div className="pila" key={zona}>
          <span className="label">{nombreZona}</span>
          <div className="tienda">
            {TIENDA.filter(a => a.zona === zona).map(a => {
              const tiene = j.tiene.includes(a.id), puesto = j.personaje.puesto[zona] === a.id;
              const bloqueado = nivel < a.nivel, alcanza = s.disponible >= a.precio;
              return (
                <div key={a.id} className={"articulo" + (puesto ? " puesto" : "")}>
                  <span className="arte">{a.pieza ? <img src={rutaPieza(a.id, true)} alt="" /> : <IconoAdorno id={a.id} />}</span>
                  <b>{a.nombre}</b>
                  {tiene ? (
                    <button className={"btn sm" + (puesto ? " on" : "")} onClick={() => acciones.ponerse(j.id, a.id)}>{puesto ? "Puesto · quitar" : "Ponérmelo"}</button>
                  ) : bloqueado ? (
                    <span className="chip pink">Nivel {a.nivel}</span>
                  ) : (
                    <button className={"btn sm" + (alcanza ? " lime" : "")} disabled={!alcanza}
                      onClick={async () => { const m = await comprarAccesorio(j.id, a.id); aviso(m ?? `¡${a.nombre} es tuyo!`); }}>
                      {alcanza ? `Comprar · ${a.precio} XP` : `Faltan ${a.precio - s.disponible}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="pila">
        <span className="label">Cartas de poder</span>
        <p className="hint">Se compran dentro de una partida, solo con la <b style={{ color: "var(--cyan)" }}>XP de este evento ({s.delEvento})</b>: la 1.ª cuesta {PRECIO_CARTAS[0]}, la 2.ª {PRECIO_CARTAS[1]} y la 3.ª {PRECIO_CARTAS[2]}. Máximo 3 por partida. Cuando el evento se cierra, caducan y la XP que sobró queda solo para accesorios. También se ganan: 1 por cada 3 retos cumplidos.</p>
        <div className="tienda">
          {CARTAS_PODER.map(c => (
            <div key={c.id} className="articulo" style={{ borderColor: "var(--cyan)" }}>
              <b style={{ color: "var(--cyan)" }}>{c.nombre}</b>
              <small className="muted" style={{ fontWeight: 600 }}>{c.efecto}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
