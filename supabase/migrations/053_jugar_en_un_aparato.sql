-- 053 · Jugar varios en un mismo aparato (pedido de Elías, 27 nov 2026; pendiente 023 del Maestro).
-- En el lobby de un solo aparato se agrega una cuenta existente (usuario y contraseña) o un «personaje rápido»: una cuenta
-- real UsuarioN con contraseña aleatoria y código de recuperación, que se muestran una sola vez.
-- Para que cada quien gane sus puntos, el aparato abre en la nube una sala espejo («ALV en un aparato») y cada cuenta entra
-- a ella con SU sesión (prueba de que la persona está ahí). Al terminar cada partida el anfitrión reporta el podio con
-- terminar_partida_sala (sin cambios: valida anfitrión y que cada jugador sea miembro).
--
-- 1. perfiles.rapida: marca la cuenta creada como personaje rápido (no es invitado: NO la borra admin_borrar_invitados).
-- 2. privado.recuperacion_rapida: hash del código de recuperación (nunca el código) e intentos fallidos.
-- 3. siguiente_usuario(): el número libre para UsuarioN. Solo devuelve un número.
-- 4. crear_cuenta_rapida(p_apodo): solo para una cuenta usuarioN recién creada (15 min), sin registro y sin código previo.
--    Marca mayor_18 (la persona lo confirma en pantalla, igual que el invitado), pone el apodo y devuelve el código.
-- 5. verificar_recuperacion(p_correo, p_codigo): solo service_role (la función de Edge «recuperar-cuenta»).
--    5 intentos fallidos bloquean el código.
-- 6. lobby_abierto(): ignora las salas espejo, para que los celulares no entren solos a la sala de un aparato.

alter table public.perfiles add column if not exists rapida boolean not null default false;
grant select (rapida) on public.perfiles to authenticated;

create table if not exists privado.recuperacion_rapida (
  jugador uuid primary key references public.perfiles(id) on delete cascade,
  codigo_hash text not null,
  fallos integer not null default 0,
  creado timestamptz not null default now()
);
alter table privado.recuperacion_rapida enable row level security;
revoke all on privado.recuperacion_rapida from public, anon, authenticated;

create or replace function public.siguiente_usuario()
returns integer language plpgsql stable security definer set search_path to '' as $$
begin
  if (select auth.uid()) is null then raise exception 'sin sesión'; end if;
  return coalesce((select max((substring(u.email from '^usuario([0-9]{1,6})@jugadores\.alv\.invalid$'))::integer)
                   from auth.users u where u.email ~ '^usuario[0-9]{1,6}@jugadores\.alv\.invalid$'), 0) + 1;
end $$;
revoke all on function public.siguiente_usuario() from public, anon;
grant execute on function public.siguiente_usuario() to authenticated;

create or replace function public.crear_cuenta_rapida(p_apodo text)
returns text language plpgsql security definer set search_path to '' as $$
declare
  v_yo uuid := (select auth.uid());
  v_apodo text := trim(regexp_replace(coalesce(p_apodo, ''), '\s+', ' ', 'g'));
  v_codigo text;
begin
  if v_yo is null then raise exception 'sin sesión'; end if;
  if char_length(v_apodo) not between 2 and 20 then raise exception 'apodo no válido'; end if;
  if exists (select 1 from public.datos_cuenta d where d.jugador = v_yo) then raise exception 'no es cuenta rápida'; end if;
  if exists (select 1 from privado.recuperacion_rapida r where r.jugador = v_yo) then raise exception 'ya creada'; end if;
  if not exists (select 1 from auth.users u where u.id = v_yo and u.email ~ '^usuario[0-9]{1,6}@jugadores\.alv\.invalid$'
                 and u.created_at > now() - interval '15 minutes') then raise exception 'no es cuenta rápida'; end if;
  -- 12 letras y números sin los que se confunden (0 O 1 I L).
  v_codigo := (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (get_byte(b, i) % 31) + 1, 1), '' order by i)
               from (select extensions.gen_random_bytes(12) b) x, generate_series(0, 11) i);
  insert into privado.recuperacion_rapida (jugador, codigo_hash) values (v_yo, extensions.crypt(v_codigo, extensions.gen_salt('bf')));
  update public.perfiles set rapida = true, mayor_18 = true, nombre = v_apodo where id = v_yo;
  return v_codigo;
end $$;
revoke all on function public.crear_cuenta_rapida(text) from public, anon;
grant execute on function public.crear_cuenta_rapida(text) to authenticated;

create or replace function public.verificar_recuperacion(p_correo text, p_codigo text)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_j uuid; v_r privado.recuperacion_rapida;
begin
  if p_correo is null or p_codigo is null or p_codigo !~ '^[A-Z0-9]{12}$' then return null; end if;
  select u.id into v_j from auth.users u where u.email = lower(trim(p_correo));
  if v_j is null then return null; end if;
  select * into v_r from privado.recuperacion_rapida r where r.jugador = v_j for update;
  if not found or v_r.fallos >= 5 then return null; end if;
  if extensions.crypt(p_codigo, v_r.codigo_hash) = v_r.codigo_hash then
    update privado.recuperacion_rapida set fallos = 0 where jugador = v_j;
    return v_j;
  end if;
  update privado.recuperacion_rapida set fallos = fallos + 1 where jugador = v_j;
  return null;
end $$;
revoke all on function public.verificar_recuperacion(text, text) from public, anon, authenticated;
grant execute on function public.verificar_recuperacion(text, text) to service_role;

create or replace function public.lobby_abierto()
returns table (codigo text, miembros integer)
language plpgsql stable security definer set search_path to ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'sin sesión'; end if;
  return query
    select e.codigo::text, (select count(*)::integer from public.miembros_evento m where m.evento = e.id)
    from public.eventos e
    where not e.cerrado and e.nombre <> 'ALV en un aparato'
      and exists (select 1 from privado.administradores a where a.jugador = e.anfitrion)
    order by e.inicia desc
    limit 1;
end $$;
revoke all on function public.lobby_abierto() from public, anon;
grant execute on function public.lobby_abierto() to authenticated;
