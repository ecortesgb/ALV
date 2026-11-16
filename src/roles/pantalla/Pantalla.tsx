// La Pantalla (#/tv/código): la laptop o TV que todos ven. No juega: corre el motor y dibuja lo público.
// El QR y el código quedan en una esquina toda la partida. Tiene controles de respaldo para quien tiene el control.
import { useEffect, useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { Boton, Cartel, Chip, Etiqueta, FondoCiudad, Onomatopeya, RaizDS, Reloj } from "../../ds";
import { ir } from "../../app/rutas";
import { useSesion } from "../../app/sesion";
import { enlaceSala } from "../../servicios/enlace";
import { EscenaTv } from "../../juegos/general/tv";
import { esPublico, marcador, nombreDe, nombreJuego } from "../../juegos/general/texto";
import { Conexion, Podio, useDespierta, useQuedan } from "../../pantallas/Sala";
import { Elenco, Retrato } from "../../pantallas/comun";
import { useSala } from "../sala";
import { control, useMotor } from "./motor";

function Qr({ texto }: { texto: string }) {
  const celdas = useMemo(() => {
    const q = qrcode(0, "M"); q.addData(texto); q.make();
    const n = q.getModuleCount(), r: string[] = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) r.push(`M${x} ${y}h1v1h-1z`);
    return { n, d: r.join("") };
  }, [texto]);
  return <svg viewBox={`-2 -2 ${celdas.n + 4} ${celdas.n + 4}`} role="img" aria-label="Código QR para entrar a la sala" shapeRendering="crispEdges"><rect x="-2" y="-2" width={celdas.n + 4} height={celdas.n + 4} fill="#fff" /><path d={celdas.d} fill="#0a1030" /></svg>;
}

export function PantallaTv({ codigo }: { codigo: string }) {
  const ses = useSesion();
  const s = useSala(codigo, ses.uid);
  const tengoControl = !!s.sala && s.sala.anfitrionId === ses.uid;
  useMotor(s.sala, s.partida, tengoControl, s.tic);
  useDespierta(true);
  const v = s.partida && !s.partida.terminada && esPublico(s.partida.estado) ? s.partida.estado : null;
  const final = s.partida?.terminada && esPublico(s.partida.estado) ? s.partida.estado : null;
  const quedanS = useQuedan(v);
  const [ruleta, setRuleta] = useState<{ quien: string; texto: string } | null>(null);
  const nRuleta = v?.ruleta?.n ?? 0;
  useEffect(() => {
    if (!v?.ruleta || nRuleta === 0) return;
    setRuleta({ quien: nombreDe(v, v.ruleta.jugador), texto: v.ruleta.texto });
    const t = setTimeout(() => setRuleta(null), 9000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nRuleta]);

  const marco = (hijos: React.ReactNode) => <RaizDS ancho className="alv a-tv"><FondoCiudad />{hijos}</RaizDS>;
  if (s.error || s.cerrada) return marco(<div className="a-tv-msj"><span className="dsp ol a-tv-t1">{s.cerrada ? "La sala se cerró" : "No se pudo abrir la pantalla"}</span><p className="a-tv-sub">{s.error}</p><Boton color="amarillo" texto="Ir al inicio" icono="back" onClick={() => ir("inicio")} /></div>);
  if (!s.sala) return marco(<div className="a-tv-msj"><p className="a-tv-sub a-pulso" role="status">Abriendo la sala {codigo}…</p></div>);
  const pid = s.partida?.id ?? "";
  const esquina = (
    <aside className="a-tv-qr" aria-label="Para entrar a la sala">
      <Qr texto={enlaceSala(s.sala.codigo)} />
      <div><small>Entra con el código</small><b className="dsp">{s.sala.codigo}</b></div>
    </aside>
  );

  if (v) {
    const ultima = v.ronda >= v.totalRondas;
    return marco(<>
      <header className="a-tv-top">
        <Etiqueta texto={`Ronda ${v.ronda} de ${v.totalRondas}`} icono="star" grande />
        <Conexion red={s.red} />
        {v.reloj && v.fase === "contestando" && <Reloj segundos={quedanS} total={v.reloj.total} pausado={v.pausada} style={{ width: "6.5em", height: "6.5em" }} />}
      </header>
      <main className="a-tv-main"><EscenaTv v={v} miembros={s.miembros} /></main>
      <footer className="a-tv-pie">
        <ul className="a-tv-marcador" aria-label="Marcador">
          {marcador(v).map(j => <li key={j.id}><Retrato id={j.id} figura={s.miembros.find(m => m.id === j.id)?.figura} nombre={j.nombre} size={44} /><span>{j.nombre}</span><b className="dsp">{j.puntos}</b></li>)}
        </ul>
        {esquina}
      </footer>
      {v.pausada && <div className="a-tv-velo"><Onomatopeya texto="PAUSA" color="var(--amarillo)" tamano="7em" giro={-6} /></div>}
      {ruleta && <div className="a-tv-velo" onClick={() => setRuleta(null)}><div className="d-pnl a-tv-ruleta"><Etiqueta texto="Ruleta de castigos" icono="wheel" grande /><span className="dsp ol a-tv-t1">{ruleta.quien}</span><span className="a-tv-sub">{ruleta.texto}</span></div></div>}
      {tengoControl && (
        <div className="a-tv-respaldo" aria-label="Controles de respaldo">
          <button type="button" onClick={() => void control(pid, v.pausada ? "reanudar" : "pausar")}>{v.pausada ? "Seguir" : "Pausar"}</button>
          {v.fase === "contestando" ? <button type="button" onClick={() => void control(pid, "saltar")}>Saltar</button>
            : <button type="button" onClick={() => void control(pid, "siguiente")}>{ultima ? "Resultados" : "Siguiente"}</button>}
        </div>
      )}
    </>);
  }

  return marco(<>
    <header className="a-tv-top"><Cartel titulo={final ? `Resultados · ${nombreJuego(final.juegoId)}` : "ALV"} sub={final ? "El anfitrión elige la siguiente" : "Amigos, locuras y verdades"} /><Conexion red={s.red} /></header>
    <main className="a-tv-main a-tv-espera">
      {final ? <Podio v={final} miembros={s.miembros} /> : (
        <div className="a-tv-elenco">
          {s.miembros.length ? <Elenco gente={s.miembros} /> : <span className="dsp ol a-tv-t2">Escanea el código para entrar</span>}
          <div className="a-tv-esp">{s.miembros.map(m => <Chip key={m.id} texto={m.nombre} icono={m.anfitrion ? "star" : undefined} seleccionado={m.listo} />)}</div>
        </div>
      )}
      <div className="d-pnl a-tv-entrar">
        <Qr texto={enlaceSala(s.sala.codigo)} />
        <small>Escanea o entra a ALV y escribe</small>
        <b className="dsp ol">{s.sala.codigo}</b>
        {!tengoControl && <small>Esta pantalla solo muestra. La controla el anfitrión.</small>}
      </div>
    </main>
  </>);
}
