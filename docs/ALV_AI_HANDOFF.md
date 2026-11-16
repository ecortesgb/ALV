# ALV: relevo entre modelos

Para continuar ALV sin la conversación anterior. Este archivo no repite a los demás: dice en qué orden leerlos.

## Qué leer, en orden

1. `../CLAUDE.md` del proyecto (fuera del repo, en `juegos-fiesta\CLAUDE.md`): dónde vive todo y la sección Estado.
2. `CLAUDE.md` del repo: reglas de seguridad, base de datos y producto. Son obligatorias.
3. `docs/ALV_EXECUTION_STATE.md`: qué está hecho, probado y pendiente.
4. `docs/ALV_DECISION_LOG.md`: qué decidió Elías, qué se decidió por cuenta propia y qué sigue abierto.
5. `docs/ALV_ARCHITECTURE_MAP.md`: carpetas y cómo se hablan.
6. `docs/DOCUMENTO_MAESTRO.md`: §21.3, §21.4, §22.1 y el historial. Es la fuente del producto.
7. `docs/ALV_DEVELOPMENT_PLAYBOOK.md`, `ALV_CODING_STANDARDS.md` y `ALV_QA_PROTOCOL.md` antes de escribir código.

## Antes de tocar algo, comprueba que entendiste

Contesta sin mirar el código y luego verifica:

- ¿Qué archivo es el único fuera de `src/engine` que llama a `aplicar`?
- ¿Qué aparato corre el motor con pantalla y cuál sin pantalla?
- ¿Por dónde viaja la semilla y quién puede leerla?
- ¿Qué palabras prohíbe la prueba de la frontera y en qué archivos?
- ¿Qué migraciones están escritas y sin aplicar, y por qué?

Si alguna respuesta no coincide con el código, vuelve a leer antes de cambiar nada.

## Restricciones

- El repo y la página son públicos: sin llaves, sin datos personales, sin anécdotas de los amigos.
- No se crean cuentas de prueba en la base real. Los permisos se prueban con usuarios simulados en una transacción deshecha.
- La migración 027 no se aplica sin permiso expreso de Elías. 017, 018 y 028 ya están aplicadas (16 nov, Maestro v1.35).
- No se editan a mano `src/ds/tokens.css`, `componentes.css` ni `iconos.ts`: se generan con `node tools/copiar-ds.mjs`.
- Sin dependencias nuevas.
- Una PROPUESTA o un PENDIENTE del Maestro no se construye como aprobado. Lo que cambia el producto, las reglas de un juego o la economía lo decide Elías.
- A Elías se le escribe simple y directo, sin jerga de git.

## Estado al entregar

Rama de trabajo `alv2-fase6`, unida a `main` y publicada el 16 nov 2026. El último commit estable es el de `main`. Siguiente tarea: ver `ALV_EXECUTION_STATE.md`, «Siguiente tarea exacta».

## Cómo se trabaja cada cambio

Leer lo relacionado, cambiar lo mínimo, `npm test`, `npm run build`, verlo en el navegador (modo local con varias pestañas `?yo=Nombre`), revisar secretos, commit, y actualizar `ALV_EXECUTION_STATE.md`, el Maestro si cambió el producto y la sección Estado del `CLAUDE.md` del proyecto.
