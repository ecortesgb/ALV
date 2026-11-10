-- ALV · F2 parte 1: perfiles, personaje, XP, tienda, eventos, partidas y datos privados.
-- Regla: RLS en todas las tablas y "nadie puede nada" hasta que una política lo abre.
-- XP, compras, eventos y datos privados solo se escriben con funciones que validan adentro.

-- ============ Tablas ============

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default 'Jugador' check (char_length(nombre) between 1 and 30),
  mayor_18 boolean not null default false,
  creado timestamptz not null default now()
);

create table public.personajes (
  jugador uuid primary key references public.perfiles (id) on delete cascade,
  piezas jsonb not null default '{}'::jsonb check (jsonb_typeof(piezas) = 'object' and pg_column_size(piezas) <= 2000),
  actualizado timestamptz not null default now()
);

create table public.articulos_tienda (
  id text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  nombre text not null check (char_length(nombre) between 1 and 60),
  tipo text not null check (tipo in ('accesorio', 'carta')),
  precio int not null check (precio >= 0),
  nivel_min int not null default 1 check (nivel_min >= 1),
  zona text check (zona in ('mano', 'cabeza', 'cuello', 'pecho', 'espalda')),
  activo boolean not null default true
);

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[A-Z0-9]{6}$'),
  nombre text not null check (char_length(nombre) between 1 and 60),
  anfitrion uuid not null references public.perfiles (id),
  coanfitrion uuid references public.perfiles (id),
  adulto boolean not null default false,
  drunk boolean not null default false,
  cerrado boolean not null default false,
  inicia timestamptz not null default now(),
  cerrado_en timestamptz
);

create table public.miembros_evento (
  evento uuid not null references public.eventos (id) on delete cascade,
  jugador uuid not null references public.perfiles (id) on delete cascade,
  pareja uuid references public.perfiles (id),
  unido timestamptz not null default now(),
  primary key (evento, jugador)
);

create table public.partidas (
  id uuid primary key default gen_random_uuid(),
  evento uuid not null references public.eventos (id) on delete cascade,
  juego text not null check (juego ~ '^[a-z0-9-]{1,40}$'),
  semilla int not null,
  estado_publico jsonb not null default '{}'::jsonb check (pg_column_size(estado_publico) <= 50000),
  version int not null default 1 check (version >= 1),
  creada timestamptz not null default now(),
  terminada timestamptz
);

create table public.movimientos_xp (
  id bigint generated always as identity primary key,
  jugador uuid not null references public.perfiles (id) on delete cascade,
  tipo text not null check (tipo in ('ganada', 'accesorio', 'carta')),
  xp int not null check (xp > 0),
  evento uuid references public.eventos (id),
  partida uuid references public.partidas (id),
  -- En compras de accesorio: cuánto salió de la XP del evento abierto (el resto, de XP vieja).
  xp_de_evento int not null default 0 check (xp_de_evento >= 0 and xp_de_evento <= xp),
  motivo text not null check (char_length(motivo) between 1 and 60),
  creado timestamptz not null default now()
);
create index on public.movimientos_xp (jugador);
create index on public.movimientos_xp (partida) where tipo = 'carta';

create table public.inventario (
  jugador uuid not null references public.perfiles (id) on delete cascade,
  articulo text not null references public.articulos_tienda (id),
  puesto boolean not null default false,
  comprado timestamptz not null default now(),
  primary key (jugador, articulo)
);

-- Dato privado de cada jugador en una partida (palabra del impostor, rol, pregunta secreta).
create table public.datos_privados (
  partida uuid not null references public.partidas (id) on delete cascade,
  jugador uuid not null references public.perfiles (id) on delete cascade,
  datos jsonb not null check (pg_column_size(datos) <= 4000),
  primary key (partida, jugador)
);

-- Acciones que mandan los celulares. El id lo pone el celular: si llega dos veces, la segunda se rechaza.
create table public.acciones (
  id text primary key check (char_length(id) between 8 and 64),
  partida uuid not null references public.partidas (id) on delete cascade,
  jugador uuid not null references public.perfiles (id) on delete cascade,
  tipo text not null check (tipo in ('contestar', 'carta', 'mision')),
  datos jsonb not null default '{}'::jsonb check (pg_column_size(datos) <= 2000),
  creada timestamptz not null default now()
);
create index on public.acciones (partida, creada);

-- ============ RLS: todo cerrado ============

alter table public.perfiles enable row level security;
alter table public.personajes enable row level security;
alter table public.articulos_tienda enable row level security;
alter table public.eventos enable row level security;
alter table public.miembros_evento enable row level security;
alter table public.partidas enable row level security;
alter table public.movimientos_xp enable row level security;
alter table public.inventario enable row level security;
alter table public.datos_privados enable row level security;
alter table public.acciones enable row level security;

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

-- ============ Ayudantes (no se exponen) ============

create function public.es_miembro(p_evento uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.miembros_evento m where m.evento = p_evento and m.jugador = (select auth.uid()));
$$;

create function public.es_anfitrion(p_evento uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.eventos e where e.id = p_evento
                 and (select auth.uid()) in (e.anfitrion, e.coanfitrion));
$$;

create function public.comparten_evento(p_otro uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_otro = (select auth.uid()) or exists (
    select 1 from public.miembros_evento a join public.miembros_evento b on a.evento = b.evento
    where a.jugador = (select auth.uid()) and b.jugador = p_otro);
$$;

create function public.nivel_por_xp(p_xp int) returns int
language plpgsql immutable set search_path = '' as $$
declare n int := 1; resto int := greatest(p_xp, 0);
begin
  while resto >= 100 + 20 * (n - 1) loop resto := resto - (100 + 20 * (n - 1)); n := n + 1; end loop;
  return n;
end $$;

-- Saldos de un jugador respecto a un evento (el abierto más reciente si no se indica).
create function public.saldos_de(p_jugador uuid, p_evento uuid default null)
returns table (acumulada int, disponible int, del_evento int, evento uuid)
language sql stable security definer set search_path = '' as $$
  with ev as (
    select coalesce(p_evento, (
      select e.id from public.eventos e join public.miembros_evento m on m.evento = e.id
      where m.jugador = p_jugador and not e.cerrado order by e.inicia desc limit 1)) as id
  ), abierto as (
    select ev.id from ev join public.eventos e on e.id = ev.id where not e.cerrado
  )
  select
    coalesce(sum(x.xp) filter (where x.tipo = 'ganada'), 0)::int,
    coalesce(sum(case when x.tipo = 'ganada' then x.xp else -x.xp end), 0)::int,
    greatest(0, coalesce(sum(case
      when x.evento is distinct from (select id from abierto) then 0
      when x.tipo = 'ganada' then x.xp
      when x.tipo = 'carta' then -x.xp
      else -x.xp_de_evento end), 0))::int,
    (select id from abierto)
  from public.movimientos_xp x where x.jugador = p_jugador;
$$;

revoke execute on function public.es_miembro(uuid), public.es_anfitrion(uuid), public.comparten_evento(uuid),
  public.saldos_de(uuid, uuid) from public, anon;
-- Las políticas usan los tres primeros; quien entra con sesión los necesita para que RLS funcione.
grant execute on function public.es_miembro(uuid), public.es_anfitrion(uuid), public.comparten_evento(uuid) to authenticated;
revoke execute on function public.saldos_de(uuid, uuid) from authenticated;

-- ============ Políticas: lo mínimo abierto ============

grant select on public.perfiles to authenticated;
grant update (nombre, mayor_18) on public.perfiles to authenticated;
create policy perfiles_leer on public.perfiles for select to authenticated using (public.comparten_evento(id));
create policy perfiles_editar on public.perfiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

grant select, insert on public.personajes to authenticated;
grant update (piezas, actualizado) on public.personajes to authenticated;
create policy personajes_leer on public.personajes for select to authenticated using (public.comparten_evento(jugador));
create policy personajes_crear on public.personajes for insert to authenticated with check (jugador = (select auth.uid()));
create policy personajes_editar on public.personajes for update to authenticated using (jugador = (select auth.uid())) with check (jugador = (select auth.uid()));

grant select on public.articulos_tienda to authenticated;
create policy tienda_leer on public.articulos_tienda for select to authenticated using (activo);

grant select on public.eventos to authenticated;
create policy eventos_leer on public.eventos for select to authenticated using (public.es_miembro(id));

grant select on public.miembros_evento to authenticated;
create policy miembros_leer on public.miembros_evento for select to authenticated using (public.es_miembro(evento));

grant select, insert on public.partidas to authenticated;
grant update (estado_publico, version, terminada) on public.partidas to authenticated;
create policy partidas_leer on public.partidas for select to authenticated using (public.es_miembro(evento));
create policy partidas_crear on public.partidas for insert to authenticated with check (public.es_anfitrion(evento));
create policy partidas_editar on public.partidas for update to authenticated using (public.es_anfitrion(evento)) with check (public.es_anfitrion(evento));

grant select on public.movimientos_xp to authenticated;
create policy xp_leer on public.movimientos_xp for select to authenticated using (jugador = (select auth.uid()));

grant select on public.inventario to authenticated;
grant update (puesto) on public.inventario to authenticated;
create policy inventario_leer on public.inventario for select to authenticated using (public.comparten_evento(jugador));
create policy inventario_ponerse on public.inventario for update to authenticated using (jugador = (select auth.uid())) with check (jugador = (select auth.uid()));

grant select on public.datos_privados to authenticated;
create policy privados_leer on public.datos_privados for select to authenticated using (jugador = (select auth.uid()));

grant select, insert on public.acciones to authenticated;
create policy acciones_crear on public.acciones for insert to authenticated with check (
  jugador = (select auth.uid()) and exists (select 1 from public.partidas p where p.id = partida and p.terminada is null and public.es_miembro(p.evento)));
create policy acciones_leer on public.acciones for select to authenticated using (
  jugador = (select auth.uid()) or exists (select 1 from public.partidas p where p.id = partida and public.es_anfitrion(p.evento)));

-- ============ Funciones que se llaman desde la app ============

-- Perfil automático al crear la cuenta. No copia el correo: es privado.
create function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id) values (new.id) on conflict do nothing;
  insert into public.personajes (jugador) values (new.id) on conflict do nothing;
  return new;
end $$;
revoke execute on function public.crear_perfil() from public, anon, authenticated;
create trigger al_crear_usuario after insert on auth.users for each row execute function public.crear_perfil();

create function public.mis_saldos() returns table (acumulada int, disponible int, del_evento int, evento uuid, nivel int)
language sql stable security definer set search_path = '' as $$
  select s.acumulada, s.disponible, s.del_evento, s.evento, public.nivel_por_xp(s.acumulada)
  from public.saldos_de((select auth.uid())) s;
$$;

create function public.crear_evento(p_nombre text, p_adulto boolean, p_drunk boolean) returns table (id uuid, codigo text)
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_codigo text; v_id uuid; intentos int := 0;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_nombre is null or char_length(trim(p_nombre)) not between 1 and 60 then raise exception 'nombre no válido'; end if;
  if (select count(*) from public.eventos e where e.anfitrion = v_uid and not e.cerrado) >= 3 then raise exception 'demasiados eventos abiertos'; end if;
  loop
    v_codigo := upper(substr(translate(encode(extensions.gen_random_bytes(8), 'base64'), '+/=0O1IL', ''), 1, 6));
    exit when char_length(v_codigo) = 6 and not exists (select 1 from public.eventos e where e.codigo = v_codigo);
    intentos := intentos + 1;
    if intentos > 20 then raise exception 'no se pudo generar código'; end if;
  end loop;
  insert into public.eventos (codigo, nombre, anfitrion, adulto, drunk)
    values (v_codigo, trim(p_nombre), v_uid, coalesce(p_adulto, false), coalesce(p_drunk, false)) returning eventos.id into v_id;
  insert into public.miembros_evento (evento, jugador) values (v_id, v_uid);
  return query select v_id, v_codigo;
end $$;

create function public.unirse_evento(p_codigo text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_ev public.eventos;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  select * into v_ev from public.eventos e where e.codigo = upper(trim(p_codigo)) and not e.cerrado;
  if not found then raise exception 'código no válido'; end if;
  if (select count(*) from public.miembros_evento m where m.evento = v_ev.id) >= 8 then raise exception 'sala llena'; end if;
  insert into public.miembros_evento (evento, jugador) values (v_ev.id, v_uid) on conflict do nothing;
  return v_ev.id;
end $$;

create function public.cerrar_evento(p_evento uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.eventos e where e.id = p_evento and e.anfitrion = (select auth.uid())) then
    raise exception 'sin permiso'; end if;
  update public.eventos set cerrado = true, cerrado_en = now() where id = p_evento and not cerrado;
end $$;

-- Accesorio: gasta primero XP vieja y luego la del evento. Revisa nivel y saldo.
create function public.comprar_accesorio(p_articulo text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_art public.articulos_tienda; s record; v_de_evento int;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  perform pg_advisory_xact_lock(hashtext('xp:' || v_uid::text));
  select * into v_art from public.articulos_tienda a where a.id = p_articulo and a.tipo = 'accesorio' and a.activo;
  if not found then raise exception 'artículo no válido'; end if;
  if exists (select 1 from public.inventario i where i.jugador = v_uid and i.articulo = p_articulo) then raise exception 'ya lo tienes'; end if;
  select * into s from public.saldos_de(v_uid);
  if public.nivel_por_xp(s.acumulada) < v_art.nivel_min then raise exception 'nivel insuficiente'; end if;
  if s.disponible < v_art.precio then raise exception 'saldo insuficiente'; end if;
  v_de_evento := greatest(0, v_art.precio - (s.disponible - s.del_evento));
  if v_art.precio > 0 then
    insert into public.movimientos_xp (jugador, tipo, xp, evento, xp_de_evento, motivo)
      values (v_uid, 'accesorio', v_art.precio, s.evento, v_de_evento, v_art.id);
  end if;
  insert into public.inventario (jugador, articulo) values (v_uid, v_art.id);
end $$;

-- Carta de poder: solo con XP del evento abierto de esa partida; 40, 60 y 80; máximo 3 por partida.
create function public.comprar_carta(p_partida uuid, p_carta text) returns int
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_evento uuid; v_compradas int; v_precio int; s record;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  perform pg_advisory_xact_lock(hashtext('xp:' || v_uid::text));
  select p.evento into v_evento from public.partidas p join public.eventos e on e.id = p.evento
    where p.id = p_partida and p.terminada is null and not e.cerrado;
  if v_evento is null then raise exception 'partida o evento cerrado'; end if;
  if not public.es_miembro(v_evento) then raise exception 'sin permiso'; end if;
  if not exists (select 1 from public.articulos_tienda a where a.id = p_carta and a.tipo = 'carta' and a.activo) then
    raise exception 'carta no válida'; end if;
  select count(*) into v_compradas from public.movimientos_xp x where x.jugador = v_uid and x.tipo = 'carta' and x.partida = p_partida;
  if v_compradas >= 3 then raise exception 'tope de cartas en esta partida'; end if;
  v_precio := (array[40, 60, 80])[v_compradas + 1];
  select * into s from public.saldos_de(v_uid, v_evento);
  if s.del_evento < v_precio then raise exception 'saldo del evento insuficiente'; end if;
  insert into public.movimientos_xp (jugador, tipo, xp, evento, partida, motivo)
    values (v_uid, 'carta', v_precio, v_evento, p_partida, p_carta);
  return v_precio;
end $$;

revoke execute on function public.mis_saldos(), public.crear_evento(text, boolean, boolean), public.unirse_evento(text),
  public.cerrar_evento(uuid), public.comprar_accesorio(text), public.comprar_carta(uuid, text) from public, anon;
grant execute on function public.mis_saldos(), public.crear_evento(text, boolean, boolean), public.unirse_evento(text),
  public.cerrar_evento(uuid), public.comprar_accesorio(text), public.comprar_carta(uuid, text) to authenticated;

-- ============ Catálogo de la tienda ============

insert into public.articulos_tienda (id, nombre, tipo, precio, nivel_min, zona) values
  ('mano', 'Accesorio en la mano', 'accesorio', 80, 1, 'mano'),
  ('corona-carton', 'Corona de cartón', 'accesorio', 160, 1, 'cabeza'),
  ('medallas', 'Medallas de adorno', 'accesorio', 200, 3, 'pecho'),
  ('collar', 'Collar', 'accesorio', 280, 5, 'cuello'),
  ('capa', 'Capa', 'accesorio', 400, 10, 'espalda'),
  ('corona-neon', 'Corona neón', 'accesorio', 480, 15, 'cabeza'),
  ('escudo', 'Escudo', 'carta', 0, 1, null),
  ('salvavidas', 'Salvavidas', 'carta', 0, 1, null),
  ('relevo', 'Relevo', 'carta', 0, 1, null),
  ('doble-castigo', 'Doble castigo', 'carta', 0, 1, null),
  ('cambio', 'Cambio de pregunta', 'carta', 0, 1, null),
  ('turno', 'Pasa turno', 'carta', 0, 1, null),
  ('mesero', 'Cambio de mesero', 'carta', 0, 1, null);
