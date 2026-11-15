// Pantallas de la figura 3D: editor a pantalla completa, tira de cápsulas y la vitrina del Casillero.
import { useEstado, type JugadorLocal } from "./estado";
import { Escena3D, EditorFigura, FotoFigura, N_CAPSULAS, escribirCapsulas, figuraActiva, leerCapsulas, useCapsulas } from "./figura3d";
import { sonar } from "./sonido";
import { aviso } from "./comun";

/** Jugador de este celular a quien se le edita la figura: el de la cuenta, o el primero. */
export function jugadorDeFigura(jugadores: JugadorLocal[], cuenta: string | undefined, pedido?: string): JugadorLocal | undefined {
  const locales = jugadores.filter(j => !j.remoto);
  return locales.find(j => j.id === pedido) ?? locales.find(j => j.id === cuenta) ?? locales[0];
}

const abrirEditor = (id: string) => { location.hash = `/figura/${encodeURIComponent(id)}`; };

/** #/figura/<jugador>: el editor de Minifig Studio ocupa toda la pantalla. */
export function PantallaFigura({ arg }: { arg?: string }) {
  const s = useEstado();
  const j = jugadorDeFigura(s.jugadores, s.cuenta?.jugador, arg ? decodeURIComponent(arg) : undefined);
  if (!j) return null;
  const salir = () => { sonar("clic"); history.length > 1 ? history.back() : (location.hash = "/perfil"); };
  return (
    <>
      <EditorFigura jugador={j.id} alCambiar={() => { /* SincroFiguras sube la cápsula y pone la activa */ }} />
      <button className="btn sm editor3d-salir" onClick={salir}>✓ Listo</button>
    </>
  );
}

/** Las 3 cápsulas en chico: un toque cambia la que está EN JUEGO; una vacía abre el editor. */
export function TiraCapsulas({ j, compacta }: { j: JugadorLocal; compacta?: boolean }) {
  const caps = useCapsulas(j.id);
  const usar = (i: number) => {
    if (!caps.slots[i]) { abrirEditor(j.id); return; }
    if (caps.activa === i) return;
    sonar("exito");
    escribirCapsulas(j.id, { ...leerCapsulas(j.id), activa: i });
    aviso(`En juego: ${caps.slots[i]!.nombre || "cápsula " + (i + 1)}`);
  };
  const tam = compacta ? 44 : 64;
  return (
    <div className={"tira-capsulas" + (compacta ? " compacta" : "")} role="group" aria-label={`Cápsulas de ${j.nombre}`}>
      {Array.from({ length: N_CAPSULAS }, (_, i) => {
        const c = caps.slots[i];
        const activa = caps.activa === i;
        return (
          <button key={i} className={"capsula" + (activa ? " activa" : "") + (c ? "" : " vacia")} aria-pressed={activa} onClick={() => usar(i)}
            aria-label={c ? `${c.nombre || "Cápsula " + (i + 1)}${activa ? ", en juego" : ""}` : `Cápsula ${i + 1} vacía: armar figura`}>
            {c ? <FotoFigura figura={c.figura} size={tam} nombre={c.nombre} /> : <span className="capsula-mas" aria-hidden="true">+</span>}
            {!compacta && <small>{activa ? "EN JUEGO" : c ? c.nombre || `Cápsula ${i + 1}` : "Vacía"}</small>}
          </button>
        );
      })}
    </div>
  );
}

/** Casillero → Armar: la figura en juego en 3D, sus cápsulas y el botón al editor. */
export function ArmarFigura({ j }: { j: JugadorLocal }) {
  const caps = useCapsulas(j.id);
  const f = figuraActiva(caps);
  return (
    <div className="pila armar-figura">
      <div className="vitrina vitrina-3d">
        {f ? <Escena3D figuras={[{ id: j.id, figura: f }]} />
          : <button className="vitrina-vacia" onClick={() => abrirEditor(j.id)}><b>Arma tu figura</b><span className="hint">Elige un personaje, uno al azar o créalo pieza por pieza.</span></button>}
      </div>
      <div className="entre"><b>{j.nombre}</b><span className="hint">Toca una cápsula para jugar con ella</span></div>
      <TiraCapsulas j={j} />
      <button className="btn principal" onClick={() => abrirEditor(j.id)}>🧱 {f ? "Editar mis figuras" : "Armar mi figura"}</button>
    </div>
  );
}
