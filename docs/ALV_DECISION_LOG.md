# ALV: registro de decisiones

La fuente de las decisiones de producto es `DOCUMENTO_MAESTRO.md`. Aquí se anota quién decidió cada cosa de la Fase 6 y qué sigue abierto. Una propuesta no se construye como si estuviera aprobada.

## 1. Aprobadas por Elías

| Decisión | Dónde está |
|---|---|
| Arquitectura de ALV 2.0: Pantalla, Anfitrión y Jugador; el papel es del aparato | Maestro §21.3, §21.4 |
| Tecnología sin dependencias nuevas; motor en la Pantalla; XP solo en el servidor | Maestro §22.1 |
| Design System «Cine Cómic Nocturno» | Maestro §8.7 |
| Solo mayores de 18, sin modo familiar (D1) | Maestro §3.2, v1.25 |
| Pasar solo con comodín; cartas de trago sin exigir alcohol | Maestro v1.28, `CLAUDE.md` |
| Hacer los pasos 2 a 12 y la Fase 7 seguidos (sustituye a «se publica por pasos») | Maestro v1.30 |
| Publicar la versión de prueba en la página (16 nov 2026, «Sí, publica») | Maestro v1.31 |
| Modo invitado para pruebas; Elías borra a los invitados al terminar | Maestro §3.2, v1.32 y v1.33 |
| Aplicar 017 y 018; saltar el paso 1.5 | Maestro v1.35 |

## 2. Técnicas, tomadas sin consulta

| Decisión | Por qué | Consecuencia |
|---|---|---|
| Un archivo general por papel en `src/juegos/general/` (celular, tv, texto) en vez de una carpeta por mecánica | 11 mecánicas comparten casi toda la pantalla; separar ahora duplicaba código | Si una mecánica crece, se saca a su carpeta |
| La semilla viaja en la acción de arranque, no en `partidas` | Cierra el riesgo del impostor sin esperar a la migración 017 | `partidas.semilla` vale 0 en partidas nuevas |
| `enlace.ts` prueba primero lo nuevo (función `crear_partida_sala`, tipo `control`) y si el servidor no lo tiene usa lo de hoy | La app debía funcionar con y sin 017 y 018 | Al aplicar 017 y 018 no hay que cambiar código |
| Respaldo local sin servidor (localStorage y BroadcastChannel) | Probar varios aparatos en pestañas sin crear cuentas en la base real | Solo se activa si no hay Supabase configurado |
| El modo de la sala se guarda en `eventos.nombre` («ALV con pantalla», «ALV sin pantalla») | Evita una migración para un dato que ya tenía columna libre | El nombre de sala ya no se muestra |
| Parejas por orden de llegada cuando el número de jugadores es par | No existe todavía pantalla para armar parejas | Los juegos de pareja salen con candado si son impares |
| «No lo cumplí» vale 0 puntos; no hay botón de pasar | Regla v1.28: sin comodín se cumple o se responde | El motor sigue aceptando `paso` como valor |
| Un solo brillo en bucle por pantalla | Criterio de animación: un ciclo decorativo por pantalla | Se apaga el barrido de los botones que no son Jugar, sin tocar los archivos generados |
| Avisos y confirmación propios, animación en CSS | Se evaluaron Sonner y Motion; se descartaron por «sin dependencias nuevas» | `src/pantallas/comun.tsx` y `alv.css` |
| Logros calculados con los movimientos de XP del servidor | El historial local desapareció con la app 2D | Seis logros en `src/pantallas/Social.tsx`; no dan premio |
| El invitado es una cuenta desechable (correo interno `inv_…`) y no el acceso anónimo de Supabase | No hay que cambiar la configuración de acceso del proyecto y se borra igual que cualquier cuenta | Migración 028 |
| Botón Tienda con candado «Abre pronto» | No hay tienda 3D en el servidor | Se quita el candado al construir 024 y 025 |
| Ranking solo entre la cuenta y quienes han compartido sala | No exponer apodos a cualquier cuenta | Función `ranking_conocidos` |

## 3. Pendientes de Elías

1. Las 3 preguntas de `ALV_DIAGNOSTICO_DISENO.md` §7 (arte de los juegos, tono de rareza «especial», tablet).
2. Aprobar la etapa 2 del diseño.
3. La migración 027 (`supabase/pendientes/`) borra tablas. No se aplica sin su permiso expreso.
4. Con qué XP se compran los comodines fuera de partida (Maestro §13.1).
5. Entorno de pruebas con Supabase aparte: la organización ya tiene dos proyectos y uno más puede costar.
6. Sin fecha límite (v1.34): la prueba se hace cuando la app esté lista. Anécdotas de los amigos: datos personales, fuera del repo.
7. La XP por reto en vivo se guarda como `ganada` y cuenta para el tope diario de 600. Revisar en el paso 12.

## 4. Sustituidas o descartadas

- Decisión 5 de §22.1 («la Fase 6 se publica por pasos»): sustituida en v1.30.
- Decisión 7 de §22.1 (sala familiar): sustituida por D1 en v1.25.
- Personaje 2D, tienda 2D y XP guardada en el aparato: retirados del código en v1.30.

## 5. Decisiones de Elías del 16 de noviembre

- Acceso sin cuenta: modo invitado para probar, con etiqueta «Prueba», sin XP ni figura guardada ni escritura en la base. Confirma mayoría de edad sin guardar fecha (Maestro v1.32, §3.2). Pendiente: salas en la nube para invitados.
- Propuesta visual «Neon Party Universe»: recibida, no aprobada. Se anota en `docs/ALV_DISENO_NEON.md` con sus decisiones D1 a D5 (Maestro §8.8).

## 6. Pendientes nuevos

8. Acceso invitado a salas en la nube: usuario anónimo en la base o solo local (revisión del asesor antes).
9. Dirección visual: Cine Cómic Nocturno (recomendado) o Neon Party Universe; fuentes; sin monedas ni gemas; nombre visible; personajes sin LEGO.

## 7. Decisiones de Elías del 16 de noviembre (segunda ronda)

- Invitados de prueba: pueden entrar a sala en la nube y en local; se borra todo al terminar; los perfiles reales se crean después (Maestro v1.33, §3.2).
- Dirección: Cine Cómic Nocturno con partes de Neon Party. Fuentes Bangers y Barlow. Nombre «Amigos Legendarios Verdaderos». LEGO se mantiene para la prueba.
- Monedas vuelven; gemas = XP (Maestro §13.1).

## 8. Pendientes que quedan

- Monedas: cómo se ganan, cómo se gastan y precios.
- Propiedad intelectual de LEGO en repo público (Maestro §19.1): revisar antes de difundir fuera del grupo.

## 9. Cambios del 16 de noviembre (tercera ronda)

- Sin fecha límite para la prueba (Maestro v1.34, §3.2).
- Monedas o XP y sus precios: después de la prueba con jugadores (Maestro v1.34, §13.1). La tienda cobra en XP mientras tanto.

