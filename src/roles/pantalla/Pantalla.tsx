// #/tv/código y #/proyectar: la Pantalla (TV o laptop) de ALV 2.0. Llega en el paso 4 de la Fase 6.
// Regla de la frontera (la vigila src/roles/frontera.test.ts): nada en esta carpeta, salvo motor.ts,
// lee lo privado de la partida. La Pantalla dibuja solo la vista pública.
import { Esqueleto } from "../Esqueleto";

export function PantallaTv({ codigo }: { codigo?: string }) {
  return (
    <Esqueleto etiqueta="Pantalla" titulo={codigo ? `Sala ${codigo}` : "Pantalla de la sala"}
      texto="Aquí se va a proyectar la partida en la TV. Todavía no está lista: por ahora abre la sala desde Jugar en la computadora." />
  );
}

export function Proyectar() {
  return (
    <Esqueleto etiqueta="Proyectar" titulo="Enlazar esta pantalla"
      texto="Aquí va a salir un QR para enlazar la TV con tu celular. Todavía no está listo." />
  );
}
