// Sala en línea: la laptop abre la sala y muestra un QR; cada quien entra desde su celular con su cuenta.
// Mientras no llegue el juego en varios celulares (siguiente paso), la partida se juega en la pantalla del anfitrión
// y los secretos se ven pasando el celular, igual que antes.
import { useEffect, useState } from "react";
import qrcode from "qrcode-generator";
import { Retrato } from "./Avatar";
import { aviso, confirmar } from "./comun";
import { acciones, useEstado } from "./estado";
import { abrirSala, cerrarSala, cuentaActiva, enlaceSala, hayNube, miembrosSala, miSalaAbierta, salirDeSala, unirseSala } from "./nube";
import { personajeInicial } from "../content/personaje";

/** Siempre montado: recupera la sala después de recargar y actualiza quién está cada 3 segundos. */
export function SincroSala() {
  const s = useEstado();
  const conCuenta = !!s.cuenta;
  useEffect(() => {
    if (!hayNube || !conCuenta || s.sala) return;
    let vivo = true;
    void miSalaAbierta().then(sala => { if (vivo && sala) acciones.sala(sala); });
    return () => { vivo = false; };
  }, [conCuenta, s.sala]);

  const sala = s.sala;
  useEffect(() => {
    if (!hayNube || !sala || !conCuenta) return;
    let vivo = true;
    const leer = async () => {
      const m = await miembrosSala(sala);
      if (!vivo) return;
      if (m === null) { acciones.sala(undefined); aviso("La sala se cerró."); return; }
      acciones.miembrosSala(m);
    };
    void leer();
    const t = window.setInterval(() => { if (document.visibilityState === "visible") void leer(); }, 3000);
    return () => { vivo = false; window.clearInterval(t); };
  }, [sala?.id, conCuenta]);
  return null;
}

/** Código QR dibujado con cuadros (sin HTML externo). */
export function Qr({ texto, tam = 200 }: { texto: string; tam?: number }) {
  const qr = qrcode(0, "M");
  qr.addData(texto);
  qr.make();
  const n = qr.getModuleCount(), m = 2;
  const cuadros: string[] = [];
  for (let f = 0; f < n; f++) for (let c = 0; c < n; c++) if (qr.isDark(f, c)) cuadros.push(`M${c + m} ${f + m}h1v1h-1z`);
  return (
    <svg className="qr" viewBox={`0 0 ${n + m * 2} ${n + m * 2}`} width={tam} height={tam} role="img" aria-label="Código QR para entrar a la sala">
      <rect width="100%" height="100%" fill="#fff" />
      <path d={cuadros.join("")} fill="#0E0A1F" />
    </svg>
  );
}

/** Panel del anfitrión en el Lobby: abrir la sala, mostrar QR y código, ver quién entró y cerrar. */
export function PanelSala() {
  const s = useEstado();
  const [ocupado, setOcupado] = useState(false);
  if (!hayNube) return null;
  if (!s.cuenta || !cuentaActiva()) {
    return (
      <section className="card" aria-labelledby="t-sala">
        <h2 id="t-sala">Sala para celulares</h2>
        <p className="hint">Para que cada quien entre desde su celular, primero entra a tu cuenta en <a href="#/perfil">Perfil</a>. Tú serás el anfitrión.</p>
      </section>
    );
  }
  if (!s.sala) {
    return (
      <section className="card" aria-labelledby="t-sala">
        <h2 id="t-sala">Sala para celulares</h2>
        <p className="hint">Abre una sala y muestra el QR en la pantalla: cada quien entra desde su celular con su cuenta y aparece aquí con su personaje.</p>
        <button className="btn principal" disabled={ocupado} onClick={async () => {
          setOcupado(true);
          const sala = await abrirSala(`Sala de ${cuentaActiva()}`, s.ajustes.adulto, s.ajustes.drunk);
          setOcupado(false);
          if (!sala) { aviso("No se pudo abrir la sala. Intenta otra vez."); return; }
          acciones.sala(sala);
        }}>{ocupado ? "Abriendo…" : "Abrir sala"}</button>
      </section>
    );
  }
  const sala = s.sala;
  if (!sala.anfitrion) return <SalaInvitado />;
  const conectados = (s.miembros ?? []).filter(m => !m.anfitrion);
  return (
    <section className="card sala" aria-labelledby="t-sala">
      <div className="entre"><h2 id="t-sala">Sala abierta</h2><span className="chip lime">{conectados.length} conectado{conectados.length === 1 ? "" : "s"}</span></div>
      <div className="sala-qr">
        <Qr texto={enlaceSala(sala.codigo)} />
        <div className="pila" style={{ gap: 6 }}>
          <span className="label">Código</span>
          <b className="codigo-sala">{sala.codigo}</b>
          <p className="hint">Escanéalo con la cámara del celular, o abre la app y escribe el código en Inicio.</p>
        </div>
      </div>
      {conectados.length > 0 && (
        <div className="fila" style={{ flexWrap: "wrap" }}>
          {conectados.map(m => (
            <span key={m.id} className="chip cyan"><Retrato p={m.personaje ?? personajeInicial(0)} nombre={m.nombre} size={18} /> {m.nombre}</span>
          ))}
        </div>
      )}
      <p className="hint">Quienes entran desde su celular se suman al grupo de abajo (máximo 8 en total). Los jugadores sin celular se pueden quitar con ✕.</p>
      <button className="btn sm" onClick={async () => {
        if (!(await confirmar({ titulo: "¿Cerrar la sala?", texto: "Los celulares conectados salen de la sala.", si: "Sí, cerrar", no: "Seguir", peligro: true }))) return;
        await cerrarSala(sala); acciones.sala(undefined); aviso("Sala cerrada.");
      }}>Cerrar sala</button>
    </section>
  );
}

/** Lo que ve un celular que entró a la sala de otro. */
export function SalaInvitado() {
  const s = useEstado();
  const sala = s.sala;
  if (!sala || sala.anfitrion) return null;
  const miembros = s.miembros ?? [];
  return (
    <section className="card sala" aria-labelledby="t-sala-inv">
      <div className="entre"><h2 id="t-sala-inv">Estás en la sala {sala.codigo}</h2><span className="chip lime">{miembros.length} en la sala</span></div>
      <p className="hint">El anfitrión arma y empieza la partida desde su pantalla. Mientras, personaliza tu personaje, compra en la Tienda o revisa el Ranking: todo se guarda en tu cuenta.</p>
      <div className="fila" style={{ flexWrap: "wrap" }}>
        {miembros.map(m => (
          <span key={m.id} className={"chip " + (m.anfitrion ? "gold" : "cyan")}><Retrato p={m.personaje ?? personajeInicial(0)} nombre={m.nombre} size={18} /> {m.nombre}{m.anfitrion ? " · anfitrión" : ""}</span>
        ))}
      </div>
      <button className="btn sm" onClick={async () => { await salirDeSala(sala); acciones.sala(undefined); aviso("Saliste de la sala."); }}>Salir de la sala</button>
    </section>
  );
}

/** Entrar a una sala con código (desde el QR o escribiéndolo). */
export function Unirse({ codigo }: { codigo?: string }) {
  const s = useEstado();
  const [texto, setTexto] = useState((codigo ?? "").toUpperCase().slice(0, 6));
  const [ocupado, setOcupado] = useState(false);
  if (!hayNube) return <p className="hint">Esta versión no tiene servidor: no se puede entrar a salas.</p>;
  if (s.sala) return s.sala.anfitrion ? <PanelSala /> : <SalaInvitado />;
  const conCuenta = !!s.cuenta && !!cuentaActiva();
  return (
    <section className="card" aria-labelledby="t-unirse">
      <h2 id="t-unirse">Entrar a una sala</h2>
      {!conCuenta && <p className="hint">Primero entra o crea tu cuenta en <a href="#/perfil">Perfil</a>. Después vuelve aquí; el código se queda escrito.</p>}
      <label className="pila"><span className="label">Código de la sala</span>
        <input className="input codigo" value={texto} maxLength={6} autoCapitalize="characters" autoComplete="off" onChange={e => setTexto(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="ABC123" />
      </label>
      <button className="btn principal" disabled={!conCuenta || texto.length !== 6 || ocupado} onClick={async () => {
        setOcupado(true);
        const r = await unirseSala(texto);
        setOcupado(false);
        if (typeof r === "string") { aviso(r); return; }
        acciones.sala(r);
        aviso("¡Entraste a la sala!");
      }}>{ocupado ? "Entrando…" : "Entrar a la sala"}</button>
    </section>
  );
}
