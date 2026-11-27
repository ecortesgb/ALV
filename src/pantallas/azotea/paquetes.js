const PEDESTAL = { x: 0.366, y: 0.732, escala: 0.36, proporcion: 1024 / 560 };
export const AZOTEA = {
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
export const escenarioActual = () => AZOTEA;
