-- 045 · Personajes 3D privados (`ALV_PLAN_PERSONAJES_PRIVADOS.md`, fuera del repo). Necesita 012 y 028.
-- ESCRITA, SIN APLICAR. Aplicarla es decisión de Elías (D-002). Plan acordado con Codex (encargos
-- `herramientas-locales\encargos-codex\2026-11-26-personajes-privados-r1/r2/r3.md`).
-- Qué hace:
-- 1) Bucket PRIVADO `personajes-privados` (GLB, fotos webp e índices JSON; 8 MB por archivo). Arriba hay
--    `objetos/<sha256>.<ext>` (cada archivo una vez, nunca se sobrescribe) e `indices/<sello>.json` (uno por entrega).
-- 2) `privado.acceso_personajes`: quién puede bajarlos (como `privado.administradores`, nadie la toca desde la app).
-- 3) `privado.entrega_personajes`: cuál índice está vigente (una fila). Cambiarlo es una sola transacción.
-- 4) Políticas en storage.objects, todas limitadas al bucket y a operaciones exactas de Storage:
--    - jugadores con acceso: SOLO descargar con su sesión (`object.get_authenticated`). Ni listar, ni firmar enlaces,
--      ni info. Invitados, menores, cuentas sin permiso y anon: nada.
--    - administradores: subir (objetos/ e indices/), listar, ver info, descargar y borrar. Nunca firmar ni actualizar.
-- 5) RPC `entrega_personajes()` (sello vigente o null si no hay permiso) y funciones de administrador.
-- Reversión: `supabase/pendientes/045_personajes_privados_REVERTIR.sql` (después de vaciar el bucket).

-- ============ 1) Lista de acceso ============
create table if not exists privado.acceso_personajes (
  jugador  uuid primary key references public.perfiles (id) on delete cascade,
  dado_por uuid references public.perfiles (id) on delete set null,
  creado   timestamptz not null default now()
);
alter table privado.acceso_personajes enable row level security;
revoke all on privado.acceso_personajes from public, anon, authenticated;

/** ¿La cuenta con sesión puede bajar personajes privados? Mayor de edad, no invitada, y en la lista o administradora. */
create or replace function public.puedo_ver_personajes()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = (select auth.uid()) and p.mayor_18 and not p.invitado
      and (exists (select 1 from privado.acceso_personajes a where a.jugador = p.id)
           or exists (select 1 from privado.administradores d where d.jugador = p.id)));
$$;
revoke all on function public.puedo_ver_personajes() from public, anon;
grant execute on function public.puedo_ver_personajes() to authenticated;

-- ============ 2) Bucket privado ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('personajes-privados', 'personajes-privados', false, 8388608,
        array['model/gltf-binary', 'image/webp', 'application/json'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
                               allowed_mime_types = excluded.allowed_mime_types;

-- ============ 3) Entrega vigente (puntero atómico) ============
create table if not exists privado.entrega_personajes (
  unica    boolean primary key default true check (unica),
  sello    text not null check (sello ~ '^[0-9]{8}T[0-9]{6}Z$'),
  cambiado timestamptz not null default now(),
  por      uuid references public.perfiles (id) on delete set null
);
alter table privado.entrega_personajes enable row level security;
revoke all on privado.entrega_personajes from public, anon, authenticated;

/** Sello de la entrega vigente, solo para quien puede ver personajes (si no, null). */
create or replace function public.entrega_personajes()
returns text language sql stable security definer set search_path = '' as $$
  select e.sello from privado.entrega_personajes e where public.puedo_ver_personajes();
$$;
revoke all on function public.entrega_personajes() from public, anon;
grant execute on function public.entrega_personajes() to authenticated;

/** Cambia la entrega vigente. El índice tiene que estar ya arriba. Devuelve el sello anterior (o null). */
create or replace function public.admin_fijar_entrega_personajes(p_sello text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_antes text;
begin
  if not public.soy_admin() then raise exception 'sin permiso'; end if;
  if p_sello is null or p_sello !~ '^[0-9]{8}T[0-9]{6}Z$' then raise exception 'sello no válido'; end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'personajes-privados'
                 and o.name = 'indices/' || p_sello || '.json') then raise exception 'ese índice no está arriba'; end if;
  select sello into v_antes from privado.entrega_personajes for update;
  insert into privado.entrega_personajes (unica, sello, cambiado, por) values (true, p_sello, now(), (select auth.uid()))
    on conflict (unica) do update set sello = excluded.sello, cambiado = excluded.cambiado, por = excluded.por;
  return v_antes;
end $$;
revoke all on function public.admin_fijar_entrega_personajes(text) from public, anon;
grant execute on function public.admin_fijar_entrega_personajes(text) to authenticated;

/** Quita la entrega vigente (nadie ve personajes privados hasta fijar otra). */
create or replace function public.admin_quitar_entrega_personajes()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.soy_admin() then raise exception 'sin permiso'; end if;
  delete from privado.entrega_personajes where unica;
end $$;
revoke all on function public.admin_quitar_entrega_personajes() from public, anon;
grant execute on function public.admin_quitar_entrega_personajes() to authenticated;

-- ============ 4) Políticas de Storage ============
drop policy if exists "personajes privados: jugadores descargan" on storage.objects;
create policy "personajes privados: jugadores descargan" on storage.objects
  for select to authenticated
  using (bucket_id = 'personajes-privados'
         and storage.allow_only_operation('object.get_authenticated')
         and (select public.puedo_ver_personajes()));

drop policy if exists "personajes privados: admin lee" on storage.objects;
create policy "personajes privados: admin lee" on storage.objects
  for select to authenticated
  using (bucket_id = 'personajes-privados'
         and storage.allow_any_operation(array['object.list', 'object.list_v2', 'object.get_authenticated_info',
               'object.head_authenticated_info', 'object.delete', 'object.delete_many'])
         and (select public.soy_admin()));

drop policy if exists "personajes privados: admin sube" on storage.objects;
create policy "personajes privados: admin sube" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'personajes-privados'
              and storage.allow_only_operation('object.upload')
              and (name ~ '^objetos/[0-9a-f]{64}\.(glb|webp)$' or name ~ '^indices/[0-9]{8}T[0-9]{6}Z\.json$')
              and (select public.soy_admin()));

drop policy if exists "personajes privados: admin borra" on storage.objects;
create policy "personajes privados: admin borra" on storage.objects
  for delete to authenticated
  using (bucket_id = 'personajes-privados'
         and storage.allow_any_operation(array['object.delete', 'object.delete_many'])
         and (select public.soy_admin()));

-- ============ 5) Administración del acceso ============
/** Da acceso a la cuenta con ese apodo. Rechaza invitadas y menores. Devuelve el id. */
create or replace function public.admin_dar_acceso_personajes(p_nombre text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_n int;
begin
  if not public.soy_admin() then raise exception 'sin permiso'; end if;
  if p_nombre is null or char_length(trim(p_nombre)) not between 1 and 30 then raise exception 'apodo no válido'; end if;
  select count(*), min(p.id::text)::uuid into v_n, v_id from public.perfiles p where p.nombre = trim(p_nombre);
  if v_n = 0 then raise exception 'no existe'; end if;
  if v_n > 1 then raise exception 'apodo repetido'; end if;
  if exists (select 1 from public.perfiles p where p.id = v_id and (p.invitado or not p.mayor_18)) then
    raise exception 'cuenta invitada o sin mayoría de edad';
  end if;
  insert into privado.acceso_personajes (jugador, dado_por) values (v_id, (select auth.uid()))
    on conflict (jugador) do nothing;
  return v_id;
end $$;
revoke all on function public.admin_dar_acceso_personajes(text) from public, anon;
grant execute on function public.admin_dar_acceso_personajes(text) to authenticated;

/** Quita el acceso. Devuelve true si la cuenta estaba en la lista. */
create or replace function public.admin_quitar_acceso_personajes(p_nombre text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if not public.soy_admin() then raise exception 'sin permiso'; end if;
  with b as (delete from privado.acceso_personajes a using public.perfiles p
             where a.jugador = p.id and p.nombre = trim(coalesce(p_nombre, '')) returning 1)
  select count(*) into v_n from b;
  return v_n > 0;
end $$;
revoke all on function public.admin_quitar_acceso_personajes(text) from public, anon;
grant execute on function public.admin_quitar_acceso_personajes(text) to authenticated;

/** Lista de quién tiene acceso (solo administradores). */
create or replace function public.admin_acceso_personajes()
returns table (nombre text, desde timestamptz) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.soy_admin() then raise exception 'sin permiso'; end if;
  return query select p.nombre, a.creado from privado.acceso_personajes a join public.perfiles p on p.id = a.jugador
               order by a.creado;
end $$;
revoke all on function public.admin_acceso_personajes() from public, anon;
grant execute on function public.admin_acceso_personajes() to authenticated;
