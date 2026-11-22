-- 038 · Lobby del administrador (ALV_PLAN_MODOS_DE_JUEGO.md, pedido de Elías del 2026-11-22).
-- ESCRITA, NO APLICADA. Necesita autorización expresa de Elías (D-002) y, antes, prueba en transacción deshecha
-- con un usuario que no es anfitrión y el asesor de seguridad.
--
-- 1. lobby_abierto(): cualquier cuenta con sesión sabe si hay un lobby abierto del administrador, su código y cuántos
--    hay dentro, sin ser miembro (hoy solo se sabe si el aparato del anfitrión está anunciándolo por Realtime).
--    El código ya viaja por el anuncio de Realtime a cualquiera; entrar sigue pasando por unirse_evento.
-- 2. expulsar_de_sala(): el anfitrión saca a un jugador del lobby (no a sí mismo).
-- 3. marcar_listo_de(): el anfitrión marca «listo» o «no listo» a otro jugador de su sala.
-- No cambia tablas ni políticas. Las tres validan sesión y permiso dentro de la función.

create or replace function public.lobby_abierto()
returns table (codigo text, miembros integer)
language plpgsql stable security definer set search_path to ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'sin sesión'; end if;
  return query
    select e.codigo::text, (select count(*)::integer from public.miembros_evento m where m.evento = e.id)
    from public.eventos e
    where not e.cerrado and exists (select 1 from privado.administradores a where a.jugador = e.anfitrion)
    order by e.inicia desc
    limit 1;
end $$;

create or replace function public.expulsar_de_sala(p_evento uuid, p_jugador uuid)
returns void
language plpgsql security definer set search_path to ''
as $$
declare v_yo uuid := (select auth.uid());
begin
  if v_yo is null then raise exception 'sin sesión'; end if;
  if not exists (select 1 from public.eventos e where e.id = p_evento and e.anfitrion = v_yo and not e.cerrado) then
    raise exception 'sin permiso'; end if;
  if p_jugador is null or p_jugador = v_yo then raise exception 'jugador no válido'; end if;
  delete from public.miembros_evento m where m.evento = p_evento and m.jugador = p_jugador;
end $$;

create or replace function public.marcar_listo_de(p_evento uuid, p_jugador uuid, p_listo boolean)
returns void
language plpgsql security definer set search_path to ''
as $$
declare v_yo uuid := (select auth.uid());
begin
  if v_yo is null then raise exception 'sin sesión'; end if;
  if not exists (select 1 from public.eventos e where e.id = p_evento and e.anfitrion = v_yo and not e.cerrado) then
    raise exception 'sin permiso'; end if;
  if p_listo is null then raise exception 'valor no válido'; end if;
  update public.miembros_evento set listo = p_listo where evento = p_evento and jugador = p_jugador;
  if not found then raise exception 'ese jugador no está en la sala'; end if;
end $$;

revoke all on function public.lobby_abierto() from public, anon;
revoke all on function public.expulsar_de_sala(uuid, uuid) from public, anon;
revoke all on function public.marcar_listo_de(uuid, uuid, boolean) from public, anon;
grant execute on function public.lobby_abierto() to authenticated;
grant execute on function public.expulsar_de_sala(uuid, uuid) to authenticated;
grant execute on function public.marcar_listo_de(uuid, uuid, boolean) to authenticated;
