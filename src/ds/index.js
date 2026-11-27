// Design System «ALV Cine Cómic Nocturno» en código (Maestro v1.16 y §22.1).
// Los componentes no hablan con la base: reciben datos y avisan cuando los tocan.
// Todo va dentro de <RaizDS>, que carga los tokens y los estilos copiados de la fuente aprobada.
export { RaizDS } from "./Raiz";
export { Icono } from "./Icono";
export { Boton } from "./Boton";
export { Etiqueta, Cartel } from "./Etiqueta";
export { Pestanas } from "./Pestanas";
export { Chip } from "./Chip";
export { Panel } from "./Panel";
export { TarjetaJugador } from "./TarjetaJugador";
export { TarjetaJuego } from "./TarjetaJuego";
export { BarraAnfitrion } from "./BarraAnfitrion";
export { Reloj } from "./Reloj";
export { Escaner } from "./Escaner";
export { Onomatopeya } from "./Onomatopeya";
export { FondoCiudad, ciudadGotica } from "./FondoCiudad";
export { RuedaSospechosos } from "./RuedaSospechosos";
/** Los 13 componentes aprobados (la prueba revisa que estén todos). */
export const COMPONENTES_DS = [
    "Boton", "Etiqueta", "Pestanas", "Chip", "Panel", "TarjetaJugador", "TarjetaJuego",
    "BarraAnfitrion", "Reloj", "Escaner", "Onomatopeya", "FondoCiudad", "RuedaSospechosos",
];
