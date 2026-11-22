// Hub: todo sale de aquí. Arriba quién eres; al centro tu figura; el menú con Jugar como acción principal.
import { useEffect, useState } from "react";
import { Boton, Icono, Panel } from "../ds";
import { tituloPorNivel } from "../engine/economia";
import { hoyMexico, retoDelDia } from "../content/rarezas";
import { figuraActiva, useCapsulas } from "../app/figura3d";
import { ir } from "../app/rutas";
import { useSesion } from "../app/sesion";
import { useLobby, usePuedeAbrir } from "../app/lobby";
import { enlace, type SalaV } from "../servicios/enlace";
import { Campo, Cabecera, Elenco, Marco, aviso, useAncho } from "./comun";
import { TarjetaEsquina } from "./Identidad";
import { FondoALV } from "./Fondos";
import { LogoALV } from "./Logo";
import { BarraXP, PildoraMonedas, PildoraPuntos, useRecursos } from "./Recursos";
import { FranjaEnLinea } from "./Vivo";
import "./hub.css";

/** Tiempo que falta para el siguiente reto diario (medianoche en Ciudad de México), p. ej. «12h 34m». */
function faltaParaManana(ahora = new Date()): string {
  const mx = new Date(ahora.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  const min = 24 * 60 - (mx.getHours() * 60 + mx.getMinutes());
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}

/** Tarjeta «Reto del día»: el reto diario del personalizador (rota cada día) con su premio y cuánto falta. */
function RetoDelDia() {
  const reto = retoDelDia(hoyMexico());
  const [falta, setFalta] = useState(faltaParaManana);
  useEffect(() => { const t = setInterval(() => setFalta(faltaParaManana()), 30000); return () => clearInterval(t); }, []);
  const mini = `${import.meta.env.BASE_URL}arte/piezas/${reto.premio.toLowerCase().replace(/_/g, "-")}.webp`;
  return (
    <button type="button" className="hb-reto" onClick={() => ir("personalizar")} aria-label={`Reto del día: ${reto.nombre}. ${reto.texto} Abrir el personalizador`}>
      <span className="hb-reto-regalo" aria-hidden="true">
        <svg viewBox="0 0 64 64"><path d="M8 26h48v10H8z" fill="#ff4fa3" stroke="#0b1a4a" strokeWidth="3" strokeLinejoin="round" /><path d="M12 36h40v22H12z" fill="#e8358a" stroke="#0b1a4a" strokeWidth="3" strokeLinejoin="round" /><path d="M28 26h8v32h-8z" fill="#ffd23f" stroke="#0b1a4a" strokeWidth="3" strokeLinejoin="round" /><path d="M32 26c-6-12-18-12-16-4 1 4 10 4 16 4zm0 0c6-12 18-12 16-4-1 4-10 4-16 4z" fill="#ffd23f" stroke="#0b1a4a" strokeWidth="3" strokeLinejoin="round" /></svg>
        <img src={mini} alt="" onError={e => { e.currentTarget.hidden = true; }} />
      </span>
      <span className="hb-reto-txt">
        <small className="dsp">¡Reto del día!</small>
        <b className="dsp">{reto.nombre}</b>
        <span>{reto.texto}</span>
        <em className="hb-reto-reloj"><Icono id="clock" />Cambia en {falta}</em>
      </span>
    </button>
  );
}

export function Hub() {
  const s = useSesion();
  const ancho = useAncho();
  const r = useRecursos();
  const f = figuraActiva(useCapsulas(s.uid));
  const [sala, setSala] = useState<SalaV | null>(null);
  useEffect(() => { let vivo = true; void enlace.miSala().then(x => { if (vivo) setSala(x); }); return () => { vivo = false; }; }, [s.uid]);
  // Un toque y adentro: a tu lobby si ya estás en él, al lobby abierto si hay uno, y si no, a Jugar.
  const lobby = useLobby();
  const destino = sala?.codigo ?? lobby;
  return (
    <Marco clase="hb" fondo={<FondoHub />}>
      <div className="hb-caja">
        <header className="hb-top">
          {/* Tú: retrato, apodo, nivel y barra de XP con el estilo arcade. */}
          <TarjetaEsquina id={s.uid} figura={f} nombre={s.nombre} tamano={ancho ? "clamp(78px, 6vw, 112px)" : 64} onClick={() => ir("perfil")} className="hb-yo">
            <span className="hb-niv"><span className="hb-niv-chip dsp"><Icono id="star" />Niv. {r.nivel}</span><small>{tituloPorNivel(r.nivel)}</small></span>
            <BarraXP xp={r.xp} costo={r.costo} nivel={r.nivel} compacta />
          </TarjetaEsquina>
          <div className="hb-top-der">
            <PildoraMonedas monedas={r.monedas} />
            <PildoraPuntos puntos={r.puntos} />
            <button type="button" className="hb-engrane" onClick={() => ir("ajustes")} aria-label="Ajustes"><Icono id="gear" /></button>
          </div>
        </header>

        <div className="hb-izq">
          <LogoALV tamano="medio" unaVez className="hb-logo" />
          <RetoDelDia />
          <FranjaEnLinea className="hb-vivo" />
        </div>

        <div className="hb-centro">
          {[[18, 70, 0], [80, 64, .9], [26, 88, 1.7], [74, 84, 2.4], [50, 60, 3]].map(([x, y, d], i) =>
            <i key={i} className="hb-chispa" aria-hidden="true" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} />)}
          <Elenco gente={[{ id: s.uid, figura: f }]} modo="hub" />
        </div>

        <nav className="hb-menu" aria-label="Menú principal">
          <Boton color="amarillo" principal texto="¡Jugar!" sub={sala ? "Volver al lobby" : lobby ? "Entrar al lobby" : "Juega con amigos"} icono="play" onClick={() => (destino ? ir("sala", destino) : ir("jugar"))} />
          <Boton color="azul" texto="Personalizar" sub="Tu figura, a tu estilo" icono="shirt" onClick={() => ir("personalizar")} />
          <Boton color="morado" texto="Tienda" sub="Sobres y comodines" icono="bag" onClick={() => ir("tienda")} />
          <Boton color="verde" texto="Ranking" sub="Tú y tus amigos" icono="trophy" onClick={() => ir("ranking")} />
          <Boton color="naranja" texto="Logros" sub="Lo que has desbloqueado" icono="medal" onClick={() => ir("logros")} />
        </nav>
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
