// Cuenta del jugador: entrar o crear con nickname y contraseña. Si no hay servidor, no se muestra nada.
import { useEffect, useRef, useState } from "react";
import { acciones, type JugadorLocal } from "./estado";
import { cargarPersonaje, entrar, guardarPersonaje, hayNube, registrar, salir, sesionActual, nickValido } from "./nube";
import { aviso } from "./comun";

export function Cuenta({ j }: { j: JugadorLocal }) {
  const [sesion, setSesion] = useState<string | null | undefined>(undefined);
  const [modo, setModo] = useState<"entrar" | "crear">("entrar");
  const [nick, setNick] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const lista = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  // Al entrar: traer el personaje guardado. Después, guardar cada cambio con un pequeño retraso.
  useEffect(() => {
    if (!hayNube) return;
    let vivo = true;
    sesionActual().then(async s => {
      if (!vivo) return;
      setSesion(s?.user.email?.split("@")[0] ?? null);
      if (s) {
        const guardado = await cargarPersonaje();
        if (guardado && vivo) acciones.personajeDeNube(j.id, guardado);
      }
      lista.current = true;
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hayNube || !sesion || !lista.current) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void guardarPersonaje(j.personaje); }, 900);
    return () => window.clearTimeout(timer.current);
  }, [j.personaje, sesion]);

  if (!hayNube || sesion === undefined) return null;

  const enviar = async () => {
    if (!nickValido(nick)) { setError("El nickname va de 3 a 20 letras, números o _."); return; }
    setOcupado(true); setError(null);
    const err = modo === "crear" ? await registrar(nick, pass) : await entrar(nick, pass);
    setOcupado(false);
    if (err) { setError(err); return; }
    setSesion(nick.trim().toLowerCase());
    setPass("");
    aviso(modo === "crear" ? "Cuenta creada. Tu personaje se guarda solo." : "Bienvenido de nuevo.");
    if (modo === "entrar") {
      const guardado = await cargarPersonaje();
      if (guardado) acciones.personajeDeNube(j.id, guardado);
    }
    lista.current = true;
  };

  if (sesion) {
    return (
      <section className="card" aria-labelledby="t-cuenta">
        <div className="entre"><h2 id="t-cuenta">Tu cuenta</h2><span className="chip lime">{sesion}</span></div>
        <p className="hint">Tu personaje se guarda en la nube. Al entrar con tu nickname y contraseña lo recuperas en cualquier celular.</p>
        <button className="btn sm" onClick={async () => { await salir(); lista.current = false; setSesion(null); }}>Salir de la cuenta</button>
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
