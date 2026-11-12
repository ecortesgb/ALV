# ALV — Amigos, Locuras y Verdades
## Documento Maestro del Producto
**Versión:** 1.9  
**Última actualización:** 12 de noviembre de 2026  
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

**DECISIÓN (v1.3):** Neo-Arcade es la dirección visual de ALV. Parte del diseño que ya existe en la app (fondo espacial, un neón por sección) y lo mejora con la lista de abajo, aportada por el usuario. Sustituye la comparación A/B/C de 8.3.

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

## 13.1 Tienda e inventario

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

**DECISIÓN (v1.5):** la navegación queda Inicio, Lobby, Tienda, Ranking y Perfil. «Juegos» y «Grupo» viven dentro del Lobby y el historial dentro de Ranking.

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

# 22. Arquitectura técnica — hipótesis

No hay arquitectura final aprobada.

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

No presentar estas tecnologías como decisiones aprobadas.

---

# 23. Fases de desarrollo

No saltar fases. Cada fase requiere alcance, entregables, criterios de aceptación y aprobación del usuario.

| Fase | Alcance | Estado |
|---|---|---|
| Previa | Explorar y seleccionar dirección visual | Resuelta en v1.3: Neo-Arcade (8.6) |
| 1 | Design System | Pendiente; ya no está bloqueada |
| 2 | Personajes y personalización | Pendiente |
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

1. Resuelto en v1.3: la dirección visual es Neo-Arcade (8.6).
2. Fijar paleta y tipografía oficiales en la fase de Design System.
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
13. Seleccionar técnica de representación y animación de personajes.
14. Seleccionar arquitectura backend y estrategia de despliegue.
15. Confirmar si la XP que compra cartas se cuenta por sesión o por evento.
16. Definir las reglas de XP para sesiones posteriores a la primera prueba.
17. Redactar el banco de frases con siglas.
18. Definir topes, motivo y efecto en el podio de la XP extra que da el administrador.

---

# 25. Decisiones que no deben perderse

- ALV es un party game multijugador, no un RPG.
- La plataforma debe tener dos personalidades visuales: HUB premium y gameplay energético.
- La dirección visual es Neo-Arcade (8.6). La paleta y la tipografía oficiales se fijan en el Design System.
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
- La marca es ALV; su significado puede variar por pantalla. Principal: «Amigos, Locuras y Verdades».
- El lenguaje de la app usa siglas con ingenio.
- ALVerca, FBI y GPS son los escenarios activos.
- Los cosméticos no otorgan ventajas competitivas.
- El catálogo son los 14 clásicos de 16.8 y los 7 nuevos del capítulo 16. Se pueden agregar más juegos cuando el usuario lo pida.
- La clasificación por forma de participación es transversal y un juego puede combinar varias formas.
- No recuperar las propuestas descartadas de lluvias de ideas.
- Las tecnologías candidatas son hipótesis, no decisiones.

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

## v1.7
- Tienda de sobres en pestaña propia (13.2). Valores de prueba pendientes de aprobación: precios, pesos de rareza, cantidad de cartas.

## v1.9
- Cuenta con nickname y contraseña, sin correo (21.2). Registro la primera vez desde el celular; al entrar se recupera personaje, XP, compras e inventario. Implementado el registro, el inicio de sesión y el personaje; XP y compras pendientes. Sin recuperación por correo: se avisa al registrarse.

## v1.8
- Neo-Arcade tanda 3 en parte: ruleta con fricción y gestos de deslizar en la carta (8.6). Pendientes: botella interactiva, destello de cartas de poder, inclinación 3D.

---

**Fin del Documento Maestro ALV v1.9**  
Este documento debe actualizarse de forma incremental y conservar la distinción entre decisiones aprobadas, propuestas, pendientes y descartadas.
