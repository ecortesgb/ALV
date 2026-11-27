-- 056 · Comodines de la colección en la partida (Elías, 27 nov 2026, Documento Maestro v1.72)
--
-- 1) acciones acepta el tipo 'comodin', pero nadie lo puede insertar directo: solo usar_comodin.
--    Así el motor sabe que esa fila ya se pagó (copia descontada o monedas cobradas).
-- 2) usar_comodin(partida, accion, comodin, comprar): quien juega usa una copia de su colección. Si no le quedan
--    y pidió comprar, paga el precio de reposición (necesita haber descubierto la carta en un sobre, como en la 050).
--    En un solo paso: descuenta o cobra, anota el uso y escribe la jugada. Repetir la misma acción no cobra dos veces.
-- 3) devolver_comodin(accion): si el motor no aceptó la jugada (llegó tarde, ya no era su turno), el anfitrión
--    de la sala la devuelve una sola vez: la copia regresa (tope 9) o las monedas se reembolsan.
-- No toca terminar_partida_sala ni los ids mj-*.

-- 1) Tipo nuevo y la política de inserción directa sin él
alter table public.acciones drop constraint if exists acciones_tipo_check;
alter table public.acciones add constraint acciones_tipo_check
  check (tipo = any (array['contestar', 'carta', 'mision', 'pista', 'control', 'comodin']));

drop policy if exists acciones_crear on public.acciones;
create policy acciones_crear on public.acciones for insert to authenticated
  with check (
    jugador = (select auth.uid())
    and acciones.tipo <> 'comodin'
    and exists (
      select 1 from public.partidas p
      where p.id = acciones.partida and p.terminada is null and privado.es_miembro(p.evento)
        and (acciones.tipo <> 'control' or privado.es_anfitrion(p.evento))
    )
  );

-- 2) Registro de usos (privado: solo lo tocan las funciones)
create table privado.comodines_usados (
  accion   text primary key check (char_length(accion) between 8 and 64),
  partida  uuid not null references public.partidas (id) on delete cascade,
  jugador  uuid not null references public.perfiles (id) on delete cascade,
  comodin  text not null references public.comodines_tienda (id),
  pagado   int  not null default 0 check (pagado >= 0),
  devuelto boolean not null default false,
  creado   timestamptz not null default now()
);
create index on privado.comodines_usados (partida);
revoke all on privado.comodines_usados from public, anon, authenticated;
alter table privado.comodines_usados enable row level security;

create function public.usar_comodin(p_partida uuid, p_accion text, p_comodin text, p_comprar boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_evento uuid;
  v_cantidad int;
  v_precio int;
  v_pagado int := 0;
  v_previo record;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_accion is null or char_length(p_accion) not between 8 and 64 or p_accion !~ '^[A-Za-z0-9-]+$' then raise exception 'pedido inválido'; end if;
  if p_comodin is null or p_comodin !~ '^[a-z-]{1,30}$' then raise exception 'carta no disponible'; end if;

  select p.evento into v_evento from public.partidas p where p.id = p_partida and p.terminada is null;
  if v_evento is null then raise exception 'partida no disponible'; end if;
  -- Solo quien juega en esa sala.
  if not exists (select 1 from public.miembros_evento m where m.evento = v_evento and m.jugador = v_uid) then
    raise exception 'partida no disponible';
  end if;

  perform pg_advisory_xact_lock(pg_catalog.hashtext('monedas:' || v_uid::text));

  -- Reintento de la misma jugada: no cobra dos veces.
  select u.jugador, u.comodin into v_previo from privado.comodines_usados u where u.accion = p_accion;
  if found then
    if v_previo.jugador <> v_uid or v_previo.comodin <> p_comodin then raise exception 'pedido inválido'; end if;
  else
    if not exists (select 1 from public.comodines_tienda c where c.id = p_comodin and c.activo) then
      raise exception 'carta no disponible';
    end if;
    select c.cantidad into v_cantidad from public.comodines_jugador c
      where c.jugador = v_uid and c.comodin = p_comodin for update;
    if not found then raise exception 'descubre la carta en un sobre'; end if;

    if v_cantidad > 0 then
      update public.comodines_jugador set cantidad = cantidad - 1 where jugador = v_uid and comodin = p_comodin;
    elsif p_comprar then
      select c.precio_reposicion into v_precio from public.comodines_tienda c where c.id = p_comodin;
      if v_precio is null then raise exception 'carta no disponible'; end if;
      if privado.monedas_de(v_uid) < v_precio then raise exception 'saldo insuficiente'; end if;
      insert into public.movimientos_monedas (jugador, cantidad, motivo, partida) values (v_uid, -v_precio, 'en-partida:' || p_comodin, p_partida);
      v_pagado := v_precio;
    else
      raise exception 'no te quedan copias';
    end if;

    insert into privado.comodines_usados (accion, partida, jugador, comodin, pagado)
      values (p_accion, p_partida, v_uid, p_comodin, v_pagado);
    insert into public.acciones (id, partida, jugador, tipo, datos)
      values (p_accion, p_partida, v_uid, 'comodin', jsonb_build_object('carta', p_comodin));
  end if;

  return jsonb_build_object('monedas', privado.monedas_de(v_uid), 'cantidad',
    coalesce((select c.cantidad from public.comodines_jugador c where c.jugador = v_uid and c.comodin = p_comodin), 0));
end $$;
revoke all on function public.usar_comodin(uuid, text, text, boolean) from public, anon;
grant execute on function public.usar_comodin(uuid, text, text, boolean) to authenticated;

-- 3) Devolución cuando el motor no aceptó la jugada
create function public.devolver_comodin(p_accion text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_uso privado.comodines_usados%rowtype;
  v_evento uuid;
begin
  if (select auth.uid()) is null then raise exception 'sin sesión'; end if;
  select * into v_uso from privado.comodines_usados u where u.accion = p_accion for update;
  if not found or v_uso.devuelto then return false; end if;
  select p.evento into v_evento from public.partidas p where p.id = v_uso.partida;
  -- Solo el anfitrión (o coanfitrión) de esa sala, que es quien corre el motor.
  if v_evento is null or not privado.es_anfitrion(v_evento) then raise exception 'sin permiso'; end if;

  perform pg_advisory_xact_lock(pg_catalog.hashtext('monedas:' || v_uso.jugador::text));
  if v_uso.pagado > 0 then
    insert into public.movimientos_monedas (jugador, cantidad, motivo, partida) values (v_uso.jugador, v_uso.pagado, 'devolucion:' || v_uso.comodin, v_uso.partida);
  else
    update public.comodines_jugador set cantidad = least(9, cantidad + 1) where jugador = v_uso.jugador and comodin = v_uso.comodin;
  end if;
  update privado.comodines_usados set devuelto = true where accion = p_accion;
  return true;
end $$;
revoke all on function public.devolver_comodin(text) from public, anon;
grant execute on function public.devolver_comodin(text) to authenticated;
