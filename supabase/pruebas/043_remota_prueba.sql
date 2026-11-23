-- Prueba de la 043 en la base remota, dentro de un bloque que termina SIEMPRE con una excepción: nada queda guardado.
-- Autorizada por Elías el 2026-11-23 («sigue con la etapa 2 … publicar directo y probar que no haya errores»).
-- Contiene el texto de 043_logros_etapa2.sql con $$ cambiado a $f$. A = anfitrión, B y C = jugadores, E = fuera.
-- Resultado 2026-11-23: catálogo 27; B ganó primeros-pasos, primera-victoria y remontada; 7 objetivos, cobró 100 XP, segunda
-- vez «ya reclamado», sin cumplir «todavía no se cumple», escribir directo «permission denied»; votar por sí «voto no válido»,
-- conteo bien, cuenta de fuera «sin permiso», sin lectura directa de votos; título «¿Y tú qué haces aquí?»; grupo «Los reyes»;
-- otro jugador no lo renombra; 5 ocultos sin nombre para quien no los ganó; anónimo sin permiso.
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid(); e uuid := gen_random_uuid();
  ev uuid; p uuid; u uuid; r text := ''; t text; n int; yo text := current_user;
begin
  execute $m$
-- 043 · Ranking y Logros, etapa 2 (Maestro v1.55). Necesita 040, 041 y 042.
-- 1) Logros ocultos y de progresión (7 nuevos). Los ocultos se ven como silueta con pista hasta ganarlos.
-- 2) Objetivos del día y de la semana (hora de México) con XP (PROPUESTA, valores del encargo; respetan el tope de 600 al día).
-- 3) Votaciones de la noche (D6): más divertido, bromista, alma de la fiesta y el impredecible de la noche.
-- 4) Títulos y marcos: cada logro ganado da su nombre como título y su marco por rareza; uno en uso a la vez.
-- 5) Identidad de parejas y equipos (D4): nombre, color y emoji.
-- Los logros siguen sin XP (D0). La XP de objetivos la escribe solo reclamar_objetivo.

-- ============ 1) Logros nuevos ============
insert into public.logros (clave, categoria, juego, rareza, oculto, nombre, descripcion, pista, meta, recompensa, orden) values
  ('remontada',      'oculto',     null,       'epica',      true,  '¿Y tú qué haces aquí?', 'Gana una partida después de ir en último lugar.', 'Nunca te des por vencido.', 1, 'Insignia épica', 310),
  ('sospechoso',     'oculto',     'impostor', 'rara',       true,  'El sospechoso habitual', 'Recibe votos de impostor en 5 partidas sin serlo.', 'Algo en tu cara no convence.', 5, 'Insignia rara', 320),
  ('intocable',      'oculto',     'impostor', 'epica',      true,  'El intocable', 'Gana 3 partidas siendo el impostor.', 'Mentir se te da muy bien.', 3, 'Insignia épica', 330),
  ('noctambulo',     'oculto',     null,       'rara',       true,  'El noctámbulo', 'Termina una partida entre las 3:00 y las 5:00.', 'La fiesta no se acaba.', 1, 'Insignia rara', 340),
  ('caos',           'oculto',     null,       'legendaria', true,  'Caos absoluto', 'En una misma noche gana una de azar, una de deducción y una por equipos.', 'Hazlo todo en una sola noche.', 1, 'Insignia legendaria', 350),
  ('leyenda-local',  'progresion', null,       'rara',       false, 'Leyenda local', 'Llega al nivel 10.', null, 10, 'Insignia rara', 410),
  ('alv-legendario', 'progresion', null,       'legendaria', false, 'ALV Legendario', 'Llega al nivel 20.', null, 20, 'Insignia legendaria', 420),
  ('constante',      'progresion', null,       'rara',       false, 'Constante', 'Completa 10 objetivos.', null, 10, 'Insignia rara', 430);

-- ============ 2) Objetivos ============
create table public.objetivos (
  clave    text primary key check (clave ~ '^[a-z0-9-]{1,40}$'),
  periodo  text not null check (periodo in ('dia', 'semana')),
  nombre   text not null check (length(nombre) between 1 and 60),
  metrica  text not null check (metrica in ('partidas', 'victorias', 'juego-nuevo', 'personas', 'mvp')),
  meta     int not null check (meta between 1 and 100),
  xp       int not null check (xp between 0 and 300),
  orden    int not null default 0,
  activo   boolean not null default true
);
alter table public.objetivos enable row level security;
revoke all on public.objetivos from public, anon, authenticated;
insert into public.objetivos (clave, periodo, nombre, metrica, meta, xp, orden) values
  ('dia-partidas',    'dia',    'Juega 3 partidas',               'partidas',    3,  100, 10),
  ('dia-victoria',    'dia',    'Gana una partida',               'victorias',   1,  100, 20),
  ('dia-juego-nuevo', 'dia',    'Prueba un juego que no conocías', 'juego-nuevo', 1,  150, 30),
  ('dia-personas',    'dia',    'Juega con 3 personas',           'personas',    3,  200, 40),
  ('sem-victorias',   'semana', 'Gana 5 partidas',                'victorias',   5,  300, 110),
  ('sem-partidas',    'semana', 'Juega 15 partidas',              'partidas',    15, 300, 120),
  ('sem-mvp',         'semana', 'Sé el MVP 3 veces',              'mvp',         3,  250, 130);

create table public.objetivos_jugador (
  jugador   uuid not null references public.perfiles (id) on delete cascade,
  objetivo  text not null references public.objetivos (clave) on delete cascade,
  periodo   date not null,                      -- día o lunes de la semana (hora de México)
  xp        int not null default 0,
  creado    timestamptz not null default now(),
  primary key (jugador, objetivo, periodo)
);
alter table public.objetivos_jugador enable row level security;
revoke all on public.objetivos_jugador from public, anon, authenticated;
grant select on public.objetivos_jugador to authenticated;
create policy objetivos_jugador_leer on public.objetivos_jugador for select to authenticated using (jugador = (select auth.uid()));

-- Inicio del periodo y su rango en hora de México.
create function privado.periodo_objetivo(p_periodo text) returns table (inicio date, desde timestamptz, hasta timestamptz)
language sql stable set search_path = '' as $f$
  with d as (select (now() at time zone 'America/Mexico_City')::date hoy)
  select x.i, x.i::timestamp at time zone 'America/Mexico_City', (x.i + case when p_periodo = 'dia' then 1 else 7 end)::timestamp at time zone 'America/Mexico_City'
  from (select case when p_periodo = 'dia' then d.hoy else date_trunc('week', d.hoy)::date end i from d) x $f$;

create function privado.avance_objetivo(p_jugador uuid, p_metrica text, p_desde timestamptz, p_hasta timestamptz) returns int
language sql stable security definer set search_path = '' as $f$
  select case p_metrica
    when 'partidas' then (select count(*) from public.resultados_partida r where r.jugador = p_jugador and r.creada >= p_desde and r.creada < p_hasta)
    when 'victorias' then (select count(*) from public.resultados_partida r where r.jugador = p_jugador and r.cuenta and r.lugar = 1 and r.creada >= p_desde and r.creada < p_hasta)
    when 'mvp' then (select count(*) from public.resultados_partida r where r.jugador = p_jugador and r.cuenta and r.mvp and r.creada >= p_desde and r.creada < p_hasta)
    when 'personas' then (select count(distinct o.jugador) from public.resultados_partida r join public.resultados_partida o on o.partida = r.partida and o.jugador <> p_jugador
                          where r.jugador = p_jugador and r.creada >= p_desde and r.creada < p_hasta)
    when 'juego-nuevo' then (select count(distinct r.juego) from public.resultados_partida r where r.jugador = p_jugador and r.creada >= p_desde and r.creada < p_hasta
                             and not exists (select 1 from public.resultados_partida a where a.jugador = p_jugador and a.juego = r.juego and a.creada < p_desde))
    else 0 end::int $f$;
revoke all on function privado.avance_objetivo(uuid, text, timestamptz, timestamptz) from public, anon, authenticated;

create function public.mis_objetivos()
returns table (clave text, periodo text, nombre text, meta int, va int, xp int, reclamado boolean, termina timestamptz, orden int)
language plpgsql stable security definer set search_path = '' as $f$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  return query
    select o.clave, o.periodo, o.nombre, o.meta, least(privado.avance_objetivo(v_uid, o.metrica, p.desde, p.hasta), o.meta), o.xp,
           exists (select 1 from public.objetivos_jugador j where j.jugador = v_uid and j.objetivo = o.clave and j.periodo = p.inicio), p.hasta, o.orden
    from public.objetivos o cross join lateral privado.periodo_objetivo(o.periodo) p
    where o.activo order by o.orden;
end $f$;
revoke all on function public.mis_objetivos() from public, anon;
grant execute on function public.mis_objetivos() to authenticated;

-- Cobra un objetivo cumplido del periodo actual. Devuelve la XP que dio (puede ser menos por el tope de 600 al día).
create function public.reclamar_objetivo(p_clave text) returns int
language plpgsql security definer set search_path = '' as $f$
declare v_uid uuid := (select auth.uid()); o public.objetivos; p record; v_xp int; v_hoy int;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if exists (select 1 from public.perfiles x where x.id = v_uid and x.invitado) then raise exception 'sin permiso'; end if;
  select * into o from public.objetivos where clave = p_clave and activo;
  if o.clave is null then raise exception 'objetivo no válido'; end if;
  select * into p from privado.periodo_objetivo(o.periodo);
  if privado.avance_objetivo(v_uid, o.metrica, p.desde, p.hasta) < o.meta then raise exception 'todavía no se cumple'; end if;
  perform pg_advisory_xact_lock(hashtext('xp:' || v_uid::text));
  if exists (select 1 from public.objetivos_jugador j where j.jugador = v_uid and j.objetivo = o.clave and j.periodo = p.inicio) then raise exception 'ya reclamado'; end if;
  select coalesce(sum(m.xp), 0) into v_hoy from public.movimientos_xp m where m.jugador = v_uid and m.tipo = 'ganada' and m.creado >= date_trunc('day', now());
  v_xp := least(o.xp, greatest(0, 600 - v_hoy));
  insert into public.objetivos_jugador (jugador, objetivo, periodo, xp) values (v_uid, o.clave, p.inicio, v_xp);
  if v_xp > 0 then
    insert into public.movimientos_xp (jugador, tipo, xp, motivo) values (v_uid, 'ganada', v_xp, left('objetivo:' || o.clave, 60));
  end if;
  return v_xp;
end $f$;
revoke all on function public.reclamar_objetivo(text) from public, anon;
grant execute on function public.reclamar_objetivo(text) to authenticated;

create trigger logros_tras_objetivo after insert on public.objetivos_jugador for each row execute function privado.tras_resultado();

-- ============ 3) Votaciones de la noche ============
create table public.votos_noche (
  evento     uuid not null references public.eventos (id) on delete cascade,
  votante    uuid not null references public.perfiles (id) on delete cascade,
  categoria  text not null check (categoria in ('divertido', 'bromista', 'alma', 'impredecible')),
  votado     uuid not null references public.perfiles (id) on delete cascade,
  creado     timestamptz not null default now(),
  primary key (evento, votante, categoria),
  check (votante <> votado)
);
alter table public.votos_noche enable row level security;
revoke all on public.votos_noche from public, anon, authenticated;

-- Vota (o cambia su voto) mientras la sala está abierta o hasta 24 h después de cerrarla. Nadie vota por sí mismo.
create function public.votar_noche(p_evento uuid, p_categoria text, p_votado uuid) returns void
language plpgsql security definer set search_path = '' as $f$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_categoria is null or p_categoria not in ('divertido', 'bromista', 'alma', 'impredecible') then raise exception 'categoría no válida'; end if;
  if p_votado is null or p_votado = v_uid then raise exception 'voto no válido'; end if;
  if not exists (select 1 from public.eventos e where e.id = p_evento and (not e.cerrado or e.cerrado_en > now() - interval '24 hours')) then raise exception 'votación cerrada'; end if;
  if not exists (select 1 from public.miembros_evento m join public.perfiles p on p.id = m.jugador and not p.invitado where m.evento = p_evento and m.jugador = v_uid) then raise exception 'sin permiso'; end if;
  if not exists (select 1 from public.miembros_evento m join public.perfiles p on p.id = m.jugador and not p.invitado where m.evento = p_evento and m.jugador = p_votado) then raise exception 'voto no válido'; end if;
  insert into public.votos_noche (evento, votante, categoria, votado) values (p_evento, v_uid, p_categoria, p_votado)
    on conflict (evento, votante, categoria) do update set votado = excluded.votado, creado = now();
end $f$;
revoke all on function public.votar_noche(uuid, text, uuid) from public, anon;
grant execute on function public.votar_noche(uuid, text, uuid) to authenticated;

-- Conteo de la noche (solo miembros) y el voto propio de cada categoría. Nunca dice quién votó por quién.
create function public.votos_de_la_noche(p_evento uuid)
returns table (categoria text, votado uuid, nombre text, votos int, mi_voto uuid)
language plpgsql stable security definer set search_path = '' as $f$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if not privado.es_miembro(p_evento) then raise exception 'sin permiso'; end if;
  return query
    select c.cat, v.votado, p.nombre, count(v.votado)::int,
           (select m.votado from public.votos_noche m where m.evento = p_evento and m.votante = v_uid and m.categoria = c.cat)
    from unnest(array['divertido', 'bromista', 'alma', 'impredecible']) c(cat)
    left join public.votos_noche v on v.evento = p_evento and v.categoria = c.cat
    left join public.perfiles p on p.id = v.votado
    group by c.cat, v.votado, p.nombre
    order by c.cat, count(v.votado) desc;
end $f$;
revoke all on function public.votos_de_la_noche(uuid) from public, anon;
grant execute on function public.votos_de_la_noche(uuid) to authenticated;

-- Ranking de reconocimientos: votos recibidos por categoría (o todas), con el mismo filtro del ranking.
create function public.ranking_reconocimientos(p_filtro text, p_categoria text default null, p_temporada boolean default false)
returns table (posicion int, id uuid, nombre text, nivel int, figura jsonb, votos int)
language plpgsql stable security definer set search_path = '' as $f$
declare v_uid uuid := (select auth.uid()); v_t tstzrange := privado.temporada_actual();
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_filtro is null or p_filtro not in ('amigos', 'global') then raise exception 'filtro no válido'; end if;
  if p_categoria is not null and p_categoria not in ('divertido', 'bromista', 'alma', 'impredecible') then raise exception 'categoría no válida'; end if;
  return query
    with agg as (select v.votado, count(*)::int n from public.votos_noche v join privado.visibles_ranking(p_filtro) vis on vis.id = v.votado
                 where (p_categoria is null or v.categoria = p_categoria) and (not coalesce(p_temporada, false) or v.creado <@ v_t)
                 group by v.votado)
    select rank() over (order by agg.n desc)::int, agg.votado, p.nombre, public.nivel_por_xp(s.acumulada),
           (select f.figura from public.figuras_jugador f where f.jugador = agg.votado and f.activa limit 1), agg.n
    from agg join public.perfiles p on p.id = agg.votado cross join lateral privado.saldos_de(agg.votado) s
    order by 1, p.nombre limit 100;
end $f$;
revoke all on function public.ranking_reconocimientos(text, text, boolean) from public, anon;
grant execute on function public.ranking_reconocimientos(text, text, boolean) to authenticated;

-- ============ 4) Título y marco en uso ============
alter table public.logros_jugador add column en_uso boolean not null default false;
create unique index logros_jugador_un_titulo on public.logros_jugador (jugador) where en_uso;

create function public.usar_titulo(p_clave text) returns void
language plpgsql security definer set search_path = '' as $f$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_clave is not null and not exists (select 1 from public.logros_jugador lj where lj.jugador = v_uid and lj.logro = p_clave) then raise exception 'logro no ganado'; end if;
  update public.logros_jugador set en_uso = false where jugador = v_uid and en_uso;
  if p_clave is not null then update public.logros_jugador set en_uso = true where jugador = v_uid and logro = p_clave; end if;
end $f$;
revoke all on function public.usar_titulo(text) from public, anon;
grant execute on function public.usar_titulo(text) to authenticated;

create function privado.titulo_de(p_jugador uuid) returns table (titulo text, rareza text)
language sql stable security definer set search_path = '' as $f$
  select l.nombre, l.rareza from public.logros_jugador lj join public.logros l on l.clave = lj.logro where lj.jugador = p_jugador and lj.en_uso limit 1 $f$;
revoke all on function privado.titulo_de(uuid) from public, anon, authenticated;

-- mi_progreso_logros con «en_uso».
drop function public.mi_progreso_logros();
create function public.mi_progreso_logros()
returns table (clave text, categoria text, juego text, rareza text, oculto boolean, nombre text, descripcion text, pista text,
               meta int, va int, recompensa text, ganado timestamptz, destacado boolean, orden int, en_uso boolean)
language plpgsql stable security definer set search_path = '' as $f$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  return query
    select l.clave, l.categoria, l.juego, l.rareza, l.oculto,
           case when l.oculto and lj.logro is null then null else l.nombre end,
           case when l.oculto and lj.logro is null then null else l.descripcion end,
           l.pista, l.meta, least(coalesce(g.va, 0), l.meta), l.recompensa, lj.creado, coalesce(lj.destacado, false), l.orden, coalesce(lj.en_uso, false)
    from public.logros l
    left join privado.progreso_logros(v_uid) g on g.clave = l.clave
    left join public.logros_jugador lj on lj.jugador = v_uid and lj.logro = l.clave
    where l.activo
    order by l.orden;
end $f$;
revoke all on function public.mi_progreso_logros() from public, anon;
grant execute on function public.mi_progreso_logros() to authenticated;

-- ranking_jugadores con título y marco.
drop function public.ranking_jugadores(text, boolean);
create function public.ranking_jugadores(p_filtro text, p_temporada boolean default false)
returns table (posicion int, id uuid, nombre text, nivel int, figura jsonb, puntos_alv int, victorias int, partidas int,
               mvp int, racha int, juegos int, victorias_azar int, victorias_deduccion int, titulo text, rareza_titulo text)
language plpgsql stable security definer set search_path = '' as $f$
declare v_uid uuid := (select auth.uid()); v_t tstzrange := privado.temporada_actual();
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_filtro is null or p_filtro not in ('amigos', 'global') then raise exception 'filtro no válido'; end if;
  return query
  with vis as (select v.id from privado.visibles_ranking(p_filtro) v),
  r as (select rp.* from public.resultados_partida rp join vis on vis.id = rp.jugador
        where not coalesce(p_temporada, false) or rp.creada <@ v_t),
  agg as (select r.jugador, sum(r.puntos_alv)::int pa,
            count(*) filter (where r.cuenta and r.lugar = 1)::int vic, count(*)::int pj,
            count(*) filter (where r.cuenta and r.mvp)::int mv, count(distinct r.juego)::int jg,
            count(*) filter (where r.cuenta and r.lugar = 1 and privado.es_azar(r.juego, r.datos))::int va,
            count(*) filter (where r.cuenta and r.lugar = 1 and privado.es_deduccion(r.juego))::int vd
          from r group by r.jugador),
  ra as (select b.jugador, max(b.n)::int racha from (
           select a.jugador, count(*) n from (
             select r.jugador, r.lugar = 1 gano,
                    row_number() over (partition by r.jugador order by r.creada) - row_number() over (partition by r.jugador, r.lugar = 1 order by r.creada) g
             from r where r.cuenta) a
           where a.gano group by a.jugador, a.g) b group by b.jugador),
  t as (select vis.id, coalesce(agg.pa, 0) pa, coalesce(agg.vic, 0) vic, coalesce(agg.pj, 0) pj, coalesce(agg.mv, 0) mv,
               coalesce(ra.racha, 0) rc, coalesce(agg.jg, 0) jg, coalesce(agg.va, 0) va, coalesce(agg.vd, 0) vd,
               rank() over (order by coalesce(agg.pa, 0) desc, coalesce(agg.vic, 0) desc)::int pos
        from vis left join agg on agg.jugador = vis.id left join ra on ra.jugador = vis.id)
  select t.pos, t.id, p.nombre, public.nivel_por_xp(s.acumulada),
         (select f.figura from public.figuras_jugador f where f.jugador = t.id and f.activa limit 1),
         t.pa, t.vic, t.pj, t.mv, t.rc, t.jg, t.va, t.vd, ti.titulo, ti.rareza
  from t join public.perfiles p on p.id = t.id cross join lateral privado.saldos_de(t.id) s
  left join lateral privado.titulo_de(t.id) ti on true
  where t.pos <= 100 or t.id = v_uid
  order by t.pos, p.nombre;
end $f$;
revoke all on function public.ranking_jugadores(text, boolean) from public, anon;
grant execute on function public.ranking_jugadores(text, boolean) to authenticated;

-- ============ 5) Identidad de parejas y equipos ============
create table public.grupos_identidad (
  grupo       text primary key check (length(grupo) <= 400),
  nombre      text not null check (length(trim(nombre)) between 2 and 30),
  color       text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  emoji       text check (emoji is null or length(emoji) <= 8),
  por         uuid references public.perfiles (id) on delete set null,
  actualizado timestamptz not null default now()
);
alter table public.grupos_identidad enable row level security;
revoke all on public.grupos_identidad from public, anon, authenticated;

-- Cualquier integrante con partidas en ese grupo puede ponerle nombre, color y emoji.
create function public.nombrar_grupo(p_grupo text, p_nombre text, p_color text, p_emoji text default null) returns void
language plpgsql security definer set search_path = '' as $f$
declare v_uid uuid := (select auth.uid()); v_n text := trim(regexp_replace(coalesce(p_nombre, ''), '\s+', ' ', 'g'));
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_grupo is null or not (v_uid::text = any (string_to_array(p_grupo, '+'))) then raise exception 'sin permiso'; end if;
  if not exists (select 1 from public.resultados_partida r where r.jugador = v_uid and r.grupo = p_grupo) then raise exception 'sin permiso'; end if;
  if length(v_n) not between 2 and 30 then raise exception 'nombre no válido'; end if;
  if p_color is null or p_color !~ '^#[0-9a-fA-F]{6}$' then raise exception 'color no válido'; end if;
  if p_emoji is not null and length(p_emoji) > 8 then raise exception 'emoji no válido'; end if;
  insert into public.grupos_identidad (grupo, nombre, color, emoji, por) values (p_grupo, v_n, lower(p_color), nullif(p_emoji, ''), v_uid)
    on conflict (grupo) do update set nombre = excluded.nombre, color = excluded.color, emoji = excluded.emoji, por = v_uid, actualizado = now();
end $f$;
revoke all on function public.nombrar_grupo(text, text, text, text) from public, anon;
grant execute on function public.nombrar_grupo(text, text, text, text) to authenticated;

-- Mis parejas y equipos (para ponerles nombre).
create function public.mis_grupos()
returns table (grupo text, modalidad text, integrantes text[], partidas int, nombre text, color text, emoji text)
language plpgsql stable security definer set search_path = '' as $f$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  return query
    select r.grupo, min(r.modalidad), (select array_agg(p.nombre order by p.id) from public.perfiles p where p.id::text = any (string_to_array(r.grupo, '+'))),
           count(*)::int, gi.nombre, gi.color, gi.emoji
    from public.resultados_partida r left join public.grupos_identidad gi on gi.grupo = r.grupo
    where r.jugador = v_uid and r.grupo is not null and r.modalidad in ('parejas', 'equipos')
    group by r.grupo, gi.nombre, gi.color, gi.emoji
    order by count(*) desc limit 30;
end $f$;
revoke all on function public.mis_grupos() from public, anon;
grant execute on function public.mis_grupos() to authenticated;

-- ranking_grupos con su identidad.
drop function public.ranking_grupos(text, text, boolean);
create function public.ranking_grupos(p_modalidad text, p_filtro text, p_temporada boolean default false)
returns table (posicion int, integrantes uuid[], nombres text[], puntos_alv int, victorias int, partidas int, porcentaje int, racha int,
               grupo text, nombre_grupo text, color text, emoji text)
language plpgsql stable security definer set search_path = '' as $f$
declare v_uid uuid := (select auth.uid()); v_t tstzrange := privado.temporada_actual();
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_modalidad is null or p_modalidad not in ('parejas', 'equipos') then raise exception 'modalidad no válida'; end if;
  if p_filtro is null or p_filtro not in ('amigos', 'global') then raise exception 'filtro no válido'; end if;
  return query
  with vis as (select v.id from privado.visibles_ranking(p_filtro) v),
  pg as (select distinct on (rp.partida, rp.grupo) rp.partida, rp.grupo, rp.lugar, rp.puntos_alv, rp.cuenta, rp.creada
         from public.resultados_partida rp
         where rp.modalidad = p_modalidad and rp.grupo is not null
           and (not coalesce(p_temporada, false) or rp.creada <@ v_t)),
  ok as (select g.grupo, array_agg(x.id::uuid order by x.id) ids from (select distinct pg.grupo from pg) g
           cross join lateral unnest(string_to_array(g.grupo, '+')) x(id)
         group by g.grupo
         having bool_and(exists (select 1 from vis where vis.id::text = x.id))),
  agg as (select pg.grupo, sum(pg.puntos_alv)::int pa, count(*) filter (where pg.cuenta and pg.lugar = 1)::int vic,
            count(*) filter (where pg.cuenta)::int pc, count(*)::int pj
          from pg join ok on ok.grupo = pg.grupo group by pg.grupo),
  ra as (select b.grupo, max(b.n)::int racha from (
           select a.grupo, count(*) n from (
             select pg.grupo, pg.lugar = 1 gano,
                    row_number() over (partition by pg.grupo order by pg.creada) - row_number() over (partition by pg.grupo, pg.lugar = 1 order by pg.creada) g
             from pg join ok on ok.grupo = pg.grupo where pg.cuenta) a
           where a.gano group by a.grupo, a.g) b group by b.grupo)
  select rank() over (order by agg.pa desc, agg.vic desc)::int, ok.ids,
         (select array_agg(p.nombre order by p.id) from public.perfiles p where p.id = any (ok.ids)),
         agg.pa, agg.vic, agg.pj, case when agg.pc > 0 then round(100.0 * agg.vic / agg.pc)::int else 0 end, coalesce(ra.racha, 0),
         agg.grupo, gi.nombre, gi.color, gi.emoji
  from agg join ok on ok.grupo = agg.grupo left join ra on ra.grupo = agg.grupo left join public.grupos_identidad gi on gi.grupo = agg.grupo
  order by 1 limit 100;
end $f$;
revoke all on function public.ranking_grupos(text, text, boolean) from public, anon;
grant execute on function public.ranking_grupos(text, text, boolean) to authenticated;

-- ============ Progreso de logros con los nuevos ============
create or replace function privado.progreso_logros(p_jugador uuid) returns table (clave text, va int)
language sql stable security definer set search_path = '' as $f$
  with r as (select * from public.resultados_partida where jugador = p_jugador),
  gano as (select * from r where cuenta and lugar = 1),
  otros as (select distinct o.jugador from public.resultados_partida o join r on r.partida = o.partida where o.jugador <> p_jugador),
  racha as (select coalesce(max(n), 0) n from (
              select count(*) n from (
                select lugar = 1 g, row_number() over (order by creada) - row_number() over (partition by lugar = 1 order by creada) k
                from r where cuenta) a where g group by k) b),
  nivel as (select public.nivel_por_xp(s.acumulada) n from privado.saldos_de(p_jugador) s)
  select x.clave, least(x.va, 100000)::int from (values
    ('primeros-pasos',   (select count(*) from r)),
    ('primera-victoria', (select count(*) from gano)),
    ('noche-completa',   (select coalesce(max(n), 0) from (select count(*) n from r where evento is not null group by evento) t)),
    ('polifacetico',     (select count(distinct juego) from r)),
    ('estratega',        (select count(*) from gano where privado.es_deduccion(juego))),
    ('suertudo',         (select count(*) from gano where privado.es_azar(juego, datos))),
    ('mvp',              (select count(*) from r where cuenta and mvp)),
    ('imparable',        (select n from racha)),
    ('veterano',         (select count(*) from r)),
    ('ya-eres-parte',    (select count(*) from otros)),
    ('casa-llena',       (select count(*) from r where unidades = 8 or (select count(*) from public.resultados_partida o where o.partida = r.partida) >= 8)),
    ('popular',          (select count(*) from otros)),
    ('dupla',            (select coalesce(max(n), 0) from (select count(*) n from gano where modalidad = 'parejas' and grupo is not null group by grupo) t)),
    ('los-de-siempre',   (select coalesce(max(n), 0) from (select count(*) n from r where modalidad = 'equipos' and grupo is not null group by grupo) t)),
    ('campeon-noche',    (select count(*) from public.copas_noche c where c.jugador = p_jugador and c.categoria = 'individual' and c.lugar = 1)),
    ('campeon',          (select count(*) from public.torneo_campeones c where c.jugador = p_jugador)),
    ('cara-de-poker',    (select count(*) from gano where juego = 'impostor' and datos -> 'impostor' = 'true'::jsonb)),
    ('detective',        (select coalesce(sum((datos ->> 'votoImpostor')::int), 0) from r where juego = 'impostor' and jsonb_typeof(datos -> 'votoImpostor') = 'number')),
    ('valiente',         (select coalesce(sum((datos ->> 'reto')::int), 0) from r where juego = 'verdad-reto' and jsonb_typeof(datos -> 'reto') = 'number')),
    ('remontada',        (select count(*) from gano where unidades >= 3 and jsonb_typeof(datos -> 'peorLugar') = 'number' and (datos ->> 'peorLugar')::int >= unidades)),
    ('sospechoso',       (select count(*) from r where juego = 'impostor' and coalesce(datos -> 'impostor' <> 'true'::jsonb, true)
                            and jsonb_typeof(datos -> 'votosRecibidos') = 'number' and (datos ->> 'votosRecibidos')::int > 0)),
    ('intocable',        (select count(*) from gano where juego = 'impostor' and datos -> 'impostor' = 'true'::jsonb)),
    ('noctambulo',       (select count(*) from r where extract(hour from creada at time zone 'America/Mexico_City') between 3 and 4)),
    ('caos',             (select count(*) from (select evento from gano where evento is not null group by evento
                            having bool_or(privado.es_azar(juego, datos)) and bool_or(privado.es_deduccion(juego)) and bool_or(modalidad in ('equipos', 'sexos'))) t)),
    ('leyenda-local',    (select n from nivel)),
    ('alv-legendario',   (select n from nivel)),
    ('constante',        (select count(*) from public.objetivos_jugador j where j.jugador = p_jugador))
  ) x(clave, va) $f$;

$m$;
  foreach u in array array[a, b, c, e] loop
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
      values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prueba_' || left(u::text, 8) || '@jugadores.alv.invalid', '', now(), now());
  end loop;
  insert into public.perfiles (id, nombre) select x, 'prueba_' || left(x::text, 6) from unnest(array[a, b, c, e]) x on conflict (id) do nothing;
  update public.perfiles set mayor_18 = true where id in (a, b, c, e);
  insert into public.eventos (codigo, nombre, anfitrion) values ('PRB043', 'Prueba 043', a) returning id into ev;
  insert into public.miembros_evento (evento, jugador) select ev, x from unnest(array[a, b, c]) x;

  select count(*) into n from public.logros; r := 'catálogo ' || n;

  -- Parejas: A+B ganan a C sola? (3 jugadores: A+B pareja p1, C pareja p2 sola) y B venía en último (remontada no: 2 unidades)
  insert into public.partidas (evento, juego, semilla) values (ev, 'yo-nunca', 0) returning id into p;
  insert into public.acciones (id, partida, jugador, tipo, datos) values ('arr-' || p, p, a, 'control', jsonb_build_object('que', 'arranque', 'rondas', 5,
    'cfg', jsonb_build_object('modalidad', 'parejas', 'jugadores', jsonb_build_array(jsonb_build_object('id', a, 'equipo', 'p1'), jsonb_build_object('id', b, 'equipo', 'p1'), jsonb_build_object('id', c, 'equipo', 'p2')))));
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  perform public.terminar_partida_sala(p, 'yo-nunca', 3, jsonb_build_array(
    jsonb_build_object('jugador', a, 'rondas', 5, 'retos', 0, 'lugar', 1, 'puntos', 3),
    jsonb_build_object('jugador', b, 'rondas', 5, 'retos', 0, 'lugar', 1, 'puntos', 2),
    jsonb_build_object('jugador', c, 'rondas', 5, 'retos', 0, 'lugar', 2, 'puntos', 1)));
  -- Individual: B gana viniendo de último (remontada)
  perform set_config('role', yo, true);
  insert into public.partidas (evento, juego, semilla) values (ev, 'que-prefieres', 0) returning id into p;
  insert into public.acciones (id, partida, jugador, tipo, datos) values ('arr-' || p, p, a, 'control', jsonb_build_object('que', 'arranque', 'rondas', 5, 'cfg', '{}'::jsonb));
  perform set_config('role', 'authenticated', true);
  perform public.terminar_partida_sala(p, 'que-prefieres', 3, jsonb_build_array(
    jsonb_build_object('jugador', a, 'rondas', 5, 'retos', 0, 'lugar', 3, 'puntos', 1),
    jsonb_build_object('jugador', b, 'rondas', 5, 'retos', 0, 'lugar', 1, 'puntos', 5, 'datos', jsonb_build_object('peorLugar', 3)),
    jsonb_build_object('jugador', c, 'rondas', 5, 'retos', 0, 'lugar', 2, 'puntos', 3)));
  perform set_config('role', yo, true);
  select string_agg(logro, ',' order by logro) into t from public.logros_jugador where jugador = b; r := r || ' | B: ' || coalesce(t, 'NADA');

  -- Objetivos: B cobra «Gana una partida» una vez
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.mis_objetivos(); r := r || ' | objetivos ' || n;
  select public.reclamar_objetivo('dia-victoria') into n; r := r || ', cobró ' || n || ' XP';
  begin perform public.reclamar_objetivo('dia-victoria'); r := r || ' | FALLA: cobró dos veces';
  exception when others then r := r || ', segunda vez: ' || sqlerrm; end;
  begin perform public.reclamar_objetivo('sem-victorias'); r := r || ' | FALLA: cobró sin cumplir';
  exception when others then r := r || ', sin cumplir: ' || sqlerrm; end;
  begin insert into public.objetivos_jugador (jugador, objetivo, periodo) values (b, 'dia-partidas', current_date); r := r || ' | FALLA: escribió';
  exception when others then r := r || ', escribir: ' || sqlerrm; end;

  -- Votos
  perform public.votar_noche(ev, 'divertido', c);
  begin perform public.votar_noche(ev, 'divertido', b); r := r || ' | FALLA: votó por sí';
  exception when others then r := r || ' | votar por sí: ' || sqlerrm; end;
  select count(*) into n from public.votos_de_la_noche(ev) x where x.votado = c and x.votos = 1; r := r || ', conteo ' || n;
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true);
  begin perform public.votar_noche(ev, 'alma', c); r := r || ' | FALLA: E votó';
  exception when others then r := r || ', E vota: ' || sqlerrm; end;
  begin perform count(*) from public.votos_noche; r := r || ' | FALLA: lectura directa';
  exception when others then r := r || ', lectura directa: ' || sqlerrm; end;

  -- Título y grupo
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform public.usar_titulo('remontada');
  select x.titulo into t from public.ranking_jugadores('amigos') x where x.id = b; r := r || ' | título ' || coalesce(t, 'NADA');
  select x.grupo into t from public.mis_grupos() x limit 1;
  perform public.nombrar_grupo(t, 'Los reyes', '#FF0000', '👑');
  select x.nombre_grupo into t from public.ranking_grupos('parejas', 'amigos') x limit 1; r := r || ', grupo ' || coalesce(t, 'NADA');
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  select x.grupo into t from public.ranking_grupos('parejas', 'amigos') x limit 1;
  begin perform public.nombrar_grupo(t, 'Robado', '#000000'); r := r || ' | FALLA: C renombró';
  exception when others then r := r || ', C renombra: ' || sqlerrm; end;
  select count(*) into n from public.mi_progreso_logros() x where x.oculto and x.nombre is null; r := r || ', ocultos sin nombre para C ' || n;

  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
  begin perform public.mis_objetivos(); r := r || ' | FALLA anon';
  exception when others then r := r || ' | anon: ' || sqlerrm; end;

  perform set_config('role', yo, true);
  raise exception 'PRUEBA 043 (todo se deshace): %', r;
end $$;
