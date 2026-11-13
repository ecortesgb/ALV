// Cuenta del jugador: entrar o crear con nickname y contraseña. Si no hay servidor, no se muestra nada.
import { useEffect, useRef, useState } from "react";
import { acciones, useEstado, type JugadorLocal } from "./estado";
import { cargarPersonaje, cuentaActiva, entrar, guardarPersonaje, hayNube, leerCuenta, registrar, salir, sesionActual, nickValido } from "./nube";
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
      const [guardado, datos] = await Promise.all([cargarPersonaje(), leerCuenta()]);
      if (!vivo) return;
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
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const sesion = s.cuenta ? cuentaActiva() : null;

  if (!hayNube) return null;

  const enviar = async () => {
    if (!nickValido(nick)) { setError("El nickname va de 3 a 20 letras, números o _."); return; }
    setOcupado(true); setError(null);
    const err = modo === "crear" ? await registrar(nick, pass) : await entrar(nick, pass);
    if (err) { setOcupado(false); setError(err); return; }
    setPass("");
    if (modo === "entrar") {
      const guardado = await cargarPersonaje();
      if (guardado) acciones.personajeDeNube(j.id, guardado);
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
      {modo === "crear" && <p className="hint">Sin correo no hay recuperación: si olvidas la contraseña, pierdes la cuenta.</p>}
      {error && <p className="hint" role="alert" style={{ color: "var(--pink)" }}>{error}</p>}
      <button className="btn principal" disabled={ocupado || !nick || !pass} onClick={enviar}>{ocupado ? "Un momento…" : modo === "crear" ? "Crear cuenta" : "Entrar"}</button>
    </section>
  );
}
