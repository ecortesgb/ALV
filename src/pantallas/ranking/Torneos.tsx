// Pestaña «Torneos» del Ranking (migración 041; Maestro v1.54, T13).
// (a) Torneo de la noche: las copas de la sala en la que estás, en vivo (engine/copas.ts con el historial de la sala).
// (b) Torneos que abre el administrador: tabla por Puntos ALV, tiempo restante y «a N PA de subir».
// Sin rondas ni llaves (etapa 3 si se piden).
import { useEffect, useMemo, useState } from "react";
import { calcularCopas, esResultado } from "../../engine/copas";
import { enlace, type SalaV } from "../../servicios/enlace";
import { VOTOS, votarNoche, votosDeLaNoche, type CategoriaVoto, type ConteoVoto, type FilaJugador } from "../../servicios/ranking";
import { cancelarTorneo, crearTorneo, cuentaRegresiva, tablaTorneo, torneosVigentes, type FilaTorneo, type ModalidadTorneo, type Torneo } from "../../servicios/torneos";
import { aviso } from "../comun";
import { arteHub } from "../azotea/Cabecera";
import { Arte, Fila, Podio } from "./Ranking";

const MODALIDAD: Record<ModalidadTorneo, string> = { todas: "Todas las partidas", individual: "Individual", parejas: "Parejas", equipos: "Equipos" };

export function Torneos({ yo, admin }: { yo: string; admin: boolean }) {
  const [lista, setLista] = useState<Torneo[] | null | undefined>(undefined);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [, setTic] = useState(0);
  const cargar = () => torneosVigentes().then(l => { setLista(l); if (l && !abierto) setAbierto(l.find(t => t.estado === "activo")?.id ?? null); });
  useEffect(() => { void cargar(); }, []);
  // La cuenta regresiva se mueve sola.
  useEffect(() => { const t = setInterval(() => setTic(n => n + 1), 30000); return () => clearInterval(t); }, []);

  return (
    <>
      <TorneoNoche yo={yo} />
      {lista === undefined ? <p className="rk-cargando" role="status">Buscando torneos…</p>
        : lista === null ? <p className="rk-cargando" role="status">No se pudieron leer los torneos. Revisa tu conexión.</p>
        : !lista.length ? <section className="pf-bloque rk-vacio"><p className="pf-suave">No hay torneos abiertos. {admin ? "Abre uno abajo." : "Cuando el administrador abra uno, aparece aquí."}</p></section>
        : lista.map(t => (
          <TarjetaTorneo key={t.id} t={t} yo={yo} admin={admin} abierto={abierto === t.id} alAbrir={() => setAbierto(a => (a === t.id ? null : t.id))}
            alCancelar={async () => { if (await cancelarTorneo(t.id)) { aviso("Torneo cancelado."); void cargar(); } else aviso("No se pudo cancelar."); }} />
        ))}
      {admin && <NuevoTorneo alCrear={() => void cargar()} />}
    </>
  );
}

/** Copas de la sala en la que estás: se recalculan cada 20 s con lo que ya terminó. */
function TorneoNoche({ yo }: { yo: string }) {
  const [sala, setSala] = useState<SalaV | null | undefined>(undefined);
  const [hist, setHist] = useState<unknown[]>([]);
  useEffect(() => { let v = true; void enlace.miSala().then(x => { if (v) setSala(x); }); return () => { v = false; }; }, []);
  useEffect(() => {
    if (!sala) return;
    let v = true;
    const leer = () => enlace.historial(sala).then(h => { if (v) setHist(h); });
    void leer();
    const t = setInterval(leer, 20000);
    return () => { v = false; clearInterval(t); };
  }, [sala?.id]);
  const filas = useMemo(() => {
    const rs = hist.filter(esResultado);
    if (!rs.length) return [];
    const c = calcularCopas(rs), nombres = new Map(rs.flatMap(r => r.jugadores.map(j => [j.id, j.nombre] as const)));
    const orden = Object.entries(c.totales).sort((a, b) => b[1] - a[1]);
    let lugar = 0, previo: number | null = null;
    return orden.map(([id, pts], i) => {
      if (pts !== previo) { lugar = i + 1; previo = pts; }
      return { posicion: lugar, lugar, valor: pts, id, nombre: nombres.get(id) ?? "Jugador", nivel: 1, figura: null, puntos_alv: pts, victorias: 0, partidas: rs.length,
        mvp: 0, racha: 0, juegos: 0, victorias_azar: 0, victorias_deduccion: 0 } satisfies FilaJugador & { lugar: number; valor: number };
    });
  }, [hist]);
  if (!sala) return null;
  return (
    <section className="pf-bloque rk-tabla-caja rk-noche" aria-label="Torneo de la noche">
      <h2 className="pf-tit"><span>Torneo de la noche</span><small className="rk-periodo">Sala {sala.codigo} · en vivo</small></h2>
      {!filas.length ? <p className="pf-suave">Todavía no termina ningún juego en esta sala. La tabla se arma sola al terminar el primero.</p> : (
        <ol className="rk-tabla">{filas.map(f => <Fila key={f.id} f={f} unidad="pts" yo={yo} />)}</ol>
      )}
      <p className="rk-nota">Suma los puntos de cada juego de esta noche. Las copas se entregan al cerrar la sala.</p>
      <VotosNoche evento={sala.id} yo={yo} gente={filas.map(f => ({ id: f.id, nombre: f.nombre }))} />
    </section>
  );
}

function TarjetaTorneo({ t, yo, admin, abierto, alAbrir, alCancelar }: { t: Torneo; yo: string; admin: boolean; abierto: boolean; alAbrir: () => void; alCancelar: () => void }) {
  const [tabla, setTabla] = useState<FilaTorneo[] | null | undefined>(undefined);
  useEffect(() => { if (abierto && tabla === undefined) void tablaTorneo(t.id).then(setTabla); }, [abierto]);
  const filas = (tabla ?? []).map(f => ({ ...f, lugar: f.posicion, valor: f.puntos_alv, mvp: 0, racha: 0, juegos: 0, victorias_azar: 0, victorias_deduccion: 0 }));
  const mia = filas.find(f => f.id === yo);
  const arriba = mia && mia.lugar > 1 ? filas.filter(f => f.valor > mia.valor).at(-1) : undefined;
  return (
    <section className={`pf-bloque rk-torneo e-${t.estado}`} aria-label={t.nombre}>
      <button type="button" className="rk-torneo-cab" onClick={alAbrir} aria-expanded={abierto}>
        <Arte nombre="torneo" alterno={arteHub("icono-ranking")} className="rk-torneo-ico" />
        <span className="rk-torneo-txt">
          <b>{t.nombre}</b>
          <small>{MODALIDAD[t.modalidad]} · {t.participantes} {t.participantes === 1 ? "participante" : "participantes"}{t.premio ? ` · Premio: ${t.premio}` : ""}</small>
        </span>
        <span className={`rk-reloj e-${t.estado}`}>{cuentaRegresiva(t)}</span>
      </button>
      {t.estado === "terminado" && t.campeones?.length ? <p className="rk-campeones">{t.campeones.length > 1 ? "Campeones" : "Campeón"}: <b>{t.campeones.join(", ")}</b></p> : null}
      {abierto && (
        tabla === undefined ? <p className="rk-cargando" role="status">Leyendo la tabla…</p>
          : tabla === null ? <p className="rk-cargando">No se pudo leer la tabla.</p>
          : !filas.length ? <p className="pf-suave">Todavía nadie suma. Cada partida terminada {t.modalidad === "todas" ? "" : `en ${MODALIDAD[t.modalidad].toLowerCase()} `}cuenta.</p>
          : <>
              {t.estado === "activo" && mia && (mia.lugar === 1 ? <p className="rk-subir lider">Vas en primer lugar. ¡Que no te alcancen!</p>
                : arriba ? <p className="rk-subir">Estás a <b>{arriba.valor - mia.valor} PA</b> de alcanzar el lugar {arriba.lugar}.</p> : null)}
              {filas.length >= 3 && <Podio filas={filas.slice(0, 3)} unidad="PA" yo={yo} />}
              <ol className="rk-tabla">{filas.slice(0, 20).map(f => <Fila key={f.id} f={f} unidad="PA" yo={yo} />)}
                {mia && mia.lugar > 20 && <><li className="rk-salto" aria-hidden="true">···</li><Fila f={mia} unidad="PA" yo={yo} /></>}
              </ol>
            </>
      )}
      {admin && t.estado !== "terminado" && <button type="button" className="rk-cancelar" onClick={() => { if (confirm(`¿Cancelar «${t.nombre}»? Desaparece para todos.`)) alCancelar(); }}>Cancelar torneo</button>}
    </section>
  );
}

/** Fin de hoy, en 7 días o fin de mes, en hora de México. */
function finDe(opcion: "hoy" | "semana" | "mes"): Date {
  const ahora = new Date();
  if (opcion === "semana") return new Date(ahora.getTime() + 7 * 86400e3);
  const mx = new Date(ahora.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  const desfase = ahora.getTime() - mx.getTime();
  const objetivo = opcion === "hoy" ? new Date(mx.getFullYear(), mx.getMonth(), mx.getDate() + 1) : new Date(mx.getFullYear(), mx.getMonth() + 1, 1);
  return new Date(objetivo.getTime() + desfase);
}

function NuevoTorneo({ alCrear }: { alCrear: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [modalidad, setModalidad] = useState<ModalidadTorneo>("todas");
  const [duracion, setDuracion] = useState<"hoy" | "semana" | "mes">("semana");
  const [premio, setPremio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enviar = async () => {
    setEnviando(true);
    const error = await crearTorneo(nombre.trim(), modalidad, new Date(), finDe(duracion), premio.trim());
    setEnviando(false);
    if (error) { aviso(error); return; }
    aviso(`Torneo «${nombre.trim()}» abierto.`);
    setNombre(""); setPremio(""); setAbierto(false); alCrear();
  };
  if (!abierto) return <button type="button" className="rk-nuevo-boton" onClick={() => setAbierto(true)}>+ Abrir un torneo</button>;
  return (
    <section className="pf-bloque rk-nuevo" aria-label="Abrir un torneo">
      <h2 className="pf-tit"><span>Abrir un torneo</span><span className="pf-pronto">Solo administrador</span></h2>
      <label>Nombre<input value={nombre} maxLength={60} onChange={e => setNombre(e.target.value)} placeholder="ALV Champions" /></label>
      <label>Cuentan las partidas de<select value={modalidad} onChange={e => setModalidad(e.target.value as ModalidadTorneo)}>
        {(Object.keys(MODALIDAD) as ModalidadTorneo[]).map(m => <option key={m} value={m}>{MODALIDAD[m]}</option>)}</select></label>
      <div className="rk-seg" role="group" aria-label="Duración">
        {([["hoy", "Hasta hoy"], ["semana", "7 días"], ["mes", "Fin de mes"]] as const).map(([v, t]) => (
          <button key={v} type="button" className={duracion === v ? "si" : ""} aria-pressed={duracion === v} onClick={() => setDuracion(v)}>{t}</button>))}
      </div>
      <label>Premio (texto, opcional)<input value={premio} maxLength={80} onChange={e => setPremio(e.target.value)} placeholder="Insignia de campeón" /></label>
      <p className="rk-nota">Empieza ahora. Suma los Puntos ALV de cada partida terminada hasta el final. Al terminar, quien tenga más gana el logro «Campeón».</p>
      <div className="rk-nuevo-acciones">
        <button type="button" className="rk-cancelar" onClick={() => setAbierto(false)}>Cancelar</button>
        <button type="button" className="rk-abrir" disabled={enviando || nombre.trim().length < 3} onClick={() => void enviar()}>{enviando ? "Abriendo…" : "Abrir torneo"}</button>
      </div>
    </section>
  );
}

/** Votación de la noche (043, D6): cada quien vota una vez por categoría y puede cambiar su voto. Nadie ve quién votó. */
function VotosNoche({ evento, yo, gente }: { evento: string; yo: string; gente: { id: string; nombre: string }[] }) {
  const [conteo, setConteo] = useState<ConteoVoto[] | null>(null);
  const [abierta, setAbierta] = useState<CategoriaVoto | null>(null);
  const cargar = () => votosDeLaNoche(evento).then(setConteo);
  useEffect(() => { void cargar(); }, [evento]);
  const otros = gente.filter(g => g.id !== yo);
  if (!otros.length) return null;
  const votar = async (c: CategoriaVoto, id: string) => {
    const error = await votarNoche(evento, c, id);
    if (error) { aviso(error); return; }
    setAbierta(null); void cargar();
  };
  return (
    <div className="rk-votacion">
      <h3>Vota por los de esta noche</h3>
      <div className="rk-votos-lista">
        {VOTOS.map(v => {
          const mio = conteo?.find(x => x.categoria === v.id)?.mi_voto ?? null;
          const lider = conteo?.filter(x => x.categoria === v.id && x.votado).sort((a, b) => b.votos - a.votos)[0];
          return (
            <div key={v.id} className={"rk-voto" + (abierta === v.id ? " abierta" : "")}>
              <button type="button" className="rk-voto-cab" onClick={() => setAbierta(a => (a === v.id ? null : v.id))} aria-expanded={abierta === v.id}>
                <span aria-hidden="true">{v.emoji}</span><b>{v.titulo}</b>
                <small>{mio ? `Votaste por ${gente.find(g => g.id === mio)?.nombre ?? "alguien"}` : "Sin votar"}{lider?.nombre ? ` · Va ganando ${lider.nombre}` : ""}</small>
              </button>
              {abierta === v.id && <div className="rk-voto-opciones">{otros.map(g => (
                <button key={g.id} type="button" className={g.id === mio ? "si" : ""} aria-pressed={g.id === mio} onClick={() => void votar(v.id, g.id)}>{g.nombre}</button>
              ))}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
