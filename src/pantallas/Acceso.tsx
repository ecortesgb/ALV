// Pantalla de carga, acceso y registro. ALV es solo para mayores de 18 (D1): la fecha la valida el servidor.
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { Boton, Icono } from "../ds";
import { cargarCapsulasNube, entrar, entrarInvitado, esNickInvitado, guardarRegistro, nickValido, passValida, registrar, salir, type Genero } from "../servicios/cuenta";
import { hayNube } from "../servicios/cliente";
import { entrarDemo, refrescarSesion, useSesion, type Fase } from "../app/sesion";
import { ir } from "../app/rutas";
import { sonar } from "../app/sonido";
import { Marco, urlArte } from "./comun";
import { LogoALV } from "./Logo";

const hoy = () => new Date();
/** Edad cumplida a partir de AAAA-MM-DD. */
export function edadDe(nacimiento: string, ref = hoy()): number {
  const [a, m, d] = nacimiento.split("-").map(Number) as [number, number, number];
  let e = ref.getFullYear() - a;
  if (ref.getMonth() + 1 < m || (ref.getMonth() + 1 === m && ref.getDate() < d)) e--;
  return e;
}
const GENEROS: [Genero, string][] = [["mujer", "Mujer"], ["hombre", "Hombre"], ["otro", "Otro"]];

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

/** Campo con icono a la izquierda. `ver`: muestra la etiqueta arriba (para la fecha, que no tiene texto de ejemplo). */
function CampoIcono({ etiqueta, icono, ver = false, ...props }: { etiqueta: string; icono: keyof typeof ICONO_CAMPO; ver?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={"a-campo a-campo-ic-caja" + (ver ? "" : " a-campo-oculto")}>
      <span>{etiqueta}</span>
      <span className="a-campo-fila"><IconoCampo id={icono} /><input placeholder={ver ? undefined : etiqueta} {...props} /></span>
    </label>
  );
}

const ARTE_ACCESO = { "--arte-g": urlArte("cartel-inicio-1920.webp"), "--arte-c": urlArte("cartel-inicio-1100.webp") } as CSSProperties;
function FondoAcceso() { return <div className="d-bg a-fondo-acceso" aria-hidden="true" style={ARTE_ACCESO} />; }

/** Pantalla de acceso: botón de regresar (si hay a dónde), logo y la tarjeta. */
function MarcoAcceso({ alVolver, children }: { alVolver?: () => void; children: ReactNode }) {
  return (
    <Marco clase="a-centro a-acceso" fondo={<FondoAcceso />}>
      {alVolver && <button type="button" className="a-volver" onClick={alVolver} aria-label="Regresar"><Icono id="back" /></button>}
      <LogoALV tamano="medio" ruleta={false} className="a-acceso-logo" />
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

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const diasDelMes = (anio: number, mes: number) => new Date(anio || 2000, mes, 0).getDate(); // mes 1–12; sin año, 29 de febrero vale

/**
 * Fecha de nacimiento con tres listas (día, mes, año) en vez del calendario: en celular abren la rueda del teléfono.
 * Años desde el actual menos 18 hacia atrás. Solo cuando las tres están elegidas se entrega AAAA-MM-DD (si no, "").
 */
export function FechaNacimiento({ valor, alCambiar }: { valor: string; alCambiar: (v: string) => void }) {
  const [a0, m0, d0] = valor ? valor.split("-").map(Number) : [0, 0, 0];
  const [dia, setDia] = useState(d0 || 0), [mes, setMes] = useState(m0 || 0), [anio, setAnio] = useState(a0 || 0);
  const tope = hoy().getFullYear() - 18;
  const anios = useMemo(() => Array.from({ length: tope - 1919 }, (_, i) => tope - i), [tope]);
  const maxDia = mes ? diasDelMes(anio, mes) : 31;
  const fijar = (d: number, m: number, a: number) => {
    const dd = m && d > diasDelMes(a, m) ? diasDelMes(a, m) : d; // 31 de abril → 30
    setDia(dd); setMes(m); setAnio(a);
    alCambiar(dd && m && a ? `${a}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}` : "");
  };
  return (
    <fieldset className="a-campo a-fecha">
      <legend>Fecha de nacimiento</legend>
      <div className="a-fecha-fila">
        <select aria-label="Día" value={dia || ""} onChange={e => fijar(Number(e.target.value), mes, anio)} required>
          <option value="" disabled>Día</option>
          {Array.from({ length: maxDia }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select aria-label="Mes" value={mes || ""} onChange={e => fijar(dia, Number(e.target.value), anio)} required>
          <option value="" disabled>Mes</option>
          {MESES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
        </select>
        <select aria-label="Año" value={anio || ""} onChange={e => fijar(dia, mes, Number(e.target.value))} required>
          <option value="" disabled>Año</option>
          {anios.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
    </fieldset>
  );
}

function DatosEdad({ nac, setNac, genero, setGenero }: { nac: string; setNac: (v: string) => void; genero: Genero | ""; setGenero: (g: Genero) => void }) {
  return (
    <>
      <FechaNacimiento valor={nac} alCambiar={setNac} />
      <div className="a-campo"><span>Género (solo para armar equipos)</span>
        <div className="a-fila" role="radiogroup" aria-label="Género">
          {GENEROS.map(([g, t]) => <button key={g} type="button" role="radio" aria-checked={genero === g} className={"d-chip a-chip-g" + (genero === g ? " on" : "")} onClick={() => setGenero(g)}>{t}</button>)}
        </div>
      </div>
    </>
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

/** Entrar o crear cuenta. `alVolver`: regresa a la pantalla de inicio (si se llegó desde ahí). */
export function Acceso({ alVolver }: { alVolver?: () => void } = {}) {
  const [tab, setTab] = useState<"entrar" | "crear">("entrar");
  const [invitado, setInvitado] = useState(false);
  const [nick, setNick] = useState(""), [pass, setPass] = useState(""), [nac, setNac] = useState(""), [genero, setGenero] = useState<Genero | "">("");
  const [acepto, setAcepto] = useState(false), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);

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

  const enviar = async (e?: FormEvent) => {
    e?.preventDefault();
    if (ocupado) return;
    setError(null);
    if (tab === "crear" && esNickInvitado(nick)) { setError("Ese apodo no se puede usar. Prueba con otro."); return; }
    if (!nickValido(nick) || !passValida(pass)) { setError("Apodo de 3 a 20 letras, números o guion bajo. Contraseña de 8 o más."); return; }
    if (tab === "crear") {
      if (!nac || !genero) { setError("Falta tu fecha de nacimiento o tu género."); return; }
      if (edadDe(nac) < 18) { setError("ALV es solo para mayores de 18 años."); return; }
      if (!acepto) { setError("Falta aceptar las reglas."); return; }
    }
    setOcupado(true);
    const fallo = tab === "crear" ? await registrar(nick, pass) : await entrar(nick, pass);
    if (!fallo && tab === "crear" && genero) await guardarRegistro(nac, genero);
    setOcupado(false);
    if (fallo) { setError(tab === "crear" ? "No se pudo crear. Puede que ese apodo ya exista." : "Apodo o contraseña incorrectos."); return; }
    if (tab === "crear") await irAPersonalizarSiNueva();
    await refrescarSesion();
  };

  const cambiar = (t: "entrar" | "crear") => { setTab(t); setError(null); };
  return (
    <MarcoAcceso alVolver={alVolver}>
      <Tarjeta activa={tab} onCambio={t => cambiar(t as "entrar" | "crear")} pestanas={[{ id: "entrar", texto: "Iniciar sesión" }, { id: "crear", texto: "Registrarse" }]}>
        <form onSubmit={e => void enviar(e)} className="a-pila">
          <CampoIcono etiqueta="Usuario" icono="usuario" value={nick} onChange={e => setNick(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={20} required />
          <CampoIcono etiqueta="Contraseña" icono="candado" type="password" value={pass} onChange={e => setPass(e.target.value)} autoComplete={tab === "crear" ? "new-password" : "current-password"} maxLength={72} required />
          {tab === "crear" && <>
            <DatosEdad nac={nac} setNac={setNac} genero={genero} setGenero={setGenero} />
            <label className="a-check"><input type="checkbox" checked={acepto} onChange={e => setAcepto(e.target.checked)} /><span>Soy mayor de 18 y acepto jugar con respeto: nadie está obligado a tomar ni a cumplir un reto.</span></label>
          </>}
          {error && <p className="a-error" role="alert">{error}</p>}
          <Boton color="amarillo" className="a-tarjeta-boton" texto={tab === "crear" ? "Registrarme" : "Entrar"} icono="play" cargando={ocupado} onClick={() => void enviar()} />
          <button type="submit" hidden />
          {tab === "entrar" && <p className="a-nota">¿Olvidaste tu contraseña? Pídele a Elías que te ponga una nueva.</p>}
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
  const [nac, setNac] = useState(""), [genero, setGenero] = useState<Genero | "">(""), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const guardar = async () => {
    if (!nac || !genero) { setError("Falta tu fecha de nacimiento o tu género."); return; }
    setOcupado(true);
    const r = await guardarRegistro(nac, genero);
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
