# Sistema de personajes nuevo (zona aparte)

Planes: `ALV_PLAN_PERSONAJES_RAPIDO.md` (manda ahora) y `ALV_PLAN_PERSONAJES_NUEVO.md`; formato en
`ALV_FORMATO_PERSONAJES_V3.md` (carpeta `juegos-fiesta`, fuera del repo).

| Archivo | Qué hace |
|---|---|
| `tipos.ts` | Formato v3: familias, ficha de producción, figura del jugador, pieza, plano para el motor, 6 lógicas |
| `familias.ts` | `minifig`, `bigfig`, `corta`, `droide` (esqueleto); escala del juego (6.75) y respaldos de animación |
| `ficha.ts` | `leerFicha`: valida la ficha que entrega producción (`personajes-privado\CONTRATO-ENTREGA.md`) |
| `figura.ts` | `deCatalogo`, `leerFigura` (valida lo que llega de fuera, tope 8 KB), `apodo` |
| `plano.ts` | `resolver(id, figura, catálogo)` → plano; `resolverClips` aplica personaje → familia → respaldo |
| `compat.ts` | `opciones`, `poner`, `quitar` (familia, ocupa, requiere, excluye) |
| `indice.ts` | `cargarIndice(fuente)`: lee `/indice.json` del servidor de personajes y valida cada ficha |
| `galeriaDatos.ts` | Galería: tarjetas, categorías por saga, filtros (bando, tamaño), favoritos, páginas y cuántas caben |
| `coleccion.ts` | «Mi colección» v3: 3 espacios en `alv-coleccion-v3-<jugador>` (aparte de las cápsulas v2 del juego) |
| `Galeria.tsx` + `galeria.css` | Pantalla «Elegir personaje» con el Design System; ficha con el personaje en 3D (sube desde abajo en celular) |
| `constructorDatos.ts` | Constructor básico: ranura por parte, paletas (piel, pelo, ropa), piezas sacadas de los personajes del catálogo (`<personaje>--<parte>`), poner (pelo ↔ casco), teñir y `planoConstructor` |
| `Constructor.tsx` + `constructor.css` | Pantalla «Crear mi personaje»: 4 pestañas, colores, páginas que se deslizan, Regresar (30 pasos), Guardar |
| `Vista3D.tsx` | Una figura en 3D a partir de un plano (galería y constructor) |
| `demoGaleria.tsx` | Arranque de la página de prueba `tools/personajes/galeria.html`: «Mi personaje» → Elegir o Crear (no entra al juego) |
| `nucleo.test.ts`, `galeria.test.ts`, `constructorDatos.test.ts`, `separacion.test.ts` | Pruebas del núcleo, de la galería y la colección, del constructor, y candados de la zona (incluido: ningún módulo se llama igual que otro salvo mayúsculas) |

Reglas de esta zona (las revisa `separacion.test.ts`):

1. **Nada de la app la usa todavía.** Ningún archivo fuera de `src/personajes/` la importa hasta la fase 5 (conexión
   al motor), con permiso de Elías. Así el sistema actual sigue intacto.
2. **No depende del sistema viejo.** Aquí no se importa `figura3d`, `editarFigura`, `cambiosFigura`, `equiparPieza`,
   `content/personaje`, `sagas`, `catalogo-figura.json`, `trajes-figura.json` ni nada de `minifig/`. El sistema viejo
   se conserva (respaldo en `juegos-fiesta\respaldo-personajes-2026-11-25\`) y no se borra.
3. **Ningún modelo 3D entra al repo sin estar en `archivos-3d.json`** con su origen y una licencia pública
   (LDraw CC BY 4.0 o trabajo propio). Lo sacado de un juego (Hulk, Iron Man Heartbreaker, clips, caras) vive en
   `juegos-fiesta\personajes-privado\` y nunca entra aquí, aunque el repo se vuelva privado.
4. Lógica pura y con pruebas: sin 3D, sin DOM. El 3D vive en el iframe (`tools/personajes/` → `public/personajes/`)
   y recibe un plano ya resuelto; nunca lee la figura.
