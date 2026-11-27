-- Catálogo de venta y compras de trajes V3. Los modelos y fotos siguen en la fuente privada.
create table privado.catalogo_tienda_personajes (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  saga text not null check (saga in ('marvel', 'dc', 'star-wars', 'harry-potter')),
  rareza text not null check (rareza in ('rara', 'epica', 'legendaria')),
  bigfig boolean not null,
  activo boolean not null default true
);
revoke all on privado.catalogo_tienda_personajes from public, anon, authenticated;

-- El catálogo de venta usa los IDs del álbum V3.
insert into privado.catalogo_tienda_personajes(id, saga, rareza, bigfig) values
  ('abominacion', 'marvel', 'rara', true),
  ('anakin-skywalker', 'star-wars', 'rara', false),
  ('ant-man', 'marvel', 'rara', false),
  ('antorcha-humana', 'marvel', 'rara', false),
  ('aquaman', 'dc', 'rara', false),
  ('arcangel', 'marvel', 'rara', false),
  ('arnim-zola', 'marvel', 'rara', false),
  ('avispa', 'marvel', 'rara', false),
  ('batman-returns', 'dc', 'epica', false),
  ('bestia', 'marvel', 'rara', false),
  ('black-panther', 'marvel', 'rara', false),
  ('black-widow', 'marvel', 'rara', false),
  ('blade', 'marvel', 'rara', false),
  ('bruce-banner', 'marvel', 'rara', false),
  ('bruce-wayne', 'dc', 'rara', false),
  ('buitre', 'marvel', 'rara', false),
  ('bullseye', 'marvel', 'rara', false),
  ('capitan-america', 'marvel', 'rara', false),
  ('capitan-britania', 'marvel', 'rara', false),
  ('carnage', 'marvel', 'rara', false),
  ('chica-ardilla', 'marvel', 'rara', false),
  ('coloso', 'marvel', 'rara', true),
  ('coulson', 'marvel', 'rara', false),
  ('craneo-rojo', 'marvel', 'rara', false),
  ('daredevil', 'marvel', 'rara', false),
  ('darth-maul', 'star-wars', 'legendaria', false),
  ('deadpool', 'marvel', 'rara', false),
  ('dientes-de-sable', 'marvel', 'rara', false),
  ('doctor-doom', 'marvel', 'rara', false),
  ('doctor-octopus', 'marvel', 'rara', false),
  ('doctor-strange', 'marvel', 'rara', false),
  ('drax', 'marvel', 'rara', false),
  ('duende-verde', 'marvel', 'rara', false),
  ('duende-verde-ultimate', 'marvel', 'rara', true),
  ('el-lider', 'marvel', 'rara', false),
  ('electro', 'marvel', 'rara', false),
  ('elektra', 'marvel', 'rara', false),
  ('emma-frost', 'marvel', 'rara', false),
  ('falcon', 'marvel', 'rara', false),
  ('fenix', 'marvel', 'epica', false),
  ('fenix-oscura', 'marvel', 'legendaria', false),
  ('flash', 'dc', 'rara', false),
  ('gambito', 'marvel', 'rara', false),
  ('gamora', 'marvel', 'rara', false),
  ('gata-negra', 'marvel', 'rara', false),
  ('ghost-rider', 'marvel', 'rara', false),
  ('groot', 'marvel', 'rara', true),
  ('gwen-stacy', 'marvel', 'rara', false),
  ('havok', 'marvel', 'rara', false),
  ('hawkeye', 'marvel', 'rara', false),
  ('heimdall', 'marvel', 'rara', false),
  ('hombre-absorbente', 'marvel', 'rara', false),
  ('hombre-de-arena', 'marvel', 'rara', false),
  ('howard-el-pato', 'marvel', 'rara', false),
  ('hulk-rojo', 'marvel', 'rara', true),
  ('hulkbuster', 'marvel', 'legendaria', true),
  ('iceman', 'marvel', 'rara', false),
  ('iron-fist', 'marvel', 'rara', false),
  ('iron-man', 'marvel', 'rara', false),
  ('iron-man-mk42', 'marvel', 'epica', false),
  ('iron-patriot', 'marvel', 'rara', false),
  ('iron-spider', 'marvel', 'epica', false),
  ('jane-foster', 'marvel', 'rara', false),
  ('jango-fett', 'star-wars', 'epica', false),
  ('jean-grey', 'marvel', 'rara', false),
  ('joker', 'dc', 'rara', false),
  ('joker-caballero-oscuro', 'dc', 'epica', false),
  ('juggernaut', 'marvel', 'rara', true),
  ('kingpin', 'marvel', 'rara', true),
  ('kraven', 'marvel', 'rara', false),
  ('la-mole', 'marvel', 'rara', true),
  ('lagarto', 'marvel', 'rara', true),
  ('loki', 'marvel', 'rara', false),
  ('magneto', 'marvel', 'epica', false),
  ('malekith', 'marvel', 'rara', false),
  ('mandaloriano', 'star-wars', 'epica', false),
  ('mandarin', 'marvel', 'rara', false),
  ('maria-hill', 'marvel', 'rara', false),
  ('mary-jane', 'marvel', 'rara', false),
  ('mistica', 'marvel', 'rara', false),
  ('modok', 'marvel', 'rara', false),
  ('moon-knight', 'marvel', 'rara', false),
  ('mr-fantastico', 'marvel', 'rara', false),
  ('ms-marvel', 'marvel', 'rara', false),
  ('mujer-invisible', 'marvel', 'rara', false),
  ('mysterio', 'marvel', 'rara', false),
  ('nick-fury', 'marvel', 'rara', false),
  ('nova', 'marvel', 'rara', false),
  ('odin', 'marvel', 'rara', false),
  ('pepper-potts', 'marvel', 'rara', false),
  ('polaris', 'marvel', 'rara', false),
  ('profesor-x', 'marvel', 'rara', false),
  ('psylocke', 'marvel', 'rara', false),
  ('punisher', 'marvel', 'rara', false),
  ('pyro', 'marvel', 'rara', false),
  ('rescue', 'marvel', 'rara', false),
  ('rino', 'marvel', 'rara', true),
  ('robin', 'dc', 'rara', false),
  ('robin-lego-batman', 'dc', 'rara', false),
  ('rocket', 'marvel', 'rara', false),
  ('ronan', 'marvel', 'rara', false),
  ('sapo', 'marvel', 'rara', false),
  ('she-hulk', 'marvel', 'rara', false),
  ('shocker', 'marvel', 'rara', false),
  ('sif', 'marvel', 'rara', false),
  ('silver-surfer', 'marvel', 'rara', false),
  ('soldado-del-invierno', 'marvel', 'rara', false),
  ('spider-man-negro', 'marvel', 'epica', false),
  ('spider-woman', 'marvel', 'rara', false),
  ('stan-lee', 'marvel', 'rara', false),
  ('star-lord', 'marvel', 'rara', false),
  ('super-skrull', 'marvel', 'rara', false),
  ('superior-spider-man', 'marvel', 'rara', false),
  ('taskmaster', 'marvel', 'rara', false),
  ('thanos', 'marvel', 'legendaria', true),
  ('tia-may', 'marvel', 'rara', false),
  ('tony-stark', 'marvel', 'rara', false),
  ('union-jack', 'marvel', 'rara', false),
  ('venom', 'marvel', 'rara', false),
  ('venom-grande', 'marvel', 'legendaria', true),
  ('viper', 'marvel', 'rara', false),
  ('voldemort', 'harry-potter', 'legendaria', false),
  ('war-machine', 'marvel', 'rara', false),
  ('whiplash', 'marvel', 'rara', false);

create table privado.personajes_comprados (
  jugador uuid not null references public.perfiles(id) on delete cascade,
  personaje text not null references privado.catalogo_tienda_personajes(id),
  primary key (jugador, personaje)
);
create table privado.pedidos_personajes (
  jugador uuid not null references public.perfiles(id) on delete cascade,
  pedido uuid not null,
  modo text not null,
  destino text not null,
  precio int not null,
  cartas jsonb not null,
  primary key (jugador, pedido)
);
revoke all on privado.personajes_comprados, privado.pedidos_personajes from public, anon, authenticated;

create function privado.precio_personaje(p_rareza text, p_bigfig boolean) returns int
language sql immutable set search_path = '' as $$
  select case p_rareza when 'rara' then 260 when 'epica' then 360 when 'legendaria' then 520 end + case when p_bigfig then 40 else 0 end;
$$;

create function public.estado_personajes_tienda() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when auth.uid() is not null and public.puedo_ver_personajes() then
    jsonb_build_object(
      'catalogo', coalesce((select jsonb_agg(jsonb_build_object(
        'id',c.id,'saga',c.saga,'rareza',c.rareza,'precio',privado.precio_personaje(c.rareza,c.bigfig)) order by c.id)
        from privado.catalogo_tienda_personajes c where c.activo), '[]'::jsonb),
      'personajes', coalesce((select jsonb_agg(c.personaje order by c.personaje)
        from privado.personajes_comprados c where c.jugador = auth.uid()), '[]'::jsonb))
    else null end;
$$;

create function public.comprar_personajes(p_modo text, p_destino text, p_precio int, p_pedido uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_precio int;
  v_cartas jsonb;
  v_orden text[] := array['rara','epica','legendaria'];
  v_previo privado.pedidos_personajes;
begin
  if v_uid is null or not coalesce(public.puedo_ver_personajes(), false) then raise exception 'sin acceso'; end if;
  if p_pedido is null or p_destino is null or p_modo is null or p_modo not in ('sobre','carta')
    or p_precio is null or p_precio <= 0 then raise exception 'pedido inválido'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('monedas:' || v_uid::text));

  select * into v_previo from privado.pedidos_personajes where jugador = v_uid and pedido = p_pedido;
  if found then
    if (v_previo.modo, v_previo.destino, v_previo.precio) is distinct from (p_modo, p_destino, p_precio) then
      raise exception 'pedido inválido';
    end if;
    v_cartas := v_previo.cartas;
  else
    if p_modo = 'sobre' then
      select jsonb_agg(jsonb_build_object('tipo','personaje','id',c.id,'rareza',c.rareza)
        order by array_position(v_orden,c.rareza), c.id) into v_cartas
      from (
        select c.id, c.rareza from privado.catalogo_tienda_personajes c
        where c.activo and c.saga = p_destino
          and not exists (select 1 from privado.personajes_comprados p where p.jugador = v_uid and p.personaje = c.id)
        order by -ln(1 - random()) / (case c.rareza when 'rara' then 100 when 'epica' then 30 else 8 end)
        limit 3
      ) c;
      v_precio := jsonb_array_length(v_cartas) * 80;
    else
      select privado.precio_personaje(c.rareza,c.bigfig), jsonb_build_array(jsonb_build_object('tipo','personaje','id',c.id,'rareza',c.rareza))
      into v_precio, v_cartas
      from privado.catalogo_tienda_personajes c where c.activo and c.id = p_destino
        and not exists (select 1 from privado.personajes_comprados p where p.jugador = v_uid and p.personaje = c.id);
    end if;
    if v_precio is null then raise exception 'ya no quedan cartas disponibles'; end if;
    if v_precio <> p_precio then raise exception 'el precio cambió'; end if;
    if privado.monedas_de(v_uid) < v_precio then raise exception 'saldo insuficiente'; end if;
    insert into public.movimientos_monedas(jugador,cantidad,motivo)
      values (v_uid,-v_precio,'personajes:' || p_modo);
    insert into privado.personajes_comprados(jugador,personaje)
      select v_uid, x->>'id' from jsonb_array_elements(v_cartas) x;
    insert into privado.pedidos_personajes(jugador,pedido,modo,destino,precio,cartas)
      values (v_uid,p_pedido,p_modo,p_destino,v_precio,v_cartas);
  end if;
  return jsonb_build_object('monedas',privado.monedas_de(v_uid),'cartas',v_cartas);
end $$;

revoke all on function privado.precio_personaje(text,boolean), public.estado_personajes_tienda(),
  public.comprar_personajes(text,text,int,uuid) from public, anon, authenticated;
grant execute on function public.estado_personajes_tienda(), public.comprar_personajes(text,text,int,uuid) to authenticated;

-- RLS activo sin políticas: solo las funciones del servidor (dueñas de las tablas) las tocan.
alter table privado.catalogo_tienda_personajes enable row level security;
alter table privado.personajes_comprados enable row level security;
alter table privado.pedidos_personajes enable row level security;
