// #/mesa/código: sin pantalla o con un solo celular en la mesa. Llega en el paso 4 de la Fase 6.
import { Esqueleto } from "../Esqueleto";

export function Mesa({ codigo }: { codigo?: string }) {
  return (
    <Esqueleto etiqueta="En la mesa" titulo={codigo ? `Sala ${codigo}` : "Un solo celular"}
      texto="Aquí se va a jugar sin TV, con un celular en la mesa. Todavía no está listo: por ahora usa Juego local desde Jugar." />
  );
}
