-- Biblioteca de Minifig Studio: API pública (aplicada el 2026-11-14 desde otro hilo; no estaba en el repo). Recuperada de la
-- base vieja el 2026-11-22 y aplicada igual en el proyecto nuevo. La app ALV no la usa.
-- Vistas de solo lectura (respetan la seguridad de las tablas)
create or replace view public.biblioteca_colecciones with (security_invoker = on) as select * from biblioteca.colecciones;
create or replace view public.biblioteca_piezas      with (security_invoker = on) as select * from biblioteca.piezas;
create or replace view public.biblioteca_estampados  with (security_invoker = on) as select * from biblioteca.estampados;
create or replace view public.biblioteca_personajes  with (security_invoker = on) as select * from biblioteca.personajes;
grant select on public.biblioteca_colecciones, public.biblioteca_piezas, public.biblioteca_estampados, public.biblioteca_personajes to anon, authenticated;

-- Una colección completa para una app: colección, personajes y solo las piezas y estampados que usan
create or replace function public.biblioteca_coleccion(p_id text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with pers as (select * from biblioteca.personajes where coleccion_id = p_id),
  ids as (
    select distinct v as id from pers, jsonb_path_query(pers.piezas, 'strict $.**.id') j(v_json), lateral (select v_json #>> '{}' as v) x
    union select distinct x.v from pers, jsonb_path_query(pers.piezas, 'strict $.**.estampado') j(v_json), lateral (select v_json #>> '{}' as v) x
    union select distinct x.v from pers, jsonb_path_query(pers.piezas, 'strict $.brazos.*') j(v_json), lateral (select v_json #>> '{}' as v) x
    union select distinct x.v from pers, jsonb_path_query(pers.piezas, 'strict $.detalles[*]') j(v_json), lateral (select v_json #>> '{}' as v) x
  )
  select jsonb_build_object(
    'coleccion', (select to_jsonb(c) from biblioteca.colecciones c where c.id = p_id),
    'personajes', coalesce((select jsonb_agg(to_jsonb(p) order by p.nombre) from pers p), '[]'::jsonb),
    'piezas', coalesce((select jsonb_agg(to_jsonb(z)) from biblioteca.piezas z where z.id in (select id from ids)), '[]'::jsonb),
    'estampados', coalesce((select jsonb_agg(to_jsonb(e)) from biblioteca.estampados e where e.id in (select id from ids)), '[]'::jsonb))
$$;
grant execute on function public.biblioteca_coleccion(text) to anon, authenticated;

-- Carga (upsert) desde el script local con la llave de servicio. Nadie más puede llamarla.
create or replace function public.biblioteca_cargar(datos jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare n_col int; n_pz int; n_es int; n_pe int;
begin
  insert into biblioteca.colecciones (id, nombre, grupo, apps, actualizado)
  select r.id, r.nombre, coalesce(r.grupo,'Mis colecciones'), coalesce(r.apps,'{}'), now()
  from jsonb_to_recordset(coalesce(datos->'colecciones','[]')) as r(id text, nombre text, grupo text, apps text[])
  on conflict (id) do update set nombre = excluded.nombre, grupo = excluded.grupo, apps = excluded.apps, version = biblioteca.colecciones.version + 1, actualizado = now();
  get diagnostics n_col = row_count;

  insert into biblioteca.piezas (id, categoria, clave, nombre, ldraw, ldraw_par, fuente, licencia, datos, actualizado)
  select r.id, r.categoria, r.clave, r.nombre, r.ldraw, r.ldraw_par, coalesce(r.fuente,'ldraw'), r.licencia, coalesce(r.datos,'{}'), now()
  from jsonb_to_recordset(coalesce(datos->'piezas','[]')) as r(id text, categoria text, clave text, nombre text, ldraw text, ldraw_par text[], fuente text, licencia text, datos jsonb)
  on conflict (id) do update set categoria = excluded.categoria, clave = excluded.clave, nombre = excluded.nombre, ldraw = excluded.ldraw, ldraw_par = excluded.ldraw_par,
     fuente = excluded.fuente, licencia = excluded.licencia, datos = excluded.datos, version = biblioteca.piezas.version + 1, actualizado = now();
  get diagnostics n_pz = row_count;

  insert into biblioteca.estampados (id, categoria, clave, nombre, aplica_a, tipo, archivo, actualizado)
  select r.id, r.categoria, r.clave, r.nombre, r.aplica_a, coalesce(r.tipo,'dibujo'), r.archivo, now()
  from jsonb_to_recordset(coalesce(datos->'estampados','[]')) as r(id text, categoria text, clave text, nombre text, aplica_a text, tipo text, archivo text)
  on conflict (id) do update set categoria = excluded.categoria, clave = excluded.clave, nombre = excluded.nombre, aplica_a = excluded.aplica_a, tipo = excluded.tipo, archivo = excluded.archivo, actualizado = now();
  get diagnostics n_es = row_count;

  insert into biblioteca.personajes (id, nombre, coleccion_id, piezas, extensiones, origen, actualizado)
  select r.id, r.nombre, r.coleccion_id, r.piezas, coalesce(r.extensiones,'{}'), coalesce(r.origen,'{}'), now()
  from jsonb_to_recordset(coalesce(datos->'personajes','[]')) as r(id text, nombre text, coleccion_id text, piezas jsonb, extensiones jsonb, origen jsonb)
  on conflict (id) do update set nombre = excluded.nombre, coleccion_id = excluded.coleccion_id, piezas = excluded.piezas, extensiones = excluded.extensiones,
     origen = excluded.origen, version = biblioteca.personajes.version + 1, actualizado = now();
  get diagnostics n_pe = row_count;

  return jsonb_build_object('colecciones', n_col, 'piezas', n_pz, 'estampados', n_es, 'personajes', n_pe);
end $$;
revoke execute on function public.biblioteca_cargar(jsonb) from public, anon, authenticated;
grant execute on function public.biblioteca_cargar(jsonb) to service_role;
