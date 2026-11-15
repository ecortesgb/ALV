// Mantiene al día la figura 3D de cada jugador de este celular y, si hay cuenta, sus cápsulas en la nube.
import { useEffect, useRef } from "react";
import { acciones, useEstado } from "./estado";
import { cargarCapsulasNube, cuentaActiva, guardarCapsulasNube, hayNube, sesionActual } from "./nube";
import { escribirCapsulas, figuraActiva, huella, leerCapsulas, useCapsulas } from "./figura3d";

export function SincroFiguras() {
  const s = useEstado();
  const locales = s.jugadores.filter(j => !j.remoto);
  return <>{locales.map(j => <FiguraDe key={j.id} id={j.id} cuenta={s.cuenta?.jugador === j.id} />)}</>;
}

function FiguraDe({ id, cuenta }: { id: string; cuenta: boolean }) {
  const caps = useCapsulas(id);
  const activa = figuraActiva(caps);
  useEffect(() => { acciones.figura(id, activa); }, [id, activa]);

  // Cuenta: al abrir, la nube manda; si la nube está vacía y aquí hay figuras, se suben.
  const leida = useRef(false);
  const subida = useRef<string | null>(null);
  useEffect(() => {
    if (!hayNube || !cuenta) return;
    let vivo = true;
    leida.current = false;
    sesionActual().then(async ses => {
      if (!vivo || !ses) return;
      const nube = await cargarCapsulasNube();
      if (!vivo || !nube) return;
      const aqui = leerCapsulas(id);
      if (nube.slots.some(Boolean)) { escribirCapsulas(id, nube); subida.current = huella(nube); }
      else if (aqui.slots.some(Boolean)) { if (await guardarCapsulasNube(aqui)) subida.current = huella(aqui); }
      else subida.current = huella(aqui);
      leida.current = true;
    });
    return () => { vivo = false; };
  }, [id, cuenta]);

  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!hayNube || !cuenta || !leida.current || !cuentaActiva()) return;
    const h = huella(caps);
    if (h === subida.current) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void guardarCapsulasNube(caps).then(ok => { if (ok) subida.current = h; }); }, 900);
    return () => window.clearTimeout(timer.current);
  }, [caps, cuenta]);
  return null;
}
