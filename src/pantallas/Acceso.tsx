// Pantalla de carga, acceso y registro. ALV es solo para mayores de 18 (D1): la fecha la valida el servidor.
import { useState, type FormEvent } from "react";
import { Boton, Onomatopeya, Panel, Pestanas } from "../ds";
import { entrar, entrarInvitado, esNickInvitado, guardarRegistro, nickValido, passValida, registrar, salir, type Genero } from "../servicios/cuenta";
import { hayNube } from "../servicios/cliente";
import { entrarDemo, refrescarSesion, useSesion } from "../app/sesion";
import { Campo, Marco } from "./comun";

const hoy = () => new Date();
/** Edad cumplida a partir de AAAA-MM-DD. */
export function edadDe(nacimiento: string, ref = hoy()): number {
  const [a, m, d] = nacimiento.split("-").map(Number) as [number, number, number];
  let e = ref.getFullYear() - a;
  if (ref.getMonth() + 1 < m || (ref.getMonth() + 1 === m && ref.getDate() < d)) e--;
  return e;
}
const GENEROS: [Genero, string][] = [["mujer", "Mujer"], ["hombre", "Hombre"], ["otro", "Otro"]];

function Logo({ sub }: { sub?: string }) {
  return (
    <div className="a-logo">
      <Onomatopeya texto="ALV" color="var(--amarillo)" tamano="5.2em" giro={-6} />
      {sub && <span className="dsp ol a-t3">{sub}</span>}
    </div>
  );
}

/** Carga: se ve mientras se lee la sesión. Sin bloques grises: el logo y la ciudad. */
export function Carga() {
  return <Marco clase="a-centro"><Logo sub="Amigos, locuras y verdades" /><p className="a-suave a-pulso" role="status">Entrando…</p></Marco>;
}

function DatosEdad({ nac, setNac, genero, setGenero }: { nac: string; setNac: (v: string) => void; genero: Genero | ""; setGenero: (g: Genero) => void }) {
  return (
    <>
      <Campo etiqueta="Fecha de nacimiento" type="date" value={nac} max={hoy().toISOString().slice(0, 10)} min="1900-01-01" onChange={e => setNac(e.target.value)} required />
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
    await refrescarSesion();
  };
  return (
    <Marco clase="a-centro">
      <Logo sub="Entrar de prueba" />
      <Panel className="a-form" como="section">
        <form onSubmit={e => void enviar(e)} className="a-pila">
          <p className="a-suave">Juegas sin crear cuenta. Es una entrada de prueba: lo que ganes se borra cuando terminen las pruebas.</p>
          <Campo etiqueta="Tu apodo" value={apodo} maxLength={20} onChange={e => setApodo(e.target.value)} autoComplete="off" autoFocus required />
          <label className="a-check"><input type="checkbox" checked={mayor} onChange={e => setMayor(e.target.checked)} /><span>Soy mayor de 18 y acepto jugar con respeto: nadie está obligado a tomar ni a cumplir un reto.</span></label>
          {error && <p className="a-error" role="alert">{error}</p>}
          <Boton color="amarillo" texto="Entrar de prueba" icono="play" cargando={ocupado} onClick={() => void enviar()} />
          <button type="submit" hidden />
          <button type="button" className="a-plano" onClick={volver}>Tengo cuenta o quiero crear una</button>
        </form>
      </Panel>
    </Marco>
  );
}

export function Acceso() {
  const [tab, setTab] = useState<"entrar" | "crear">("entrar");
  const [invitado, setInvitado] = useState(false);
  const [nick, setNick] = useState(""), [pass, setPass] = useState(""), [nac, setNac] = useState(""), [genero, setGenero] = useState<Genero | "">("");
  const [acepto, setAcepto] = useState(false), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);

  if (!hayNube) {
    return (
      <Marco clase="a-centro">
        <Logo sub="Modo de prueba sin servidor" />
        <Panel className="a-form" como="section">
          <form onSubmit={e => { e.preventDefault(); entrarDemo(nick); }} className="a-pila">
            <Campo etiqueta="Tu apodo" value={nick} maxLength={20} onChange={e => setNick(e.target.value)} autoFocus required />
            <Boton color="amarillo" texto="Entrar" icono="play" onClick={() => entrarDemo(nick)} />
          </form>
        </Panel>
      </Marco>
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
    await refrescarSesion();
  };

  return (
    <Marco clase="a-centro">
      <Logo />
      <Panel className="a-form" como="section">
        <Pestanas nombre="Acceso" activa={tab} onCambio={t => { setTab(t as "entrar" | "crear"); setError(null); }} pestanas={[{ id: "entrar", texto: "Entrar" }, { id: "crear", texto: "Crear cuenta" }]} />
        <form onSubmit={e => void enviar(e)} className="a-pila">
          <Campo etiqueta="Apodo" value={nick} onChange={e => setNick(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={20} required />
          <Campo etiqueta="Contraseña" type="password" value={pass} onChange={e => setPass(e.target.value)} autoComplete={tab === "crear" ? "new-password" : "current-password"} maxLength={72} required />
          {tab === "crear" && <>
            <DatosEdad nac={nac} setNac={setNac} genero={genero} setGenero={setGenero} />
            <label className="a-check"><input type="checkbox" checked={acepto} onChange={e => setAcepto(e.target.checked)} /><span>Soy mayor de 18 y acepto jugar con respeto: nadie está obligado a tomar ni a cumplir un reto.</span></label>
          </>}
          {error && <p className="a-error" role="alert">{error}</p>}
          <Boton color="amarillo" texto={tab === "crear" ? "Crear mi cuenta" : "Entrar"} icono="play" cargando={ocupado} onClick={() => void enviar()} />
          <button type="submit" hidden />
          {tab === "entrar" && <p className="a-nota">¿Olvidaste tu contraseña? Pídele a Elías que te ponga una nueva.</p>}
        </form>
      </Panel>
      <button type="button" className="a-plano" onClick={() => setInvitado(true)}>Solo quiero probar: entrar sin cuenta</button>
    </Marco>
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
    <Marco clase="a-centro">
      <Logo sub="Un dato antes de jugar" />
      <Panel className="a-form a-pila" como="section">
        <p className="a-suave">La fecha se guarda una sola vez y nadie más la ve.</p>
        <DatosEdad nac={nac} setNac={setNac} genero={genero} setGenero={setGenero} />
        {error && <p className="a-error" role="alert">{error}</p>}
        <Boton color="amarillo" texto="Guardar y entrar" icono="play" cargando={ocupado} onClick={() => void guardar()} />
        <button type="button" className="a-plano" onClick={() => void salir().then(refrescarSesion)}>Salir de la cuenta</button>
      </Panel>
    </Marco>
  );
}

/** Cuenta con fecha de menor de edad: no entra. Solo un administrador puede corregir la fecha. */
export function SoloMayores() {
  const s = useSesion();
  return (
    <Marco clase="a-centro">
      <Logo />
      <Panel className="a-form a-pila" como="section">
        <span className="dsp ol a-t2">Solo mayores de 18</span>
        <p className="a-suave">{s.nombre}, tu fecha de nacimiento dice que eres menor de edad y ALV es solo para adultos. Si la fecha está mal, pídele a Elías que la corrija.</p>
        <Boton color="rojo" texto="Salir de la cuenta" icono="back" onClick={() => void salir().then(refrescarSesion)} />
      </Panel>
    </Marco>
  );
}
