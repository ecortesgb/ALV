-- 028: invitados de prueba (Maestro §3.2, v1.32 y v1.33). Solo para la etapa de pruebas.
-- Un invitado es una cuenta desechable que la app crea sola (correo interno inv_…): elige apodo y confirma
-- que es mayor de 18, sin fecha de nacimiento. Queda marcada en perfiles.invitado para poder borrarla.
-- entrar_invitado: solo sirve a una cuenta inv_ recién creada y sin registro; no sirve para saltarse
--   el bloqueo de una cuenta normal con fecha de menor.
-- admin_borrar_invitados: solo administradores. Borra las cuentas invitadas, su XP, sus figuras y sus salas.
alter table public.perfiles add column if not exists invitado boolean not null default false;

create or replace function public.entrar_invitado(p_apodo text)
returns void language plpgsql security definer set search_path to '' as $$
declare v_yo uuid := (select auth.uid()); v_apodo text := trim(regexp_replace(coalesce(p_apodo, ''), '\s+', ' ', 'g'));
begin
  if v_yo is null then raise exception 'sin sesión'; end if;
  if char_length(v_apodo) not between 2 and 20 then raise exception 'apodo no válido'; end if;
  if exists (select 1 from public.datos_cuenta d where d.jugador = v_yo) then raise exception 'no es invitado'; end if;
  if not exists (select 1 from auth.users u where u.id = v_yo and u.email like 'inv\_%@jugadores.alv.invalid'
                 and u.created_at > now() - interval '15 minutes') then raise exception 'no es invitado'; end if;
  update public.perfiles set invitado = true, mayor_18 = true where id = v_yo;
  begin
    update public.perfiles set nombre = v_apodo where id = v_yo;
  exception when others then null; -- apodo repetido o no aceptado: se queda con el nombre interno
  end;
end $$;
revoke all on function public.entrar_invitado(text) from public, anon;
grant execute on function public.entrar_invitado(text) to authenticated;

create or replace function public.admin_borrar_invitados()
returns integer language plpgsql security definer set search_path to '' as $$
declare v_n integer;
begin
  if not public.soy_admin() then raise exception 'sin permiso'; end if;
  delete from public.movimientos_xp m where m.jugador in (select id from public.perfiles where invitado)
     or m.evento in (select e.id from public.eventos e where e.anfitrion in (select id from public.perfiles where invitado));
  delete from public.eventos e where e.anfitrion in (select id from public.perfiles where invitado);
  with b as (delete from auth.users u where u.id in (select id from public.perfiles where invitado) returning 1)
  select count(*) into v_n from b;
  return v_n;
end $$;
revoke all on function public.admin_borrar_invitados() from public, anon;
grant execute on function public.admin_borrar_invitados() to authenticated;
