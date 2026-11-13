// Entrada a la app y pantallas de menú: carga con botón para iniciar, cuenta, notificaciones,
// elección de modo (local, en línea, físico), modo físico y ajustes.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ESCENARIOS, JUEGOS } from "../content/catalogo";
import { rutaPieza, TIENDA } from "../content/personaje";
import { nivelPorXp } from "../engine/economia";
import { Retrato } from "./Avatar";
import { aviso, BotonSonido, confirmar, configuracion } from "./comun";
import { Cuenta } from "./Cuenta";
import { useAura } from "./efectos";
import { acciones, saldosDe, useEstado, type JugadorLocal } from "./estado";
import { Escenario } from "./Lobby";
import { adminAjustarXp, adminJugadores, guardarRegistro, hayNube, restablecerClave, soyAdmin, type CuentaAdmin, type Genero } from "./nube";
import { lugaresDeSesion } from "./puntos-sesion";
import { sonar } from "./sonido";
import { XpExtra } from "./XpExtra";
import { CabeceraJuego } from "./Hub";

const AÑO = new Date().getFullYear();

/** Lectura y escritura segura del almacenamiento del navegador (puede fallar en modo privado). */
const leer = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const guardar = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };

/**
 * Pantalla de carga al abrir la app. El porcentaje es real: cuenta las piezas de los personajes y la tipografía
 * que ya bajaron. Al terminar aparece el botón para iniciar.
 */
export function PantallaCarga({ iniciar }: { iniciar: () => void }) {
  const s = useEstado();
  const [listos, setListos] = useState(0);
  const archivos = useMemo(() => {
    const ids = new Set<string>();
    for (const j of s.jugadores) {
      const p = j.personaje;
      [p.piernas, p.piel, p.torso, p.facial || p.rostro, p.cabello].forEach(x => { if (x) ids.add(x); });
    }
    return [...ids].map(id => rutaPieza(id));
  }, [s.jugadores]);
  const total = archivos.length + 1;

  useEffect(() => {
    let vivo = true;
    const sumar = () => { if (vivo) setListos(x => x + 1); };
    archivos.forEach(src => { const im = new Image(); im.onload = sumar; im.onerror = sumar; im.src = src; });
    (document.fonts?.ready ?? Promise.resolve()).then(sumar, sumar);
    return () => { vivo = false; };
  }, [archivos]);

  const avance = Math.min(1, listos / total);
  const listo = avance >= 1;
  useEffect(() => {
    if (!listo) return;
    const f = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") iniciar(); };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, [listo, iniciar]);

  return createPortal(
    <div className="pantalla-carga" role="dialog" aria-modal="true" aria-label="ALV">
      <div className="pc-luces" aria-hidden="true" />
      <div className="pc-centro">
        <h1 className="logo pc-logo"><b>A</b>LV</h1>
        <p className="tag pc-tag">AMIGOS, LOCURAS Y VERDADES</p>
        <div className="pc-elenco" aria-hidden="true">
          {s.jugadores.slice(0, 4).map(j => <Retrato key={j.id} j={j} size={64} />)}
        </div>
        {listo ? (
          <button className="btn principal pc-iniciar" autoFocus onClick={() => { sonar("revelar"); iniciar(); }}>Toca para empezar</button>
        ) : (
          <div className="pc-barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(avance * 100)} aria-label="Cargando">
            <span style={{ width: `${avance * 100}%` }} />
          </div>
        )}
      </div>
      <footer className="pc-legal">
        <p>© {AÑO} ALV · Amigos, Locuras y Verdades. Todos los derechos reservados.</p>
        <p>Las dinámicas de juego, los textos de las cartas y el sistema de personajes de ALV son obra original. Prohibida su copia o distribución sin autorización.</p>
        <p>Los personajes usan una estética de figuras de bloques inspirada en LEGO®. LEGO es marca de The LEGO Group, que no patrocina ni respalda esta app. Los nombres de equipos, casas y franquicias pertenecen a sus dueños. Uso privado entre amigos, sin fines comerciales.</p>
      </footer>
    </div>,
    document.body,
  );
}

/** Después de la carga: entrar con la cuenta, crear una nueva o seguir sin cuenta en este celular. */
export function PantallaCuenta({ seguir }: { seguir: (creada: boolean) => void }) {
  const s = useEstado();
  return createPortal(
    <div className="pantalla-carga pantalla-cuenta" role="dialog" aria-modal="true" aria-label="Tu cuenta">
      <div className="pc-luces" aria-hidden="true" />
      <div className="pc-centro" style={{ gap: 14 }}>
        <h1 className="logo" style={{ textAlign: "center" }}><b>A</b>LV</h1>
        <div style={{ width: "100%" }}><Cuenta j={s.jugadores[0]!} alTerminar={seguir} /></div>
        <button className="btn" onClick={() => seguir(false)}>Jugar sin cuenta en este celular</button>
      </div>
    </div>,
    document.body,
  );
}

interface Aviso { icono: string; titulo: string; texto: string; ir?: string }

/**
 * Ventana de notificaciones al entrar: artículos nuevos en la tienda, desbloqueos por nivel, los 3 primeros
 * de la sesión y juegos nuevos. Lo ya visto se recuerda en este celular.
 */
export function Notificaciones({ cerrar }: { cerrar: () => void }) {
  const s = useEstado();
  const yo = s.jugadores[0]!;
  const nivel = nivelPorXp(saldosDe(yo).acumulada);
  const avisos = useMemo<Aviso[]>(() => {
    const lista: Aviso[] = [];
    const primeraVez = leer("alv.vistos.tienda") === null;
    const vistosTienda = new Set((leer("alv.vistos.tienda") ?? "").split(","));
    const vistosJuegos = new Set((leer("alv.vistos.juegos") ?? "").split(","));
    const nivelVisto = Number(leer("alv.vistos.nivel") ?? nivel);
    if (primeraVez) lista.push({ icono: "🎉", titulo: "¡Bienvenido a ALV!", texto: "Arma tu personaje, junta a tu grupo y elige cómo jugar: en este celular, en línea o con retos físicos.", ir: "#/perfil" });
    const nuevos = primeraVez ? [] : TIENDA.filter(a => !vistosTienda.has(a.id));
    if (nuevos.length) lista.push({ icono: "🛍️", titulo: `${nuevos.length} accesorio${nuevos.length > 1 ? "s" : ""} nuevo${nuevos.length > 1 ? "s" : ""} en la tienda`, texto: nuevos.slice(0, 4).map(a => a.nombre).join(", ") + (nuevos.length > 4 ? "…" : ""), ir: "#/tienda" });
    const desbloq = TIENDA.filter(a => a.nivel > nivelVisto && a.nivel <= nivel);
    if (desbloq.length) lista.push({ icono: "🔓", titulo: `¡Subiste a nivel ${nivel}!`, texto: `Desbloqueaste: ${desbloq.map(a => a.nombre).join(", ")}.`, ir: "#/tienda" });
    const lugares = lugaresDeSesion(s);
    const podio = s.jugadores.filter(j => lugares[j.id] && lugares[j.id]! <= 3).sort((a, b) => lugares[a.id]! - lugares[b.id]!);
    if (podio.length && s.jugadores.some(j => saldosDe(j).delEvento > 0)) lista.push({ icono: "🏆", titulo: "Así va el podio de la sesión", texto: podio.map(j => `#${lugares[j.id]} ${j.nombre}`).join(" · "), ir: "#/ranking" });
    const juegosNuevos = primeraVez ? [] : JUEGOS.filter(j => j.motor && !vistosJuegos.has(j.id));
    if (juegosNuevos.length) lista.push({ icono: "🎮", titulo: "Juegos nuevos", texto: juegosNuevos.map(j => j.nombre).join(", "), ir: "#/lobby" });
    if (!lista.length) lista.push({ icono: "✨", titulo: "Todo al día", texto: "No hay novedades desde tu última visita." });
    return lista;
  }, [s, nivel]);

  const marcarVisto = () => {
    guardar("alv.vistos.tienda", TIENDA.map(a => a.id).join(","));
    guardar("alv.vistos.juegos", JUEGOS.filter(j => j.motor).map(j => j.id).join(","));
    guardar("alv.vistos.nivel", String(nivel));
  };
  const salir = (ir?: string) => { marcarVisto(); cerrar(); if (ir) location.hash = ir; };
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") salir(); };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  });

  return createPortal(
    <div className="ventana-avisos" role="dialog" aria-modal="true" aria-labelledby="t-avisos" onClick={e => { if (e.target === e.currentTarget) salir(); }}>
      <div className="va-caja">
        <div className="entre"><h2 id="t-avisos">Novedades</h2><span className="label">{avisos.length} {avisos.length === 1 ? "aviso" : "avisos"}</span></div>
        <ul className="va-lista">
          {avisos.map(a => (
            <li key={a.titulo}>
              <span className="va-icono" aria-hidden="true">{a.icono}</span>
              <span className="pila" style={{ gap: 2, flex: 1, minWidth: 0 }}><b>{a.titulo}</b><small>{a.texto}</small></span>
              {a.ir && <button className="btn sm" onClick={() => salir(a.ir)}>Ver</button>}
            </li>
          ))}
        </ul>
        <button className="btn principal" autoFocus onClick={() => salir()}>Continuar</button>
      </div>
    </div>,
    document.body,
  );
}

/** Tres formas de jugar, como los modos de un menú de consola. */
export function ElegirModo() {
  const s = useEstado();
  const modos = [
    { id: "local", icono: "📱", titulo: "Juego local", meta: `${s.jugadores.length} jugadores · un solo celular`, texto: "Todos juegan pasándose este celular. Arma a cada jugador y entra al lobby.", href: "#/lobby" },
    ...(hayNube ? [{ id: "linea", icono: "🌐", titulo: "Juego en línea", meta: "Hasta 8 · cada quien con su celular", texto: s.sala ? `Estás en la sala ${s.sala.codigo}.` : "Crea una sala o entra con código o QR. Todos se ven en el lobby.", href: s.sala ? "#/lobby" : "#/unirse" }] : []),
    { id: "fisico", icono: "🏃", titulo: "Juego físico", meta: "Retos en vivo · XP a mano", texto: "Competencias fuera de la pantalla. Los personajes animan y tú repartes la XP.", href: "#/fisico" },
  ];
  return (
    <section className="pila" aria-labelledby="t-modo">
      <span id="t-modo" className="label">¿Cómo van a jugar?</span>
      <div className="modos-juego">
        {modos.map(m => (
          <a key={m.id} className={"modo-juego m-" + m.id} href={m.href}>
            <span className="mj-icono" aria-hidden="true">{m.icono}</span>
            <b>{m.titulo}</b>
            <span className="modo-meta">{m.meta}</span>
            <small>{m.texto}</small>
          </a>
        ))}
      </div>
    </section>
  );
}

/** Modo físico: los personajes en el escenario y la XP a mano por cada reto en vivo. */
export function PaginaFisico() {
  const s = useEstado();
  const cfg = configuracion(s);
  const esc = ESCENARIOS.find(e => e.id === cfg.escenario)!;
  useAura(esc.color);
  const [premiado, setPremiado] = useState<JugadorLocal | null>(null);
  return (
    <div className="lobby">
      <div className="lobby-escena">
        <div className="entre">
          <div><span className="label">Juego físico</span><h1 className="titulo">{esc.emoji} {esc.nombre}</h1></div>
          <BotonSonido />
        </div>
        <Escenario jugadores={s.jugadores} color={esc.color} />
      </div>
      <div className="lobby-config">
        <p className="hint">Hagan el reto en vivo (carreras, fuerzas, baile, lo que se les ocurra). Al terminar, dale XP a quien se la ganó. Mientras, los personajes pueden saludarse, bailar o empujarse.</p>
        <div className="pila">
          {s.jugadores.map(j => (
            <div key={j.id} className="jugador">
              <span className="marco"><Retrato j={j} size={52} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ paddingLeft: 8 }}>{j.nombre}</b>
                <small className="muted" style={{ display: "block", paddingLeft: 8 }}>{saldosDe(j).delEvento} XP en este evento</small>
              </div>
              <button className="btn sm lime" onClick={() => setPremiado(j)} aria-label={`Dar XP a ${j.nombre}`}>+XP</button>
            </div>
          ))}
        </div>
      </div>
      {premiado && <XpExtra j={premiado} cerrar={() => setPremiado(null)} />}
    </div>
  );
}

const RONDAS = [4, 6, 8, 10, 12];
const SEGUNDOS = [30, 45, 60, 90, 120];

/** Ajustes de este celular: duración de partidas y respuestas, paleta, sonido, perfiles y cuenta. */
export function PaginaAjustes() {
  const s = useEstado();
  const rondas = s.ajustes.rondas ?? 8, segundos = s.ajustes.segundos ?? 60;
  const paleta = s.ajustes.paleta === "lounge" ? "lounge" : "neon";
  return (
    <>
      <CabeceraJuego titulo="Ajustes" color="#A77BFF" />
      <section className="card ajuste-seccion" aria-labelledby="t-dur">
        <h2 id="t-dur"><span aria-hidden="true">⏱️</span> Partidas</h2>
        <span className="label">Rondas por partida</span>
        <div className="fichas-num">{RONDAS.map(n => <button key={n} className="ficha-num" aria-pressed={rondas === n} onClick={() => { sonar("clic"); acciones.ajustes({ rondas: n }); }}><b>{n}</b><small>rondas</small></button>)}</div>
        <span className="label">Tiempo para responder</span>
        <div className="fichas-num">{SEGUNDOS.map(n => <button key={n} className="ficha-num" aria-pressed={segundos === n} onClick={() => { sonar("clic"); acciones.ajustes({ segundos: n }); }}><b>{n}</b><small>seg</small></button>)}</div>
        <p className="hint">Los dados y los juegos contra reloj usan su propio tiempo.</p>
      </section>
      <section className="card ajuste-seccion" aria-labelledby="t-vis">
        <h2 id="t-vis"><span aria-hidden="true">🎨</span> Pantalla y sonido</h2>
        <span className="label">Paleta</span>
        <div className="paleta-opciones" role="group" aria-label="Paleta de colores">
          {([["neon", "Neón sofisticado", ["#0E0A1F", "#1B1230", "#FF2E88", "#22E1FF"]], ["lounge", "Midnight Lounge", ["#0B0E14", "#161B26", "#E8417F", "#7FDDF2"]]] as const).map(([k, n, cs]) => (
            <button key={k} className="opcion" aria-pressed={paleta === k} onClick={() => acciones.ajustes({ paleta: k })} style={{ padding: 10, textAlign: "left" }}>
              {n}<span className="paleta-muestra" aria-hidden="true">{cs.map(c => <span key={c} style={{ background: c }} />)}</span>
            </button>
          ))}
        </div>
        <div className="entre"><span className="label">Efectos de sonido</span><BotonSonido /></div>
      </section>
      <section className="card ajuste-seccion" aria-labelledby="t-perf">
        <h2 id="t-perf"><span aria-hidden="true">👥</span> Perfiles</h2>
        <div className="pila">
          {s.jugadores.map(j => (
            <a key={j.id} className="jugador" href={`#/perfil/${j.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <span className="marco"><Retrato j={j} size={52} /></span>
              <span style={{ flex: 1, paddingLeft: 8 }}><b>{j.nombre}</b><small className="muted" style={{ display: "block" }}>Nivel {nivelPorXp(saldosDe(j).acumulada)} · editar personaje</small></span>
              <span aria-hidden="true">›</span>
            </a>
          ))}
        </div>
        <p className="hint">Para dar XP extra a alguien, usa «+XP» en el lobby o en el juego físico.</p>
      </section>
      <XpEsteCelular />
      {hayNube && <Cuenta j={s.jugadores[0]!} />}
      {hayNube && s.registro && <CambiarGenero />}
      {hayNube && s.cuenta && <Administracion />}
    </>
  );
}

const AJUSTES_XP = [-50, -10, 10, 50, 100];

/** Ajuste manual de XP para quien juega en este celular sin cuenta (la XP vive aquí). */
function XpEsteCelular() {
  const s = useEstado();
  const locales = s.jugadores.filter(j => !j.remoto && s.cuenta?.jugador !== j.id);
  const [motivo, setMotivo] = useState("");
  if (!locales.length) return null;
  const ajustar = (id: string, delta: number) => {
    const err = acciones.ajustarXpLocal(id, delta, motivo);
    if (err) { aviso(err); return; }
    sonar(delta > 0 ? "exito" : "clic");
    aviso(`${delta > 0 ? "+" : ""}${delta} XP a ${s.jugadores.find(j => j.id === id)?.nombre}`);
  };
  return (
    <section className="card ajuste-seccion" aria-labelledby="t-xp-local">
      <h2 id="t-xp-local"><span aria-hidden="true">📈</span> XP y posiciones (este celular)</h2>
      <p className="hint">Para quien juega aquí sin cuenta. Las posiciones del ranking salen de la XP, así que se mueven con este ajuste.</p>
      <input className="input" value={motivo} maxLength={50} placeholder="Motivo (opcional)" aria-label="Motivo del ajuste" onChange={e => setMotivo(e.target.value)} />
      {locales.map(j => (
        <div key={j.id} className="ajuste-xp">
          <Retrato j={j} size={40} />
          <span className="pila" style={{ gap: 0, flex: 1, minWidth: 0 }}><b>{j.nombre}</b><small className="muted">{saldosDe(j).acumulada} XP · nivel {nivelPorXp(saldosDe(j).acumulada)}</small></span>
          <span className="ajuste-botones">{AJUSTES_XP.map(d => <button key={d} className={"btn sm" + (d > 0 ? " lime" : "")} onClick={() => ajustar(j.id, d)}>{d > 0 ? "+" : ""}{d}</button>)}</span>
        </div>
      ))}
    </section>
  );
}

/** El género se puede cambiar; la fecha de nacimiento no. */
function CambiarGenero() {
  const s = useEstado();
  const r = s.registro!;
  const cambiar = async (g: Genero) => {
    if (g === r.genero) return;
    if (await guardarRegistro(r.nacimiento, g) === null) { aviso("No se pudo cambiar."); return; }
    acciones.registro({ ...r, genero: g });
    aviso("Listo.");
  };
  return (
    <section className="card ajuste-seccion" aria-labelledby="t-genero-aj">
      <h2 id="t-genero-aj"><span aria-hidden="true">⚔️</span> Género</h2>
      <div className="chips">
        {(["hombre", "mujer", "otro"] as Genero[]).map(g => <button key={g} className="opcion" aria-pressed={r.genero === g} onClick={() => void cambiar(g)}>{NOMBRE_GENERO_AJ[g]}</button>)}
      </div>
      <p className="hint">Se usa en «guerra de sexos». Tu fecha de nacimiento no se puede cambiar.</p>
    </section>
  );
}
const NOMBRE_GENERO_AJ: Record<Genero, string> = { hombre: "Hombre", mujer: "Mujer", otro: "Otro" };

/**
 * Panel de administración: solo aparece si el servidor dice que esta cuenta es administradora.
 * Ajustar XP de cualquier cuenta y restablecer contraseñas. El servidor vuelve a validar todo.
 */
function Administracion() {
  const [es, setEs] = useState(false);
  const [cuentas, setCuentas] = useState<CuentaAdmin[] | null>(null);
  const [motivo, setMotivo] = useState("");
  const [clave, setClave] = useState<{ id: string; valor: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const leerCuentas = async () => setCuentas(await adminJugadores());
  useEffect(() => { void soyAdmin().then(si => { setEs(si); if (si) void leerCuentas(); }); }, []);
  if (!es) return null;

  const ajustar = async (c: CuentaAdmin, delta: number) => {
    setOcupado(true);
    const err = await adminAjustarXp(c.id, delta, motivo || "ajuste del administrador");
    setOcupado(false);
    if (err) { aviso(err); return; }
    sonar(delta > 0 ? "exito" : "clic");
    aviso(`${delta > 0 ? "+" : ""}${delta} XP a ${c.nombre}`);
    void leerCuentas();
  };
  const cambiarClave = async () => {
    if (!clave) return;
    const c = cuentas?.find(x => x.id === clave.id);
    if (!c || !(await confirmar({ titulo: `¿Cambiar la contraseña de ${c.nombre}?`, texto: "Su contraseña anterior deja de servir. Dásela en persona.", si: "Sí, cambiar", no: "Cancelar", peligro: true }))) return;
    setOcupado(true);
    const err = await restablecerClave(clave.id, clave.valor);
    setOcupado(false);
    if (err) { aviso(err); return; }
    setClave(null);
    aviso(`Contraseña de ${c.nombre} cambiada.`);
  };

  return (
    <section className="card admin" aria-labelledby="t-admin">
      <div className="entre"><h2 id="t-admin"><span aria-hidden="true">🛠️</span> Administración</h2><span className="chip gold">Administrador</span></div>
      <p className="hint">Ajustes a cualquier cuenta. Quedan registrados con su motivo. Las posiciones salen de la XP.</p>
      <input className="input" value={motivo} maxLength={50} placeholder="Motivo del ajuste" aria-label="Motivo del ajuste" onChange={e => setMotivo(e.target.value)} />
      {cuentas === null && <p className="hint">Cargando cuentas…</p>}
      {cuentas?.map((c, i) => (
        <div key={c.id} className="pila admin-cuenta">
          <div className="ajuste-xp">
            <span className="puesto-n">#{i + 1}</span>
            <span className="pila" style={{ gap: 0, flex: 1, minWidth: 0 }}><b>{c.nombre}</b><small className="muted">{c.acumulada} XP total · {c.disponible} disponible · {c.delEvento} del evento</small></span>
          </div>
          <div className="entre" style={{ flexWrap: "wrap" }}>
            <span className="ajuste-botones">{AJUSTES_XP.map(d => <button key={d} className={"btn sm" + (d > 0 ? " lime" : "")} disabled={ocupado} onClick={() => void ajustar(c, d)}>{d > 0 ? "+" : ""}{d}</button>)}</span>
            <button className="btn sm" onClick={() => setClave(clave?.id === c.id ? null : { id: c.id, valor: "" })}>🔑 Contraseña</button>
          </div>
          {clave?.id === c.id && (
            <div className="escribir">
              <input className="input" type="password" autoComplete="new-password" value={clave.valor} maxLength={72} placeholder="Contraseña nueva (8 o más)" aria-label={`Contraseña nueva para ${c.nombre}`}
                onChange={e => setClave({ id: c.id, valor: e.target.value })} />
              <button className="btn peligro" disabled={ocupado || clave.valor.length < 8} onClick={() => void cambiarClave()}>Cambiar</button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
