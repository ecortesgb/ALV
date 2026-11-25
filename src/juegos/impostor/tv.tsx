// El impostor con eliminación en la Pantalla (TV o laptop). Recibe SOLO la vista pública:
// los personajes de quienes siguen en juego, cada uno con su color, y la palabra que dijo en la vuelta.
// Quien tiene el turno pasa al frente. Al votar, quien sale se queda con su sello y en la vuelta siguiente ya no está.
import { useEffect, useState, type CSSProperties } from "react";
import { Cartel, Onomatopeya } from "../../ds";
import { colorDe, varsColor } from "../../app/colorJugador";
import { Escena3D, enEscena, type EnEscena, type Momento } from "../../app/figura3d";
import { NombreJugador } from "../../pantallas/comun";
import { Burbuja } from "../../pantallas/Identidad";
import type { Miembro } from "../../servicios/enlace";
import { desenlaceImpostor, nombreDe, nombreJuego, type Publico } from "../general/texto";
import { RelojTurno } from "../general/RelojTurno";
import { ExpulsionNave, FinNave, TableroVotos, VictoriaNave, arteNave, esNave, revNave, usePasoExpulsion } from "./nave";
import { AnuncioDiscusion, useAnuncioDiscusion } from "./papelNave";
import { MesaPalabras, PizarraVotos } from "./mesaNave";
import "./impostor.css";

const COLOR_ESCENARIO: Record<string, string> = { alverca: "#22E1FF", fogata: "#FFC23D", parque: "#C6FF3D" };

export function TvImpostor({ v, miembros }: { v: Publico; miembros: Miembro[] }) {
  return esNave(v) ? <TvNave v={v} miembros={miembros} /> : <TvImpostorClasico v={v} miembros={miembros} />;
}

/**
 * La nave (Elías, 24 nov): arriba la pantalla de la asamblea (palabras de la vuelta, votos o resultado); abajo la mesa
 * en 3D con cada figura sentada en su silla y el botón al centro, que late mientras se vota. Al revelar, el expulsado
 * se levanta y sale volando; luego la compuerta y el espacio. Al final, ganadores y castigos.
 */
function TvNave({ v, miembros }: { v: Publico; miembros: Miembro[] }) {
  const im = v.impostor!;
  const ids = v.jugadores.map(j => j.id);
  const r = revNave(v);
  const revelada = v.fase === "revelada";
  const [paso, saltarVictoria] = usePasoExpulsion(v);
  const figura = (id: string) => miembros.find(m => m.id === id)?.figura;
  const enMesa = ids.filter(id => !im.eliminados.includes(id) || (revelada && r.eliminado === id));
  const habla = !revelada && im.etapa === "pistas" ? v.turnoDe : undefined;
  // Papeles en la mesa (Elías, 24 nov): tablero con palabras, quién ya vio su papel y «¡A discutir!».
  const sala = !!im.palabras;
  const anuncio = useAnuncioDiscusion(v);
  // La figura sale volando un momento después de mostrar el conteo.
  const [vuela, setVuela] = useState<string | null>(null);
  useEffect(() => {
    if (!revelada || !r.eliminado) { setVuela(null); return; }
    const t = setTimeout(() => setVuela(r.eliminado ?? null), 1300);
    return () => clearTimeout(t);
  }, [revelada, v.ronda]); // eslint-disable-line react-hooks/exhaustive-deps
  const figuras: EnEscena[] = enMesa.map(id => ({ ...enEscena(id, figura(id)), color: colorDe(id, ids)?.base, columna: ids.indexOf(id), foco: id === habla }));
  const momentos: { id: string; cual: Momento; n: number }[] = revelada
    ? (r.fin ? enMesa.map(id => ({ id, n: v.ronda, cual: ((r.impostores ?? []).includes(id) === (r.fin === "impostores") ? "victoria" : "derrota") as Momento })) : [])
    : im.etapa === "votar" ? v.contestaron.map(id => ({ id, n: v.ronda, cual: "saludar" as Momento })) : [];
  const tema = v.carta?.texto ?? "";
  const faltan = im.etapa === "votar" ? v.esperados.filter(j => !v.contestaron.includes(j)).length : 0;
  const d = revelada ? desenlaceImpostor(v) : null;
  const vistos = im.vistos ?? [];
  const titulo = im.etapa === "papeles" ? `Hay ${im.total} ${im.total === 1 ? "impostor" : "impostores"} a bordo`
    : revelada ? d!.titular : im.etapa === "votar" ? "¡Asamblea en la nave!" : `Le toca a ${nombreDe(v, v.turnoDe)}`;
  const sub = im.etapa === "papeles" ? `Cada quien mira su papel en su celular · ${vistos.length} de ${ids.length} listos`
    : revelada ? (r.fin ? "" : d!.detalle ?? "") : im.etapa === "votar" ? `¿Quién se baja de la nave? Voten en su celular · faltan ${faltan}` : "Dice su palabra en voz alta y la escribe en su celular";
  const kick = im.etapa === "papeles" ? `Categoría: ${tema}`
    : `Vuelta ${v.ronda} · Tema: ${tema} · ${im.total} ${im.total === 1 ? "impostor" : "impostores"}${im.nave?.votos === "secretos" ? " · votos secretos" : ""}`;

  // Papeles en la mesa (Elías, 24 nov): como el celular, el cuarto visto desde arriba a pantalla completa con la mesa 3D y
  // la palabra de cada quien sobre su cabeza; arriba una franja con lo que pasa; al votar (y al ver los votos), la pizarra.
  if (sala) {
    const conPizarra = im.etapa === "votar" || (revelada && paso === "listo" && !r.fin);
    const pie = revelada ? <p className="nm-estado">{d?.detalle ?? ""}</p> : <p className="nm-estado">Voten en su celular · faltan {faltan}</p>;
    return (
      <div className="nv-tv nm-tv" style={{ "--cuarto": arteNave("nave-cuarto") } as CSSProperties}>
        <MesaPalabras v={v} miembros={miembros} yo="" tv enMesa={enMesa} momentos={momentos} expulsar={vuela} golpe={anuncio} />
        <header className="nm-tv-cab">
          <span className="nv-kick">{kick}</span>
          <span className="nm-tv-t dsp ol">{titulo}</span>
          {sub && <span className="nv-pant-sub">{sub}</span>}
          <RelojTurno v={v} size="3.4em" />
        </header>
        {im.etapa === "papeles" && (
          <ol className="nv-vistos-tv nm-tv-vistos" aria-label="Quién ya vio su papel">
            {ids.map(id => <li key={id} className={vistos.includes(id) ? "si" : ""}><Burbuja p={{ id, nombre: nombreDe(v, id), figura: figura(id), color: colorDe(id, ids), insignia: vistos.includes(id) ? "✓" : undefined }} tamano="4em" conNombre /></li>)}
          </ol>
        )}
        {conPizarra && <PizarraVotos v={v} miembros={miembros} yo="" sel={null} alElegir={() => {}} alVotar={() => {}} puedo={false} miVoto={null} tv
          titulo={revelada ? d!.titular : "¿Quién es el impostor?"} pie={pie} />}
        {anuncio && <AnuncioDiscusion modo="tv" />}
        {paso === "vuela" && <ExpulsionNave v={v} miembros={miembros} modo="tv" />}
        {paso === "victoria" && <VictoriaNave v={v} miembros={miembros} modo="tv" alSaltar={saltarVictoria} />}
        {r.fin && paso === "listo" && <FinNave v={v} miembros={miembros} modo="tv" />}
      </div>
    );
  }

  return (
    <div className={"nv-tv" + (r.fin === "impostores" && paso === "listo" ? " alarma" : "")} style={{ "--ventana": arteNave("nave-espacio") } as CSSProperties}>
      <section className="nv-pantalla" aria-label="Pantalla de la asamblea">
        <header className="nv-pant-cab">
          <span className="nv-kick">{kick}</span>
          <span className="nv-pant-t dsp ol">{titulo}</span>
          {sub && <span className="nv-pant-sub">{sub}</span>}
          <RelojTurno v={v} size="4em" />
        </header>
        {im.etapa === "papeles" ? (
          <ol className="nv-vistos-tv" aria-label="Quién ya vio su papel">
            {ids.map(id => <li key={id} className={vistos.includes(id) ? "si" : ""}><Burbuja p={{ id, nombre: nombreDe(v, id), figura: figura(id), color: colorDe(id, ids), insignia: vistos.includes(id) ? "✓" : undefined }} tamano="4em" conNombre /></li>)}
          </ol>
        ) : sala ? <TableroVotos v={v} miembros={miembros} /> : !revelada && im.etapa === "pistas" ? (
          <ol className="nv-palabras" aria-label="Palabras de la vuelta">
            {im.orden.map(id => {
              const c = colorDe(id, ids);
              const dijo = v.pistas[id];
              return (
                <li key={id} className={(id === v.turnoDe ? "turno" : "") + (dijo ? " dijo" : "")} style={varsColor(c)}>
                  <Burbuja p={{ id, nombre: nombreDe(v, id), figura: figura(id), color: c }} tamano="3.2em" />
                  <span><b className="dsp">{nombreDe(v, id)}</b><em className="dsp">{dijo ?? (id === v.turnoDe ? "hablando…" : "")}</em></span>
                </li>
              );
            })}
          </ol>
        ) : <TableroVotos v={v} miembros={miembros} />}
      </section>
      <Escena3D modo="nave" figuras={figuras} columnas={ids.length} asientos={ids.map(id => colorDe(id, ids)?.base ?? "#4a5687")}
        boton={!revelada && im.etapa === "votar" ? "votar" : anuncio ? "golpe" : "quieto"} expulsar={vuela} momentos={momentos} className="nv-3d"
 />
      {anuncio && <AnuncioDiscusion modo="tv" />}
      {im.eliminados.length > 0 && !(revelada && im.eliminados.length === 1 && r.eliminado) && (
        <p className="nv-fuera">Fuera de la nave: {im.eliminados.filter(j => !(revelada && j === r.eliminado)).map(j => nombreDe(v, j)).join(", ")}</p>
      )}
      {paso === "vuela" && <ExpulsionNave v={v} miembros={miembros} modo="tv" />}
      {paso === "victoria" && <VictoriaNave v={v} miembros={miembros} modo="tv" alSaltar={saltarVictoria} />}
      {r.fin && paso === "listo" && <FinNave v={v} miembros={miembros} modo="tv" />}
    </div>
  );
}

function TvImpostorClasico({ v, miembros }: { v: Publico; miembros: Miembro[] }) {
  const im = v.impostor!;
  const ids = v.jugadores.map(j => j.id);
  const revelada = v.fase === "revelada";
  const r = (v.revelado ?? {}) as { eliminado?: string | null; eraImpostor?: boolean; votos?: Record<string, number>; fin?: string | null; impostores?: string[] };
  // En escena: quienes siguen. Al revelar, el eliminado todavía se ve (con su sello) hasta la vuelta siguiente.
  const enEscena_ = ids.filter(id => !im.eliminados.includes(id) || (revelada && r.eliminado === id));
  const habla = !revelada && im.etapa === "pistas" ? v.turnoDe : undefined;
  const figuras: EnEscena[] = enEscena_.map((id, i) => ({ ...enEscena(id, miembros.find(m => m.id === id)?.figura), color: colorDe(id, ids)?.base, columna: i, foco: id === habla }));
  const momentos: { id: string; cual: Momento; n: number }[] = revelada
    ? enEscena_.map(id => ({ id, n: v.ronda, cual: (r.fin ? (r.impostores ?? []).includes(id) === (r.fin === "impostores") : id !== r.eliminado) ? "victoria" : "derrota" }))
    : [];
  const d = revelada ? desenlaceImpostor(v) : null;
  const sub = revelada ? d!.titular : im.etapa === "votar" ? "¡A votar en su celular!" : `Le toca a ${nombreDe(v, v.turnoDe)}`;
  const estilo = { "--lugares": enEscena_.length, "--esc": COLOR_ESCENARIO[v.escenario ?? ""] ?? "#5fb4ff" } as CSSProperties;

  return (
    <div className={"im-tv" + (v.escenario ? ` esc-${v.escenario}` : "")} style={estilo}>
      <div className="im-tv-cab">
        <Cartel titulo={nombreJuego(v.juegoId)} sub={sub} />
        <div className="im-tv-datos"><span className="dsp ol">Vuelta {v.ronda}</span><small>Tema: {v.carta?.texto ?? ""} · {im.total} {im.total === 1 ? "impostor" : "impostores"}</small><RelojTurno v={v} size="4.5em" /></div>
      </div>
      <div className={"im-tv-escena" + (enEscena_.length > 5 ? " muchos" : "")}>
        <div className="im-tv-cols" aria-hidden="true">
          {enEscena_.map(id => <div key={id} className={"im-tv-col" + (id === habla ? " habla" : "") + (revelada && id === r.eliminado ? " sale" : "")} style={varsColor(colorDe(id, ids))} />)}
        </div>
        <Escena3D modo="sala" figuras={figuras} columnas={enEscena_.length} momentos={momentos} className="im-tv-3d" />
        <ul className="im-tv-rotulos" aria-label="Jugadores en escena">
          {enEscena_.map(id => {
            const c = colorDe(id, ids);
            const dijo = v.pistas[id];
            const voto = !revelada && im.etapa === "votar" && v.contestaron.includes(id);
            return (
              <li key={id} className={"im-tv-rot" + (id === habla ? " habla" : "") + (revelada && id === r.eliminado ? " sale" : "")} style={varsColor(c)}>
                <span className="im-pn dsp">{c?.etiqueta}</span>
                {dijo && <span className="im-globo dsp" key={dijo}>{dijo}</span>}
                {!dijo && id === habla && <span className="im-globo dsp pensando">…</span>}
                {voto && <span className="im-voto dsp" aria-label="Ya votó">✓</span>}
                {revelada && r.votos && (r.votos[id] ?? 0) > 0 && <span className="im-votos dsp ol">{r.votos[id]} {r.votos[id] === 1 ? "voto" : "votos"}</span>}
                {revelada && id === r.eliminado && <span className="im-sello dsp ol">{r.eraImpostor ? "¡Impostor!" : "Fuera"}</span>}
                <span className="im-tv-nom"><NombreJugador nombre={nombreDe(v, id)} figura={miembros.find(m => m.id === id)?.figura} /></span>
              </li>
            );
          })}
        </ul>
      </div>
      {revelada && d?.detalle && <p className="dsp ol im-tv-detalle">{d.detalle}</p>}
      {revelada && r.fin && <Onomatopeya texto={r.fin === "civiles" ? "¡ATRAPADOS!" : "¡ESCAPARON!"} color="var(--amarillo)" tamano="4em" giro={-8} style={{ position: "absolute", top: "44%", left: "50%", translate: "-50% 0", zIndex: 5, pointerEvents: "none" }} />}
      {im.eliminados.length > 0 && !(revelada && im.eliminados.length === 1 && r.eliminado) && (
        <p className="im-tv-fuera">Fuera de escena: {im.eliminados.filter(j => !(revelada && j === r.eliminado)).map(j => nombreDe(v, j)).join(", ")}</p>
      )}
      {revelada && v.votosDe && <p className="a-tv-votos">{Object.entries(v.votosDe).map(([de, a]) => `${nombreDe(v, de)} → ${nombreDe(v, a)}`).join("   ·   ")}</p>}
    </div>
  );
}
