// Pantalla de carga, acceso y registro. ALV es solo para mayores de 18 (D1): la fecha la valida el servidor.
import { useEffect, useState, type CSSProperties, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { Boton, Icono } from "../ds";
import { cargarCapsulasNube, entrar, entrarInvitado, esNickInvitado, guardarRegistro, nickValido, passValida, registrar, salir, type Genero } from "../servicios/cuenta";
import { hayNube } from "../servicios/cliente";
import { recuperarCuenta } from "../servicios/aparato";
import { entrarDemo, refrescarSesion, useSesion, type Fase } from "../app/sesion";
import { ir } from "../app/rutas";
import { pantallaDeCarga } from "../app/musica";
import { sonar } from "../app/sonido";
import { Marco, urlArte } from "./comun";
import { LogoALV } from "./Logo";
import { edadDe, fechaDeTexto, formatoFecha } from "../app/fecha";
import { RuedaFecha } from "./RuedaFecha";
import { CREDITOS, SECCIONES_TERMINOS, TERMINOS_ACTUALIZADOS } from "../content/terminos";

export { edadDe, fechaDeTexto, formatoFecha };

/**
 * Tres opciones: Mujer, Hombre y «Prefiero no decirlo», que se guarda como «otro» (el servidor acepta hombre, mujer u otro).
 * En ALVersus quien prefirió no decirlo va al bando con menos gente y el anfitrión lo puede cambiar (app/bandos.ts).
 */
type GeneroUI = Genero | "nodice";
const GENEROS: [GeneroUI, string][] = [["mujer", "Mujer"], ["hombre", "Hombre"], ["nodice", "Prefiero no decirlo"]];
const generoServidor = (g: GeneroUI): Genero => (g === "nodice" ? "otro" : g);

// ---------- Piezas de las pantallas de acceso (estilo tarjeta clara sobre la ciudad del cartel) ----------

/** Iconos chicos de los campos (usuario y calendario no están en el Design System). */
const ICONO_CAMPO = {
  usuario: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c.8-4 3.8-6 7.5-6s6.7 2 7.5 6z",
  candado: "M5.5 10.5h13v10h-13zM7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5h-2.4V8a2.1 2.1 0 0 0-4.2 0v2.5z",
  calendario: "M4 5.5h16v15H4zM4 9.5h16M7.5 3.5h2v4h-2zM14.5 3.5h2v4h-2z",
} as const;
function IconoCampo({ id }: { id: keyof typeof ICONO_CAMPO }) {
  return <svg className="a-campo-ic" viewBox="0 0 24 24" aria-hidden="true"><path d={ICONO_CAMPO[id]} /></svg>;
}

/** Campo con icono a la izquierda. `ver`: muestra la etiqueta arriba. `derecha`: botón dentro del campo (ojo, calendario). */
function CampoIcono({ etiqueta, icono, ver = false, derecha, placeholder, ...props }: { etiqueta: string; icono: keyof typeof ICONO_CAMPO; ver?: boolean; derecha?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={"a-campo a-campo-ic-caja" + (ver ? "" : " a-campo-oculto") + (derecha ? " a-campo-der" : "")}>
      <span>{etiqueta}</span>
      <span className="a-campo-fila"><IconoCampo id={icono} /><input placeholder={placeholder ?? (ver ? undefined : etiqueta)} {...props} />{derecha}</span>
    </label>
  );
}

/** Ojo para mostrar u ocultar la contraseña escrita. */
function BotonOjo({ visible, alCambiar }: { visible: boolean; alCambiar: () => void }) {
  return (
    <button type="button" className="a-campo-btn" onClick={alCambiar} aria-pressed={visible} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
        {!visible && <path d="M4 3.5l16.5 17" />}
      </svg>
    </button>
  );
}

function CampoClave({ nueva, ...props }: { nueva: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  const [ver, setVer] = useState(false);
  return <CampoIcono etiqueta="Contraseña" icono="candado" type={ver ? "text" : "password"} autoComplete={nueva ? "new-password" : "current-password"}
    autoCapitalize="none" spellCheck={false} derecha={<BotonOjo visible={ver} alCambiar={() => setVer(v => !v)} />} {...props} />;
}

const ARTE_ACCESO = { "--arte-g": urlArte("cartel-inicio-1920.webp"), "--arte-c": urlArte("cartel-inicio-1100.webp") } as CSSProperties;
function FondoAcceso() { return <div className="d-bg a-fondo-acceso" aria-hidden="true" style={ARTE_ACCESO} />; }

/** Pantalla de acceso: botón de regresar (si hay a dónde), logo, lo que va bajo el logo y la tarjeta. */
function MarcoAcceso({ alVolver, bajoLogo, children }: { alVolver?: () => void; bajoLogo?: ReactNode; children: ReactNode }) {
  return (
    <Marco clase="a-centro a-acceso" fondo={<FondoAcceso />}>
      {alVolver && <button type="button" className="a-volver" onClick={alVolver} aria-label="Regresar"><Icono id="back" /></button>}
      <LogoALV tamano="medio" ruleta={false} className="a-acceso-logo" />
      {bajoLogo}
      {children}
    </Marco>
  );
}

/** Tarjeta clara con pestañas de carpeta arriba (o un solo título). */
function Tarjeta({ pestanas, activa, onCambio, children }: { pestanas: { id: string; texto: string }[]; activa: string; onCambio?: (id: string) => void; children: ReactNode }) {
  return (
    <section className="a-tarjeta">
      <div className={"a-tarjeta-tabs" + (pestanas.length === 1 ? " a-una" : "")} role="tablist" aria-label="Acceso">
        {pestanas.map(p => (
          <button key={p.id} type="button" role="tab" aria-selected={p.id === activa} className={p.id === activa ? "on" : ""} onClick={() => onCambio?.(p.id)}>{p.texto}</button>
        ))}
      </div>
      <div className="a-tarjeta-cuerpo">{children}</div>
    </section>
  );
}

const ARTE_INICIO = { "--arte-g": urlArte("cartel-inicio-1920.webp"), "--arte-c": urlArte("cartel-inicio-1100.webp") } as CSSProperties;
/** Tiempo mínimo de la barra antes de «Presiona para iniciar» (la ruleta sigue girando mientras). */
const CARGA_MS = 3000;

/**
 * Pantalla de inicio (carga y portada en una): cartel ilustrado con figuras fijas personalizadas (imagen, no 3D en vivo)
 * y el logo con su ruleta de títulos. Mientras `listo` es falso corre la barra; después aparece «Presiona para iniciar».
 * Es un solo componente para que la ruleta no se reinicie al pasar de cargar a la portada.
 */
function PantallaInicio({ listo, texto, onIniciar }: { listo: boolean; texto: string; onIniciar?: () => void }) {
  return (
    <Marco clase="a-inicio" fondo={<div className="d-bg a-fondo-inicio" aria-hidden="true" style={ARTE_INICIO} />}>
      <div className="a-inicio-caja">
        <div className="a-inicio-logo"><LogoALV /></div>
        <div className="a-inicio-hueco" aria-hidden="true" />
        <div className="a-inicio-lluvia" aria-hidden="true" />
        <div className="a-inicio-pie">
          {listo && onIniciar
            ? <Boton color="amarillo" principal className="a-inicio-boton" texto="Presiona para iniciar" sub="Un juego para jugar con tus amigos" icono="play" onClick={() => { sonar("clic"); onIniciar(); }} />
            : <><div className="a-barra a-inicio-barra" aria-hidden="true"><i /></div><p className="a-inicio-estado" role="status">{texto}</p></>}
          <small className="a-inicio-legal">© 2026 ALV · Solo para mayores de 18</small>
        </div>
      </div>
    </Marco>
  );
}

/** Carga: mientras se lee la sesión (con sesión ya abierta pasa directo al HUB). */
export function Carga({ texto = "Entrando…" }: { texto?: string }) {
  return <PantallaInicio listo={false} texto={texto} />;
}

/**
 * Inicio: se ve en CADA carga o recarga de ALV (App la quita al terminar). Primero la barra (mínimo CARGA_MS y hasta
 * saber si hay sesión); luego «Presiona para iniciar»: con sesión lleva al HUB, sin sesión a crear cuenta o entrar.
 */
export function Inicio({ fase, alTerminar }: { fase: Fase; alTerminar: () => void }) {
  const [tiempo, setTiempo] = useState(false), [acceso, setAcceso] = useState(false);
  useEffect(() => { const t = setTimeout(() => setTiempo(true), CARGA_MS); return () => clearTimeout(t); }, []);
  // Mientras se ve la pantalla de carga suena su pista (al primer toque: antes el navegador no deja).
  useEffect(() => { pantallaDeCarga(true); return () => pantallaDeCarga(false); }, []);
  // Entró o creó cuenta desde Acceso: se quita el inicio y manda la ruta (Acceso ya lleva a Personalizar si es nueva).
  useEffect(() => { if (acceso && fase !== "fuera" && fase !== "cargando") alTerminar(); }, [acceso, fase, alTerminar]);
  if (acceso && fase === "fuera") return <Acceso alVolver={() => setAcceso(false)} />;
  const iniciar = () => { if (fase === "fuera") setAcceso(true); else { ir("inicio"); alTerminar(); } };
  return <PantallaInicio listo={tiempo && fase !== "cargando"} texto={fase === "cargando" ? "Entrando…" : "Cargando…"} onIniciar={iniciar} />;
}

/** Cuenta nueva: a personalizar, salvo que ya tenga figura guardada en la nube. Si no se pudo leer, va al HUB. */
async function irAPersonalizarSiNueva(): Promise<void> {
  const nube = await cargarCapsulasNube();
  if (nube && !nube.slots.some(Boolean)) ir("personalizar");
}


/**
 * Fecha de nacimiento: se escribe DD/MM/AAAA (teclado de números en celular) o se elige con la rueda Día / Mes / Año
 * que abre el calendario de la derecha. Solo con una fecha que existe se entrega AAAA-MM-DD (si no, ""); la edad la
 * validan `edadDe` y el servidor.
 */
export function FechaNacimiento({ valor, alCambiar }: { valor: string; alCambiar: (v: string) => void }) {
  const [texto, setTexto] = useState(() => (valor ? valor.split("-").reverse().join("/") : ""));
  const [rueda, setRueda] = useState(false);
  const escribir = (t: string) => { const f = formatoFecha(t); setTexto(f); alCambiar(fechaDeTexto(f)); };
  const completa = texto.replace(/\D/g, "").length === 8, mala = completa && !fechaDeTexto(texto);
  return (
    <div className="a-fecha">
      <CampoIcono etiqueta="Fecha de nacimiento" icono="calendario" ver placeholder="DD/MM/AAAA" inputMode="numeric" autoComplete="bday" maxLength={10}
        value={texto} onChange={e => escribir(e.target.value)} aria-invalid={mala || undefined} required
        derecha={
          <button type="button" className={"a-campo-btn" + (rueda ? " on" : "")} onClick={() => setRueda(r => !r)} aria-expanded={rueda} aria-label={rueda ? "Cerrar la rueda de fecha" : "Elegir girando día, mes y año"}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v15H4zM4 9.5h16M8 3.5v4M16 3.5v4" /><path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" /></svg>
          </button>} />
      {mala && <small className="a-fecha-aviso" role="alert">Esa fecha no existe. Usa DD/MM/AAAA.</small>}
      {rueda && <RuedaFecha valor={fechaDeTexto(texto)} alCambiar={iso => escribir(iso.split("-").reverse().join(""))} alCerrar={() => setRueda(false)} />}
    </div>
  );
}

function DatosEdad({ nac, setNac, genero, setGenero }: { nac: string; setNac: (v: string) => void; genero: GeneroUI | ""; setGenero: (g: GeneroUI) => void }) {
  return (
    <>
      <FechaNacimiento valor={nac} alCambiar={setNac} />
      <div className="a-campo"><span>Género (solo para armar equipos)</span>
        <div className="a-generos" role="radiogroup" aria-label="Género">
          {GENEROS.map(([g, t]) => <button key={g} type="button" role="radio" aria-checked={genero === g} className={"a-pildora" + (genero === g ? " on" : "")} onClick={() => setGenero(g)}>{t}</button>)}
        </div>
      </div>
    </>
  );
}

/** Términos y Condiciones y Política de Privacidad, con los créditos de Elías arriba. Fondo del cartel difuminado. */
function Terminos({ alVolver }: { alVolver: () => void }) {
  useEffect(() => { document.querySelector(".a-acceso .a-scroll")?.scrollTo({ top: 0 }); }, []);
  return (
    <MarcoAcceso alVolver={alVolver}>
      <Tarjeta pestanas={[{ id: "terminos", texto: "Términos y Privacidad" }]} activa="terminos">
        <article className="a-terminos">
          <header className="a-creditos">
            <span className="a-creditos-titulo">{CREDITOS.titulo}</span>
            <p>{CREDITOS.texto}</p>
            <small>{CREDITOS.derechos}</small>
          </header>
          {SECCIONES_TERMINOS.map(sec => (
            <section key={sec.titulo}>
              <h2>{sec.titulo}</h2>
              {sec.parrafos.map(t => <p key={t}>{t}</p>)}
            </section>
          ))}
          <p className="a-terminos-fecha">Actualizados el {TERMINOS_ACTUALIZADOS}.</p>
          <Boton color="amarillo" className="a-tarjeta-boton" texto="Entendido" icono="back" onClick={alVolver} />
        </article>
      </Tarjeta>
    </MarcoAcceso>
  );
}

/** Entrar sin cuenta, solo para probar: apodo y confirmar mayoría de edad. No pide fecha ni contraseña. */
function Invitado({ volver }: { volver: () => void }) {
  const [apodo, setApodo] = useState(""), [mayor, setMayor] = useState(false), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const enviar = async (e?: FormEvent) => {
    e?.preventDefault();
    if (ocupado) return;
    if (apodo.trim().length < 2) { setError("Escribe un apodo de 2 a 20 letras."); return; }
    if (!mayor) { setError("ALV es solo para mayores de 18 años."); return; }
    setOcupado(true); setError(null);
    const fallo = await entrarInvitado(apodo);
    setOcupado(false);
    if (fallo) { setError(fallo); return; }
    await irAPersonalizarSiNueva();
    await refrescarSesion();
  };
  return (
    <MarcoAcceso alVolver={volver}>
      <Tarjeta pestanas={[{ id: "prueba", texto: "Entrar de prueba" }]} activa="prueba">
        <form onSubmit={e => void enviar(e)} className="a-pila">
          <p className="a-suave">Juegas sin crear cuenta. Es una entrada de prueba: lo que ganes se borra cuando terminen las pruebas.</p>
          <CampoIcono etiqueta="Tu apodo" icono="usuario" value={apodo} maxLength={20} onChange={e => setApodo(e.target.value)} autoComplete="off" autoFocus required />
          <label className="a-check"><input type="checkbox" checked={mayor} onChange={e => setMayor(e.target.checked)} /><span>Soy mayor de 18 y acepto jugar con respeto: nadie está obligado a tomar ni a cumplir un reto.</span></label>
          {error && <p className="a-error" role="alert">{error}</p>}
          <Boton color="amarillo" texto="Entrar de prueba" icono="play" cargando={ocupado} onClick={() => void enviar()} />
          <button type="submit" hidden />
          <button type="button" className="a-tarjeta-pie" onClick={volver}>Tengo cuenta o quiero crear una</button>
        </form>
      </Tarjeta>
    </MarcoAcceso>
  );
}

/** 055: personaje rápido que olvidó su contraseña: usuario + código de recuperación + contraseña nueva. */
function Recuperar({ volver }: { volver: () => void }) {
  const [usuario, setUsuario] = useState(""), [codigo, setCodigo] = useState(""), [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false), [hecho, setHecho] = useState(false);
  const enviar = async (e?: FormEvent) => {
    e?.preventDefault();
    if (ocupado) return;
    setOcupado(true); setError(null);
    const fallo = await recuperarCuenta(usuario, codigo, clave);
    if (fallo) { setOcupado(false); setError(fallo); return; }
    const f2 = await entrar(usuario, clave);
    setOcupado(false);
    if (f2) { setHecho(true); return; }
    await refrescarSesion();
  };
  return (
    <MarcoAcceso alVolver={volver}>
      <Tarjeta pestanas={[{ id: "recuperar", texto: "Recuperar acceso" }]} activa="recuperar">
        {hecho ? <div className="a-pila">
          <p className="a-suave">Listo: tu contraseña cambió. Entra con tu usuario y la contraseña nueva.</p>
          <Boton color="amarillo" texto="Ir a iniciar sesión" icono="play" onClick={volver} />
        </div> : <form onSubmit={e => void enviar(e)} className="a-pila">
          <p className="a-suave">Para personajes creados en el lobby: usa el código de recuperación que se mostró al crearlo.</p>
          <CampoIcono etiqueta="Usuario" icono="usuario" value={usuario} onChange={e => setUsuario(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={20} required autoFocus />
          <CampoIcono etiqueta="Código de recuperación" icono="candado" ver value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={14} placeholder="XXXX-XXXX-XXXX" required />
          <CampoClave nueva value={clave} onChange={e => setClave(e.target.value)} maxLength={72} required />
          {error && <p className="a-error" role="alert">{error}</p>}
          <Boton color="amarillo" texto="Poner contraseña nueva" icono="play" cargando={ocupado} onClick={() => void enviar()} />
          <button type="submit" hidden />
          <button type="button" className="a-tarjeta-pie" onClick={volver}>Volver a iniciar sesión</button>
        </form>}
      </Tarjeta>
    </MarcoAcceso>
  );
}

/** Entrar o crear cuenta. `alVolver`: regresa a la pantalla de inicio (si se llegó desde ahí). */
export function Acceso({ alVolver }: { alVolver?: () => void } = {}) {
  const [tab, setTab] = useState<"entrar" | "crear">("entrar");
  const [invitado, setInvitado] = useState(false), [terminos, setTerminos] = useState(false), [recuperar, setRecuperar] = useState(false);
  const [nick, setNick] = useState(""), [pass, setPass] = useState(""), [nac, setNac] = useState(""), [genero, setGenero] = useState<GeneroUI | "">("");
  const [acepto, setAcepto] = useState(false), [mayor, setMayor] = useState(false), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);

  if (!hayNube) {
    return (
      <MarcoAcceso alVolver={alVolver}>
        <Tarjeta pestanas={[{ id: "demo", texto: "Modo de prueba" }]} activa="demo">
          <form onSubmit={e => { e.preventDefault(); entrarDemo(nick); }} className="a-pila">
            <p className="a-suave">Sin servidor: todo se queda en este navegador.</p>
            <CampoIcono etiqueta="Tu apodo" icono="usuario" value={nick} maxLength={20} onChange={e => setNick(e.target.value)} autoFocus required />
            <Boton color="amarillo" className="a-tarjeta-boton" texto="Entrar" icono="play" onClick={() => entrarDemo(nick)} />
          </form>
        </Tarjeta>
      </MarcoAcceso>
    );
  }

  if (invitado) return <Invitado volver={() => setInvitado(false)} />;
  if (recuperar) return <Recuperar volver={() => setRecuperar(false)} />;
  // Los términos se ven encima del formulario: al volver sigue lo que ya se había llenado.
  if (terminos) return <Terminos alVolver={() => setTerminos(false)} />;
  const verTerminos = (e: { preventDefault: () => void }) => { e.preventDefault(); setTerminos(true); };

  const enviar = async (e?: FormEvent) => {
    e?.preventDefault();
    if (ocupado) return;
    setError(null);
    if (tab === "crear" && esNickInvitado(nick)) { setError("Ese apodo no se puede usar. Prueba con otro."); return; }
    if (!nickValido(nick) || !passValida(pass)) { setError("Apodo de 3 a 20 letras, números o guion bajo. Contraseña de 8 o más."); return; }
    if (tab === "crear") {
      if (!nac || !genero) { setError("Falta tu fecha de nacimiento o tu género."); return; }
      if (edadDe(nac) < 18) { setError("ALV es solo para mayores de 18 años."); return; }
      if (!acepto) { setError("Falta aceptar los Términos y Condiciones."); return; }
      if (!mayor) { setError("Falta confirmar que eres mayor de 18 años."); return; }
    }
    setOcupado(true);
    const fallo = tab === "crear" ? await registrar(nick, pass) : await entrar(nick, pass);
    if (!fallo && tab === "crear" && genero) await guardarRegistro(nac, generoServidor(genero));
    setOcupado(false);
    if (fallo) { setError(tab === "crear" ? "No se pudo crear. Puede que ese apodo ya exista." : "Apodo o contraseña incorrectos."); return; }
    if (tab === "crear") await irAPersonalizarSiNueva();
    await refrescarSesion();
  };

  const cambiar = (t: "entrar" | "crear") => { setTab(t); setError(null); };
  return (
    <MarcoAcceso alVolver={alVolver} bajoLogo={tab === "crear" && <button type="button" className="a-bajo-logo" onClick={() => cambiar("entrar")}>¿Ya tienes cuenta? <b>Inicia sesión</b></button>}>
      <Tarjeta activa={tab} onCambio={t => cambiar(t as "entrar" | "crear")} pestanas={[{ id: "entrar", texto: "Iniciar sesión" }, { id: "crear", texto: "Registrarse" }]}>
        <form onSubmit={e => void enviar(e)} className="a-pila">
          <CampoIcono etiqueta="Usuario" icono="usuario" value={nick} onChange={e => setNick(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={20} required />
          <CampoClave nueva={tab === "crear"} value={pass} onChange={e => setPass(e.target.value)} maxLength={72} required />
          {tab === "crear" && <>
            <DatosEdad nac={nac} setNac={setNac} genero={genero} setGenero={setGenero} />
            <label className="a-check"><input type="checkbox" checked={acepto} onChange={e => setAcepto(e.target.checked)} /><span>Acepto los <button type="button" className="a-enlace" onClick={verTerminos}>Términos y Condiciones</button> y <button type="button" className="a-enlace" onClick={verTerminos}>Política de Privacidad</button></span></label>
            <label className="a-check"><input type="checkbox" checked={mayor} onChange={e => setMayor(e.target.checked)} /><span>Confirmo que soy mayor de 18 años y jugaré con respeto.</span></label>
          </>}
          {error && <p className="a-error" role="alert">{error}</p>}
          <Boton color="amarillo" className={"a-tarjeta-boton" + (tab === "crear" ? " a-boton-registro" : "")} texto={tab === "crear" ? "Registrarme" : "Entrar"} icono="play" cargando={ocupado} onClick={() => void enviar()} />
          <button type="submit" hidden />
          {tab === "entrar" && <p className="a-nota">¿Olvidaste tu contraseña? <button type="button" className="a-enlace" onClick={() => setRecuperar(true)}>Tengo código de recuperación</button> o pídele a Elías que te ponga una nueva.</p>}
          <button type="button" className="a-tarjeta-pie" onClick={() => cambiar(tab === "crear" ? "entrar" : "crear")}>
            {tab === "crear" ? <>¿Ya tienes cuenta? <b>Inicia sesión</b></> : <>¿No tienes cuenta? <b>Regístrate</b></>}
          </button>
        </form>
      </Tarjeta>
      <button type="button" className="a-plano" onClick={() => setInvitado(true)}>Solo quiero probar: entrar sin cuenta</button>
    </MarcoAcceso>
  );
}

/** La cuenta existe pero no tiene fecha de nacimiento: se pide antes de entrar. */
export function CompletarRegistro() {
  const [nac, setNac] = useState(""), [genero, setGenero] = useState<GeneroUI | "">(""), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const guardar = async () => {
    if (!nac || !genero) { setError("Falta tu fecha de nacimiento o tu género."); return; }
    setOcupado(true);
    const r = await guardarRegistro(nac, generoServidor(genero));
    setOcupado(false);
    if (r === null) { setError("No se pudo guardar. Revisa la fecha."); return; }
    await refrescarSesion();
  };
  return (
    <MarcoAcceso>
      <Tarjeta pestanas={[{ id: "dato", texto: "Un dato antes de jugar" }]} activa="dato"><div className="a-pila">
        <p className="a-suave">La fecha se guarda una sola vez y nadie más la ve.</p>
        <DatosEdad nac={nac} setNac={setNac} genero={genero} setGenero={setGenero} />
        {error && <p className="a-error" role="alert">{error}</p>}
        <Boton color="amarillo" texto="Guardar y entrar" icono="play" cargando={ocupado} onClick={() => void guardar()} />
        <button type="button" className="a-tarjeta-pie" onClick={() => void salir().then(refrescarSesion)}>Salir de la cuenta</button>
      </div></Tarjeta>
    </MarcoAcceso>
  );
}

/** Cuenta con fecha de menor de edad: no entra. Solo un administrador puede corregir la fecha. */
export function SoloMayores() {
  const s = useSesion();
  return (
    <MarcoAcceso>
      <Tarjeta pestanas={[{ id: "mayores", texto: "Solo mayores de 18" }]} activa="mayores"><div className="a-pila">
        <p className="a-suave">{s.nombre}, tu fecha de nacimiento dice que eres menor de edad y ALV es solo para adultos. Si la fecha está mal, pídele a Elías que la corrija.</p>
        <Boton color="rojo" texto="Salir de la cuenta" icono="back" onClick={() => void salir().then(refrescarSesion)} />
      </div></Tarjeta>
    </MarcoAcceso>
  );
}
