// Editor del personaje (6 pasos del armador del Centro de Mando) más la Tienda.
import { useState } from "react";
import { crearAzar } from "../engine/azar";
import { nivelPorXp, tituloPorNivel, xpParaNivel, PRECIO_CARTAS } from "../engine/economia";
import { PASOS, PIEZAS, TIENDA, ZONAS, personajeAlAzar, rutaPieza, type Paso } from "../content/personaje";
import { CARTAS_PODER } from "../content/catalogo";
import { Avatar, IconoAdorno } from "./Avatar";
import { acciones, saldosDe, type JugadorLocal } from "./estado";
import { aviso } from "./comun";

type Pestana = Paso | "tienda";

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
  const [tab, setTab] = useState<Pestana>("piel");
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
        <button role="tab" aria-current={tab === "tienda"} onClick={() => setTab("tienda")}>Tienda</button>
      </div>
      {tab === "tienda" ? <Tienda j={j} /> : <Piezas j={j} paso={tab} />}
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

function Tienda({ j }: { j: JugadorLocal }) {
  const s = saldosDe(j);
  const nivel = nivelPorXp(s.acumulada);
  return (
    <div className="pila">
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
                      onClick={() => { const m = acciones.comprarAccesorio(j.id, a.id); aviso(m ?? `¡${a.nombre} es tuyo!`); }}>
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
