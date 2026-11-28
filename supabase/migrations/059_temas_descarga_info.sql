-- 059 · Los jugadores sí pueden descargar los temas privados (fondo y canción por personaje). Auditoría final, 28 nov 2026.
-- Misma falla que la 048 en personajes: Storage atiende la descarga autenticada con `object.get_authenticated_info` y la
-- política de la 047 solo dejaba `object.get_authenticated`. Todo jugador que no fuera administrador recibía 400 al pedir
-- manifiesto.json y se quedaba sin fondo ni canción de su personaje. Listar, firmar, subir y borrar siguen cerrados.
alter policy "temas privados: jugadores descargan" on storage.objects
  using (bucket_id = 'temas-privados'
         and storage.allow_any_operation(array['object.get_authenticated', 'object.get_authenticated_info'])
         and (select public.puedo_ver_personajes()));
