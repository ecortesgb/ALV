-- 047 · Temas de personaje privados (Elías, 26 nov 2026): fondo y canción por saga o personaje.
-- La música tiene derechos de terceros: solo uso privado, nunca en el repo ni en GitHub Pages. Vive en un bucket
-- PRIVADO aparte del de personajes (así las limpiezas del subidor de personajes nunca tocan los temas):
--   objetos/<sha256>.<webp|mp3>   cada archivo una vez (por contenido)
--   manifiesto.json               {version, generado, temas:{tema:{fondo:{g,c}, musica:[…]}}, personajes:{id: tema}}
-- Lo descarga quien puede ver personajes privados (public.puedo_ver_personajes, 045). Sube y reemplaza solo un
-- administrador (soy_admin) con el script de juegos-fiesta\audio-personajes\subir-temas.mjs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('temas-privados', 'temas-privados', false, 8388608, array['image/webp', 'audio/mpeg', 'application/json'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
                               allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "temas privados: jugadores descargan" on storage.objects;
create policy "temas privados: jugadores descargan" on storage.objects
  for select to authenticated
  using (bucket_id = 'temas-privados'
         and storage.allow_only_operation('object.get_authenticated')
         and (select public.puedo_ver_personajes()));

drop policy if exists "temas privados: admin lee" on storage.objects;
create policy "temas privados: admin lee" on storage.objects
  for select to authenticated
  using (bucket_id = 'temas-privados'
         and storage.allow_any_operation(array['object.list', 'object.list_v2', 'object.get_authenticated_info',
               'object.head_authenticated_info', 'object.delete', 'object.delete_many'])
         and (select public.soy_admin()));

drop policy if exists "temas privados: admin sube" on storage.objects;
create policy "temas privados: admin sube" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'temas-privados'
              and storage.allow_only_operation('object.upload')
              and (name ~ '^objetos/[0-9a-f]{64}\.(webp|mp3)$' or name = 'manifiesto.json')
              and (select public.soy_admin()));

-- El manifiesto se reemplaza borrándolo y subiéndolo otra vez (sin política de update: nada se sobrescribe).
drop policy if exists "temas privados: admin borra" on storage.objects;
create policy "temas privados: admin borra" on storage.objects
  for delete to authenticated
  using (bucket_id = 'temas-privados'
         and storage.allow_any_operation(array['object.delete', 'object.delete_many'])
         and (select public.soy_admin()));
