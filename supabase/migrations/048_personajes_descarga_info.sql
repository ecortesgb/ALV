-- 048 · Los jugadores sí pueden descargar los personajes privados (26 nov 2026).
-- APLICADA en ngwxxptydgbhkyznjngt el 2026-11-27 ~03:45 UTC (alter policy por execute_sql).
-- Falla hallada con la cuenta nueva de Gisela tras la 047: Storage (v1.98) atiende la descarga autenticada con la operación
-- `object.get_authenticated_info`, y la política de la 045 solo dejaba `object.get_authenticated`: todo jugador que no fuera
-- administrador recibía 400 al pedir el índice. Ahora se permiten las dos (info solo da tamaño y tipo de un archivo que ya
-- puede descargar). Listar, firmar, subir y borrar siguen cerrados. Probada: Gisela info sí, listar no; cuenta sin perfil no.
alter policy "personajes privados: jugadores descargan" on storage.objects
  using (bucket_id = 'personajes-privados'
         and storage.allow_any_operation(array['object.get_authenticated', 'object.get_authenticated_info'])
         and (select public.puedo_ver_personajes()));
