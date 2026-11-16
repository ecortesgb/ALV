// Hub: todo sale de aquí. Arriba quién eres; al centro tu figura; el menú con Jugar como acción principal.
import { useEffect, useState } from "react";
import { Boton, Onomatopeya, Panel, TarjetaJugador } from "../ds";
import { costoNivel, tituloPorNivel, xpParaNivel } from "../engine/economia";
import { figuraActiva, useCapsulas } from "../app/figura3d";
import { ir } from "../app/rutas";
import { useSesion } from "../app/sesion";
import { enlace, type SalaV } from "../servicios/enlace";
import { Campo, Cabecera, Elenco, Marco, Retrato, aviso, useAncho } from "./comun";

export function Hub() {
  const s = useSesion();
  const ancho = useAncho();
  const f = figuraActiva(useCapsulas(s.uid));
  const [sala, setSala] = useState<SalaV | null>(null);
  useEffect(() => { let vivo = true; void enlace.miSala().then(x => { if (vivo) setSala(x); }); return () => { vivo = false; }; }, [s.uid]);
  return (
    <Marco clase="a-hub">
      <div className="a-ancho a-hub-caja">
        <TarjetaJugador retrato={<Retrato id={s.uid} figura={f} nombre={s.nombre} size={44} />} apodo={s.nombre} nivel={s.nivel} titulo={tituloPorNivel(s.nivel)}
          xp={{ actual: s.acumulada - xpParaNivel(s.nivel), siguiente: costoNivel(s.nivel) }} xpParaGastar={ancho ? s.disponible : undefined}
          onPerfil={() => ir("perfil")} onAjustes={() => ir("ajustes")} />
        <div className="a-hub-cuerpo">
          <div className="a-escenario">
            <Onomatopeya texto="ALV" color="var(--amarillo)" tamano="4em" giro={-8} style={{ position: "absolute", top: ".1em", left: ".2em", zIndex: 1 }} />
            <Elenco gente={[{ id: s.uid, figura: f }]} foco={s.uid} />
          </div>
          <nav className="a-menu" aria-label="Menú principal">
            <Boton color="amarillo" principal texto="Jugar" sub={sala ? `Volver a la sala ${sala.codigo}` : "Abre una sala o únete"} icono="play" onClick={() => ir("jugar")} />
            <Boton color="azul" texto="Personalizar" sub="Tu figura y tus cápsulas" icono="shirt" onClick={() => ir("personalizar")} />
            <Boton color="morado" texto="Tienda" sub="Abre pronto: sobres y comodines" icono="bag" desactivado />
            <Boton color="verde" texto="Ranking" sub="Tú y tus amigos" icono="trophy" onClick={() => ir("ranking")} />
            <Boton color="naranja" texto="Logros" sub="Lo que has desbloqueado" icono="medal" onClick={() => ir("logros")} />
          </nav>
        </div>
      </div>
    </Marco>
  );
}

/** Jugar: volver a tu sala, unirte con código, proyectar en esta pantalla o jugar sin pantalla. */
export function Jugar() {
  const s = useSesion();
  const ancho = useAncho();
  const [codigo, setCodigo] = useState(""), [sala, setSala] = useState<SalaV | null>(null), [abriendo, setAbriendo] = useState<"tv" | "mesa" | null>(null);
  useEffect(() => { let vivo = true; void enlace.miSala().then(x => { if (vivo) setSala(x); }); return () => { vivo = false; }; }, [s.uid]);
  const abrir = async (modo: "tv" | "mesa") => {
    setAbriendo(modo);
    const r = await enlace.abrir(modo);
    setAbriendo(null);
    if (typeof r === "string") { aviso(r); return; }
    ir(modo === "tv" ? "tv" : "sala", r.codigo);
  };
  const limpio = codigo.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return (
    <Marco>
      <div className="a-ancho a-pila">
        <Cabecera titulo="Jugar" icono="play" alVolver={() => ir("inicio")} />
        {sala && (
          <Panel className="a-pila a-entra" como="section">
            <span className="dsp ol a-t2">Tu sala {sala.codigo} sigue abierta</span>
            <div className="a-fila a-envuelve">
              <Boton color="amarillo" texto="Jugar aquí" sub="Este aparato es mi celular" icono="play" onClick={() => ir("sala", sala.codigo)} />
              {sala.anfitrionId === s.uid && <Boton color="azul" texto="Proyectar aquí" sub="Este aparato es la pantalla" icono="eye" onClick={() => ir("tv", sala.codigo)} />}
            </div>
          </Panel>
        )}
        <div className="a-dos">
          <Panel className="a-pila" como="section">
            <span className="dsp ol a-t2">Unirme a una sala</span>
            <p className="a-suave">Escanea el QR de la pantalla con tu cámara o escribe el código.</p>
            <form className="a-pila" onSubmit={e => { e.preventDefault(); if (limpio.length === 6) ir("sala", limpio); }}>
              <Campo etiqueta="Código de 6 letras o números" value={limpio} onChange={e => setCodigo(e.target.value)} inputMode="text" autoCapitalize="characters" autoComplete="off" spellCheck={false} className="a-codigo" maxLength={6} />
              <Boton color="amarillo" texto="Entrar" icono="play" desactivado={limpio.length !== 6} onClick={() => ir("sala", limpio)} />
            </form>
          </Panel>
          <Panel className="a-pila" como="section">
            <span className="dsp ol a-t2">Abrir una sala</span>
            <p className="a-suave">{ancho ? "Esta pantalla muestra la partida y cada quien juega en su celular." : "Para proyectar, abre ALV en la laptop o la TV con tu cuenta."}</p>
            <Boton color="azul" texto="Proyectar en esta pantalla" sub="Laptop o TV a la vista de todos" icono="eye" cargando={abriendo === "tv"} onClick={() => void abrir("tv")} />
            <Boton color="morado" texto="Jugar sin pantalla" sub="Solo celulares; el tuyo lleva la partida" icono="users" cargando={abriendo === "mesa"} onClick={() => void abrir("mesa")} />
            <button type="button" className="a-plano" onClick={() => ir("catalogo")}>Ver el catálogo de juegos</button>
          </Panel>
        </div>
      </div>
    </Marco>
  );
}
