-- 011 · Guerra de sexos en línea: el anfitrión necesita el género de cada quien en su sala para armar los equipos.
-- Solo devuelve el género (nunca la fecha de nacimiento) y solo a quien está en esa misma sala abierta.

create or replace function public.generos_sala(p_evento uuid)
returns table (jugador uuid, genero text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  if not exists (
    select 1 from public.miembros_evento m join public.eventos e on e.id = m.evento
    where m.evento = p_evento and m.jugador = auth.uid() and not e.cerrado
  ) then raise exception 'no estás en esta sala'; end if;
  return query
    select d.jugador, d.genero
    from public.datos_cuenta d
    join public.miembros_evento m on m.jugador = d.jugador and m.evento = p_evento;
end;
$$;

revoke execute on function public.generos_sala(uuid) from public, anon;
grant execute on function public.generos_sala(uuid) to authenticated;
