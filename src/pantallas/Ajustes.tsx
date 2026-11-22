// Ajustes del aparato y Administración (solo cuentas administradoras; el servidor lo valida en cada función).
import { useEffect, useState } from "react";
import { Boton, Chip, Etiqueta, Panel } from "../ds";
import { ir } from "../app/rutas";
import { refrescarSesion, salirDemo, useSesion } from "../app/sesion";
import { alternarSonido, useSonidoActivo } from "../app/sonido";
import { adminAjustarXp, adminBorrarInvitados, adminJugadores, restablecerClave, type CuentaAdmin } from "../servicios/admin";
import { hayNube } from "../servicios/cliente";
import { cambiarClave, salir } from "../servicios/cuenta";
import { Cabecera, Campo, Marco, Vacio, aviso, confirmar } from "./comun";

export function Ajustes() {
  const s = useSesion();
  const sonido = useSonidoActivo();
  const [clave, setClave] = useState(""), [ocupado, setOcupado] = useState(false);
  // Cuenta (antes en el Perfil; se mudó aquí el 2026-11-21). Misma lógica de siempre.
  const cambiar = async () => {
    setOcupado(true);
    const r = await cambiarClave(clave);
    setOcupado(false);
    aviso(r ?? "Contraseña cambiada");
    if (!r) setClave("");
  };
  const cerrar = async () => {
    if (s.invitado && hayNube && !(await confirmar({ titulo: "¿Salir de la prueba?", texto: "Entraste sin cuenta: al salir no podrás volver a este apodo ni a su XP.", si: "Salir", peligro: true }))) return;
    if (hayNube) { await salir(); await refrescarSesion(); } else salirDemo();
    ir("inicio");
  };
  const completa = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.().catch(() => aviso("Este navegador no deja usar pantalla completa.")); };
  return (
    <Marco>
      <div className="a-ancho a-angosto a-pila">
        <Cabecera titulo="Ajustes" icono="gear" />
        <Panel className="a-pila" como="section">
          <div className="a-entre"><span>Sonidos</span><Chip texto={sonido ? "Encendidos" : "Apagados"} seleccionado={sonido} onClick={alternarSonido} /></div>
          <div className="a-entre"><span>Pantalla completa</span><Chip texto="Cambiar" icono="eye" onClick={completa} /></div>
        </Panel>
        <Boton color="azul" texto="Mi perfil" icono="users" onClick={() => ir("perfil")} />
        {hayNube && !s.invitado && <Panel className="a-pila" como="section">
          <Etiqueta texto="Cuenta" icono="lock" />
          <form className="a-pila" onSubmit={e => { e.preventDefault(); void cambiar(); }}>
            <Campo etiqueta="Contraseña nueva (8 o más)" type="password" value={clave} onChange={e => setClave(e.target.value)} autoComplete="new-password" maxLength={72} />
            <Boton color="azul" texto="Cambiar contraseña" icono="lock" desactivado={clave.length < 8} cargando={ocupado} onClick={() => void cambiar()} />
          </form>
        </Panel>}
        {s.invitado && <p className="a-nota">Entrada de prueba: tu XP y tu figura se borran cuando terminen las pruebas. Para conservarlas, crea una cuenta.</p>}
        <Boton color="rojo" texto={s.invitado ? "Salir de la prueba" : "Cerrar sesión"} icono="back" onClick={() => void cerrar()} />
        {s.admin && <Boton color="rojo" texto="Administración" sub="Cuentas, XP y contraseñas" icono="lock" onClick={() => ir("admin")} />}
        <p className="a-nota">ALV 2.0 · versión de prueba</p>
      </div>
    </Marco>
  );
}

export function Admin() {
  const s = useSesion();
  const [cuentas, setCuentas] = useState<CuentaAdmin[] | null | undefined>(undefined);
  const [abierta, setAbierta] = useState<string | null>(null), [clave, setClave] = useState(""), [busca, setBusca] = useState("");
  const leer = () => void adminJugadores().then(setCuentas);
  useEffect(() => { if (s.admin) leer(); }, [s.admin]);
  if (!s.admin) return <Marco clase="a-centro"><Vacio titulo="Solo administradores" texto="Tu cuenta no tiene este permiso."><Boton color="amarillo" texto="Ir al inicio" icono="back" onClick={() => ir("inicio")} /></Vacio></Marco>;
  const xp = async (c: CuentaAdmin, n: number) => {
    if (!(await confirmar({ titulo: `${n > 0 ? "Dar" : "Quitar"} ${Math.abs(n)} XP a ${c.nombre}`, si: "Confirmar", peligro: n < 0 }))) return;
    const r = await adminAjustarXp(c.id, n, "ajuste de administrador");
    aviso(r ?? "XP ajustada"); leer();
  };
  const poner = async (c: CuentaAdmin) => {
    if (!(await confirmar({ titulo: `¿Cambiar la contraseña de ${c.nombre}?`, texto: "La anterior deja de servir.", si: "Cambiar", peligro: true }))) return;
    const r = await restablecerClave(c.id, clave);
    aviso(r ?? "Contraseña cambiada"); if (!r) { setClave(""); setAbierta(null); }
  };
  const borrarInvitados = async () => {
    if (!(await confirmar({ titulo: "¿Borrar a todos los invitados?", texto: "Se borran sus cuentas, su XP, sus figuras y las salas que abrieron. No se puede deshacer. Las cuentas normales no se tocan.", si: "Borrar invitados", peligro: true }))) return;
    const n = await adminBorrarInvitados();
    aviso(n === null ? "No se pudo borrar." : n === 0 ? "No había invitados." : `Se borraron ${n} invitados`); leer();
  };
  const lista = (cuentas ?? []).filter(c => c.nombre.toLowerCase().includes(busca.trim().toLowerCase()));
  return (
    <Marco>
      <div className="a-ancho a-angosto a-pila">
        <Cabecera titulo="Administración" icono="lock" />
        {cuentas === undefined ? <p className="a-suave a-pulso" role="status">Leyendo cuentas…</p> : cuentas === null ? <Vacio titulo="No se pudo leer" texto="Revisa la conexión." /> : <>
          <Campo etiqueta="Buscar cuenta" value={busca} onChange={e => setBusca(e.target.value)} />
          <ul className="a-admin">
            {lista.map(c => (
              <li key={c.id} className="d-pnl a-pila">
                <div className="a-entre"><span className="dsp a-t3">{c.nombre}</span><small>{c.acumulada.toLocaleString("es-MX")} XP · {c.disponible.toLocaleString("es-MX")} para gastar</small></div>
                <div className="a-fila a-envuelve">
                  {[50, 100].map(n => <Chip key={n} texto={`+${n} XP`} onClick={() => void xp(c, n)} />)}
                  <Chip texto="−50 XP" onClick={() => void xp(c, -50)} />
                  <Chip texto="Contraseña" icono="lock" seleccionado={abierta === c.id} onClick={() => { setAbierta(abierta === c.id ? null : c.id); setClave(""); }} />
                </div>
                {abierta === c.id && <form className="a-pila" onSubmit={e => { e.preventDefault(); void poner(c); }}>
                  <Campo etiqueta="Contraseña nueva (8 o más)" type="password" value={clave} onChange={e => setClave(e.target.value)} autoComplete="new-password" maxLength={72} />
                  <Boton color="rojo" texto="Poner contraseña" icono="lock" desactivado={clave.length < 8} onClick={() => void poner(c)} />
                </form>}
              </li>
            ))}
          </ul>
          <Etiqueta texto={`${cuentas.length} cuentas`} icono="users" />
          <Panel className="a-pila" como="section">
            <span className="dsp a-t3">Invitados de prueba</span>
            <p className="a-suave">Quien entra sin cuenta deja una cuenta desechable. Bórralas al terminar las pruebas.</p>
            <Boton color="rojo" texto="Borrar invitados" icono="lock" onClick={() => void borrarInvitados()} />
          </Panel>
        </>}
      </div>
    </Marco>
  );
}
