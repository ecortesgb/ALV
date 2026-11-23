// Configuración (ALV_PLAN_CONFIGURACION.md, etapa 1, aprobada por Elías el 2026-11-22) con el lenguaje del HUB «La Azotea».
// Mi cuenta · Mi experiencia · Administración (solo administradores; el servidor valida cada función) · Acerca de ALV.
// Las preferencias se aplican al momento en este aparato (app/preferencias.ts) y, con sesión, se guardan en la cuenta
// (migración 039, servicios/preferencias.ts). Nombre visible y borrar cuentas también son de la 039. Sin botones que no hagan nada.
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { figuraActiva, apodoDe, semillaDe, useCapsulas, useFoto } from "../../app/figura3d";
import { cambiarPreferencias, hayVibracion, usePreferencias, type Calidad, type Letra } from "../../app/preferencias";
import { atras, href, ir, useRuta } from "../../app/rutas";
import { refrescarSesion, salirDemo, useSesion } from "../../app/sesion";
import { fijarEfectos, fijarVolumenEfectos } from "../../app/sonido";
import { CREDITOS, SECCIONES_TERMINOS, TERMINOS_ACTUALIZADOS } from "../../content/terminos";
import { tituloPorNivel } from "../../engine/economia";
import { hayMusica } from "../../app/musica";
import { adminAjustarXp, adminBorrarCuenta, adminBorrarInvitados, adminJugadores, restablecerClave, type CuentaAdmin } from "../../servicios/admin";
import { hayNube } from "../../servicios/cliente";
import { cambiarClaveConActual, salir, salirDeTodos, ultimoInicio } from "../../servicios/cuenta";
import { borrarMiCuenta, cambiarNombreVisible, nombreDeUsuario } from "../../servicios/preferencias";
import { Marco, aviso, confirmar, useAncho } from "../comun";
import { useRecursos } from "../Recursos";
import { RecursosAzotea, arteHub } from "../azotea/Cabecera";
import { EscenarioFondo } from "../azotea/Escenario";
import { useMomentoAzotea } from "../azotea/HubAzotea";
import { escenarioActual } from "../azotea/paquetes";
import { Deslizador, Fila, Interruptor, Segmentado } from "./controles";
import "../azotea/azotea.css";
import "../perfil/perfil.css";
import "./config.css";

export type Categoria = "cuenta" | "experiencia" | "admin" | "acerca";
const BASE = import.meta.env.BASE_URL;

interface InfoCategoria { id: Categoria; titulo: string; sub: string; arte: string; alterno?: string }

export function Configuracion({ forzar }: { forzar?: Categoria }) {
  const s = useSesion();
  const r = useRecursos();
  const ancho = useAncho();
  const ruta = useRuta();
  const momento = useMomentoAzotea();
  const esc = escenarioActual();
  const categorias: InfoCategoria[] = [
    { id: "cuenta", titulo: "Mi cuenta", sub: "Perfil, contraseña y seguridad", arte: "cfg-cuenta", alterno: arteHub("icono-personalizar") },
    { id: "experiencia", titulo: "Mi experiencia", sub: "Sonido, vibración, animaciones y pantalla", arte: "cfg-experiencia", alterno: arteHub("ajustes") },
    ...(s.admin ? [{ id: "admin" as const, titulo: "Administración", sub: "Cuentas, XP y contraseñas", arte: "cfg-juego", alterno: `${BASE}arte/lobby/ico-corona.webp` }] : []),
    { id: "acerca", titulo: "Acerca de ALV", sub: "Versión, términos y privacidad", arte: "cfg-acerca" },
  ];
  const pedida = (forzar ?? ruta.arg) as Categoria | undefined;
  const valida = categorias.some(c => c.id === pedida) ? pedida : undefined;
  // En computadora siempre hay una categoría abierta; en celular, sin categoría se ve la lista.
  const abierta: Categoria | undefined = valida ?? (ancho ? "cuenta" : undefined);
  const info = categorias.find(c => c.id === abierta);
  // Cambiar de categoría reemplaza la página en el historial: «Atrás» regresa de una vez a donde estabas (no recorre cada toque).
  const abrir = (c?: Categoria) => location.replace(href("ajustes", c));
  const volver = () => { if (!ancho && abierta && !forzar) abrir(); else atras(); };

  return (
    <Marco clase={`az pf cf m-${momento}`} fondo={<div className="cf-fondo"><EscenarioFondo ambiente={esc.ambientes[momento]} momento={momento} velo={esc.velo} /></div>}>
      <div className="cf-caja">
        <header className="pf-top cf-top">
          <button type="button" className="pf-atras" onClick={volver}><span aria-hidden="true">◀</span>Atrás</button>
          <RecursosAzotea monedas={r.monedas} puntos={r.puntos} />
        </header>

        <h1 className="pf-tit cf-titulo"><span>{!ancho && info ? info.titulo : "Configuración"}</span></h1>

        <div className={"cf-cuerpo" + (ancho ? " dos" : "")}>
          {(ancho || !abierta) && (
            <nav className="cf-nav" aria-label="Categorías">
              {categorias.map(c => (
                <button key={c.id} type="button" className={"cf-cat" + (c.id === abierta && ancho ? " on" : "")} aria-current={c.id === abierta && ancho ? "page" : undefined}
                  onClick={() => abrir(c.id)}>
                  <span className="cf-cat-ico"><Arte nombre={c.arte} alterno={c.alterno} /></span>
                  <span className="cf-cat-txt"><b>{c.titulo}</b><small>{c.sub}</small></span>
                  <span className="cf-cat-flecha" aria-hidden="true">›</span>
                </button>
              ))}
            </nav>
          )}
          {abierta && (
            <section className="cf-panel" aria-label={info?.titulo} key={abierta}>
              {abierta === "cuenta" && <PanelCuenta />}
              {abierta === "experiencia" && <PanelExperiencia />}
              {abierta === "admin" && <PanelAdmin />}
              {abierta === "acerca" && <PanelAcerca />}
            </section>
          )}
        </div>
      </div>
    </Marco>
  );
}

// ---------- Piezas comunes ----------

/** Iconos: primero el arte de Elías (public/arte/ui/config/<nombre>.webp); mientras no llega, el alterno o nada. */
const faltan = new Set<string>();
function Arte({ nombre, alterno }: { nombre: string; alterno?: string }) {
  const [falta, setFalta] = useState(() => faltan.has(nombre));
  if (falta && !alterno) return null;
  return <img src={falta ? alterno : `${BASE}arte/ui/config/${nombre}.webp`} alt="" draggable={false}
    onError={() => { if (!falta) { faltan.add(nombre); setFalta(true); } }} />;
}

function RetratoCuenta() {
  const s = useSesion();
  const f = figuraActiva(useCapsulas(s.uid));
  const foto = useFoto(f, f ? undefined : semillaDe(s.uid), "busto");
  return foto ? <img className="cf-retrato" src={foto} alt="" draggable={false} /> : <span className="cf-retrato vacio" />;
}

function Bloque({ titulo, children, nota }: { titulo: string; children: ReactNode; nota?: ReactNode }) {
  return (
    <section className="pf-bloque cf-bloque" aria-label={titulo}>
      <h2 className="pf-tit"><span>{titulo}</span></h2>
      {children}
      {nota && <p className="pf-suave cf-nota">{nota}</p>}
    </section>
  );
}

function Boton({ children, onClick, tipo = "normal", desactivado, submit }: { children: ReactNode; onClick?: () => void; tipo?: "normal" | "peligro" | "principal"; desactivado?: boolean; submit?: boolean }) {
  return <button type={submit ? "submit" : "button"} className={`cf-boton ${tipo}`} onClick={onClick} disabled={desactivado}>{children}</button>;
}

function CampoClave({ etiqueta, valor, alCambiar, auto }: { etiqueta: string; valor: string; alCambiar: (v: string) => void; auto: string }) {
  const [ver, setVer] = useState(false);
  return (
    <label className="cf-campo">
      <span>{etiqueta}</span>
      <span className="cf-campo-caja">
        <input type={ver ? "text" : "password"} value={valor} onChange={e => alCambiar(e.target.value)} autoComplete={auto} maxLength={72} />
        <button type="button" className="cf-ojo" onClick={() => setVer(!ver)} aria-label={ver ? "Ocultar contraseña" : "Ver contraseña"} aria-pressed={ver}>{ver ? "Ocultar" : "Ver"}</button>
      </span>
    </label>
  );
}

const fecha = (iso: string) => new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });

// ---------- Mi cuenta ----------

function PanelCuenta() {
  const s = useSesion();
  const r = useRecursos();
  const f = figuraActiva(useCapsulas(s.uid));
  const apodo = apodoDe(f);
  const [ultimo, setUltimo] = useState<string | null>(null);
  useEffect(() => { if (hayNube && !s.invitado) void ultimoInicio().then(setUltimo); }, [s.invitado]);

  const cerrar = async () => {
    if (s.invitado && hayNube && !(await confirmar({ titulo: "¿Salir de la prueba?", texto: "Entraste sin cuenta: al salir no podrás volver a este apodo ni a su XP.", si: "Salir", peligro: true }))) return;
    if (hayNube) { await salir(); await refrescarSesion(); } else salirDemo();
    ir("inicio");
  };
  const cerrarTodos = async () => {
    if (!(await confirmar({ titulo: "¿Cerrar sesión en todos tus aparatos?", texto: "Se cierra aquí y en cualquier celular, tablet o TV donde hayas entrado con esta cuenta.", si: "Cerrar en todos", peligro: true }))) return;
    if (!(await salirDeTodos())) { aviso("No se pudo cerrar. Intenta otra vez."); return; }
    await refrescarSesion();
    ir("inicio");
  };

  return (
    <>
      <div className="cf-perfil">
        <span className="cf-perfil-foto"><RetratoCuenta /></span>
        <span className="cf-perfil-txt">
          <b>{apodo ?? s.nombre}</b>
          <small>@{s.nombre} · Nivel {r.nivel} · {tituloPorNivel(r.nivel)}{s.invitado ? " · Prueba" : ""}</small>
        </span>
        <Boton onClick={() => ir("perfil")}>Ver perfil</Boton>
      </div>

      {!hayNube ? (
        <Bloque titulo="Cuenta"><p className="pf-suave">Estás en modo demostración: no hay cuenta en la nube.</p></Bloque>
      ) : s.invitado ? (
        <Bloque titulo="Cuenta"><p className="pf-suave">Entraste de prueba: tu XP y tu figura se borran cuando terminen las pruebas. Para conservarlas, crea una cuenta.</p></Bloque>
      ) : (
        <>
          <Bloque titulo="Datos de la cuenta">
            <Fila titulo="Nombre de usuario" ayuda="Con este nombre entras a ALV. No se puede cambiar." control={<span className="cf-dato">@{nombreDeUsuario() ?? s.nombre}</span>} />
            <Fila titulo="Correo" ayuda={s.admin ? "Tu cuenta no usa correo. Si olvidas tu contraseña, se cambia desde el panel de Supabase." : "Tu cuenta no usa correo. Si olvidas tu contraseña, pídele una nueva al administrador."}
              control={<span className="cf-dato suave">Sin correo</span>} />
          </Bloque>
          <FormNombre />
          <FormClave />
          <Bloque titulo="Seguridad">
            <Fila titulo="Último inicio de sesión" control={<span className="cf-dato">{ultimo ? fecha(ultimo) : "…"}</span>} />
            <Fila titulo="Todos tus aparatos" ayuda="Cierra tu sesión en cualquier aparato donde hayas entrado, también en este."
              control={<Boton tipo="peligro" onClick={() => void cerrarTodos()}>Cerrar en todos</Boton>} />
          </Bloque>
          <BorrarCuenta />
        </>
      )}

      <Boton tipo="peligro" onClick={() => void cerrar()}>{s.invitado ? "Salir de la prueba" : "Cerrar sesión"}</Boton>
    </>
  );
}

function FormNombre() {
  const s = useSesion();
  const [nombre, setNombre] = useState(s.nombre), [ocupado, setOcupado] = useState(false);
  useEffect(() => setNombre(s.nombre), [s.nombre]);
  const limpio = nombre.replace(/\s+/g, " ").trim();
  const listo = limpio.length >= 2 && limpio.length <= 20 && limpio !== s.nombre && !ocupado;
  const enviar = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!listo) return;
    setOcupado(true);
    const r = await cambiarNombreVisible(limpio);
    setOcupado(false);
    if (r.error) { aviso(r.error); return; }
    aviso("Nombre cambiado");
    await refrescarSesion();
  };
  return (
    <Bloque titulo="Nombre visible" nota="Es el nombre que ven los demás en la sala, el ranking y la TV. No cambia el nombre con el que entras.">
      <form className="cf-form cf-form-linea" onSubmit={e => void enviar(e)}>
        <label className="cf-campo"><span>Tu nombre</span><span className="cf-campo-caja"><input value={nombre} onChange={e => setNombre(e.target.value)} maxLength={20} autoComplete="nickname" /></span></label>
        <Boton tipo="principal" submit desactivado={!listo}>{ocupado ? "Guardando…" : "Guardar"}</Boton>
      </form>
    </Bloque>
  );
}

function BorrarCuenta() {
  const s = useSesion();
  const usuario = nombreDeUsuario() ?? "";
  const [abierto, setAbierto] = useState(false), [texto, setTexto] = useState(""), [ocupado, setOcupado] = useState(false);
  const coincide = !!usuario && texto.trim().toLowerCase() === usuario.toLowerCase();
  const borrar = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!coincide || ocupado) return;
    if (!(await confirmar({ titulo: "¿Borrar tu cuenta para siempre?", texto: "Se borran tus figuras, tu XP, tus monedas, tus piezas y tu lugar en las partidas. No se puede deshacer.", si: "Borrar mi cuenta", peligro: true }))) return;
    setOcupado(true);
    const r = await borrarMiCuenta(texto.trim());
    setOcupado(false);
    if (r) { aviso(r); return; }
    await salir(); await refrescarSesion();
    aviso("Tu cuenta se borró");
    ir("inicio");
  };
  return (
    <Bloque titulo="Eliminar cuenta">
      <p className="pf-suave">Se borra todo: figuras, XP, monedas, piezas, preferencias y tu lugar en salas y partidas. No se puede deshacer.{s.admin ? " Si eres el único administrador, no se puede borrar." : ""}</p>
      {!abierto ? <Boton tipo="peligro" onClick={() => setAbierto(true)}>Eliminar mi cuenta</Boton> : (
        <form className="cf-form" onSubmit={e => void borrar(e)}>
          <label className="cf-campo"><span>Para confirmar, escribe tu nombre de usuario: <b>{usuario}</b></span>
            <span className="cf-campo-caja"><input value={texto} onChange={e => setTexto(e.target.value)} maxLength={30} autoComplete="off" autoCapitalize="none" spellCheck={false} /></span></label>
          <div className="cf-legal">
            <Boton tipo="peligro" submit desactivado={!coincide || ocupado}>{ocupado ? "Borrando…" : "Borrar para siempre"}</Boton>
            <Boton onClick={() => { setAbierto(false); setTexto(""); }}>Cancelar</Boton>
          </div>
        </form>
      )}
    </Bloque>
  );
}

function FormClave() {
  const [actual, setActual] = useState(""), [nueva, setNueva] = useState(""), [otra, setOtra] = useState(""), [ocupado, setOcupado] = useState(false);
  const error = nueva && nueva.length < 8 ? "La contraseña nueva lleva 8 o más caracteres." : otra && otra !== nueva ? "Las dos contraseñas nuevas no son iguales." : null;
  const listo = actual.length > 0 && nueva.length >= 8 && otra === nueva && !ocupado;
  const enviar = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!listo) return;
    setOcupado(true);
    const r = await cambiarClaveConActual(actual, nueva);
    setOcupado(false);
    aviso(r ?? "Contraseña cambiada");
    if (!r) { setActual(""); setNueva(""); setOtra(""); }
  };
  return (
    <Bloque titulo="Contraseña">
      <form className="cf-form" onSubmit={e => void enviar(e)}>
        <CampoClave etiqueta="Contraseña actual" valor={actual} alCambiar={setActual} auto="current-password" />
        <CampoClave etiqueta="Contraseña nueva (8 o más)" valor={nueva} alCambiar={setNueva} auto="new-password" />
        <CampoClave etiqueta="Repite la contraseña nueva" valor={otra} alCambiar={setOtra} auto="new-password" />
        {error && <p className="cf-error" role="alert">{error}</p>}
        <Boton tipo="principal" submit desactivado={!listo}>{ocupado ? "Cambiando…" : "Cambiar contraseña"}</Boton>
      </form>
    </Bloque>
  );
}

// ---------- Mi experiencia ----------

const CALIDADES: { id: Calidad; texto: string }[] = [{ id: "auto", texto: "Auto" }, { id: "alta", texto: "Alta" }, { id: "media", texto: "Media" }, { id: "baja", texto: "Baja" }];
const LETRAS: { id: Letra; texto: string }[] = [{ id: "normal", texto: "Normal" }, { id: "grande", texto: "Grande" }];

function PanelExperiencia() {
  const p = usePreferencias();
  const [vol, setVol] = useState(p.volumenEfectos);
  useEffect(() => setVol(p.volumenEfectos), [p.volumenEfectos]);
  const [volM, setVolM] = useState(p.volumenMusica);
  useEffect(() => setVolM(p.volumenMusica), [p.volumenMusica]);
  const s = useSesion();
  const enCuenta = hayNube && s.fase === "dentro";
  const sistemaQuieto = useSistemaQuieto();
  const completa = usePantallaCompleta();

  return (
    <>
      <Bloque titulo="Sonido">
        <Fila titulo="Efectos de sonido" ayuda="Clics, cartas, tiempo y premios." control={<Interruptor valor={p.efectos} alCambiar={fijarEfectos} etiqueta="Efectos de sonido" />} />
        <Fila titulo="Volumen de efectos" control={<Deslizador valor={vol} desactivado={!p.efectos} etiqueta="Volumen de efectos"
          alCambiar={setVol} alSoltar={fijarVolumenEfectos} />} />
        {hayMusica && <>
          <Fila titulo="Música de fondo" ayuda="Pantalla de carga, HUB y menús." control={<Interruptor valor={p.musica} alCambiar={v => cambiarPreferencias({ musica: v })} etiqueta="Música de fondo" />} />
          <Fila titulo="Volumen de música" control={<Deslizador valor={volM} desactivado={!p.musica} etiqueta="Volumen de música"
            alCambiar={v => { setVolM(v); cambiarPreferencias({ volumenMusica: v }); }} />} />
        </>}
      </Bloque>

      {hayVibracion() && (
        <Bloque titulo="Vibración">
          <Fila titulo="Vibrar" ayuda="En tu turno, al revelar, cuando se acaba el tiempo y al abrir sobres." control={<Interruptor valor={p.vibracion} alCambiar={v => cambiarPreferencias({ vibracion: v })} etiqueta="Vibración" />} />
        </Bloque>
      )}

      <Bloque titulo="Movimiento y gráficos">
        <Fila titulo="Animaciones" ayuda={sistemaQuieto ? "Tu aparato pide menos movimiento: se reducen aunque esto esté encendido." : "Apágalas si te marean o para ahorrar batería."}
          control={<Interruptor valor={p.animaciones} alCambiar={v => cambiarPreferencias({ animaciones: v })} etiqueta="Animaciones" />} />
        <Fila titulo="Calidad gráfica" ayuda="Figura del inicio y del perfil. Auto la baja sola si el aparato va lento; Baja gasta menos batería."
          control={<Segmentado valor={p.calidad} opciones={CALIDADES} alCambiar={v => cambiarPreferencias({ calidad: v })} etiqueta="Calidad gráfica" />} />
      </Bloque>

      <Bloque titulo="Pantalla" nota={enCuenta ? "Se guarda en tu cuenta y vuelve al iniciar sesión en otro aparato. La calidad gráfica y la pantalla completa son de cada aparato." : "Todo esto se guarda en este aparato."}>
        {completa.puede && <Fila titulo="Pantalla completa" control={<Interruptor valor={completa.activa} alCambiar={completa.cambiar} etiqueta="Pantalla completa" />} />}
        <Fila titulo="Tamaño de letra" control={<Segmentado valor={p.letra} opciones={LETRAS} alCambiar={v => cambiarPreferencias({ letra: v })} etiqueta="Tamaño de letra" />} />
        <Fila titulo="Modo TV" ayuda="Agranda textos y botones cuando este aparato es la pantalla de la sala."
          control={<Interruptor valor={p.modoTV} alCambiar={v => cambiarPreferencias({ modoTV: v })} etiqueta="Modo TV" />} />
      </Bloque>
    </>
  );
}

function useSistemaQuieto() {
  const [q, setQ] = useState(false);
  useEffect(() => {
    // Se pregunta al sistema con la consulta original (sin el interruptor de la app): por eso se compara con «no-preference».
    const m = matchMedia("(prefers-reduced-motion: no-preference)");
    const f = () => setQ(!m.matches);
    f(); m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return q;
}

function usePantallaCompleta() {
  const [activa, setActiva] = useState(() => !!document.fullscreenElement);
  useEffect(() => {
    const f = () => setActiva(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);
  const cambiar = (v: boolean) => {
    if (!v) { if (document.fullscreenElement) void document.exitFullscreen(); return; }
    void document.documentElement.requestFullscreen?.().catch(() => aviso("Este navegador no deja usar pantalla completa."));
  };
  return { activa, cambiar, puede: !!document.fullscreenEnabled };
}

// ---------- Administración ----------

function PanelAdmin() {
  const s = useSesion();
  const [cuentas, setCuentas] = useState<CuentaAdmin[] | null | undefined>(undefined);
  const [abierta, setAbierta] = useState<string | null>(null), [clave, setClave] = useState(""), [busca, setBusca] = useState("");
  const leer = () => void adminJugadores().then(setCuentas);
  useEffect(() => { if (s.admin) leer(); }, [s.admin]);
  if (!s.admin) return <Bloque titulo="Administración"><p className="pf-suave">Tu cuenta no tiene este permiso.</p></Bloque>;

  const xp = async (c: CuentaAdmin, n: number) => {
    if (!(await confirmar({ titulo: `${n > 0 ? "Dar" : "Quitar"} ${Math.abs(n)} XP a ${c.nombre}`, si: "Confirmar", peligro: n < 0 }))) return;
    const r = await adminAjustarXp(c.id, n, "ajuste de administrador");
    aviso(r ?? "XP ajustada"); leer();
  };
  const poner = async (c: CuentaAdmin, e?: FormEvent) => {
    e?.preventDefault();
    if (clave.length < 8) return;
    if (!(await confirmar({ titulo: `¿Cambiar la contraseña de ${c.nombre}?`, texto: "La anterior deja de servir.", si: "Cambiar", peligro: true }))) return;
    const r = await restablecerClave(c.id, clave);
    aviso(r ?? "Contraseña cambiada"); if (!r) { setClave(""); setAbierta(null); }
  };
  const borrarCuenta = async (c: CuentaAdmin) => {
    if (!(await confirmar({ titulo: `¿Borrar la cuenta de ${c.nombre}?`, texto: "Se borran sus figuras, su XP, sus monedas, sus piezas y su lugar en las partidas. Las salas que abrió también. No se puede deshacer.", si: "Borrar cuenta", peligro: true }))) return;
    const r = await adminBorrarCuenta(c.id);
    aviso(r ?? `Se borró la cuenta de ${c.nombre}`); leer();
  };
  const borrarInvitados = async () => {
    if (!(await confirmar({ titulo: "¿Borrar a todos los invitados?", texto: "Se borran sus cuentas, su XP, sus figuras y las salas que abrieron. No se puede deshacer. Las cuentas normales no se tocan.", si: "Borrar invitados", peligro: true }))) return;
    const n = await adminBorrarInvitados();
    aviso(n === null ? "No se pudo borrar." : n === 0 ? "No había invitados." : `Se borraron ${n} invitados`); leer();
  };
  const lista = (cuentas ?? []).filter(c => c.nombre.toLowerCase().includes(busca.trim().toLowerCase()));

  return (
    <>
      <Bloque titulo={cuentas ? `Cuentas · ${cuentas.length}` : "Cuentas"}>
        {cuentas === undefined ? <p className="pf-suave" role="status">Leyendo cuentas…</p> : cuentas === null ? <p className="pf-suave">No se pudo leer. Revisa la conexión.</p> : <>
          <label className="cf-campo"><span>Buscar cuenta</span><span className="cf-campo-caja"><input value={busca} onChange={e => setBusca(e.target.value)} maxLength={30} /></span></label>
          <ul className="cf-cuentas">
            {lista.map(c => (
              <li key={c.id} className="cf-cuenta">
                <div className="cf-cuenta-top"><b>{c.nombre}</b><small>{c.acumulada.toLocaleString("es-MX")} XP · {c.disponible.toLocaleString("es-MX")} para gastar</small></div>
                <div className="cf-chips">
                  <button type="button" className="cf-chip" onClick={() => void xp(c, 50)}>+50 XP</button>
                  <button type="button" className="cf-chip" onClick={() => void xp(c, 100)}>+100 XP</button>
                  <button type="button" className="cf-chip" onClick={() => void xp(c, -50)}>−50 XP</button>
                  <button type="button" className={"cf-chip" + (abierta === c.id ? " on" : "")} aria-expanded={abierta === c.id} onClick={() => { setAbierta(abierta === c.id ? null : c.id); setClave(""); }}>Contraseña</button>
                  {c.id !== s.uid && <button type="button" className="cf-chip peligro" onClick={() => void borrarCuenta(c)}>Borrar cuenta</button>}
                </div>
                {abierta === c.id && <form className="cf-form" onSubmit={e => void poner(c, e)}>
                  <CampoClave etiqueta="Contraseña nueva (8 o más)" valor={clave} alCambiar={setClave} auto="new-password" />
                  <Boton tipo="peligro" submit desactivado={clave.length < 8}>Poner contraseña</Boton>
                </form>}
              </li>
            ))}
          </ul>
        </>}
      </Bloque>
      <Bloque titulo="Invitados de prueba">
        <p className="pf-suave">Quien entra sin cuenta deja una cuenta desechable. Bórralas al terminar las pruebas.</p>
        <Boton tipo="peligro" onClick={() => void borrarInvitados()}>Borrar invitados</Boton>
      </Bloque>
    </>
  );
}

// ---------- Acerca de ALV ----------

function PanelAcerca() {
  const [ver, setVer] = useState<"terminos" | "privacidad" | null>(null);
  const v = __ALV_VERSION__;
  const secciones = ver === "privacidad" ? SECCIONES_TERMINOS.filter(x => /^(2|3)\./.test(x.titulo)) : SECCIONES_TERMINOS;
  return (
    <>
      <Bloque titulo="Versión">
        <Fila titulo="ALV" ayuda="Amigos Legendarios Verdaderos" control={<span className="cf-dato">v{v.v}</span>} />
        <Fila titulo="Publicada" control={<span className="cf-dato">{v.dia}{v.commit ? ` · ${v.commit}` : ""}</span>} />
      </Bloque>
      <Bloque titulo="Legal">
        <div className="cf-legal">
          <Boton onClick={() => setVer(ver === "terminos" ? null : "terminos")}>{ver === "terminos" ? "Ocultar términos" : "Términos y condiciones"}</Boton>
          <Boton onClick={() => setVer(ver === "privacidad" ? null : "privacidad")}>{ver === "privacidad" ? "Ocultar privacidad" : "Política de privacidad"}</Boton>
        </div>
        {ver && (
          <article className="cf-terminos">
            {secciones.map(sec => <section key={sec.titulo}><h3>{sec.titulo}</h3>{sec.parrafos.map(t => <p key={t}>{t}</p>)}</section>)}
            <p className="pf-suave">Actualizados el {TERMINOS_ACTUALIZADOS}.</p>
          </article>
        )}
      </Bloque>
      <Bloque titulo="Créditos">
        <p className="cf-creditos"><b>{CREDITOS.titulo}</b>{CREDITOS.texto}</p>
        <p className="pf-suave">{CREDITOS.derechos}</p>
      </Bloque>
    </>
  );
}
