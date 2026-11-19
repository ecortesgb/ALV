-- 037 · Todas las piezas libres por ahora (Maestro v1.50, decisión de Elías 2026-11-19).
-- APLICADA 2026-11-19 con autorización de Elías («Sí, aplícala»); verificado con SELECT: 0 de 70 piezas activas, solo
-- «comodines» a la venta, piezas_jugador y figuras intactas, guardián encendido, asesor sin cambios. Antes se probó en local con PGlite (supabase/pruebas/037_local_pglite.mjs, 10/10) y en la base remota en
-- transacción deshecha el 2026-11-19 con autorización de Elías (supabase/pruebas/037_remota_prueba.sql, sin fallas; asesor sin cambios).
--
-- Qué hace (no borra nada; todo se puede revertir):
-- 1) Las piezas con rareza de la 033 quedan inactivas. Con eso:
--    · el guardián de figuras_jugador (privado.validar_piezas_figura) ya no las bloquea: solo mira las activas;
--    · desbloquear_pieza responde «pieza no válida» (no se cobra nada por algo libre);
--    · abrir_sobre no las ofrece.
--    Lo que cada jugador ya tenía en piezas_jugador se queda igual.
-- 2) Los sobres que traen piezas (básico, accesorios, mixto y épico) se pausan: con todo libre no tendrían qué dar
--    y responderían «ya tienes todo». El sobre de comodines sigue a la venta.
-- 3) Retos: siguen funcionando; el premio de pieza ya no hace falta (la app no muestra la página si no hay piezas activas).
--
-- La app lee qué piezas siguen activas (piezas_figura, ya legible por cualquier cuenta): sin ninguna activa trata
-- todo como libre y la tienda muestra solo los sobres sin piezas. No hace falta ningún permiso nuevo.
--
-- Para volver a bloquear (cuando Elías entregue su catálogo), pieza por pieza o todas:
--   update public.piezas_figura set activo = true where id in (...);
--   update public.sobres_tienda set activo = true where id in ('basico', 'accesorios', 'mixto', 'epico');
-- Ojo: al reactivar, las figuras ya guardadas con esas piezas no se tocan, pero el guardián rechazará el siguiente
-- guardado si el jugador no tiene la pieza; antes de reactivar conviene regalar las piezas en uso (como el paso 7 de la 033).

update public.piezas_figura set activo = false where activo;

update public.sobres_tienda set activo = false where piezas > 0 and activo;
