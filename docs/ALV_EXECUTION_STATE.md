# ALV: estado de ejecución

Se actualiza al empezar y al terminar cada paso.

## Dónde va

- Fase 6, pasos 2 a 11 hechos en versión de prueba. Paso 12 (reglas de XP) sin empezar. Fase 7 (control de calidad) parcial.
- Publicado en `main` y en https://ecortesgb.github.io/ALV/ el 16 nov 2026 por instrucción de Elías.
- Maestro vigente: v1.35.
- 16 nov, segunda vuelta: 017, 018 y 028 aplicadas; modo invitado construido y probado contra el servidor real (dos invitados, ¿Qué prefieres? completo en una sala sin pantalla); etapa 1 del diseño entregada en `ALV_DIAGNOSTICO_DISENO.md`. El paso 1.5 se saltó por decisión de Elías.

## Pruebas corridas

| Prueba | Resultado | Fecha |
|---|---|---|
| `npm test` | 149 pasan | 16 nov |
| `npm run build` | pasa | 16 nov |
| Permisos con usuarios simulados (transacción deshecha) | sin fallas | 16 nov |
| Asesor de seguridad de Supabase | sin errores; avisos esperados | 16 nov |
| El impostor sin pantalla, 3 pestañas, modo local | completo hasta el podio | 16 nov |
| El impostor con pantalla, 4 pestañas, modo local | sala, arranque, pista y rueda en TV | 16 nov |
| Desbordes a 375 px en 10 pantallas | ninguno | 16 nov |
| Con cuentas reales en laptop, TV y celulares | **pendiente de Elías** | — |

## Migraciones

| Migración | Estado |
|---|---|
| 001 a 016 | aplicadas |
| 017 semilla privada, 018 acciones en orden, 028 invitados | aplicadas el 16 nov con autorización de Elías |
| 019 tiempo real, 020 solo mayores, 026 XP por reto y ranking | aplicadas el 16 nov |
| 021 a 025 | no existen |
| 027 limpieza | escrita en `supabase/pendientes/`, **no se aplica** |

## Problemas conocidos

- Contra el servidor real solo se probó con dos invitados en una computadora y un juego. Falta TV, celulares y El impostor con 3.
- La revelación tarda cerca de 6 s desde la última respuesta (2 s son el suspenso). Hay margen de mejora en el motor.
- Los códigos de sala pueden traer I y O, que se confunden con 1 y 0 al dictarlos.
- Sin revisión visual en 768 y 1920 px, ni medición de carga en 4G.
- Si la Pantalla se cierra a media partida, la partida espera a que vuelva: no se pasa sola al celular.
- La escena 3D de la sala puede cortar figuras en celulares angostos con muchos jugadores.

## No hecho

Paso 12, tienda, sobres y colección 3D (024, 025), código de recuperación (022), apodos e intentos (021), cuentas en un solo celular (023), personalizador Simple/Avanzado propio, motor Temperatura + Voltaje y contenido nuevo, espera al desconectado, «pedir pausa», entorno de pruebas aparte, informe final de entrega.

## Siguiente tarea exacta

1. Paso 0: modo invitado para probar sin cuenta (Maestro §3.2, v1.32). Sin esto Elías no ve las pantallas en el sitio publicado.
2. Luego, etapa 1 del diseño (solo diagnóstico, sin cambios de código) según `ALV_DISENO_NEON.md`. Esperar la aprobación de Elías de D1 a D4 antes de la etapa 2.
3. En paralelo, Elías prueba con aparatos reales (lista en `ALV_QA_PROTOCOL.md` §6). Decisiones abiertas en `ALV_DECISION_LOG.md` §3 y §6.
