-- 027: limpieza del personaje 2D. ESCRITA, NO APLICADA.
-- Solo se aplica con autorización expresa de Elías después de probar ALV 2.0 (Maestro §22.1).
-- Borra datos: no tiene vuelta atrás. Antes de aplicar, respaldar las tablas.
-- Dependencias revisadas el 15 de noviembre de 2026:
--   personajes  ← la app 2.0 ya no la lee (antes: servicios/sala.ts y cuenta.ts).
--   inventario  ← comprar_accesorio, comprar_sobre y leerCuenta de la app anterior.
--   public.saldos_de ← sustituida por privado.saldos_de (mig. 013); ninguna función la llama.
--   articulos_tienda y sobres ← catálogo 2D; se conservan hasta definir la tienda 3D (mig. 024).
begin;
  drop function if exists public.comprar_accesorio(text);
  drop function if exists public.saldos_de(uuid, uuid);
  drop table if exists public.inventario;
  drop table if exists public.personajes;
commit;
