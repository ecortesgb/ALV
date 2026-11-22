// Paquetes de escenario del HUB (ALV_HUB_DIRECCION_CREATIVA.md, «Arquitectura de escenarios»).
// El HUB tiene una estructura fija (cabecera, menú, figura, chat) y un escenario intercambiable descrito por datos:
// capas, ambientes por momento del día, luz 3D, plataforma, soporte del letrero y acento. Agregar Gotham u Hogwarts
// después debe ser agregar imágenes y un objeto como AZOTEA, no otra pantalla.
// En esta etapa solo existe «La Azotea» y no hay selector: el momento sale de la hora (o de ?hora= para probar).
import type { MomentoDia } from "../../app/horaDelDia";

/** Momentos del escenario: los tres de la app más la tarde (15:00–18:00), que por ahora solo usa el prototipo. */
export type MomentoAzotea = MomentoDia | "tarde";

/** Colores de la Plataforma ALV ("#rrggbb"); los entiende el modo azotea de tools/minifig/escena.js. */
export interface ColoresPlataforma { placa: string; base: string; panelA: string; panelB: string; stud: string; ranura: string; estrella: string }

export interface Ambiente {
  /**
   * Imagen de la ciudad (nombre base en public/arte, con -1920 y -1100). PROVISIONAL: mientras llegan las 4 capas
   * de Elías (cielo, lejos, medio, azotea) se usa la ciudad pintada que ya existe como un solo plano.
   */
  ciudad: string;
  /** Imagen completa de la azotea de Elías (ciudad + piso + objetos), nombre base en public/arte. Reemplaza a `ciudad` y al dibujo. */
  fondo?: string;
  /**
   * Pedestal pintado en `fondo`: la figura se dibuja sin plataforma y sus pies caen en (x, y) de la imagen
   * (fracciones), con una altura de `escala` × alto de la imagen. `proporcion` = ancho / alto de la imagen.
   */
  pedestal?: Anclaje;
  /** Capas definitivas cuando existan (mismo lienzo 3840×2160, con transparencia). */
  capas?: { cielo: string; lejos: string; medio: string; azotea: string };
  /** Color que tiñe el primer plano provisional (la azotea dibujada) para que acompañe la luz del momento. */
  tinte: string;
  tinteFuerza: number;
  /** Foquitos del letrero y de la azotea encendidos. */
  foquitos: boolean;
  /** Brillo de la ranura de energía de la plataforma (0 a 1). */
  brillo: number;
  /** Luz de la figura: principal, contraluz y relleno. */
  luz: { clave: string; contra: string; relleno: string };
}

export interface Anclaje { x: number; y: number; escala: number; proporcion: number }

export interface PaqueteEscenario {
  id: string;
  nombre: string;
  /** Color de acento: anillo del retrato, brillos y ranura de la plataforma. */
  acento: string;
  /** Fuerza del velo de legibilidad detrás de la cabecera y el menú (0 a 1). */
  velo: number;
  plataforma: ColoresPlataforma;
  /** Soporte del letrero ALV (imágenes con transparencia en public/arte): foquitos apagados y encendidos. */
  letrero?: { apagado: string; encendido: string };
  ambientes: Record<MomentoAzotea, Ambiente>;
}

const PEDESTAL: Anclaje = { x: 0.366, y: 0.732, escala: 0.36, proporcion: 1024 / 560 };

export const AZOTEA: PaqueteEscenario = {
  id: "azotea",
  nombre: "La Azotea",
  acento: "#2ee6d6",
  velo: 0.55,
  // Plataforma futurista: metal oscuro, tiras turquesa, collar ámbar y luces del borde (ver escena.js, modo azotea).
  plataforma: { placa: "#3a4150", base: "#232833", panelA: "#2c3240", panelB: "#303746", stud: "#7ff7ee", ranura: "#2ee6d6", estrella: "#ffc21a" },
  // La azotea de Elías con pedestal pintado (2026-11-21), una imagen por momento, mismo encuadre en las cuatro.
  // Centro de la cara de arriba del pedestal: 36.6 % × 73.2 % de la imagen (1024×560).
  ambientes: {
    dia: { ciudad: "ciudad-dia", fondo: "azotea-pedestal-dia", pedestal: PEDESTAL, tinte: "#ffffff", tinteFuerza: 0, foquitos: false, brillo: 0.25,
      luz: { clave: "#fff3dd", contra: "#bfe6ff", relleno: "#ffe2bd" } },
    tarde: { ciudad: "ciudad-dia", fondo: "azotea-pedestal-tarde", pedestal: PEDESTAL, tinte: "#ffd08a", tinteFuerza: 0.2, foquitos: false, brillo: 0.35,
      luz: { clave: "#ffd29a", contra: "#ffe3b0", relleno: "#ffbf80" } },
    atardecer: { ciudad: "ciudad-atardecer", fondo: "azotea-pedestal-atardecer", pedestal: PEDESTAL, tinte: "#ffb27a", tinteFuerza: 0.32, foquitos: true, brillo: 0.55,
      luz: { clave: "#ffc890", contra: "#ffb7a0", relleno: "#ff9f8a" } },
    noche: { ciudad: "ciudad-noche", fondo: "azotea-pedestal-noche", pedestal: PEDESTAL, tinte: "#5a5fc8", tinteFuerza: 0.5, foquitos: true, brillo: 0.9,
      luz: { clave: "#d9e2ff", contra: "#8fb6ff", relleno: "#7a7fc8" } },
  },
};

/** El escenario que usa el HUB. Cuando exista el selector, aquí se resolverá el que eligió el jugador. */
export const escenarioActual = (): PaqueteEscenario => AZOTEA;
