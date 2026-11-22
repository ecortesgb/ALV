-- Prueba de la 038 en la base remota. La 038 va DENTRO de este bloque, que termina SIEMPRE con una excepción:
-- nada queda guardado (ni las funciones, ni los usuarios simulados, ni la sala de prueba).
-- Autorizada por Elías el 2026-11-22 («Sí, pruébala»).
-- A = administrador y anfitrión, B y C = jugadores en la sala, D = cuenta fuera de la sala.
-- Resultado 2026-11-22: B y D ven el lobby PRB038 con 3; B y D no pueden sacar ni dar listo («sin permiso»); A da listo a B
-- (true), a quien no está «ese jugador no está en la sala», no se saca a sí mismo («jugador no válido»), saca a C y quedan 2;
-- con la sala cerrada «sin permiso» y el lobby visible pasa a la sala real abierta (KD99DU); anónimo «permission denied» en
-- lobby_abierto y expulsar_de_sala. Después la base quedó igual (2 usuarios, 2 perfiles, 1 admin, 6 salas, 1 abierta,
-- 7 miembros, 0 funciones de la 038, 35 funciones en public) y el asesor sin cambios (28 avisos RPC ya existentes; al aplicar
-- se esperan 3 más, a propósito).
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid(); d uuid := gen_random_uuid();
  ev uuid; u uuid; r text := ''; n int; cod text; yo text := current_user; l boolean;
begin
  foreach u in array array[a, b, c, d] loop
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
      values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prueba_' || left(u::text, 8) || '@jugadores.alv.invalid', '', now(), now());
  end loop;
  insert into public.perfiles (id, nombre) select x, 'prueba_' || left(x::text, 6) from unnest(array[a, b, c, d]) x on conflict (id) do nothing;
  update public.perfiles set mayor_18 = true where id in (a, b, c, d);
  insert into privado.administradores (jugador) values (a);
  insert into public.eventos (codigo, nombre, anfitrion) values ('PRB038', 'ALV sin pantalla', a) returning id into ev;
  insert into public.miembros_evento (evento, jugador) select ev, x from unnest(array[a, b, c]) x;

  -- ===== 038 (mismo texto que supabase/migrations/038_lobby_administrador.sql) =====
  execute $m$
create or replace function public.lobby_abierto()
returns table (codigo text, miembros integer)
language plpgsql stable security definer set search_path to ''
as $f$
begin
  if (select auth.uid()) is null then raise exception 'sin sesión'; end if;
  return query
    select e.codigo::text, (select count(*)::integer from public.miembros_evento m where m.evento = e.id)
    from public.eventos e
    where not e.cerrado and exists (select 1 from privado.administradores a where a.jugador = e.anfitrion)
    order by e.inicia desc
    limit 1;
end $f$;
$m$;
  execute $m$
create or replace function public.expulsar_de_sala(p_evento uuid, p_jugador uuid)
returns void
language plpgsql security definer set search_path to ''
as $f$
declare v_yo uuid := (select auth.uid());
begin
  if v_yo is null then raise exception 'sin sesión'; end if;
  if not exists (select 1 from public.eventos e where e.id = p_evento and e.anfitrion = v_yo and not e.cerrado) then
    raise exception 'sin permiso'; end if;
  if p_jugador is null or p_jugador = v_yo then raise exception 'jugador no válido'; end if;
  delete from public.miembros_evento m where m.evento = p_evento and m.jugador = p_jugador;
end $f$;
$m$;
  execute $m$
create or replace function public.marcar_listo_de(p_evento uuid, p_jugador uuid, p_listo boolean)
returns void
language plpgsql security definer set search_path to ''
as $f$
declare v_yo uuid := (select auth.uid());
begin
  if v_yo is null then raise exception 'sin sesión'; end if;
  if not exists (select 1 from public.eventos e where e.id = p_evento and e.anfitrion = v_yo and not e.cerrado) then
    raise exception 'sin permiso'; end if;
  if p_listo is null then raise exception 'valor no válido'; end if;
  update public.miembros_evento set listo = p_listo where evento = p_evento and jugador = p_jugador;
  if not found then raise exception 'ese jugador no está en la sala'; end if;
end $f$;
$m$;
  execute 'revoke all on function public.lobby_abierto() from public, anon';
  execute 'revoke all on function public.expulsar_de_sala(uuid, uuid) from public, anon';
  execute 'revoke all on function public.marcar_listo_de(uuid, uuid, boolean) from public, anon';
  execute 'grant execute on function public.lobby_abierto() to authenticated';
  execute 'grant execute on function public.expulsar_de_sala(uuid, uuid) to authenticated';
  execute 'grant execute on function public.marcar_listo_de(uuid, uuid, boolean) to authenticated';
  -- ==========================================================================

  -- B (jugador de la sala): ve el lobby y cuántos hay; NO puede sacar ni dar listo por otro
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select x.codigo, x.miembros into cod, n from public.lobby_abierto() x;
  r := r || 'B ve lobby ' || coalesce(cod, 'NINGUNO') || ' con ' || coalesce(n, -1);
  begin perform public.expulsar_de_sala(ev, c); r := r || ' | FALLA: B sacó a C';
  exception when others then r := r || ' | B saca: ' || sqlerrm; end;
  begin perform public.marcar_listo_de(ev, c, true); r := r || ' | FALLA: B dio listo';
  exception when others then r := r || ' | B da listo: ' || sqlerrm; end;

  -- D (fuera de la sala): ve que hay lobby y cuántos, no puede tocar nada
  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  select x.codigo, x.miembros into cod, n from public.lobby_abierto() x;
  r := r || ' | D ve lobby ' || coalesce(cod, 'NINGUNO') || ' con ' || coalesce(n, -1);
  begin perform public.expulsar_de_sala(ev, b); r := r || ' | FALLA: D sacó a B';
  exception when others then r := r || ' | D saca: ' || sqlerrm; end;

  -- A (anfitrión): da listo a B, no a quien no está, no se saca a sí mismo, saca a C
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform public.marcar_listo_de(ev, b, true);
  perform set_config('role', yo, true);
  select listo into l from public.miembros_evento where evento = ev and jugador = b; r := r || ' | A dio listo a B: ' || l;
  perform set_config('role', 'authenticated', true);
  begin perform public.marcar_listo_de(ev, d, true); r := r || ' | FALLA: listo a quien no está';
  exception when others then r := r || ' | A listo a D: ' || sqlerrm; end;
  begin perform public.expulsar_de_sala(ev, a); r := r || ' | FALLA: A se sacó';
  exception when others then r := r || ' | A se saca: ' || sqlerrm; end;
  perform public.expulsar_de_sala(ev, c);
  select x.miembros into n from public.lobby_abierto() x; r := r || ' | A sacó a C, quedan ' || n;

  -- Sala cerrada: el anfitrión ya no puede tocar nada; el lobby ya no aparece
  perform set_config('role', yo, true);
  update public.eventos set cerrado = true, cerrado_en = now() where id = ev;
  perform set_config('role', 'authenticated', true);
  begin perform public.marcar_listo_de(ev, b, false); r := r || ' | FALLA: listo en sala cerrada';
  exception when others then r := r || ' | cerrada: ' || sqlerrm; end;
  select count(*) into n from public.lobby_abierto(); r := r || ' | lobbies abiertos tras cerrar ' || n;

  -- Anónimo: sin permiso en las tres
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
  begin perform public.lobby_abierto(); r := r || ' | FALLA anon lobby';
  exception when others then r := r || ' | anon lobby: ' || sqlerrm; end;
  begin perform public.expulsar_de_sala(ev, b); r := r || ' | FALLA anon saca';
  exception when others then r := r || ' | anon saca: ' || sqlerrm; end;

  perform set_config('role', yo, true);
  raise exception 'RESULTADO (se deshace): %', r;
end $$;
