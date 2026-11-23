-- 044 · Ranking y Logros, etapa 3 (Maestro v1.56): temporadas, Salón de la Fama y Récords. Necesita 040–043.
-- APLICADA en la base remota el 2026-11-23 (instrucción de Elías: «Sigue con etapa 3», con «publicar directo y probar que no
-- haya errores» de la etapa 2), registrada como 20261123171410 044_temporadas_salon_records. Antes: prueba local PGlite 6/6 y
-- prueba remota en transacción deshecha (top 1, logro Campeón de temporada, récords, fiestero oculto, sin lectura directa,
-- anónimo sin permiso; nada quedó). Después: 28 logros, 0 filas en el Salón, RLS en las 2 tablas, funciones solo para
-- authenticated; asesor de 55 a 58 avisos RPC (las 3 nuevas).
-- 1) Temporada formal (D2): cada mes calendario en hora de México. La primera lectura después de que termina un mes lo
--    cierra y guarda una foto fija: top 3 individual por Puntos ALV, mejor pareja y mejor equipo. Los de 1.º lugar
--    reciben el logro «Campeón de temporada». La foto no cambia aunque luego lleguen partidas con fecha de ese mes.
-- 2) Salón de la Fama: campeones de temporada, de torneos (041) y de las mejores parejas y equipos. Sin apodo guardado:
--    se lee de perfiles; si la cuenta se borró, sale «Jugador retirado» (choque 3, Maestro v1.54).
-- 3) Récords históricos (etapa 3 del encargo): rey del caos, el incansable, el sobreviviente, el más desafortunado,
--    el traicionero, el bromista (votos), el noctámbulo y el fiestero (solo partidas con Drunk, D7; nunca da XP ni
--    puntos; quien activa «Ocultar mis bebidas» no aparece en ese récord).

-- ============ 1) Temporadas ============
create table public.temporadas (
  mes        date primary key check (extract(day from mes) = 1),
  cerrada_en timestamptz not null default now()
);
alter table public.temporadas enable row level security;
revoke all on public.temporadas from public, anon, authenticated;

create table public.salon_fama (
  id           bigint generated always as identity primary key,
  tipo         text not null check (tipo in ('temporada', 'pareja', 'equipo')),
  mes          date not null,
  posicion     smallint not null check (posicion between 1 and 3),
  jugador      uuid references public.perfiles (id) on delete set null,   -- individual; null = cuenta borrada
  integrantes  uuid[],                                                    -- pareja o equipo (ids, sin nombres)
  grupo        text,
  valor        int not null,
  creado       timestamptz not null default now()
);
create index salon_fama_mes on public.salon_fama (mes);
alter table public.salon_fama enable row level security;
revoke all on public.salon_fama from public, anon, authenticated;

insert into public.logros (clave, categoria, juego, rareza, oculto, nombre, descripcion, pista, meta, recompensa, orden) values
  ('campeon-temporada', 'progresion', null, 'legendaria', false, 'Campeón de temporada', 'Termina un mes en primer lugar por Puntos ALV.', null, 1, 'Insignia legendaria', 440);

-- Cierra los meses que ya terminaron (hora de México) y que tienen partidas. Idempotente.
create function privado.cerrar_temporadas() returns int
language plpgsql security definer set search_path = '' as $$
declare v_mes date; v_actual date := date_trunc('month', now() at time zone 'America/Mexico_City')::date; v_n int := 0;
  v_desde timestamptz; v_hasta timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext('cerrar_temporadas'));
  for v_mes in
    select distinct date_trunc('month', r.creada at time zone 'America/Mexico_City')::date m
    from public.resultados_partida r
    where date_trunc('month', r.creada at time zone 'America/Mexico_City')::date < v_actual
      and not exists (select 1 from public.temporadas t where t.mes = date_trunc('month', r.creada at time zone 'America/Mexico_City')::date)
    order by 1
  loop
    v_desde := v_mes::timestamp at time zone 'America/Mexico_City';
    v_hasta := (v_mes + interval '1 month')::timestamp at time zone 'America/Mexico_City';
    -- Top 3 individual (empates comparten lugar; solo con Puntos ALV > 0; sin invitados)
    insert into public.salon_fama (tipo, mes, posicion, jugador, valor)
      select 'temporada', v_mes, x.pos, x.jugador, x.pa from (
        select r.jugador, sum(r.puntos_alv)::int pa, rank() over (order by sum(r.puntos_alv) desc) pos
        from public.resultados_partida r join public.perfiles p on p.id = r.jugador and not p.invitado
        where r.creada >= v_desde and r.creada < v_hasta group by r.jugador) x
      where x.pos <= 3 and x.pa > 0;
    -- Mejor pareja y mejor equipo del mes (por Puntos ALV del grupo; una fila por partida y grupo)
    insert into public.salon_fama (tipo, mes, posicion, integrantes, grupo, valor)
      select case x.modalidad when 'parejas' then 'pareja' else 'equipo' end, v_mes, 1, string_to_array(x.grupo, '+')::uuid[], x.grupo, x.pa from (
        select g.modalidad, g.grupo, sum(g.puntos_alv)::int pa, rank() over (partition by g.modalidad order by sum(g.puntos_alv) desc) pos
        from (select distinct on (r.partida, r.grupo) r.partida, r.grupo, r.modalidad, r.puntos_alv from public.resultados_partida r
              where r.modalidad in ('parejas', 'equipos') and r.grupo is not null and r.creada >= v_desde and r.creada < v_hasta) g
        group by g.modalidad, g.grupo) x
      where x.pos = 1 and x.pa > 0;
    -- Logro «Campeón de temporada» al 1.º lugar individual
    insert into public.logros_jugador (jugador, logro)
      select s.jugador, 'campeon-temporada' from public.salon_fama s where s.mes = v_mes and s.tipo = 'temporada' and s.posicion = 1 and s.jugador is not null
      on conflict do nothing;
    insert into public.temporadas (mes) values (v_mes);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke all on function privado.cerrar_temporadas() from public, anon, authenticated;

-- ============ 2) Salón de la Fama ============
-- tipo: temporada | pareja | equipo | torneo. etiqueta: «noviembre 2026» o el nombre del torneo.
create function public.salon_de_la_fama()
returns table (tipo text, etiqueta text, fecha date, posicion int, nombres text[], figura jsonb, valor int, retirados int)
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'sin sesión'; end if;
  perform privado.cerrar_temporadas();
  perform privado.cerrar_torneos();
  return query
    select s.tipo, to_char(s.mes, 'YYYY-MM'), s.mes, s.posicion::int,
           case when s.tipo = 'temporada' then array[coalesce(p.nombre, 'Jugador retirado')]
                else (select array_agg(coalesce(q.nombre, 'Jugador retirado') order by x.id) from unnest(s.integrantes) x(id) left join public.perfiles q on q.id = x.id) end,
           case when s.tipo = 'temporada' then (select f.figura from public.figuras_jugador f where f.jugador = s.jugador and f.activa limit 1) end,
           s.valor,
           case when s.tipo = 'temporada' then (case when s.jugador is null then 1 else 0 end)
                else (select count(*)::int from unnest(s.integrantes) x(id) where not exists (select 1 from public.perfiles q where q.id = x.id)) end
    from public.salon_fama s left join public.perfiles p on p.id = s.jugador
    union all
    select 'torneo', t.nombre, t.fin::date, 1, array[coalesce(p.nombre, 'Jugador retirado')],
           (select f.figura from public.figuras_jugador f where f.jugador = c.jugador and f.activa limit 1), c.puntos, 0
    from public.torneo_campeones c join public.torneos t on t.id = c.torneo left join public.perfiles p on p.id = c.jugador
    order by 3 desc, 1, 4
    limit 200;
end $$;
revoke all on function public.salon_de_la_fama() from public, anon;
grant execute on function public.salon_de_la_fama() to authenticated;

-- ============ 3) Récords ============
create function public.fijar_ocultar_bebidas(p_ocultar boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_res jsonb;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_ocultar is null then raise exception 'valor no válido'; end if;
  insert into public.preferencias_cuenta as pc (jugador, datos, actualizado)
    values (v_uid, jsonb_build_object('ocultarBebidas', p_ocultar), now())
    on conflict (jugador) do update set datos = pc.datos || excluded.datos, actualizado = now()
    returning pc.datos into v_res;
  return v_res;
end $$;
revoke all on function public.fijar_ocultar_bebidas(boolean) from public, anon;
grant execute on function public.fijar_ocultar_bebidas(boolean) to authenticated;

-- Quién tiene cada récord (con el filtro del ranking). Empate: el que llegó primero a ese valor no se calcula; sale el de
-- nombre menor. Un récord sin nadie con valor > 0 no sale.
create function public.records(p_filtro text)
returns table (clave text, id uuid, nombre text, figura jsonb, valor int, mio int)
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_filtro is null or p_filtro not in ('amigos', 'global') then raise exception 'filtro no válido'; end if;
  return query
  with vis as (select v.id from privado.visibles_ranking(p_filtro) v),
  r as (select rp.* from public.resultados_partida rp join vis on vis.id = rp.jugador),
  -- Racha de derrotas más larga (partidas que cuentan, sin ganar)
  derrotas as (select b.jugador, max(b.n)::int n from (
                 select a.jugador, count(*) n from (
                   select r.jugador, r.lugar > 1 perdio,
                          row_number() over (partition by r.jugador order by r.creada) - row_number() over (partition by r.jugador, r.lugar > 1 order by r.creada) g
                   from r where r.cuenta) a
                 where a.perdio group by a.jugador, a.g) b group by b.jugador),
  val as (
    select 'rey-del-caos' clave, r.jugador id, count(*)::int v from r group by r.jugador
    union all select 'incansable', r.jugador, sum(r.retos)::int from r group by r.jugador
    union all select 'sobreviviente', r.jugador, sum(r.rondas)::int from r group by r.jugador
    union all select 'desafortunado', d.jugador, d.n from derrotas d
    union all select 'traicionero', r.jugador, count(*)::int from r where r.juego = 'impostor' and r.datos -> 'impostor' = 'true'::jsonb group by r.jugador
    union all select 'noctambulo', r.jugador, count(*)::int from r
              where extract(hour from r.creada at time zone 'America/Mexico_City') >= 23 or extract(hour from r.creada at time zone 'America/Mexico_City') < 5 group by r.jugador
    union all select 'fiestero', r.jugador, sum((r.datos ->> 'tomo')::int)::int from r
              where r.datos -> 'drunk' = 'true'::jsonb and jsonb_typeof(r.datos -> 'tomo') = 'number'
                and not coalesce((select pc.datos -> 'ocultarBebidas' = 'true'::jsonb from public.preferencias_cuenta pc where pc.jugador = r.jugador), false)
              group by r.jugador
    union all select 'bromista', v.votado, count(*)::int from public.votos_noche v join vis on vis.id = v.votado where v.categoria = 'bromista' group by v.votado
  ),
  mejor as (select distinct on (val.clave) val.clave, val.id, val.v from val join public.perfiles p on p.id = val.id
            where val.v > 0 order by val.clave, val.v desc, p.nombre)
  select m.clave, m.id, p.nombre, (select f.figura from public.figuras_jugador f where f.jugador = m.id and f.activa limit 1), m.v,
         coalesce((select v2.v from val v2 where v2.clave = m.clave and v2.id = v_uid), 0)
  from mejor m join public.perfiles p on p.id = m.id;
end $$;
revoke all on function public.records(text) from public, anon;
grant execute on function public.records(text) to authenticated;
