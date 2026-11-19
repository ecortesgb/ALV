// Hub: todo sale de aquí. Arriba quién eres; al centro tu figura; el menú con Jugar como acción principal.
import { useEffect, useState } from "react";
import { Boton, Panel, TarjetaJugador } from "../ds";
import { costoNivel, tituloPorNivel, xpParaNivel } from "../engine/economia";
import { apodoDe, figuraActiva, useCapsulas } from "../app/figura3d";
import { ir } from "../app/rutas";
import { useSesion } from "../app/sesion";
import { useLobby, usePuedeAbrir } from "../app/lobby";
import { enlace, type SalaV } from "../servicios/enlace";
import { Campo, Cabecera, Elenco, Marco, Retrato, aviso, useAncho } from "./comun";
import { FondoALV } from "./Fondos";
import { LogoALV } from "./Logo";

export function Hub() {
  const s = useSesion();
  const ancho = useAncho();
  const f = figuraActiva(useCapsulas(s.uid));
  const [sala, setSala] = useState<SalaV | null>(null);
  useEffect(() => { let vivo = true; void enlace.miSala().then(x => { if (vivo) setSala(x); }); return () => { vivo = false; }; }, [s.uid]);
  // Un toque y adentro: a tu lobby si ya estás en él, al lobby abierto si hay uno, y si no, a Jugar.
  const lobby = useLobby();
  const destino = sala?.codigo ?? lobby;
  return (
    <Marco clase="a-hub" fondo={<FondoHub />}>
      <div className="a-ancho a-hub-caja">
        <TarjetaJugador retrato={<Retrato id={s.uid} figura={f} nombre={s.nombre} size={44} />} apodo={s.nombre} alias={apodoDe(f) ?? undefined} nivel={s.nivel} titulo={tituloPorNivel(s.nivel)}
          xp={{ actual: s.acumulada - xpParaNivel(s.nivel), siguiente: costoNivel(s.nivel) }} xpParaGastar={ancho ? s.disponible : undefined}
          onPerfil={() => ir("perfil")} onAjustes={() => ir("ajustes")} />
        <div className="a-hub-cuerpo">
          <div className="a-escenario">
            <LogoALV tamano="medio" unaVez />
            {/* Destellos alrededor del pedestal */}
            {[[18, 70, 0], [80, 64, .9], [26, 88, 1.7], [74, 84, 2.4], [50, 60, 3]].map(([x, y, d], i) =>
              <i key={i} className="a-hub-chispa" aria-hidden="true" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} />)}
            <Elenco gente={[{ id: s.uid, figura: f }]} modo="hub" />
          </div>
          <nav className="a-menu" aria-label="Menú principal">
            <Boton color="amarillo" principal texto="¡Jugar!" sub={sala ? "Volver al lobby" : lobby ? "Entrar al lobby" : "El lobby aún no abre"} icono="play" onClick={() => (destino ? ir("sala", destino) : ir("jugar"))} />
            <Boton color="azul" texto="Personalizar" sub="Tu figura y tus cápsulas" icono="shirt" onClick={() => ir("personalizar")} />
            <Boton color="morado" texto="Tienda" sub="Sobres y accesorios para tu personaje" icono="bag" onClick={() => ir("tienda")} />
            <Boton color="verde" texto="Ranking" sub="Tú y tus amigos" icono="trophy" onClick={() => ir("ranking")} />
            <Boton color="naranja" texto="Logros" sub="Lo que has desbloqueado" icono="medal" onClick={() => ir("logros")} />
          </nav>
        </div>
      </div>
    </Marco>
  );
}

/** Fondo del HUB (y del taller): la ciudad según la hora. */
export const FondoHub = FondoALV;

/** Jugar: el lobby único. Entrar si está abierto; el anfitrión lo abre. El código queda como respaldo. */
export function Jugar() {
  const s = useSesion();
  const ancho = useAncho();
  const lobby = useLobby();
  const puedeAbrir = usePuedeAbrir(s.uid);
  const [codigo, setCodigo] = useState(""), [sala, setSala] = useState<SalaV | null>(null), [abriendo, setAbriendo] = useState<"tv" | "mesa" | null>(null), [conCodigo, setConCodigo] = useState(false);
  useEffect(() => { let vivo = true; void enlace.miSala().then(x => { if (vivo) setSala(x); }); return () => { vivo = false; }; }, [s.uid]);
  const abrir = async (modo: "tv" | "mesa") => {
    setAbriendo(modo);
    const r = await enlace.abrir(modo);
    setAbriendo(null);
    if (typeof r === "string") { aviso(r); return; }
    ir(modo === "tv" ? "tv" : "sala", r.codigo);
  };
  const limpio = codigo.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const soyDelLobby = !!sala;
  return (
    <Marco>
      <div className="a-ancho a-angosto a-pila">
        <Cabecera titulo="Jugar" icono="play" alVolver={() => ir("inicio")} />
        <Panel className="a-pila a-entra a-jugar-lobby" como="section">
          <span className="dsp ol a-t2">Lobby ALV</span>
          {soyDelLobby ? (<>
            <p className="a-suave">Ya estás en el lobby. Vuelve cuando quieras.</p>
            <Boton color="amarillo" principal texto="Volver al lobby" icono="play" onClick={() => ir("sala", sala.codigo)} />
            {sala.anfitrionId === s.uid && <Boton color="azul" texto="Proyectar aquí" sub="Este aparato es la pantalla" icono="eye" onClick={() => ir("tv", sala.codigo)} />}
          </>) : lobby ? (<>
            <p className="a-suave">El lobby está abierto. Caben hasta 8.</p>
            <Boton color="amarillo" principal texto="Entrar al lobby" icono="play" onClick={() => ir("sala", lobby)} />
          </>) : puedeAbrir ? (<>
            <p className="a-suave">{ancho ? "Esta pantalla muestra el lobby y la partida; cada quien juega en su celular." : "Para proyectar, abre ALV en la laptop o la TV con tu cuenta."}</p>
            <Boton color="amarillo" principal texto="Abrir el lobby" sub="Proyectar en esta pantalla" icono="eye" cargando={abriendo === "tv"} onClick={() => void abrir("tv")} />
            <Boton color="morado" texto="Abrir sin pantalla" sub="Solo celulares; el tuyo lleva la partida" icono="users" cargando={abriendo === "mesa"} onClick={() => void abrir("mesa")} />
          </>) : (
            <p className="a-suave a-pulso" role="status">El lobby aún no abre. En cuanto el anfitrión lo abra, aparece aquí.</p>
          )}
        </Panel>
        {!soyDelLobby && (conCodigo ? (
          <Panel className="a-pila" como="section">
            <form className="a-pila" onSubmit={e => { e.preventDefault(); if (limpio.length === 6) ir("sala", limpio); }}>
              <Campo etiqueta="Código de 6 letras o números" value={limpio} onChange={e => setCodigo(e.target.value)} inputMode="text" autoCapitalize="characters" autoComplete="off" spellCheck={false} className="a-codigo" maxLength={6} />
              <Boton color="azul" texto="Entrar con código" icono="play" desactivado={limpio.length !== 6} onClick={() => ir("sala", limpio)} />
            </form>
          </Panel>
        ) : <button type="button" className="a-plano" onClick={() => setConCodigo(true)}>Tengo un código</button>)}
        <button type="button" className="a-plano" onClick={() => ir("catalogo")}>Ver el catálogo de juegos</button>
      </div>
    </Marco>
  );
}
