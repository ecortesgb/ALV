// Ranking y logros (el Perfil vive en perfil/Perfil.tsx). La XP y los movimientos los dice el servidor; aquí solo se muestran.
import { useEffect, useState } from "react";
import { Chip, Icono, Panel } from "../ds";
import { tituloPorNivel } from "../engine/economia";
import { useSesion } from "../app/sesion";
import { misMovimientos, rankingConocidos, type FilaRanking, type MovimientoXp } from "../servicios/cuenta";
import { Cabecera, Marco, Retrato, Vacio } from "./comun";

const num = (n: number) => n.toLocaleString("es-MX");

export function Ranking() {
  const s = useSesion();
  const [filas, setFilas] = useState<FilaRanking[] | null | undefined>(undefined);
  useEffect(() => { let vivo = true; void rankingConocidos().then(r => { if (vivo) setFilas(r); }); return () => { vivo = false; }; }, []);
  return (
    <Marco>
      <div className="a-ancho a-angosto a-pila">
        <Cabecera titulo="Ranking" icono="trophy" />
        {filas === undefined ? <p className="a-suave a-pulso" role="status">Leyendo el ranking…</p>
          : !filas?.length ? <Vacio titulo="Todavía no hay ranking" texto="Aparece cuando juegues con alguien en una sala." />
          : <Panel como="section"><ol className="a-tabla a-ranking">
              {filas.map((f, i) => <li key={f.id} className={f.id === s.uid ? "yo" : ""}><b className="dsp">{i + 1}</b><Retrato id={f.id} nombre={f.nombre} size={36} /><span>{f.nombre}<small>Nivel {f.nivel} · {tituloPorNivel(f.nivel)}</small></span><b className="dsp a-xp">{num(f.acumulada)} XP</b></li>)}
            </ol></Panel>}
        <p className="a-nota">Salen tú y la gente con la que has compartido sala.</p>
      </div>
    </Marco>
  );
}

interface Logro { nombre: string; descripcion: string; va: number; meta: number }
/** Logros que se pueden comprobar con lo que guarda el servidor. */
export function logrosDeCuenta(nivel: number, movs: MovimientoXp[]): Logro[] {
  const partidas = movs.filter(m => m.tipo === "ganada" && m.motivo.startsWith("partida:")).length;
  const retos = movs.filter(m => m.tipo === "ganada" && m.motivo.startsWith("reto en vivo")).length;
  return [
    { nombre: "Primera partida", descripcion: "Termina una partida en una sala.", va: partidas, meta: 1 },
    { nombre: "El sobreviviente", descripcion: "Termina 10 partidas.", va: partidas, meta: 10 },
    { nombre: "Reto en vivo", descripcion: "Gana XP por un reto que te puso el anfitrión.", va: retos, meta: 1 },
    { nombre: "Fiestero", descripcion: "Llega al nivel 5.", va: nivel, meta: 5 },
    { nombre: "Leyenda local", descripcion: "Llega al nivel 10.", va: nivel, meta: 10 },
    { nombre: "ALV Legendario", descripcion: "Llega al nivel 20.", va: nivel, meta: 20 },
  ];
}

export function useMovimientos() {
  const [movs, setMovs] = useState<MovimientoXp[] | undefined>(undefined);
  useEffect(() => { let vivo = true; void misMovimientos().then(r => { if (vivo) setMovs(r); }); return () => { vivo = false; }; }, []);
  return movs;
}

export function Logros() {
  const s = useSesion(), movs = useMovimientos();
  const lista = movs ? logrosDeCuenta(s.nivel, movs) : [];
  return (
    <Marco>
      <div className="a-ancho a-angosto a-pila">
        <Cabecera titulo="Logros" icono="medal" derecha={movs && <Chip texto={`${lista.filter(l => l.va >= l.meta).length} de ${lista.length}`} icono="star" />} />
        {!movs ? <p className="a-suave a-pulso" role="status">Leyendo tus logros…</p> : (
          <ul className="a-logros">
            {lista.map(l => {
              const ok = l.va >= l.meta;
              return <li key={l.nombre} className={"d-pnl a-logro" + (ok ? " ok" : "")}><Icono id={ok ? "medal" : "lock"} /><div><span className="dsp">{l.nombre}</span><small>{l.descripcion}</small>
                <div className="d-bar" role="progressbar" aria-valuemin={0} aria-valuemax={l.meta} aria-valuenow={Math.min(l.va, l.meta)} aria-label={l.nombre}><i style={{ width: `${Math.min(100, Math.round((l.va / l.meta) * 100))}%` }} /></div></div>
                <b className="dsp">{Math.min(l.va, l.meta)}/{l.meta}</b></li>;
            })}
          </ul>
        )}
      </div>
    </Marco>
  );
}
