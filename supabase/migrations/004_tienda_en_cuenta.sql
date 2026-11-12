-- ALV · Compras e inventario en la cuenta.
-- 1) El catálogo de la tienda queda igual al de la app (src/content/personaje.ts).
-- 2) Los sobres se abren en el servidor: el celular no elige sus cartas.
-- 3) Nadie puede ponerse en su personaje algo que no compró.

-- 1) Catálogo
update public.articulos_tienda set activo = false where id = 'mano';
insert into public.articulos_tienda (id, nombre, tipo, precio, nivel_min, zona) values
  ('acc-taza', 'Taza', 'accesorio', 80, 1, 'mano'),
  ('acc-martillo', 'Martillo', 'accesorio', 80, 1, 'mano'),
  ('acc-desarmador', 'Desarmador', 'accesorio', 80, 1, 'mano'),
  ('acc-llave', 'Llave', 'accesorio', 80, 1, 'mano'),
  ('acc-lupa', 'Lupa', 'accesorio', 80, 1, 'mano'),
  ('acc-microfono', 'Micrófono', 'accesorio', 120, 1, 'mano'),
  ('acc-tablet', 'Tablet', 'accesorio', 120, 1, 'mano'),
  ('acc-smartphone', 'Smartphone', 'accesorio', 120, 1, 'mano'),
  ('acc-portafolio', 'Portafolio', 'accesorio', 80, 1, 'mano'),
  ('acc-libreta', 'Libreta', 'accesorio', 80, 1, 'mano'),
  ('acc-radio', 'Radio', 'accesorio', 80, 1, 'mano'),
  ('acc-portapapeles', 'Portapapeles', 'accesorio', 80, 1, 'mano'),
  ('acc-trofeo', 'Trofeo', 'accesorio', 160, 1, 'mano'),
  ('acc-medalla', 'Medalla en mano', 'accesorio', 160, 1, 'mano'),
  ('acc-estrella', 'Estrella', 'accesorio', 120, 1, 'mano'),
  ('corona-carton', 'Corona de cartón', 'accesorio', 160, 1, 'cabeza'),
  ('medallas', 'Medallas de adorno', 'accesorio', 200, 3, 'pecho'),
  ('collar', 'Collar de oro', 'accesorio', 280, 5, 'cuello'),
  ('capa', 'Capa de campeón', 'accesorio', 400, 10, 'espalda'),
  ('corona-neon', 'Corona neón', 'accesorio', 480, 15, 'cabeza')
on conflict (id) do update set nombre = excluded.nombre, tipo = excluded.tipo, precio = excluded.precio,
  nivel_min = excluded.nivel_min, zona = excluded.zona, activo = true;

-- 2) Sobres (PROVISIONAL: precios y pesos pendientes de aprobación en el Documento Maestro 13.2)
create table public.sobres (
  id text primary key check (id in ('bronce', 'plata', 'oro')),
  nombre text not null check (char_length(nombre) between 1 and 40),
  precio int not null check (precio > 0),
  nivel_min int not null default 1 check (nivel_min >= 1),
  cartas int not null check (cartas between 1 and 6),
  pesos jsonb not null check (jsonb_typeof(pesos) = 'object'),
  activo boolean not null default true
);
alter table public.sobres enable row level security;
revoke all on public.sobres from anon, authenticated;
grant select on public.sobres to authenticated;
create policy sobres_leer on public.sobres for select to authenticated using (activo);
insert into public.sobres (id, nombre, precio, nivel_min, cartas, pesos) values
  ('bronce', 'Sobre bronce', 60, 1, 2, '{"comun": 70, "rara": 25, "epica": 4, "legendaria": 1}'),
  ('plata', 'Sobre plata', 120, 3, 3, '{"comun": 45, "rara": 38, "epica": 14, "legendaria": 3}'),
  ('oro', 'Sobre oro', 240, 6, 4, '{"comun": 20, "rara": 45, "epica": 27, "legendaria": 8}');

-- Rareza provisional según el precio (igual que rarezaDe en src/engine/sobres.ts).
create function privado.rareza_de(p_precio int) returns text
language sql immutable set search_path = '' as $$
  select case when p_precio <= 80 then 'comun' when p_precio <= 160 then 'rara' when p_precio <= 280 then 'epica' else 'legendaria' end;
$$;

create function public.comprar_sobre(p_sobre text) returns table (articulo text, rareza text)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_sobre public.sobres; s record; v_nivel int; v_de_evento int;
  v_orden text[] := array['comun', 'rara', 'epica', 'legendaria'];
  v_total numeric; v_tiro numeric; v_pedida text; v_idx int; v_r text; v_elegido text; i int; k int;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  perform pg_advisory_xact_lock(hashtext('xp:' || v_uid::text));
  select * into v_sobre from public.sobres x where x.id = p_sobre and x.activo;
  if not found then raise exception 'sobre no válido'; end if;
  select * into s from privado.saldos_de(v_uid);
  v_nivel := public.nivel_por_xp(s.acumulada);
  if v_nivel < v_sobre.nivel_min then raise exception 'nivel insuficiente'; end if;
  if s.disponible < v_sobre.precio then raise exception 'saldo insuficiente'; end if;

  create temp table if not exists _candidatos (id text primary key, rareza text) on commit drop;
  delete from pg_temp._candidatos where true;
  insert into pg_temp._candidatos
    select a.id, privado.rareza_de(a.precio) from public.articulos_tienda a
    where a.tipo = 'accesorio' and a.activo and a.nivel_min <= v_nivel
      and not exists (select 1 from public.inventario inv where inv.jugador = v_uid and inv.articulo = a.id);
  if not exists (select 1 from pg_temp._candidatos) then raise exception 'ya tienes todo'; end if;

  v_total := (select sum((v_sobre.pesos ->> r)::numeric) from unnest(v_orden) r);
  for i in 1 .. v_sobre.cartas loop
    exit when not exists (select 1 from pg_temp._candidatos);
    v_tiro := random() * v_total; v_pedida := 'comun';
    foreach v_r in array v_orden loop
      v_tiro := v_tiro - (v_sobre.pesos ->> v_r)::numeric;
      if v_tiro < 0 then v_pedida := v_r; exit; end if;
    end loop;
    -- Primero la rareza tirada; si no hay, hacia arriba y luego hacia abajo.
    v_idx := array_position(v_orden, v_pedida); v_elegido := null;
    for k in 0 .. 3 loop
      v_r := case when v_idx + k <= 4 then v_orden[v_idx + k] else v_orden[v_idx - (v_idx + k - 4)] end;
      select c.id into v_elegido from pg_temp._candidatos c where c.rareza = v_r order by random() limit 1;
      exit when v_elegido is not null;
    end loop;
    exit when v_elegido is null;
    delete from pg_temp._candidatos c where c.id = v_elegido;
    insert into public.inventario (jugador, articulo) values (v_uid, v_elegido);
    articulo := v_elegido; rareza := v_r; return next;
  end loop;

  v_de_evento := greatest(0, v_sobre.precio - (s.disponible - s.del_evento));
  insert into public.movimientos_xp (jugador, tipo, xp, evento, xp_de_evento, motivo)
    values (v_uid, 'accesorio', v_sobre.precio, s.evento, v_de_evento, 'sobre-' || v_sobre.id);
end $$;
revoke execute on function public.comprar_sobre(text) from public, anon;
grant execute on function public.comprar_sobre(text) to authenticated;
revoke execute on function privado.rareza_de(int) from public, anon, authenticated;

-- 3) El personaje solo puede llevar puesto lo que está en su inventario.
create function privado.validar_puesto() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_zona text; v_art text;
begin
  if new.piezas ? 'puesto' and jsonb_typeof(new.piezas -> 'puesto') = 'object' then
    for v_zona, v_art in select key, value #>> '{}' from jsonb_each(new.piezas -> 'puesto') loop
      if v_art is not null and not exists (
        select 1 from public.inventario i join public.articulos_tienda a on a.id = i.articulo
        where i.jugador = new.jugador and i.articulo = v_art and a.zona = v_zona) then
        raise exception 'no tienes ese artículo';
      end if;
    end loop;
  end if;
  return new;
end $$;
revoke execute on function privado.validar_puesto() from public, anon, authenticated;
create trigger personajes_validar_puesto before insert or update of piezas on public.personajes
  for each row execute function privado.validar_puesto();
