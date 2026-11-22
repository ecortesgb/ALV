/* ============ Lo que los scripts de dibujo de Minifig Studio esperan encontrar ============ */
// 04-materiales.js lee renderer.capabilities al cargar; 08-poses.js usa window.MOM_T0.
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("lienzo"), antialias: true, alpha: true, powerPreference: "low-power" });
renderer.outputEncoding = THREE.sRGBEncoding;
// Estilo: «plastico» (por omisión, plástico brillante como en los juegos) o «toon» (?estilo=toon, caricatura con contorno).
// «cine» (?estilo=cine, prototipo en el HUB): plástico satinado, luz de tres puntos, sombra suave y oclusión ambiental.
window.ESTILO = (function () { const e = new URLSearchParams(location.search).get("estilo"); return e === "toon" || e === "cine" ? e : "plastico"; })();
window.ESTILO_TOON = window.ESTILO === "toon";
window.ESTILO_CINE = window.ESTILO === "cine";
// Plástico: tono de cine suave con más exposición (con la exposición normal lavaba los colores). Toon: sin tono de cine.
// Cine: menos exposición, más contraste; la luz hace el volumen.
renderer.toneMapping = window.ESTILO_TOON ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = window.ESTILO_CINE ? 0.95 : 1.35;
renderer.shadowMap.enabled = !window.ESTILO_TOON;
// PCF (no «soft») porque es el que respeta shadow.radius: la sombra de cine sale difusa.
renderer.shadowMap.type = window.ESTILO_CINE ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
window.MOM_T0 = 0;
