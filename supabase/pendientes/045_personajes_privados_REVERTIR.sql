-- REVERTIR 045 · Personajes 3D privados. NO APLICAR sin decisión de Elías.
-- Antes, vaciar el bucket con `node herramientas-locales\subir-personajes.mjs --vaciar` (Storage no deja borrar filas
-- de storage.objects a mano y no se debe dejar archivos huérfanos). Si el bucket tiene archivos, no se borra.
drop policy if exists "personajes privados: jugadores descargan" on storage.objects;
drop policy if exists "personajes privados: admin lee" on storage.objects;
drop policy if exists "personajes privados: admin sube" on storage.objects;
drop policy if exists "personajes privados: admin borra" on storage.objects;
drop function if exists public.admin_acceso_personajes();
drop function if exists public.admin_quitar_acceso_personajes(text);
drop function if exists public.admin_dar_acceso_personajes(text);
drop function if exists public.admin_quitar_entrega_personajes();
drop function if exists public.admin_fijar_entrega_personajes(text);
drop function if exists public.entrega_personajes();
drop function if exists public.puedo_ver_personajes();
drop table if exists privado.entrega_personajes;
drop table if exists privado.acceso_personajes;
delete from storage.buckets where id = 'personajes-privados'
  and not exists (select 1 from storage.objects o where o.bucket_id = 'personajes-privados');
