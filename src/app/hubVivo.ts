// Estado compartido de «en línea» y chat: una sola conexión mientras la sesión esté abierta (se ve desde cualquier pantalla).
import { useEffect, useState, useSyncExternalStore } from "react";
import type { FiguraV2 } from "../content/personaje";
import { cliente, hayNube } from "../servicios/cliente";
import { conectarHub, type ConexionHub, type EnLinea, type MensajeChat } from "../servicios/hubVivo";
import { figuraActiva, leerCapsulas } from "./figura3d";
import { useSesion } from "./sesion";

const GUARDAR = 60;       // mensajes que se quedan en memoria
const ESPERA_MS = 1200;   // entre un mensaje y otro (evita ráfagas)

interface Estado { enLinea: EnLinea[]; mensajes: MensajeChat[]; sinLeer: number; abierto: boolean }
let estado: Estado = { enLinea: [], mensajes: [], sinLeer: 0, abierto: false };
const oyentes = new Set<() => void>();
const fijar = (e: Partial<Estado>) => { estado = { ...estado, ...e }; oyentes.forEach(f => f()); };
let con: ConexionHub | null = null, conDe = "", ultimoEnvio = 0;

function agregar(m: MensajeChat) {
  if (estado.mensajes.some(x => x.id === m.id)) return;
  fijar({ mensajes: [...estado.mensajes, m].slice(-GUARDAR), sinLeer: estado.abierto ? 0 : estado.sinLeer + 1 });
}

/** Conecta (una vez por cuenta) y devuelve el estado. */
export function useHubVivo() {
  const s = useSesion();
  useEffect(() => {
    if (s.fase !== "dentro" || !s.uid) return;
    if (con && conDe === s.uid) return;
    con?.cerrar();
    fijar({ enLinea: [], mensajes: [], sinLeer: 0 });
    conDe = s.uid;
    con = conectarHub({ id: s.uid, nombre: s.nombre }, { enLinea: l => fijar({ enLinea: l }), mensaje: agregar });
  }, [s.fase, s.uid, s.nombre]);
  return useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => estado);
}

/** Manda un mensaje. Devuelve un aviso si no se pudo (vacío o muy seguido). */
export function enviarChat(texto: string): string | null {
  if (!con) return "Sin conexión.";
  if (Date.now() - ultimoEnvio < ESPERA_MS) return "Espera un segundo.";
  const m = con.enviar(texto);
  if (!m) return "Escribe algo.";
  ultimoEnvio = Date.now();
  agregar(m);
  return null;
}

export function abrirChat(abierto: boolean) { fijar({ abierto, sinLeer: abierto ? 0 : estado.sinLeer }); }

// ---------- Figuras de quienes están en línea ----------
// Con nube solo se pueden leer las de quien ha compartido sala contigo (RLS de figuras_jugador); los demás salen con su inicial.

const figuras = new Map<string, FiguraV2 | null>();
export function useFigurasDe(ids: string[]): Map<string, FiguraV2 | null> {
  const clave = [...ids].sort().join(",");
  const [, setN] = useState(0);
  useEffect(() => {
    const faltan = ids.filter(id => !figuras.has(id));
    if (!faltan.length) return;
    if (!hayNube) { for (const id of faltan) figuras.set(id, figuraActiva(leerCapsulas(id))); setN(n => n + 1); return; }
    for (const id of faltan) figuras.set(id, null);
    let vivo = true;
    void cliente!.from("figuras_jugador").select("jugador, figura").eq("activa", true).in("jugador", faltan).then(({ data }) => {
      for (const f of (data ?? []) as { jugador: string; figura: FiguraV2 }[]) figuras.set(f.jugador, f.figura);
      if (vivo) setN(n => n + 1);
    });
    return () => { vivo = false; };
  }, [clave]); // eslint-disable-line react-hooks/exhaustive-deps
  return figuras;
}
