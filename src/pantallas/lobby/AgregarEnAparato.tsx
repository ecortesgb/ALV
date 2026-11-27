// Jugar varios en un mismo aparato (053, Elías 27 nov): «Agregar jugador» en el lobby de un aparato.
// Tres caminos: personaje rápido (cuenta real UsuarioN con contraseña aleatoria), entrar con una cuenta que ya existe,
// o sin cuenta (como antes: juega pero no gana puntos). Los datos de acceso del personaje rápido se ven UNA sola vez.
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { codigoLegible, type PersonajeRapido } from "../../servicios/aparato";

function Velo({ titulo, alCerrar, children }: { titulo: string; alCerrar?: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!alCerrar) return;
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") alCerrar(); };
    addEventListener("keydown", f); return () => removeEventListener("keydown", f);
  }, [alCerrar]);
  return (
    <div className="pl-velo" role="dialog" aria-modal="true" aria-label={titulo} onClick={alCerrar}>
      <div className="pl-modal pl-chico" onClick={e => e.stopPropagation()}>
        <header className="pl-top"><h2 className="pl-tit"><span>{titulo}</span></h2>{alCerrar && <button type="button" className="pl-cerrar" onClick={alCerrar} aria-label="Cerrar">✕</button>}</header>
        <div className="pl-pila">{children}</div>
      </div>
    </div>
  );
}

export type TipoAgregar = "rapido" | "cuenta" | "sin-cuenta";

/** Primer paso: cómo entra el jugador nuevo. Sin servidor solo existe «sin cuenta». */
export function ElegirComoAgregar({ conNube, alElegir, alCerrar }: { conNube: boolean; alElegir: (t: TipoAgregar) => void; alCerrar: () => void }) {
  return (
    <Velo titulo="Agregar jugador" alCerrar={alCerrar}>
      {conNube && <>
        <button type="button" className="pl-opcion" onClick={() => alElegir("rapido")} autoFocus>
          <b>Personaje nuevo</b><small>Nombre y figura. Se le crea su acceso y gana sus puntos.</small>
        </button>
        <button type="button" className="pl-opcion" onClick={() => alElegir("cuenta")}>
          <b>Ya tengo cuenta</b><small>Entra con usuario y contraseña y gana sus puntos aquí.</small>
        </button>
      </>}
      <button type="button" className="pl-opcion pl-opcion-suave" onClick={() => alElegir("sin-cuenta")}>
        <b>Sin cuenta</b><small>Solo para esta sesión. No gana puntos.</small>
      </button>
    </Velo>
  );
}

/** Entrar con una cuenta que ya existe. La contraseña no se guarda en el aparato. */
export function EntrarCuenta({ alEntrar, alCerrar }: { alEntrar: (usuario: string, clave: string) => Promise<string | null>; alCerrar: () => void }) {
  const [usuario, setUsuario] = useState(""), [clave, setClave] = useState(""), [ver, setVer] = useState(false);
  const [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const enviar = async (e?: FormEvent) => {
    e?.preventDefault();
    if (ocupado) return;
    setOcupado(true); setError(null);
    const fallo = await alEntrar(usuario, clave);
    setOcupado(false);
    if (fallo) setError(fallo);
  };
  return (
    <Velo titulo="Tu cuenta" alCerrar={ocupado ? undefined : alCerrar}>
      <form className="pl-pila" onSubmit={e => void enviar(e)}>
        <label className="pl-campo"><span>Usuario</span>
          <input value={usuario} onChange={e => setUsuario(e.target.value.slice(0, 20))} autoComplete="off" autoCapitalize="none" spellCheck={false} autoFocus required />
        </label>
        <label className="pl-campo"><span>Contraseña</span>
          <span className="pl-fila">
            <input type={ver ? "text" : "password"} value={clave} onChange={e => setClave(e.target.value.slice(0, 72))} autoComplete="off" autoCapitalize="none" spellCheck={false} required />
            <button type="button" className="pl-chip" onClick={() => setVer(v => !v)} aria-pressed={ver}>{ver ? "Ocultar" : "Ver"}</button>
          </span>
        </label>
        <p className="pl-nota">Este aparato no guarda tu contraseña. Ganas tus puntos aunque juegues aquí.</p>
        {error && <p className="pl-error" role="alert">{error}</p>}
        <button type="submit" className="pl-listo" disabled={ocupado || !usuario.trim() || clave.length < 8}>{ocupado ? "Entrando…" : "Entrar al lobby"}</button>
      </form>
    </Velo>
  );
}

/** Datos de acceso del personaje rápido. Se ven una sola vez: no se pueden volver a consultar. */
export function DatosAcceso({ p, alListo }: { p: PersonajeRapido; alListo: () => void }) {
  const [guardado, setGuardado] = useState(false);
  return (
    <Velo titulo={`Acceso de ${p.nombre}`}>
      <p className="pl-nota fuerte">Toma foto o anótalo. Solo se ve esta vez.</p>
      <dl className="pl-acceso">
        <div><dt>Usuario</dt><dd>{p.usuario}</dd></div>
        <div><dt>Contraseña</dt><dd>{p.clave}</dd></div>
        <div><dt>Código de recuperación</dt><dd>{codigoLegible(p.codigo)}</dd></div>
      </dl>
      <p className="pl-nota">Con usuario y contraseña entra desde su celular a ver lo que ganó y a cambiar su contraseña. Si la olvida, el código le deja poner una nueva.</p>
      <label className="pl-check"><input type="checkbox" checked={guardado} onChange={e => setGuardado(e.target.checked)} /><span>Ya lo guardé</span></label>
      <button type="button" className="pl-listo" disabled={!guardado} onClick={alListo}>Listo</button>
    </Velo>
  );
}
