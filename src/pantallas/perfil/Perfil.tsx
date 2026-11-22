// Perfil «ficha del jugador» con el lenguaje del HUB «La Azotea» (ALV_PERFIL_PROPUESTA.md, aprobado 2026-11-21).
// La figura 3D en vivo sobre la plataforma giratoria (la misma escena del HUB, sin pedestal pintado), identidad a la
// izquierda y paneles de vidrio a la derecha. Solo datos que ya existen; facción, tarjeta compartible y amigos son
// espacios reservados («Próximamente»), sin lógica. Contraseña y cerrar sesión viven en Ajustes.
import { useState, type ReactNode } from "react";
import { escribirCapsulas, figuraActiva, leerCapsulas, apodoDe, semillaDe, useCapsulas, useFoto, N_CAPSULAS, type Capsula } from "../../app/figura3d";
import { atras, ir } from "../../app/rutas";
import { useSesion } from "../../app/sesion";
import { tituloPorNivel } from "../../engine/economia";
import { enlace } from "../../servicios/enlace";
import { useTienda } from "../../servicios/tienda";
import { Marco, aviso, useAncho } from "../comun";
import { useRecursos } from "../Recursos";
import { logrosDeCuenta, useMovimientos } from "../Social";
import { BarraXPAzotea, RecursosAzotea, arteHub } from "../azotea/Cabecera";
import { EscenaAzotea } from "../azotea/EscenaAzotea";
import { AZOTEA, type Ambiente } from "../azotea/paquetes";
import "../azotea/azotea.css";
import "./perfil.css";

const num = (n: number) => Math.max(0, Math.round(n)).toLocaleString("es-MX");
const BASE = import.meta.env.BASE_URL;
// La plataforma 3D de la escena (sin pedestal pintado) con la luz de noche: queda bien en la sala oscura.
const SALA: Ambiente = { ...AZOTEA.ambientes.noche, fondo: undefined, pedestal: undefined };

// Iconos del Perfil: primero el arte de Elías (public/arte/ui/perfil/<nombre>.webp); mientras no llega, el del HUB.
const faltan = new Set<string>();
function Arte({ nombre, alterno, className = "" }: { nombre: string; alterno?: string; className?: string }) {
  const [falta, setFalta] = useState(() => faltan.has(nombre));
  if (falta && !alterno) return null;
  const src = falta ? alterno! : `${BASE}arte/ui/perfil/${nombre}.webp`;
  return <img className={className} src={src} alt="" draggable={false} onError={() => { if (!falta) { faltan.add(nombre); setFalta(true); } }} />;
}

export function Perfil() {
  const s = useSesion();
  const r = useRecursos();
  const t = useTienda();
  const ancho = useAncho();
  const caps = useCapsulas(s.uid);
  const f = figuraActiva(caps);
  const movs = useMovimientos();
  const apodo = apodoDe(f);
  const titulo = tituloPorNivel(r.nivel);
  const logros = movs ? logrosDeCuenta(r.nivel, movs) : null;
  const ganados = logros?.filter(l => l.va >= l.meta) ?? [];
  const partidas = movs?.filter(m => m.tipo === "ganada" && m.motivo.startsWith("partida:")).length;
  const guardadas = caps.slots.filter(Boolean).length;
  const comodines = Object.values(t.comodines).reduce((a, n) => a + (n || 0), 0);

  return (
    <Marco clase="az pf" fondo={<SalaExhibicion />}>
      <div className="pf-caja">
        <header className="pf-top">
          <button type="button" className="pf-atras" onClick={atras}><span aria-hidden="true">◀</span>Atrás</button>
          <RecursosAzotea monedas={r.monedas} puntos={r.puntos} />
        </header>

        <section className="pf-id" aria-label="Tu personaje">
          <h1 className="pf-tit"><span>Tu personaje</span></h1>
          <div className="pf-escena">
            <span className="pf-foco" aria-hidden="true" />
            <EscenaAzotea id={s.uid} figura={f} ambiente={SALA} plataforma={AZOTEA.plataforma} llegada={false} className="pf-figura" />
            <span className="pf-pista" aria-hidden="true">↺ Arrastra para girar</span>
          </div>
          <div className="pf-placa">
            <span className="pf-nivel" aria-label={`Nivel ${r.nivel}`}><img src={arteHub("insignia-nivel")} alt="" draggable={false} /><b>{r.nivel}</b></span>
            <span className="pf-nombres">
              <b className="pf-apodo">{apodo ?? s.nombre}</b>
              <small className="pf-cuenta">ID <span>@{s.nombre}</span></small>
              <span className="pf-rango">{titulo}{s.invitado && <em>Prueba</em>}</span>
            </span>
            <span className="pf-faccion" title="Las facciones llegan pronto">
              <Arte nombre="faccion-vacia" className="pf-faccion-img" />
              <span className="pf-escudo" aria-hidden="true" />
              <small>Facción<br /><i>Próximamente</i></small>
            </span>
          </div>
          <TarjetaVista foto={f} id={s.uid} nombre={apodo ?? s.nombre} nivel={r.nivel} titulo={titulo} />
        </section>

        <div className="pf-info">
          <Bloque titulo="Tu XP">
            <div className="pf-xp-top">
              <span className="pf-xp-falta">Faltan <b>{num(r.costo - r.xp)} XP</b> para el nivel {r.nivel + 1}</span>
            </div>
            <div className="pf-xp-barra"><BarraXPAzotea xp={r.xp} costo={r.costo} nivel={r.nivel} /></div>
            <div className="pf-cifras">
              <span><b>{num(s.acumulada)}</b><small>XP acumulada</small></span>
              <span><b>{num(s.disponible)}</b><small>XP para gastar</small></span>
            </div>
            {movs && movs.length > 0 && <ul className="pf-movs">{movs.slice(0, ancho ? 4 : 3).map((m, i) => (
              <li key={i}><span>{m.motivo.replace("partida:", "Partida · ")}</span><b className={m.tipo === "ganada" ? "mas" : "menos"}>{m.tipo === "ganada" ? "+" : "−"}{num(m.xp)}</b></li>
            ))}</ul>}
            {movs && movs.length === 0 && <p className="pf-suave">Tu primera XP llega al terminar tu primera partida.</p>}
          </Bloque>

          <Bloque titulo="Estadísticas">
            <ul className="pf-stats">
              <Stat arte="stat-partidas" alterno={arteHub("icono-jugar")} valor={partidas == null ? "…" : partidas >= 500 ? "500+" : num(partidas)} texto="Partidas jugadas" />
              <Stat arte="stat-logros" alterno={arteHub("icono-logros")} valor={logros ? `${ganados.length}/${logros.length}` : "…"} texto="Logros" />
              <Stat arte="stat-figuras" alterno={arteHub("icono-personalizar")} valor={`${guardadas}/${N_CAPSULAS}`} texto="Figuras guardadas" />
              <Stat arte="stat-comodines" alterno={arteHub("icono-tienda")} valor={num(comodines)} texto="Comodines" />
            </ul>
          </Bloque>

          <Bloque titulo="Colección">
            <div className="pf-col">
              <div className="pf-col-grupo">
                <h3>Personajes favoritos <small>Toca uno para jugar con él</small></h3>
                <div className="pf-favs">
                  {caps.slots.map((c, i) => <Favorito key={i} i={i} c={c} uid={s.uid} activa={caps.activa === i} />)}
                </div>
              </div>
              <div className="pf-col-grupo">
                <h3>Logros destacados <small>Tus primeros 3 logros</small></h3>
                <div className="pf-logros">
                  {[0, 1, 2].map(i => {
                    const l = ganados[i];
                    return <span key={i} className={"pf-logro" + (l ? "" : " vacio")} title={l?.descripcion}>
                      {l ? <img src={arteHub("icono-logros")} alt="" draggable={false} /> : <span className="pf-candado" aria-hidden="true"><svg viewBox="0 0 30 36"><path d="M8 15v-5a7 7 0 0 1 14 0v5" /><rect x="4" y="15" width="22" height="18" rx="4" /><path d="M15 22v5" /></svg></span>}
                      <small>{l ? l.nombre : "Por ganar"}</small>
                    </span>;
                  })}
                </div>
                <button type="button" className="pf-enlace" onClick={() => ir("logros")}>Ver todos los logros ›</button>
              </div>
            </div>
          </Bloque>

          <Bloque titulo="Social" extra={<span className="pf-pronto">Próximamente</span>}>
            <div className="pf-social">
              <Arte nombre="social-amigos" alterno={arteHub("icono-chat")} className="pf-social-ico" />
              <div className="pf-amigos" aria-hidden="true"><span /><span /><span /></div>
              <p className="pf-suave">Aquí verás a tus amigos, si están en línea y su nivel.</p>
              <div className="pf-social-bot">
                <button type="button" className="pf-boton" disabled>Agregar amigo</button>
                <button type="button" className="pf-boton" disabled>Compartir perfil</button>
              </div>
            </div>
          </Bloque>
        </div>
      </div>
    </Marco>
  );
}

/** Panel de vidrio con su título en franja diagonal. */
function Bloque({ titulo, extra, children }: { titulo: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="pf-bloque" aria-label={titulo}>
      <h2 className="pf-tit"><span>{titulo}</span>{extra}</h2>
      {children}
    </section>
  );
}

function Stat({ arte, alterno, valor, texto }: { arte: string; alterno: string; valor: string; texto: string }) {
  return <li className="pf-stat"><Arte nombre={arte} alterno={alterno} className="pf-stat-ico" /><b>{valor}</b><small>{texto}</small></li>;
}

/** Una de las 3 figuras guardadas. Tocarla la vuelve la predeterminada (la que juega); vacía, abre el taller. */
function Favorito({ i, c, uid, activa }: { i: number; c: Capsula | null; uid: string; activa: boolean }) {
  const foto = useFoto(c?.figura ?? null, undefined, "busto");
  const nombre = c ? apodoDe(c.figura) ?? (c.nombre || `Figura ${i + 1}`) : "Vacío";
  const usar = () => {
    if (!c) { ir("personalizar"); return; }
    if (activa) return;
    escribirCapsulas(uid, { ...leerCapsulas(uid), activa: i });
    void enlace.activarCapsula(i + 1);
    aviso(`Ahora juegas con ${nombre}`);
  };
  return (
    <button type="button" className={"pf-fav" + (activa ? " activa" : "") + (c ? "" : " vacio")} onClick={usar} aria-pressed={c ? activa : undefined}
      aria-label={c ? (activa ? `${nombre}, la figura con la que juegas` : `Jugar con ${nombre}`) : `Espacio ${i + 1} vacío. Crear figura`}>
      <span className="pf-fav-foto">{c ? (foto ? <img src={foto} alt="" draggable={false} /> : <span className="pf-cargando" />) : <span className="pf-mas">+</span>}</span>
      <small>{c ? nombre : "Crear"}</small>
      {activa && <em className="pf-sello">En juego</em>}
    </button>
  );
}

/** Vista previa de la tarjeta de jugador. Descargarla y compartirla llega después. */
function TarjetaVista({ foto, id, nombre, nivel, titulo }: { foto: ReturnType<typeof figuraActiva>; id: string; nombre: string; nivel: number; titulo: string }) {
  const url = useFoto(foto, foto ? undefined : semillaDe(id));
  return (
    <div className="pf-tarjeta">
      <span className="pf-carta" aria-hidden="true">
        <span className="pf-carta-foto">{url && <img src={url} alt="" draggable={false} />}</span>
        <span className="pf-carta-pie"><b>{nombre}</b><small>Niv. {nivel} · {titulo}</small></span>
      </span>
      <span className="pf-tarjeta-txt">
        <b>Tu tarjeta de jugador</b>
        <small>Pronto podrás elegir su fondo, descargarla y compartirla.</small>
        <span className="pf-pronto">Próximamente</span>
      </span>
    </div>
  );
}

/** Sala de exhibición: otra habitación, oscura, con focos. PROVISIONAL en CSS hasta la imagen de Elías (perfil-fondo). */
function SalaExhibicion() {
  return (
    <div className="pf-sala" aria-hidden="true">
      <span className="pf-sala-img" />
      <span className="pf-sala-haz" /><span className="pf-sala-haz dos" />
      <span className="pf-sala-piso" />
    </div>
  );
}
