/* ============ Lo que los scripts de dibujo de Minifig Studio esperan encontrar ============ */
// 04-materiales.js lee renderer.capabilities al cargar; 08-poses.js usa window.MOM_T0.
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("lienzo"), antialias: true, alpha: true, powerPreference: "low-power" });
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
window.MOM_T0 = 0;
