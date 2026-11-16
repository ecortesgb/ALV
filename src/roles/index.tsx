// Rutas de ALV 2.0 que se cargan aparte: sus estilos (Design System) no llegan a las pantallas de hoy.
import type { Destino } from "../app/rutas";
import PaginaDS from "../pantallas/ds";
import { Mesa } from "./mesa/Mesa";
import { PantallaTv, Proyectar } from "./pantalla/Pantalla";

export default function RutaNueva({ destino }: { destino: Destino }) {
  switch (destino.ruta) {
    case "tv": return <PantallaTv codigo={destino.arg} />;
    case "proyectar": return <Proyectar />;
    case "mesa": return <Mesa codigo={destino.arg} />;
    default: return <PaginaDS />;
  }
}
