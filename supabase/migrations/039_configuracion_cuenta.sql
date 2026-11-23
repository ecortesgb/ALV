-- 039 · Configuración de la cuenta (ALV_PLAN_CONFIGURACION.md, etapa 2; decisiones de Elías del 2026-11-22, §10a).
-- APLICADA 2026-11-22 en ngwxxptydgbhkyznjngt con autorización de Elías («aplica la migración 039»). Antes: prueba en
-- transacción deshecha (supabase/pruebas/039_remota_prueba.sql, sin fallas; la base quedó igual) y asesor sin avisos
-- nuevos. Después: 039 última migración, RLS en preferencias_cuenta, funciones solo para authenticated.
-- 1) public.preferencias_cuenta: las preferencias de «Mi experiencia» y la partida predeterminada del administrador viajan
--    con la cuenta. Cada quien lee las suyas; solo escribe guardar_preferencias(), que valida claves, tipos y rangos.
-- 2) cambiar_nombre(): el nombre visible (perfiles.nombre). El nombre con el que se entra no cambia (es el correo interno).
-- 3) borrar_mi_cuenta() y admin_borrar_cuenta(): se borra todo de la cuenta (D3): figuras, XP, monedas, piezas, su lugar en
--    salas y partidas. Las salas que abrió se borran con sus partidas; la XP que otros ganaron en ellas se queda (sin sala).
--    No se puede borrar al único administrador ni el administrador se borra desde aquí a otro administrador.
-- Recuperar contraseña: solo desde el panel de Supabase (D2), así que aquí no hay códigos de recuperación.

-- 1) Preferencias
create table public.preferencias_cuenta (
  jugador     uuid primary key references public.perfiles (id) on delete cascade,
  datos       jsonb not null default '{}'::jsonb check (jsonb_typeof(datos) = 'object' and pg_column_size(datos) <= 4000),
  actualizado timestamptz not null default now()
);
alter table public.preferencias_cuenta enable row level security;
revoke all on public.preferencias_cuenta from public, anon, authenticated;
grant select on public.preferencias_cuenta to authenticated;
create policy preferencias_leer on public.preferencias_cuenta for select to authenticated using (jugador = (select auth.uid()));

-- Guarda solo las claves conocidas (las demás se ignoran) y rechaza valores fuera de rango. Mezcla con lo que ya había.
-- «partida» (configuración predeterminada del configurador) solo la guarda un administrador.
create function public.guardar_preferencias(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v jsonb := '{}'::jsonb; pa jsonb; vp jsonb := '{}'::jsonb; k text; x jsonb;
  v_res jsonb;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p is null or jsonb_typeof(p) <> 'object' or pg_column_size(p) > 4000 then raise exception 'preferencias no válidas'; end if;

  foreach k in array array['efectos', 'musica', 'vibracion', 'animaciones', 'modoTV'] loop
    if p ? k then
      if jsonb_typeof(p -> k) <> 'boolean' then raise exception 'preferencia no válida: %', k; end if;
      v := v || jsonb_build_object(k, p -> k);
    end if;
  end loop;
  foreach k in array array['volumenEfectos', 'volumenMusica'] loop
    if p ? k then
      x := p -> k;
      if jsonb_typeof(x) <> 'number' or (x #>> '{}')::numeric not between 0 and 100 or (x #>> '{}')::numeric <> round((x #>> '{}')::numeric) then
        raise exception 'preferencia no válida: %', k; end if;
      v := v || jsonb_build_object(k, x);
    end if;
  end loop;
  if p ? 'letra' then
    if (p ->> 'letra') is null or (p ->> 'letra') not in ('normal', 'grande') then raise exception 'preferencia no válida: letra'; end if;
    v := v || jsonb_build_object('letra', p -> 'letra');
  end if;

  if p ? 'partida' then
    if not public.soy_admin() then raise exception 'sin permiso'; end if;
    pa := p -> 'partida';
    if jsonb_typeof(pa) = 'null' then
      v := v || jsonb_build_object('partida', null);
    else
      if jsonb_typeof(pa) <> 'object' then raise exception 'partida no válida'; end if;
      if pa ? 'juego' then
        if (pa ->> 'juego') is null or (pa ->> 'juego') !~ '^[a-z0-9-]{1,40}$' then raise exception 'partida no válida: juego'; end if;
        vp := vp || jsonb_build_object('juego', pa -> 'juego'); end if;
      if pa ? 'modalidad' then
        if (pa ->> 'modalidad') is null or (pa ->> 'modalidad') not in ('individual', 'parejas', 'equipos', 'sexos') then raise exception 'partida no válida: modalidad'; end if;
        vp := vp || jsonb_build_object('modalidad', pa -> 'modalidad'); end if;
      if pa ? 'escenario' then
        if jsonb_typeof(pa -> 'escenario') <> 'null' and ((pa ->> 'escenario') is null or (pa ->> 'escenario') !~ '^[a-z0-9-]{1,40}$') then raise exception 'partida no válida: escenario'; end if;
        vp := vp || jsonb_build_object('escenario', pa -> 'escenario'); end if;
      if pa ? 'rondas' then
        x := pa -> 'rondas';
        if jsonb_typeof(x) <> 'number' or (x #>> '{}')::numeric not between 1 and 40 or (x #>> '{}')::numeric <> round((x #>> '{}')::numeric) then raise exception 'partida no válida: rondas'; end if;
        vp := vp || jsonb_build_object('rondas', x); end if;
      if pa ? 'temporizador' then
        x := pa -> 'temporizador';
        if jsonb_typeof(x) <> 'null' and (jsonb_typeof(x) <> 'number' or (x #>> '{}')::numeric not between 10 and 180 or (x #>> '{}')::numeric <> round((x #>> '{}')::numeric)) then raise exception 'partida no válida: temporizador'; end if;
        vp := vp || jsonb_build_object('temporizador', x); end if;
      foreach k in array array['temperatura', 'voltaje'] loop
        if pa ? k then
          x := pa -> k;
          if jsonb_typeof(x) <> 'number' or (x #>> '{}') not in ('1', '2', '3') then raise exception 'partida no válida: %', k; end if;
          vp := vp || jsonb_build_object(k, x);
        end if;
      end loop;
      foreach k in array array['drunk', 'explicar'] loop
        if pa ? k then
          if jsonb_typeof(pa -> k) <> 'boolean' then raise exception 'partida no válida: %', k; end if;
          vp := vp || jsonb_build_object(k, pa -> k);
        end if;
      end loop;
      v := v || jsonb_build_object('partida', vp);
    end if;
  end if;

  insert into public.preferencias_cuenta as pc (jugador, datos, actualizado) values (v_uid, v, now())
    on conflict (jugador) do update set datos = pc.datos || excluded.datos, actualizado = now()
    returning pc.datos into v_res;
  return v_res;
end $$;
revoke execute on function public.guardar_preferencias(jsonb) from public, anon;
grant execute on function public.guardar_preferencias(jsonb) to authenticated;

-- 2) Nombre visible
create function public.cambiar_nombre(p_nombre text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v text := trim(regexp_replace(coalesce(p_nombre, ''), '\s+', ' ', 'g'));
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if char_length(v) not between 2 and 20 or v !~ '^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ _.-]+$' then raise exception 'nombre no válido'; end if;
  update public.perfiles set nombre = v where id = v_uid;
  if not found then raise exception 'sin perfil'; end if;
  return v;
end $$;
revoke execute on function public.cambiar_nombre(text) from public, anon;
grant execute on function public.cambiar_nombre(text) to authenticated;

-- 3) Borrar una cuenta (ayudante privado: lo usan las dos funciones de abajo, que validan el permiso).
create function privado.borrar_cuenta(p_jugador uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_salas uuid[];
begin
  select coalesce(array_agg(e.id), '{}') into v_salas from public.eventos e where e.anfitrion = p_jugador;
  -- La XP que otros ganaron en sus salas se queda, sin sala ni partida.
  update public.movimientos_xp set partida = null
    where partida in (select p.id from public.partidas p where p.evento = any (v_salas)) and jugador <> p_jugador;
  update public.movimientos_xp set evento = null, xp_de_evento = 0 where evento = any (v_salas) and jugador <> p_jugador;
  delete from public.movimientos_xp where jugador = p_jugador;
  delete from public.eventos where id = any (v_salas);
  -- Referencias sin borrado en cascada.
  update public.eventos set coanfitrion = null where coanfitrion = p_jugador;
  update public.miembros_evento set pareja = null where pareja = p_jugador;
  -- El resto (perfil, figuras, monedas, piezas, preferencias, salas donde estaba) se va en cascada.
  delete from auth.users where id = p_jugador;
end $$;
revoke execute on function privado.borrar_cuenta(uuid) from public, anon, authenticated;

-- El jugador borra su propia cuenta. Para confirmar escribe su nombre de usuario (con el que entra).
create function public.borrar_mi_cuenta(p_confirmar text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_nick text;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  select split_part(u.email, '@', 1) into v_nick from auth.users u where u.id = v_uid;
  if v_nick is null or lower(trim(coalesce(p_confirmar, ''))) <> lower(v_nick) then raise exception 'confirmación no válida'; end if;
  if exists (select 1 from privado.administradores a where a.jugador = v_uid)
     and (select count(*) from privado.administradores) <= 1 then raise exception 'eres el único administrador'; end if;
  perform privado.borrar_cuenta(v_uid);
end $$;
revoke execute on function public.borrar_mi_cuenta(text) from public, anon;
grant execute on function public.borrar_mi_cuenta(text) to authenticated;

-- El administrador borra la cuenta de otro jugador (no la suya ni la de otro administrador).
create function public.admin_borrar_cuenta(p_jugador uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.soy_admin() then raise exception 'sin permiso'; end if;
  if p_jugador is null or p_jugador = (select auth.uid()) then raise exception 'jugador no válido'; end if;
  if exists (select 1 from privado.administradores a where a.jugador = p_jugador) then raise exception 'es administrador'; end if;
  if not exists (select 1 from public.perfiles p where p.id = p_jugador) then raise exception 'jugador no existe'; end if;
  perform privado.borrar_cuenta(p_jugador);
end $$;
revoke execute on function public.admin_borrar_cuenta(uuid) from public, anon;
grant execute on function public.admin_borrar_cuenta(uuid) to authenticated;
