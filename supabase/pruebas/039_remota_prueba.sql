-- Prueba de la 039 en la base remota (proyecto ngwxxptydgbhkyznjngt). Se manda en UNA sola llamada: primero el texto
-- completo de supabase/migrations/039_configuracion_cuenta.sql y después este bloque, que termina SIEMPRE con una
-- excepción: la llamada entera se deshace (ni tablas, ni funciones, ni usuarios simulados quedan guardados).
-- Autorizada por Elías el 2026-11-22 («aplica la migración 039»; antes de aplicar se prueba así y se corre el asesor).
-- A = administrador, B = jugador que abre una sala con una partida, C = jugador que ganó XP en la sala de B.
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  ev uuid; pt uuid; u uuid; r text := ''; n int; j jsonb; t text; yo text := current_user;
  nb text; nc text;
begin
  foreach u in array array[a, b, c] loop
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
      values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prueba_' || left(u::text, 8) || '@jugadores.alv.invalid', '', now(), now());
  end loop;
  nb := 'prueba_' || left(b::text, 8); nc := 'prueba_' || left(c::text, 8);
  update public.perfiles set mayor_18 = true where id in (a, b, c);
  -- Dentro de la prueba A es el único administrador (la fila real de ecortes7 se quita y vuelve con el rollback).
  delete from privado.administradores where jugador <> a;
  insert into privado.administradores (jugador) values (a);
  insert into public.eventos (codigo, nombre, anfitrion) values ('PRB039', 'Sala de B', b) returning id into ev;
  insert into public.miembros_evento (evento, jugador) values (ev, b), (ev, c);
  insert into public.partidas (evento, juego, semilla) values (ev, 'impostor', 1) returning id into pt;
  insert into public.movimientos_xp (jugador, tipo, xp, evento, partida, xp_de_evento, motivo) values (c, 'ganada', 30, ev, pt, 30, 'partida:impostor');

  -- B: preferencias propias (ignora claves raras), rangos, partida sin permiso, nombre, escritura directa, borrar a otro
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  j := public.guardar_preferencias('{"efectos": false, "volumenEfectos": 40, "letra": "grande", "basura": 1}');
  r := r || 'B guarda ' || j::text;
  j := public.guardar_preferencias('{"vibracion": false}');
  r := r || ' | B mezcla ' || j::text;
  begin perform public.guardar_preferencias('{"volumenEfectos": 150}'); r := r || ' | FALLA: volumen 150';
  exception when others then r := r || ' | vol 150: ' || sqlerrm; end;
  begin perform public.guardar_preferencias('{"letra": "enorme"}'); r := r || ' | FALLA: letra';
  exception when others then r := r || ' | letra: ' || sqlerrm; end;
  begin perform public.guardar_preferencias('{"partida": {"juego": "impostor"}}'); r := r || ' | FALLA: B guardó partida';
  exception when others then r := r || ' | B partida: ' || sqlerrm; end;
  t := public.cambiar_nombre('  Beto   Pro ');
  r := r || ' | B nombre «' || t || '»';
  begin perform public.cambiar_nombre('<script>'); r := r || ' | FALLA: nombre raro';
  exception when others then r := r || ' | nombre raro: ' || sqlerrm; end;
  begin insert into public.preferencias_cuenta (jugador, datos) values (b, '{}'); r := r || ' | FALLA: insert directo';
  exception when others then r := r || ' | insert directo: ' || sqlerrm; end;
  begin perform public.admin_borrar_cuenta(c); r := r || ' | FALLA: B borró a C';
  exception when others then r := r || ' | B borra a C: ' || sqlerrm; end;

  -- A: partida predeterminada; B no ve las preferencias de A
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  j := public.guardar_preferencias('{"partida": {"juego": "impostor", "modalidad": "parejas", "rondas": 8, "temperatura": 2, "voltaje": 3, "drunk": true, "temporizador": null, "escenario": "alverca", "explicar": false}}');
  r := r || ' | A partida ' || j::text;
  begin perform public.guardar_preferencias('{"partida": {"rondas": 99}}'); r := r || ' | FALLA: rondas 99';
  exception when others then r := r || ' | rondas 99: ' || sqlerrm; end;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.preferencias_cuenta; r := r || ' | B ve filas ' || n;

  -- A borra a B: B y su sala desaparecen; la XP de C se queda sin sala
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  begin perform public.admin_borrar_cuenta(a); r := r || ' | FALLA: A se borró como admin';
  exception when others then r := r || ' | A se borra (admin): ' || sqlerrm; end;
  begin perform public.borrar_mi_cuenta('prueba_' || left(a::text, 8)); r := r || ' | FALLA: único admin se borró';
  exception when others then r := r || ' | A borrar mi cuenta: ' || sqlerrm; end;
  perform public.admin_borrar_cuenta(b);
  perform set_config('role', yo, true);
  select count(*) into n from auth.users where id = b; r := r || ' | B en auth ' || n;
  select count(*) into n from public.perfiles where id = b; r := r || ', perfil ' || n;
  select count(*) into n from public.preferencias_cuenta where jugador = b; r := r || ', prefs ' || n;
  select count(*) into n from public.eventos where id = ev; r := r || ', sala ' || n;
  select count(*) into n from public.movimientos_xp where jugador = c and evento is null and partida is null and xp = 30; r := r || ', XP de C intacta sin sala ' || n;

  -- C borra su cuenta: con confirmación mala no; con su nombre de usuario sí
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  begin perform public.borrar_mi_cuenta('otra cosa'); r := r || ' | FALLA: C sin confirmar';
  exception when others then r := r || ' | C mal: ' || sqlerrm; end;
  perform public.borrar_mi_cuenta(upper(nc));
  perform set_config('role', yo, true);
  select count(*) into n from auth.users where id = c; r := r || ' | C en auth ' || n;
  select count(*) into n from public.movimientos_xp where jugador = c; r := r || ', XP de C ' || n;

  -- Anónimo: sin permiso
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
  begin perform public.guardar_preferencias('{"efectos": true}'); r := r || ' | FALLA: anon guardó';
  exception when others then r := r || ' | anon prefs: ' || sqlerrm; end;
  begin perform public.borrar_mi_cuenta('x'); r := r || ' | FALLA: anon borró';
  exception when others then r := r || ' | anon borrar: ' || sqlerrm; end;
  begin perform count(*) from public.preferencias_cuenta; r := r || ' | FALLA: anon leyó';
  exception when others then r := r || ' | anon lee: ' || sqlerrm; end;
  perform set_config('role', yo, true);

  raise exception 'PRUEBA 039 (se deshace todo): %', r;
end $$;
