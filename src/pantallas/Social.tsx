// Ayudantes del Perfil: movimientos de XP y los logros viejos calculados con ellos. Las pantallas de Ranking y Logros
// viven en ranking/ y logros/ (migraciones 040 y 042).
import { useEffect, useState } from "react";
import { misMovimientos, type MovimientoXp } from "../servicios/cuenta";

interface Logro { nombre: string; descripcion: string; va: number; meta: number }
/** Logros que se pueden comprobar con lo que guarda el servidor. */
export function logrosDeCuenta(nivel: number, movs: MovimientoXp[]): Logro[] {
  const partidas = movs.filter(m => m.tipo === "ganada" && m.motivo.startsWith("partida:")).length;
  const retos = movs.filter(m => m.tipo === "ganada" && m.motivo.startsWith("reto en vivo")).length;
  return [
    { nombre: "Primera partida", descripcion: "Termina una partida en una sala.", va: partidas, meta: 1 },
    { nombre: "El sobreviviente", descripcion: "Termina 10 partidas.", va: partidas, meta: 10 },
    { nombre: "Reto en vivo", descripcion: "Gana XP por un reto que te puso el anfitrión.", va: retos, meta: 1 },
    { nombre: "Fiestero", descripcion: "Llega al nivel 5.", va: nivel, meta: 5 },
    { nombre: "Leyenda local", descripcion: "Llega al nivel 10.", va: nivel, meta: 10 },
    { nombre: "ALV Legendario", descripcion: "Llega al nivel 20.", va: nivel, meta: 20 },
  ];
}

export function useMovimientos() {
  const [movs, setMovs] = useState<MovimientoXp[] | undefined>(undefined);
  useEffect(() => { let vivo = true; void misMovimientos().then(r => { if (vivo) setMovs(r); }); return () => { vivo = false; }; }, []);
  return movs;
}
