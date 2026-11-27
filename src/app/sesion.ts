// Sesión de este aparato: quién entró, su XP (la dice el servidor) y si puede jugar (solo mayores de 18, D1).
// No guarda XP ni compras en el aparato (decisión 3 de §22.1).
import { cargarPreferenciasCuenta, olvidarPreferenciasCuenta } from "../servicios/preferencias";
import { useSyncExternalStore } from "react";
import { cliente, fijarUsuario, hayNube, uidActual } from "../servicios/cliente";
import { miRegistro, sesionActual } from "../servicios/cuenta";
import { soyAdmin } from "../servicios/admin";
import { yoLocal } from "../servicios/enlace";

export type Fase = "cargando" | "fuera" | "registro" | "menor" | "dentro";
export interface Sesion { fase: Fase; uid: string; nombre: string; acumulada: number; disponible: number; nivel: number; admin: boolean; /** Cuenta desechable de prueba. */ invitado: boolean }

const VACIA: Sesion = { fase: "cargando", uid: "", nombre: "", acumulada: 0, disponible: 0, nivel: 1, admin: false, invitado: false };
let sesion: Sesion = VACIA;
const oyentes = new Set<() => void>();
const fijar = (s: Sesion) => { sesion = s; oyentes.forEach(f => f()); };
export const useSesion = () => useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => sesion);
export const sesionAhora = () => sesion;

const CLAVE_DEMO = "alv.demo.yo";
/** Nombre de demostración: «?yo=Ana» en la dirección o el que se escribió en esta pestaña. */
function nombreDemo(): string {
  const q = new URLSearchParams(location.search).get("yo");
  try { if (q) sessionStorage.setItem(CLAVE_DEMO, q.slice(0, 20)); return sessionStorage.getItem(CLAVE_DEMO) ?? ""; } catch { return q ?? ""; }
}
export function entrarDemo(nombre: string) {
  const n = nombre.trim().slice(0, 20);
  if (!n) return;
  try { sessionStorage.setItem(CLAVE_DEMO, n); } catch { /* sin almacenamiento */ }
  void refrescarSesion();
}
export function salirDemo() { try { sessionStorage.removeItem(CLAVE_DEMO); } catch { /* nada */ } void refrescarSesion(); }

let turno = 0;
/** Vuelve a leer la sesión y sus saldos. Se llama al abrir, al entrar o salir, y al terminar una partida. */
export async function refrescarSesion(): Promise<void> {
  const mio = ++turno;
  if (!hayNube || !cliente) {
    const n = nombreDemo();
    yoLocal.id = n ? "demo-" + n.toLowerCase().replace(/[^a-z0-9]/g, "") : ""; yoLocal.nombre = n;
    fijar(n ? { fase: "dentro", uid: yoLocal.id, nombre: n, acumulada: 0, disponible: 0, nivel: 1, admin: false, invitado: true } : { ...VACIA, fase: "fuera" });
    return;
  }
  const ses = await sesionActual();
  if (mio !== turno) return;
  if (!ses) { fijarUsuario(null); olvidarPreferenciasCuenta(); fijar({ ...VACIA, fase: "fuera" }); return; }
  const uid = (await uidActual()) ?? ses.user.id;
  try {
    const [perfil, registro, saldos, admin, rapida] = await Promise.all([
      cliente.from("perfiles").select("nombre, mayor_18, invitado").eq("id", uid).maybeSingle(),
      miRegistro(),
      cliente.rpc("mis_saldos"),
      soyAdmin(),
      // Personaje rápido (055). Consulta aparte: sin la 055 la columna no existe y no debe tumbar la entrada.
      cliente.from("perfiles").select("rapida").eq("id", uid).maybeSingle().then(r => r.data?.rapida === true, () => false),
    ]);
    if (mio !== turno) return;
    const nombre = (perfil.data?.nombre as string | undefined) ?? ses.user.email?.split("@")[0] ?? "Jugador";
    const fila = (saldos.data as { acumulada: number; disponible: number; nivel: number }[] | null)?.[0];
    const invitado = perfil.data?.invitado === true;
    // El invitado y el personaje rápido no tienen fecha de nacimiento: confirmaron ser mayores al entrar y el servidor los marcó.
    const fase: Fase = (invitado || rapida) && perfil.data?.mayor_18 === true ? "dentro" : !registro ? "registro" : perfil.data?.mayor_18 === true ? "dentro" : "menor";
    fijar({ fase, uid, nombre, acumulada: fila?.acumulada ?? 0, disponible: fila?.disponible ?? 0, nivel: fila?.nivel ?? 1, admin, invitado });
    // Preferencias de «Mi experiencia» guardadas en la cuenta (039): se leen una vez por sesión.
    if (fase === "dentro") void cargarPreferenciasCuenta(uid);
  } catch (e) {
    console.error("refrescarSesion", e);
    if (mio === turno) fijar({ ...VACIA, fase: "fuera" });
  }
}
