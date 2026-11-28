-- Rankings vacíos desde la 040 (auditoría 28 nov): la base tiene activo «safeupdate», que rechaza un UPDATE sin WHERE
-- cuando la llamada llega por la API. guardar_resultados tenía tres así sobre su tabla temporal, fallaba y, como el error
-- se atrapa para no deshacer XP y monedas, ninguna partida llegó a resultados_partida (0 filas): ranking, récords y logros
-- de partida no sumaban. Misma función, con «where true» en esos tres UPDATE.
create or replace function privado.guardar_resultados(p_partida uuid, p_evento uuid, p_juego text, p_resultados jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_arr jsonb; v_cfg jsonb; v_plan int; v_mod text; v_drunk boolean; v_herr text; v_temprano boolean;
  v_rondas int; v_registrados int; v_unidades int; v_premiados int; v_cuenta boolean; v_con_puntos boolean; v_n int;
begin
  -- Arranque de la partida: la acción «arranque» que mandó el anfitrión o el coanfitrión.
  select a.datos into v_arr from public.acciones a join public.eventos e on e.id = p_evento
    where a.partida = p_partida and coalesce(a.datos ->> '_tipo', a.tipo) = 'control' and a.datos ->> 'que' = 'arranque'
      and a.jugador in (e.anfitrion, e.coanfitrion)
    order by a.n limit 1;
  v_cfg := case when jsonb_typeof(v_arr -> 'cfg') = 'object' then v_arr -> 'cfg' else '{}'::jsonb end;
  v_plan := privado.entero(v_arr -> 'rondas', 1, 40);
  v_mod := case when (v_cfg ->> 'modalidad') in ('parejas', 'equipos', 'sexos') then v_cfg ->> 'modalidad' else 'individual' end;
  v_drunk := coalesce(v_cfg -> 'drunk' = 'true'::jsonb, false);
  v_herr := case when (v_cfg #>> '{verdadReto,herramienta}') ~ '^[a-z]{1,20}$' then v_cfg #>> '{verdadReto,herramienta}' end;
  -- Terminada antes de tiempo = el anfitrión (o el coanfitrión) mandó «terminar».
  select exists (select 1 from public.acciones a join public.eventos e on e.id = p_evento
    where a.partida = p_partida and coalesce(a.datos ->> '_tipo', a.tipo) = 'control' and a.datos ->> 'que' = 'terminar'
      and a.jugador in (e.anfitrion, e.coanfitrion)) into v_temprano;

  create temp table if not exists _res (j uuid primary key, pts int, lug int, ron int, ret int, d jsonb, eq text, reg boolean,
    grp text, valor numeric, ulugar int, mvp boolean) on commit drop;
  truncate _res;

  insert into _res (j, pts, lug, ron, ret, d, reg)
  select distinct on (s.j) s.j, s.pts, s.lug, s.ron, s.ret, s.d, not coalesce(p.invitado, true)
  from (
    select case when x ->> 'jugador' ~ '^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$' then (x ->> 'jugador')::uuid end j,
           privado.entero(x -> 'puntos', -999, 999) pts, privado.entero(x -> 'lugar', 1, 8) lug,
           privado.entero(x -> 'rondas', 0, 40) ron, coalesce(privado.entero(x -> 'retos', 0, 40), 0) ret,
           case when jsonb_typeof(x -> 'datos') = 'object' then x -> 'datos' else '{}'::jsonb end d
    from jsonb_array_elements(p_resultados) x
  ) s
  join public.miembros_evento m on m.evento = p_evento and m.jugador = s.j
  left join public.perfiles p on p.id = s.j
  where s.j is not null;

  get diagnostics v_n = row_count;
  if v_n = 0 then return 0; end if;

  -- Grupo de cada quien, del arranque (solo en parejas, equipos o ALVersus).
  if v_mod <> 'individual' and jsonb_typeof(v_cfg -> 'jugadores') = 'array' then
    update _res r set eq = c.eq from (
      select y ->> 'id' id, nullif(left(y ->> 'equipo', 40), '') eq from jsonb_array_elements(v_cfg -> 'jugadores') y
    ) c where c.id = r.j::text;
  end if;
  update _res r set grp = g.k from (
    select eq, string_agg(j::text, '+' order by j::text) k from _res where eq is not null group by eq
  ) g where g.eq = r.eq;

  -- Valor para ordenar: puntos (propios o del grupo). Si falta algún puntaje (aparato viejo), el lugar que mandó.
  v_con_puntos := not exists (select 1 from _res where pts is null);
  if v_con_puntos then
    update _res r set valor = coalesce((select sum(x.pts) from _res x where x.eq = r.eq), r.pts) where true;
  else
    update _res r set valor = -coalesce(r.lug, 8) where true;
  end if;

  -- Lugar por unidad (jugador o grupo), con empates 1, 1, 3 (T1). Las unidades sin grupo son jugadores sueltos.
  with u as (select coalesce(eq, j::text) k, max(valor) v from _res group by 1),
       l as (select k, rank() over (order by v desc) lugar from u)
  update _res r set ulugar = l.lugar from l where l.k = coalesce(r.eq, r.j::text);
  select count(distinct coalesce(eq, j::text)) into v_unidades from _res;
  v_premiados := case when v_unidades >= 6 then 3 when v_unidades >= 4 then 2 else 1 end;   -- T3: misma regla que la XP

  select coalesce(max(ron), 0), count(*) filter (where reg) into v_rondas, v_registrados from _res;
  -- T2, T6, T9: cuenta si no es Bienvenida, hay 2+ cuentas registradas, se jugó al menos 1 ronda y, si se terminó
  -- antes de tiempo, al menos la mitad de lo planeado y un mínimo de 3. Una partida que acaba sola (El impostor al
  -- atrapar a todos) cuenta completa.
  v_cuenta := p_juego <> 'bienvenida' and v_registrados >= 2 and v_rondas >= 1
              and (not v_temprano or v_rondas >= greatest(3, ceil(coalesce(v_plan, 6) / 2.0)));

  -- MVP (D1, T14): el de más puntos; en grupos, entre los integrantes de los grupos en 1.º. Empates: compartido.
  -- En individual, lugar 1 ya es «el de más puntos»; en grupos, son los integrantes de los grupos en 1.º.
  update _res set mvp = false where true;
  if v_con_puntos then
    update _res r set mvp = true
    where r.ulugar = 1 and r.pts > 0 and r.pts = (select max(x.pts) from _res x where x.ulugar = 1);
  end if;

  insert into public.resultados_partida (partida, jugador, evento, juego, modalidad, grupo, puntos, puntos_grupo, lugar, unidades,
    cuenta, puntos_alv, mvp, rondas, rondas_plan, retos, datos)
  select p_partida, r.j, p_evento, p_juego, v_mod, r.grp, r.pts,
         case when r.eq is not null and v_con_puntos then r.valor::int end,
         least(r.ulugar, 8), v_unidades, v_cuenta,
         case when v_cuenta and r.ulugar <= v_premiados then 4 - r.ulugar else 0 end,
         r.mvp, coalesce(r.ron, v_rondas), v_plan, least(r.ret, 40),
         jsonb_strip_nulls(jsonb_build_object(
           'impostor',     case when jsonb_typeof(r.d -> 'impostor') = 'boolean' then r.d -> 'impostor' end,
           'atrapado',     case when jsonb_typeof(r.d -> 'atrapado') = 'boolean' then r.d -> 'atrapado' end,
           'votoImpostor', privado.entero(r.d -> 'votoImpostor', 0, 40),
           'votosRecibidos', privado.entero(r.d -> 'votosRecibidos', 0, 40),
           'reto',         privado.entero(r.d -> 'reto', 0, 40),
           'peorLugar',    privado.entero(r.d -> 'peorLugar', 1, 8),
           'tomo',         case when v_drunk then privado.entero(r.d -> 'tomo', 0, 40) end,   -- D7: solo con Drunk
           'drunk',        case when v_drunk then true end,
           'herramienta',  v_herr))
  from _res r where r.reg
  on conflict (partida, jugador) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
