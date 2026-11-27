-- Reposición del álbum: requiere haber descubierto la carta y tener cero copias.
alter table public.comodines_tienda
  add column precio_reposicion int check (precio_reposicion > 50);

update public.comodines_tienda set precio_reposicion = case id
  when 'turno' then 65 when 'cambio' then 75 end
where id in ('turno', 'cambio');

create table privado.reposiciones_comodines (
  jugador uuid not null references public.perfiles(id) on delete cascade,
  pedido uuid not null,
  comodin text not null references public.comodines_tienda(id),
  primary key (jugador, pedido)
);
revoke all on privado.reposiciones_comodines from public, anon, authenticated;

create function public.reponer_comodin(p_comodin text, p_pedido uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_precio int;
  v_cantidad int;
  v_anterior text;
begin
  if v_uid is null or p_pedido is null then raise exception 'pedido inválido'; end if;
  perform pg_advisory_xact_lock(pg_catalog.hashtext('monedas:' || v_uid::text));

  select r.comodin into v_anterior from privado.reposiciones_comodines r
    where r.jugador = v_uid and r.pedido = p_pedido;
  if found then
    if v_anterior is distinct from p_comodin then raise exception 'pedido inválido'; end if;
  else
    select c.precio_reposicion into v_precio from public.comodines_tienda c
      where c.id = p_comodin and c.activo;
    if v_precio is null then raise exception 'carta no disponible'; end if;
    select c.cantidad into v_cantidad from public.comodines_jugador c
      where c.jugador = v_uid and c.comodin = p_comodin for update;
    if not found then raise exception 'descubre la carta en un sobre'; end if;
    if v_cantidad <> 0 then raise exception 'aún tienes copias'; end if;
    if privado.monedas_de(v_uid) < v_precio then raise exception 'saldo insuficiente'; end if;

    insert into public.movimientos_monedas(jugador, cantidad, motivo)
      values (v_uid, -v_precio, 'reposicion:' || p_comodin);
    update public.comodines_jugador set cantidad = 1
      where jugador = v_uid and comodin = p_comodin;
    insert into privado.reposiciones_comodines(jugador, pedido, comodin)
      values (v_uid, p_pedido, p_comodin);
  end if;

  return jsonb_build_object('monedas', privado.monedas_de(v_uid), 'cantidad',
    (select c.cantidad from public.comodines_jugador c where c.jugador = v_uid and c.comodin = p_comodin));
end $$;
revoke all on function public.reponer_comodin(text, uuid) from public, anon;
grant execute on function public.reponer_comodin(text, uuid) to authenticated;

-- RLS activo sin políticas: solo las funciones del servidor (dueñas de las tablas) las tocan.
alter table privado.reposiciones_comodines enable row level security;
