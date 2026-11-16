# ALV: estado de ejecución

Se actualiza al empezar y al terminar cada paso.

## Dónde va

- Fase 6, pasos 2 a 11 hechos en versión de prueba. Paso 12 (reglas de XP) sin empezar. Fase 7 (control de calidad) parcial.
- Publicado en `main` y en https://ecortesgb.github.io/ALV/ el 16 nov 2026 por instrucción de Elías.
- Maestro vigente: v1.31.

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
| 017 semilla privada, 018 acciones en orden | escritas, **sin aplicar**: esperan autorización |
| 019 tiempo real, 020 solo mayores, 026 XP por reto y ranking | aplicadas el 16 nov |
| 021 a 025 | no existen |
| 027 limpieza | escrita en `supabase/pendientes/`, **no se aplica** |

## Problemas conocidos

- La conexión con el servidor real no se probó de punta a punta con cuentas.
- Sin revisión visual en 768 y 1920 px, ni medición de carga en 4G.
- Si la Pantalla se cierra a media partida, la partida espera a que vuelva: no se pasa sola al celular.
- La escena 3D de la sala puede cortar figuras en celulares angostos con muchos jugadores.

## No hecho

Paso 1.5 (prototipo HTML), paso 12, tienda, sobres y colección 3D (024, 025), código de recuperación (022), apodos e intentos (021), cuentas en un solo celular (023), personalizador Simple/Avanzado propio, motor Temperatura + Voltaje y contenido nuevo, espera al desconectado, «pedir pausa», entorno de pruebas aparte, informe final de entrega.

## Siguiente tarea exacta

Esperar la prueba de Elías con aparatos reales (lista en `ALV_QA_PROTOCOL.md` §6) y corregir lo que falle. Decisiones abiertas en `ALV_DECISION_LOG.md` §3.
