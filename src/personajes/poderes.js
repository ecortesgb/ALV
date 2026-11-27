const AZUL = "#7fd8ff", ROJO = "#ff3b30", FUEGO = "#ff6a1a", AMARILLO = "#ffd23a", ELECTRICO = "#bfe3ff", VERDE = "#62ff6e";
/** Por personaje, en el orden en que se ofrecen (el primero es el poder principal: RT del mando). */
export const PODERES = {
    "capitan-america": {
        escudo: { nombre: "Lanzar escudo", efecto: { tipo: "escudo", desde: "mano_der", color: "#ffffff", retraso: 0.35, dura: 1.4 } },
    },
    "mr-fantastico": {
        // El final de ARMZIP_STRETCH despega la cabeza (espera mallas del juego): se corta antes.
        estirar: { nombre: "Estirarse", hasta: 1.8, efecto: { tipo: "estirar", retraso: 0.1, dura: 1.6 } },
        forma: { nombre: "Cambiar de forma", efecto: { tipo: "estirar", retraso: 0, dura: 1.2 } },
    },
    "mujer-invisible": {
        invisible: { nombre: "Volverse invisible", efecto: { tipo: "invisible", color: "#9fd6ff", retraso: 0.2, dura: 3 } },
        campo: { nombre: "Campo de fuerza", efecto: { tipo: "campo", color: "#7fc8ff", retraso: 0.2, dura: 2.2 } },
    },
    "antorcha-humana": {
        encender: { nombre: "¡Llamas!", efecto: { tipo: "fuego", modo: "cuerpo", color: FUEGO, color2: AMARILLO, retraso: 0.2, dura: 2.6 } },
        fuego: { nombre: "Bola de fuego", efecto: { tipo: "fuego", desde: "mano_der", color: FUEGO, color2: AMARILLO, retraso: 0.25, dura: 1 } },
        volar: { nombre: "Volar", bucle: 3, efecto: { tipo: "volar", color: FUEGO, color2: AMARILLO, dura: 3 },
            efectos: [{ tipo: "fuego", modo: "cuerpo", color: FUEGO, color2: AMARILLO, dura: 3 }] },
    },
    "la-mole": {
        golpe: { nombre: "Golpe al piso", efecto: { tipo: "golpe", color: "#ffb347", retraso: 0.6, dura: 0.8 } },
        aplauso: { nombre: "Aplauso de trueno", efecto: { tipo: "onda", desde: "mano_der", color: "#ffffff", retraso: 0.45, dura: 0.7 } },
    },
    ciclope: {
        rayo: { nombre: "Rayo óptico", efecto: { tipo: "rayo", desde: "cabeza", color: ROJO, retraso: 0.15, dura: 1.4 } },
    },
    "ant-man": {
        // El clip SHRINK del juego ya encoge y regresa: el efecto solo pone las chispas al encoger y al crecer.
        encoger: { nombre: "Encogerse", efecto: { tipo: "encoger", color: "#ff5a5a", a: 1, dura: 1.6 } },
        hormigas: { nombre: "Llamar hormigas", efecto: { tipo: "hormigas", retraso: 0.3, dura: 3 } },
    },
    thor: {
        rayo: { nombre: "Rayo", efecto: { tipo: "electrico", desde: "mano_der", color: ELECTRICO, cielo: true, retraso: 0.3, dura: 1.6 } },
        martillo: { nombre: "Martillazo", efecto: { tipo: "golpe", color: ELECTRICO, retraso: 0.55, dura: 0.8 },
            efectos: [{ tipo: "electrico", desde: "mano_der", color: ELECTRICO, cielo: true, retraso: 0.45, dura: 0.6 }] },
        volar: { nombre: "Volar", bucle: 3, efecto: { tipo: "volar", color: "#ffffff", color2: ELECTRICO, dura: 3 } },
    },
    tormenta: {
        rayo: { nombre: "Rayos", efecto: { tipo: "electrico", desde: "mano_der", color: ELECTRICO, cielo: true, retraso: 0.2, dura: 1.8 } },
        volar: { nombre: "Volar", bucle: 3, efecto: { tipo: "volar", color: "#ffffff", color2: "#cfe8ff", dura: 3 } },
    },
    iceman: {
        hielo: { nombre: "Rayo de hielo", efecto: { tipo: "hielo", desde: "mano_der", color: "#4fc3ff", retraso: 0.2, dura: 1.6 } },
    },
    "spider-man": {
        telarana: { nombre: "Telaraña", efecto: { tipo: "telarana", desde: "mano_der", retraso: 0.15, dura: 1.6 } },
        columpio: { nombre: "Columpiarse", efecto: { tipo: "telarana", desde: "mano_der", modo: "arriba", retraso: 0, dura: 2 } },
    },
    hulk: {
        golpe: { nombre: "Golpe al piso", efecto: { tipo: "golpe", color: VERDE, retraso: 0.7, dura: 0.9 } },
        aplauso: { nombre: "Aplauso de trueno", efecto: { tipo: "onda", desde: "mano_der", color: "#ffffff", retraso: 0.5, dura: 0.8 } },
    },
    "iron-man": {
        repulsor: { nombre: "Repulsor", efecto: { tipo: "rayo", desde: "mano_der", color: AZUL, modo: "fino", retraso: 0.2, dura: 0.7 } },
        pecho: { nombre: "Rayo del pecho", efecto: { tipo: "rayo", desde: "torso", color: "#dff6ff", retraso: 0.5, dura: 1.2 } },
        volar: { nombre: "Volar", bucle: 3, efecto: { tipo: "volar", color: "#9fe2ff", color2: "#ffffff", dura: 3 } },
    },
    "iron-man-clasico": {
        repulsor: { nombre: "Repulsor", efecto: { tipo: "rayo", desde: "mano_der", color: AZUL, modo: "fino", retraso: 0.2, dura: 0.7 } },
        pecho: { nombre: "Rayo del pecho", efecto: { tipo: "rayo", desde: "torso", color: "#dff6ff", retraso: 0.5, dura: 1.2 } },
        volar: { nombre: "Volar", bucle: 3, efecto: { tipo: "volar", color: "#9fe2ff", color2: "#ffffff", dura: 3 } },
    },
    "doctor-strange": {
        hechizo: { nombre: "Hechizo", efecto: { tipo: "hechizo", desde: "mano_der", color: "#ffae3a", retraso: 0.1, dura: 1.8 } },
        levitar: { nombre: "Levitar", bucle: 3, efecto: { tipo: "volar", a: 0.3, color: "#ffae3a", color2: "#ffd27a", dura: 3 } },
    },
};
const p = (de, poder, extra = {}) => ({ de, poder, ...extra });
const VOLAR_IM = p("iron-man", "volar"), REPULSOR = p("iron-man", "repulsor"), PECHO = p("iron-man", "pecho");
const TELA = p("spider-man", "telarana"), COLUMPIO = p("spider-man", "columpio");
const hechizo = (nombre, color) => p("doctor-strange", "hechizo", { nombre, efecto: { color } });
const LEVITAR = p("doctor-strange", "levitar");
const GOLPE = p("thor", "martillo", { nombre: "Supergolpe", efecto: { color: "#ffffff" }, efectos: [] });
const FUERZA = (color) => hechizo("La Fuerza", color);
const BLASTER = p("iron-man", "repulsor", { nombre: "Bláster", efecto: { color: "#ff8a3a" } });
const JETPACK = p("iron-man", "volar", { nombre: "Jetpack", efecto: { color: FUEGO, color2: AMARILLO } });
export const PRESTADOS = {
    superman: {
        volar: p("iron-man", "volar", { efecto: { color: "#ffffff", color2: "#9fd0ff" } }),
        golpe: GOLPE,
        rayo: p("ciclope", "rayo", { nombre: "Visión de calor", efecto: { color: "#ff2a1a" } }),
    },
    flash: {
        correr: p("capitan-america", "correr", { nombre: "Supervelocidad", bucle: 2.2,
            efecto: { tipo: "velocidad", color: AMARILLO, color2: ROJO, retraso: 0, dura: 2.2 } }),
    },
    "mujer-maravilla": { lazo: p("spider-man", "telarana", { nombre: "Lazo de la verdad", efecto: { color: AMARILLO } }), golpe: GOLPE },
    "capitan-britania": { volar: VOLAR_IM, golpe: GOLPE },
    batman: { gancho: p("spider-man", "columpio", { nombre: "Gancho", efecto: { color: "#b0b0b0" } }) },
    "batman-returns": { gancho: p("spider-man", "columpio", { nombre: "Gancho", efecto: { color: "#b0b0b0" } }) },
    robin: { gancho: p("spider-man", "columpio", { nombre: "Gancho", efecto: { color: "#b0b0b0" } }) },
    "robin-lego-batman": { gancho: p("spider-man", "columpio", { nombre: "Gancho", efecto: { color: "#b0b0b0" } }) },
    "iron-man-mk42": { repulsor: REPULSOR, pecho: PECHO, volar: VOLAR_IM },
    "iron-patriot": { repulsor: REPULSOR, pecho: PECHO, volar: VOLAR_IM },
    "war-machine": { repulsor: REPULSOR, pecho: PECHO, volar: VOLAR_IM },
    rescue: { repulsor: REPULSOR, volar: VOLAR_IM },
    "iron-spider": { telarana: TELA, columpio: COLUMPIO },
    "spider-man-negro": { telarana: TELA, columpio: COLUMPIO },
    "superior-spider-man": { telarana: TELA, columpio: COLUMPIO },
    "spider-woman": { telarana: TELA, rayo: p("tormenta", "rayo", { nombre: "Descarga", efecto: { color: "#d8ff4a", cielo: false } }) },
    venom: { telarana: TELA, columpio: COLUMPIO },
    carnage: { telarana: p("spider-man", "telarana", { efecto: { color: "#e0262d" } }) },
    "capitan-america-clasico": { escudo: p("capitan-america", "escudo") },
    "jane-foster": { rayo: p("thor", "rayo"), martillo: p("thor", "martillo") },
    "jean-grey": { telequinesis: hechizo("Telequinesis", "#ff5ad1"), levitar: LEVITAR },
    fenix: { telequinesis: hechizo("Fuerza Fénix", FUEGO), levitar: p("doctor-strange", "levitar", { efecto: { color: FUEGO, color2: AMARILLO } }) },
    "fenix-oscura": { telequinesis: hechizo("Fuerza Fénix", ROJO), levitar: p("doctor-strange", "levitar", { efecto: { color: ROJO, color2: FUEGO } }) },
    "profesor-x": { telepatia: hechizo("Telepatía", "#c58bff") },
    psylocke: { cuchilla: hechizo("Cuchilla psíquica", "#ff5ad1") },
    "emma-frost": { telepatia: hechizo("Telepatía", "#ffffff") },
    magneto: { magnetismo: hechizo("Magnetismo", "#b86bff"), levitar: p("doctor-strange", "levitar", { efecto: { color: "#b86bff", color2: "#e0c8ff" } }) },
    polaris: { magnetismo: hechizo("Magnetismo", VERDE), levitar: p("doctor-strange", "levitar", { efecto: { color: VERDE, color2: "#c8ffcc" } }) },
    havok: { plasma: p("iron-man", "pecho", { nombre: "Plasma", efecto: { color: "#ffb000" } }) },
    electro: { rayo: p("tormenta", "rayo", { nombre: "Descarga", efecto: { color: "#d8ff4a", cielo: false } }) },
    "silver-surfer": { volar: p("iron-man", "volar", { efecto: { color: "#e8f4ff", color2: "#ffffff" } }), rayo: p("iron-man", "repulsor", { nombre: "Energía cósmica", efecto: { color: "#e8f4ff" } }) },
    nova: { volar: VOLAR_IM, rayo: p("iron-man", "repulsor", { nombre: "Ráfaga", efecto: { color: AMARILLO } }) },
    falcon: { volar: p("iron-man", "volar", { efecto: { color: "#ffffff", color2: "#d0d0d0" } }) },
    pyro: { fuego: p("antorcha-humana", "fuego", { nombre: "Lanzallamas" }) },
    "ghost-rider": { llamas: p("antorcha-humana", "encender", { nombre: "Cráneo en llamas" }), fuego: p("antorcha-humana", "fuego") },
    loki: { hechizo: hechizo("Hechizo", "#3cff7a") },
    mysterio: { hechizo: hechizo("Ilusión", VERDE) },
    "doctor-doom": { hechizo: hechizo("Hechizo", "#3cff7a"), rayo: p("iron-man", "repulsor", { nombre: "Rayo", efecto: { color: "#3cff7a" } }) },
    mandarin: { anillos: p("iron-man", "repulsor", { nombre: "Anillos", efecto: { color: "#ff5a5a" } }) },
    "star-lord": { blaster: BLASTER },
    avispa: { encoger: p("ant-man", "encoger", { efecto: { color: AMARILLO } }), aguijon: p("iron-man", "repulsor", { nombre: "Aguijón", efecto: { color: AMARILLO } }) },
    gambito: { cartas: p("iron-man", "repulsor", { nombre: "Cartas cargadas", efecto: { color: "#ff4fd8" } }) },
    "ms-marvel": { estirar: p("mr-fantastico", "estirar") },
    "super-skrull": { fuego: p("antorcha-humana", "fuego"), invisible: p("mujer-invisible", "invisible"), estirar: p("mr-fantastico", "estirar") },
    "harry-potter": { hechizo: hechizo("Hechizo", ROJO) },
    "hermione-granger": { hechizo: hechizo("Hechizo", AZUL) },
    "ron-weasley": { hechizo: hechizo("Hechizo", AMARILLO) },
    voldemort: { hechizo: hechizo("Hechizo", "#3cff3c") },
    "darth-vader": { fuerza: FUERZA(ROJO) },
    "darth-maul": { fuerza: FUERZA(ROJO) },
    "luke-skywalker": { fuerza: FUERZA(AZUL) },
    "anakin-skywalker": { fuerza: FUERZA(AZUL) },
    yoda: { fuerza: FUERZA(VERDE), levitar: p("doctor-strange", "levitar", { efecto: { color: VERDE, color2: "#c8ffcc" } }) },
    mandaloriano: { volar: JETPACK, blaster: BLASTER },
    "jango-fett": { volar: JETPACK, blaster: BLASTER },
};
