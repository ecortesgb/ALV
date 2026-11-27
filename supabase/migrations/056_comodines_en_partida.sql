-- 056 · Comodines de la colección en la partida (Elías, 27 nov 2026, Documento Maestro v1.72)
--
-- 1) acciones acepta el tipo 'comodin', pero nadie lo puede insertar directo: solo usar_comodin.
--    Así el motor sabe que esa fila ya se pagó (copia descontada o monedas cobradas).
-- 2) usar_comodin(partida, accion, comodin, comprar): quien juega usa una copia de su colección. Si no le quedan
--    y pidió comprar, paga el precio de reposición y lo usa de una vez, aunque nunca le haya salido en un sobre
--    (desde ahí la carta queda descubierta en su colección, con 0 copias).
--    En un solo paso: descuenta o cobra, anota el uso y escribe la jugada. Repetir la misma acción no cobra dos veces.
--    usar_comodin_aparato(espejo, …): lo mismo para el lobby de un solo aparato, donde la partida vive en el teléfono;
--    valida que la cuenta esté en la sala espejo «ALV en un aparato» y no escribe la jugada (la escribe el teléfono).
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
  -- En línea: la partida de la nube. En un solo aparato: la sala espejo (la partida vive en el teléfono).
  partida  uuid references public.partidas (id) on delete cascade,
  evento   uuid not null references public.eventos (id) on delete cascade,
  jugador  uuid not null references public.perfiles (id) on delete cascade,
  comodin  text not null references public.comodines_tienda (id),
  pagado   int  not null default 0 check (pagado >= 0),
  devuelto boolean not null default false,
  creado   timestamptz not null default now()
);
create index on privado.comodines_usados (partida);
create index on privado.comodines_usados (evento);
revoke all on privado.comodines_usados from public, anon, authenticated;
alter table privado.comodines_usados enable row level security;

-- Núcleo común: descuenta una copia o cobra la reposición y anota el uso. Devuelve true si es nuevo, false si es un reintento.
create function privado.gastar_comodin(p_uid uuid, p_evento uuid, p_partida uuid, p_accion text, p_comodin text, p_comprar boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_cantidad int;
  v_precio int;
  v_pagado int := 0;
  v_previo record;
begin
  perform pg_advisory_xact_lock(pg_catalog.hashtext('monedas:' || p_uid::text));
  -- Reintento de la misma jugada: no cobra dos veces.
  select u.jugador, u.comodin into v_previo from privado.comodines_usados u where u.accion = p_accion;
  if found then
    if v_previo.jugador <> p_uid or v_previo.comodin <> p_comodin then raise exception 'pedido inválido'; end if;
    return false;
  end if;
  if not exists (select 1 from public.comodines_tienda c where c.id = p_comodin and c.activo) then
    raise exception 'carta no disponible';
  end if;
  select c.cantidad into v_cantidad from public.comodines_jugador c
    where c.jugador = p_uid and c.comodin = p_comodin for update;
  if coalesce(v_cantidad, 0) > 0 then
    update public.comodines_jugador set cantidad = cantidad - 1 where jugador = p_uid and comodin = p_comodin;
  elsif p_comprar then
    select c.precio_reposicion into v_precio from public.comodines_tienda c where c.id = p_comodin;
    if v_precio is null then raise exception 'carta no disponible'; end if;
    if privado.monedas_de(p_uid) < v_precio then raise exception 'saldo insuficiente'; end if;
    insert into public.movimientos_monedas (jugador, cantidad, motivo, partida) values (p_uid, -v_precio, 'en-partida:' || p_comodin, p_partida);
    -- Comprada sin haberla descubierto: desde ahora sale en su colección (con 0 copias).
    if v_cantidad is null then insert into public.comodines_jugador (jugador, comodin, cantidad) values (p_uid, p_comodin, 0); end if;
    v_pagado := v_precio;
  else
    raise exception 'no te quedan copias';
  end if;
  insert into privado.comodines_usados (accion, partida, evento, jugador, comodin, pagado)
    values (p_accion, p_partida, p_evento, p_uid, p_comodin, v_pagado);
  return true;
end $$;
revoke all on function privado.gastar_comodin(uuid, uuid, uuid, text, text, boolean) from public, anon, authenticated;

create function privado.validar_pedido_comodin(p_accion text, p_comodin text) returns void
language plpgsql immutable set search_path = '' as $$
begin
  if p_accion is null or char_length(p_accion) not between 8 and 64 or p_accion !~ '^[A-Za-z0-9-]+$' then raise exception 'pedido inválido'; end if;
  if p_comodin is null or p_comodin !~ '^[a-z-]{1,30}$' then raise exception 'carta no disponible'; end if;
end $$;
revoke all on function privado.validar_pedido_comodin(text, text) from public, anon, authenticated;

create function public.usar_comodin(p_partida uuid, p_accion text, p_comodin text, p_comprar boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_evento uuid;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  perform privado.validar_pedido_comodin(p_accion, p_comodin);
  select p.evento into v_evento from public.partidas p where p.id = p_partida and p.terminada is null;
  if v_evento is null then raise exception 'partida no disponible'; end if;
  -- Solo quien juega en esa sala.
  if not exists (select 1 from public.miembros_evento m where m.evento = v_evento and m.jugador = v_uid) then
    raise exception 'partida no disponible';
  end if;
  if privado.gastar_comodin(v_uid, v_evento, p_partida, p_accion, p_comodin, p_comprar) then
    insert into public.acciones (id, partida, jugador, tipo, datos)
      values (p_accion, p_partida, v_uid, 'comodin', jsonb_build_object('carta', p_comodin));
  end if;
  return jsonb_build_object('monedas', privado.monedas_de(v_uid), 'cantidad',
    coalesce((select c.cantidad from public.comodines_jugador c where c.jugador = v_uid and c.comodin = p_comodin), 0));
end $$;
revoke all on function public.usar_comodin(uuid, text, text, boolean) from public, anon;
grant execute on function public.usar_comodin(uuid, text, text, boolean) to authenticated;

create function public.usar_comodin_aparato(p_espejo uuid, p_accion text, p_comodin text, p_comprar boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  perform privado.validar_pedido_comodin(p_accion, p_comodin);
  -- Solo una cuenta que está en una sala espejo abierta (053).
  if not exists (select 1 from public.eventos e join public.miembros_evento m on m.evento = e.id
                 where e.id = p_espejo and e.nombre = 'ALV en un aparato' and e.cerrado is not true and m.jugador = v_uid) then
    raise exception 'partida no disponible';
  end if;
  perform privado.gastar_comodin(v_uid, p_espejo, null, p_accion, p_comodin, p_comprar);
  return jsonb_build_object('monedas', privado.monedas_de(v_uid), 'cantidad',
    coalesce((select c.cantidad from public.comodines_jugador c where c.jugador = v_uid and c.comodin = p_comodin), 0));
end $$;
revoke all on function public.usar_comodin_aparato(uuid, text, text, boolean) from public, anon;
grant execute on function public.usar_comodin_aparato(uuid, text, text, boolean) to authenticated;

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
  v_evento := v_uso.evento;
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
