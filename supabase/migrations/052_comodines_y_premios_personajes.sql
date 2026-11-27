-- 052 · Todos los comodines a la venta, premios por nivel con personajes y personajes ya usados se conservan
-- (Elías, 27 nov 2026, Maestro v1.67). Requiere 050 y 051. Reemplaza a la 035 (premios de piezas), que no se aplica:
-- desde la 037 todas las piezas son libres y regalarlas no tendría sentido.
-- 1) comodines_tienda: los 16 comodines que estaban «en preparación» entran a la venta y al sorteo de sobres, con su
--    precio de reposición (igual que src/content/tienda.ts; una prueba compara las dos listas).
-- 2) privado.grupo_personaje: saga y grupo de los 142 personajes (avengers, x-men, guardianes, villanos-marvel,
--    otros-marvel, dc, star-wars, harry-potter). Sirve para saber qué grupo usa más cada jugador.
-- 3) personajes_comprados.origen: compra, nivel o regalo.
-- 4) Regalo: quien ya guardó una figura con un personaje que ahora se vende lo conserva (nadie pierde lo que usa).
-- 5) reclamar_premios_nivel(): por cada nivel desde el 2 que todavía no se premió, regala un personaje al azar que el
--    jugador no tenga. 7 de cada 10 salen del grupo que más usa (sus figuras guardadas; la activa cuenta doble); el
--    resto, de todo el catálogo. Lo raro sale menos (100 / 30 / 8). El nivel lo calcula el servidor con la XP acumulada.

-- 1) Comodines
insert into public.comodines_tienda (id, especial, precio_reposicion) values
  ('escudo', false, 85),
  ('salvavidas', true, 95),
  ('relevo', true, 100),
  ('doble-castigo', true, 115),
  ('mesero', true, 85),
  ('suerte', true, 130),
  ('prorroga', false, 65),
  ('segundo-intento', false, 75),
  ('rebaja', false, 80),
  ('dos-caminos', true, 95),
  ('mano-amiga', true, 90),
  ('rebote', true, 120),
  ('contrarreloj', true, 95),
  ('candado', true, 105),
  ('pista-extra', false, 65),
  ('duelo-dados', true, 110)
on conflict (id) do update set especial = excluded.especial, precio_reposicion = excluded.precio_reposicion, activo = true;

-- 2) Grupos
create table privado.grupo_personaje (
  id    text primary key check (id ~ '^[a-z0-9-]+$'),
  saga  text not null check (saga ~ '^[a-z0-9-]+$'),
  grupo text not null check (grupo ~ '^[a-z0-9-]+$')
);
revoke all on privado.grupo_personaje from public, anon, authenticated;
-- generado: grupos
insert into privado.grupo_personaje (id, saga, grupo) values
  ('abominacion', 'marvel', 'villanos-marvel'),
  ('anakin-skywalker', 'star-wars', 'star-wars'),
  ('ant-man', 'marvel', 'avengers'),
  ('antorcha-humana', 'marvel', 'otros-marvel'),
  ('aquaman', 'dc', 'dc'),
  ('arcangel', 'marvel', 'x-men'),
  ('arnim-zola', 'marvel', 'villanos-marvel'),
  ('avispa', 'marvel', 'avengers'),
  ('batman', 'dc', 'dc'),
  ('batman-returns', 'dc', 'dc'),
  ('bestia', 'marvel', 'x-men'),
  ('black-panther', 'marvel', 'avengers'),
  ('black-widow', 'marvel', 'avengers'),
  ('blade', 'marvel', 'otros-marvel'),
  ('bruce-banner', 'marvel', 'avengers'),
  ('bruce-wayne', 'dc', 'dc'),
  ('buitre', 'marvel', 'villanos-marvel'),
  ('bullseye', 'marvel', 'villanos-marvel'),
  ('capitan-america', 'marvel', 'avengers'),
  ('capitan-america-clasico', 'marvel', 'avengers'),
  ('capitan-britania', 'marvel', 'otros-marvel'),
  ('carnage', 'marvel', 'villanos-marvel'),
  ('chica-ardilla', 'marvel', 'otros-marvel'),
  ('ciclope', 'marvel', 'x-men'),
  ('coloso', 'marvel', 'x-men'),
  ('coulson', 'marvel', 'avengers'),
  ('craneo-rojo', 'marvel', 'villanos-marvel'),
  ('daredevil', 'marvel', 'otros-marvel'),
  ('darth-maul', 'star-wars', 'star-wars'),
  ('darth-vader', 'star-wars', 'star-wars'),
  ('deadpool', 'marvel', 'otros-marvel'),
  ('dientes-de-sable', 'marvel', 'villanos-marvel'),
  ('doctor-doom', 'marvel', 'villanos-marvel'),
  ('doctor-octopus', 'marvel', 'villanos-marvel'),
  ('doctor-strange', 'marvel', 'avengers'),
  ('drax', 'marvel', 'guardianes'),
  ('duende-verde', 'marvel', 'villanos-marvel'),
  ('duende-verde-ultimate', 'marvel', 'villanos-marvel'),
  ('el-lider', 'marvel', 'villanos-marvel'),
  ('electro', 'marvel', 'villanos-marvel'),
  ('elektra', 'marvel', 'otros-marvel'),
  ('emma-frost', 'marvel', 'x-men'),
  ('falcon', 'marvel', 'avengers'),
  ('fenix', 'marvel', 'x-men'),
  ('fenix-oscura', 'marvel', 'x-men'),
  ('flash', 'dc', 'dc'),
  ('gambito', 'marvel', 'x-men'),
  ('gamora', 'marvel', 'guardianes'),
  ('gata-negra', 'marvel', 'otros-marvel'),
  ('ghost-rider', 'marvel', 'otros-marvel'),
  ('groot', 'marvel', 'guardianes'),
  ('gwen-stacy', 'marvel', 'otros-marvel'),
  ('harry-potter', 'harry-potter', 'harry-potter'),
  ('havok', 'marvel', 'x-men'),
  ('hawkeye', 'marvel', 'avengers'),
  ('heimdall', 'marvel', 'otros-marvel'),
  ('hermione-granger', 'harry-potter', 'harry-potter'),
  ('hombre-absorbente', 'marvel', 'villanos-marvel'),
  ('hombre-de-arena', 'marvel', 'villanos-marvel'),
  ('howard-el-pato', 'marvel', 'otros-marvel'),
  ('hulk', 'marvel', 'avengers'),
  ('hulk-rojo', 'marvel', 'otros-marvel'),
  ('hulkbuster', 'marvel', 'avengers'),
  ('iceman', 'marvel', 'x-men'),
  ('iron-fist', 'marvel', 'otros-marvel'),
  ('iron-man', 'marvel', 'avengers'),
  ('iron-man-clasico', 'marvel', 'avengers'),
  ('iron-man-mk42', 'marvel', 'avengers'),
  ('iron-patriot', 'marvel', 'avengers'),
  ('iron-spider', 'marvel', 'otros-marvel'),
  ('jane-foster', 'marvel', 'otros-marvel'),
  ('jango-fett', 'star-wars', 'star-wars'),
  ('jean-grey', 'marvel', 'x-men'),
  ('joker', 'dc', 'dc'),
  ('joker-caballero-oscuro', 'dc', 'dc'),
  ('juggernaut', 'marvel', 'villanos-marvel'),
  ('kingpin', 'marvel', 'villanos-marvel'),
  ('kraven', 'marvel', 'villanos-marvel'),
  ('la-mole', 'marvel', 'otros-marvel'),
  ('lagarto', 'marvel', 'villanos-marvel'),
  ('loki', 'marvel', 'villanos-marvel'),
  ('luke-skywalker', 'star-wars', 'star-wars'),
  ('magneto', 'marvel', 'villanos-marvel'),
  ('malekith', 'marvel', 'villanos-marvel'),
  ('mandaloriano', 'star-wars', 'star-wars'),
  ('mandarin', 'marvel', 'villanos-marvel'),
  ('maria-hill', 'marvel', 'avengers'),
  ('mary-jane', 'marvel', 'otros-marvel'),
  ('mistica', 'marvel', 'villanos-marvel'),
  ('modok', 'marvel', 'villanos-marvel'),
  ('moon-knight', 'marvel', 'otros-marvel'),
  ('mr-fantastico', 'marvel', 'otros-marvel'),
  ('ms-marvel', 'marvel', 'avengers'),
  ('mujer-invisible', 'marvel', 'otros-marvel'),
  ('mujer-maravilla', 'dc', 'dc'),
  ('mysterio', 'marvel', 'villanos-marvel'),
  ('nick-fury', 'marvel', 'avengers'),
  ('nova', 'marvel', 'guardianes'),
  ('odin', 'marvel', 'otros-marvel'),
  ('pepper-potts', 'marvel', 'otros-marvel'),
  ('peter-parker', 'marvel', 'otros-marvel'),
  ('polaris', 'marvel', 'x-men'),
  ('profesor-x', 'marvel', 'x-men'),
  ('psylocke', 'marvel', 'x-men'),
  ('punisher', 'marvel', 'otros-marvel'),
  ('pyro', 'marvel', 'villanos-marvel'),
  ('rescue', 'marvel', 'avengers'),
  ('rino', 'marvel', 'villanos-marvel'),
  ('robin', 'dc', 'dc'),
  ('robin-lego-batman', 'dc', 'dc'),
  ('rocket', 'marvel', 'guardianes'),
  ('ron-weasley', 'harry-potter', 'harry-potter'),
  ('ronan', 'marvel', 'villanos-marvel'),
  ('sapo', 'marvel', 'villanos-marvel'),
  ('she-hulk', 'marvel', 'avengers'),
  ('shocker', 'marvel', 'villanos-marvel'),
  ('sif', 'marvel', 'otros-marvel'),
  ('silver-surfer', 'marvel', 'otros-marvel'),
  ('soldado-del-invierno', 'marvel', 'otros-marvel'),
  ('spider-man', 'marvel', 'otros-marvel'),
  ('spider-man-negro', 'marvel', 'otros-marvel'),
  ('spider-woman', 'marvel', 'avengers'),
  ('stan-lee', 'marvel', 'otros-marvel'),
  ('star-lord', 'marvel', 'guardianes'),
  ('super-skrull', 'marvel', 'villanos-marvel'),
  ('superior-spider-man', 'marvel', 'otros-marvel'),
  ('superman', 'dc', 'dc'),
  ('taskmaster', 'marvel', 'villanos-marvel'),
  ('thanos', 'marvel', 'villanos-marvel'),
  ('thor', 'marvel', 'avengers'),
  ('tia-may', 'marvel', 'otros-marvel'),
  ('tony-stark', 'marvel', 'avengers'),
  ('tormenta', 'marvel', 'x-men'),
  ('union-jack', 'marvel', 'otros-marvel'),
  ('venom', 'marvel', 'villanos-marvel'),
  ('venom-grande', 'marvel', 'villanos-marvel'),
  ('viper', 'marvel', 'villanos-marvel'),
  ('voldemort', 'harry-potter', 'harry-potter'),
  ('war-machine', 'marvel', 'avengers'),
  ('whiplash', 'marvel', 'villanos-marvel'),
  ('wolverine', 'marvel', 'x-men'),
  ('yoda', 'star-wars', 'star-wars');
-- fin generado

-- 3) Origen de cada personaje conseguido
alter table privado.personajes_comprados add column origen text not null default 'compra'
  check (origen in ('compra', 'nivel', 'regalo'));

-- 4) Lo que ya se usa se conserva
insert into privado.personajes_comprados (jugador, personaje, origen)
select distinct f.jugador, c.id, 'regalo'
from public.figuras_jugador f
cross join lateral jsonb_path_query(f.figura, 'strict $.**.origen ? (@.tipo == "catalogo").personaje') p(personaje)
join privado.catalogo_tienda_personajes c on c.id = p.personaje #>> '{}'
join public.perfiles pf on pf.id = f.jugador
on conflict (jugador, personaje) do nothing;

-- 5) Premios por nivel
create table privado.premios_nivel (
  jugador   uuid not null references public.perfiles(id) on delete cascade,
  nivel     smallint not null check (nivel between 2 and 1000),
  personaje text references privado.catalogo_tienda_personajes(id),
  creado    timestamptz not null default now(),
  primary key (jugador, nivel)
);
revoke all on privado.premios_nivel from public, anon, authenticated;

create function public.reclamar_premios_nivel() returns table (personaje text, nivel smallint, rareza text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
  v_nivel int;
  v_n int;
  v_grupo text;
  v_pj text;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if not coalesce(public.puedo_ver_personajes(), false) then return; end if;
  -- Misma llave que las compras: un premio y una compra no se cruzan.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('monedas:' || v_uid::text));
  v_nivel := public.nivel_por_xp((select s.acumulada from privado.saldos_de(v_uid, null) s));
  -- Grupo que más usa: sus figuras guardadas, la activa cuenta doble.
  select g.grupo into v_grupo
  from public.figuras_jugador f
  cross join lateral jsonb_path_query(f.figura, 'strict $.**.origen ? (@.tipo == "catalogo").personaje') x(pj)
  join privado.grupo_personaje g on g.id = x.pj #>> '{}'
  where f.jugador = v_uid
  group by g.grupo order by sum(case when f.activa then 2 else 1 end) desc, random() limit 1;

  for v_n in 2 .. coalesce(v_nivel, 1) loop
    continue when exists (select 1 from privado.premios_nivel p where p.jugador = v_uid and p.nivel = v_n);
    v_pj := null;
    -- 7 de cada 10 premios salen de su grupo favorito mientras le queden personajes de ese grupo.
    if v_grupo is not null and random() < 0.7 then
      select c.id into v_pj from privado.catalogo_tienda_personajes c join privado.grupo_personaje g on g.id = c.id
      where c.activo and g.grupo = v_grupo
        and not exists (select 1 from privado.personajes_comprados p where p.jugador = v_uid and p.personaje = c.id)
      order by -ln(1 - random()) / (case c.rareza when 'rara' then 100 when 'epica' then 30 else 8 end) limit 1;
    end if;
    if v_pj is null then
      select c.id into v_pj from privado.catalogo_tienda_personajes c
      where c.activo
        and not exists (select 1 from privado.personajes_comprados p where p.jugador = v_uid and p.personaje = c.id)
      order by -ln(1 - random()) / (case c.rareza when 'rara' then 100 when 'epica' then 30 else 8 end) limit 1;
    end if;
    insert into privado.premios_nivel (jugador, nivel, personaje) values (v_uid, v_n, v_pj);
    if v_pj is not null then
      insert into privado.personajes_comprados (jugador, personaje, origen) values (v_uid, v_pj, 'nivel')
        on conflict (jugador, personaje) do nothing;
      personaje := v_pj; nivel := v_n;
      rareza := (select c.rareza from privado.catalogo_tienda_personajes c where c.id = v_pj);
      return next;
    end if;
  end loop;
end $$;
revoke all on function public.reclamar_premios_nivel() from public, anon;
grant execute on function public.reclamar_premios_nivel() to authenticated;
