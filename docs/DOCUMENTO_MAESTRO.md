# ALV — Amigos Legendarios Verdaderos
## Documento Maestro del Producto
**Versión:** 1.42  
**Última actualización:** 18 de noviembre de 2026  
**Estado:** Documento vivo de producto; decisiones y propuestas identificadas por separado.

---

# 0. Cómo leer y mantener este documento

Este documento es la fuente de verdad del proyecto ALV. Su propósito es conservar el contexto, las decisiones, las propuestas, las reglas y el historial para que el producto pueda desarrollarse por fases sin perder acuerdos anteriores.

### Estados utilizados

- **DECISIÓN:** definición aceptada por el usuario. Se conserva hasta que el usuario la cambie.
- **PROPUESTA / HIPÓTESIS:** idea que merece exploración, pero no está aprobada.
- **PENDIENTE:** tema que requiere definición.
- **DESCARTADO:** idea que no debe reincorporarse salvo petición expresa.

No convertir una propuesta en decisión por el hecho de aparecer en este documento. No saltar fases ni iniciar una fase bloqueada sin aprobación explícita.

### Reglas de mantenimiento

1. Cada nueva idea debe analizarse y clasificarse antes de incorporarla.
2. Conservar las decisiones aprobadas y su contexto.
3. Registrar los cambios relevantes en el historial de versiones.
4. Distinguir lo que está aprobado de lo que solo se está explorando.
5. No reconstruir el documento desde cero ignorando versiones anteriores.
6. Cuando una idea sustituya otra, documentar el cambio y evitar mantener instrucciones contradictorias.
7. No recuperar propuestas expresamente descartadas.

---

# 1. Visión del producto

## 1.1 Qué es ALV

**ALV** es una plataforma web de minijuegos de fiesta multijugador para parejas y grupos de amigos. Busca convertir una reunión presencial en una experiencia social, competitiva, humorística y memorable, apoyada por teléfonos personales y una pantalla compartida.

Referencias de experiencia: Mario Party, Jackbox Games, Heads Up y Fall Guys. Son referencias funcionales y de calidad de experiencia; no se deben copiar sus personajes, arte, marcas, interfaces ni propiedad intelectual.

ALV debe permitir que un grupo se reúna, cree una sala, elija cómo competir, configure minijuegos y juegue rondas. Cada persona conserva una cuenta, personaje, nivel, inventario, logros y estadísticas entre reuniones.

**DECISIÓN (v1.3) — nombre:** la marca es **ALV** y no cambia. Su significado sí puede cambiar: cualquier frase que encaje con las letras A, L y V. El significado principal es «Amigos, Locuras y Verdades»; «Amigos Legendarios Verdaderos» es una alternativa aceptada. Cada pantalla puede usar una variante distinta, como un eslogan que se adapta. «Aventuras con Amigos» deja de ser el nombre principal.

**DECISIÓN (v1.12, Elías, 15 de noviembre) — nombre:** el significado principal pasa a ser **«Amigos Legendarios Verdaderos»**. «Amigos, Locuras y Verdades» queda como variante aceptada. Sigue vigente que cada pantalla puede usar otra frase con A, L y V.

## 1.2 Qué NO es ALV

- No es un RPG ni un juego de rol.
- No es un juego de fantasía medieval.
- No debe utilizar pixel art como dirección visual.
- No es una trivia convencional.
- No es una red social genérica.
- No es un dashboard SaaS.
- No es un producto infantil, aunque pueda tener personajes estilizados.
- No debe depender de una sola mecánica de preguntas y respuestas.

## 1.3 Personalidad

ALV debe sentirse como un videojuego al que apetece entrar: divertido, social, irreverente, competitivo y con humor mexicano, pero con ejecución visual profesional y cuidada.

El tono admite picardía y humor absurdo, sin convertir la experiencia en una plataforma de humillación, presión social, consumo excesivo de alcohol o retos peligrosos.

## 1.4 Lenguaje de siglas

**DECISIÓN (v1.3):** el lenguaje de toda la app juega con siglas y abreviaturas (ALV, GOAT, FBI, GPS, MVP…). Los textos de resultados, premios, avisos y transiciones deben usarlas con ingenio y sin sonar forzadas. El significado de una sigla puede cambiar según el contexto.

Ejemplos de referencia, no textos finales:
- «El GOAT de la competencia».
- «GPS: Ganando Por Siempre».
- «Llamen al FBI porque necesitamos buscar la XP del jugador del último lugar».

Las frases sobre el último lugar deben respetar el tono de 1.3: humor sin humillar.

**PENDIENTE:** redactar el banco de frases por momento (victoria, derrota, empate, último lugar, espera, carga) y revisarlo con el usuario.

---

# 2. Principios de experiencia

1. **La convivencia es el centro.** La tecnología facilita la interacción presencial; no debe reemplazarla.
2. **Reglas comprensibles.** Un jugador debe entender qué hacer en pocos segundos.
3. **Variedad real.** Alternar deducción, humor, música, memoria, dibujo, votación y actuación.
4. **Participación equilibrada.** Evitar que una sola persona monopolice la partida.
5. **Competencia amistosa.** Ganar y perder puntos debe generar emoción, no castigos permanentes desproporcionados.
6. **Progresión persistente.** El perfil y los desbloqueos sobreviven a cada sesión.
7. **Equidad.** Los cosméticos no deben dar ventajas competitivas.
8. **Accesibilidad.** No depender exclusivamente de color, audio, movimiento o una habilidad física.
9. **Privacidad.** La pantalla pública nunca debe revelar respuestas privadas antes del momento de revelación.
10. **Seguridad.** No proponer retos peligrosos, contacto no consentido ni consumo obligatorio de alcohol.

---

# 3. Tres experiencias integradas: HOST, PLAYER y SCREEN

ALV se concibe como tres interfaces coordinadas.

## 3.1 HOST — Administración de la sesión

El HOST es la interfaz del administrador de la reunión.

Puede:
- Crear y configurar lobbies.
- Compartir código, QR o enlace de acceso.
- Definir modalidad y participantes.
- Seleccionar herramientas, minijuegos, escenarios y reglas.
- Configurar rondas y duración.
- Iniciar, pausar, reanudar y cerrar partidas.
- Supervisar el estado de los jugadores.
- Resolver incidencias operativas permitidas por las reglas.

**DECISIÓN:** únicamente el administrador crea el lobby e inicia la partida. Los demás participantes se unen a un lobby existente.

## 3.2 PLAYER — Experiencia personal

Interfaz móvil de cada participante.

Puede:
- Registrarse e iniciar sesión.
- Crear y personalizar su personaje.
- Consultar perfil, nivel, XP, inventario, logros y estadísticas.
- Unirse mediante código, QR o enlace.
- Responder preguntas privadas.
- Votar.
- Dibujar.
- Participar en turnos.
- Usar cartas o herramientas cuando corresponda.
- Consultar su resultado y progreso.

**DECISIÓN (v1.25, Elías, 15 de noviembre) — D1, acceso solo para mayores de 18:** ALV es exclusivo para mayores de 18. **No hay modelo familiar.** Cartas y juegos llevan etiquetas de intensidad **tranquila / adulta / Drunk**. Sustituye la parte de edad de la decisión v1.12 de abajo (menores con cuenta y contenido familiar), la decisión 7 de 22.1 (la sala deja de ser familiar) y la etiqueta «familiar» de 13 (tanda 4, decisión 4) y 22.1. Sigue vigente que todo jugador necesita cuenta, también en el juego local.
**DECISIÓN (v1.26, Elías, 15 de noviembre) — D1, cómo se aplica:** la edad se comprueba con la fecha de nacimiento. Hoy no hay ningún menor y no debe haberlo: si la fecha da menos de 18 años, la app muestra un **mensaje de bloqueo por minoría de edad** y no deja seguir hasta que se corrija la fecha de nacimiento. La intensidad funciona como un **termómetro** de cuatro niveles (Tranquilo, Picante, Sin filtro, Salvaje) que sube o baja de uno en uno.
\1
\1
**DECISIÓN (v1.28, Elías, 15 de noviembre) — Temperatura + Voltaje:**
1. Se aprueban los **dos ejes independientes de 5 niveles**, Temperatura (preguntas) y Voltaje (retos). Sustituyen el termómetro de 4 niveles de v1.26 y el interruptor Adulto, y resuelven el pendiente de D1.
2. El nivel es **general para toda la sala** y lo pone el anfitrión, después de que el grupo lo decide por mayoría fuera de la app. **No hay límites individuales por jugador.**
3. **Pasar no es gratis:** solo se puede pasar con un comodín. Sin comodín, el jugador cumple el reto o responde la pregunta (cualquier respuesta cuenta).
4. **Las cartas de trago no se pueden omitir.** El texto dice «trago» o «shot», nunca exige alcohol, y cada quien elige qué tomar (agua, refresco, lo que quiera). Tomar nunca da XP.
5. Comodines: se aprueba **Cambio de pregunta o reto**, y **¿Voy a tener suerte?** pasa a ser un comodín cuyo resultado puede ser mejor o peor para quien lo usa.
6. **Más contenido:** se crean más preguntas y retos, y el contenido se ampliará con otras fuentes, para que haya variedad en cada nivel, categoría y combinación y **no se repita ninguna carta en toda la jornada de juego prevista**.
\1
**DECISIÓN (v1.29, Elías, 15 de noviembre) — resuelve los pendientes de v1.28:**
- (a) **Consentimiento:** los retos de contacto piden consentimiento explícito. Además, **siempre hay una alternativa** al reto: tomar agua, cumplir un castigo o responder otra pregunta. No se fuerza a nadie a nada. Pasar sin hacer nada sigue costando un comodín.
- (b) **Primera jornada de prueba:** de sábado 12:00 a domingo 17:00 (29 horas). Para entonces tiene que haber juegos y contenido suficientes para que no se repita nada en toda la jornada.
- (c) **Eventos sorpresa:** son una opción que se enciende al configurar la partida y también un ajuste predeterminado del anfitrión en la administración de partidas.
- (d) **Ajustes predeterminados del anfitrión** («reglas de la casa»), que se aplican a todas las partidas hasta que los cambie: por ejemplo, usar solo dados para todos los juegos, dejar fijo el nivel de Temperatura o de Voltaje, eventos sorpresa encendidos o apagados.
- (e) **Puntos:** todos los niveles dan el mismo puntaje. El anfitrión puede dar un premio de XP adicional (la XP por reto en vivo de 22.1).
- (f) **Fuentes del contenido nuevo:** ideas propias y anécdotas personales de los amigos que participan en la prueba.
**PENDIENTE (v1.29):** (1) la fecha exacta del sábado de prueba; (2) las anécdotas de los amigos son datos personales y el repo es público: no pueden ir en `src/content`. Propuesta: guardarlas en la base, visibles solo para el grupo que juega y cargadas por el administrador; esto cambia, solo para ese contenido, la decisión 2 de 22.1 (textos en el código); (3) cómo se juntan las anécdotas (formulario dentro de ALV para que cada amigo mande las suyas y el administrador las apruebe, o una lista que Elías pasa).

**DECISIÓN (v1.12, Elías; la parte de menores y contenido familiar queda sustituida por D1 en v1.25) — cuentas y edad:** todo jugador necesita cuenta, también en el juego local (se acaban los jugadores creados sin cuenta en el celular). Los menores de 18 sí pueden tener cuenta. Si en la sala o en la partida local hay al menos un menor, no se pueden activar el contenido adulto ni el modo Drunk y solo queda disponible el contenido **familiar**: temas, preguntas, retos y castigos marcados como familiares. La edad es la que declara cada quien al registrarse.

**PENDIENTE:** cómo entran varias cuentas en un mismo celular para el juego local (apodo y contraseña de cada quien, o código desde su propio celular), qué pasa con la XP local que existe hoy sin cuenta, y etiquetar el contenido actual como familiar o no (hoy las cartas solo tienen adulto y Drunk).

## 3.3 SCREEN — Pantalla compartida

Interfaz pública para televisión, proyector o pantalla compartida.

Muestra:
- Lobby y participantes.
- Personajes.
- Instrucciones públicas.
- Preguntas que deban ser públicas.
- Temporizadores.
- Ruletas, tableros y herramientas.
- Dibujos y resultados cuando corresponda.
- Revelaciones, puntuaciones, podios y celebraciones.

**DECISIÓN (v1.13, Elías, 15 de noviembre):** la pantalla que se proyecta (laptop o TV) no participa: solo muestra la partida. Quien organiza juega desde su celular con su cuenta de jugador, donde ve su palabra secreta, sus herramientas y sus preguntas. Sale de la prueba real de sala, donde el jugador de la laptop no podía ver su palabra en El impostor. Resuelto en v1.14: ver 21.3.

**DECISIÓN (v1.32, Elías, 16 de noviembre) — acceso sin cuenta (modo invitado):** se puede entrar a probar sin crear cuenta. Modo invitado: el juego corre en este aparato, con etiqueta visible «Prueba»; no guarda XP, figura ni historial; no escribe en la base. Para entrar pide apodo y confirmar que es mayor de 18, sin fecha de nacimiento. Sustituye, solo para este modo, la decisión de v1.12 de que el juego local necesita cuenta. **DECISIÓN (v1.33, Elías, 16 de noviembre):** el invitado de prueba puede entrar a salas en la nube y en el modo local, igual que una cuenta. Es solo para pruebas: al terminar, Elías borra todo lo que dejen los invitados (cuentas, XP, figuras y salas). Después creará los perfiles de todas las personas cuando la app esté lista. Antes de activar el acceso anónimo en la base, se revisa con el asesor de seguridad (regla de `app\CLAUDE.md`).

**Regla de privacidad:** no mostrar respuestas, roles, palabras secretas ni información privada antes del momento definido por la mecánica.

---

# 4. Modelo conceptual del producto

Separar las siguientes entidades para evitar mezclar una reunión con una partida:

1. **Plataforma:** producto permanente y cuentas.
2. **Usuario:** identidad, credenciales y datos de perfil.
3. **Personaje:** apariencia y elementos equipados.
4. **Evento:** reunión concreta de amigos.
5. **Sala / Lobby:** espacio al que se conectan los participantes.
6. **Sesión:** conjunto de partidas jugadas durante una reunión.
7. **Partida:** ejecución de un minijuego o conjunto de rondas.
8. **Ronda:** unidad de juego y puntuación.
9. **Acción / Evento del motor:** respuesta, voto, dibujo, turno, resultado, desconexión, etc.
10. **Inventario / Colección:** elementos que pertenecen a la cuenta.
11. **Progreso:** XP, nivel, logros y estadísticas persistentes.

Un evento puede contener varias sesiones y partidas. El perfil, la XP acumulada, los logros y el inventario persisten entre eventos.

---

# 5. Modalidades de competencia

Modalidades contempladas:

- Individual.
- Parejas.
- Equipos.
- Equipos mixtos.
- Guerra de géneros.
- Todos contra todos.

**PENDIENTE:** definir reglas para número impar de participantes, tamaño de equipos, asignación automática, cambios de equipo y opciones inclusivas. No asumir que todos los minijuegos admiten todas las modalidades.

La compatibilidad entre modalidad y minijuego debe establecerse en una matriz.

---

# 6. Configurador: cuatro dimensiones

El configurador contempla cuatro dimensiones distintas:

## 6.1 Modalidad
Quién compite contra quién: individual, parejas, equipos, etc.

## 6.2 Herramienta
Recurso de interacción:
- Dados.
- Botella.
- Ruleta.
- Temporizador.
- Cartas.
- Pizarrón.
- Micrófono.
- Votaciones.
- Tablero.

## 6.3 Tipo de juego
La mecánica del minijuego: impostor, dibujo, karaoke, preguntas, retos, memoria, etc.

## 6.4 Escenario
El ambiente físico o visual donde ocurre la experiencia. No es una categoría ni un minijuego.

Ejemplos de combinaciones:
- Parejas + pizarrón + ¿Cuánto conoces a tu pareja? + terraza.
- Parejas + cartas + verdad o reto + fogata.

**PENDIENTE:** construir una matriz de compatibilidad que impida combinaciones sin sentido.

---

# 7. Escenarios y nombres explorados

Los escenarios son ambientes visuales o temáticos, no tipos de juego.

Nombres propuestos:
- **ALVerca:** alberca. Es el nombre que debe conservarse.
- **FBI:** Fogata Bajo Investigación.
- **GPS:** Gran Parque Salvaje.
- **FAP:** Fiesta, Amigos y Pecados (bar/fiesta adulta).
- **AFK:** Aquí Fuera de Kontrol (casa).
- **PVP:** arena de enfrentamientos.
- **WTF:** escenario de sorpresas.
- Casa.
- Jardín.
- Terraza.
- Campamento.

**DECISIÓN:** conservar el nombre ALVerca.  
**DECISIÓN (v1.3):** ALVerca, FBI: Fogata Bajo Investigación y GPS: Gran Parque Salvaje son los escenarios activos y así se quedan.  
**PROPUESTA:** los demás nombres y escenarios siguen sujetos a aprobación.

---

# 8. Identidad visual y dirección de arte

## 8.1 Objetivo visual

La identidad debe combinar **fiesta, elegancia y profesionalismo**. No debe parecer infantil, casino, dashboard corporativo ni una interfaz genérica de IA.

No se ha elegido una paleta oficial. No fijar colores, tipografías ni sistema visual definitivo hasta comparar conceptos aplicados a pantallas reales.

## 8.2 Dos personalidades visuales

La plataforma tendrá dos ambientes que comparten una misma identidad:

### Plataforma / HUB
- Premium, editorial y reposada.
- Jerarquía visual clara y aire.
- Microinteracciones sutiles.
- Colores controlados.
- Fondos sobrios y superficies bien diferenciadas.

### Partida / Gameplay
- Energética, expresiva e irreverente.
- Colores y contrastes más intensos.
- Animaciones, celebraciones y feedback más notorios.
- Lectura inmediata de instrucciones y estado de juego.

El lobby es la transición entre plataforma y gameplay. La transición debe sentirse como abrir una puerta a la fiesta.

## 8.3 Tres direcciones visuales a explorar — DESCARTADO (v1.3)

**DESCARTADO (v1.3):** la comparación A/B/C ya no se hace. El usuario eligió la línea Neo-Arcade (8.6) como dirección visual. Lo que sigue en 8.3, 8.4, 8.5 y 23.2 se conserva como historial y no debe retomarse sin petición expresa.

Direcciones que se habían planteado:

**A. Premium Gaming**
- Oscura y sofisticada.
- Iluminación controlada.
- Personaje protagonista.
- Sensación de objeto coleccionable de lujo.

**B. Neon Party**
- Saturada y contrastante.
- Ambiente nocturno.
- Energía de fiesta moderna, sin estética infantil.

**C. Stylized 3D**
- Personajes volumétricos.
- Escenarios inmersivos.
- Mundo atractivo con figuras armables originales.
- No copiar marcas ni diseños protegidos.

Cada dirección debe tener tres pantallas: HUB, apertura de sobre y gameplay de parejas. Se compararán nueve mockups en total, organizados en tres archivos HTML independientes.

## 8.4 Exploración de paletas

Se exploraron como hipótesis:

- **Midnight Party:** carbón, violeta eléctrico, cian y rosa.
- **Electric Social:** azul noche, naranja, violeta, turquesa y amarillo.
- **Luxe Playground:** carbón, grafito, naranja coral, dorado y lavanda.

No elegir una paleta oficial todavía. La recomendación inicial fue explorar primero Luxe Playground, después Midnight Party y Electric Social, pero el orden no constituye una decisión.

Evitar:
- Negro puro como fondo absoluto.
- Muchos colores brillantes compitiendo en una misma pantalla.
- Gradientes en todos los botones.
- Tipografía caricaturesca en toda la plataforma.
- Repetir exactamente la misma paleta en todos los minijuegos.

## 8.5 Criterios para evaluar conceptos

Escala:
- **5:** referente de industria; listo sin cambios.
- **4:** profesional; requiere 1–2 ajustes.
- **3:** funcional, pero presenta algún aspecto amateur.
- **2:** forzado, incómodo o arbitrario.
- **1:** roto o incoherente.

Fase 0 — Veto estructural por concepto:
- Personalidad identificable.
- Dos personalidades visuales (plataforma y gameplay).
- Personajes exportables y reutilizables.

Fase 1 — Evaluación de arte con capturas:
- Reconocibilidad: 25%.
- Coherencia: 20%.
- Diferenciación: 20%.
- Público objetivo: 15%.
- Total: 80%.

Fase 2 — Evaluación técnica con código:
- Escalabilidad: 10%.
- Ejecutabilidad web: 10%.
- Total: 20%.

Test de campo con tres participantes y orden contrabalanceado:
- P1: A → B → C.
- P2: B → C → A.
- P3: C → A → B.

Preguntas sin explicar previamente el concepto; 30 segundos por concepto:
1. ¿Qué tipo de juego parece?
2. ¿Jugarías con amigos este fin de semana?
3. ¿Cuál se ve más caro?

Probar en teléfono real. No pedir al diseñador o modelo que se autoevalúe. Si la diferencia entre conceptos es menor a cinco puntos, desempatar por reconocibilidad, coherencia, diferenciación y resultado del test.

## 8.6 Dirección visual «Neo-Arcade / Party Game» — DECISIÓN (v1.3)

**DESCARTADO (v1.12):** Neo-Arcade deja de ser la dirección visual. La sustituye «Comic Gaming — Premium Party Experience» (8.7). Lo de abajo se conserva como historial.

**DECISIÓN (v1.3, sustituida en v1.12):** Neo-Arcade es la dirección visual de ALV. Parte del diseño que ya existe en la app (fondo espacial, un neón por sección) y lo mejora con la lista de abajo, aportada por el usuario. Sustituye la comparación A/B/C de 8.3.

La lista se implementa por tandas, cada una en su propio cambio para que el usuario la pruebe antes de seguir:
1. Uso: modales propios, mantener presionado para ver el secreto, turno visible y sonido con botón de silencio.
2. Atmósfera y recompensa: fondo vivo, tarjetas con profundidad, temporizador en anillo, números flotantes y podio con confeti.
3. Mecánicas táctiles: ruleta con fricción, gestos e inclinación en cartas, botella interactiva y destello de cartas de poder.
4. Estructura: pantallas grandes y chips en la pantalla de Juegos.

La paleta y la tipografía que ya usa la app quedan como base de trabajo. Su versión oficial se fija en la fase de Design System.

Diseño visual:
- Fondo vivo: gradientes de malla animados, auras de neón que pulsan según la sección activa y estrellas con parpadeo suave.
- Tarjetas con profundidad: fondo semitransparente con desenfoque, borde con brillo de neón y sombra de color al tocar.
- Pantallas grandes (escritorio, tablet, TV): marco tipo consola o arcade, o vista adaptativa con vista previa lateral, en lugar de la columna fija de 520 px.

Movimiento y microinteracciones:
- Ruleta de ¡Sorpréndeme! con frenado por fricción, clic sonoro que se va haciendo lento, y destello con confeti en la categoría ganadora. *(v1.8: frenado y clic por segmento hechos; el destello con confeti queda pendiente.)*
- Carta de Verdad o reto con inclinación 3D al tacto y gestos: deslizar a la derecha = Cumplió, a la izquierda = Paso, hacia arriba = usar carta de poder. *(v1.8: deslizar a la derecha, a la izquierda y arriba hechos; la inclinación 3D queda pendiente. Los botones siguen igual.)*
- Números flotantes de recompensa (`+2 pts`, `+3 XP`) que viajan a la barra del jugador.
- Temporizador en anillo con cuenta fluida y cambio de color (cian, ámbar, rojo parpadeante en los últimos 10 segundos) con sonido de tensión.
- Podio: confeti ligero y entrada escalonada con rebote (3.º, 2.º y al final el 1.º con corona luminosa).

Estructura y navegación:
- Sustituir los cuadros de confirmación nativos del navegador por modales propios con el diseño de la app.
- Pantalla de Juegos: encabezado colapsable o chips rápidos («Todos», «Retos», «En pareja», «Rápidos») para reducir el scroll.
- Fila de avatares con el turno activo resaltado.

Mecánicas y fricción al pasar el celular:
- «Mantén presionado para ver tu secreto»: en partidas con un solo dispositivo, el dato privado solo se ve mientras el dedo está en pantalla; al soltar se oculta.
- Botella interactiva que se gira con el dedo y apunta a un avatar del círculo, para los juegos con mecánica de botella.
- Activación de cartas de poder con destello a pantalla completa.
- Efectos de sonido generados por código (sin archivos ni dependencias) con botón para silenciar.

Condiciones que ya fija este documento y aplican a toda la lista: respetar movimiento reducido, poder silenciar, no depender solo de color o de sonido, y cuidar el rendimiento en móviles (capítulo 20). Los gestos deben conservar botones equivalentes.

---

## 8.7 Dirección visual «Comic Gaming — Premium Party Experience» — DECISIÓN (v1.12)

**DECISIÓN (v1.12, Elías):** la dirección visual de ALV 2.0 es Comic Gaming: personalidad de cómic, profundidad y figuras 3D, tipografía contundente, animaciones fluidas y efectos moderados. Evitar pixel art, estética RPG o medieval, apariencia infantil, aspecto de dashboard o SaaS, exceso de neón y glassmorphism por costumbre. En la fase de dirección artística se presentan **tres propuestas realmente distintas** dentro de Comic Gaming (no variaciones de color) y Elías elige una. Esto reabre, solo para Comic Gaming, la comparación de tres direcciones que 8.3 había descartado.

Referencia de Elías: lámina de 12 pantallas (carga, registro, personalizar, menú, modos, lobby con QR, ruleta, resultados, tienda, perfil, TV y administración) con figuras tipo bloque sobre ciudad nocturna, paneles azules con borde de cómic y botones grandes de colores.

**DECISIÓN (v1.15, Elías aprobó la Fase 2, 15 de noviembre) — «Cine Cómic Nocturno»:** de las propuestas A (Viñeta Nocturna), B (Cartelazo) y C (Cine Cómic), Elías pidió una mezcla, la D, y la aprobó. Referencia con las cuatro pantallas (hub, catálogo, TV con El impostor y celular con palabra secreta) en celular, laptop y TV: página «ALV 2.0 Fase 2» (https://claude.ai/artifact/9eYPazP8GC2U3nbMaLG44y, fuente `alv2\fase2.html` fuera del repo). A, B y C quedan como historial.
- De la C: títulos en Barlow Condensed itálica con contorno oscuro, texto en Barlow; pestañas y etiquetas inclinadas; brillo que cruza botones y tarjeta enfocada; escáner de huella del FBI para ver el secreto; en la TV de El impostor, rueda de reconocimiento con pared de estaturas, reflector fijo en quien habla y otro que barre a los sospechosos.
- De la A: azul y amarillo como base; fondo de ciudad gótica de noche (agujas, luna, ventanas encendidas); onomatopeyas en Bangers, una por pantalla; figuras con contorno de tinta.
- De la lámina de Elías: botones inclinados con bisel y color por sección (Jugar amarillo, Personalizar azul, Tienda morado, Ranking verde, Logros naranja), icono blanco; tarjeta del jugador arriba; figura sobre pedestal con reflector; etiquetas amarillas de sección.
- Botones vivos: brillo periódico, se levantan al pasar, el icono se mueve, se hunden al tocar; Jugar late.
- Cada juego del catálogo tiene ilustración: rayos de cómic del color de su fila, personajes y el objeto del juego. En la app salen de fotos del 3D.
- Paleta de trabajo: noche #0d1a45, panel #2453c4, borde #5fb4ff, amarillo #ffd23f, azul #2f7bff, morado #8b3dff, verde #35b84a, naranja #ff7a1a, rojo FBI #ff3d4a. Los valores finales se fijan en el Design System.
- En Three.js: material de caricatura con contorno y dos luces (reflector y relleno azul).

**DECISIÓN (v1.16, Elías aprobó, 15 de noviembre) — Design System:** «ALV Cine Cómic Nocturno» (https://claude.ai/artifact/Sp4sNhojH6nv6skwgcwzSn, fuente `alv2\fase3-design-system\`) fija colores, estilos de letra, espacios, radios, sombras, inclinación, tiempos de animación y 13 componentes con sus estados (botón, etiqueta, pestañas, chip, panel, tarjeta del jugador, tarjeta de juego, barra del anfitrión, reloj, escáner, onomatopeya, fondo de ciudad, rueda de sospechosos). Es la base de todas las pantallas de la Fase 3. Aviso abierto: el texto blanco sobre verde y naranja da 2.6:1 y depende del contorno de tinta; revisar con usuarios antes de la Fase 6.

**DECISIÓN (v1.17, Elías aprobó, 15 de noviembre) — Fase 3, tanda 1: acceso, registro e inicio.** Referencia: https://claude.ai/artifact/QL8Uy2kc9stUsVmD8hcgAm (fuente `alv2\fase3-t1\`). Nueve pantallas: carga (solo sin sesión), entrar, crear cuenta, código de recuperación, recuperar contraseña, elige tu figura (solo la primera vez), bienvenida (solo la primera vez sin QR), unirme a una sala y proyectar en esta pantalla. Decisiones, todas las recomendadas: (1) en la Pantalla se entra escaneando un QR desde el celular con sesión, teclado de respaldo; (2) registro en 3 pasos: apodo y contraseña, fecha de nacimiento y género, avisos; (3) el código de recuperación es obligatorio: no se sigue sin marcar «Ya lo guardé»; (4) la figura del registro se puede saltar y toca una al azar fija; (5) apodo de 3 a 16 caracteres, letras, números y guion bajo, único sin importar mayúsculas, respetando los apodos que ya existen; (6) 5 intentos fallidos y espera de 1 minuto al entrar o 15 al recuperar. Las figuras de las maquetas son siluetas de referencia: en la app son las figuras 3D de Minifig Studio (9.3).

**DECISIÓN (v1.18, Elías aprobó, 15 de noviembre) — Fase 3, tanda 2: menú principal, catálogo y ficha de juego.** Referencia: https://claude.ai/artifact/XAAp2GCgE7CFPbGjafEvAZ (fuente `alv2\fase3-t2\`). Menú principal con aviso de sala abierta, burbujas de novedades y engrane; menú de Jugar; catálogo con estados explorando, anfitrión en sala, menor en la sala y Sorpréndeme, más la fila de Herramientas; ficha del juego con cómo se juega, puntos, XP por lugar, modalidades y etiquetas, y botón según quién mira. Decisiones, todas las recomendadas: (1) Jugar abre primero un menú de 4 opciones (unirme, proyectar, este celular, ver juegos); (2) los invitados ven el catálogo y pueden mandar una sugerencia al anfitrión, sin elegir; (3) Sorpréndeme muestra el juego elegido con «¡Este!» u «Otro» antes de empezar; (4) la ficha muestra la XP por lugar con los jugadores reales; (5) el engrane abre Ajustes (sonido, música, menos movimiento, cuenta, cerrar sesión y Administración solo para administradores) y el Perfil se abre desde el retrato.

**DECISIÓN (v1.19, Elías aprobó, 15 de noviembre) — Fase 3, tanda 3: configuración de partida y lobby.** Referencia: https://claude.ai/artifact/V3wBZpELqq62HeDazPRCvy (fuente `alv2\fase3-t3\`). Abrir sala (lugar con postales, intensidad Tranquilo/Picante/Sin filtro/Salvaje, Adulto y Drunk), sala en la TV (QR, figuras que llegan, «eligiendo», siguiente juego con reglas y cuenta regresiva), sala en el celular del anfitrión (quién está, Elegir juego, Iniciar) y del jugador (cápsulas que cambian el traje al instante en la TV, gestos, Listo), armar partida (modalidad y rondas) y partida en un solo celular (agregar jugadores con apodo y contraseña). Decisiones, todas las recomendadas: (1) el anfitrión puede iniciar cuando el mínimo del juego está listo; quien no, entra en la siguiente partida; (2) rondas 5, 8, 10 o 15, con 5 marcado; (3) equipos repartidos parejo de forma automática y ajustables tocando a alguien; (4) el anfitrión puede sacar a alguien de la sala, con confirmación; (5) quien llega a media partida juega desde la siguiente; (6) si entra un menor, la sala pasa a familiar y la TV lo avisa sin decir quién.

**DECISIÓN (v1.20, Elías aprobó, 15 de noviembre) — Fase 3, tanda 4: personalizador, colección y sobres.** Referencia: https://claude.ai/artifact/DLmnegsSqJy7mQ9aSKWjeF (fuente `alv2\fase3-t4\`). Cápsulas (tocar una la activa al instante), editor rápido (cara, pelo, playera, pantalón, accesorios, pose; al azar solo con piezas propias), taller completo de Minifig Studio, tienda (sobres de piezas y de contenido), apertura de sobre y mi colección. Decisiones, todas las recomendadas, que resuelven pendientes de 13: (1) sobres de piezas bronce 60 XP (nivel 1, 2 piezas), plata 120 (nivel 3, 3 piezas), oro 240 (nivel 6, 4 piezas); (2) sin repetidas: los sobres solo traen piezas que no se tienen y uno sin piezas nuevas no se vende; (3) cuatro rarezas solo de colección, común 60 %, rara 28 %, épica 10 %, legendaria 2 %, visibles antes de comprar; (4) sobres de contenido de 100 a 150 XP, con etiquetas de familiar, adulto e intensidad, válidos para toda la sala del dueño, y el contenido base siempre alcanza para jugar; (5) en el editor se ven las piezas que faltan, en gris y con el sobre donde salen; (6) el taller completo solo en tablet o computadora; en celular, el editor rápido.

**DECISIÓN (v1.21, Elías aprobó, 15 de noviembre) — Fase 3, tanda 5: perfil, logros y rankings. Con esto la Fase 3 de ALV 2.0 queda cerrada.** Referencia: https://claude.ai/artifact/6kYG6Lr7vp7i1ynjx3aSYv (fuente `alv2\fase3-t5\`). Perfil con tarjeta de jugador (figura, nivel, título por nivel y números con siglas), logros de sesión e históricos con avance, y ranking con Esta reunión, Histórico, Parejas, Equipos e Historial. Decisiones, todas las recomendadas: (1) el perfil que ven los demás muestra figura, apodo, nivel, título, números, logros y últimas partidas, nunca fecha de nacimiento ni género; (2) el ranking histórico compara por defecto con «Mi grupo» (gente con la que se ha jugado), con «Todo ALV» y «Este mes» como filtros; (3) cada quien elige 3 logros destacados; (4) unos pocos logros secretos, visibles como «???» con pista; (5) los logros no dan XP; (6) la tarjeta usa siglas: PJ partidas jugadas, PG ganadas, RC retos cumplidos, MVP, IMP impostores atrapados, RAC mejor racha.

## 8.8 Propuesta de diseño Neon Party — PROPUESTA (v1.32)

**PROPUESTA (v1.32):** instrucciones de transformación visual de Elías («ALV — Neon Party Universe»): tokens y tipografía en `theme-game.css`, HUD con avatar y XP, HUB con JUGAR protagonista, selector de juegos con tarjetas ilustradas, lobby con placas, tienda con rarezas y apertura de sobres con omisión, microinteracciones con `prefers-reduced-motion`. Plan completo y decisiones abiertas en `app\docs\ALV_DISENO_NEON.md`.

**DECISIÓN (v1.33, Elías, 16 de noviembre) — dirección visual:** se mantiene **Cine Cómic Nocturno** (8.7, aprobado) y se le aplican las partes de Neon Party que sirven: barra superior con avatar, XP y monedas; estados de botón; rarezas con color y marco; apertura de sobres con omisión; animaciones que respetan el modo de movimiento reducido. Fuentes: **Bangers y Barlow** (no Outfit ni Fredoka). Monedas y gemas según 13.1. Nombre visible: **«Amigos Legendarios Verdaderos»**. Personajes: **se mantiene LEGO** (figura 3D de 9.3) para la prueba; el riesgo de §19.1 sigue vigente y debe revisarse antes de difundir la app fuera del grupo. No se usan las figuras ni nombres de las maquetas de referencia.

# 9. Personajes y personalización

## 9.1 Concepto

Personajes originales con estética de figuras armables y piezas intercambiables. La referencia es la lógica de personalización modular de juguetes de construcción, sin copiar diseños, marcas, proporciones protegidas ni elementos identificables de terceros.

## 9.2 Piezas y categorías

- Rostro.
- Ojos y expresiones.
- Cabello.
- Tono de piel.
- Playeras.
- Pantalones.
- Zapatos.
- Gorras.
- Lentes.
- Collares.
- Accesorios.
- Medallas.
- Coronas.
- Trajes.
- Fondos.
- Marcos.
- Animaciones.

El personaje debe conservar proporciones consistentes y permitir intercambio de piezas.

## 9.3 Presentación

- Cuerpo completo o vista 3/4 en editor, lobby y tienda.
- Busto o encuadre reducido durante minijuegos cuando ayude a la lectura.
- Vista giratoria del personaje.
- Posibilidad de mostrar espalda cuando un accesorio lo requiera.

CSS/SVG puede utilizarse para prototipos. No se ha elegido la técnica final; no prometer 3D real antes de validar viabilidad.

**DECISIÓN (v1.11, Elías, 15 de noviembre):** ALV se reconstruye completo en 3D con el modelo de figura por capas de Minifig Studio (`minifig-core`, piezas LDraw, Three.js). Reemplaza al personaje 2D por capas de imagen. Cada jugador tiene 3 cápsulas (figuras guardadas) y una activa, en `public.figuras_jugador`. Cada pantalla dibuja una sola escena 3D con todas las figuras; las listas chicas (ranking, tarjetas) usan una foto sacada del 3D. Orden: primero el personaje (editor, cápsulas, lobby y partida), después el rediseño de pantallas estilo cómic.

## 9.4 Personalidad, idles y emotes — propuestas

Idles explorados:
- Impaciente: mira una muñeca imaginaria o mueve el pie.
- Distraído: mira un móvil.
- Bailarín.
- Estirado: estira o gira la cabeza de forma cómica.
- Aburrido: se sienta o se rasca.

Emotes explorados:
- Baile ridículo con articulaciones rígidas.
- Llanto con lágrimas que parecen piezas.
- Risa.
- Flexión o desmontaje y reensamblaje cómico de brazos.

Reglas propuestas:
- Idles con frecuencia controlada.
- Emotes voluntarios y con límite anti-spam.
- Puramente cosméticos: no dan puntos ni ventajas.
- Podrían desbloquearse o comprarse con XP, sujeto al diseño económico.

---

# 10. Armario y editor de personaje — propuestas

**DECISIÓN (v1.25, Elías, 15 de noviembre) — D3, un solo personalizador:** hay **un personalizador** con dos modos, **Simple** y **Avanzado**. Al cambiar de modo se conserva lo que se lleva armado (**continuidad de estado**). Los trajes **no son destructivos**: probar o cambiar piezas no borra la cápsula guardada hasta que se guarda. Sustituye el «editor rápido» y el «taller completo» como dos editores separados (21.3 y tanda 4 de 8.7, v1.20); el contenido del modo Simple es el del editor rápido aprobado y el del Avanzado, el del taller de Minifig Studio.
**DECISIÓN (v1.41, Elías, 17 de noviembre) — D3, cómo se ve:** D3 se mantiene (un personalizador, dos modos, sin perder lo armado). Cambia la interfaz: el modo Avanzado **ya no es el taller de Minifig Studio** sino el **libro de cómic propio de ALV** (muro de 3 espacios → la carta brilla y se abre el libro; página izquierda con la figura viva que gira, se acerca a la parte que se edita, parpadea y sonríe; página derecha con viñetas que pasan de página). Los modos se llaman **Básico** (Simple) y **Completo** (Avanzado); el switch es uno para todo el editor, Básico por defecto en cuentas nuevas, y la preferencia viaja dentro de las figuras guardadas. Básico: Pelo, Cabeza, Accesorio, Torso completo y Piernas completas; Completo: además Casco, Brazos, Manos, Capa, Cadera y Botas, lados izquierdo y derecho, colores del dibujo del torso y máscaras. Minifig Studio queda solo como motor 3D invisible. Fuera de Apariencia: Objetos (una por mano), Momentos (paquetes), **Nombre = apodo de la figura** (va arriba del nombre del jugador en HUB, sala y TV; no cambia el nombre de la cuenta) y Aleatorio (con dado por sección). Mecánicas inspiradas en el editor de LEGO Marvel Super Heroes 2, con arte propio. Sigue con 3 espacios: ampliarlos toca la base (D-002).

**DECISIÓN (v1.42, Elías, 17 de noviembre) — Piezas con rareza y retos en el personalizador:** cada sección tiene piezas comunes (libres) y otras bloqueadas por rareza: Rara (100 XP), Épica (250 XP) y Legendaria (500 XP); los paquetes de momentos también. Se desbloquean **con retos** (uno diario que rota y retos de combinación; si ya tenías el premio, +40 XP) **y también con XP** (gasto tipo «pieza»: baja la XP disponible, no el nivel). Lo desbloqueado se guarda **en la nube** (tablas nuevas, migración 033) y el servidor valida compras, retos y que una figura guardada no use piezas bloqueadas; las piezas que ya usan las figuras guardadas se regalan. La lista de rarezas, precios y retos vive en `src/content/rarezas.ts`. Esto toca la economía de XP (§12) solo para piezas del personalizador: la tienda de sobres sigue congelada (D-001). El **taller compartido** («me gusta», plantillas) queda para después. La 033 requiere autorización expresa para aplicarse (D-002).

**DECISIÓN (v1.26, Elías, 15 de noviembre) — D3:** el modo Avanzado también está en celular. Sustituye la decisión 6 de la tanda 4 (v1.20), que lo dejaba solo en tablet o computadora.

Interacciones exploradas:
- Sonido «snap/click» al equipar una pieza.
- Destello o VFX al seleccionar.
- Animación de pieza que vuela del catálogo al personaje y encaja con rebote.
- Reacciones del personaje al recibir un sombrero o cambiar de expresión.
- Pedestal giratorio.
- Paneo o vista de espalda para revisar accesorios.
- Botón aleatorio tipo dado o slot machine que mezcla piezas.
- Opciones de aceptar, reintentar o conservar.
- Fondo tipo taller con cajones, cintas y piezas; movimiento ambiental discreto.

Los efectos de sonido y VFX deben poder silenciarse o reducirse, no bloquear el flujo y respetar el rendimiento móvil.

---

# 11. Lobby social — propuestas

- Personajes dispuestos en semicírculo o diorama, todos visibles.
- Al entrar, el personaje puede caer desde arriba o entrar caminando.
- Interacciones cosméticas: high-five, saludo, baile y empujón cómico sin alterar el estado de juego.
- En modalidad de parejas, las duplas pueden aparecer juntas con una animación compartida.
- Estado listo: pose afirmativa y aura verde.
- Acompañar siempre el color con texto o icono para accesibilidad.
- Estados distinguibles: listo, no listo, desconectado y ausente.

---

# 12. Progresión y economía de XP

## 12.1 Tres registros de XP — DECISIÓN (ajustada en v1.3)

El sistema debe distinguir tres conceptos que cumplen funciones diferentes:

### A. XP acumulada
- Representa el progreso histórico del jugador.
- Determina el nivel.
- Nunca disminuye.
- Se conserva entre sesiones y eventos.
- Las pérdidas de puntos de una partida no reducen esta cifra.

### B. XP disponible
- Es el saldo que el jugador puede gastar en la tienda.
- Aumenta al ganar recompensas.
- Disminuye al comprar artículos.
- Nunca es negativo. La XP no se descuenta como castigo; solo baja por compras (v1.3).
- La XP ganada en sesiones anteriores solo sirve para comprar sobres de accesorios y accesorios especiales. No compra cartas para la partida.

### C. XP de sesión
- Es la XP obtenida durante una sesión concreta.
- Determina el lugar, el podio o TOP de esa sesión.
- Es la única XP que compra cartas que sirven dentro de esa misma sesión (v1.3).
- No se utiliza la XP acumulada histórica para ordenar el podio de una sesión.
- Al terminar la sesión, el resultado se consolida conforme a las reglas de persistencia que se definan.

**Ejemplo conceptual:**
Un jugador tiene 1,000 XP acumulada y 100 XP disponible. En una sesión gana 30 y gasta 0:
- XP acumulada: 1,030.
- XP disponible: 130. De esos, 30 son de la sesión y pueden comprar cartas mientras dure; los otros 100 solo compran sobres y accesorios.
- XP de sesión: 30.
El jugador se posiciona en el podio de esa sesión según esos 30, no por sus 1,000 XP históricas.

**PENDIENTE:** formalizar cómo se refleja cada recompensa en XP acumulada y XP disponible para que no exista doble contabilización accidental. Las reglas invariables son: XP acumulada no disminuye, XP disponible no queda negativa y el podio usa la XP de la sesión.

**DECISIÓN (v1.3) — primera prueba:** la primera prueba será una sola sesión completa y en ella toda la XP sirve para todo. La separación entre XP de sesión y XP de sesiones anteriores no se aplica en esa prueba; el usuario decidirá después cómo funciona en sesiones posteriores.

**PENDIENTE:** confirmar si el alcance de esta regla es la sesión o el evento completo. La app actual lo maneja por evento («XP del evento»), y un evento puede tener varias sesiones (capítulo 4).

**PENDIENTE:** definir si gastar XP de sesión en cartas baja el lugar en el podio o si el podio cuenta lo ganado sin restar lo gastado.

## 12.2 Nivel

- El nivel se calcula a partir de XP acumulada.
- Gastar XP disponible no hace bajar el nivel.
- Los niveles desbloquean cosméticos y contenido, no ventajas competitivas.

## 12.3 Fuentes de XP propuestas

- Participación.
- Victorias.
- Resultados en parejas o equipos.
- Retos completados.
- Misiones.
- Logros.
- Bonificaciones especiales.

Las fórmulas, límites, recompensas y penalizaciones están pendientes.

## 12.3.1 XP extra otorgada por el administrador — DECISIÓN (v1.3)

El administrador del lobby o de la sesión puede dar XP directamente a un participante, como plus por una actividad adicional fuera del juego.

**PENDIENTE:** definir si ese plus cuenta para el podio de la sesión, si lleva motivo visible para todos, y su tope por persona y por sesión. Debe quedar registrado quién lo dio y cuánto (capítulo 22: auditoría), y solo el servidor puede acreditarlo.

## 12.4 Penalizaciones

**DECISIÓN (v1.3, sustituye a la de v1.2):** la XP no se descuenta y el saldo disponible nunca queda negativo. Los castigos no restan XP. El castigo preferido es ganar la mitad de la XP en el siguiente juego. Se descarta dejar a alguien sin jugar o sin ganar nada, para que nadie pierda las ganas de seguir.

**PENDIENTE:** afinar el detalle (qué lo provoca, si dura un juego o más, si se acumula) y cómo se trata una desconexión.

---

# 13. Tienda, sobres, colección y cartas

**DECISIÓN (v1.12, Elías):** la tienda 2D se retira (vendía accesorios que ya no se ven en la figura 3D). Hay dos tipos de sobre:
- **Sobres cosméticos:** piezas 3D para la figura.
- **Sobres de contenido:** desbloquean cartas de preguntas, retos y castigos (ejemplos de nombre: «Verdades Incómodas», «Retos Extremos», «Duelos Rápidos»). Lo desbloqueado sirve para toda la sala donde juega su dueño.

Ningún sobre da ventaja dentro de una partida. Las rarezas (común, épica, legendaria) son solo de colección. La apertura animada actual (pista de rareza, temblor, «Abrir todas») se conserva.

**PENDIENTE:** precios, contenido de cada sobre, duplicados, si los sobres de contenido llevan etiqueta de intensidad, adulto y familiar, y qué pasa con el contenido base (que siempre debe alcanzar para jugar sin comprar nada).

## 13.1 Tienda e inventario

**DECISIÓN (v1.33, Elías, 16 de noviembre) — monedas y gemas:** vuelve la opción de **monedas** como moneda de la tienda. Las **gemas son la XP** que ya existe: lo que se muestra en la barra superior con el ícono de gema. **DECISIÓN (v1.34, Elías, 16 de noviembre):** la decisión entre monedas y XP, y los precios, se toma **después de la prueba con jugadores**. Hasta entonces la tienda cobra en XP (13.2).

**DECISIÓN (v1.27, Elías, 15 de noviembre) — tienda inicial:** al principio la tienda tiene solo **sobres de accesorios** del personaje y **sobres de comodines**, cada uno en versión **básica** o **especial**, más una sección de **outfits y comodines básicos fijos** que se compran directo (por ejemplo «Saltar reto»). Los sobres de contenido (mazos) quedan para después. Los costos en XP no son oficiales; para empezar se usan valores de referencia: sobre de accesorios básico 60 XP (2 piezas) y especial 150 (3, una rara o mejor); sobre de comodines básico 50 (2 básicos) y especial 120 (3, uno especial); comodín básico suelto 40; outfit armado 100. Se fijan en el paso 12 de la Fase 6. Resuelve en parte el pendiente de la «Tienda de comodines» de 23.2 (sí se venden fuera de partida; falta decidir con qué XP).

La tienda permite adquirir elementos con XP disponible, conforme a precios y reglas aún pendientes. El inventario conserva los artículos obtenidos y permite equiparlos.

## 13.2 Sobres

**PROPUESTA del usuario (v1.3):** sobres por nivel, **oro, plata y bronce**, con la lógica de los sobres de los videojuegos de futbol. Pueden traer accesorios especiales o comodines extra, mixtos o por separado. Además, compra directa de accesorios concretos, como playeras especiales. Se toma solo la mecánica de niveles; no se copian nombres, arte ni interfaz de ningún juego.

**DECISIÓN (v1.3):** los sobres mixtos (los que traen comodines) no se compran con XP de sesiones anteriores. En la primera prueba esto no aplica, porque toda la XP sirve para todo (12.1).

Propuesta de sobres de 1 a 5 cartas, con categorías:
- Vestuario.
- Rostros.
- Accesorios.
- Cartas funcionales.
- Fondos.
- Especiales.
- Colecciones.

Experiencia de apertura explorada:
1. Presentación del sobre.
2. Movimiento o animación.
3. Brillo.
4. Rasgado.
5. Revelación de cartas una por una.
6. Presentación de rareza.
7. Opción de equipar o guardar.

**IMPLEMENTADO (v1.7), PROVISIONAL:** tienda de sobres en la pestaña Tienda, separada de la personalización. Tres sobres (bronce 60 XP desde nivel 1, plata 120 desde nivel 3, oro 240 desde nivel 6) que dan 2, 3 y 4 cartas de accesorios que todavía no se tienen. Se abren una carta a la vez. Pagan con XP disponible. Los precios, los pesos de rareza y la rareza por precio son valores de prueba y quedan **PENDIENTE** de aprobación de Elías. Un sobre sin cartas nuevas no cobra.

## 13.3 Rarezas

Se exploraron:
- Común.
- Poco común.
- Rara.
- Épica.
- Legendaria.
- Posible mítica.

Una distribución ilustrativa previamente explorada fue:
- Común: 55%.
- Rara: 27%.
- Épica: 13%.
- Legendaria: 4.5%.
- Mítica: 0.5%.

No es una tabla definitiva. La categoría poco común, probabilidades finales, duplicados y compensaciones están pendientes. No se ha aprobado un sistema pity ni monetización tipo gacha.

## 13.4 Cartas funcionales

Podrían modificar temporalmente reglas de una partida: pasar/saltar reto, repetir tirada, segunda oportunidad o comodín.

Deben equilibrarse para que no sean pay-to-win. Los cosméticos no dan ventajas. La disponibilidad, límites, compatibilidad y balance de cartas funcionales siguen pendientes.

**DECISIÓN (v1.25, Elías, 15 de noviembre) — D2, comodines como acciones del motor:** los comodines (las cartas de poder de `catalogo.ts`: escudo, salvavidas, relevo, doble castigo, cambio de pregunta, pasa turno, cambio de mesero) son **acciones del motor**, **consumibles** (se gastan al usarse) y tienen una **matriz de compatibilidad por juego** que dice cuáles se pueden usar en cada juego. Se agregan a las acciones nuevas del motor de 22.1, junto a `dar-carta`; usarlos lo valida la Pantalla con el motor y la TV solo ve cuántos tiene cada quien y el que se usó (21.4).
**DECISIÓN (v1.26, Elías, 15 de noviembre) — D2, matriz:** los comodines sirven en **todos los juegos**. Cada comodín se usa **una sola vez** y se gasta (desechable). La matriz de compatibilidad queda en «todos con todos»; si un juego llega a necesitar una excepción, se anota aquí.

---

# 14. Logros, resultados, podio y rankings

## 14.1 Cierre de partida/sesión

Se ha explorado una ceremonia de resultados con:
- Podio.
- Primer, segundo y tercer lugar.
- Trofeos, coronas o medallas.
- XP obtenida.
- Logros desbloqueados.

El podio de una sesión se ordena por XP neta obtenida en esa sesión, no por XP acumulada histórica.

## 14.2 Logros explorados

- GOAT.
- MVP.
- El más fachero.
- El castigado.
- El sobreviviente.
- El sospechoso.
- La dupla perfecta.
- El afortunado.
- Alma de la fiesta.

Los logros deben dividirse entre logros del evento/sesión y logros históricos. Evitar premiar shots o consumo excesivo.

**DECISIÓN (v1.6):** primera versión de logros en Perfil. De sesión: GOAT de la competencia y La dupla perfecta. Históricos: MVP (mejor puntaje en una partida) y El sobreviviente (10 partidas). Los demás (más fachero, castigado, sospechoso, afortunado, alma de la fiesta) necesitan datos que todavía no se guardan (votos, rol del impostor, castigos) y quedan pendientes.

## 14.3 Rankings

Propuestas:
- Individual.
- Parejas.
- Eventos.
- Logros.
- Semanal.
- Mensual.
- Histórico.

XP acumulada y victorias deben ser rankings separados. No confundir clasificación histórica con podio de sesión.

**DECISIÓN (v1.5):** existe la pestaña Ranking con Sesión (ordena podio y TOP), Histórico (XP acumulada), Parejas e Historial de partidas. Equipos se agrega cuando exista el modo por equipos; Logros, semanal y mensual siguen como propuesta.

---

# 15. Celebraciones y podio — propuestas

- Victoria de minijuego: continuidad de la acción, breve cámara lenta, salto o pose, confeti o fuegos artificiales.
- Derrota cómica: brazos que caen o piezas que se desmontan, sin humillar.
- Podio modular de piezas originales: ganador al centro, segundo y tercero a los lados.
- Corona dorada o capa temporal para el campeón; no se agrega automáticamente al inventario.
- Segundo y tercero pueden aplaudir o mostrar celos sutiles.
- Último lugar: se exploró un contenedor de basura o desmontaje, pero está pendiente de validación de tono y puede sustituirse por una animación neutral.
- Foto final: congelar composición, permitir captura/guardado y marco de piezas. Privacidad, permisos y descarga pendientes.

---

# 16. Catálogo de minijuegos seleccionado

**DECISIÓN:** conservar únicamente los minijuegos de esta sección, además de los juegos clásicos que ALV ya tenía definidos. Las propuestas adicionales de lluvias de ideas anteriores quedan descartadas y no deben reincorporarse sin petición expresa.

**DECISIÓN (v1.4):** por ahora el catálogo es este, pero queda abierto: se pueden agregar más juegos cuando el usuario lo pida. El motor y el contenido deben permitir sumar un juego sin rehacer lo existente.

## 16.1 😂 Humor

### No te rías
Un participante lee un chiste absurdo mientras los demás intentan no reírse. Quien se ríe pierde la ronda o recibe la penalización definida.

Contenido posible:
- Chistes absurdos.
- Preguntas sin sentido.
- Situaciones ridículas.
- Acertijos malos.
- Frases con lógica inesperada.
- Historias cortas con remates inesperados.

**Seguridad:** no exigir que los participantes tengan agua en la boca. La mecánica de hacer reír mientras alguien retiene agua puede provocar atragantamiento o aspiración. Se conserva el reto de aguantar la risa, pero el agua es opcional y no debe ser requisito.

## 16.2 🕵️ Deducción y social

### El impostor
Todos reciben una palabra o concepto, excepto uno. El impostor desconoce la palabra y debe disimular. El grupo conversa o responde por turnos para descubrirlo.

### Quién lo haría
**DECISIÓN (v1.4):** es el mismo juego que el clásico «¿Quién es más probable?» (16.8). Queda como un solo juego.

Se presenta una situación y todos votan qué participante sería más probable que la hiciera. Se revela el resultado y se asignan puntos conforme a las reglas.

### Dos verdades y una mentira
Un jugador comparte tres afirmaciones: dos verdaderas y una falsa. Los demás intentan identificar la mentira.

### Respuesta infiltrada
Todos reciben una pregunta, excepto el infiltrado, que recibe una pregunta diferente. Cada participante responde; después, el grupo debe detectar quién recibió la pregunta distinta.

Ejemplo deliberadamente absurdo:
- Pregunta para la mayoría: «¿Te gusta comer popó?».
- Pregunta para el infiltrado: «¿Te gusta la pizza?».
- Respuestas posibles: «Sí, me encanta», «No me gusta», «No, qué asco».

La gracia está en que las respuestas puedan sonar compatibles y el grupo tenga que inferir quién recibió otra pregunta. El motor debe poder administrar preguntas distintas, respuestas privadas, revelación y votación.

## 16.3 🎨 Creatividad

### Dibujar
Minijuego estilo Pictionary. Un jugador recibe una palabra o concepto y debe dibujarlo para que su pareja o equipo lo adivine.

Modalidades propuestas:
- Parejas contra parejas.
- Equipos contra equipos.
- Todos contra todos por turnos, si la configuración lo permite.

El teléfono del dibujante funciona como pizarrón; la pantalla compartida muestra el dibujo. El equipo o pareja intenta adivinar dentro del tiempo establecido.

## 16.4 👀 Memoria y observación

### Memoria fotográfica
Se muestra una imagen durante unos segundos. Después desaparece y aparece una pregunta sencilla sobre un detalle visual.

Tipos de imágenes:
- Paisajes.
- Celebridades.
- Animales.
- Habitaciones y escenarios.
- Objetos.
- Personas o modelos.

Ejemplos:
- ¿De qué color era el pájaro?
- ¿Cuántas ventanas tenía la casa?
- ¿Qué llevaba puesto el modelo?
- ¿De qué color eran sus zapatos?
- ¿Qué objeto estaba sobre la mesa?

Las preguntas sobre personas/modelos deben centrarse en prendas, accesorios, colores y detalles de la imagen, no en evaluar cuerpos o atractivo físico. El juego debe ser rápido y accesible.

## 16.5 🎬 Cultura pop

### Emoji secreto
Se muestran combinaciones de emojis y los jugadores deben identificar la película, canción, personaje o tema que representan.

Ejemplo:
⚡ 👓 🧣 = Harry Potter.

Se pueden manejar categorías y niveles de dificultad. Las respuestas se envían desde el teléfono o se dicen en voz alta según el modo.

## 16.6 🎤 Música

### Karaoke relámpago
Se reproduce un fragmento de una canción. Los participantes pueden obtener puntos por identificarla y/o cantarla. No es obligatorio completar todas las acciones para puntuar.

Acciones puntuables:
- Cantar correctamente un fragmento.
- Identificar el artista.
- Identificar el título de la canción.

Un jugador puede puntuar únicamente por cantar, únicamente por decir el artista o únicamente por decir el título, siempre que acierte la acción correspondiente.

Los valores de puntos son **PENDIENTES**. En una propuesta ilustrativa se exploraron 5 puntos por cantar, 3 por artista y 3 por título; no es una regla aprobada.

**PENDIENTE legal/técnico:** reproducción de música comercial requiere considerar licencias y derechos de autor. No asumir que Spotify, YouTube u otros servicios permiten integrar reproducción en ALV. Para prototipos se pueden usar pistas propias o autorizadas.

## 16.7 ❤️ Social y opinión

### ¿Qué prefieres?
Se presentan dos opciones y todos votan. Quienes coinciden con la mayoría ganan puntos; quienes quedan en minoría no obtienen esa recompensa, o reciben la penalización que se defina.

Niveles:
- Normal: dilemas cotidianos, preferencias y decisiones.
- Extremo: opciones exageradas, absurdas o desagradables, sin exigir acciones peligrosas.

Ejemplos:
- ¿Preferirías viajar al pasado o al futuro?
- ¿Preferirías no usar redes sociales o no ver televisión?
- ¿Preferirías comer algo asqueroso todos los días o no poder bañarte nunca?
- ¿Preferirías que todos pudieran leer tus pensamientos o que todos vieran tu historial de búsqueda?

La votación debe revelarse simultáneamente para evitar que los últimos participantes copien respuestas ya visibles.

## 16.8 🎲 Juegos clásicos

Conservar los juegos clásicos que ya estaban definidos en ALV. Su listado y reglas deben mantenerse desde las decisiones previas del proyecto; no sustituirlos por propuestas nuevas ni asumir que los minijuegos de esta sección los reemplazan.

**DECISIÓN (v1.4) — catálogo clásico**, tomado del catálogo de la app (`src/content/catalogo.ts`) y confirmado por el usuario:

1. Ronda de bienvenida
2. Verdad o reto
3. ¿Cuánto conoces a tu pareja?
4. Mímica
5. Palabra prohibida
6. El impostor (el mismo de 16.2)
7. Reto del lugar
8. Lista relámpago
9. El reloj
10. Yo nunca
11. ¿Quién es más probable? (el mismo que «Quién lo haría», 16.2)
12. ¿Qué prefieres? (el mismo de 16.7)
13. Ruleta de castigos
14. Dados HOT (solo parejas, contenido adulto)

**DECISIÓN (v1.12, Elías) — variantes:** en el catálogo, «Ronda de bienvenida» se presenta como variante de «Lista relámpago» y «Palabra prohibida» como variante de «Mímica», porque usan el mismo motor y el mismo mazo. «Ruleta de castigos» pasa a ser una herramienta (cobrar castigos y desempatar), no un juego del catálogo. En el motor no se borra nada.

**DECISIÓN (v1.12, Elías) — juegos nuevos:** se agregan **Trivia ALV** (juego nuevo, de preguntas de conocimiento) y **Dibuja y Adivina** (es el «Dibujar» de 16.3; necesita el pizarrón). **PENDIENTE:** reglas, puntuación y mazo de Trivia ALV.

Con los de esta sección, el catálogo completo tiene 21 juegos: los 14 clásicos y 7 nuevos (No te rías, Dos verdades y una mentira, Respuesta infiltrada, Dibujar, Memoria fotográfica, Emoji secreto y Karaoke relámpago).

---

# 17. Clasificación transversal por forma de participación

La categoría temática y la forma de participación son dos dimensiones diferentes. Un juego puede pertenecer a una categoría y combinar más de una forma de participación.

## 17.1 Tipos de participación

### A. Respuesta privada
Cada jugador responde desde su propio teléfono. La respuesta no se muestra a los demás hasta la revelación.

### B. Votación
Los jugadores seleccionan una opción. Los votos se recopilan en privado y se revelan simultáneamente o en el momento indicado.

### C. Por turnos
Un jugador realiza la acción mientras los demás observan, esperan o participan como jueces/adivinadores.

### D. Simultánea
Todos los participantes responden o actúan durante la misma ventana de tiempo.

### E. Física / en vivo
La dinámica requiere hablar, cantar, dibujar, actuar o realizar una acción presencial. La interfaz coordina y registra la experiencia, pero no sustituye la interacción física.

## 17.2 Matriz inicial de participación

| Minijuego | Privada | Votación | Por turnos | Simultánea | Física / en vivo |
|---|---|---|---|---|---|
| No te rías | No necesariamente | Opcional para validar quién se rio | Sí, lector rota | Los demás intentan aguantar | Sí, lectura y reacción |
| El impostor | Sí, para recibir palabra/rol | Sí, para acusar | Puede incluir turnos de pistas | Puede incluir respuestas simultáneas | Sí, conversación presencial |
| Quién lo haría | Puede ser voto privado | Sí | No necesariamente | Sí, votación conjunta | Conversación/revelación |
| Dos verdades y una mentira | Puede haber voto privado | Sí, para elegir mentira | Sí, un jugador presenta | Los demás pueden votar simultáneamente | Sí, narración |
| Respuesta infiltrada | Sí, asignación de preguntas y respuestas | Sí, para señalar infiltrado | Puede haber discusión por turnos | Sí, respuestas simultáneas | Discusión opcional |
| Dibujar | Sí, palabra/instrucción para dibujante | No necesariamente | Sí, dibujante rota | Adivinación del equipo dentro del tiempo | Sí, dibujo y comunicación |
| Memoria fotográfica | Sí, para responder | Puede configurarse como selección | No necesariamente | Sí, todos responden a la misma pregunta | No es indispensable |
| Emoji secreto | Sí, para enviar respuesta | Puede haber selección múltiple | Puede usarse buzzer/turno | Sí, respuesta simultánea o carrera | Respuesta oral opcional |
| Karaoke relámpago | No necesariamente | Puede haber selección de quién responde | Sí, turno o derecho de respuesta | Puede habilitarse buzzer simultáneo | Sí, escuchar/cantar |
| ¿Qué prefieres? | Sí, elección privada | Sí | No | Sí, todos votan en ventana común | Debate/revelación opcional |

Esta matriz es inicial; cada minijuego puede combinar varias formas. La configuración final debe especificar qué ocurre en cada fase de la ronda.

## 17.3 Configuración por fases

Cada minijuego deberá describir, cuando aplique:
1. Asignación de roles, palabras, imágenes o consignas.
2. Preparación.
3. Participación (privada, por turnos, simultánea o física).
4. Cierre de respuestas.
5. Revelación.
6. Validación o votación.
7. Cálculo de puntos.
8. Actualización de XP de sesión y saldos.
9. Transición a la siguiente ronda.

---

# 18. Sistema de puntuación de minijuegos

**DECISIÓN (ajustada en v1.3):** todos los minijuegos deben poder producir ganancias de puntos. Ninguno descuenta XP (ver 12.4). No todos tienen que usar la misma fórmula.

**PENDIENTE:** confirmar si dentro de una partida se pueden perder puntos de ronda, que no son XP, o si tampoco.

Principios:
- La puntuación debe estar ligada a acciones verificables por las reglas del minijuego.
- Debe distinguirse puntuación de ronda, XP de sesión y registros persistentes.
- Las reglas deben explicarse antes de iniciar la ronda.
- Evitar penalizaciones sorpresa.
- Definir límites y tratamiento de empates.
- La puntuación del podio se basa en la XP obtenida en la sesión.
- La XP acumulada histórica no se usa para determinar el podio de esa sesión.

**PENDIENTE:** establecer una plantilla de puntuación para cada minijuego: acción, condición de éxito, puntos ganados, penalización, desempate, límite y tratamiento de abandono/desconexión.

---

# 19. Pantalla de carga e identidad de apertura — propuesta

Se exploró una pantalla de inicio sobria, distinta de la interfaz colorida de juego.

Ideas:
- Fondo gris muy oscuro, no negro puro: referencias `#121212` o `#1A1A1A`.
- Logo plateado o blanco.
- Un acento vibrante (rojo, cian, naranja o magenta) sin fijar aún el color oficial.
- Partículas de confeti o luces de baja opacidad.
- Siluetas sutiles de personajes originales o piezas modulares en el fondo.
- Barrido de luz sobre el logo.
- Barra de carga formada por bloques que se encajan.
- Personaje pequeño esperando; al terminar, celebra.
- Tips rotativos en la parte inferior.
- Duración objetivo exploratoria de 3–5 segundos, sin prometer un tiempo fijo si la carga real tarda más.

Textos de tips explorados:
- «Consejo: Puedes cambiar tu emote en el armario antes de empezar».
- «¿Sabías que? Si dibujas una cara personalizada, tu pareja puede usarla en el modo dúo».
- «Preparando la fiesta...».
- «Cargando texturas...».

El texto «Cargando texturas... 40%» solo debe mostrar un porcentaje real si corresponde al progreso de carga.

## 19.1 Protección de propiedad intelectual

Los personajes, piezas y elementos visuales deben ser originales. No utilizar nombres, logotipos ni diseños de terceros como si fueran propios. La mención de una marca registrada y la redacción de un aviso legal requieren revisión jurídica; un descargo de responsabilidad no sustituye la autorización ni elimina por sí solo el riesgo de infracción.

La frase de referencia que se había propuesto sobre LEGO y The LEGO Group no debe tratarse como texto legal aprobado ni como garantía de protección. Evitar usar «estilo LEGO» en marca, título o comunicación comercial. Utilizar descripciones genéricas como «figuras armables originales» o «juguetes de construcción modulares».

**DECISIÓN (v1.4):** la carpeta y los archivos de las piezas del personaje llevan nombres genéricos (`public/piezas/`, `cabello-01`…), sin números ni nombres de marca.

**PENDIENTE:** las imágenes de las piezas siguen siendo las del armador anterior. Antes de cobrar por la app o difundirla fuera del grupo hay que redibujarlas como piezas originales (fase 2, Personajes).

**PENDIENTE (v1.11):** el modelo 3D nuevo usa geometría LDraw (figuras de LEGO) y colecciones de personajes de terceros (Marvel, Harry Potter). El repo y la app son públicos. Lo de arriba sigue aplicando: antes de cobrar o difundir fuera del grupo hace falta revisión jurídica o cambiar a personajes y piezas propias.

---

# 20. Reglas de animación, audio y accesibilidad

Propuestas técnicas y de experiencia:
- Rig/esqueleto común para reutilizar animaciones entre apariencias; técnica por decidir.
- CSS/SVG para prototipos, sprites, rig 2D o 3D como alternativas por evaluar.
- Transiciones lobby → minijuego → podio de aproximadamente 3 segundos como referencia, no regla universal.
- Permitir omitir o acelerar animaciones.
- Foley: piezas encajando, chocando, deslizándose y cayendo.
- Sonidos de entrada, emotes, victoria y podio.
- Controles independientes para música y efectos.
- Volumen moderado.
- La información nunca debe depender exclusivamente del sonido.
- Respetar `prefers-reduced-motion` y controles de movimiento reducido.
- Optimizar para móviles y conexiones variables.

---

# 21. Inicio y flujo general

Flujo tentativo:
1. Loading con logo, personajes animados, consejos y progreso.
2. Login o registro.
3. Creación/edición de personaje.
4. HUB.
5. Crear lobby (solo administrador) o unirse a lobby existente.
6. Configurar modalidad, herramientas, minijuegos, escenarios y rondas.
7. Lobby de participantes.
8. Partidas y rondas.
9. Resultados, podio, logros y XP.
10. Regresar al menú o iniciar otra partida.

## 21.1 HUB

Elementos propuestos:
- Personaje protagonista.
- Nivel y XP.
- Acción principal para jugar.
- Acceso a lobby.
- Tienda.
- Colección/inventario.
- Rankings.
- Logros.
- Perfil.

Navegación explorada: Inicio, Juegos, Lobby, Tienda y Perfil.

**DECISIÓN (v1.12, Elías):** la navegación de ALV 2.0 sale del hub (pantalla principal con el personaje, nivel, XP y ajustes) con cinco botones: **Jugar, Personalizar, Tienda, Ranking y Logros**, como en su lámina de referencia. Perfil se abre desde el retrato y el nivel de arriba. La Tienda reúne los sobres (13) y la colección. Sustituye la de v1.5.

**DECISIÓN (v1.5, sustituida en v1.12):** la navegación queda Inicio, Lobby, Tienda, Ranking y Perfil. «Juegos» y «Grupo» viven dentro del Lobby y el historial dentro de Ranking.

## 21.2 Flujo de juego tipo «Clubes Pro / The Grounds» — DECISIÓN (v1.5)

Inspirado en el flujo de los juegos deportivos en línea (crear lobby, se unen compañeros, se configura, se inicia):
1. Jugar abre el Lobby. Ahí están los personajes de todos los conectados, juntos en un escenario.
2. Mientras se elige el juego, el escenario y las condiciones, o mientras carga, los personajes se pueden animar: saludar, bailar, chocar la mano, empujar a un compañero y marcarse como listos.
3. El administrador configura tipo de juego, escenario y condiciones (intensidad, parejas, adulto, Drunk) y da Iniciar.
4. Pantalla de carga con la sigla del juego, el escenario, los personajes listos y un consejo.
5. Durante la partida, cada celular muestra la herramienta que toca (votar, escribir, dibujar, elegir, girar dado, tomar carta) y la pantalla principal muestra el escenario, de quién es el turno y los personajes.
6. Uso previsto: la partida se abre en una laptop que se proyecta (vista ancha y pantalla completa) y cada jugador entra desde su celular con su usuario para personalizar, comprar, ver el ranking e interactuar con la dinámica.

Estado: los pasos 1 a 4 y la vista ancha ya funcionan en un solo dispositivo. El paso 5 y la entrada con usuario desde el celular dependen del modo multi-dispositivo con cuentas (pendiente de construir).

**DECISIÓN (v1.5):** la Tienda de sobres es una pestaña propia, separada de la personalización del personaje.

**DECISIÓN (v1.5):** cada personaje muestra arriba su lugar en la sesión (#1, #2…) en el Lobby, cuando ya alguien suma XP de sesión.

---

## 21.3 Arquitectura de ALV 2.0 — DECISIÓN (v1.14)

**DECISIÓN (v1.14, Elías aprobó la Fase 1 completa, 15 de noviembre).** Referencia con diagramas: página «ALV 2.0 Fase 1» (https://claude.ai/artifact/X6o8LBveVn6WyKDZwwrmKK).

Mapa: todo sale del hub. Jugar (Unirme a una sala, Proyectar en pantalla, Jugar en este celular, Catálogo y ficha del juego), Personalizar (3 cápsulas, editor rápido, editor completo), Tienda (sobres cosméticos, sobres de contenido, mi colección), Ranking (sesión, histórico, parejas, equipos, historial) y Logros. Perfil desde el retrato; Ajustes y Administración desde el engrane. «Lobby» deja de ser sección propia (la sala vive en Jugar) y «Juego físico» deja de ser modo: pasa a herramienta del anfitrión («Reto en vivo» con +XP).

Roles:
- **Pantalla** (laptop o TV): corre la partida con el motor actual, muestra lo público, no juega ni muestra secretos. Tiene controles de respaldo.
- **Anfitrión**: un celular que juega como todos y además controla (elegir juego, iniciar, pausar, saltar, ruleta de castigos, XP por reto en vivo).
- **Jugador**: su celular, una herramienta a la vez, su secreto con «mantener presionado».

Decisiones de la Fase 1:
1. El anfitrión usa **la misma cuenta** en la Pantalla y en su celular.
2. **Cualquier cuenta mayor de edad** puede proyectar. La Administración sigue siendo solo de los administradores.
3. Jugar **sin pantalla** (solo celulares) queda como segunda opción: el celular del anfitrión hace de Pantalla, con la pantalla siempre encendida.
4. El **escenario y el ambiente se eligen una vez** al abrir la sala (se pueden cambiar). En cada partida solo se eligen juego, modalidad y rondas. La mecánica viene con el juego.
5. **Un solo celular:** cada jugador se agrega escribiendo su apodo y contraseña; se valida, se suma a la partida y no queda su sesión abierta. Escanear un QR con su propio teléfono queda como opción.
6. **Recuperar contraseña:** código de recuperación que se muestra una sola vez al registrarse; el restablecimiento por un administrador queda de respaldo.

Además:
- El QR deja a la persona **dentro de la sala**; si no tiene sesión, entra o se registra y vuelve a la sala sin pasar por el hub.
- El servidor **avisa al instante** (tiempo real de Supabase) en lugar de que cada aparato pregunte cada 1.5 s; la consulta periódica queda de respaldo.
- Catálogo por intención: Para empezar, Para reír, Para soltar secretos, ¿Quién miente?, A competir, En pareja y una fila de Herramientas. Se filtra solo por jugadores, escenario y ambiente; lo que no se puede jugar sale con candado y la razón. Las siglas (PTM, HDSPM…) quedan como sello de cada juego.
- Usuario que regresa: entra directo al hub; «Volver a la sala» si tiene una abierta; novedades como burbujas, no como ventana al entrar.

## 21.4 La partida en tres aparatos — DECISIÓN (v1.22)

**DECISIÓN (v1.22, Elías aprobó la Fase 4 completa, 15 de noviembre).** Referencia con simulador (El impostor, ¿Quién es más probable? y Verdad o reto en 12 momentos, con TV, computadora y sin pantalla): página «ALV Fase 4 Multipantalla» (https://claude.ai/artifact/UL3rgCv2HCXXnGYu7xtBdZ, fuente `alv2ase4\` fuera del repo).

Reglas:
- El papel es del aparato, no de la cuenta. La Pantalla se anuncia como pantalla; el celular del anfitrión es un jugador más con su `vistaJugador` y la barra de control (Pausar, Saltar, Ruleta, XP reto y el botón del momento: Revelar ya, Siguiente ronda).
- **REEMPLAZADA (v1.38, Elías, 16 de noviembre).** Texto anterior, que queda como historial: ~~La Pantalla es la única que cambia la partida: aplica las acciones con el motor (`aplicar`) y publica `vistaPublica` y, por jugador, `mio`, `miRespuesta` y `miMano` de `vistaJugador`, cada envío con su `version`. Un aparato ignora avisos con versión menor a la que tiene.~~ **DECISIÓN (v1.38):** el servidor (Edge Function `partida`, 22.1 decisión 1) es el único que cambia la partida: aplica las acciones con el motor y entrega `vistaPublica` a todos y a cada jugador solo su parte de `vistaJugador`, cada envío con su `version`. Un aparato ignora avisos con versión menor a la que tiene. La Pantalla se vincula con un código temporal, de un solo uso, con vencimiento y con confirmación expresa del anfitrión en su celular; abrir el enlace no basta. Mientras no se retire el motor actual (22.1 decisión 1), sigue funcionando como dice el texto anterior.
- Lo que dibuja la Pantalla recibe solo `vistaPublica`. Nunca llegan a la TV palabras, papeles, votos antes de la revelación, cartas de poder (solo cuántas y la usada), la semilla, edad, género ni contraseñas.
- El servidor avisa al instante (tiempo real); si no responde en 5 s, el aparato consulta cada 3 s y lo marca «Reconectando».
- Cada celular muestra su propia acción al momento («Votaste») y luego «La TV ya lo recibió».
- **REEMPLAZADA (v1.38, Elías, 16 de noviembre).** Texto anterior, que queda como historial: ~~Todas las acciones, también las del anfitrión, se guardan en `acciones`. Si la Pantalla se recarga, repite semilla y acciones con el motor y queda igual. Si no vuelve en 30 s, el anfitrión puede pasar la partida a su celular.~~ **DECISIÓN (v1.38):** todas las acciones, también las del anfitrión, pasan por el servidor y se guardan en `acciones`; la semilla no sale del servidor. Si la Pantalla se recarga, vuelve a pedir la vista pública y queda igual. La ronda se revela cuando todos contestan o cuando termina el reloj, lo que ocurra primero; si falta un jugador, se aplica P-03 (decisión 3 de abajo). Mientras no se retire el motor actual, sigue funcionando como dice el texto anterior.
- Quien recarga o pierde la señal vuelve solo al mismo momento de la partida. El QR y el código quedan en una esquina de la TV toda la partida; quien llega tarde ve «Juegas en la siguiente».
- **REEMPLAZADA (v1.38, Elías, 16 de noviembre).** Texto anterior, que queda como historial: ~~Sin pantalla: el celular del anfitrión corre el motor, se queda encendido en la mesa y muestra arriba lo público; su secreto sigue tras el escáner.~~ **DECISIÓN (v1.38):** sin pantalla, el motor también corre en el servidor; el celular del anfitrión se queda encendido en la mesa y muestra arriba lo público (`vistaPublica`); su secreto sigue tras el escáner. Mientras no se retire el motor actual, sigue funcionando como dice el texto anterior.
- Acciones nuevas a definir en la Fase 5: `pausar`, `reanudar`, `saltar`, `ruleta`, `xp-reto`, `pasar-control` y `pista`, más avisos de paso que no cambian la partida («ya la vi», «pedir pausa»).

Decisiones, todas las recomendadas:
1. La revelación sale sola cuando todos contestaron o se acabó el tiempo, con 2 s de suspenso; el anfitrión puede adelantarla con «Revelar ya». Pasar a la siguiente ronda lo toca el anfitrión.
2. Solo el anfitrión pausa (y la Pantalla como respaldo); los demás tienen «Pedir pausa».
3. A quien se desconecta se le espera 20 s sin detener a los demás; luego el anfitrión elige esperar o seguir sin él, sin castigo.
   **DECISIÓN (v1.38, Elías aprobó, 16 de noviembre) — P-03, jugador que no responde:** a los 20 s sin respuesta, el anfitrión elige «Esperar al jugador» o «Seguir sin él». Si sigue, la ronda se revela con las respuestas disponibles y el ausente no puntúa esa ronda. No se le expulsa: puede reincorporarse en las rondas siguientes. Esta regla no cambia la XP ni requiere migración.
4. En la revelación de El impostor y ¿Quién es más probable? la TV muestra quién votó a quién.
5. En El impostor, quien habla escribe su pista en el celular, la dice en voz alta y la TV la pone en su etiqueta; «Ya dije» pasa al siguiente.
6. Las cápsulas se cambian solo en la sala, entre juegos; durante la partida el traje queda fijo.
7. El anfitrión puede pasar el control a otro jugador mayor de edad de la sala (y, sin pantalla, también la partida).

Fallas de la prueba real del 15 de noviembre y cómo las evita este diseño (su corrección en código va al final): lentitud (consultas cada 1.5 s → avisos al instante), entrar confuso (QR siempre visible y vuelta automática), cápsulas que no cambiaban (cambio inmediato y aviso a la TV; causa exacta por confirmar en la Fase 6) y el anfitrión sin palabra (`useAPartidaDeSala` se apaga si `sala.anfitrion`).

**PENDIENTE (Fase 6), riesgos encontrados en el código:** `partidas.semilla` la puede leer cualquier miembro de la sala y, con el motor público, permite calcular el impostor y la palabra: debe pasar a un lugar que solo lea el anfitrión. ~~La cuenta del anfitrión puede leer todas las acciones antes de la revelación (aceptado para fiestas entre amigos; la Fase 5 puede mover el motor al servidor si hace falta).~~ **REEMPLAZADA (v1.39, Elías, 17 de noviembre):** el anfitrión no puede consultar acciones privadas de otros jugadores: ni semillas, ni roles ajenos, ni palabras ajenas, ni respuestas o votos antes de revelar, ni registros que permitan reconstruir secretos. Prevalece la decisión de privacidad P-07 sobre esta frase. Ver `ALV_SEGURIDAD_PARTIDA.md` §1. `Partida.tsx` llama a `vistaJugador` dentro de lo que dibuja la pantalla grande. `revelar` y `siguiente` hoy no se guardan en `acciones`.

# 22. Arquitectura técnica

## 22.1 Arquitectura técnica de ALV 2.0 — DECISIÓN (v1.23)

**DECISIÓN (v1.23, Elías aprobó la Fase 5 completa, 15 de noviembre).** Referencia: página «ALV Fase 5 Arquitectura» (https://claude.ai/artifact/HLQeJUZHR7zbpfzkAjPB2p, fuente `alv2\fase5\` fuera del repo). Es el plan de la Fase 6; el código y la base no se tocaron en la Fase 5. Punto de partida medido: 65 pruebas pasan, 14 juegos sobre 11 mecánicas, 16 migraciones.

Tecnología: se mantiene React, TypeScript, Vite y Supabase, publicada en GitHub Pages, sin dependencias nuevas.

Qué se queda y qué se va:
- Se conserva el motor (`src/engine`, con `vistas.ts` como frontera de lo que ve cada aparato), `logros`, `azar`, el contenido, `figura3d` y Minifig Studio (`public/minifig`), `sonido.ts`, las migraciones 001 a 016 (no se editan; todo cambio va de la 017 en adelante) y la función `restablecer-clave` como respaldo.
- Se ajustan: tipos y filtros (etiqueta `familiar` en las cartas; desde v1.25, etiquetas tranquila / adulta / Drunk por D1), economía (sale el saldo calculado en el aparato), sobres (pesos de la tanda 4), catálogo (filas por intención), equipos (sin adornos 2D), cuenta, tarjetas (se conserva la apertura animada), avatar, sincronización de figuras, HUD y XP extra.
- Se escriben de nuevo: `App.tsx`, `Partida.tsx` (se parte en motor de la Pantalla, una parte por mecánica para TV y otra para celular, y el modo de un celular), `PartidaCelular.tsx`, `Sala.tsx`, `Lobby.tsx`, `Armado.tsx`, `Hub.tsx`, `Juegos.tsx`, `Bienvenida.tsx`, ranking, `nube.ts` (se parte en `servicios/`), `estado.ts` (solo preferencias, id del aparato y copia de cápsulas) y los tres CSS apilados (`styles.css`, `menus.css`, `pantalla.css`).
- Se elimina el personaje 2D: `EditorPersonaje`, tienda 2D, `piezas*.json`, `public/piezas`, `preparar_pieza.py`, recompensas de equipo 2D y `salaVista.ts`; en la base, `personajes`, `inventario`, accesorios 2D, `comprar_accesorio` y `public.saldos_de` (en la limpieza final).

Estructura: `engine`, `content`, `ds` (Design System en código: tokens copiados de la fuente aprobada y los 13 componentes), `servicios`, `local`, `figura3d`, `juegos/<mecánica>/{tv,celular}`, `roles/{pantalla,jugador,control,mesa}`, `pantallas` y `app`. Solo `roles/pantalla/motor.ts` llama a `aplicar`. Una prueba revisa que lo que dibuja la TV no use `vistaJugador`, `privado`, `respuestas`, `manos` ni `semilla`. Los componentes no hablan con la base.

Rutas por aparato (enrutador propio con `#`): `#/s/código` (el QR deja dentro de la sala), `#/sala/código` (celular; la barra aparece a quien tiene el control), `#/tv/código` (la Pantalla), `#/proyectar`, `#/mesa/código` (sin pantalla o un celular), más hub, jugar, catálogo, ficha, personalizar, tienda, colección, ranking, logros, perfil, ajustes y admin. El papel lo da la ruta del aparato, no la cuenta.

Tiempo real: un solo archivo (`servicios/tiempoReal.ts`) escucha los cambios de `partidas`, `datos_privados`, `acciones`, `miembros_evento`, `eventos` y `figuras_jugador`, más presencia y mensajes de paso en un canal privado por sala. Estados Conectando, En vivo y Respaldo: si no hay respuesta en 5 s, consulta cada 3 s; al volver lee todo una vez. Las acciones llevan número del servidor y se aplican en orden; el fin del reloj se vuelve la acción `revelar` para que repetir semilla y acciones dé lo mismo.

Acciones nuevas del motor: `pausar`, `reanudar`, `saltar`, `ruleta`, `xp-reto`, `pasar-control` (control) y `pista` (El impostor, hasta 40 caracteres); `revelar`, `siguiente`, `terminar` y `dar-carta` se guardan siempre; «ya la vi», «pedir pausa» y gestos son mensajes de paso que no se guardan.

Migraciones futuras, cada una con RLS, quién escribe y prueba con un usuario sin acceso: 017 semilla privada y control/pantalla; 018 acciones nuevas en orden; 019 tiempo real y canal privado; 020 edad y sala familiar; 021 apodos e intentos; 022 código de recuperación; 023 cuentas en un solo celular y su XP; 024 colección de piezas y sobres; 025 sobres de contenido; 026 XP por reto, logros y ranking; 027 limpieza.

Orden de la Fase 6, cada paso publicado y probado por Elías antes del siguiente: (1) cimientos, (2) base segura 017–019, (3) tiempo real, (4) partida en tres aparatos, primero El impostor, ¿Quién es más probable? y Verdad o reto, (5) sala, (6) acceso y cuentas, (7) hub y catálogo, (8) personalizar, tienda y colección, (9) perfil, logros y ranking, (10) limpieza, (11) correcciones de la prueba real del 15 de noviembre y nueva prueba de sala, (12) reglas de XP. Red de seguridad: las pruebas de hoy, prueba de los 14 juegos completos, de repetición, del secreto y de la frontera, y prueba manual con tres aparatos.

Decisiones:
1. **REEMPLAZADA (v1.37, Elías, 16 de noviembre).** Texto anterior, que queda como historial: «El motor se queda en la Pantalla.» **DECISIÓN (v1.37, Elías aprobó, 16 de noviembre):** el servidor es la autoridad de la partida. El motor corre en una Edge Function llamada `partida` que reutiliza el motor TypeScript (`src/engine`); no se reescribe en PL/pgSQL. Cada migración, cambio de RLS, de esquema y despliegue requiere autorización expresa e independiente. Plan por fases: `ALV_PLAN_IMPLEMENTACION_MOTOR_SERVIDOR.md` (fuera del repo, en la carpeta del proyecto). Mientras no se complete ese plan, el motor sigue en la Pantalla tal como está construido.
2. Los textos de las cartas siguen en el código con su etiqueta (familiar hasta v1.24; tranquila / adulta / Drunk desde v1.25, D1); la base guarda quién tiene cada sobre de contenido. Si ALV se publica, pasan a la base.
3. La XP vive solo en el servidor; se quita la XP y las compras guardadas en el aparato.
4. Código de recuperación de 12 caracteres en 3 grupos, sin letras que se confunden.
5. La Fase 6 se publica por pasos.
6. (Elías) La XP por reto en vivo no tiene tope y también se le puede dar al anfitrión; queda registrado quién la dio. Las reglas de costos y ganancias de XP (general, por reto, por equipos, por parejas, y la XP extra al equipo ganador) se definen al final, en el paso 12; mientras, quedan los valores de hoy.
7. ~~La sala deja de ser familiar cuando sale el último menor, con aviso en la TV.~~ Sustituida por D1 (v1.25, 3.2): no hay menores ni modo familiar. La migración 020 «edad y sala familiar» cambia de alcance: solo comprobar que la cuenta es mayor de 18.

**REEMPLAZADA (v1.37, Elías, 16 de noviembre).** Texto anterior, que queda como historial: «Riesgo aceptado: la cuenta con el control puede leer la semilla y todas las acciones, porque la Pantalla la usa.» Ya no es un riesgo aceptado: con el servidor como autoridad de la partida (decisión 1, v1.37), ninguna cuenta (anfitrión, jugador ni Pantalla) debe poder leer la semilla, los papeles, las palabras ajenas ni las respuestas de otros antes de la revelación, ni manipulando las peticiones del navegador. Hasta que se retire el motor antiguo según `ALV_PLAN_IMPLEMENTACION_MOTOR_SERVIDOR.md` §11, la exposición sigue existiendo en las partidas con el motor actual.

**DECISIÓN (v1.38, Elías aprobó, 16 de noviembre), complementos del motor en servidor:**
- **Secretos en el cliente (requisito de cliente):** la palabra y el papel no se montan en el DOM hasta que el jugador pida verlos, y se desmontan al soltar. Se corrige primero en la presentación. Es complementario: la protección real es el servidor. No justifica una migración por sí solo.
- **Latencia:** desde la última respuesta hasta la revelación, mediana de 3.3 s como máximo, máximo observado de 4.7 s y límite visible de 5.8 s. Se conserva la pausa de suspenso de 2 s (21.4, decisión 1). Cada medición documenta método, número de pruebas y condiciones.
- **Pasar el control:** quien recibe el control (21.4, decisión 7) puede administrar la partida con los permisos que eso requiere, sin ampliar sus privilegios más de lo necesario.
- **Modo local:** solo para desarrollo y pruebas internas. No es modalidad de producción en esta etapa.

### Avance de la Fase 6

**Paso 1, cimientos (v1.24, 15 de noviembre).** Publicado; no cambia nada visible en la app de hoy. Se hizo:
- `src/ds/`: tokens, estilos e iconos copiados tal cual de la fuente aprobada con `tools/copiar-ds.mjs` (no se editan a mano; viven dentro de la clase `.D` para no tocar los estilos de hoy) y los 13 componentes en React. Página interna `#/ds` con todos sus estados, sin enlace en la app. Se agregaron solo los estados que la fuente no traía en código: cargando, chip elegido, botón con burbuja y votos en la rueda.
- Enrutador propio (`src/app/rutas.ts`): las rutas de hoy siguen igual. `#/s/código` y `#/sala/código` abren la sala de hoy con el código escrito; `#/tv/código`, `#/mesa/código` y `#/proyectar` muestran una pantalla provisional hasta los pasos 4 y 5; `#/hub`, `#/catalogo`, `#/juego/x`, `#/personalizar`, `#/coleccion`, `#/logros` y `#/admin` llevan a su pantalla de hoy. Las rutas nuevas se cargan aparte, con los estilos del Design System.
- `src/servicios/`: `nube.ts` partido en `cliente`, `cuenta`, `sala`, `partida`, `tienda` y `admin`, sin cambiar ninguna función; `nube.ts` queda como puente para las pantallas de hoy.
- Pruebas nuevas (82; total 147): los 14 juegos completos con 4 jugadores, repetición con semilla y acciones (también a media partida y con acciones repetidas), el secreto en cada momento de los 14 juegos, la frontera (`roles/pantalla` y los `juegos/*/tv.tsx` no usan `vistaJugador`, `privado`, `respuestas`, `manos` ni `semilla`), los componentes que no hablan con la base, las rutas y que `nube.ts` ofrece lo mismo que antes.
- Quedan para su paso: `local/`, `figura3d/`, `juegos/` y `roles/*/motor.ts` (paso 4), `servicios/tiempoReal.ts` (paso 3) y las piezas de apoyo del Design System (aviso, confirmar, contador de XP, confeti, apertura de sobre).

**Pasos 2 a 11, versión de prueba (v1.30, 16 de noviembre).** Elías autorizó hacer los pasos 2 a 12 seguidos y la Fase 7 (documento «ALV 2.0 — Dirección técnica»), lo que sustituye a la decisión 5 de arriba («se publica por pasos»). Se trabajó en la rama `alv2-fase6`. **Publicado en la página el 16 de noviembre (v1.31)** por instrucción de Elías («Sí, publica»), con las pruebas manuales en aparatos reales todavía pendientes. Se hizo:
- **Base (paso 2).** Aplicadas: 019 (tiempo real en `partidas`, `datos_privados`, `acciones`, `miembros_evento`, `eventos`, `figuras_jugador`), 020 (nadie abre ni entra a una sala sin `mayor_18`; se revisa con un disparador, también ante solicitudes manipuladas) y 026 en su parte necesaria (`dar_xp_reto`, `ranking_conocidos`). Escritas y **sin aplicar**: 017 (semilla y arranque en tabla aparte, partidas solo por función) y 018 (número de orden y tipo `control`); la herramienta las rechazó por quitar permisos en producción y esperan autorización expresa. 027 está en `supabase/pendientes/` y no se aplica: está bloqueada hasta una auditoría de impacto y recuperación de datos y requiere autorización expresa de Elías (D-002, v1.36). 021 a 025 no existen todavía.
- **El riesgo de la semilla queda cerrado sin esperar a 017:** la semilla real ya no se escribe en `partidas` (va 0); viaja en la acción de arranque, que por RLS solo lee quien tiene el control. Probado con usuarios simulados en una transacción deshecha: quien no tiene el control ve 0 acciones ajenas y lee semilla 0.
- **Tiempo real (paso 3).** `servicios/tiempoReal.ts`: avisos al instante; sin confirmación en 5 s, consulta cada 3 s y se marca «Reconectando»; latido cada 12 s.
- **Partida en tres aparatos (paso 4).** `roles/pantalla/motor.ts` es el único que llama a `aplicar`: reconstruye con arranque + acciones guardadas, publica la vista pública y lo privado de cada quien, y revela sola a los 2 s. Corre en la Pantalla (`#/tv/código`) o en el celular del anfitrión si juegan sin pantalla. Acciones nuevas del motor: `pausar`, `reanudar`, `saltar`, `pista`, `xp-reto`, `ruleta`, `pasar-control`. Las 11 mecánicas (14 juegos) tienen herramienta de celular y escena de TV en `juegos/general/` (un archivo general por papel, no una carpeta por mecánica).
- **Sala, acceso, hub, catálogo, personalizar, perfil, logros, ranking y administración (pasos 5 a 9)** con el Design System, en `src/pantallas/`. El QR deja dentro de la sala; sin sesión se entra o se crea cuenta ahí mismo y se sigue a la sala. Registro solo para mayores de 18 (D1).
- **Limpieza (paso 10), parte de código:** se retiró la app 2D (pantallas, estado local con XP, tienda 2D y los tres CSS). La limpieza de la base es la 027, sin aplicar y bloqueada: requiere autorización expresa de Elías y una auditoría previa de impacto y recuperación de datos (D-002, v1.36).
- **Correcciones de la prueba del 15 de noviembre (paso 11):** el celular del anfitrión es un jugador más y ve su palabra; avisos al instante en lugar de consultas cada 1.5 s; QR siempre visible; tocar una cápsula llama al servidor en el momento y la sala lo ve por tiempo real. Falta la nueva prueba de sala con aparatos reales.
- **Pruebas:** 149 automáticas (nuevas: motor de sala, repetición, control, secreto de lo publicado, rutas), build, y en navegador con el respaldo local (3 y 4 pestañas) El impostor completo con y sin pantalla. Sin probar contra el servidor con cuentas reales ni en celulares y TV: lo prueba Elías.
- **No se hizo y queda PENDIENTE:** (el paso 1.5 se saltó por decisión de Elías, v1.35; 017 y 018 se aplicaron en v1.35) paso 12 (reglas de XP); tienda, sobres y colección 3D (024, 025); código de recuperación (022); apodos e intentos (021); cuentas en un solo celular (023); personalizador Simple/Avanzado propio (hoy abre el editor de Minifig Studio); motor Temperatura + Voltaje y contenido nuevo (3.2); pasar la partida al celular si la Pantalla no vuelve, espera al desconectado y «pedir pausa» (21.4); entorno de pruebas con Supabase aparte (la organización ya tiene dos proyectos).
- **Decisiones técnicas tomadas sin consulta** (detalle en `docs/ALV_DECISION_LOG.md`): el modo de la sala se guarda en `eventos.nombre`; parejas por orden de llegada si el número es par; «No lo cumplí» vale 0 puntos y no hay botón de pasar (se pasa con comodín, v1.28); un solo brillo en bucle por pantalla; sin dependencias nuevas; respaldo local sin servidor para probar varios aparatos en pestañas; Tienda con candado «Abre pronto».

## 22.2 Hipótesis iniciales (historial)

Hipótesis de implementación:
- Aplicación web responsive.
- HTML/localStorage únicamente para prototipo, no para multijugador de producción.
- Candidatos por evaluar: React, TypeScript, Vite, Supabase y PostgreSQL con capacidades realtime.

Producción requiere:
- Base de datos persistente.
- Autenticación y permisos.
- Roles HOST/PLAYER/SCREEN.
- Sincronización en tiempo real.
- Reconexión y recuperación de estado.
- Validación de resultados en servidor.
- Privacidad de roles y respuestas.
- Persistencia de XP, inventario y logros.
- Auditoría de acciones relevantes.
- Seguridad contra manipulación de puntuaciones.
- Pruebas de concurrencia y rendimiento móvil.

Sustituido en v1.23 por 22.1.

---

# 23. Fases de desarrollo

No saltar fases. Cada fase requiere alcance, entregables, criterios de aceptación y aprobación del usuario.

| Fase | Alcance | Estado |
|---|---|---|
| Previa | Explorar y seleccionar dirección visual | Hecha en v1.15: «Cine Cómic Nocturno» (8.7) |
| 1 | Design System | Pendiente; ya no está bloqueada |
| 2 | Personajes y personalización | En curso (v1.11): figura 3D por cápsulas |
| 3 | Onboarding, HUB y perfil | Pendiente |
| 4 | Navegación, tienda e inventario | Pendiente |
| 5 | Lobby y acceso | Pendiente |
| 6 | Configurador y catálogo | Pendiente |
| 7 | HOST, PLAYER y SCREEN | Pendiente |
| 8 | Progresión y economía | Pendiente |
| 9 | Resultados y eventos | Pendiente |
| 10 | Integración y pulido | Pendiente |
| Técnica posterior | Arquitectura, backend y producción | Pendiente |

## 23.1 Método de trabajo con Claude u otro agente

- Actuar como Product Owner, UX y arquitecto antes de programar.
- Auditar el trabajo previo antes de reconstruir.
- Trabajar una fase a la vez.
- Cada prompt debe especificar contexto, alcance, entregables, criterios de aceptación y restricciones.
- No asumir propuestas como aprobadas.
- No avanzar sin revisión del usuario.
- Exigir diferenciación real cuando se soliciten conceptos alternativos; no entregar variaciones de color del mismo layout.
- Controlar el volumen de entregables para que cada archivo pueda revisarse y probarse.

## 23.2 Exploración visual: entregables previstos

**DECISIÓN (v1.25, Elías, 15 de noviembre) — D4, entregable de diseño:** el diseño final se entrega como **ocho pantallas de alta fidelidad** y un **prototipo HTML navegable** que las une, no como 17 maquetas estáticas. Lo de abajo (conceptos A/B/C) queda como historial.
**SUSTITUIDA (v1.35, Elías, 16 de noviembre):** el paso 1.5 se salta; la app publicada es la referencia. El texto de v1.26 queda como historial. **DECISIÓN (v1.26, Elías, 15 de noviembre) — D4, paso 1.5 de la Fase 6 (obligatorio antes del paso 2):** se hace `ALV_Prototipos_Fase6.html`, un solo archivo HTML que abre con doble clic, sin servidor, con CSS y JS dentro, responsive en 375, 768, 1280 y 1920 px y con el Design System «Cine Cómic Nocturno» igual en todas las pantallas. Las ocho pantallas, navegables con clics reales:
1. Hub principal.
2. Personalizador Simple.
3. Personalizador Avanzado.
4. Tienda de accesorios.
5. Tienda de comodines.
6. Apertura de sobre (simulada, con animación).
7. Partida en la TV (Pantalla).
8. Partida en el celular (jugador y anfitrión).

Al pasar de Simple a Avanzado se conserva la figura. La vista de TV y la del celular se ven distintas en la misma maqueta. Si faltan recursos 3D, se usan figuras SVG coherentes y se anota la limitación. El prototipo es la referencia visual de los pasos 2 a 12: cada pantalla implementada se compara contra él; si difieren, se decide cuál manda y se actualiza el otro, sin dejar dos versiones distintas. Las 5 tandas de la Fase 3 siguen siendo la referencia de contenido.
**PENDIENTE (D4):** la «Tienda de comodines» es nueva frente a 13 (hoy los comodines se compran dentro de la partida con XP de la sesión, `comprar_carta`); falta decidir si también se compran fuera de partida y con qué XP.

Tres archivos HTML:
- `ALV_Concepto_A.html`
- `ALV_Concepto_B.html`
- `ALV_Concepto_C.html`

Cada archivo contiene tres pantallas apiladas:
1. HUB: logo, saludo, XP y cuadrícula 2×2 con Preguntas y verdades, Retos, Adivinar palabras y El impostor; navegación Inicio/Juegos/Lobby/Tienda/Perfil.
2. Apertura de sobre: tres cartas común/épica/legendaria (rareza ilustrativa).
3. Gameplay: parejas, «¿Cuánto conocen a su pareja?», fogata, pregunta «¿Cuál es el destino al que más le gustaría viajar a tu pareja?», personajes enfrentados, temporizador, puntuación e instrucciones móvil.

Requisitos:
- Responsive; 390 px como referencia, no límite.
- CSS y JS inline.
- Google Fonts y Lucide CDN permitidos.
- Sin backend ni lógica de producción.
- Código comentado.
- Respetar movimiento reducido.
- Español latino.
- Tres propuestas realmente diferenciadas.
- Si el volumen no cabe, entregar tabla comparativa y concepto A completo; preguntar antes de B/C.
- No comenzar Design System hasta elegir concepto ganador.

---

# 24. Pendientes principales

1. Fase 3 de ALV 2.0 cerrada en v1.21 (12 pantallas diseñadas en 5 tandas, 8.7). Sigue la Fase 4 (Pantalla, Anfitrión y Jugador: comunicación y qué ve cada uno en la partida), solo con aprobación de Elías.
2. Paleta y tipografía oficiales fijadas en el Design System (v1.16, 8.7).
3. Resuelto en v1.4: catálogo clásico enumerado en 16.8.
4. Completar matriz de compatibilidad entre modalidad y minijuegos.
5. Definir reglas, duración, turnos, rondas, empates y puntuación de cada minijuego.
6. Formalizar el modelo contable de XP acumulada, XP disponible y XP de sesión.
7. Afinar el castigo de mitad de XP en el siguiente juego: qué lo provoca, cuánto dura y si se acumula.
8. Definir economía de tienda, precios, sobres, duplicados y rarezas.
9. Definir roles, permisos, reconexión y privacidad.
10. Definir licencias y fuente de audio para Karaoke relámpago.
11. Validar el tono de animaciones de derrota y del último lugar.
12. Definir captura y compartición de fotos de podio.
13. ~~Seleccionar técnica de representación y animación de personajes.~~ Resuelto en v1.11: 3D con Minifig Studio (9.3).
14. ~~Seleccionar arquitectura backend y estrategia de despliegue.~~ Resuelto en v1.23 (22.1). Siguen la Fase 6 (implementación) y la 7 (calidad), solo con aprobación de Elías.
15. Confirmar si la XP que compra cartas se cuenta por sesión o por evento.
16. Definir las reglas de XP para sesiones posteriores a la primera prueba.
17. Redactar el banco de frases con siglas.
18. Definir topes, motivo y efecto en el podio de la XP extra que da el administrador. La XP por reto en vivo ya no tiene tope (v1.23); el resto se define con las reglas de XP al final de la Fase 6.

---

# 25. Decisiones que no deben perderse

- ALV es un party game multijugador, no un RPG.
- La plataforma debe tener dos personalidades visuales: HUB premium y gameplay energético.
- La paleta y la tipografía oficiales se fijan en el Design System, ya dentro de Comic Gaming (8.7).
- HOST crea y controla el lobby; los demás se unen.
- El producto contempla HOST, PLAYER y SCREEN.
- La progresión y el inventario persisten entre sesiones.
- XP acumulada determina nivel y nunca disminuye.
- XP disponible es gastable y nunca queda negativa. La XP no se descuenta como castigo.
- XP de sesión determina el podio de esa sesión y es la única que compra cartas para esa sesión; no se usa XP histórica para ordenar el podio.
- La XP de sesiones anteriores solo compra sobres de accesorios y accesorios especiales.
- El castigo es ganar la mitad de la XP en el siguiente juego; nunca resta XP ni deja a nadie sin jugar.
- El administrador puede dar XP extra a un participante por actividades fuera del juego.
- Primera prueba: una sola sesión y toda la XP sirve para todo.
- La marca es ALV; su significado puede variar por pantalla. Principal: «Amigos Legendarios Verdaderos» (v1.12).
- Dirección visual: Comic Gaming, con tres propuestas para elegir (8.7).
- Todo jugador tiene cuenta. ALV es solo para mayores de 18, sin modelo familiar; etiquetas tranquila / adulta / Drunk (D1, 3.2).
- Comodines = acciones del motor, consumibles, con matriz por juego (D2, 13.4).
- Un personalizador con modos Simple y Avanzado (Básico y Completo), sin perder lo armado; el Avanzado es el libro de cómic propio, no el taller de Minifig Studio (D3, 10; v1.41).
- Diseño final: 8 pantallas de alta fidelidad + prototipo HTML navegable, hecho en el paso 1.5 antes del paso 2 (D4, 23.2).
- Menores de 18: mensaje de bloqueo hasta corregir la fecha. Intensidad: Temperatura (preguntas) y Voltaje (retos), 5 niveles cada uno, nivel general de la sala (v1.28; sustituye el termómetro de 4 niveles). Comodines en todos los juegos, de un solo uso; pasar solo con comodín. Cartas de trago obligatorias con la bebida que cada quien elija; tomar nunca da XP. Modo Avanzado también en celular (v1.26).
- El lenguaje de la app usa siglas con ingenio.
- ALVerca, FBI y GPS son los escenarios activos.
- Los cosméticos no otorgan ventajas competitivas.
- El catálogo son los 14 clásicos de 16.8 y los 7 nuevos del capítulo 16. Se pueden agregar más juegos cuando el usuario lo pida.
- La clasificación por forma de participación es transversal y un juego puede combinar varias formas.
- No recuperar las propuestas descartadas de lluvias de ideas.
- La arquitectura técnica de ALV 2.0 está aprobada (22.1): React, TypeScript, Vite y Supabase; motor en la Pantalla; XP solo en el servidor.

---

# 26. Historial de versiones

## v1.0
Primera consolidación del documento maestro: visión, arquitectura conceptual, modalidades, configurador, personajes, progresión, tienda, logros, flujo, fases y lineamientos técnicos.

## v1.1
Se añadieron propuestas para:
- Armario/editor: sonidos, VFX, animaciones de equipamiento, reacciones, giro, aleatorio y taller.
- Personalidad: idles y emotes.
- Lobby social: entrada de personajes, interacciones, parejas y estados.
- Celebraciones y podio: victoria, derrota, composición modular, corona temporal y foto final.
- Técnica: rig común, transiciones, foley, controles de audio y accesibilidad.

## v1.2
Se añadieron y consolidaron:
- Exploración de pantalla de carga e identidad de apertura, sin fijar paleta oficial.
- Tres direcciones visuales y criterios de evaluación.
- Depuración del catálogo: conservar los minijuegos seleccionados y los clásicos preexistentes.
- Mecánicas detalladas de No te rías, El impostor, Quién lo haría, Dos verdades y una mentira, Respuesta infiltrada, Dibujar, Memoria fotográfica, Emoji secreto, Karaoke relámpago y ¿Qué prefieres?
- Clasificación transversal por forma de participación.
- Reglas de puntuación y separación entre XP acumulada, XP disponible y XP de sesión.
- Podio de sesión calculado con XP neta de la sesión, no XP histórica.
- Registro de pendientes para música/licencias, puntuación, saldo negativo y catálogo clásico.

## v1.3
Decisiones del usuario del 12 de noviembre de 2026:
- Nombre: la marca ALV se respeta y su significado puede variar por pantalla. Principal «Amigos, Locuras y Verdades»; alternativa «Amigos Legendarios Verdaderos». Sustituye a «Aventuras con Amigos».
- XP: la disponible nunca queda negativa y la XP no se descuenta. Sustituye la decisión de v1.2 que permitía saldo negativo y quitar XP. El castigo pasa a ser ganar la mitad de la XP en el siguiente juego.
- XP de sesión: además del podio, es la única que compra cartas para esa sesión. La XP de otras sesiones solo compra sobres de accesorios y accesorios especiales.
- Escenarios: FBI y GPS quedan activos junto con ALVerca.
- Lenguaje de siglas en toda la app (1.4).

- El administrador puede dar XP extra a un participante (12.3.1).
- Primera prueba: una sola sesión completa en la que toda la XP sirve para todo. Los sobres mixtos no se compran con XP de sesiones anteriores.
- Dirección visual: Neo-Arcade (8.6), con la lista de mejoras del usuario implementada por tandas. Se descarta la comparación de los conceptos A, B y C.

Propuestas añadidas, sin aprobar:
- Sobres oro, plata y bronce y compra directa de accesorios especiales (13.2).

## v1.4
Decisiones del usuario del 12 de noviembre de 2026:
- Catálogo clásico enumerado (16.8): 14 juegos. «Quién lo haría» y «¿Quién es más probable?» son el mismo juego.
- El catálogo queda abierto a agregar más juegos cuando el usuario lo pida.
- Piezas del personaje con nombres genéricos (19.1). Queda pendiente redibujarlas.

## v1.5
Decisiones del usuario del 12 de noviembre de 2026:
- Flujo de juego tipo «Clubes Pro / The Grounds» con lobby social y personajes animables (21.2).
- Navegación Inicio, Lobby, Tienda, Ranking y Perfil (21.1).
- Tienda de sobres en pestaña propia, separada de la personalización (21.2).
- Pestaña Ranking (14.3) e indicador de lugar sobre cada personaje (21.2).
- Uso con laptop proyectada y celulares con usuario: vista ancha lista; multi-dispositivo pendiente.

## v1.6
- Primeros logros (14.2), con ámbito de sesión o histórico (ver DECISIÓN v1.6 en 14.2).

## v1.42
- 18 nov 2026. Piezas con rareza (Rara, Épica, Legendaria), desbloqueo con retos y con XP, guardado en la nube (migración 033, sin aplicar). Taller compartido para después (sección 10).

## v1.41
- 17 nov 2026. D3 (sección 10 y 25): el personalizador se rehízo como libro de cómic propio de ALV; el modo Avanzado (Completo) ya no es el taller de Minifig Studio. Apodo de figura visible arriba del nombre. Celular en horizontal usa el diseño de computadora. Sin migraciones ni cambios remotos.

## v1.40
- 17 nov 2026. Decisiones de Elías sobre la semilla (X1 a X3b). No cambia ninguna regla de juego.
- **X1 (ejecutado):** la función remota experimental `partida-prueba` se eliminó del proyecto ALV. Ya no devuelve la semilla. Sin cambios en otros recursos.
- **X2 (ACEPTADO CON CONDICIONES):** la exposición temporal de la semilla al anfitrión se acepta solo para partidas del motor antiguo (`cliente`). No se usan partidas con información real o sensible mientras dure esa dependencia. Cuando el motor servidor esté habilitado para producción, las partidas nuevas no pueden depender del motor antiguo. La exposición debe quedar identificada y documentada por partida. Esta excepción termina con la retirada definitiva del mecanismo antiguo.
- **X3 (ENFOQUE APROBADO, no autorizada su ejecución):** se conservan las migraciones 029, 030 y 032 del plan, sin renumerar. Cada una requiere autorización propia.
- **X3b (NO AUTORIZADO):** no limpiar, borrar ni modificar semillas de partidas históricas.
- **Precisión de 22.1 (corrección, sin cambio de decisión):** la semilla de `arranques_partida` la lee el anfitrión, no solo quien tiene el control. Ver v1.39.
- Sin migraciones, sin escrituras remotas, sin despliegues. Detalle en `ALV_PROPUESTA_SEMILLA.md` (§8 a §10).

## v1.39
- 17 nov 2026. Cierre de privacidad de la partida (P1 a P5). Sin cambio de producto en el juego; corrige una contradicción.
- **P1, privacidad del anfitrión (DECISIÓN):** el anfitrión no consulta acciones privadas de otros jugadores. Prevalece P-07 sobre la línea de 22.1 que decía lo contrario. Esa línea queda REEMPLAZADA, con su texto anterior tachado como historial. Corrige la frase de que el anfitrión puede leer todas las acciones antes de la revelación.
- **P2, semilla (DECISIÓN):** la semilla nunca se expone al cliente, tampoco después de terminar la partida. Auditoría o reproducibilidad solo por acceso de servidor.
- **Precisión de la línea de 22.1 sobre la semilla en la acción de arranque (corrección, sin cambio de decisión):** la frase «por RLS solo lee quien tiene el control» era incorrecta. La política de 017 da lectura de `arranques_partida` al anfitrión (`es_anfitrion`). La semilla también viaja en la acción de arranque de `acciones`. Hasta la Fase 1 esa exposición existe; ver `ALV_SEGURIDAD_PARTIDA.md` §4.
- **Hallazgo urgente:** la función remota experimental `partida-prueba` devuelve la semilla a quien tenga la llave publicable. Se registra sin cambio remoto; su desactivación requiere autorización.
- **P3, P4 y P5:** quedan como propuesta en `ALV_SEGURIDAD_PARTIDA.md` (§5, §6 y §7), sin aprobar. No cambian decisiones de producto.
- No se modificó la función `partida`, ni `partida-prueba`, ni la base. Sin migración ni despliegue.

## v1.38
- 16 nov 2026. Decisiones de Elías del 16 de noviembre. No cambia ninguna otra decisión de producto.
- **P-03 como DECISIÓN** (21.4, debajo de la decisión 3): a los 20 s sin respuesta, «Esperar al jugador» o «Seguir sin él»; si sigue, revela con las respuestas disponibles y el ausente no puntúa esa ronda; no se expulsa y puede reincorporarse; sin cambio de XP ni migración.
- **22.1, complementos del motor en servidor:** secretos en el cliente como requisito de cliente (palabra y papel fuera del DOM hasta que el jugador pide verlos; complementario al servidor; sin migración solo para esto); criterio de latencia (mediana ≤ 3.3 s, máximo ≤ 4.7 s, visible ≤ 5.8 s, se conserva el suspenso de 2 s, con método, número de pruebas y condiciones); pasar el control con permisos para administrar la partida sin privilegios de más; modo local solo para desarrollo y pruebas internas.
- **Hecho operativo, no regla de producto:** el 16 nov Elías autorizó y se hizo una limpieza total de la base (se borró todo menos su perfil `ecortes7`), verificada con SELECT. Ya no hay partidas, semillas ni salas históricas, así que las reglas del plan del motor sobre conservar el histórico y cerrar partidas viejas quedan sin datos sobre los que aplicar en esta etapa. No se aplicó la migración 027, que sigue bloqueada (D-002, v1.36).
- **Precisión dentro de v1.38 (16 nov, sin versión nueva):** en 21.4 las reglas de la Pantalla que cambia la partida, de las acciones y recarga, y de sin pantalla pasan a REEMPLAZADA con su texto anterior tachado como historial. Ahora dicen que el servidor cambia la partida; la Pantalla se vincula con código temporal, de un solo uso, con vencimiento y confirmación expresa del anfitrión; la ronda se revela cuando todos contestan o cuando termina el reloj, lo que ocurra primero, y si falta un jugador rige P-03. Mientras no se retire el motor actual, sigue funcionando como decía el texto anterior. Sin migración ni despliegue.
- Encabezado y pie dicen 1.38. Se conservan las entradas v1.36 y v1.37.

## v1.37
- 16 nov 2026. Elías aprueba mover el motor al servidor. En 22.1, la decisión 1 («El motor se queda en la Pantalla») y el riesgo aceptado («la cuenta con el control puede leer la semilla y todas las acciones») pasan a REEMPLAZADA, con su texto anterior conservado. Nueva decisión: el servidor es la autoridad de la partida, con el motor en la Edge Function `partida` que reutiliza el motor TypeScript. Plan: `ALV_PLAN_IMPLEMENTACION_MOTOR_SERVIDOR.md`. No se aplicó ninguna migración ni despliegue; cada paso requiere autorización expresa. No cambia ninguna otra decisión de producto.

## v1.36
- 16 nov 2026. Solo cambios de referencia por dos decisiones formales de Elías; no cambia ninguna decisión de producto.
- **D-001, tienda experimental:** la tienda encontrada en el árbol de trabajo permanece congelada. No está autorizada para implementación; su evaluación queda pendiente para una etapa posterior. Se corrige en v1.35 la línea «Orden que sigue» (tienda como siguiente desarrollo) para que no contradiga esto. El resto de ese orden (Temperatura y Voltaje, personalizador) no se toca en esta versión.
- **D-002, permisos de migración:** queda prohibida la ejecución automática de migraciones sobre Supabase. Aplicar migraciones, eliminar tablas o columnas, modificar información existente y operaciones destructivas requieren autorización expresa de Elías. La migración 027 queda bloqueada hasta completar una auditoría de impacto y recuperación de datos. Se aclaran las menciones a la 027 en 22.1 (avance de la Fase 6) y en v1.30.
- Corrección de versión: el encabezado decía 1.35 y el pie 1.34; ambos dicen ahora 1.36.

## v1.35
- 16 nov 2026. **Paso 1.5 saltado** por decisión de Elías: el prototipo HTML de 8 pantallas (23.2) ya no es requisito; la app publicada es la referencia navegable.
- **Migraciones 017 y 018 aplicadas** con autorización de Elías, después de probarlas con usuarios simulados en una transacción deshecha (sin fallas) y del asesor de seguridad (sin errores). `partidas.semilla` ya no la lee ninguna cuenta y las partidas solo se crean con `crear_partida_sala`.
- **Paso 0, modo invitado (3.2, v1.32 y v1.33) construido:** migración 028 (`perfiles.invitado`, `entrar_invitado`, `admin_borrar_invitados`). El invitado entra con apodo y confirma que es mayor de 18; la app le crea una cuenta desechable y la marca. Lleva la etiqueta «Prueba». Entra a salas en la nube igual que una cuenta. Elías borra a todos los invitados desde Administración. Una cuenta normal o una bloqueada por edad no puede volverse invitada.
- Primera prueba contra el servidor real: dos invitados, sala sin pantalla, ¿Qué prefieres? completo (iniciar, contestar, revelar, terminar) con tiempo real en vivo.
- **Etapa 1 del diseño entregada:** `docs/ALV_DIAGNOSTICO_DISENO.md`, solo diagnóstico. La etapa 2 espera a Elías.
- ~~Orden que sigue, dicho por Elías: tienda (13), después Temperatura y Voltaje (3.2) y el personalizador (10), en su orden de la Fase 6.~~ **Aclarado en v1.36:** la tienda está congelada y sin implementación autorizada (D-001, 2026-11-16). Las mecánicas, premios, costos y juegos se ajustan después de probar.

## v1.34
- Sin fecha límite (3.2, v1.29): la jornada de prueba ya no tiene fecha fija; se hace cuando la app esté lista. La meta de contenido de v1.29 queda como referencia, no como plazo.
- Monedas o XP y sus precios se deciden después de la prueba con jugadores (13.1). Mientras, la tienda cobra en XP.

## v1.33
- Decisiones de Elías sobre la propuesta visual (8.8): Cine Cómic Nocturno con partes de Neon Party; Bangers y Barlow; nombre «Amigos Legendarios Verdaderos»; LEGO se mantiene para la prueba.
- Monedas vuelven como moneda de tienda; gemas = XP (13.1). Pendiente: cómo se ganan y gastan las monedas.
- Invitado de prueba puede entrar a salas en la nube; se borra todo al terminar (3.2).

## v1.32
- Acceso sin cuenta en modo invitado para probar (3.2, decisión de Elías). Pendiente: salas en la nube para invitados.
- Propuesta de diseño Neon Party recibida y anotada (8.8). Pendiente de decidir si reemplaza a Cine Cómic Nocturno.

## v1.31
- 16 nov 2026. Elías autoriza publicar la versión de prueba de ALV 2.0 en la página. Se agregan los documentos de continuidad `docs/ALV_*.md`. Siguen sin aplicar 017, 018 y 027; las pruebas con cuentas reales en laptop, TV y celulares quedan a cargo de Elías (`docs/ALV_QA_PROTOCOL.md`, sección 6).

## v1.30
- 16 nov 2026. Fase 6, pasos 2 a 11 en versión de prueba (22.1, «Avance de la Fase 6»): app 2.0 sobre el Design System, motor de sala, tiempo real y migraciones 019, 020 y 026 aplicadas. La autorización de Elías para hacer los pasos 2 a 12 y la Fase 7 seguidos sustituye a la decisión 5 de 22.1. Quedan pendientes y anotados: 017 y 018 (escritas, sin aplicar), 027 (no se aplica sin autorización expresa de Elías, D-002 v1.36), paso 1.5, paso 12, tienda 3D, publicación en la página.

## v1.29
- Pendientes de Temperatura + Voltaje resueltos (3.2): consentimiento explícito y alternativa siempre (agua, castigo u otra pregunta); primera jornada de prueba sábado 12:00 a domingo 17:00; eventos sorpresa como opción de partida y ajuste del anfitrión; reglas de la casa predeterminadas; mismo puntaje en todos los niveles con premio opcional del anfitrión; contenido nuevo con ideas propias y anécdotas de los amigos (pendiente dónde se guardan por privacidad).

## v1.28
- Temperatura + Voltaje aprobado con cambios de Elías (3.2): nivel general de la sala que pone el anfitrión tras votar el grupo fuera de la app, sin límites individuales; pasar solo con comodín; cartas de trago obligatorias con la bebida que cada quien elija; comodines Cambio de pregunta o reto y ¿Voy a tener suerte?; más contenido sin repetir en toda la jornada. Pendientes anotados.

## v1.27
- Tienda inicial (13.1, decisión de Elías): solo sobres de accesorios y de comodines, básicos o especiales, más outfits y comodines básicos fijos; sobres de contenido para después; precios de referencia provisionales.
- Propuesta Temperatura + Voltaje anotada en 3.2, pendiente de aprobación.

## v1.26
- Elías resuelve los pendientes de D1 a D4: bloqueo por minoría de edad hasta corregir la fecha; intensidad como termómetro de 4 niveles; comodines en todos los juegos y de un solo uso; modo Avanzado también en celular; paso 1.5 de la Fase 6 = prototipo navegable `ALV_Prototipos_Fase6.html` con 8 pantallas, obligatorio antes del paso 2. Quedan dos pendientes: cómo encajan tranquila/adulta/Drunk en el termómetro y la tienda de comodines fuera de partida.

## v1.25
- Decisiones D1 a D4 de Elías: solo mayores de 18, sin modelo familiar, con etiquetas tranquila / adulta / Drunk (3.2; sustituye la parte de edad de v1.12, la decisión 7 de 22.1 y la etiqueta familiar); comodines como acciones del motor, consumibles y con matriz por juego (13.4); un personalizador con modos Simple y Avanzado y continuidad de estado (10); diseño final en 8 pantallas de alta fidelidad y prototipo navegable (23.2). Cada una deja sus pendientes anotados. Los pasos 2 a 12 de la Fase 6 no empiezan hasta resolverlos.

## v1.24
- Fase 6, paso 1 (cimientos) publicado: Design System en código con página `#/ds`, enrutador con las rutas por aparato, `servicios/` sacado de `nube.ts` y 82 pruebas nuevas de la red de seguridad (22.1, «Avance de la Fase 6»). Sin cambios visibles ni en la base.

## v1.23
- Fase 5 de ALV 2.0 aprobada: arquitectura técnica (22.1) con mapa del código, estructura, rutas por aparato, tiempo real con respaldo, acciones nuevas, migraciones 017 a 027, orden de la Fase 6 en 12 pasos y 7 decisiones. La XP por reto en vivo queda sin tope y también para el anfitrión; las reglas de XP se definen al final. §22 deja de ser hipótesis.

## v1.22
- Fase 4 de ALV 2.0 aprobada: la partida en tres aparatos, cómo se comunican, reconexión, lo que nunca llega a la TV y 7 decisiones (21.4). Se anotan como pendientes de la Fase 6 la semilla legible por los jugadores y otros riesgos del código.

## v1.21
- Fase 3, tanda 5 (perfil, logros y rankings) aprobada con sus 6 decisiones. Fase 3 de ALV 2.0 cerrada (8.7, 14).

## v1.20
- Fase 3, tanda 4 (personalizador, colección y sobres) aprobada con sus 6 decisiones; fija precios, repetidas, rarezas y sobres de contenido (8.7, pendientes de 13).

## v1.19
- Fase 3, tanda 3 (configuración de partida y lobby) aprobada con sus 6 decisiones (8.7).

## v1.18
- Fase 3, tanda 2 (menú principal, catálogo y ficha de juego) aprobada con sus 5 decisiones (8.7).

## v1.17
- Fase 3, tanda 1 (acceso, registro e inicio) aprobada con sus 6 decisiones (8.7).

## v1.16
- Design System «ALV Cine Cómic Nocturno» aprobado (8.7). Arranca la Fase 3 de ALV 2.0 (diseño de experiencia y pantallas, sin programar hasta la Fase 6), por tandas.

## v1.15
- Fase 2 de ALV 2.0 aprobada: dirección visual «Cine Cómic Nocturno», mezcla de las propuestas C y A pegada a la lámina de Elías (8.7). A, B y C quedan como historial.

## v1.14
- Fase 1 de ALV 2.0 aprobada: mapa, roles Pantalla/Anfitrión/Jugador, flujos, configuración en tres momentos, catálogo por intención y 6 decisiones (21.3).

## v1.13
- La pantalla proyectada no juega; el anfitrión juega desde su celular (3.3). Decisión de Elías tras la primera prueba real de sala.

## v1.12
- Decisiones de la Fase 0 de ALV 2.0 (Elías, 15 de noviembre): significado principal «Amigos Legendarios Verdaderos» (1.1); Comic Gaming sustituye a Neo-Arcade, con tres propuestas a elegir (8.7); navegación desde el hub con Jugar, Personalizar, Tienda, Ranking y Logros (21.1); tienda 2D retirada y sobres cosméticos 3D más sobres de contenido (13); variantes en el catálogo, Ruleta de castigos como herramienta, Trivia ALV y Dibuja y Adivina se agregan (16.8); todo jugador con cuenta, menores con contenido familiar (3.2).

## v1.7
- Tienda de sobres en pestaña propia (13.2). Valores de prueba pendientes de aprobación: precios, pesos de rareza, cantidad de cartas.

## v1.11
- Reconstrucción completa en 3D con el modelo de Minifig Studio (9.3). Se borraron todas las cuentas, XP, salas, partidas, inventario, sobres, el catálogo 2D de la tienda y los personajes (decisión de Elías, 15 de noviembre, sin respaldo). Los accesorios y recompensas 2D no se devuelven. Tabla nueva `figuras_jugador` (migración 015). Riesgo de propiedad intelectual anotado en 19.1.

## v1.10
- Cuentas nuevas empiezan en cero XP; la XP del celular no se importa (decisión de Elías, 12 de noviembre).
- La XP de partidas de una cuenta llega al servidor con una función que valida el rango (0 a 200) y un tope diario (600). Pendiente: validar los resultados de la partida en el servidor, porque hoy el resultado lo envía el celular.

## v1.9
- Cuenta con nickname y contraseña, sin correo (21.2). Registro la primera vez desde el celular; al entrar se recupera personaje, XP, compras e inventario. Implementado el registro, el inicio de sesión y el personaje; XP y compras pendientes. Sin recuperación por correo: se avisa al registrarse.

## v1.8
- Neo-Arcade tanda 3 en parte: ruleta con fricción y gestos de deslizar en la carta (8.6). Pendientes: botella interactiva, destello de cartas de poder, inclinación 3D.

---

**Fin del Documento Maestro ALV v1.42**  
Este documento debe actualizarse de forma incremental y conservar la distinción entre decisiones aprobadas, propuestas, pendientes y descartadas.
