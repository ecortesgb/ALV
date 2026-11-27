# ALV — Amigos Legendarios Verdaderos
## Documento Maestro del Producto
**Versión:** 1.65  
**Última actualización:** 26 de noviembre de 2026  
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

### 1.3.1 Presentador — DECISIÓN (v1.43)

**DECISIÓN (v1.43, Elías, 18 de noviembre):** ALV tiene un presentador que conduce el juego. Se llama **ALV-I.A.** y su apodo cariñoso es **«Don ALVur»**, que usa cuando se pone formal. Se presenta así: «Soy ALV-I.A., El Alburero: inteligencia artificial mexicana. Albur con respeto, juego con seriedad y risa con clase.»

**PENDIENTE:** su figura, sus diálogos y en qué pantallas aparece (la referencia es el anfitrión con globo de diálogo de LEGO Party, `ALV_REFERENCIA_LEGO_PARTY.md` §14). No se construye hasta que Elías lo pida. Su humor sigue los límites de 1.3: albur con respeto, sin humillar a nadie.

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
~~**PENDIENTE (D1):** cómo encajan las etiquetas tranquila / adulta / Drunk dentro del termómetro (por ejemplo, si «adulta» equivale a los niveles altos y Drunk sigue como interruptor aparte).~~ **Resuelto en v1.28** (Temperatura + Voltaje, abajo). Texto recuperado en v1.45: se había perdido por un reemplazo fallido.
~~**PROPUESTA (v1.27) — Temperatura + Voltaje:** motor de intensidad transversal con dos ejes independientes de 5 niveles (Temperatura para preguntas: Frío, Fresco, Tibio, Caliente, Extremo; Voltaje para retos: Bajo voltaje, Voltaje medio, Alto voltaje, Sobrecarga, Máxima tensión), modos Preguntas / Retos / Preguntas y retos / Aleatorio, factor sorpresa «¿Voy a tener suerte?», presets Relax, Picante y Caos, límites privados por jugador con consentimiento de contacto, freno anónimo y biblioteca ampliada. Si se aprueba, sustituye el termómetro de 4 niveles de v1.26 y el interruptor Adulto, y resuelve el pendiente de arriba. Página con demo y 10 decisiones abiertas: https://claude.ai/artifact/Px5uFp3qVawD8Xo3DRKEfU (fuente `alv2\intensidad.html`). No se implementa hasta que Elías la apruebe.~~ **Aprobada con cambios en v1.28** (abajo). Texto recuperado en v1.45.
**DECISIÓN (v1.28, Elías, 15 de noviembre) — Temperatura + Voltaje:**
1. Se aprueban los **dos ejes independientes de 5 niveles**, Temperatura (preguntas) y Voltaje (retos). Sustituyen el termómetro de 4 niveles de v1.26 y el interruptor Adulto, y resuelven el pendiente de D1.
2. El nivel es **general para toda la sala** y lo pone el anfitrión, después de que el grupo lo decide por mayoría fuera de la app. **No hay límites individuales por jugador.**
3. **Pasar no es gratis:** solo se puede pasar con un comodín. Sin comodín, el jugador cumple el reto o responde la pregunta (cualquier respuesta cuenta).
4. **Las cartas de trago no se pueden omitir.** El texto dice «trago» o «shot», nunca exige alcohol, y cada quien elige qué tomar (agua, refresco, lo que quiera). Tomar nunca da XP.
5. Comodines: se aprueba **Cambio de pregunta o reto**, y **¿Voy a tener suerte?** pasa a ser un comodín cuyo resultado puede ser mejor o peor para quien lo usa.
6. **Más contenido:** se crean más preguntas y retos, y el contenido se ampliará con otras fuentes, para que haya variedad en cada nivel, categoría y combinación y **no se repita ninguna carta en toda la jornada de juego prevista**.
~~**PENDIENTE (v1.28):** (a) consentimiento para retos de contacto: el brief de Elías pide que nunca haya contacto sin consentimiento explícito; con pasar solo con comodín, la propuesta es que cada jugador diga una vez si acepta retos de contacto y que esos retos solo salgan entre quienes aceptaron; (b) duración de la jornada prevista (define cuántas cartas hacen falta); (c) si siguen los eventos sorpresa automáticos además del comodín; (d) si los niveles altos dan más puntos; (e) el freno anónimo de la propuesta se descarta con el nivel general, salvo que Elías lo pida; (f) «otras fuentes»: se adaptan ideas, no se copian textos de juegos comerciales.~~ **Resuelto en v1.29** (abajo). Texto recuperado en v1.45.
**DECISIÓN (v1.29, Elías, 15 de noviembre) — resuelve los pendientes de v1.28:**
- (a) **Consentimiento:** los retos de contacto piden consentimiento explícito. Además, **siempre hay una alternativa** al reto: tomar agua, cumplir un castigo o responder otra pregunta. No se fuerza a nadie a nada. Pasar sin hacer nada sigue costando un comodín.
- (b) **Primera jornada de prueba:** de sábado 12:00 a domingo 17:00 (29 horas). Para entonces tiene que haber juegos y contenido suficientes para que no se repita nada en toda la jornada.
- (c) **Eventos sorpresa:** son una opción que se enciende al configurar la partida y también un ajuste predeterminado del anfitrión en la administración de partidas.
- (d) **Ajustes predeterminados del anfitrión** («reglas de la casa»), que se aplican a todas las partidas hasta que los cambie: por ejemplo, usar solo dados para todos los juegos, dejar fijo el nivel de Temperatura o de Voltaje, eventos sorpresa encendidos o apagados.
- (e) **Puntos:** todos los niveles dan el mismo puntaje. El anfitrión puede dar un premio de XP adicional (la XP por reto en vivo de 22.1).
- (f) **Fuentes del contenido nuevo:** ideas propias y anécdotas personales de los amigos que participan en la prueba.
**PENDIENTE (v1.29):** (1) la fecha exacta del sábado de prueba; (2) las anécdotas de los amigos son datos personales y el repo es público: no pueden ir en `src/content`. Propuesta: guardarlas en la base, visibles solo para el grupo que juega y cargadas por el administrador; esto cambia, solo para ese contenido, la decisión 2 de 22.1 (textos en el código); (3) cómo se juntan las anécdotas (formulario dentro de ALV para que cada amigo mande las suyas y el administrador las apruebe, o una lista que Elías pasa).
**DECISIÓN (v1.52, Elías, 21 de noviembre) — Temperatura + Voltaje en 3 niveles:** cambia el punto 1 de v1.28 (5 niveles por eje queda REEMPLAZADO). Plan y borrador en `juegos-fiesta\ALV_PLAN_TEMPERATURA_VOLTAJE.md` y `ALV_BORRADOR_CARTAS.md` (fuera del repo).
- **Temperatura (preguntas):** 1 Frío: rompehielos, gustos, preferencias, personalidad, experiencias, anécdotas, opiniones y situaciones divertidas. 2 Caliente: confesiones, secretos, relaciones, situaciones incómodas, preguntas íntimas, atrevidas y comprometedoras. 3 Extremo: preguntas muy personales, provocadoras y de máxima exposición voluntaria.
- **Voltaje (retos):** 1 Bajo voltaje: imitaciones, actuaciones, desafíos sencillos, retos divertidos, de interacción y creatividad. 2 Alto voltaje: exposición, improvisación, participación grupal, retos atrevidos, vergonzosos y de mayor dificultad. 3 Sobrecarga: retos extremos de creatividad, atrevimiento y exposición voluntaria.
- **Límites:** solo generales, para todo el grupo y para cada partida. Ningún límite por jugador. Confirma el punto 2 de v1.28.
- **Nadie se obliga:** cada jugador puede no hacer el reto o no responder si no quiere, y siempre puede tomar la alternativa (beber lo que tenga, con Drunk). Ver PENDIENTE de abajo sobre qué cuesta decir que no.
- **Drunk:** interruptor aparte en la partida, independiente de los niveles. Encendido, incluye bebidas como salida para no hacer un reto o no responder, y cartas con beber dentro. Tomar nunca da XP.
- **Consentimiento de contacto:** se acepta al aceptar los Términos y Condiciones; además siempre se puede decir que no o tomar la alternativa (complementa v1.29 a).
- **Primera jornada oficial:** sábado 28 de noviembre de 2026; antes hay sesiones de prueba (resuelve el pendiente 1 de v1.29).
**PENDIENTE (v1.52):** (1) qué cuesta no hacer un reto o no responder: v1.28 punto 3 y v1.29 a dicen que pasar sin nada cuesta un comodín y que la alternativa (beber, castigo u otra pregunta) es gratis; falta confirmar si sigue así; (2) agregar al texto de los Términos la aceptación de retos de contacto; (3) eventos sorpresa (v1.29 c): Elías pidió explicación antes de decidir; (4) presets, curva de la noche y peso entre niveles de la página de diseño siguen como PROPUESTA; (5) anécdotas de los amigos (pendientes 2 y 3 de v1.29) siguen abiertos.
**DECISIÓN (v1.53, Elías, 21 de noviembre) — decir que no, eventos sorpresa y ¿Voy a tener suerte?:** resuelve los pendientes 1, 3 y 5 de v1.52.
- **Si alguien no quiere hacer el reto o responder:** con Drunk encendido, puede beber algo (lo que tenga). Con Drunk apagado, usa un comodín; si no tiene, pierde puntos él y, si juega en pareja o equipo, también su grupo, o compra el comodín ahí mismo con monedas al precio que tenga en la tienda.
- **Eventos sorpresa:** interruptor aparte, como Drunk. Encendido, salen al azar en algunas preguntas o retos y suelen ser grupales (por ejemplo, todos hacen el reto).
- **¿Voy a tener suerte?:** interruptor aparte. Encendido, quien tiene el turno puede elegir esa opción; el resultado puede ser bueno o malo para quien la elige y lo sabe antes de elegirla. Deja de ser un comodín (cambia el punto 5 de v1.28 en esa parte).
- **Anécdotas de los amigos:** fuera por ahora (pendientes 2 y 3 de v1.29 y 5 de v1.52 quedan en pausa).
- **Nivel exacto (Elías, 21 de noviembre):** cada nivel solo saca preguntas o retos de ese nivel; si se elige Extremo no sale nada de Frío. Por eso cada nivel necesita contenido suficiente para una jornada larga. Los castigos no tienen eje: son el precio de no cumplir y salen en cualquier nivel. Descarta la PROPUESTA de peso 60/30/10 entre niveles.
**PENDIENTE (v1.53):** ~~(1) cuántos puntos se pierden al decir que no sin comodín;~~ **Resuelto el mismo día (Elías):** se le restan los puntos que valía la carta (hoy en Verdad o reto: 1 por pregunta, 2 por reto), a él y, si aplica, a su pareja o equipo; ~~(2) precio de un comodín suelto~~ **Resuelto (Elías):** un comodín suelto cuesta **50 monedas** (lo mismo que cada uno dentro del sobre de 3 por 150); comprarlo en vivo necesita una función nueva en el servidor (migración con autorización); (3) lista de eventos sorpresa y de resultados de ¿Voy a tener suerte?, y qué tan seguido salen.

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

**ACTUALIZADO (v1.45):** las modalidades quedan en cuatro (Individual, Parejas, Equipos y ALVersus) y cada juego declara las suyas: ver 6A.2. Resuelto en v1.46 (6A.11 C10).

La compatibilidad entre modalidad y minijuego debe establecerse en una matriz.

---

# 6. Configurador: cuatro dimensiones

El configurador contempla cuatro dimensiones distintas:

## 6.1 Modalidad
Quién compite contra quién: individual, parejas, equipos, etc.

## 6.2 Herramienta
**ACTUALIZADO (v1.45):** definición y lista vigentes en 6A.3 (la botella pasa a ser el Reloj; votar es forma de participación). Lista original:

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

**DECISIÓN (v1.44, Elías, 18 de noviembre) — Configurar partida:** después de que todos dan «¡Listo!» en el lobby, solo el anfitrión configura la partida en pasos: (1) **tipo de partida**: individual, parejas, equipos o guerra de sexos; solo cambia cómo se suman los puntos y quién gana (una persona, una pareja o un equipo); (2) **juego**, del catálogo, con el nivel; (3) **instrumento** según el juego (solo los que aplican), o las **opciones del juego** si no usa instrumento (El impostor: cuántos impostores y categoría de las palabras); (4) **escenario** (ALVerca, FBI, GPS o sin escenario), que cambia el fondo y el tipo de preguntas, retos o palabras; (5) «Iniciar». Hecho en `src/pantallas/ConfigurarPartida.tsx` y `src/content/configurar.ts`.
- Cómo quedó (hecho, sin aprobar en detalle): parejas por orden de llegada y con número par; equipos A a D, repartidos alternados y el anfitrión los mueve tocando a cada quien; en guerra de sexos el anfitrión marca «Ellas» o «Ellos» a cada quien (no se lee el género de la cuenta). El lugar de cada quien en el resultado sale de los puntos de su grupo. Instrumentos que hoy elige el motor: solo cartas o ruleta en Verdad o reto; los demás juegos tienen uno fijo. El escenario fija el lugar real y sus reglas de seguridad (ALVerca → Alberca). La música por escenario no está hecha.
- **PENDIENTE (Elías):** el ejemplo de ALVerca «aguantar la respiración bajo el agua 10 s» choca con las reglas de seguridad: en la alberca «Aguantar la respiración» nunca se permite (`LUGARES` en `src/content/catalogo.ts`). No se agregó esa carta; decide si la regla de seguridad cambia.

---

# 6A. Estructura común de los minijuegos — DECISIÓN (v1.45)

**DECISIÓN (v1.45, Elías, 18 de noviembre):** todos los minijuegos siguen una misma estructura de lobby, modalidades, herramientas, comodines y recompensas. Este capítulo la ordena para definir después cada juego sin volver a discutir lo general. No cambia código, motor ni base. Donde una regla choca con algo decidido antes o con lo ya construido, se marca con su número de choque (C1, C2…) y se resuelve con Elías en 6A.9. Mientras no se resuelva, no se cambia lo que ya funciona.

Cuatro reglas que evitan problemas cuando haya más juegos:

| Regla | Qué evita |
|---|---|
| Cada juego declara sus modalidades compatibles. | Que aparezcan combinaciones imposibles. |
| Cada juego declara sus herramientas compatibles. | Que se elija una herramienta que no funciona con ese juego. |
| Las herramientas no alteran las reglas competitivas. | Que un dado o una ruleta cambien la mecánica de forma injusta. |
| Los comodines tienen efectos propios y controlados. | Que alguien modifique un resultado sin reglas claras. |

## 6A.1 Lobby y orden de selección

**DECISIÓN (v1.45):**
- Mínimo **2** jugadores para iniciar y máximo **8** por ahora.
- Orden: (1) entran los jugadores al lobby; (2) se elige la **modalidad**; (3) se elige el **minijuego**; (4) se habilitan solo las **herramientas** compatibles con ese juego; (5) se configuran sus **opciones**; (6) comienza la partida.
- Modalidad y juego van ligados: al elegir una modalidad solo aparecen los juegos que la admiten. También vale el orden inverso (primero el juego y después solo sus modalidades). Lo importante es que nunca se pueda armar una combinación incompatible.

Estado de lo construido: el lobby de 2 a 8 está publicado (7c1cc2b). El configurador (v1.44, sin publicar) sigue el orden tipo → juego → herramienta u opciones → escenario → resumen, pero **todavía no filtra juegos por modalidad**: hoy se puede elegir cualquier juego con cualquier tipo (choque C5). El escenario no está en este orden (C8).

## 6A.2 Modalidades competitivas

**DECISIÓN (v1.45):** hay cuatro modalidades.

| Modalidad | Quién gana | Cómo se suman los puntos |
|---|---|---|
| Individual | Una persona | Cada quien para sí. |
| Parejas | Una pareja | Los dos integrantes acumulan juntos. |
| Equipos | Un equipo | Los integrantes colaboran y acumulan juntos. |
| ALVersus (guerra de sexos) | Un bando | Ellas contra ellos; cada bando acumula junto. |

- No todos los juegos admiten las cuatro. **Cada juego declara las que permite** y no se fuerzan modalidades que su mecánica no aguanta.
- Sustituye la lista de seis modalidades de 5 (C10).
- Siguen **PENDIENTES** de 5: número impar de jugadores, tamaño de equipos, asignación automática y cambios de equipo.

Estado de lo construido (v1.44, sin publicar): las cuatro existen en el configurador y en el motor (`armarGrupos`, lugar por grupo en `resultados`). Parejas por orden de llegada con número par; equipos A a D que el anfitrión mueve; en ALVersus el anfitrión marca Ellas o Ellos a cada quien.

**DECISIÓN (v1.51, Elías, 20 de noviembre) — género y armado de grupos:** el registro pide género con tres opciones: Mujer, Hombre y «Prefiero no decirlo» (se quitó «Otro»); «Prefiero no decirlo» se guarda como `otro`, sin migración. En ALVersus los bandos se acomodan solos: Mujer → Ellas, Hombre → Ellos, y quien prefirió no decirlo (o no tiene género) va al bando con menos gente, al azar si están parejos. Antes de iniciar, el anfitrión puede cambiar los bandos, los equipos y también las **parejas** (tocando a dos personas se intercambian); sin cambios, las parejas siguen por orden de llegada. Partidas guardadas sin parejas elegidas se reconstruyen igual que antes.

## 6A.3 Herramientas

**DECISIÓN (v1.45):** las herramientas son la forma de elegir participantes, decidir turnos, establecer quién pregunta y quién responde o hace la actividad, escribir o controlar el tiempo. **No cambian la intención del juego ni dan ventaja competitiva por sí mismas. No son comodines.**
- Cada juego tiene su **lista de herramientas permitidas**: una obligatoria o varias para elegir. No aparecen herramientas que no tengan sentido para su mecánica.
- La regla concreta de cada herramienta (por ejemplo, si el dado más alto pregunta) se fija en cada juego.

| Herramienta | Qué decide | Ejemplo | Estado en el código |
|---|---|---|---|
| Dados | Quién pregunta y quién responde | Verdad o reto: cada quien tira; el más alto pregunta y el más bajo responde o hace el reto. | Solo existen en Dados HOT (acción, zona y tiempo). |
| Cartas de póker | Quién pregunta y quién responde | Se reparte una carta a cada quien; la más alta pregunta y la más baja responde. | No existe. |
| Reloj | Selección circular | Verdad o reto: la manecilla corta señala quién pregunta y la larga quién responde. Sustituye a la botella y puede caer en cualquiera, también en dos personas sentadas juntas. | Existe como juego aparte, «El reloj» (C9). |
| Ruleta | Participantes, turnos u otro elemento al azar compatible con el juego | Verdad o reto: elige a quién le toca. | Turno con ruleta en Verdad o reto; «Ruleta de castigos» del anfitrión (C9). |
| Pizarrón | Escribir respuestas o palabras que después se muestran en la pantalla | El impostor: cada quien escribe su palabra y la TV la muestra según la ronda. | Hecho en El impostor (v1.44). |
| Temporizador | Tiempo para contestar o completar la actividad | El impostor: quien no responde a tiempo pierde su turno y sigue el siguiente, respetando las reglas que ya tiene (C6). | Reloj en los juegos de conteo (30 o 60 s); El impostor no tiene tiempo por turno. |

La lista de 6.2 incluía Botella, Micrófono, Votaciones y Tablero. La botella queda sustituida por el Reloj. Votar es una forma de participación (17.1 B), no una herramienta. Micrófono y Tablero quedan **PENDIENTES** hasta que un juego los necesite.

## 6A.4 Comodines y cartas especiales

**DECISIÓN (v1.45):** los comodines son un **sistema aparte** de las herramientas.
- Se consiguen en la **tienda con monedas**, de dos formas: sobres con comodines al azar o compra de un comodín específico (C1, C3).
- Cada comodín tiene **reglas de uso, momento en que se activa y compatibilidad por minijuego** (C3).
- Sus efectos se aplican **antes de cerrar y consolidar el resultado de la ronda**, para que el marcador no quede inconsistente.
- No se cierra todavía una lista definitiva ni se inventan efectos.

| Comodín | Estado | De dónde sale |
|---|---|---|
| Pasar turno | Definido: el jugador no responde la pregunta o no hace el reto y el turno pasa a otro según las reglas del juego. | Catálogo («Pasa turno»); v1.28: pasar solo con comodín. |
| Cambio de pregunta o reto | Definido. | v1.28. |
| ¿Voy a tener suerte? | Aprobado; su efecto exacto sigue pendiente («puede ser mejor o peor»). | v1.28. |
| Escudo, Salvavidas, Relevo, Doble castigo, Cambio de mesero | Existen en el código con un efecto descrito en el catálogo; falta confirmar si siguen. | `CARTAS_PODER` en `catalogo.ts` (D2, v1.25). |
| Duplicar puntos | Idea pendiente. | v1.45. |
| Protegerse de ciertas penalizaciones | Idea pendiente (se parece a Escudo y Salvavidas). | v1.45. |
| Modificar el resultado de una ronda | Idea pendiente. | v1.45. |
| Alterar condiciones que el juego permita | Idea pendiente. | v1.45. |

## 6A.5 Recompensas: tres sistemas independientes

**DECISIÓN (v1.45):**

| Sistema | Quién lo recibe | Para qué sirve | Puede bajar |
|---|---|---|---|
| **XP** | Todos por jugar; los ganadores, una bonificación extra. | Subir de nivel. | No (12.1 A). |
| **Monedas** | Todos por participar; los ganadores, monedas extra. | Comprar artículos y comodines en la tienda. | Solo al comprar. |
| **Puntos competitivos** | Según el resultado de cada juego. | Decidir quién gana la ronda y la posición en la sesión o torneo. | Sí: una ronda puede dar puntos negativos. |

- No se confunden los tres. Perder una ronda no quita XP ni monedas por sí mismo: las recompensas dependen de las reglas de cada juego.
- No se confunde la puntuación de una ronda con el acumulado de la sesión: los puntos de cada ronda se suman al marcador de la sesión.
- Los valores todavía no se definen; no hay cantidades definitivas.
- **ACTUALIZADO (v1.54):** el ranking usa otra cosa, los **Puntos ALV** (14.3): 3, 2 y 1 por el lugar final de la partida. Los puntos competitivos de esta tabla deciden ese lugar; nunca se suman directo al ranking.
- Resuelve el pendiente de 18 («si dentro de una partida se pueden perder puntos de ronda»): **sí**, los puntos competitivos de una ronda pueden ser negativos. La XP sigue sin descontarse (12.4).

Estado de lo construido: la XP se calcula en `economia.ts` (terminar la partida, rondas jugadas, retos cumplidos y lugar) y se acredita en el servidor. **Las monedas no existen todavía.** El motor suma puntos por ronda y nunca da negativos. El ranking «Sesión» ordena por XP (C2). Una partida de menos de 5 rondas no da XP (C7).

## 6A.6 Minijuegos ya definidos

### A. El impostor
- **Modalidad: solo Individual.** Cada jugador tiene su propio rol y su propio resultado; no se juega por parejas, equipos ni ALVersus (C5).
- **Herramientas:** pizarrón (obligatorio: cada quien escribe su palabra y la TV la muestra) y temporizador (opcional, sin cambiar las reglas existentes; C6).
- **Mecánica:** la de 16.2 (v1.44, con eliminación por voto y varios impostores). No se reemplaza ni se simplifica. Información privada por rol en el celular, palabras por turnos, votación y revelación según esas reglas. Puntos aprobados en 16.2 (c).
- Estado: construido (v1.44, sin publicar). Falta conectarlo a la sala.

### B. Verdad o reto
- **Modalidad: Individual.**
- El jugador en turno **elige** Verdad o Reto. Verdad es una pregunta que debe contestar; Reto, una actividad que debe hacer.
- **Cada jugador puede elegir Verdad solo una vez; en su segunda participación debe elegir Reto.** Se controla por jugador, no para toda la mesa.
- Si cumple la pregunta o el reto, recibe la recompensa que corresponde. Si no lo cumple, no obtiene los puntos de esa participación (C4).
- Puede usar comodines compatibles, como Pasar turno, si tiene uno.
- **Herramientas posibles:** dados, cartas de póker, reloj y ruleta. Deciden quién pregunta y quién responde o hace el reto; no cambian el objetivo del juego.
- Estado (v1.46, sin publicar): **construido** con las reglas de 6A.6 B y 6A.11 C4, C9 y C13. Herramientas: en orden, reloj, dados, cartas de póker y ruleta (deciden quién pregunta y quién responde). Quien responde elige; quien pregunta decide si ALV da la carta o la dice en voz alta, y califica «cumplió» o «tomó»; con Escudo o Pasa turno se pasa sin tomar y Cambio cambia la carta de ALV. Puntos: Verdad +1, Reto +2, tomar +1 (**DECISIÓN**, Elías aprobó 1 punto el 18 de noviembre), pasar con comodín 0. Las partidas guardadas antes siguen con el modo anterior.

### C. Trivia ALV
- **Modalidades: Individual, Parejas, Equipos y ALVersus.**
- **Categorías iniciales:** cultura general, películas, series, celebridades, música, deportes, videojuegos e historia y geografía. Los jugadores eligen los temas antes de empezar.
- La pantalla muestra la pregunta, los celulares responden, se valida la respuesta y se acumulan puntos individuales o por grupo según la modalidad. Al final se decide la persona o el grupo ganador.
- **Team Battle:** los equipos compiten y acumulan puntos juntos (C12).
- Estado: aprobado como juego nuevo desde v1.12; **sin construir** y sin contenido. Ya tiene ilustración.

### D. Misión secreta
- **No es un minijuego que el anfitrión elige en el lobby.** Es la primera actividad de la reunión y se activa cuando los jugadores entran al lobby.
- Cada jugador recibe una misión distinta y privada. Todos la ejecutan al mismo tiempo mientras llegan los demás, se acomodan y empieza la convivencia. Se puede intentar descubrir la misión de otro.
- Termina cuando empieza oficialmente la sesión de minijuegos.
- Estado: **sin construir.** Antecedentes: la sigla GTA ya dice «Misiones secretas» (1.4) y `economia.ts` tiene un valor de XP sin usar para «misión validada».

### E. Mini-Juegos (modo) — DECISIÓN (v1.63, Elías, 26 de noviembre)
«Mini-Juegos» es un modo de juego nuevo con partidas cortas de reflejos: los personajes 3D de cada jugador compiten en la TV y cada celular es un control de uno o pocos botones. Usa los personajes del sistema nuevo (D3 v1.62), con sus animaciones de caminar, saltar, golpe y caída. Los modelos son privados: no entran al repo ni a una página pública.

Lista inicial, en este orden: Esquiva la bala, ¡Desenfunda!, Martillazo, Alto total y Paracaídas. Cada uno se define con la plantilla 6A.8 antes de construirse.

### F. Esquiva la bala — DECISIÓN (v1.63)
1. **Modalidades:** Individual (todos contra todos). Parejas y Equipos: **PENDIENTE**.
2. **Herramientas:** ninguna.
3. **Opciones del anfitrión:** ninguna en la primera versión.
4. **Fases:** fila (cada jugador entra con su personaje; se empieza cuando todos cargaron) → cuenta 3-2-1 → rondas (aviso del lado por donde viene, pasa la bala, cada quien salta) → fin con podio → «Otra vez». TV: la fila, la bala, quién cae, el marcador y el podio. Celular: un botón SALTA del color del jugador, gris al quedar fuera, y el resultado al final.
5. **Puntos:** lugar por orden de eliminación; el último en pie gana; los que caen en la misma ronda empatan.
6. **XP y monedas:** **PENDIENTE** (C7: la regla de 5 rondas no aplica igual a este juego).
7. **Comodines:** ninguno por ahora (**PROPUESTA:** «Escudo» aguanta una bala).
8. **Fin:** queda uno, o se acaban los 60 s (los que siguen en pie empatan). La bala acelera cada ronda, el tiempo en el aire baja de 650 a 450 ms en las primeras 10 y desde la ronda 3 pueden venir dos balas seguidas. Mismo ancho de cuerpo para todos los personajes.
9. **Desconexión:** al empezar se congelan los participantes; quien se desconecta sigue en la fila y cae con la siguiente bala.
10. **Seguridad:** solo toques en la pantalla; sin contacto ni trago.
11. **Justicia con la red:** cada celular mide el reloj de la TV antes de jugar y manda la hora de su toque; la TV juzga con esa hora y un margen de 70 ms, espera 250 ms a los toques atrasados y rechaza los de otra partida, repetidos o con un reloj poco confiable.
- Estado: prototipo en una zona aparte del código, sin conectar a la app ni publicar.

### G. Físico (modo) — DECISIÓN (v1.63, Elías, 26 de noviembre; resuelve C15)
Físico sigue siendo de retos en persona. En la TV es una sala con los personajes de frente, sobre el fondo del escenario elegido; los personajes se animan (gestos, festejo, derrota). El anfitrión arbitra y asigna a mano puntos, castigos y retos según cumplan o no. Desde la sala se elige un juego físico que pone en la TV lo que haga falta (datos, palabras, preguntas o herramientas). Los puntos de Físico se guardan en la nube con la migración 040, ya aplicada desde el 23 de noviembre: `terminar_partida_sala` acepta `fisico`, valida al anfitrión en el servidor y guarda por jugador puntos, lugar, rondas y retos, con la misma XP y monedas que los otros juegos; tomar no suma. No hace falta SQL nuevo; falta integrar Físico a una sala real de la app.

Primer juego físico, **«Palabra prohibida»** (resuelve C16): en la TV salen los personajes, una categoría (por ejemplo «Personajes de Scooby-Doo») y la palabra secreta (por ejemplo «Shaggy»), tapada por omisión. Las personas, sentadas, dicen por turno una palabra de la categoría; quien diga la secreta pierde. Castigo, por ejemplo, un globo de agua o beber algo: cada quien elige qué tomar, nunca se exige alcohol y tomar no da XP; los retos de contacto solo con el consentimiento de las personas involucradas y, si alguien no acepta, sale otro sin contacto. El juego que antes se llamaba «Palabra prohibida» (describir sin decir 3 palabras tachadas) **se llama ahora «Descríbelo sin decirlo»**.
- Estado: prototipo en una zona aparte del código, sin conectar a la app ni publicar.

### H. Modo libre — DECISIÓN (v1.63, Elías, 26 de noviembre)
Modo aparte donde los personajes entran a un cuarto para probar sus trajes, poderes y saltos, interactuar y divertirse sin reglas ni puntos. Se controla desde el celular (palanca, saltar, golpe y festejo) y se ve en la TV. Es la **cuarta tarjeta** de la pantalla Modos, junto a Local, En línea y Físico.
- Estado: prototipo en una zona aparte del código, sin conectar a la app ni publicar.

## 6A.7 Compatibilidad por juego

I = Individual, P = Parejas, E = Equipos, AV = ALVersus. «Por definir» quiere decir que el juego todavía no declara sus modalidades ni sus herramientas.

| Juego | Modalidades | Herramientas | Estado |
|---|---|---|---|
| El impostor | I | Pizarrón (obligatorio), temporizador | Definido y construido |
| Verdad o reto | I | Dados, cartas de póker, reloj, ruleta | Definido; construido antes de esta definición |
| Trivia ALV | I, P, E, AV | Por definir (pantalla y celular) | Definido sin construir |
| Misión secreta | No aplica (actividad de inicio) | No aplica | Definido sin construir |
| ¿Cuánto conoces a tu pareja? | Por definir; hoy exige parejas | Pizarrón (hoy escriben su respuesta) | Construido |
| Dados HOT | Por definir; hoy exige parejas y contenido adulto | Dados | Construido |
| Dibuja y Adivina | Por definir; 16.3 propone parejas, equipos y todos contra todos | Pizarrón | Sin construir |
| Ronda de bienvenida, Lista relámpago | Por definir | Temporizador | Construidos |
| Mímica, Palabra prohibida | Por definir | Temporizador | Construidos |
| Yo nunca | Por definir | Por definir | Construido |
| ¿Quién es más probable? | Por definir | Por definir | Construido |
| ¿Qué prefieres? | Por definir | Por definir | Construido |
| Reto del lugar | Por definir | Por definir | Construido |
| El reloj | Ver C9 | Reloj | Construido como juego |
| Ruleta de castigos | Ver C9 | Ruleta | Herramienta desde v1.12; el motor lo sigue tratando como juego |
| No te rías, Dos verdades y una mentira, Respuesta infiltrada, Memoria fotográfica, Emoji secreto, Karaoke relámpago | Por definir | Por definir | Sin construir |

## 6A.8 Plantilla para definir cada minijuego

Cada juego nuevo, o cada juego por definir de 6A.7, se describe con estos campos (resuelve el pendiente de plantilla de 18):
1. Modalidades que admite.
2. Herramientas: la obligatoria y las opcionales, y qué decide cada una en ese juego.
3. Opciones que configura el anfitrión.
4. Fases de la ronda (17.3) y qué ve la TV y qué ve cada celular en cada fase.
5. Puntos competitivos por acción, incluidos negativos, empates y desempate.
6. XP y monedas que da (cuando haya valores).
7. Comodines compatibles y en qué momento se pueden usar.
8. Fin de la partida: número de rondas o condición de fin.
9. Jugador que no responde o se desconecta (P-03, 21.4).
10. Seguridad y lugar (reglas de `LUGARES`, consentimiento, cartas de trago).
11. Contenido que necesita (mazo, categorías, niveles).

## 6A.9 Choques y dudas para confirmar con Elías

**Resueltos en v1.46:** ver 6A.11. Se conservan aquí como historial.

Ninguno se resuelve solo. Hasta que Elías decida, se conserva lo que ya funciona.

- **C1 · Monedas o XP en la tienda.** 6A.5 dice que la tienda cobra en monedas y los comodines se compran con monedas. Antes: v1.33 y v1.34 (13.1) dejaron monedas contra XP para después de la prueba con jugadores, con la tienda cobrando en XP; v1.27 puso precios en XP; v1.42 desbloquea piezas raras con XP (construido, migración 033 aplicada). Por decidir: ¿las piezas raras pasan a monedas? ¿La XP deja de gastarse? Si deja de gastarse, la «XP disponible» de 12.1 B ya no tiene uso.
- **C2 · Qué ordena el podio de la sesión.** 6A.5 dice que lo ordenan los puntos competitivos. Antes, 12.1 C, 14.1 y 18 dicen que lo ordena la XP de la sesión, y el ranking «Sesión» de la app ordena por XP.
- **C3 · Comodines por juego y cómo se consiguen.** v1.26 (13.4) dice que todos los comodines sirven en todos los juegos; 6A.4 pide compatibilidad por juego. Además, hoy el motor regala un comodín cada 3 retos cumplidos y el anfitrión puede dar uno; 6A.4 dice que se consiguen en la tienda. ¿Se quitan esas dos vías?
- **C4 · No cumplir en Verdad o reto.** v1.28 dice que sin comodín se cumple el reto o se responde la pregunta, y v1.29 que siempre hay una alternativa (tomar agua, cumplir un castigo u otra pregunta). 6A.6 B dice que quien no cumple solo pierde los puntos. ¿Se puede no cumplir sin comodín y solo quedarse sin puntos? Hoy la app tiene «No lo cumplí» con 0 puntos (hallazgo abierto).
- **C5 · El impostor con otras modalidades.** 6A.6 A lo deja solo individual. El configurador de v1.44 permite elegirlo con Parejas, Equipos o ALVersus. Se corrige en la siguiente etapa de código.
- **C6 · Temporizador en El impostor.** 6A.3 dice que quien no responde a tiempo pierde su turno. Hoy no hay tiempo por turno: a los 20 s el anfitrión elige esperar o seguir sin el jugador (P-03, 21.4), y en la vuelta de palabras el anfitrión puede saltar al que no habla. ¿Se agrega un tiempo por turno que salte solo, o se deja el control del anfitrión?
- **C7 · XP mínima.** `economia.ts` no da XP en partidas de menos de 5 rondas. El impostor con eliminación suele terminar en 2 a 4 vueltas, así que casi nunca daría XP, y 6A.5 dice que todos reciben XP por jugar.
- **C8 · Escenario.** El orden de 6A.1 no lo menciona. v1.44 lo puso como paso del configurador y v1.14 (21.3, decisión 4) lo elegía una vez al abrir la sala. ¿Sigue siendo un paso del configurador?
- **C9 · El reloj y la Ruleta de castigos.** En 6A.3 son herramientas. En el catálogo, «El reloj» es un juego (16.8) y «Ruleta de castigos» pasó a herramienta en v1.12, aunque el motor y el configurador la siguen mostrando como juego. ¿El reloj deja de ser juego y queda solo como herramienta de Verdad o reto y otros juegos?
- **C10 · Modalidades de 5.** Se interpreta «Todos contra todos» como Individual. «Equipos mixtos» y «Guerra de géneros» quedan dentro de Equipos y ALVersus. ¿Correcto?
- **C11 · Nombre.** El texto de esta definición dice «ALV (Aventuras con Amigos)». v1.3 quitó «Aventuras con Amigos» como nombre principal y v1.12 dejó «Amigos Legendarios Verdaderos». ¿Vuelve, o es una variante más con A, L y V?
- **C12 · Team Battle de Trivia.** ¿Es la modalidad Equipos con otro nombre o una variante distinta (por ejemplo, equipos que se roban la pregunta)?
- **C13 · Quién pone la pregunta en Verdad o reto.** Las herramientas deciden quién pregunta. Hoy la pregunta o el reto salen de las cartas de ALV. ¿El que pregunta inventa la pregunta, la lee de una carta o elige entre cartas?
- **C14 · Escritura de la modalidad.** El texto dice «AL versus»; la ilustración y la app dicen «ALVersus». ¿Cuál se usa?

## 6A.10 Lo que falta para cerrar la estructura

- Definir con la plantilla de 6A.8 los 17 juegos marcados «Por definir» en 6A.7.
- Valores de XP, monedas y puntos por juego.
- Cómo se ganan y se gastan las monedas, y su lugar en la barra superior.
- Efecto exacto de cada comodín, su momento de uso y su compatibilidad por juego.
- Misión secreta: banco de misiones, cómo se valida que alguien la cumplió, qué pasa si otro la descubre, recompensa y qué pasa con quien llega tarde.
- Trivia ALV: forma de responder (opciones o texto), tiempo por pregunta, puntos, desempate y banco de preguntas por categoría.
- Reglas concretas de dados y cartas de póker (empates en la tirada o en la carta).


## 6A.11 Decisiones sobre los choques — DECISIÓN (v1.46)

**DECISIÓN (v1.46, Elías, 18 de noviembre):** resuelve C1 a C14 de 6A.9. Con esto se cierran por ahora las modalidades; los juegos que ya están completos deben quedar funcionales con ellas.

- **C1 · Tienda y XP.** Las **monedas** compran en la tienda: sobres, piezas, accesorios y outfits completos, normales y especiales. La **XP solo sube de nivel**, y cada nivel puede desbloquear cosas del personalizador. Sustituye la tienda en XP de 13.1 (v1.27, v1.33 y v1.34) y deja sin uso la «XP disponible» de 12.1 B. El desbloqueo de piezas raras con XP de v1.42 (construido, migración 033 aplicada) tiene que pasar a monedas o a nivel: **PENDIENTE de código y migración**, con autorización por paso (D-002).
  - **Hecho en v1.47 (sin publicar):** pantalla de recompensas. Cuando la XP de la cuenta sube estando en la sala, sale tu figura, «+N XP», la barra del nivel que se llena (vuelve a empezar al subir), el próximo premio con candado, «¡Subiste a nivel N!» y una tarjeta por cada pieza nueva («¡Genial!» o «Ponérmelo», que abre el personalizador). Los premios por nivel los da el servidor con `reclamar_premios_nivel()` (migración 035, **escrita, no aplicada**); sin ella la pantalla sale igual, sin premios. **PROPUESTA:** qué pieza da cada nivel (`src/content/premiosNivel.ts`: 2 pelo rockero, 3 momento velocidad, 4 cuello, 5 casco, 6 torso, 7 accesorio, 8 pelo, 10 momento fuego, 12 torso, 15 casco, 20 torso). Las monedas siguen sin construir.
- **C2 · Podio y copas.** El podio lo deciden los **puntos**. Hay un podio al final de cada juego. Al final de la copa (todas las rondas, al cerrar el lobby) se anuncian los ganadores **por categoría**, uno por cada una según la suma de puntos que hicieron jugando juntos: 1.º, 2.º y 3.º individual, equipo ganador, pareja ganadora y bando ganador de ALVersus. Cada ganador recibe su trofeo: copa individual, copa parejas, copa equipos y copa ALVersus. Sustituye el podio por XP de sesión de 12.1 C, 14.1 y 18. **Hecho en v1.46 (sin publicar):** podio al final de cada juego (TV: lista de puntos y un bloque del color de cada jugador, más alto según su lugar, con corona al primero, y banda del grupo ganador; celular: tabla de posiciones) y ceremonia de copas que el anfitrión entrega desde el configurador («🏆 Entregar copas»): suma todos los juegos terminados de la sala; en la TV sale una copa a la vez (bronce, plata, oro, parejas, equipos, ALVersus) y al final todas con los puntos de la noche; en el celular, la lista. Reglas usadas: las parejas y los equipos se reconocen por sus integrantes (suman los juegos que jugaron juntos); el bando de ALVersus es el mismo aunque cambien sus integrantes; si una categoría no se jugó, no hay copa; los empates comparten copa. Referencias visuales de Elías: podio con bloques de color y tabla «Standings / Final results». ~~**PENDIENTE:** pantalla de recompensas.~~ **Hecho en v1.47 (sin publicar):** pantalla de recompensas al terminar cada partida (ver C1 y C7).
- **C3 · Comodines.** Se consiguen **al ganar partidas**, o con monedas en **sobres** o como **comodines fijos** comprados directo. Cada comodín tiene compatibilidad por juego (6A.4), lo que sustituye la matriz «todos con todos» de v1.26 (13.4). La regla actual del motor (un comodín cada 3 retos cumplidos) cambia a «al ganar partidas»: **PENDIENTE de código**, junto con cuántos se ganan.
- **C4 · Verdad o reto.** (Construido en v1.46; ver 6A.6 B.) Las únicas opciones son **responder, hacer el reto o tomar**. Quien toma también gana puntos, quizá menos. Con un comodín puede pasar sin tomar. Sustituye, solo en Verdad o reto, el punto 3 de v1.28 y las alternativas de v1.29 (a). Sigue vigente que «tomar» nunca exige alcohol: cada quien elige qué tomar, y tomar no da XP (v1.28). ~~**PENDIENTE:** cuántos puntos da tomar.~~ **DECISIÓN (v1.46, Elías):** tomar da 1 punto.
- **C5 · El impostor.** Solo individual. Si se elige otra modalidad, el juego no aparece para elegir. **Hecho en v1.46** (6A.12).
- **C6 · Temporizador.** Es una herramienta opcional. Si se elige, cada turno tiene un tiempo según el juego; al acabarse, el turno pasa al siguiente. Sin temporizador sigue P-03 (21.4): a los 20 s el anfitrión elige esperar o seguir. **Hecho en v1.46** para El impostor y Verdad o reto: el anfitrión elige sin tiempo, 20, 30, 60 o 90 s por turno. En El impostor, a quien no dice su palabra a tiempo se le salta. En Verdad o reto, si quien responde no elige o no cumple a tiempo pierde el turno (0 puntos), y si quien pregunta no decide, sale la carta de ALV. En pausa el tiempo no corre y al reanudar vuelve a empezar. La TV y el celular muestran la cuenta regresiva.
- **C7 · XP mínima.** La XP va de acuerdo con lo jugado y **nunca es 0**, aunque se juegue una sola ronda. Sustituye el mínimo de 5 rondas. **PENDIENTE:** la fórmula vive en el servidor (`privado.xp_de_partida`, migración 008); cambiarla necesita migración y autorización. **Hecho en v1.47 (aplicado en la base el 18 nov con autorización de Elías):** migración 034, en todos los juegos y en las dos rutas que dan XP (`xp_de_partida` de la sala y `registrar_partida` de un solo aparato): misma fórmula sin el corte de 5 rondas; 0 solo si no se jugó ninguna ronda. Una ronda da de 22 a 37 XP según el lugar. Siguen los topes de 600 XP al día y una partida por minuto en `registrar_partida`. `minRondasParaContar` = 1 en `economia.ts`.
- **C8 · Escenario.** Va **después de las herramientas** (ya es así en el configurador).
- **C9 · Reloj.** Es una **herramienta**, como la botella: la manecilla chica elige quién pregunta y la grande quién responde o hace el reto. «El reloj» deja de ser un juego del catálogo (el motor no se borra: queda como herramienta de Verdad o reto y de otros juegos). La Ruleta de castigos ya era herramienta desde v1.12.
- **C10 · Modalidades por juego.** Cada tipo de partida habilita ciertos juegos; algunos solo se juegan en individual. Los **equipos mixtos** se permiten en ciertos juegos. Sustituye la lista de 5.
- **C11 · Nombre.** Sigue el nombre principal de v1.12, «Amigos Legendarios Verdaderos», con sus variantes en la ruleta del logo. «Aventuras con Amigos» es una variante más.
- **C12 · Team Battle.** Es la modalidad Equipos: poder jugar en equipos ciertos juegos, como Trivia ALV.
- **C13 · La pregunta en Verdad o reto.** La puede poner la app o el que pregunta la dice en voz alta, y la app solo registra si respondió o cumplió. El participante decide si pide inspiración a la app (que le muestre una) o la inventa él.
- **C14 · Escritura.** Se escribe **ALVersus**.

## 6A.12 Modalidades por juego — DECISIÓN (v1.46) y PROPUESTA

Lo definido por Elías es **DECISIÓN**. Lo marcado **PROPUESTA** es el valor con el que la app funciona mientras Elías no lo cambie; está en `src/content/configurar.ts` (`MODALIDADES_JUEGO`) y se cambia ahí sin tocar el motor. El configurador solo muestra los juegos que admiten la modalidad elegida.

| Juego | Modalidades | Estado |
|---|---|---|
| El impostor | Individual | DECISIÓN |
| Verdad o reto | Individual | DECISIÓN |
| Trivia ALV | Individual, Parejas, Equipos, ALVersus | DECISIÓN (sin construir) |
| ¿Cuánto conoces a tu pareja? | Parejas | PROPUESTA: el juego necesita parejas |
| Dados HOT | Parejas | PROPUESTA: el juego necesita parejas |
| ¿Quién es más probable? | Individual, Parejas, Equipos, ALVersus | PROPUESTA |
| ¿Qué prefieres? | Individual, Parejas, Equipos, ALVersus | PROPUESTA |
| Yo nunca | Individual, Parejas, Equipos, ALVersus | PROPUESTA |
| Mímica y Palabra prohibida | Individual, Parejas, Equipos, ALVersus | PROPUESTA |
| Ronda de bienvenida y Lista relámpago | Individual, Parejas, Equipos, ALVersus | PROPUESTA |
| Reto del lugar | Individual, Parejas, Equipos, ALVersus | PROPUESTA |
| El reloj | Ya no es juego (C9) | DECISIÓN: sale del configurador |
| Ruleta de castigos | Herramienta (v1.12) | DECISIÓN: sale del configurador |

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

**DECISIÓN (v1.21, Elías aprobó, 15 de noviembre) — Fase 3, tanda 5: perfil, logros y rankings. Con esto la Fase 3 de ALV 2.0 queda cerrada.** Referencia: https://claude.ai/artifact/6kYG6Lr7vp7i1ynjx3aSYv (fuente `alv2\fase3-t5\`). Perfil con tarjeta de jugador (figura, nivel, título por nivel y números con siglas), logros de sesión e históricos con avance, y ranking con Esta reunión, Histórico, Parejas, Equipos e Historial. Decisiones, todas las recomendadas: (1) el perfil que ven los demás muestra figura, apodo, nivel, título, números, logros y últimas partidas, nunca fecha de nacimiento ni género; (2) el ranking histórico compara por defecto con «Mi grupo» (gente con la que se ha jugado), con «Todo ALV» y «Este mes» como filtros; (3) cada quien elige 3 logros destacados; (4) unos pocos logros secretos, visibles como «???» con pista; (5) los logros no dan XP (ratificado en v1.54, D0); (6) la tarjeta usa siglas: PJ partidas jugadas, PG ganadas, RC retos cumplidos, MVP, IMP impostores atrapados, RAC mejor racha.

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

**DECISIÓN (v1.50, Elías, 19 de noviembre) — D3, tres modos:** el switch Básico / Completo se reemplaza por **tres modos** sobre la misma figura del espacio: **Básico** (piel, rostro, pelo, ropa normal y piernas, en 5 pasos; todas las cabezas cambian de color, solo cambia el rostro), **Personaje original** (catálogo saga → grupo → personaje → versión; «Ponerme todo» o «Solo el traje») y **Avanzado** («Piezas comunes» sin piezas de personaje y «Piezas originales» por saga, con piezas sueltas de cada personaje). Al abrir un espacio el libro muestra las 3 tarjetas grandes (portadas de Elías) y unos separadores cambian de modo en cualquier página. Lo hecho en un modo se ve en los otros. Antes de **quitar** algo, de cambiar dos partes o más a la vez o de **reemplazar una pieza original** sale un aviso con lo que se va y lo que llega; los cambios simples no preguntan, y «Regresar» deshace el último paso (hasta 30). El libro de cómic (muro, libro, vuelta de página, figura viva) se mantiene. Sagas iniciales: Marvel (Avengers: Iron Man, Capitán América, Thor, Hulk, Spider-Man; X-Men: Wolverine, Cíclope, Gambito, Magneto, Tormenta), DC Comics (Batman, Superman, Wonder Woman, Flash, Joker), Star Wars (Darth Vader, Luke Skywalker, Yoda, Mandalorian, Boba Fett) y Harry Potter (Harry, Hermione, Ron, Voldemort, Snape); versiones: Spider-Man (clásico, Iron Spider, película), Batman (Dark Knight, The Batman), Iron Man (clásico, Mark 7), Capitán América (clásico, con casco), Thor (clásico, capa roja). Los demás personajes y los oficios no se muestran por ahora (siguen en la biblioteca). Sustituye en lo que choque a D3 v1.41 (switch Básico / Completo).
**DECISIÓN (v1.50, Elías, 19 de noviembre) — piezas libres por ahora:** todas las piezas, trajes, personajes y accesorios van libres hasta que Elías entregue el catálogo de qué va bloqueado, libre, en sobres o en tienda. **PENDIENTE:** en la nube la 033 sigue aplicada y su guardián rechaza figuras con piezas bloqueadas; liberarlas de verdad requiere la migración 037 (`037_piezas_libres.sql`: deja inactivas las piezas de la 033 sin borrar nada y pausa los sobres que traen piezas; el de comodines sigue), probada en local y en remoto y **APLICADA el 19 de noviembre** con autorización de Elías: hoy ninguna pieza está bloqueada y solo se vende el sobre de comodines. Para volver a bloquear, se reactivan piezas y sobres (instrucciones en la propia migración).
**DECISIÓN (v1.26, Elías, 15 de noviembre) — D3:** el modo Avanzado también está en celular. Sustituye la decisión 6 de la tanda 4 (v1.20), que lo dejaba solo en tablet o computadora.

**DECISIÓN (v1.62, Elías, aprobada el 26 de noviembre) — D3, sistema de personajes y personalizador nuevos.** El sistema de personajes se rehace desde cero; se conservan el motor 3D (escenas, cámaras, red, vida automática, perfiles y gestos) y el resto del juego. Sustituye a D3 v1.25, v1.26, v1.41 y v1.50 en todo lo que choque. Formato completo en `ALV_FORMATO_PERSONAJES_V3.md` (fuera del repo), con sus valores por defecto: colección de 3 espacios, Big Fig sin «Crear» al inicio y sin lados distintos salvo como pieza o variante.
1. **Pantalla «Mi personaje»** con dos entradas, **Elegir personaje** y **Crear mi personaje**, y la colección de 3 espacios (el activo es el que sale en HUB, lobby y TV).
2. **Elegir personaje:** galería de personajes completos con vista 3D, categorías por saga, filtros sencillos (bando y tamaño) y favoritos. Desde la ficha: «Usar» o «Personalizar a partir de él».
3. **Crear mi personaje (básico):** cuatro categorías, Cabeza, Torso, Brazos y manos, y Piernas. Galería de miniaturas, cambio inmediato con la figura en 3D, guardar y salir. Sin sliders, escalas, colores sueltos ni ajustes técnicos. Solo aparecen piezas compatibles.
4. **Avanzado (opcional y aparte):** cabello, sombreros y cascos, máscaras y visores, capas, mochilas, armaduras, accesorios, armas, efectos, y variantes de color y estampado preparadas para cada pieza. Lo que no cabe se ve en gris con su motivo; si poner algo quita otra cosa, se avisa antes. «Regresar» deshace.
5. **Familias de cuerpo:** minifigura, Big Fig, corta (Yoda) y droide (R2-D2); se pueden sumar otras sin rehacer el sistema. Cada familia usa su propio esqueleto y sus animaciones.
6. **Calidad en dos niveles:** ningún personaje entra solo porque se pudo construir; Elías lo revisa antes. **Versión jugable:** las piezas que distinguen al personaje, reposo, saludo o entrada, victoria, derrota y especial en algunos. **Versión pulida:** la lista completa de calidad, con Iron Man y Hulk del laboratorio como referencia. Primero se juega, después se pule.
7. **Producción privada:** los personajes y las piezas se arman con Figure Forge a partir de los juegos LEGO de PC de Elías. Lo que sale de un juego nunca va al repo ni a una página pública; se sirve solo desde almacenamiento privado. La app es de uso personal con amigos.
8. **Personajes antiguos:** los 49 personajes y el personalizador de libro de cómic salen de la app y se conservan como respaldo. Las figuras guardadas por los jugadores se respaldan y salen con la migración de la fase 5, que se presenta antes con su procedimiento y plan de reversión (D-002).
9. **Primera tanda real:** 123 personajes de LEGO Marvel Super Heroes (126 exportados; Legolas, Aragorn y Gandalf salen del catálogo por ahora porque el juego no trae sus texturas). Todos siguen «sin revisar» hasta que Elías los apruebe a la vista. Los personajes de otros juegos (DC, Star Wars, Harry Potter, Piratas, Sonic) quedan para tandas siguientes.

**DECISIÓN (v1.65, Elías, 26 de noviembre) — Fondo y canción por personaje.** Cada personaje trae un tema (fondo + canción), **por saga con excepciones**: X-Men, Marvel general (respaldo de todo Marvel), Liga de la Justicia, Suicide Squad, Star Wars, futbolistas; y propios para Iron Man, Capitán América, Deadpool, Spider-Man, Thor, Hulk, Batman, Joker, etc. Al personaje que le falte fondo o canción usa el de su saga. Lo creado desde cero no tiene tema. Momentos:
1. **HUB y taller (Personalizar), en tu celular:** el fondo de tu personaje en juego reemplaza la azotea (la figura va en su plataforma) y su canción suena en vez de la del HUB (también en Perfil). Varias canciones en un tema: una al azar por carga.
2. **Lobby (celulares y TV):** la pared de cada cabina lleva el fondo del personaje de cada quien, sin canción.
3. **Resultados en la TV:** el fondo del ganador y unos 8 segundos de su canción (con empate, el cuarto de siempre y sin canción).
4. **En partida:** nada cambia.
Licencias: la música tiene derechos de terceros, solo uso privado. No va en el repo ni en GitHub Pages: vive en el bucket privado `temas-privados` (migración 047) y solo la baja quien puede ver personajes privados. El material y los scripts viven en `juegos-fiesta\audio-personajes` (`preparar-temas.py`, `subir-temas.mjs`, `temas.csv` para excepciones). **PENDIENTE:** música libre o propia antes de abrir ALV a más gente.

**DECISIÓN (v1.64, Elías, 26 de noviembre) — D3, rediseño del personalizador.** Cambia los puntos 1 y 3 de D3 v1.62 (y del 4 solo los accesorios, que pasan al básico). Se publica cuando Elías apruebe las capturas.
1. **Entrada:** el mueble de madera «Mi colección» (arte de Elías) con los 3 personajes parados en sus nichos. Nicho vacío: «Crear» o «Elegir» ahí. Nicho ocupado: tocarlo lo pone en juego; tocarlo otra vez lo abre para editarlo. Abajo, «Crear figura» (grande) y «Elegir personaje». Lo nuevo cae en el primer nicho vacío; con la colección llena, reemplaza la figura en juego.
2. **Editor (segunda vuelta, referencia «Taller de personajes» de Elías):** secciones en una barra lateral neutra (solo la activa con su color y palomita si tiene cambios); la figura al centro con girar, acercar a la cara y «Gestos», y se puede tocar una parte para abrirla; a la derecha la sección con su encabezado («Cara · 6 de 10»), pestañas subrayadas, filtros como chips discretos y la rejilla; abajo deshacer, rehacer, «Restablecer» y «Guardar personaje». La pieza elegida crece, brilla, lleva borde amarillo y palomita.
3. **Siete secciones:** Trajes (el personaje original completo; se elige y luego se le cambian piezas), Cabeza (cara, pelo, piel), Torso, Brazos (brazos y manos), Piernas (piernas y cadera), Accesorios (capas y objetos, cascos) y Movimientos. Cambiar de sección voltea la hoja como el libro del personalizador anterior.
4. **Switch Originales / Común**, uno para todo el editor, arriba y distinto a los demás botones (perilla que se desliza). Originales: piezas de los personajes, por saga, con fondo de cómic. Común: piezas de producción, por tipo (caras normales, con pestañas, con cicatrices, enojadas, máscaras; pelo corto, largo, gorras y cascos; ropa casual, camisas, uniformes y trajes de héroe), con fondo de clóset.
5. **Movimientos especiales:** saludar, ganar, perder y especial; cada uno con el de un personaje (por saga) o uno genérico, o «De siempre». Al elegirlo, la figura lo hace. Si el movimiento usa un objeto del personaje (el martillo de Thor), la figura lo hace sin el objeto.
10. **Cómo se ve (decisiones de Elías del 25 y 26 de noviembre):** dirección A, con el estilo cómic del HUB y del lobby (tipografía, íconos, botones y dinámica). El personalizador es una **página de cómic** («Mientras tanto, en el vestidor…»): al entrar, el HUB se voltea como hoja y al salir regresa. Los gestos salen en una **rueda** al tocar al personaje (Saludar, Ganar, Especial, Perder), en lugar de botones. Íconos y fondos generados por Elías. Las caras conservan sus gestos del juego, salvo cuatro personajes con cara fija.

Estado (26 de noviembre): fases 1 y 2 cerradas; galería y constructor básico construidos en una zona aparte del código (`src/personajes/`, `tools/personajes/`), sin conectar a HUB, lobby ni TV (eso es la fase 5) y sin publicar en la app, porque el catálogo es privado y el repo es público.

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

**DECISIÓN (v1.48, Elías, 18 de noviembre) — tienda nueva, enfoque A:** se levanta D-001 y se construye la tienda con monedas que guarda y cobra el servidor, sobres que se tiran en el servidor y dan piezas bloqueadas de la 033 (lo común ya es libre), personajes (trajes), compra directa, colección con contador, ofertas diarias y comodines con inventario por cuenta. Los tres archivos congelados (`Tienda.tsx`, `servicios/tienda.ts`, `engine/inventario.ts`, tienda 2D que cobraba XP) se reemplazan. Se construye en 5 etapas; la 1 es solo visual en la demostración sin nube. Sin dinero real. Plan completo: `ALV_PLAN_TIENDA.md` (fuera del repo).
**DECISIÓN (v1.49, Elías, 19 de noviembre):** aprobó tal cual la propuesta de abajo (decisiones 2 a 6 del plan). Comodines a la venta: solo **Pasa turno** y **Cambio de pregunta**; Escudo no se vende hasta confirmarlo (6A.4). Sobres de piezas sin repetidas. El desbloqueo directo de piezas pasa de XP a monedas (rara 80, épica 200, legendaria 400), y los retos ya cumplidos dan +15 monedas en lugar de +40 XP (etapa 3). El bono de monedas por lugar sigue la misma regla de podio que la XP (1 lugar con 2 o 3 jugadores, 2 con 4 o 5, 3 con 6 o más).
~~**PROPUESTA (v1.48)**~~ **Aprobada en v1.49:** monedas 10 por jugar + 8/5/3 por lugar, tope 300 al día y regalo de bienvenida de 150; sobres Básico 50 (2 piezas), Accesorios 120 (3), Comodines 150 (3 comodines), Mixto 180 (2 piezas + 2 comodines) y Épico 200 (3 piezas, al menos 1 épica), con probabilidades a la vista; garantía de épica al 8.º sobre sin épica y de legendaria al 25.º; piezas sin repetidas (v1.20) y comodines repetibles hasta 9 por tipo; compra directa rara 80, épica 200, legendaria 400 monedas (sustituiría el desbloqueo con XP de la 033); ofertas: 3 al día. La tienda vieja de la 004 y 005 (`comprar_sobre`, cobra XP) se apaga quitando el permiso, sin borrar tablas.
**Hecho en v1.48 y v1.49 (publicado el 19 de noviembre): etapas 1 y 2**: pestañas Sobres y Colección (Personajes, Accesorios y Ofertas dicen «¡Pronto!»), los 5 sobres con contenido posible, probabilidades y garantía a la vista, y la apertura (sacudir 3 veces, rasgar deslizando, luz del color de la mejor carta, cartas que se voltean una a una, «¡Nuevo!», «Ponérmelo» que pone la pieza en la figura en juego), con sonido y vibración. Con nube compra con la migración 036 (monedas y tirada en el servidor). Comodines a la venta: Pasa turno y Cambio de pregunta (Escudo se quitó en v1.49).
**REEMPLAZADA (v1.46, 6A.11 C1):** la tienda cobra en monedas (sobres, piezas, accesorios y outfits); la XP solo sube de nivel y el nivel desbloquea cosas del personalizador.
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
**REEMPLAZADA (v1.46, 6A.11 C3):** la matriz «todos con todos» de abajo queda sustituida por la compatibilidad por juego de 6A.4.
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

**DECISIÓN (v1.54, Elías, 23 de noviembre) — Ranking, Logros y Salón de la Fama.** Plan completo en `juegos-fiesta\ALV_PLAN_RANKING_LOGROS.md` (versión 2). Reemplaza las pestañas de v1.5 y v1.21 (ver abajo).
- **D0.** Los logros no dan XP (se ratifica v1.21 (5)). Recompensas: insignias, títulos, marcos, accesorios, poses, efectos y piezas coleccionables. La XP no cambia por esta función. **D3:** el tope diario de 600 sigue igual.
- **D1. MVP:** individual, el de más puntos de la partida; parejas o equipos, el de más puntos dentro del grupo ganador (con grupos empatados en 1.º, entre los integrantes de todos ellos). Empates: MVP compartido. Sin votación.
- **D2. Temporada:** mes calendario en hora de México. Solo se reinicia el ranking de temporada; XP, niveles y logros se conservan. Campeones al Salón de la Fama.
- **D4.** Parejas y equipos se reconocen por sus integrantes (etapa 1); nombre, color e insignia en la etapa 2. Sin equipos permanentes.
- **D5.** El filtro «Mi grupo» se llama **«Amigos Legendarios Verdaderos»**: gente con la que compartiste sala. No hay sistema de amigos. Es el filtro por omisión.
- **D6.** Reconocimientos por votación (más divertido, bromista, alma de la fiesta, «El impredecible de la noche») en la etapa 2.
- **D7.** Bebidas: solo con Drunk, en tono de broma, sin XP, monedas, ventajas ni rankings competitivos; cada quien puede ocultarlas.
- **D8.** Ranking Global y Amigos Legendarios Verdaderos, con filtro de temporada. Muestra posición, avatar, apodo, nivel y Puntos ALV. Solo cuentas registradas. Opción «Aparecer en el ranking Global», encendida por omisión.
- **D9. Puntos ALV** (nombre nuevo para no chocar con los puntos competitivos de 6A.5): 1.º 3, 2.º 2, 3.º 1, resto 0. Empates comparten lugar y se salta el siguiente (1, 1, 3). Cuántos lugares puntúan sale de las unidades que compiten, con la misma regla de la XP (2–3: solo 1.º; 4–5: dos; 6+: tres). En parejas y equipos compite el grupo y cada integrante recibe los puntos de su grupo. ALVersus cuenta como equipos; los bandos no tienen ranking propio. Cuentan solo partidas terminadas con al menos la mitad de las rondas planeadas y un mínimo de 3, con 2 o más cuentas registradas; Bienvenida y la partida «copas» no cuentan. Los invitados ocupan lugar pero no aparecen ni ganan Puntos ALV. La racha solo mira partidas que dieron Puntos ALV.
- **D10.** Azar: Ruleta, Dados HOT y Verdad o reto con dados o ruleta. Deducción: El impostor, ¿Quién es más probable? y Conoces a tu pareja.
- **Pestañas.** Ranking: General, Individual, Parejas, Equipos, Torneos y Récords. Logros: Mi colección, Ocultos, Por minijuego, Colectivos, Objetivos y Recompensas. «Esta reunión» pasa a Torneos como **Torneo de la noche**; «Histórico» queda en General sin filtro de temporada; «Historial de partidas» pasa al Perfil (etapa 3).
- **Etapas.** 1: resultados por jugador (migración 040), ranking individual, parejas, equipos, torneos simples (de la noche y los que abre el administrador), colección de logros visibles con 3 destacados y aviso de logro. 2: ocultos, logros de nivel, objetivos, votaciones, títulos, marcos e identidad de grupos. 3: temporada formal, Salón de la Fama, récords, recompensas especiales y estadísticas avanzadas.
- **Pastilla PTS del HUB:** muestra los Puntos ALV de la temporada (reemplaza la PROPUESTA del 20 de noviembre que mostraba la XP total).
- **PENDIENTE (etapa 3):** al borrar una cuenta, su lugar en el Salón de la Fama queda como «Jugador retirado», sin apodo ni figura. **PENDIENTE (etapa 2):** si los objetivos diarios dan XP.
- Riesgo aceptado: el aparato que cierra la partida manda los resultados y el servidor los valida, como hoy la XP, hasta que el motor pase al servidor.

**DECISIÓN (v1.56, Elías: «Sigue con etapa 3») — Ranking y Logros, etapa 3 (migración 044).**
- Temporada formal (D2): al terminar cada mes (hora de México) se guarda una foto fija: top 3 individual por Puntos ALV, mejor pareja y mejor equipo. El 1.º recibe el logro «Campeón de temporada» (28 logros). La foto no cambia después.
- Salón de la Fama: temporadas y campeones de torneos. Sin apodo guardado; si la cuenta se borra sale «Jugador retirado» (resuelve el choque 3 de v1.54).
- Récords históricos: rey del caos, el incansable, el sobreviviente, el más desafortunado, el traicionero, el bromista (votos), el noctámbulo (11 pm a 5 am) y el fiestero (solo partidas con Drunk, sin puntos ni XP; cada quien puede ocultarlo, D7).
- **PENDIENTE:** recompensas especiales (poses, efectos de entrada, accesorios), historial de partidas y estadísticas avanzadas en el Perfil, torneos con rondas y llaves.

**DECISIÓN (v1.55, Elías: «sigue con la etapa 2, publicar directo») — Ranking y Logros, etapa 2 (migración 043).**
- Logros ocultos: «¿Y tú qué haces aquí?», «El sospechoso habitual», «El intocable», «El noctámbulo» y «Caos absoluto»; se ven como silueta con pista hasta ganarlos. «Fantasma», «Última esperanza» y «No era personal» del plan no se pueden medir con lo que guarda el motor; «El intocable» (gana 3 veces siendo impostor) toma uno de esos lugares.
- Progresión: «Leyenda local» (nivel 10), «ALV Legendario» (nivel 20) y «Constante» (10 objetivos). Total: 27 logros. Siguen sin XP (D0).
- **PROPUESTA (valores):** objetivos del día (juega 3 partidas 100 XP, gana una 100, prueba un juego nuevo 150, juega con 3 personas 200) y de la semana (gana 5 300, juega 15 300, MVP 3 veces 250), en hora de México, cobrados a mano y dentro del tope de 600 XP al día. Resuelve T16 con los valores del encargo; Elías puede cambiarlos.
- Votaciones de la noche (D6): más divertido, el bromista, alma de la fiesta y el impredecible de la noche; desde Ranking → Torneos mientras la sala está abierta o hasta 24 h después; nadie vota por sí mismo; no se dice quién votó. Ranking de reconocimientos en Individual.
- Título y marco: cada logro ganado da su nombre como título y su marco por rareza; uno en uso; se ve en el Ranking.
- Identidad de parejas y equipos (D4 etapa 2): nombre, color y emoji, que pone cualquier integrante.

**DECISIÓN (v1.5, REEMPLAZADA en v1.54):** existe la pestaña Ranking con Sesión (ordena podio y TOP), Histórico (XP acumulada), Parejas e Historial de partidas. Equipos se agrega cuando exista el modo por equipos; Logros, semanal y mensual siguen como propuesta.

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

**DECISIÓN (v1.44, Elías, 18 de noviembre) — El impostor con eliminación:** puede haber varios impostores (lo elige el anfitrión). Por vueltas: cada quien, en orden, dice su palabra en voz alta y la escribe en el pizarrón de su celular; la TV muestra solo los personajes con su color de jugador y la palabra de cada quien. Al final de la vuelta todos votan; el más votado queda eliminado y su personaje sale de escena. Si atraparon a todos los impostores, termina; si no, sigue otra vuelta con la misma palabra. En el celular, la minifigura va a un lado del lector de huella y abajo el pizarrón. Sustituye a las rondas sueltas (una palabra nueva por ronda), que solo quedan para reconstruir partidas guardadas antes.
**DECISIÓN (v1.44, Elías aprobó los puntos, 18 de noviembre):** el punto (c) queda aprobado. **PROPUESTA (v1.44, el resto falta aprobarlo):** (a) empate en la votación: nadie sale; (b) los impostores ganan si igualan a los civiles en juego o si se acaban las vueltas (una por jugador); (c) puntos: votar por un impostor +1, impostor que sobrevive a una votación +1, al final +2 a cada civil si ganan los civiles o +3 a cada impostor si ganan ellos; (d) con varios impostores, cada uno sabe quién es su cómplice; (e) máximo de impostores: siempre menos que los civiles (con 4 jugadores, 1; con 5 o 6, 2; con 7 u 8, 3); (f) la palabra no se revela hasta el final; (g) quien sale ya no habla ni vota.
**DECISIÓN (v1.57, Elías, 24 de noviembre) — El impostor en la nave.** Misma mecánica de vueltas y eliminación, ambientada en una nave con identidad de ALV (sin copiar ningún juego existente): las minifiguras de los jugadores sentadas alrededor de una mesa con el botón para votar al centro y la pantalla de votaciones arriba (TV); el expulsado sale volando al espacio. (1) Siempre se puede votar «Nadie»; si «Nadie» gana o empata, o hay empate entre personas, nadie sale. (2) Puntos de las partidas nuevas: votar por un impostor +1; impostor que sobrevive cada votación +1; al final +5 a cada impostor si ganan, +3 a cada civil si ganan. Saltar no da nada. Las partidas de antes conservan +2/+3. (3) Castigo: si ganan los impostores, a todos los civiles (también expulsados); si pierden, solo a los impostores. Con Drunk, un trago de lo que cada quien tenga (el agua cuenta); sin Drunk, un castigo leve. No da ni quita puntos ni XP. (4) Los expulsados no saben quién es el impostor hasta que acaba la partida. (5) Opciones del juego: votación a la vista (cada voto con el color de quien votó) o secreta; «Decir si era impostor» o «Guardar el secreto» hasta el final (si ya no quedan impostores, la partida acaba). (6) En Local, antes de la primera vuelta el teléfono pasa por todos para ver la palabra. **PROPUESTA:** valores por defecto (votos a la vista, decir si era impostor, castigo encendido), textos de la nave y las 16 cartas del mazo `castigo-nave`.

**DECISIÓN (v1.58, Elías, 24 de noviembre) — Sala de espera de la nave.** Se toma el flujo del género, no el aspecto de ningún juego. (1) Al elegir El impostor, el configurador no pide «Modo de juego» ni escenario; sí Herramientas, Intensidad y Resumen. Después de la pantalla de carga (solo la primera partida) se entra a la sala de espera de la nave: las minifiguras de pie y el administrador configura ahí cuántos impostores, la categoría (con imagen), votación a la vista o secreta, decir o no si el expulsado era impostor, pista para el impostor y castigo. (2) Al iniciar, cada quien ve su papel con la huella: civil con la palabra; impostor con quiénes son los otros impostores y la pista (si está encendida) o la categoría; en Local el teléfono pasa por todos. Las figuras caminan a la mesa. Cuando todos vieron (en línea, el administrador puede seguir sin esperar), «¡A discutir!». (3) En el tablero, la palabra de cada quien va a la derecha de su figura y los votos debajo (color de quien votó o gris si es secreta). (4) La figura expulsada sale girando al espacio. (5) Al terminar, «Volver a la sala de espera» abre la siguiente partida con las mismas opciones; «Salir de la nave» regresa al lobby. En la sala de espera se ven los puntos de la noche. Quien entra o sale lo hace en la sala de espera (el administrador saca a alguien; en Local agrega jugadores). (6) Categorías de la nave: Películas, Videojuegos, Series, Cantantes, Superhéroes, Personajes animados, Celebridades, Fútbol, Adultos (solo con Temperatura alta), Objetos y «Al azar». Las categorías anteriores quedan solo para partidas guardadas. (7) En el configurador, el escenario se elige al final para todos los juegos (antes del Resumen), con candado en los escenarios donde no se juega el juego elegido. **PROPUESTA:** las 250 palabras y sus pistas (`ALV_PISTAS_IMPOSTOR.md`), los textos de la sala de espera y los valores por omisión (1 impostor, al azar, a la vista, decir, sin pista, con castigo).

**DECISIÓN (v1.59, Elías, 24 de noviembre) — Sin sala de espera.** Reemplaza los puntos (1), (5) y parte de (6) de v1.58: no hay sala de espera de la nave; el lobby de siempre basta. Las opciones de El impostor (cuántos impostores, categoría con imagen, votación, al expulsar, pista y castigo) vuelven a «Modo de juego» del configurador (sin escenario). Al iniciar, después de la pantalla de carga, las figuras ya están sentadas en la mesa y empiezan los papeles con la huella; luego «¡A discutir!». Al terminar se regresa al lobby como en los demás juegos. Siguen igual: papeles con compañeros y pista, palabra a la derecha de cada figura, votos de color o grises, expulsión con la figura 3D girando, las 10 categorías de la nave y el escenario al final del configurador para los demás juegos.

**DECISIÓN (v1.60, Elías, 24 de noviembre) — Pantallas de El impostor en la nave.** Elías las revisó una por una. (1) Regla para toda la app: cada sección cabe en una pantalla, sin bajar ni ir a los lados; botones siempre a la vista; deslizar en vez de buscar. (2) «Opciones del juego» a la mitad: a la izquierda un carrusel con las imágenes de 1, 2 o 3 impostores y una rueda de categorías (la del centro es la elegida); a la derecha interruptores (votos secretos, decir si era impostor, pista, castigo). (3) El papel: tu figura 3D en el espacio, IMPOSTOR en rojo o CIVIL en turquesa, la huella y «Ya lo vi». (4) Vuelta de palabras: el cuarto de la nave visto desde arriba a toda la pantalla, la mesa 3D con las figuras sentadas y la palabra de cada quien en un globo sobre su cabeza; desde la vuelta 2, un botón con las palabras de cada vuelta. (5) Votación: una pizarra que se abre solo al votar y ocupa casi toda la pantalla (figura, nombre, palabra y las de antes, sello «Votó», tachados los que salieron, «Nadie, todavía»). (6) Expulsión: espacio negro con estrellas; la figura cruza de izquierda a derecha girando, empujada por la nave, y a su paso se escribe «X no era el impostor.» o «X era el impostor.» con «impostor» en rojo, y luego cuántos impostores quedan. (7) Si se acaba, pantalla de Victoria (de los civiles o de los impostores) con los ganadores como minifiguras de frente; luego el final en páginas que se deslizan (resultado, castigo, posiciones). (8) La TV usa lo mismo en grande. (9) «Terminar» y «Cerrar» solo en la barra del anfitrión; los invitados en línea no tienen botón para salir durante la partida. Se siguen llamando «civiles» (Elías lo pidió así por ahora). Imágenes de Elías: 1, 2 y 3 impostores y el cuarto de la nave.

**DECISIÓN (v1.61, Elías, 25 de noviembre) — Intensidad de El impostor y resumen del configurador.** (1) En El impostor la Temperatura es para las palabras: en Frío solo las de siempre; en Caliente se suman palabras subidas de tono en cada categoría; en Extremo también las de adultos (películas clasificación R y más) y se abre la categoría Adultos. El Voltaje ya no abre lo adulto en El impostor. (2) El Voltaje es para los castigos al que pierde: cada nivel saca sus castigos (más fuertes al subir), siempre sin contacto con nadie y los de trago «de lo que tengas». Sin «Castigo al que pierde», el Voltaje no se usa. (3) El resumen «¡Todo listo!» se ve como la imagen de Elías: título al centro, panel de vidrio con el juego grande a la izquierda; a la derecha Nivel, Opciones y Herramientas (aunque no haya temporizador), y Modo y Escenario en los juegos que los usan; abajo los jugadores con la burbuja del lobby y «Editar jugadores» (regresa al lobby); al pie la partida predeterminada («Cargar la predeterminada» si hay otra) junto a «¡Comenzar!». (4) El papel ya no se anuncia por fuera (reemplaza el punto 3 de v1.60): como desbloquear el celular, arriba el medallón del HUB (marco, busto, estrella con el número de jugador y punto verde) y el nombre, y abajo un lector de huella redondo; mientras se mantiene el dedo, dentro del círculo sale la palabra (civil) o «Impostor» con la pista o la categoría y los compañeros. Por fuera todo se ve igual para todos y no hay figura 3D. «Ya lo vi» y «¡A discutir!» con la caja de bloques y la letra del lobby. El mismo medallón va en los jugadores del resumen, en la espera de papeles y en «Pásale el teléfono» (Local), que también usa la caja de bloques del color del jugador. **PROPUESTA:** las palabras por nivel con sus pistas (`ALV_PISTAS_IMPOSTOR.md`) y las 32 cartas nuevas de `castigo-nave` (nivel 2 y 3).

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

**ACTUALIZADO (v1.45):** Trivia ALV, Verdad o reto, El impostor y Misión secreta quedan definidos en 6A.6.
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

~~**PENDIENTE:** confirmar si dentro de una partida se pueden perder puntos de ronda, que no son XP, o si tampoco.~~ **Resuelto en v1.45 (6A.5):** los puntos competitivos de una ronda pueden ser negativos; la XP no se descuenta.

Principios:
- La puntuación debe estar ligada a acciones verificables por las reglas del minijuego.
- Debe distinguirse puntuación de ronda, XP de sesión y registros persistentes.
- Las reglas deben explicarse antes de iniciar la ronda.
- Evitar penalizaciones sorpresa.
- Definir límites y tratamiento de empates.
- La puntuación del podio se basa en la XP obtenida en la sesión. **REEMPLAZADA (v1.46, 6A.11 C2):** el podio lo deciden los puntos; hay podio al final de cada juego y copas por categoría al cerrar el lobby.
- La XP acumulada histórica no se usa para determinar el podio de esa sesión.

~~**PENDIENTE:** establecer una plantilla de puntuación para cada minijuego: acción, condición de éxito, puntos ganados, penalización, desempate, límite y tratamiento de abandono/desconexión.~~ **Resuelto en v1.45:** plantilla en 6A.8.

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

**PENDIENTE (v1.50):** el catálogo de personajes creció a 25 de Marvel, DC, Star Wars y Harry Potter, con piezas LDraw de esos personajes (casco de Darth Vader, casco mandaloriano, cabeza de Yoda, máscara de Wolverine) y portadas de las tarjetas con logotipos de terceros. Elías lo permite mientras la app no se publique ni venda; el riesgo de abajo sigue igual.
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

**DECISIÓN (v1.22, Elías aprobó la Fase 4 completa, 15 de noviembre).** Referencia con simulador (El impostor, ¿Quién es más probable? y Verdad o reto en 12 momentos, con TV, computadora y sin pantalla): página «ALV Fase 4 Multipantalla» (https://claude.ai/artifact/UL3rgCv2HCXXnGYu7xtBdZ, fuente `alv2\fase4\` fuera del repo).

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
- Menores de 18: mensaje de bloqueo hasta corregir la fecha. Intensidad: Temperatura (preguntas) y Voltaje (retos), 3 niveles cada uno (v1.52; antes 5 en v1.28), nivel general de la sala por partida (sustituye el termómetro de 4 niveles); Drunk como interruptor aparte. Comodines en todos los juegos, de un solo uso; pasar solo con comodín. Cartas de trago obligatorias con la bebida que cada quien elija; tomar nunca da XP. Modo Avanzado también en celular (v1.26).
- El lenguaje de la app usa siglas con ingenio.
- Presentador: ALV-I.A., apodo «Don ALVur» cuando se pone formal; figura y diálogos pendientes (1.3.1; v1.43).
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

## v1.65
- 26 nov 2026. Fondo y canción por personaje (por saga con excepciones) en HUB, taller, cabinas del lobby y resultados en la TV; bucket privado `temas-privados` (047).

## v1.64
- 26 nov 2026. D3 (sección 10): rediseño del personalizador pedido por Elías: entrada con el mueble «Mi colección», editor como el «Armario» del Centro de Mando GB en estilo cómic, seis secciones en viñetas con vuelta de hoja, switch Originales / Genéricas por parte (por saga y por tipo), Accesorios y Movimientos especiales por gesto; después, sección Trajes con los personajes originales completos; tercera vuelta (26 nov, noche): sin vuelta de hoja entre secciones, entrada con iris de cómic, tocar un espacio del mueble abre el taller, filtro en dos niveles (saga y grupo), «Color original» y pelo rosa. Cambia los puntos 1 y 3 de D3 v1.62. Sin publicar hasta que Elías apruebe las capturas. Sin cambios de base.

## v1.63
- 26 nov 2026. Modo Mini-Juegos con su lista inicial y la ficha de «Esquiva la bala» (6A.6 E y F); Físico como sala de personajes de frente con puntos, castigos y retos que da el anfitrión y juegos físicos en la TV (6A.6 G, resuelve C15); «Palabra prohibida» pasa a ser el primer juego de Físico y el juego viejo con ese nombre se llama ahora «Descríbelo sin decirlo» (resuelve C16); Modo libre como cuarta tarjeta de Modos (6A.6 H). Prototipos en una zona aparte del código, sin publicar. Sin cambios de base (los puntos de Físico ya los guarda la 040).

## v1.62
- 26 nov 2026. D3 (sección 10): sistema de personajes y personalizador nuevos, aprobado por Elías. «Mi personaje» con Elegir y Crear, básico de 4 categorías, avanzado aparte con reglas de compatibilidad, familias de cuerpo, calidad en dos niveles, producción privada con Figure Forge y recursos de juegos solo en almacenamiento privado. Primera tanda real: 123 personajes de LEGO Marvel Super Heroes, sin revisar todavía. Personalizador en estilo cómic, en una página de cómic, con rueda de gestos. Los 49 personajes viejos se conservan como respaldo. Formato en `ALV_FORMATO_PERSONAJES_V3.md`. Sin cambios de base.

## v1.61
- 25 nov 2026. El impostor: Temperatura para las palabras (nivel 2 y 3 por categoría) y Voltaje para los castigos (32 cartas nuevas). Resumen del configurador con panel de vidrio. El papel de El impostor se ve solo dentro del lector de huella.

## v1.60
- 24 nov 2026. Pantallas de El impostor en la nave (16.2): regla de una pantalla sin bajar para toda la app, opciones a la mitad, papel, mesa 3D con globos de palabra, pizarra de votación, expulsión con letras al paso, Victoria, TV igual; terminar solo para el anfitrión. Código publicado.

## v1.59
- 24 nov 2026. El impostor sin sala de espera: los papeles se reparten en la mesa al terminar la carga; categorías y opciones en «Opciones del juego».

## v1.58
- 24 nov 2026. Sala de espera de la nave (reemplazada en v1.59), 10 categorías nuevas con pista de una palabra y escenario al final del configurador para todos los juegos.

## v1.57
- 24 nov 2026. El impostor en la nave: mesa con botón, votar «Nadie», votos visibles o secretos, revelar o no, castigo opcional, +5/+3 al final.

## v1.56
- 23 nov 2026. Ranking y Logros, etapa 3 (14.3): temporada mensual con foto fija y «Campeón de temporada», Salón de la Fama con «Jugador retirado», 8 récords con el fiestero ocultable. Migración 044 aplicada; código publicado.

## v1.55
- 23 nov 2026. Ranking y Logros, etapa 2 (14.3): logros ocultos y de progresión, objetivos del día y de la semana (valores PROPUESTA), votaciones de la noche, título y marco por logro, identidad de parejas y equipos. Migración 043 aplicada; código publicado.

## v1.54
- 23 nov 2026. Ranking, Logros y Salón de la Fama (14.3): D0–D10 de Elías y las decisiones técnicas del plan. Logros sin XP (ratifica v1.21), MVP por puntos, temporada mensual en hora de México, «Amigos Legendarios Verdaderos», Puntos ALV 3/2/1 con reglas de empate, partidas cortas y pocos jugadores, categorías de azar y deducción, pestañas nuevas (reemplazan v1.5), etapas 1–3, PTS del HUB con Puntos ALV. Aclaración en 6A.5: Puntos ALV y puntos competitivos son cosas distintas. Sin cambios de código ni base.

## v1.53
- 21 nov 2026. Decir que no: con Drunk se bebe; sin Drunk, comodín, perder puntos (también el grupo) o comprar el comodín en vivo con monedas. Eventos sorpresa y ¿Voy a tener suerte? como interruptores aparte; el segundo deja de ser comodín. Anécdotas en pausa. Decir que no sin comodín resta lo que valía la carta; comodín suelto a 50 monedas (3.2). Elías aprobó el plan y el borrador; etapa 1 construida sin cambio visible: cada carta lleva nivel 1 a 3 en su eje y marca de contacto, 282 cartas nuevas (565 en total) que solo verán las partidas con Temperatura y Voltaje. Etapa 2 construida: sección «Intensidad» del configurador con termómetro, voltímetro e interruptor Drunk (apagado y nivel 1 por omisión), cada eje como techo, sin repetir cartas en la partida y conteo de cartas; lo adulto de fuera de las cartas se abre con nivel 3. Elías decidió nivel exacto (cada nivel solo sus cartas) y los castigos salen en cualquier nivel. Publicado en main.

## v1.52
- 21 nov 2026. Temperatura + Voltaje pasa a 3 niveles por eje (Frío, Caliente, Extremo; Bajo voltaje, Alto voltaje, Sobrecarga), límites solo generales por partida, Drunk como interruptor aparte, consentimiento de contacto en los Términos y primera jornada oficial el 28 de noviembre (3.2). Solo documento; sin código ni base.

## v1.51
- 20 nov 2026. Género con Mujer, Hombre y «Prefiero no decirlo» (guardado como `otro`); ALVersus se acomoda solo según el género y el anfitrión puede editar bandos, equipos y parejas antes de iniciar (6A, junto a las modalidades). Términos y Condiciones y Política de Privacidad con créditos de Elías Cortés (`src/content/terminos.ts`, copia en `docs/TERMINOS_Y_CONDICIONES.md`); las marcas de terceros se declaran de sus dueños, sin afiliación.

## v1.50
- 19 nov 2026. D3 con tres modos (Básico, Personaje original y Avanzado), catálogo por saga con 25 personajes y sus versiones, aviso antes de quitar o reemplazar y «Regresar» (sección 10). Todas las piezas libres por ahora: migración 037 aplicada con autorización de Elías (piezas de la 033 inactivas, sobres de piezas pausados). Marcas: nota nueva en 19.1. Sin cambios de base.

## v1.49
- 19 nov 2026. Elías aprobó las decisiones 2 a 6 de la tienda (13.1): monedas, precios, probabilidades, garantía, piezas sin repetidas, desbloqueo directo con monedas y comodines a la venta (solo Pasa turno y Cambio de pregunta). Migración 036 (monedas, sobres en el servidor, comodines por cuenta, monedas por juego) aplicada el mismo día con autorización de Elías, tras prueba local y remota deshecha.

## v1.48
- 18 nov 2026. Elías aprobó el enfoque A de la tienda (13.1): se levanta D-001 y los archivos congelados se reemplazan. Monedas, precios, probabilidades, garantía y comodines a la venta quedan como PROPUESTA. Sin cambios de base.

## v1.47
- 18 nov 2026. Pantalla de recompensas al terminar cada partida (6A.11 C1 y C7, referencias de Elías): XP ganada, barra de nivel, próximo premio y piezas nuevas al subir de nivel. Migración 034 (XP nunca 0, todos los juegos) aplicada con autorización de Elías; 035 (premios por nivel) escrita, no aplicada. Tabla de premios por nivel como PROPUESTA.

## v1.46
- 18 nov 2026. Elías resolvió los 14 choques de 6A.9 (6A.11): tienda en monedas y XP solo para nivel; podio por puntos al final de cada juego y copas por categoría al cerrar el lobby; comodines al ganar partidas o con monedas; Verdad o reto con responder, retar o tomar; temporizador como herramienta; XP nunca 0; reloj como herramienta; ALVersus. Modalidades por juego en 6A.12 (decisiones y propuestas); el configurador ya filtra los juegos por modalidad.

## v1.45
- 18 nov 2026. Estructura común de los minijuegos (capítulo 6A, definición de Elías): lobby de 2 a 8 y orden de selección, cuatro modalidades, herramientas separadas de los comodines, tres sistemas de recompensa (XP, monedas y puntos competitivos), El impostor, Verdad o reto, Trivia ALV y Misión secreta, matriz de compatibilidad por juego, plantilla para definir cada juego y 14 choques o dudas por confirmar (6A.9). Referencias en 5, 6.2, 13.1, 13.4, 16.8 y 18; resuelto el pendiente de puntos negativos de ronda. Se recuperó el texto de tres líneas de 3.2 que se habían perdido por reemplazos fallidos en v1.27 a v1.29. Sin cambios de código, motor ni base.

## v1.44
- 18 nov 2026. Elías aprobó los puntos de El impostor (16.2 c) y pidió el configurador con tarjetas e ilustraciones por juego y «Cómo jugar» con opción de omitir. Después pidió el configurador estilo menú de juego de fiesta (nombre de la sección arriba, elegir y continuar, sin números de paso), las 4 ilustraciones de tipo de partida que él mandó, un resumen editable antes de iniciar y «Cómo jugar» con siguiente u omitir; la guerra de sexos se muestra como «ALVersus» (así viene en su ilustración). Configurar partida en cinco pasos: tipo de partida, juego, instrumento u opciones, escenario e Iniciar (6.4). El impostor con eliminación por voto y varios impostores (16.2), con sus reglas de desempate y puntos como PROPUESTA. Hecho en código, sin publicar.

## v1.43
- 18 nov 2026. Presentador ALV-I.A. («Don ALVur»), con su frase de presentación (1.3.1). Solo se registra: figura y diálogos pendientes. Sin cambios de código por esta versión.

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
- **D-001, tienda experimental:** la tienda encontrada en el árbol de trabajo permanece congelada. No está autorizada para implementación; su evaluación queda pendiente para una etapa posterior. Se corrige en v1.35 la línea «Orden que sigue» (tienda como siguiente desarrollo) para que no contradiga esto. El resto de ese orden (Temperatura y Voltaje, personalizador) no se toca en esta versión. **Levantada en v1.48** (13.1): Elías aprobó la tienda nueva; los archivos congelados se reemplazan.
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

**Fin del Documento Maestro ALV v1.65**  
Este documento debe actualizarse de forma incremental y conservar la distinción entre decisiones aprobadas, propuestas, pendientes y descartadas.
