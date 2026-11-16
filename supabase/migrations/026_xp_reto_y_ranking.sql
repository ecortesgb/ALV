-- 026 (parte necesaria para la prueba): XP por reto en vivo y ranking entre conocidos.
-- dar_xp_reto: quien tiene el control da XP a un miembro de su sala (también a sí mismo, decisión 6 de §22.1).
-- Queda registrado quién la dio en el motivo. Las reglas finales de XP son del paso 12.
create or replace function public.dar_xp_reto(p_evento uuid, p_jugador uuid, p_xp integer)
returns void language plpgsql security definer set search_path to '' as $$
declare v_yo uuid := (select auth.uid()); v_quien text;
begin
  if v_yo is null then raise exception 'sin sesión'; end if;
  if not privado.es_anfitrion(p_evento) then raise exception 'sin permiso'; end if;
  if not exists (select 1 from public.eventos e where e.id = p_evento and not e.cerrado) then raise exception 'sala cerrada'; end if;
  if not exists (select 1 from public.miembros_evento m where m.evento = p_evento and m.jugador = p_jugador) then raise exception 'no está en la sala'; end if;
  if p_xp is null or p_xp not between 1 and 200 then raise exception 'xp no válida'; end if;
  select left(p.nombre, 40) into v_quien from public.perfiles p where p.id = v_yo;
  perform pg_advisory_xact_lock(hashtext('xp:' || p_jugador::text));
  insert into public.movimientos_xp (jugador, tipo, xp, evento, xp_de_evento, motivo)
    values (p_jugador, 'ganada', p_xp, p_evento, p_xp, left('reto en vivo · ' || coalesce(v_quien, '?'), 60));
end $$;
revoke all on function public.dar_xp_reto(uuid, uuid, integer) from public, anon;
grant execute on function public.dar_xp_reto(uuid, uuid, integer) to authenticated;

-- Ranking: yo y las cuentas con las que he compartido sala. Solo apodo, XP acumulada y nivel.
create or replace function public.ranking_conocidos()
returns table (id uuid, nombre text, acumulada integer, nivel integer)
language sql stable security definer set search_path to '' as $$
  select p.id, p.nombre, s.acumulada, public.nivel_por_xp(s.acumulada)
  from public.perfiles p cross join lateral privado.saldos_de(p.id) s
  where (select auth.uid()) is not null
    and (p.id = (select auth.uid()) or exists (
      select 1 from public.miembros_evento a join public.miembros_evento b on a.evento = b.evento
      where a.jugador = (select auth.uid()) and b.jugador = p.id))
  order by s.acumulada desc, p.nombre limit 50;
$$;
revoke all on function public.ranking_conocidos() from public, anon;
grant execute on function public.ranking_conocidos() to authenticated;
