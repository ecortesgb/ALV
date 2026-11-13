// Cuenta del jugador: entrar o crear con nickname y contraseña. Si no hay servidor, no se muestra nada.
import { useEffect, useRef, useState } from "react";
import { acciones, edadDe, useEstado, type JugadorLocal } from "./estado";
import { cargarPersonaje, cuentaActiva, entrar, guardarPersonaje, guardarRegistro, hayNube, leerCuenta, miRegistro, registrar, salir, sesionActual, nickValido, type Genero } from "./nube";
import { aviso } from "./comun";

/**
 * Siempre montado en la app: al abrir trae de la cuenta el personaje, la XP y el inventario,
 * y guarda cada cambio del personaje (desde cualquier pantalla, no solo Perfil).
 */
export function SincroCuenta() {
  const s = useEstado();
  const id = s.cuenta?.jugador ?? s.jugadores[0]?.id;
  const j = s.jugadores.find(x => x.id === id);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!hayNube || !id) return;
    let vivo = true;
    sesionActual().then(async ses => {
      if (!vivo) return;
      if (!ses) { acciones.olvidarCuenta(); return; }
      const [guardado, datos, registro] = await Promise.all([cargarPersonaje(), leerCuenta(), miRegistro()]);
      if (!vivo) return;
      acciones.registro(registro ?? undefined);
      if (guardado) acciones.personajeDeNube(id, guardado);
      if (datos) acciones.sincronizarCuenta(id, datos);
    });
    return () => { vivo = false; };
    // Solo al abrir la app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Solo se guarda después de haber leído la cuenta en esta visita (s.cuenta se borra al abrir la app).
  useEffect(() => {
    if (!hayNube || !j || !s.cuenta || !cuentaActiva()) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void guardarPersonaje(j.personaje); }, 900);
    return () => window.clearTimeout(timer.current);
  }, [j?.personaje, s.cuenta, j]);

  return null;
}

/** `alTerminar` se llama al entrar o crear la cuenta (true si se creó una nueva). */
export function Cuenta({ j, alTerminar }: { j: JugadorLocal; alTerminar?: (creada: boolean) => void }) {
  const s = useEstado();
  const [modo, setModo] = useState<"entrar" | "crear">("entrar");
  const [nick, setNick] = useState("");
  const [pass, setPass] = useState("");
  const [nacimiento, setNacimiento] = useState("");
  const [genero, setGenero] = useState<Genero | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const sesion = s.cuenta ? cuentaActiva() : null;

  if (!hayNube) return null;

  const enviar = async () => {
    if (!nickValido(nick)) { setError("El nickname va de 3 a 20 letras, números o _."); return; }
    if (modo === "crear") { const e = errorRegistro(nacimiento, genero); if (e) { setError(e); return; } }
    setOcupado(true); setError(null);
    const err = modo === "crear" ? await registrar(nick, pass) : await entrar(nick, pass);
    if (err) { setOcupado(false); setError(err); return; }
    setPass("");
    if (modo === "entrar") {
      const guardado = await cargarPersonaje();
      if (guardado) acciones.personajeDeNube(j.id, guardado);
    }
    if (modo === "crear" && genero) {
      // Si la fecha no se pudo guardar, la cuenta ya existe: se pedirá otra vez en «Tu cuenta».
      if (await guardarRegistro(nacimiento, genero) !== null) acciones.registro({ nacimiento, genero });
    } else {
      acciones.registro((await miRegistro()) ?? undefined);
    }
    const datos = await leerCuenta();
    if (datos) acciones.sincronizarCuenta(j.id, datos);
    setOcupado(false);
    aviso(modo === "crear" ? "Cuenta creada. Tu personaje, tu XP y tus compras se guardan solos." : "Bienvenido de nuevo.");
    alTerminar?.(modo === "crear");
  };

  if (sesion && s.cuenta) {
    const otro = s.cuenta.jugador !== j.id;
    return (
      <section className="card" aria-labelledby="t-cuenta">
        <div className="entre"><h2 id="t-cuenta">Tu cuenta</h2><span className="chip lime">{sesion}</span></div>
        {otro
          ? <p className="hint">La cuenta de este celular está abierta en otro jugador del grupo. Lo de este jugador se guarda solo aquí.</p>
          : <p className="hint">Tu personaje, tu XP y lo que compras se guardan en la nube. Al entrar con tu nickname y contraseña lo recuperas en cualquier celular.</p>}
        {!otro && !s.registro && <CompletarRegistro />}
        {!otro && s.registro && <p className="hint">Género: {NOMBRE_GENERO[s.registro.genero]} · {edadDe(s.registro.nacimiento) >= 18 ? "mayor de edad" : "menor de edad: sin contenido adulto ni Drunk"}</p>}
        {!otro && <button className="btn sm" onClick={async () => { await salir(); acciones.olvidarCuenta(); }}>Salir de la cuenta</button>}
      </section>
    );
  }

  return (
    <section className="card" aria-labelledby="t-cuenta">
      <h2 id="t-cuenta">Tu cuenta</h2>
      <div className="chips" role="group" aria-label="Entrar o crear cuenta">
        <button className="opcion" aria-pressed={modo === "entrar"} onClick={() => setModo("entrar")}>Ya tengo cuenta</button>
        <button className="opcion" aria-pressed={modo === "crear"} onClick={() => setModo("crear")}>Crear cuenta</button>
      </div>
      <label className="pila"><span className="label">Nickname</span>
        <input value={nick} maxLength={20} autoComplete="username" onChange={e => setNick(e.target.value)} placeholder="ej. chiva_77" />
      </label>
      <label className="pila"><span className="label">Contraseña</span>
        <input type="password" value={pass} maxLength={72} autoComplete={modo === "crear" ? "new-password" : "current-password"} onChange={e => setPass(e.target.value)} placeholder="mínimo 8 caracteres" />
      </label>
      {modo === "crear" && <CamposRegistro nacimiento={nacimiento} setNacimiento={setNacimiento} genero={genero} setGenero={setGenero} />}
      {modo === "crear" && <p className="hint">Sin correo no hay recuperación: si olvidas la contraseña, pierdes la cuenta.</p>}
      {error && <p className="hint" role="alert" style={{ color: "var(--pink)" }}>{error}</p>}
      <button className="btn principal" disabled={ocupado || !nick || !pass || (modo === "crear" && (!nacimiento || !genero))} onClick={enviar}>{ocupado ? "Un momento…" : modo === "crear" ? "Crear cuenta" : "Entrar"}</button>
    </section>
  );
}

const NOMBRE_GENERO: Record<Genero, string> = { hombre: "Hombre", mujer: "Mujer", otro: "Otro" };

/** Fecha máxima aceptada (6 años cumplidos), igual que el servidor. */
function fechaMaxima(): string {
  const d = new Date(); d.setFullYear(d.getFullYear() - 6);
  return d.toISOString().slice(0, 10);
}

/** Revisa la fecha y el género antes de mandarlos. El servidor vuelve a validar todo. */
function errorRegistro(nacimiento: string, genero: Genero | null): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nacimiento) || nacimiento < "1900-01-01" || nacimiento > fechaMaxima()) return "Pon tu fecha de nacimiento real.";
  if (!genero) return "Elige una opción de género.";
  return null;
}

/** Fecha de nacimiento (para saber si es mayor de edad) y género (para «guerra de sexos»). */
function CamposRegistro({ nacimiento, setNacimiento, genero, setGenero }:
  { nacimiento: string; setNacimiento: (v: string) => void; genero: Genero | null; setGenero: (g: Genero) => void }) {
  return (
    <>
      <label className="pila"><span className="label">Fecha de nacimiento</span>
        <input type="date" className="input" value={nacimiento} min="1900-01-01" max={fechaMaxima()} onChange={e => setNacimiento(e.target.value)} />
      </label>
      <div className="pila" role="group" aria-labelledby="t-genero">
        <span id="t-genero" className="label">Género</span>
        <div className="chips">
          {(Object.keys(NOMBRE_GENERO) as Genero[]).map(g => (
            <button key={g} type="button" className="opcion" aria-pressed={genero === g} onClick={() => setGenero(g)}>{NOMBRE_GENERO[g]}</button>
          ))}
        </div>
      </div>
      <p className="hint">Tu fecha solo la ves tú y no se puede cambiar después: sirve para saber si puedes jugar contenido adulto. El género se usa en «guerra de sexos» y sí se puede cambiar.</p>
    </>
  );
}

/** Para cuentas creadas antes de pedir fecha y género. */
function CompletarRegistro() {
  const [nacimiento, setNacimiento] = useState("");
  const [genero, setGenero] = useState<Genero | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const guardar = async () => {
    const e = errorRegistro(nacimiento, genero);
    if (e || !genero) { setError(e); return; }
    setOcupado(true); setError(null);
    const r = await guardarRegistro(nacimiento, genero);
    setOcupado(false);
    if (r === null) { setError("No se pudo guardar. Intenta de nuevo."); return; }
    acciones.registro({ nacimiento, genero });
    aviso("Datos guardados.");
  };
  return (
    <div className="pila" style={{ paddingTop: 4 }}>
      <b>Completa tu registro</b>
      <CamposRegistro nacimiento={nacimiento} setNacimiento={setNacimiento} genero={genero} setGenero={setGenero} />
      {error && <p className="hint" role="alert" style={{ color: "var(--pink)" }}>{error}</p>}
      <button className="btn lime" disabled={ocupado || !nacimiento || !genero} onClick={() => void guardar()}>{ocupado ? "Un momento…" : "Guardar"}</button>
    </div>
  );
}
